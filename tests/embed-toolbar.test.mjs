import assert from 'node:assert/strict';
import test from 'node:test';
import { loadProductionModule } from './production-module.mjs';
const load = path => loadProductionModule(new URL(path, import.meta.url));
const { createEmbedUrlEditorRegistry, focusEmbedUrlInput, nextEmbedOwnerEpoch, requestEmbedUrlChange, updateEmbedUrl } = await load('../app/studio/blocks/embed-url-editing.tsx');
const { availableBlockTransforms, availableBlockTransformsInDocument, transformBlock } = await load('../app/studio/block-transforms.ts');
const { validContentBlocks } = await load('../app/studio/workspace-validation.ts');
const { findContentBlock } = await load('../app/content/block-tree.ts');
const { resolveBlockToolbar } = await load('../app/studio/blocks/toolbar-registry.ts');
const embed = { id: 'embed', type: 'embed', url: 'https://example.test/source', title: 'Accessible player', caption: 'A rich caption', captionRuns: [{ text: 'A rich ', marks: ['bold'] }, { text: 'caption', marks: ['italic'] }], blockAlign: 'wide', visualStyle: { anchor: 'media', margin: '16px', className: 'retained' }, editorial: { name: 'Media reference', note: 'Keep its source' } };
const request = { documentId: 'document', blockId: embed.id, sourceUrl: embed.url, url: 'https://example.test/replacement', opener: null, isCurrent: () => true };
function ownerFixture() {
  const state = { interactionEpoch: 0, document: { id: 'document', blocks: [structuredClone(embed)] }, selectedBlockId: embed.id, writable: true, previewing: false };
  const pending = []; const requests = [];
  return { state, pending, requests, owner: { read: () => state, onRequested: request => requests.push(request), updateBlock: (_id, update) => pending.push(() => { state.document.blocks[0] = update(state.document.blocks[0]); }) } };
}

test('toolbar URL action is Embed-only, read-only disabled and hidden in Preview', () => {
  for (const writable of [true, false]) {
    const action = resolveBlockToolbar({ block: embed, writable }).find(action => action.id === 'embed-edit-url');
    assert.ok(action); assert.equal(action.disabled, !writable); assert.deepEqual(action.fields, ['url']);
  }
  assert.equal(resolveBlockToolbar({ block: embed, previewing: true }).length, 0);
  assert.equal(resolveBlockToolbar({ block: { id: 'p', type: 'paragraph', text: '' } }).some(action => action.id === 'embed-edit-url'), false);
});

test('registered field controllers have exact document/source authority and stale cleanup cannot remove a replacement', () => {
  let notifications = 0; const registry = createEmbedUrlEditorRegistry(() => notifications++);
  let opened = 0; const first = { beginEdit: () => opened++, restoreFocus() {} }; const second = { ...first };
  const closeFirst = registry.register('document', embed.id, embed.url, first);
  registry.get('document', embed.id, embed.url).beginEdit({}); assert.equal(opened, 1);
  assert.equal(registry.get('other', embed.id, embed.url), undefined); assert.equal(registry.get('document', embed.id, request.url), undefined);
  const closeSecond = registry.register('document', embed.id, embed.url, second); closeFirst();
  assert.equal(registry.get('document', embed.id, embed.url), second); closeSecond(); assert.equal(registry.get('document', embed.id, embed.url), undefined);
  assert.equal(notifications, 3);
});

test('deferred URL submit rebases only URL onto the freshest embed without losing caption/styles/metadata', () => {
  const fixture = ownerFixture(); assert.equal(requestEmbedUrlChange(request, fixture.owner), true);
  const changed = { ...fixture.state.document.blocks[0], caption: 'New caption', captionRuns: [{ text: 'New caption', marks: ['italic'] }], visualStyle: { margin: '24px', anchor: 'fresh' }, title: 'New accessible title' };
  fixture.state.document.blocks[0] = changed; fixture.pending[0]();
  assert.deepEqual(fixture.state.document.blocks[0], { ...changed, url: request.url });
  assert.equal(fixture.requests.length, 1);
});

for (const invalidate of [state => { state.writable = false; }, state => { state.previewing = true; }, state => { state.document.id = 'other'; }, state => { state.selectedBlockId = 'other'; }, state => { state.document.blocks[0] = { ...embed, url: 'https://example.test/foreign' }; }, state => { state.document.blocks[0] = { id: embed.id, type: 'paragraph', text: 'Changed type' }; }]) test('queued URL submission refuses a changed owner, source, selection or permission', () => {
  const fixture = ownerFixture(); assert.equal(requestEmbedUrlChange(request, fixture.owner), true); invalidate(fixture.state);
  const before = structuredClone(fixture.state.document.blocks); fixture.pending[0](); assert.deepEqual(fixture.state.document.blocks, before);
  assert.equal(requestEmbedUrlChange(request, fixture.owner), false);
});

test('invalid/stale/no-op URL requests never queue a write or mutate the original', () => {
  const fixture = ownerFixture();
  for (const url of ['javascript:alert(1)', 'data:text/html,unsafe', '']) assert.equal(requestEmbedUrlChange({ ...request, url }, fixture.owner), false);
  assert.equal(requestEmbedUrlChange({ ...request, sourceUrl: 'https://example.test/stale' }, fixture.owner), false);
  assert.equal(requestEmbedUrlChange({ ...request, url: embed.url }, fixture.owner), true);
  assert.equal(fixture.pending.length, 0); assert.equal(fixture.requests.length, 0);
  for (const url of ['javascript:alert(1)', embed.url]) assert.equal(updateEmbedUrl(embed, embed.url, url), embed);
});

for (const wrapper of ['group', 'columns']) test(`Embed ${wrapper} transform retains its exact complete record and outer alignment`, () => {
  const choices = availableBlockTransformsInDocument(embed, [embed]);
  assert.deepEqual(choices.map(choice => choice.id).sort(), ['wrap-columns', 'wrap-group']); let sequence = 0;
  const wrapped = transformBlock(embed, choices.find(choice => choice.id === `wrap-${wrapper}`), () => `wrapper-${++sequence}`);
  assert.equal(wrapped.type, wrapper); assert.equal(wrapped.blockAlign, 'wide'); assert.equal(findContentBlock([wrapped], embed.id), embed); assert.equal(validContentBlocks([wrapped]), true);
});

test('Embed wrapping honours parent restrictions, locks and complete-tree depth', () => {
  for (const lock of [{ move: true }, { remove: true }]) { const locked = { ...embed, editorial: { lock } }; assert.deepEqual(availableBlockTransformsInDocument(locked, [locked]), []); }
  for (const type of ['buttons','columns','social-icons']) assert.deepEqual(availableBlockTransforms(embed, { id: 'parent', type, children: [embed] }), []);
  const nested = count => { let value = embed; for (let index = 0; index < count; index++) value = { id: `group-${index}`, type: 'group', layout: 'flow', children: [value] }; return value; };
  assert.deepEqual(availableBlockTransformsInDocument(embed, [nested(8)]), []);
  assert.deepEqual(availableBlockTransformsInDocument(embed, [nested(7)]).map(choice => choice.id), ['wrap-group']);
});


test('a cancelled, replaced or unmounted field attempt revokes its deferred URL patch', () => {
  const fixture = ownerFixture(); let current = true;
  const attempt = { ...request, isCurrent: () => current };
  assert.equal(requestEmbedUrlChange(attempt, fixture.owner), true);
  current = false; fixture.pending[0]();
  assert.deepEqual(fixture.state.document.blocks[0], embed);
  assert.equal(requestEmbedUrlChange(attempt, fixture.owner), false);
});

for (const [field, lost] of [['documentId', 'other'], ['selectedBlockId', 'other'], ['writable', false], ['previewing', true]]) test(`queued URL attempt stays revoked after ${field} is lost and restored`, () => {
  const fixture = ownerFixture();
  const identity = () => ({ documentId: fixture.state.document.id, selectedBlockId: fixture.state.selectedBlockId, writable: fixture.state.writable, previewing: fixture.state.previewing });
  const original = identity();
  function commitIdentity(next) {
    fixture.state.interactionEpoch = nextEmbedOwnerEpoch(fixture.state.interactionEpoch, identity(), next);
    fixture.state.document.id = next.documentId; fixture.state.selectedBlockId = next.selectedBlockId; fixture.state.writable = next.writable; fixture.state.previewing = next.previewing;
  }
  assert.equal(requestEmbedUrlChange(request, fixture.owner), true);
  commitIdentity({ ...original, [field]: lost }); commitIdentity(original);
  assert.equal(fixture.state.interactionEpoch, 2); fixture.pending[0]();
  assert.deepEqual(fixture.state.document.blocks[0], embed);
  assert.equal(requestEmbedUrlChange(request, fixture.owner), true); fixture.pending[1]();
  assert.equal(fixture.state.document.blocks[0].url, request.url);
});

test('unchanged owner identity does not revoke a URL patch during unrelated content updates', () => {
  const identity = { documentId: 'document', selectedBlockId: embed.id, writable: true, previewing: false };
  assert.equal(nextEmbedOwnerEpoch(7, identity, { ...identity }), 7);
});

test('opening the URL field disables animated focus scrolling before revealing its nearest bounds', () => {
  const calls = [];
  focusEmbedUrlInput({ focus: options => calls.push(['focus', options]), scrollIntoView: options => calls.push(['scroll', options]) });
  assert.deepEqual(calls, [['focus', { preventScroll: true }], ['scroll', { block: 'nearest', behavior: 'instant' }]]);
  assert.doesNotThrow(() => focusEmbedUrlInput(null));
});
