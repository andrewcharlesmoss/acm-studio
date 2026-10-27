import assert from 'node:assert/strict';
import test from 'node:test';
import { loadProductionModule } from './production-module.mjs';
const load = path => loadProductionModule(new URL(path, import.meta.url));
const { containsImageResolution } = await load('../app/content/image-resolution.ts');
const { validContentBlocks, validateStudioWorkspace, migrateStudioWorkspace, validatePublicationSnapshot } = await load('../app/studio/workspace-validation.ts');
const { initialStudioWorkspace } = await load('../app/studio/editor-model.ts');
const { toLocallyPublishedArticle } = await load('../app/content/local-publishing.ts');
const { emptyTemplateStore, createTemplateSet, validateTemplateStore, validateTemplateSnapshot } = await load('../app/studio/template-model.ts');
const { validateTemplatePackage } = await load('../app/studio/template-package.ts');
const { validTestSiteDocument, testSiteCollection } = await load('../app/studio/test-site/contract.ts');
const { createGlobalTemplateLibrary, validateGlobalTemplateLibrary } = await load('../app/studio/global-template-contract.ts');
const { readBlockClipboardPayload, blockClipboardHtml } = await load('../app/studio/block-clipboard.ts');
const pin = { key: 'medium', sourceDigest: 'a'.repeat(64), renditionDigest: 'b'.repeat(64) };
const image = { id: 'image', type: 'image', src: '', mediaId: 'media-1', alt: 'Landscape', imageResolution: pin };
const page = { id: 'home', kind: 'page', title: 'Home', slug: '', excerpt: '', status: 'published', updatedAt: '2026-10-22T00:00:00.000Z', tags: [], seoTitle: '', seoDescription: '', blocks: [] };
const set = createTemplateSet('Original');
const nav = { ...structuredClone(set), id: 'navigation', templates: [], parts: [{ id: 'nav', kind: 'header', name: 'Navigation', nodes: [{ id: 'menu', type: 'element', element: 'navigation' }] }] };
const legacy = { format: 'acm-test-site', version: 9, siteId: 'test', documents: [page], categories: [], bin: [], activeDocumentId: 'home', homeDocumentId: 'home', templates: { ...emptyTemplateStore(), sets: [set, nav] }, siteNavigation: { setId: 'navigation', partId: 'nav' }, browserImportComplete: true, globalTemplates: [], publications: [{ document: page }] };

test('detects Image selections and discriminated global recovery patches without matching unrelated settings', () => {
  assert.equal(containsImageResolution(image), true);
  assert.equal(containsImageResolution({ type: 'paragraph', imageResolution: pin }), false);
  assert.equal(containsImageResolution({ blockStyles: { image: { imageResolution: pin } } }), false);
  const prefix = ['parts', '@header', 'nodes', '@image'];
  const patches = [{ path: [...prefix, 'type'], value: 'image' }, { path: [...prefix, 'imageResolution', 'key'], value: 'medium' }];
  assert.equal(containsImageResolution(patches), true);
  assert.equal(containsImageResolution(patches.slice(1)), false);
  assert.equal(containsImageResolution([{ ...patches[0], value: 'paragraph' }, patches[1]]), false);
});

test('current content envelopes reject Image size selections until their formats support them', () => {
  assert.equal(validContentBlocks([image]), false);
  const doc = { ...initialStudioWorkspace.documents.find(item => item.kind === 'post'), blocks: [image] };
  const workspace = { ...initialStudioWorkspace, documents: [doc], activeDocumentId: doc.id, bin: [] };
  const before = JSON.stringify(workspace);
  for (const validate of [validateStudioWorkspace, migrateStudioWorkspace]) assert.throws(() => validate(workspace), /unsupported version/);
  assert.equal(JSON.stringify(workspace), before, 'rejected data remains available for recovery');
  const unrelated = { ...workspace, documents: [{ ...doc, blocks: [{ id: 'p', type: 'paragraph', text: 'Keep', imageResolution: pin }] }] };
  for (const validate of [validateStudioWorkspace, migrateStudioWorkspace]) {
    const block = validate(unrelated).documents[0].blocks[0];
    assert.equal(block.text, 'Keep');
    assert.equal(JSON.stringify(block.imageResolution), JSON.stringify(pin));
  }
  assert.throws(() => validatePublicationSnapshot({ version: 24, posts: [toLocallyPublishedArticle(doc)] }));
  const template = structuredClone(set); template.parts[0].nodes = [image];
  const store = { ...emptyTemplateStore(), sets: [template] };
  assert.throws(() => validateTemplateStore(store));
  assert.throws(() => validateTemplateSnapshot({ version: '0.36.0', set: template, templateId: template.templates[0].id }));
  assert.throws(() => validateTemplatePackage({ format: 'acm-studio-template-set', version: '0.36.0', set: template, media: [] }));
  assert.throws(() => blockClipboardHtml([image]));
  const original = globalThis.DOMParser;
  try {
    const payload = JSON.stringify({ format: 'acm-studio-blocks', version: 9, blocks: [image], footnotes: [] });
    globalThis.DOMParser = class { parseFromString() { return { querySelector: () => ({ getAttribute: () => payload }) }; } };
    assert.equal(readBlockClipboardPayload('data-acm-studio-blocks'), null);
  } finally { globalThis.DOMParser = original; }
  const fixture = testSiteCollection(structuredClone(legacy)); fixture.documents[0].blocks = [image];
  assert.equal(validTestSiteDocument(fixture), false);
  const library = createGlobalTemplateLibrary({ test: testSiteCollection(structuredClone(legacy)), test2: { ...testSiteCollection(structuredClone(legacy)), siteId: 'test2' } });
  library.migrations.test.bases[0].parts[0].nodes = [image];
  assert.throws(() => validateGlobalTemplateLibrary(library));
});
