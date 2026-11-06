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
const { TEMPLATE_VERSION, emptyTemplateStore, createTemplateSet, validateTemplateStore } = await load('../app/studio/template-model.ts');
const { validateTemplatePackage } = await load('../app/studio/template-package.ts');
const { createGlobalTemplateLibrary, validateGlobalTemplateLibrary } = await load('../app/studio/global-template-contract.ts');
const { blockClipboardHtml, readBlockClipboardPayload } = await load('../app/studio/block-clipboard.ts');
const { validateStudioBackup } = await load('../app/studio/backup-store.ts');
const { replaceImageMedia, imageReplacementTarget } = await load('../app/studio/image-replacement.ts');
const { blocksToHtml, parseHtmlToBlocks } = await load('../app/studio/studio-html-editor.ts');
const { validTestSiteDocument, testSiteCollection, testSiteWorkspace } = await load('../app/studio/test-site/contract.ts');

const edit = { crop: { x: .1, y: .15, width: .6, height: .5 }, sourceWidth: 1200, sourceHeight: 800, zoom: 1.4, rotation: 90, straighten: 12, flipHorizontal: true, flipVertical: false };
const cover = { id: 'cover-crop', type: 'cover', src: 'https://example.test/landscape.png', alt: 'A mountain landscape', dimRatio: 25, imageEdit: edit, children: [] };
const page = { ...initialStudioWorkspace.documents.find(document => document.kind === 'page'), id: 'crop-cover-page', slug: 'crop-cover-page', title: 'Cover crop', blocks: [cover] };

test('Cover crop uses the shared validated pixel-space renderer and round-trips through HTML inspection', () => {
  assert.equal(crop.validImageCropEdit(edit), true);
  assert.equal(crop.containsAuthoredCoverCrop({ blocks: [cover] }), true);
  assert.equal(crop.containsAuthoredImageCrop({ blocks: [cover] }), false);
  assert.equal(validContentBlocks([cover]), true);
  assert.equal(validContentBlocks([{ ...cover, imageEdit: { ...edit, crop: { ...edit.crop, width: 2 } } }]), false);

  const markup = renderToStaticMarkup(createElement(ImageContent, { block: cover, src: cover.src, coverFrame: false }));
  assert.match(markup, /<svg[^>]+viewBox="120 120 720 400"/);
  assert.match(markup, /style="[^"]*\bwidth:100%/);
  assert.match(markup, /style="[^"]*\bdisplay:block/);
  assert.match(markup, /<image[^>]+href="https:\/\/example\.test\/landscape\.png"/);
  assert.match(markup, /rotate\(102\)/);
  assert.match(markup, /scale\(-1 1\)/);
  assert.match(markup, /aria-label="A mountain landscape"/);

  const html = blocksToHtml([cover]);
  assert.match(html, /data-cover-image-edit=/);
  const parsed = withHtmlDom(() => parseHtmlToBlocks(html, [cover]));
  assert.equal(parsed.error, undefined);
  assert.deepEqual(parsed.blocks[0].imageEdit, edit);
  const replacement = replaceImageMedia(cover, imageReplacementTarget(cover), { id: 'new-media', name: 'New landscape.png' }, 'New image');
  assert.equal(replacement.imageEdit, undefined);
});

test('Cover crop version gates preserve the authored data across all Studio envelopes', () => {
  const workspace = { ...initialStudioWorkspace, version: 53, documents: [page], activeDocumentId: page.id };
  assert.deepEqual(validateStudioWorkspace(workspace).documents[0].blocks[0].imageEdit, edit);
  assert.throws(() => validateStudioWorkspace({ ...workspace, version: 52 }), /invalid|unsupported/i);

  const article = toLocallyPublishedArticle(page);
  assert.deepEqual(validatePublicationSnapshot({ version: 44, posts: [article] }).posts[0].blocks[0].imageEdit, edit);
  assert.throws(() => validatePublicationSnapshot({ version: 43, posts: [article] }), /Cover crop edits require published-post snapshot v44/);

  const set = createTemplateSet('Cover crop fixture');
  set.parts[0].nodes = [cover];
  const store = { ...emptyTemplateStore(), version: '0.64.0', sets: [set] };
  assert.deepEqual(validateTemplateStore(store).sets[0].parts[0].nodes[0].imageEdit, edit);
  assert.throws(() => validateTemplateStore({ ...store, version: '0.63.0' }), /Cover crop edits require template v0.64.0/);
  const templatePackage = validateTemplatePackage({ format: 'acm-studio-template-set', version: '0.64.0', set, media: [] });
  assert.equal(templatePackage.version, TEMPLATE_VERSION);
  assert.deepEqual(templatePackage.set.parts[0].nodes[0].imageEdit, edit);
  assert.throws(() => validateTemplatePackage({ format: 'acm-studio-template-set', version: '0.63.0', set, media: [] }), /Cover crop edits require template v0.64.0/);

  const navigationSet = { ...createTemplateSet('Navigation'), id: 'cover-crop-navigation', templates: [], parts: [{ id: 'cover-crop-navigation-part', kind: 'header', name: 'Navigation', nodes: [{ id: 'cover-crop-navigation-block', type: 'element', element: 'navigation' }] }] };
  const globalSource = { ...store, sets: [set, navigationSet] };
  const library = createGlobalTemplateLibrary({
    test: { templates: globalSource, siteNavigation: { setId: navigationSet.id, partId: navigationSet.parts[0].id } },
    test2: { templates: globalSource, siteNavigation: { setId: navigationSet.id, partId: navigationSet.parts[0].id } },
  });
  assert.equal(library.version, 42);
  const validatedLibrary = validateGlobalTemplateLibrary(library);
  assert.equal(validatedLibrary.version, library.version);
  assert.deepEqual(validatedLibrary.templates.sets.find(item => item.id === set.id).parts[0].nodes[0].imageEdit, edit);
  const cropOnlyLibraryV34 = validateGlobalTemplateLibrary({ ...library, version: 34 });
  assert.equal(cropOnlyLibraryV34.version, library.version);
  const cropOnlyLibraryBlock = cropOnlyLibraryV34.templates.sets.find(item => item.id === set.id).parts[0].nodes[0];
  assert.deepEqual(cropOnlyLibraryBlock.imageEdit, edit);
  assert.equal(cropOnlyLibraryBlock.videoBackground, undefined);
  assert.throws(() => validateGlobalTemplateLibrary({ ...library, version: 33 }), /Cover crop edits require global template library v34/);

  const clipboard = withHtmlDom(() => readBlockClipboardPayload(blockClipboardHtml([cover])));
  assert.deepEqual(clipboard.blocks[0].imageEdit, edit);
  const legacyClipboard = JSON.stringify({ format: 'acm-studio-blocks', version: 29, blocks: [cover], footnotes: [] })
    .replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
  assert.equal(withHtmlDom(() => readBlockClipboardPayload(`<div data-acm-studio-blocks="${legacyClipboard}"></div>`)), null);

  const backup = { format: 'acm-studio-backup', version: 30, exportedAt: '2026-10-29T00:00:00Z', workspace, publications: null, media: { folders: [], assets: [] } };
  assert.deepEqual(validateStudioBackup(backup).workspace.documents[0].blocks[0].imageEdit, edit);
  assert.throws(() => validateStudioBackup({ ...backup, version: 29 }), /Cover crop edits require backup v30/);

  const site = testSiteCollection({ format: 'acm-test-site', version: 2, siteId: 'test', document: { ...page, blocks: [{ id: 'legacy-paragraph', type: 'paragraph', text: 'Fixture' }] } });
  assert.equal(site.version, 50);
  site.documents[0].blocks = [cover];
  site.publications = site.publications.map(publication => publication.document.id === page.id
    ? { ...publication, document: { ...publication.document, blocks: [cover] } }
    : publication);
  assert.equal(validTestSiteDocument(site), true);
  assert.deepEqual(testSiteWorkspace(site).documents[0].blocks[0].imageEdit, edit);
  const cropOnlyFixtureV42 = { ...site, version: 42 };
  assert.equal(validTestSiteDocument(cropOnlyFixtureV42), true);
  const migratedCropOnlyFixture = testSiteCollection(cropOnlyFixtureV42);
  assert.equal(migratedCropOnlyFixture.version, site.version);
  assert.deepEqual(migratedCropOnlyFixture.documents[0].blocks[0].imageEdit, edit);
  assert.equal(migratedCropOnlyFixture.documents[0].blocks[0].videoBackground, undefined);
  assert.equal(validTestSiteDocument({ ...site, version: 41 }), false);
});
