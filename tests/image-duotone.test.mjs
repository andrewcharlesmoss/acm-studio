import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { loadProductionModule } from './production-module.mjs';
const load = path => loadProductionModule(new URL(path, import.meta.url));
const { validImageDuotone, containsAuthoredImageDuotone } = await load('../app/content/image-duotone.ts');
const { validContentBlocks, validateStudioWorkspace, migrateStudioWorkspace, validatePublicationSnapshot } = await load('../app/studio/workspace-validation.ts');
const { initialStudioWorkspace } = await load('../app/studio/editor-model.ts');
const { toLocallyPublishedArticle } = await load('../app/content/local-publishing.ts');
const { emptyTemplateStore, createTemplateSet, validateTemplateStore, validateTemplateSnapshot, templateEditorBlocks, templateNodesFromBlocks } = await load('../app/studio/template-model.ts');
const { validateTemplatePackage } = await load('../app/studio/template-package.ts');
const { validTestSiteDocument, testSiteCollection, testSiteWorkspace } = await load('../app/studio/test-site/contract.ts');
const { createGlobalTemplateLibrary, validateGlobalTemplateLibrary } = await load('../app/studio/global-template-contract.ts');
const { blockClipboardHtml, readBlockClipboardPayload } = await load('../app/studio/block-clipboard.ts');
const { availableBlockTransformsInDocument, transformBlock } = await load('../app/studio/block-transforms.ts');
const { BlockRenderer } = await load('../app/components/content.tsx');
const { blocksToHtml } = await load('../app/studio/studio-html-editor.ts');
const effect = { dark: '#000080', light: '#FFCC00' };
const image = { id: 'image', type: 'image', src: '/specimens/landscape.svg', alt: 'Landscape', duotone: effect, caption: 'Rich caption', captionRuns: [{ text: 'Rich caption', marks: ['italic'] }], aspectRatio: 'classic', blockAlign: 'wide' };
const page = { id: 'home', kind: 'page', title: 'Home', slug: '', excerpt: '', status: 'published', updatedAt: '2026-10-22T00:00:00.000Z', tags: [], seoTitle: '', seoDescription: '', blocks: [] };
const set = createTemplateSet('Original');
const nav = { ...structuredClone(set), id: 'navigation', templates: [], parts: [{ id: 'nav', kind: 'header', name: 'Navigation', nodes: [{ id: 'menu', type: 'element', element: 'navigation' }] }] };
const legacyFixture = { format: 'acm-test-site', version: 9, siteId: 'test', documents: [page], categories: [], bin: [], activeDocumentId: 'home', homeDocumentId: 'home', templates: { ...emptyTemplateStore(), sets: [set, nav] }, siteNavigation: { setId: 'navigation', partId: 'nav' }, browserImportComplete: true, globalTemplates: [], publications: [{ document: page }] };
const plain = value => JSON.parse(JSON.stringify(value));

test('authored Image Duotone validates exact bounded colours, None, and inheritance', () => {
  for (const value of [effect, { dark: '#abcdef', light: '#FEDCBA' }, null, undefined]) {
    assert.equal(validImageDuotone(value), true); assert.equal(validContentBlocks([{ ...image, duotone: value }]), true);
  }
  for (const value of [{}, { dark: '#fff', light: '#ffffff' }, { dark: 'url(/image)', light: '#ffffff' }, { ...effect, extra: true }, 'none', [], 1]) {
    assert.equal(validImageDuotone(value), false); assert.equal(validContentBlocks([{ ...image, duotone: value }]), false);
  }
});

test('content detection excludes independent website settings and ambiguous recovery fields', () => {
  for (const value of [image, { ...image, duotone: null }]) assert.equal(containsAuthoredImageDuotone(value), true);
  assert.equal(containsAuthoredImageDuotone({ ...image, duotone: undefined }), false);
  assert.equal(containsAuthoredImageDuotone({ blockStyles: { image: { duotone: effect } } }), false);
  assert.equal(containsAuthoredImageDuotone({ type: 'foreign-domain', id: 'image', duotone: effect }), false);
  const prefix = ['parts', '@header', 'nodes', '@image'];
  for (const tail of [['duotone'], ['duotone', 'dark']]) {
    const patches = [{ path: [...prefix, 'type'], value: 'image' }, { path: [...prefix, ...tail], value: tail.length === 1 ? null : '#123456' }];
    assert.equal(containsAuthoredImageDuotone(patches), true);
    assert.equal(containsAuthoredImageDuotone(patches.slice(1)), false);
    assert.equal(containsAuthoredImageDuotone([{ ...patches[0], value: 'group' }, patches[1]]), false);
    assert.equal(containsAuthoredImageDuotone([patches[0], { ...patches[1], value: undefined }]), false);
  }
  assert.equal(containsAuthoredImageDuotone([{ path: [...prefix, 'type'], value: 'image' }, { path: [...prefix, 'visualStyle', 'duotone'], value: effect }]), false);
});

for (const duotone of [effect, null]) test(`Image Duotone ${duotone ? 'colours' : 'None'} round-trips six current envelopes and rejects older envelopes`, () => {
  const block = { ...image, duotone };
  const doc = { ...initialStudioWorkspace.documents.find(item => item.kind === 'post'), blocks: [block] };
  const workspace = { ...initialStudioWorkspace, documents: [doc], activeDocumentId: doc.id, bin: [] };
  for (const validate of [validateStudioWorkspace, migrateStudioWorkspace]) { assert.deepEqual(plain(validate(workspace).documents[0].blocks[0]), block); assert.throws(() => validate({ ...workspace, version: 31 })); }
  const post = toLocallyPublishedArticle(doc);
  assert.deepEqual(plain(validatePublicationSnapshot({ version: 24, posts: [post] }).posts[0].blocks[0].duotone), duotone);
  assert.throws(() => validatePublicationSnapshot({ version: 23, posts: [post] }));
  const template = structuredClone(set); template.parts[0].nodes = [block];
  const store = { ...emptyTemplateStore(), sets: [template] };
  assert.deepEqual(plain(validateTemplateStore(store).sets[0].parts[0].nodes[0].duotone), duotone);
  assert.throws(() => validateTemplateStore({ ...store, version: '0.35.0' }));
  for (const validate of [value => validateTemplateSnapshot({ version: value, set: template, templateId: template.templates[0].id }), value => validateTemplatePackage({ format: 'acm-studio-template-set', version: value, set: template, media: [] })]) { assert.doesNotThrow(() => validate('0.36.0')); assert.throws(() => validate('0.35.0')); }
  const html = blockClipboardHtml([block]);
  const encoded = html.match(/data-acm-studio-blocks="([^"]*)"/)[1].replaceAll('&quot;', '"').replaceAll('&lt;', '<').replaceAll('&gt;', '>').replaceAll('&amp;', '&');
  const original = globalThis.DOMParser;
  try {
    let payload = encoded;
    globalThis.DOMParser = class { parseFromString() { return { querySelector: () => ({ getAttribute: () => payload }) }; } };
    assert.deepEqual(plain(readBlockClipboardPayload(html).blocks[0]), block);
    payload = JSON.stringify({ ...JSON.parse(encoded), version: 8 }); assert.equal(readBlockClipboardPayload(html), null);
  } finally { globalThis.DOMParser = original; }
  const fixture = testSiteCollection(structuredClone(legacyFixture)); fixture.documents[0].blocks = [block];
  assert.equal(fixture.version, 15); assert.equal(validTestSiteDocument(fixture), true); assert.equal(validTestSiteDocument({ ...fixture, version: 14 }), false); assert.equal(testSiteWorkspace(fixture).version, 32);
  const library = createGlobalTemplateLibrary({ test: testSiteCollection(structuredClone(legacyFixture)), test2: { ...testSiteCollection(structuredClone(legacyFixture)), siteId: 'test2' } });
  library.migrations.test.bases[0].parts[0].nodes = [block];
  assert.equal(validateGlobalTemplateLibrary(library).version, 7); assert.throws(() => validateGlobalTemplateLibrary({ ...library, version: 6 }), /Image Duotone/);
});

test('previous Quote and ratio introduction envelopes remain readable', () => {
  const quote = { id: 'quote', type: 'quote', text: '', visualStyle: { blockGap: '12px', headingColor: '#123456' }, children: [{ id: 'body', type: 'paragraph', text: 'Body' }] };
  const doc = { ...initialStudioWorkspace.documents.find(item => item.kind === 'post'), blocks: [quote] };
  assert.doesNotThrow(() => validateStudioWorkspace({ ...initialStudioWorkspace, version: 31, documents: [doc], activeDocumentId: doc.id, bin: [] }));
  assert.doesNotThrow(() => validatePublicationSnapshot({ version: 23, posts: [toLocallyPublishedArticle(doc)] }));
  const template = structuredClone(set); template.parts[0].nodes = [quote];
  assert.doesNotThrow(() => validateTemplateStore({ ...emptyTemplateStore(), version: '0.35.0', sets: [template] }));
  const fixture = testSiteCollection(structuredClone(legacyFixture)); fixture.documents[0].blocks = [quote]; assert.equal(validTestSiteDocument({ ...fixture, version: 14 }), true);
  const library = createGlobalTemplateLibrary({ test: testSiteCollection(structuredClone(legacyFixture)), test2: { ...testSiteCollection(structuredClone(legacyFixture)), siteId: 'test2' } }); library.migrations.test.bases[0].parts[0].nodes = [quote]; assert.doesNotThrow(() => validateGlobalTemplateLibrary({ ...library, version: 6 }));
  const pageWorkspace = { ...initialStudioWorkspace, documents: [{ ...page, pageOrder: 12 }], activeDocumentId: page.id, bin: [] }; assert.equal(validateStudioWorkspace(pageWorkspace).documents[0].pageOrder, 12);
});

test('Image wrappers retain authored effects, rich captions, metadata and source exactly', () => {
  for (const id of ['wrap-group', 'wrap-columns']) {
    const choice = availableBlockTransformsInDocument(image, [image]).find(choice => choice.id === id); assert.ok(choice);
    let index = 0; const result = transformBlock(image, choice, () => `wrapper-${index++}`);
    assert.equal(result.type === 'columns' ? result.children[0].children[0] : result.children[0], image);
  }
});

test('canonical Image rendering and HTML export create separate filters without filtering captions', () => {
  const blocks = [image, { ...image, id: 'second-image', duotone: { dark: '#003333', light: '#B9F6CA' } }, { ...image, id: 'none-image', duotone: null }];
  for (const html of [renderToStaticMarkup(createElement(BlockRenderer, { blocks, variant: 'studio' })), blocksToHtml(blocks)]) {
    const ids = [...html.matchAll(/<filter id="([^"]+)"/g)].map(match => match[1]); assert.equal(ids.length, 2); assert.equal(new Set(ids).size, 2);
    assert.match(html, /data-image-duotone-authored="true"/); assert.match(html, /filter:none/); assert.match(html, /<figcaption><em>Rich caption<\/em><\/figcaption>/);
  }
});

test('previous Quote v8 and extended-ratio v7 clipboard envelopes remain readable', () => {
  const values = [[8, { id: 'quote', type: 'quote', text: '', visualStyle: { blockGap: '12px' } }], [7, { ...image, duotone: undefined }]];
  const original = globalThis.DOMParser;
  try {
    for (const [version, block] of values) {
      const payload = JSON.stringify({ format: 'acm-studio-blocks', version, blocks: [block], footnotes: [] });
      globalThis.DOMParser = class { parseFromString() { return { querySelector: () => ({ getAttribute: () => payload }) }; } };
      assert.deepEqual(plain(readBlockClipboardPayload('<div data-acm-studio-blocks></div>').blocks[0]), plain(block));
    }
  } finally { globalThis.DOMParser = original; }
});

test('global originals preserve authored effects while ambiguous legacy overrides stay recovery-only', async () => {
  const { effectiveGlobalTemplates } = await load('../app/studio/global-template-contract.ts');
  const source = testSiteCollection(structuredClone(legacyFixture));
  const library = createGlobalTemplateLibrary({ test: source, test2: { ...source, siteId: 'test2' } });
  const original = library.templates.sets[0]; original.parts[0].nodes = [image];
  const checked = validateGlobalTemplateLibrary(library);
  const effective = effectiveGlobalTemplates(source.templates, checked, []);
  assert.deepEqual(plain(effective.sets[0].parts[0].nodes[0].duotone), effect);
  const legacy = structuredClone(library); delete legacy.templates.sets[0].parts[0].nodes[0].duotone;
  const binding = { setId: original.id, globalSetId: original.id, ids: {}, overrides: [{ path: ['parts', `@${original.parts[0].id}`, 'nodes', '@image', 'duotone'], value: effect }] };
  source.globalTemplates = [binding];
  const retained = testSiteCollection({ ...source, version: 14 });
  assert.deepEqual(plain(retained.globalTemplates[0].overrides), binding.overrides);
  const recovered = effectiveGlobalTemplates(retained.templates, validateGlobalTemplateLibrary({ ...legacy, version: 6 }), retained.globalTemplates);
  assert.equal(recovered.sets[0].parts[0].nodes[0].duotone, undefined);
});

test('template editor projection retains owned Image filters and None exactly', () => {
  for (const duotone of [effect, null]) {
    const block = { ...image, duotone };
    const projected = templateEditorBlocks([block]);
    assert.deepEqual(plain(projected[0].duotone), duotone);
    assert.deepEqual(plain(templateNodesFromBlocks(projected, [block])[0]), block);
  }
});

test('Image inheritance shares variation and device resolution and real editor composition retains outer context', async () => {
  const { inheritedImageDuotone, useImageDuotoneInheritance } = await load('../app/studio/use-image-duotone-inheritance.ts');
  const { StudioEditor } = await load('../app/studio/studio-editor.tsx');
  const { withTestSiteNavigation } = await load('../app/studio/test-site/navigation.tsx');
  const { WebsiteDesignContext } = await load('../app/studio/site-editor/website-design-surface.tsx');
  const styles = { blockStyles: { image: { duotone: effect, responsive: { mobile: { duotone: { dark: '#003333', light: '#B9F6CA' } } }, variations: { rounded: { duotone: { dark: '#123456', light: '#ABCDEF' } } } } } };
  const bare = { id: 'inherited-image', type: 'image', src: '/specimens/landscape.svg', alt: '' };
  assert.deepEqual(inheritedImageDuotone(bare, styles, 'desktop'), effect);
  assert.deepEqual(inheritedImageDuotone(bare, styles, 'mobile'), { dark: '#003333', light: '#B9F6CA' });
  assert.deepEqual(inheritedImageDuotone({ ...bare, imageStyle: 'rounded' }, styles, 'desktop'), { dark: '#123456', light: '#ABCDEF' });
  function Probe() { return createElement('output', null, JSON.stringify(useImageDuotoneInheritance(bare))); }
  const document = { ...initialStudioWorkspace.documents[0], blocks: [] }, noop = () => {};
  const editor = presentation => createElement(StudioEditor, { target: { kind: 'site', id: document.id, name: 'Temporary', blocks: [], inspector: createElement(Probe) }, canvas: { activeDocument: document, presentation, wordCount: 0, characterCount: 0, linkTargets: [], mediaBlockUrls: {}, filteredBlocks: [], onSelectBlock: noop, onFocusDocumentField: noop, onDocumentFieldChange: noop } });
  const presentation = withTestSiteNavigation({}, { ...legacyFixture, websiteDesign: { identity: {}, styles } }, noop, noop);
  const rendered = renderToStaticMarkup(editor(presentation));
  assert.match(rendered, /<output>\{&quot;dark&quot;:&quot;#000080&quot;,&quot;light&quot;:&quot;#FFCC00&quot;\}<\/output>/);
  const outer = renderToStaticMarkup(createElement(WebsiteDesignContext.Provider, { value: { design: { identity: {}, styles }, imageUrl: value => value } }, editor(undefined)));
  assert.match(outer, /<output>\{&quot;dark&quot;:&quot;#000080&quot;,&quot;light&quot;:&quot;#FFCC00&quot;\}<\/output>/);
});
