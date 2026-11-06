import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { loadProductionModule } from './production-module.mjs';
import { withHtmlDom } from './html-dom-fixture.mjs';

const load = path => loadProductionModule(new URL(path, import.meta.url));
const crop = await load('../app/content/image-edit.ts');
const { ImageContent } = await load('../app/components/blocks/image-content.tsx');
const { validContentBlocks, validateStudioWorkspace, validatePublicationSnapshot } = await load('../app/studio/workspace-validation.ts');
const { initialStudioWorkspace } = await load('../app/studio/editor-model.ts');
const { toLocallyPublishedArticle } = await load('../app/content/local-publishing.ts');
const { emptyTemplateStore, createTemplateSet, validateTemplateStore } = await load('../app/studio/template-model.ts');
const { validateTemplatePackage } = await load('../app/studio/template-package.ts');
const { blockClipboardHtml, readBlockClipboardPayload } = await load('../app/studio/block-clipboard.ts');
const { validateStudioBackup } = await load('../app/studio/backup-store.ts');
const { replaceImageMedia, imageReplacementTarget } = await load('../app/studio/image-replacement.ts');
const { createGlobalTemplateLibrary, validateGlobalTemplateLibrary } = await load('../app/studio/global-template-contract.ts');
const { blocksToHtml, parseHtmlToBlocks } = await load('../app/studio/studio-html-editor.ts');
const { validTestSiteDocument, testSiteCollection, testSiteWorkspace } = await load('../app/studio/test-site/contract.ts');

const edit = { crop: { x: .1, y: .15, width: .6, height: .5 }, sourceWidth: 1200, sourceHeight: 800, zoom: 1.4, rotation: 0, straighten: 12, flipHorizontal: true, flipVertical: false };
const image = { id: 'image-crop', type: 'image', src: 'https://example.test/landscape.png', alt: 'A mountain landscape', imageEdit: edit };
const page = { ...initialStudioWorkspace.documents[0], id: 'crop-page', kind: 'page', slug: 'crop-page', title: 'Crop', blocks: [image] };

test('validates bounded crop geometry and shared SVG rendering without changing the source reference', () => {
  assert.equal(crop.validImageCropEdit(edit), true);
  assert.equal(crop.validImageCropEdit({ ...edit, crop: { ...edit.crop, width: 2 } }), false);
  assert.equal(crop.validImageCropEdit({ ...edit, zoom: 3.01 }), false);
  assert.equal(crop.validImageCropEdit({ ...edit, sourceWidth: Infinity }), false);
  assert.equal(crop.containsAuthoredImageCrop({ blocks: [image] }), true);
  assert.equal(crop.containsAuthoredImageCrop({ styles: { imageEdit: edit } }), false);
  assert.equal(validContentBlocks([image]), true);
  assert.equal(validContentBlocks([{ ...image, imageEdit: { ...edit, straighten: 46 } }]), false);

  const before = structuredClone(image);
  const markup = renderToStaticMarkup(createElement(ImageContent, { block: image, src: image.src }));
  assert.match(markup, /<svg[^>]+viewBox="120 120 720 400"/);
  assert.match(markup, /<image[^>]+href="https:\/\/example\.test\/landscape\.png"/);
  assert.match(markup, /rotate\(12\)/);
  assert.match(markup, /scale\(-1 1\)/);
  assert.match(markup, /aria-label="A mountain landscape"/);
  assert.deepEqual(image, before, 'rendering leaves the source reference and authored block unchanged');
});

test('workspace and publication envelopes accept the new crop version and reject crop data in older versions', () => {
  const workspace = { ...initialStudioWorkspace, documents: [page], activeDocumentId: page.id };
  assert.equal(validateStudioWorkspace({ ...workspace, version: 47 }).documents[0].blocks[0].imageEdit.zoom, 1.4);
  assert.throws(() => validateStudioWorkspace({ ...workspace, version: 46 }), /unsupported version/);

  const article = toLocallyPublishedArticle(page);
  assert.equal(validatePublicationSnapshot({ version: 38, posts: [article] }).posts[0].blocks[0].imageEdit.straighten, 12);
  assert.throws(() => validatePublicationSnapshot({ version: 37, posts: [article] }), /Image crop edits require published-post snapshot v38/);
});

test('HTML inspection and local fixture envelopes preserve crop metadata and reject older fixtures', () => {
  const parsed = withHtmlDom(() => parseHtmlToBlocks(blocksToHtml([image]), [image]));
  assert.equal(parsed.error, undefined);
  assert.deepEqual(parsed.blocks[0].imageEdit, edit);

  const navigationSet = { ...createTemplateSet('Navigation'), id: 'navigation', templates: [], parts: [{ id: 'nav', kind: 'header', name: 'Navigation', nodes: [{ id: 'menu', type: 'element', element: 'navigation' }] }] };
  const legacyPage = { id: page.id, kind: 'page', title: page.title, slug: page.slug, excerpt: '', status: 'published', updatedAt: '2026-10-22T00:00:00.000Z', tags: [], seoTitle: '', seoDescription: '', blocks: [] };
  const legacy = {
    format: 'acm-test-site', version: 9, siteId: 'test', documents: [legacyPage], categories: [], bin: [],
    activeDocumentId: page.id, homeDocumentId: page.id, templates: { ...emptyTemplateStore(), sets: [createTemplateSet('Original'), navigationSet] },
    siteNavigation: { setId: 'navigation', partId: 'nav' }, browserImportComplete: true,
    globalTemplates: [], publications: [{ document: legacyPage }],
  };
  const fixture = testSiteCollection(legacy);
  assert.equal(validTestSiteDocument(fixture), true, 'the migrated fixture starts valid');
  fixture.documents[0].blocks = [image];
  assert.equal(fixture.version, 50);
  assert.doesNotThrow(() => validateStudioWorkspace({ ...fixture, version: 47 }), 'fixture workspace accepts crop');
  assert.equal(validContentBlocks(fixture.documents[0].blocks), true);
  assert.equal(validTestSiteDocument(fixture), true);
  assert.deepEqual(testSiteWorkspace(fixture).documents[0].blocks[0].imageEdit, edit);
  assert.equal(validTestSiteDocument({ ...fixture, version: 35 }), false);
});

test('template, package, clipboard and backup contracts round-trip crop metadata and reject older envelopes', () => {
  const set = createTemplateSet('Crop fixture');
  const template = set.templates.find(item => item.kind === 'page');
  template.nodes = [image];
  const currentStore = { ...emptyTemplateStore(), version: '0.60.0', sets: [set] };
  assert.equal(validateTemplateStore(currentStore).sets[0].templates.find(item => item.kind === 'page').nodes[0].imageEdit.straighten, 12);
  assert.throws(() => validateTemplateStore({ ...currentStore, version: '0.57.0' }), /Image crop edits require template v0.58.0/);
  assert.equal(validateTemplatePackage({ format: 'acm-studio-template-set', version: '0.60.0', set, media: [] }).version, '0.71.0');
  assert.throws(() => validateTemplatePackage({ format: 'acm-studio-template-set', version: '0.57.0', set, media: [] }), /Image crop edits require template v0.58.0/);
  const navigationSet = { ...createTemplateSet('Navigation'), id: 'global-navigation', templates: [], parts: [{ id: 'global-nav', kind: 'header', name: 'Navigation', nodes: [{ id: 'global-nav-block', type: 'element', element: 'navigation' }] }] };
  const globalTemplateStore = { ...currentStore, sets: [set, navigationSet] };
  const globalLibrary = createGlobalTemplateLibrary({
    test: { templates: globalTemplateStore, siteNavigation: { setId: navigationSet.id, partId: navigationSet.parts[0].id } },
    test2: { templates: globalTemplateStore, siteNavigation: { setId: navigationSet.id, partId: navigationSet.parts[0].id } },
  });
  assert.equal(globalLibrary.version, 42);
  const persistedGlobal = validateGlobalTemplateLibrary(globalLibrary);
  assert.equal(persistedGlobal.templates.sets.find(item => item.id === set.id).templates.find(item => item.kind === 'page').nodes.some(node => node.type === 'image' && node.imageEdit?.rotation === 0), true);
  assert.throws(() => validateGlobalTemplateLibrary({ ...globalLibrary, version: 27 }), /Image crop edits require global template library v28/);

  const clipboard = blockClipboardHtml([image]);
  const originalParser = globalThis.DOMParser;
  try {
    const serialized = JSON.parse(clipboard.match(/data-acm-studio-blocks="([\s\S]*?)"/)[1].replaceAll('&quot;', '"').replaceAll('&amp;', '&').replaceAll('&lt;', '<').replaceAll('&gt;', '>'));
    globalThis.DOMParser = class { parseFromString() { return { querySelector: () => ({ getAttribute: () => JSON.stringify(serialized) }) }; } };
    assert.equal(readBlockClipboardPayload(clipboard).blocks[0].imageEdit.straighten, 12);
    globalThis.DOMParser = class { parseFromString() { return { querySelector: () => ({ getAttribute: () => JSON.stringify({ ...serialized, version: 23 }) }) }; } };
    assert.equal(readBlockClipboardPayload(clipboard), null);
  } finally { globalThis.DOMParser = originalParser; }

  assert.throws(() => validateStudioBackup({ format: 'acm-studio-backup', version: 23, workspace: { ...initialStudioWorkspace, version: 46, documents: [page] } }), /Image crop edits require backup v24/);
});

test('replacing an Image clears its crop metadata while retaining the original object', () => {
  const target = imageReplacementTarget(image);
  const replacement = replaceImageMedia(image, target, { id: 'new-media', name: 'New landscape.png' }, 'New landscape');
  assert.equal(replacement.imageEdit, undefined);
  assert.equal(replacement.mediaId, 'new-media');
  assert.deepEqual(image.imageEdit, edit);
});
