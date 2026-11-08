import assert from 'node:assert/strict';
import test from 'node:test';
import { legacyGlobalTemplateLibrary } from "./helpers/legacy-global-template-library.mjs";
import { loadProductionModule } from './production-module.mjs';
const load = path => loadProductionModule(new URL(path, import.meta.url));
const { containsImageResolution } = await load('../app/content/image-resolution.ts');
const { validContentBlocks, validateStudioWorkspace, migrateStudioWorkspace, validatePublicationSnapshot } = await load('../app/studio/workspace-validation.ts');
const { initialStudioWorkspace } = await load('../app/studio/editor-model.ts');
const { toLocallyPublishedArticle } = await load('../app/content/local-publishing.ts');
const { emptyTemplateStore, createTemplateSet, validateTemplateStore, validateTemplateSnapshot, templateEditorBlocks, templateNodesFromBlocks } = await load('../app/studio/template-model.ts');
const { validateTemplatePackage } = await load('../app/studio/template-package.ts');
const { validTestSiteDocument, testSiteCollection } = await load('../app/studio/test-site/contract.ts');
const { createGlobalTemplateLibrary: createCurrentGlobalTemplateLibrary, validateGlobalTemplateLibrary } = await load('../app/studio/global-template-contract.ts');
const createGlobalTemplateLibrary = sites => legacyGlobalTemplateLibrary(createCurrentGlobalTemplateLibrary(sites));
const { readBlockClipboardPayload, blockClipboardHtml, BLOCK_CLIPBOARD_VERSION } = await load('../app/studio/block-clipboard.ts');
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

test('current versioned content envelopes retain Image size selections and prior versions reject them', () => {
  assert.equal(validContentBlocks([image]), true);
  const doc = { ...initialStudioWorkspace.documents.find(item => item.kind === 'post'), blocks: [image] };
  const workspace = { ...initialStudioWorkspace, version: 35, documents: [doc], activeDocumentId: doc.id, bin: [] };
  const before = JSON.stringify(workspace);
  for (const validate of [validateStudioWorkspace, migrateStudioWorkspace]) {
    assert.throws(() => validate({ ...workspace, version: 34 }), /unsupported version/);
    assert.equal(JSON.stringify(validate(workspace).documents[0].blocks[0].imageResolution), JSON.stringify(pin));
  }
  assert.equal(JSON.stringify(workspace), before, 'rejected data remains available for recovery');
  const unrelated = { ...workspace, documents: [{ ...doc, blocks: [{ id: 'p', type: 'paragraph', text: 'Keep', imageResolution: pin }] }] };
  for (const validate of [validateStudioWorkspace, migrateStudioWorkspace]) {
    const block = validate(unrelated).documents[0].blocks[0];
    assert.equal(block.text, 'Keep');
    assert.equal(JSON.stringify(block.imageResolution), JSON.stringify(pin));
  }
  assert.throws(() => validatePublicationSnapshot({ version: 26, posts: [toLocallyPublishedArticle(doc)] }));
  assert.equal(validatePublicationSnapshot({ version: 27, posts: [toLocallyPublishedArticle(doc)] }).posts[0].blocks[0].imageResolution.key, 'medium');
  const template = structuredClone(set); template.parts[0].nodes = [image];
  const store = { ...emptyTemplateStore(), sets: [template] };
  assert.throws(() => validateTemplateStore({ ...store, version: '0.38.0' }));
  assert.equal(validateTemplateStore(store).sets[0].parts[0].nodes[0].imageResolution.key, 'medium');
  assert.throws(() => validateTemplateSnapshot({ version: '0.38.0', set: template, templateId: template.templates[0].id }));
  assert.equal(validateTemplateSnapshot({ version: '0.39.0', set: template, templateId: template.templates[0].id }).version, '0.74.0');
  const asset = { id: 'media-1', name: 'Landscape.png', type: 'image/png', size: 1, createdAt: '2026-10-27T00:00:00.000Z', updatedAt: '2026-10-27T00:00:00.000Z', folderId: null, altText: 'Landscape', caption: '', dataBase64: 'AA==', imageRenditions: { version: 1, bundles: [{ sourceDigest: pin.sourceDigest, width: 1200, height: 800, variants: [{ key: 'medium', width: 300, height: 200, type: 'image/png', size: 1, digest: pin.renditionDigest, dataBase64: 'AA==' }] }] } };
  const templatePackage = { format: 'acm-studio-template-set', version: '0.39.0', set: template, media: [asset] };
  assert.equal(validateTemplatePackage(templatePackage).version, '0.74.0');
  assert.throws(() => validateTemplatePackage({ ...templatePackage, version: '0.38.0' }));
  const clipboard = blockClipboardHtml([image]);
  const original = globalThis.DOMParser;
  try {
    const payload = JSON.stringify({ format: 'acm-studio-blocks', version: 12, blocks: [image], footnotes: [] });
    globalThis.DOMParser = class { parseFromString() { return { querySelector: () => ({ getAttribute: () => payload }) }; } };
    assert.equal(readBlockClipboardPayload(clipboard).blocks[0].imageResolution.key, 'medium');
    globalThis.DOMParser = class { parseFromString() { return { querySelector: () => ({ getAttribute: () => JSON.stringify({ ...JSON.parse(payload), version: 11 }) }) }; } };
    assert.equal(readBlockClipboardPayload(clipboard), null);
  } finally { globalThis.DOMParser = original; }
  const fixture = testSiteCollection(structuredClone(legacy)); fixture.documents[0].blocks = [image];
  assert.equal(fixture.version, 53);
  assert.equal(validTestSiteDocument(fixture), false, 'local fixture content deliberately rejects browser-managed media');
  const library = createGlobalTemplateLibrary({ test: testSiteCollection(structuredClone(legacy)), test2: { ...testSiteCollection(structuredClone(legacy)), siteId: 'test2' } });
  library.migrations.test.bases[0].parts[0].nodes = [image];
  assert.equal(validateGlobalTemplateLibrary(library).version, 45);
  assert.throws(() => validateGlobalTemplateLibrary({ ...library, version: 9 }));
});

test('Content HTML elements and Button colours require current template, fixture, global library and clipboard versions', () => {
  const tagged = createTemplateSet('Tagged Content');
  const pageTemplate = tagged.templates.find(item => item.kind === 'page');
  const buttonStyle = { buttonTextColor: '#123456', buttonBackgroundGradient: { type: 'linear', angle: 90, stops: [{ colour: '#ffffff', position: 0 }, { colour: '#000000', position: 100 }] } };
  pageTemplate.nodes = [{ id: 'content-element', type: 'element', element: 'content', tagName: 'article', visualStyle: buttonStyle }];
  const store = { ...emptyTemplateStore(), sets: [tagged] };
  assert.equal(validateTemplateStore(store).version, '0.74.0');
  assert.throws(() => validateTemplateStore({ ...store, version: '0.40.0' }), /Content HTML elements/);
  assert.throws(() => validateTemplateStore({ ...store, version: '0.41.0' }), /Content Button element colours/);

  const site = testSiteCollection(structuredClone(legacy));
  const sitePage = site.templates.sets[0].templates.find(item => item.kind === 'page');
  sitePage.nodes = sitePage.nodes.map(node => node.type === 'element' && node.element === 'content' ? { ...node, tagName: 'article', visualStyle: buttonStyle } : node);
  assert.equal(validTestSiteDocument(site), true);
  assert.equal(validTestSiteDocument({ ...site, version: 19 }), false);
  assert.equal(validTestSiteDocument({ ...site, version: 18 }), false);

  const library = createGlobalTemplateLibrary({
    test: { ...site, siteId: 'test' },
    test2: { ...site, siteId: 'test2' },
  });
  assert.equal(validateGlobalTemplateLibrary(library).version, 45);
  assert.throws(() => validateGlobalTemplateLibrary({ ...library, version: 12 }), /Content Button element colours/);
  assert.throws(() => validateGlobalTemplateLibrary({ ...library, version: 11 }), /Content Button element colours/);

  const slot = { id: 'content-element', type: 'element', element: 'content', visualStyle: buttonStyle };
  const projected = templateNodesFromBlocks(templateEditorBlocks([slot]), [slot])[0];
  const clipboardHtml = blockClipboardHtml([templateEditorBlocks([slot])[0]]);
  assert.match(clipboardHtml, new RegExp(`&quot;version&quot;:${BLOCK_CLIPBOARD_VERSION}`));
  const priorPayload = JSON.stringify({ format: 'acm-studio-blocks', version: 13, blocks: [templateEditorBlocks([slot])[0]], footnotes: [] });
  const originalParser = globalThis.DOMParser;
  try {
    globalThis.DOMParser = class { parseFromString() { return { querySelector: () => ({ getAttribute: () => priorPayload }) }; } };
    assert.equal(readBlockClipboardPayload(clipboardHtml), null, 'clipboard v13 refuses Content Button colours rather than dropping them');
  } finally { globalThis.DOMParser = originalParser; }
  assert.equal(projected.visualStyle.buttonTextColor, '#123456');
});
