import assert from 'node:assert/strict';
import test from 'node:test';
import { loadProductionModule } from './production-module.mjs';
const load = path => loadProductionModule(new URL(path, import.meta.url));
const { availableBlockTransformsInDocument, transformBlock } = await load('../app/studio/block-transforms.ts');
const { buttonsLayoutStyle } = await load('../app/content/layout.ts');
const { containsButtonsAlignment } = await load('../app/content/buttons-alignment.ts');
const { initialStudioWorkspace } = await load('../app/studio/editor-model.ts');
const { validateStudioWorkspace, migrateStudioWorkspace, validatePublicationSnapshot, validContentBlocks } = await load('../app/studio/workspace-validation.ts');
const { toLocallyPublishedArticle } = await load('../app/content/local-publishing.ts');
const { emptyTemplateStore, createTemplateSet, validateTemplateStore, validateTemplateSnapshot, templateEditorBlocks, templateNodesFromBlocks } = await load('../app/studio/template-model.ts');
const { validateTemplatePackage } = await load('../app/studio/template-package.ts');
const { testSiteCollection, testSiteWorkspace, validTestSiteDocument } = await load('../app/studio/test-site/contract.ts');
const { createGlobalTemplateLibrary, validateGlobalTemplateLibrary } = await load('../app/studio/global-template-contract.ts');
const { blockClipboardHtml, readBlockClipboardPayload } = await load('../app/studio/block-clipboard.ts');
const { blocksToHtml } = await load('../app/studio/studio-html-editor.ts');
const button = { id: 'button', type: 'button', label: 'Read guide', labelRuns: [{ text: 'Read guide', marks: ['bold'] }], url: 'https://example.test/guide', style: 'primary', align: 'right', width: 50, title: 'Guide', rel: 'nofollow', opensInNewTab: true, visualStyle: { textColor: '#123456' }, interactionStyles: { hover: { width: 75 } } };
const buttons = { id: 'buttons', type: 'buttons', children: [button], verticalAlign: 'stretch' };
const plain = value => JSON.parse(JSON.stringify(value));

test('Button Fill/Outline transforms retain all unrelated typed data and same-style identity', () => {
  const transforms = availableBlockTransformsInDocument(button, [buttons]);
  assert.equal(transforms.some(item => item.target === 'paragraph'), false);
  for (const style of ['primary', 'secondary']) {
    const transform = transforms.find(item => item.buttonStyle === style);
    assert.ok(transform);
    const result = transformBlock(button, transform);
    assert.deepEqual(result, { ...button, style });
    if (style === button.style) assert.equal(result, button);
  }
});

test('Buttons physical axes preserve legacy defaults and independently expose authored alignment', () => {
  assert.equal(buttonsLayoutStyle({}).alignItems, 'center');
  for (const [justification, expected] of [['left','flex-start'],['centre','center'],['right','flex-end'],['space-between','space-between']]) {
    assert.equal(buttonsLayoutStyle({ orientation: 'vertical', justification }).justifyContent, expected);
  }
  assert.equal(buttonsLayoutStyle({ verticalAlign: 'stretch' }).alignItems, 'stretch');
  const vertical = buttonsLayoutStyle({ orientation: 'vertical', justification: 'stretch', verticalAlign: 'bottom' });
  assert.equal(vertical.alignItems, 'stretch'); assert.equal(vertical.justifyContent, 'flex-end');
  for (const verticalAlign of ['top','centre','bottom','stretch','space-between']) assert.equal(validContentBlocks([{ ...buttons, verticalAlign }]), true);
  assert.equal(validContentBlocks([{ ...buttons, verticalAlign: 'invalid' }]), false);
});

test('new Buttons metadata has explicit workspace, publication, template, clipboard, fixture and global boundaries', () => {
  const doc = { ...initialStudioWorkspace.documents.find(item => item.kind === 'post'), blocks: [buttons] };
  const workspace = { ...initialStudioWorkspace, documents: [doc], activeDocumentId: doc.id, bin: [] };
  for (const validate of [validateStudioWorkspace, migrateStudioWorkspace]) {
    assert.deepEqual(plain(validate(workspace).documents[0].blocks[0]), buttons);
    assert.throws(() => validate({ ...workspace, version: 32 }));
    assert.equal(validate({ ...workspace, version: 32, documents: [{ ...doc, blocks: [{ ...buttons, verticalAlign: undefined }] }] }).version, 33);
  }
  const post = toLocallyPublishedArticle(doc);
  assert.equal(validatePublicationSnapshot({ version: 25, posts: [post] }).posts[0].blocks[0].verticalAlign, 'stretch');
  assert.throws(() => validatePublicationSnapshot({ version: 24, posts: [post] }));
  const set = createTemplateSet('Example'); set.parts[0].nodes = [buttons];
  const store = { ...emptyTemplateStore(), sets: [set] };
  assert.equal(validateTemplateStore(store).sets[0].parts[0].nodes[0].verticalAlign, 'stretch');
  for (const version of ['0.36.0','0.35.0']) assert.throws(() => validateTemplateStore({ ...store, version }));
  assert.doesNotThrow(() => validateTemplateSnapshot({ version: '0.37.0', set, templateId: set.templates[0].id }));
  assert.doesNotThrow(() => validateTemplatePackage({ format: 'acm-studio-template-set', version: '0.37.0', set, media: [] }));
  const projected = templateEditorBlocks(set.parts[0].nodes, set);
  assert.equal(projected[0].verticalAlign, 'stretch');
  assert.equal(templateNodesFromBlocks(projected, set.parts[0].nodes)[0].verticalAlign, 'stretch');
  const html = blockClipboardHtml([buttons]);
  let payload = html.match(/data-acm-studio-blocks="([^"]*)"/)[1].replaceAll('&quot;', '"').replaceAll('&lt;', '<').replaceAll('&gt;', '>').replaceAll('&amp;', '&');
  const previous = globalThis.DOMParser;
  try {
    globalThis.DOMParser = class { parseFromString() { return { querySelector: () => ({ getAttribute: () => payload }) }; } };
    assert.equal(readBlockClipboardPayload(html).blocks[0].verticalAlign, 'stretch');
    payload = JSON.stringify({ ...JSON.parse(payload), version: 9 }); assert.equal(readBlockClipboardPayload(html), null);
  } finally { globalThis.DOMParser = previous; }
  const page = { id: 'home', kind: 'page', title: 'Home', slug: '', excerpt: '', status: 'published', updatedAt: '2026-10-22T00:00:00.000Z', tags: [], seoTitle: '', seoDescription: '', blocks: [] };
  const nav = { ...structuredClone(set), id: 'navigation', templates: [], parts: [{ id: 'nav', kind: 'header', name: 'Navigation', nodes: [{ id: 'menu', type: 'element', element: 'navigation' }] }] };
  const legacy = { format: 'acm-test-site', version: 9, siteId: 'test', documents: [page], categories: [], bin: [], activeDocumentId: 'home', homeDocumentId: 'home', templates: { ...emptyTemplateStore(), sets: [createTemplateSet("Fixture"), nav] }, siteNavigation: { setId: 'navigation', partId: 'nav' }, browserImportComplete: true, globalTemplates: [], publications: [{ document: page }] };
  const fixture = testSiteCollection(legacy); fixture.documents[0].blocks = [buttons];
  assert.equal(fixture.version, 16); assert.equal(validTestSiteDocument(fixture), true); assert.equal(validTestSiteDocument({ ...fixture, version: 15 }), false); assert.equal(testSiteWorkspace(fixture).version, 33);
  fixture.documents[0].blocks = [];
  fixture.templates.sets.find(set => set.id !== fixture.siteNavigation.setId).parts[0].nodes = [buttons];
  const library = createGlobalTemplateLibrary({ test: fixture, test2: { ...structuredClone(fixture), siteId: 'test2' } });
  library.migrations.test.bases[0].parts[0].nodes = [buttons];
  assert.equal(validateGlobalTemplateLibrary(library).version, 8); assert.throws(() => validateGlobalTemplateLibrary({ ...library, version: 7 }));
  assert.match(blocksToHtml([buttons]), /data-vertical-align="stretch"/);
});

test('Buttons detector scopes recovery patches and excludes unrelated style settings', () => {
  assert.equal(containsButtonsAlignment({ blockStyles: { buttons: { verticalAlign: 'stretch' } } }), false);
  const prefix = ['parts','@header','nodes','@buttons'];
  const patches = [{ path: [...prefix,'type'], value: 'buttons' }, { path: [...prefix,'verticalAlign'], value: 'stretch' }];
  assert.equal(containsButtonsAlignment(patches), true); assert.equal(containsButtonsAlignment(patches.slice(1)), false);
  assert.equal(containsButtonsAlignment(patches.map(patch => ({ ...patch, path: ['unrelated', ...patch.path.slice(1)] }))), false);
});

test('the production Buttons toolbar preserves the inferred vertical axis when authoring horizontal alignment', async () => {
  const { ButtonsLayoutToolbar } = await load('../app/studio/blocks/buttons-layout-toolbar.tsx');
  for (const [justification, expected] of [['left','top'], ['centre','centre'], ['right','bottom'], ['space-between','space-between']]) {
    const legacy = { ...buttons, orientation: 'vertical', justification, verticalAlign: undefined };
    let result;
    const toolbar = ButtonsLayoutToolbar({ block: legacy, writable: true, onUpdate: update => { result = update(legacy); } });
    toolbar.props.onUpdate(group => ({ ...group, horizontalAlign: justification === 'right' ? 'left' : 'right' }));
    assert.equal(result.verticalAlign, expected);
    assert.equal(buttonsLayoutStyle(result).justifyContent, buttonsLayoutStyle(legacy).justifyContent);
    assert.equal(result.children, legacy.children);
    const unchanged = ButtonsLayoutToolbar({ block: legacy, writable: true, onUpdate: update => { result = update(legacy); } });
    unchanged.props.onUpdate(group => ({ ...group, horizontalAlign: justification }));
    assert.equal(result, legacy, 'same alignment must not materialise metadata or history');
  }
});
