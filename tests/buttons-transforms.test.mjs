import assert from 'node:assert/strict';
import test from 'node:test';
import { loadProductionModule } from './production-module.mjs';
const load = path => loadProductionModule(new URL(path, import.meta.url));
const { availableBlockTransforms, availableBlockTransformsInDocument, transformBlock } = await load('../app/studio/block-transforms.ts');
const { validContentBlocks } = await load('../app/studio/workspace-validation.ts');
const { editBlockSiblings } = await load('../app/studio/block-sibling-operations.ts');
const { findContentBlock } = await load('../app/content/block-tree.ts');
const block = { id: 'buttons', type: 'buttons', blockAlign: 'wide', justification: 'space-between', orientation: 'vertical', verticalAlign: 'bottom', allowWrap: false, horizontalGap: 16, verticalGap: 24, visualStyle: { fontFamily: 'arial', lineHeight: '1.8', letterSpacing: '0.1em', textDecoration: 'underline', textTransform: 'uppercase', responsive: { mobile: { fontSizeCustom: '18px' } } }, editorial: { name: 'Calls to action', note: 'Keep both links' }, children: [
  { id: 'fill', type: 'button', label: 'Read guide', labelRuns: [{ text: 'Read ', marks: ['bold'] }, { text: 'guide', marks: ['italic'] }], url: 'https://example.test/guide', style: 'primary', width: 25, title: 'The guide', rel: 'nofollow', opensInNewTab: true, align: 'right', interactionStyles: { hover: { width: 50, textColor: '#123456' }, focus: { width: 75 } } },
  { id: 'outline', type: 'button', label: 'Other guide', url: 'https://example.test/other', style: 'secondary', width: 75, visualStyle: { backgroundColor: '#fff3cd' } },
] };
const ids = (value, blocks = [value]) => availableBlockTransformsInDocument(value, blocks).map(choice => choice.id);

for (const wrapper of ['group', 'columns']) test(`Buttons ${wrapper} wrapping preserves the complete authored subtree through the production transform path`, () => {
  const original = structuredClone(block);
  const choices = availableBlockTransformsInDocument(block, [block]);
  assert.deepEqual(choices.map(choice => choice.id).sort(), ['wrap-columns', 'wrap-group']);
  let sequence = 0;
  const wrapped = transformBlock(block, choices.find(choice => choice.id === `wrap-${wrapper}`), () => `wrapper-${++sequence}`);
  const next = editBlockSiblings([block], block.id, () => [wrapped]);
  assert.equal(wrapped.type, wrapper); assert.equal(wrapped.blockAlign, 'wide');
  assert.equal(findContentBlock(next, block.id), block);
  for (const child of block.children) assert.equal(findContentBlock(next, child.id), child);
  assert.equal(validContentBlocks(next), true); assert.deepEqual(block, original);
});

test('Buttons wrapping observes locks, parent policy and the complete subtree depth', () => {
  for (const lock of [{ move: true }, { remove: true }, { move: true, remove: true }]) assert.deepEqual(ids({ ...block, editorial: { ...block.editorial, lock } }), []);
  for (const type of ['buttons', 'columns', 'social-icons']) assert.deepEqual(availableBlockTransforms(block, { id: 'parent', type, children: [block] }), []);
  const nest = count => { let nested = block; for (let depth = 0; depth < count; depth++) nested = { id: `depth-${depth}`, type: 'group', layout: 'flow', children: [nested] }; return nested; };
  assert.equal(validContentBlocks([nest(7)]), true);
  assert.deepEqual(ids(block, [nest(7)]), []);
  assert.deepEqual(ids(block, [nest(6)]), ['wrap-group'], 'Columns needs an additional level for its Column');
  assert.deepEqual(ids(block, [{ id: 'other', type: 'paragraph', text: 'Source removed' }]), []);
});

test('intact Buttons wrapping retains child locks without changing their parent or sibling order', () => {
  const locked = { ...block, children: block.children.map(child => ({ ...child, editorial: { lock: { move: true, remove: true } } })) };
  assert.deepEqual(ids(locked).sort(), ['wrap-columns', 'wrap-group']);
  for (const choice of availableBlockTransformsInDocument(locked, [locked])) {
    let sequence = 0;
    const wrapper = transformBlock(locked, choice, () => `locked-wrapper-${++sequence}`);
    assert.equal(findContentBlock([wrapper], locked.id), locked);
    for (const child of locked.children) assert.equal(findContentBlock([wrapper], child.id), child);
  }
});

for (const wrapper of ['group', 'columns']) test(`Buttons ${wrapper} wrapping survives canonical saved JSON, publication, template/package and clipboard readers`, async () => {
  const { initialStudioWorkspace } = await load('../app/studio/editor-model.ts');
  const { validateStudioWorkspace, validatePublicationSnapshot, PUBLICATION_VERSION } = await load('../app/studio/workspace-validation.ts');
  const { toLocallyPublishedArticle } = await load('../app/content/local-publishing.ts');
  const { createTemplateSet, emptyTemplateStore, TEMPLATE_VERSION, templateNodesFromBlocks, templateEditorBlocks, validateTemplateStore } = await load('../app/studio/template-model.ts');
  const { validateTemplatePackage } = await load('../app/studio/template-package.ts');
  const { blockClipboardHtml, readBlockClipboardPayload } = await load('../app/studio/block-clipboard.ts');
  const plain = value => JSON.parse(JSON.stringify(value));
  let sequence = 0;
  const wrapped = transformBlock(block, availableBlockTransformsInDocument(block, [block]).find(choice => choice.id === `wrap-${wrapper}`), () => `saved-wrapper-${++sequence}`);
  const document = { ...initialStudioWorkspace.documents.find(document => document.kind === 'post'), blocks: [wrapped] };
  const workspace = validateStudioWorkspace(plain({ ...initialStudioWorkspace, documents: [document], activeDocumentId: document.id, bin: [] }));
  assert.deepEqual(plain(findContentBlock(workspace.documents[0].blocks, block.id)), plain(block));
  const published = validatePublicationSnapshot(plain({ version: PUBLICATION_VERSION, posts: [toLocallyPublishedArticle(document)] }));
  assert.deepEqual(plain(findContentBlock(published.posts[0].blocks, block.id)), plain(toLocallyPublishedArticle({ ...document, blocks: [block] }).blocks[0]));
  const set = createTemplateSet('Buttons'); set.parts[0].nodes = templateNodesFromBlocks([wrapped]);
  const store = validateTemplateStore(plain({ ...emptyTemplateStore(), sets: [set] }));
  assert.deepEqual(plain(findContentBlock(templateEditorBlocks(store.sets[0].parts[0].nodes), block.id)), plain(block));
  const packaged = validateTemplatePackage(plain({ format: 'acm-studio-template-set', version: TEMPLATE_VERSION, set, media: [] }));
  assert.deepEqual(plain(findContentBlock(templateEditorBlocks(packaged.set.parts[0].nodes), block.id)), plain(block));
  const html = blockClipboardHtml([wrapped]);
  const payload = html.match(/data-acm-studio-blocks="([^"]*)"/)[1].replaceAll('&quot;', '"').replaceAll('&lt;', '<').replaceAll('&gt;', '>').replaceAll('&amp;', '&');
  const previous = globalThis.DOMParser;
  try {
    globalThis.DOMParser = class { parseFromString() { return { querySelector: () => ({ getAttribute: () => payload }) }; } };
    assert.deepEqual(plain(findContentBlock(readBlockClipboardPayload(html).blocks, block.id)), plain(block));
  } finally { globalThis.DOMParser = previous; }
});
