import assert from 'node:assert/strict';
import test from 'node:test';
import { legacyGlobalTemplateLibrary } from './helpers/legacy-global-template-library.mjs';
import { loadProductionModule } from './production-module.mjs';
import { withHtmlDom } from './html-dom-fixture.mjs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const load = path => loadProductionModule(new URL(path, import.meta.url));
const { availableBlockTransformsInDocument, transformBlock } = await load('../app/studio/block-transforms.ts');
const { validContentBlocks, validateStudioWorkspace, migrateStudioWorkspace, validatePublicationSnapshot } = await load('../app/studio/workspace-validation.ts');
const { initialStudioWorkspace } = await load('../app/studio/editor-model.ts');
const { toLocallyPublishedArticle } = await load('../app/content/local-publishing.ts');
const { findContentBlock } = await load('../app/content/block-tree.ts');
const { blocksToHtml, parseHtmlToBlocks } = await load('../app/studio/studio-html-editor.ts');
const { BlockRenderer } = await load('../app/components/content.tsx');
const { blockClipboardHtml, readBlockClipboardPayload } = await load('../app/studio/block-clipboard.ts');
const { validateStudioBackup } = await load('../app/studio/backup-store.ts');
const { validateTemplateStore, validateTemplateSnapshot, emptyTemplateStore, createTemplateSet } = await load('../app/studio/template-model.ts');
const { validateTemplatePackage } = await load('../app/studio/template-package.ts');
const { validTestSiteDocument, testSiteCollection, testSiteWorkspace } = await load('../app/studio/test-site/contract.ts');
const { createGlobalTemplateLibrary: createCurrentGlobalTemplateLibrary, validateGlobalTemplateLibrary } = await load('../app/studio/global-template-contract.ts');
const createGlobalTemplateLibrary = sites => legacyGlobalTemplateLibrary(createCurrentGlobalTemplateLibrary(sites));
const { capabilityProfileFor } = await load('../app/studio/blocks/capability-profiles.ts');

test('Image transforms to Cover, retaining its asset and attributes and moving its caption into a paragraph', () => {
  const image = {
    id: 'source-image', type: 'image', src: 'https://example.test/photo.jpg', mediaId: 'asset-1', alt: 'Mountain at dawn',
    caption: 'A <strong>carefully chosen</strong> view', captionRuns: [{ text: 'A ' }, { text: 'carefully chosen', marks: ['bold'] }, { text: ' view' }],
    duotone: { dark: '#123456', light: '#ABCDEF' }, blockAlign: 'wide',
    visualStyle: { anchor: 'image-anchor', margin: '12px', borderRadius: '20px', className: 'source-image-class' },
    linkDestination: 'lightbox', linkUrl: 'https://example.test/full-image', opensInNewTab: true,
    imageResolution: { key: 'large', sourceDigest: 'a'.repeat(64), renditionDigest: 'b'.repeat(64) },
    aspectRatio: 'landscape', scale: 'contain', displayWidth: 640, displayHeight: 360, focalX: 25, focalY: 75,
    imageStyle: 'rounded', decorative: true, title: 'Image title', wide: true,
  };
  const original = structuredClone(image);
  const choice = availableBlockTransformsInDocument(image, [image]).find(item => item.id === 'image-to-cover');
  assert.ok(choice, 'Image offers the Cover transform');
  const cover = transformBlock(image, choice, () => 'cover-caption');
  assert.equal(cover.type, 'cover');
  assert.equal(cover.id, image.id);
  assert.equal(cover.src, image.src);
  assert.equal(cover.mediaId, image.mediaId, 'keeps referring to the same media asset');
  assert.equal(cover.alt, image.alt);
  assert.equal(cover.blockAlign, 'wide');
  assert.deepEqual(cover.duotone, image.duotone);
  assert.deepEqual(cover.visualStyle, image.visualStyle, 'shared visual style is retained for the canonical image wrapper/frame split');
  for (const field of ['linkDestination', 'linkUrl', 'opensInNewTab', 'imageResolution', 'aspectRatio', 'scale', 'displayWidth', 'displayHeight', 'focalX', 'focalY', 'imageStyle', 'decorative', 'title']) {
    assert.equal(Object.hasOwn(cover, field), false, `does not carry unsupported Image field ${field}`);
  }
  assert.equal(cover.dimRatio, 50);
  assert.deepEqual(cover.children, [{ id: 'cover-caption', type: 'paragraph', text: image.caption, align: 'centre', style: { fontSize: 'large' }, runs: image.captionRuns }]);
  assert.equal(validContentBlocks([cover]), true);
  assert.equal(findContentBlock([cover], 'cover-caption').text, image.caption);
  assert.deepEqual(image, original, 'does not mutate or reassign the source Image');
});

test('Cover applies shared Image wrapper and frame styles once to a safe image URL', () => {
  const image = { id: 'styled-image', type: 'image', src: 'https://example.test/cover.jpg', alt: 'Safe test image', visualStyle: { anchor: 'cover-anchor', className: 'authored-image', margin: '12px', borderRadius: '20px', shadow: 'soft' } };
  const transform = availableBlockTransformsInDocument(image, [image]).find(item => item.id === 'image-to-cover');
  const cover = transformBlock(image, transform, () => 'caption');
  const html = renderToStaticMarkup(createElement(BlockRenderer, { blocks: [cover], variant: 'studio', hideDividers: false }));
  assert.equal((html.match(/id="cover-anchor"/g) ?? []).length, 1);
  assert.equal((html.match(/authored-image/g) ?? []).length, 1);
  assert.match(html, /class="content-cover[^"]*" style="border-radius:20px;box-shadow:0 4px 16px rgb\(0 0 0 \/ 12%\)"/);
  assert.match(html, /class="[^"]*authored-image[^"]*"[^>]*style="margin:12px"/);
  assert.equal((html.match(/border-radius:20px/g) ?? []).length, 1);
  assert.equal((html.match(/box-shadow:0 4px 16px rgb\(0 0 0 \/ 12%\)/g) ?? []).length, 1);
  assert.match(html, /<img[^>]*src="https:\/\/example\.test\/cover\.jpg"/);
});

test('Cover transforms to Details without losing its background, settings or inner blocks', () => {
  const cover = {
    id: 'details-cover', type: 'cover', src: 'https://example.test/cover.jpg', mediaId: 'asset-cover',
    alt: 'A mountain landscape', dimRatio: 35, contentPosition: 'bottom right', blockAlign: 'wide',
    visualStyle: { minHeight: '420px', borderRadius: '12px' },
    children: [{ id: 'details-cover-heading', type: 'heading', level: 2, text: 'Explore the mountains' }],
  };
  const original = structuredClone(cover);
  const choice = availableBlockTransformsInDocument(cover, [cover]).find(item => item.id === 'wrap-details');

  assert.ok(choice, 'Cover offers the Details wrapper when its parent allows Group children');
  const details = transformBlock(cover, choice, () => 'generated-details');
  assert.equal(details.type, 'group');
  assert.equal(details.tagName, 'details');
  assert.equal(details.detailsSummary, 'Details');
  assert.equal(details.blockAlign, 'wide');
  assert.deepEqual(details.children, [cover], 'keeps the complete Cover as the Details content');
  assert.equal(validContentBlocks([details]), true);
  assert.deepEqual(cover, original, 'does not mutate the original Cover');
});

test('plain image Cover offers safe Image and Media & Text transformations and keeps supported image fields', () => {
  const cover = {
    id: 'plain-cover', type: 'cover', src: '/media/landscape.svg', mediaId: 'managed-cover',
    alt: 'Green hills beneath a blue sky', dimRatio: 0, blockAlign: 'wide', wide: true,
    decorative: false, title: 'Landscape', aspectRatio: 'landscape', scale: 'contain', displayWidth: 640,
    displayHeight: 360, focalX: 42, focalY: 58, linkUrl: 'https://example.test/image',
    linkDestination: 'custom', opensInNewTab: true, imageStyle: 'rounded',
    imageResolution: { key: 'large', sourceDigest: 'a'.repeat(64), renditionDigest: 'b'.repeat(64) },
    duotone: { dark: '#123456', light: '#ABCDEF' },
    visualStyle: { margin: '12px', borderRadius: '16px', className: 'cover-image' },
    children: [],
  };
  const original = structuredClone(cover);
  const choices = availableBlockTransformsInDocument(cover, [cover]);
  const imageChoice = choices.find(item => item.id === 'cover-to-image');
  const mediaTextChoice = choices.find(item => item.id === 'cover-to-media-text-columns');
  assert.equal(imageChoice?.label, 'Image');
  assert.equal(mediaTextChoice?.label, 'Media & Text (Columns)');

  const image = transformBlock(cover, imageChoice, () => 'unused-id');
  assert.equal(image.type, 'image');
  assert.equal(image.id, cover.id);
  const { type: _type, dimRatio: _dimRatio, children: _children, contentPosition: _contentPosition, innerContentWidth: _innerContentWidth, ...expectedImage } = cover;
  assert.deepEqual(image, { ...expectedImage, type: 'image' });
  assert.equal(validContentBlocks([image]), true);

  let sequence = 0;
  const columns = transformBlock(cover, mediaTextChoice, () => `media-text-${++sequence}`);
  assert.equal(columns.type, 'columns');
  assert.equal(columns.blockAlign, 'wide');
  assert.deepEqual(columns.children.map(column => column.width), [50, 50]);
  const columnImage = columns.children[0].children[0];
  const { blockAlign: _mediaAlignment, wide: _wide, ...mediaColumnImage } = image;
  assert.deepEqual(columnImage, mediaColumnImage, 'Media & Text keeps image data in its media column and moves wide alignment to the wrapper');
  assert.deepEqual(columns.children[1].children, [{ id: 'media-text-4', type: 'paragraph', text: '' }]);
  assert.equal(validContentBlocks([columns]), true);
  assert.deepEqual(cover, original, 'neither transform mutates the source Cover');
});

test('Cover Image conversions stay hidden when the source cannot be represented without loss', () => {
  const plainCover = { id: 'plain-cover', type: 'cover', src: '/media/landscape.svg', alt: 'Landscape', dimRatio: 0, children: [] };
  for (const unsafe of [
    { ...plainCover, src: '' },
    { ...plainCover, dimRatio: 50 },
    { ...plainCover, children: [{ id: 'cover-copy', type: 'paragraph', text: 'Overlay copy' }] },
    { ...plainCover, editorial: { lock: { move: true } } },
    { ...plainCover, editorial: { lock: { remove: true } } },
  ]) {
    const choices = availableBlockTransformsInDocument(unsafe, [unsafe]);
    assert.equal(choices.some(item => item.id === 'cover-to-image' || item.id === 'cover-to-media-text-columns'), false);
  }
});

test('Cover Media & Text adaptation respects alignment and parent allowlists', () => {
  const cover = { id: 'aligned-cover', type: 'cover', src: '/media/landscape.svg', alt: 'Landscape', dimRatio: 0, children: [] };
  assert.ok(availableBlockTransformsInDocument(cover, [cover]).some(item => item.id === 'cover-to-media-text-columns'));
  for (const alignment of ['left', 'center', 'right']) {
    const aligned = { ...cover, blockAlign: alignment };
    assert.equal(availableBlockTransformsInDocument(aligned, [aligned]).some(item => item.id === 'cover-to-media-text-columns'), false);
  }
  const parent = { id: 'restricted', type: 'group', layout: 'flow', allowedBlocks: ['cover'], children: [cover] };
  assert.equal(availableBlockTransformsInDocument(cover, [parent]).some(item => item.id === 'cover-to-image'), false);
  assert.equal(availableBlockTransformsInDocument(cover, [parent]).some(item => item.id === 'cover-to-media-text-columns'), false);
});

test('managed-library Cover can transform with an empty source URL when it retains its media reference', () => {
  const cover = { id: 'managed-cover', type: 'cover', src: '', mediaId: 'library-image', alt: 'Library landscape', dimRatio: 0, children: [] };
  const choice = availableBlockTransformsInDocument(cover, [cover]).find(item => item.id === 'cover-to-image');
  assert.ok(choice);
  const image = transformBlock(cover, choice);
  assert.deepEqual(image, { id: cover.id, type: 'image', src: '', mediaId: cover.mediaId, alt: cover.alt });
  assert.equal(validContentBlocks([image]), true);
});

test('Cover minimum height expands the rendered image frame and keeps its background image filling it', () => {
  const cover = {
    id: 'minimum-height-cover', type: 'cover', src: 'https://example.test/cover.jpg', alt: 'Safe test image', dimRatio: 50,
    visualStyle: { minHeight: '600px' }, children: [],
  };
  const html = renderToStaticMarkup(createElement(BlockRenderer, { blocks: [cover], variant: 'studio', hideDividers: false }));
  assert.match(html, /class="content-cover has-min-height has-constrained-content"[^>]*min-height:600px/);
  assert.match(html, /<img[^>]*style="width:100%;height:100%;object-fit:cover/);
});

test('Cover minimum height preserves the selected contain scale', () => {
  const cover = {
    id: 'minimum-height-contain-cover', type: 'cover', src: 'https://example.test/cover.jpg', alt: 'Safe test image', dimRatio: 50,
    scale: 'contain', visualStyle: { minHeight: '600px' }, children: [],
  };
  const html = renderToStaticMarkup(createElement(BlockRenderer, { blocks: [cover], variant: 'studio', hideDividers: false }));
  assert.match(html, /<img[^>]*style="width:100%;height:100%;object-fit:contain/);
});

test('Cover exposes shared typography, dimensions, border and heading controls', () => {
  const profile = capabilityProfileFor('cover');
  assert.equal(profile.sharedStyleInspector, true);
  for (const control of ['colour', 'size', 'family', 'appearance', 'line-height', 'letter-spacing', 'decoration', 'letter-case', 'padding', 'margin', 'block-gap', 'border', 'radius', 'shadow', 'heading-colour']) {
    assert.ok(profile.controls.some(item => item.id === control), `Cover exposes ${control}`);
  }
  assert.equal(profile.controls.some(item => item.id === 'background'), false, 'overlay colour is presented with Cover media settings');
});

test('Cover styles its overlay, content spacing and heading colour in the rendered frame', () => {
  const cover = {
    id: 'styled-cover', type: 'cover', src: 'https://example.test/cover.jpg', alt: 'Safe test image', dimRatio: 60,
    visualStyle: { backgroundColor: '#163A5F', padding: '24px', blockGap: '12px', borderRadius: '16px', shadow: 'soft', headingColor: '#F4F7FA' },
    children: [{ id: 'styled-cover-heading', type: 'heading', level: 2, text: 'A heading' }],
  };
  const html = renderToStaticMarkup(createElement(BlockRenderer, { blocks: [cover], variant: 'studio', hideDividers: false }));
  assert.match(html, /class="[^"]*cover-visual-style-frame[^"]*"[^>]*style="[^"]*--studio-cover-padding:24px;--studio-cover-block-gap:12px/);
  assert.match(html, /class="content-cover[^"]*" style="[^"]*border-radius:16px;box-shadow:0 4px 16px rgb\(0 0 0 \/ 12%\)/);
  assert.match(html, /class="content-cover-overlay"[^>]*style="opacity:0\.6;background-color:#163a5f/i);
  assert.match(html, /--studio-quote-heading-color:#f4f7fa/i);
  assert.match(html, /class="content-cover-inner"/);
});

test('workspace v45 remains readable for Document Revisions and Cover requires workspace v46', () => {
  const workspace = structuredClone(initialStudioWorkspace);
  const document = workspace.documents[0];
  workspace.version = 45;
  workspace.documentRevisions = [{ id: 'revision-1', savedAt: '2026-10-28T00:00:00Z', document: { ...document, status: 'draft' } }];
  assert.equal(migrateStudioWorkspace(workspace).version, initialStudioWorkspace.version);
  assert.equal(validateStudioWorkspace(workspace).version, initialStudioWorkspace.version);

  const cover = { id: 'cover', type: 'cover', src: 'https://example.test/photo.jpg', alt: 'Mountain', dimRatio: 50, children: [] };
  const previous = { version: 45, documents: [{ ...document, blocks: [cover] }], activeDocumentId: document.id, categories: [], bin: [] };
  assert.throws(() => migrateStudioWorkspace(previous), /invalid|unsupported/i);
  const current = { ...previous, version: 46 };
  assert.equal(validateStudioWorkspace(current).documents[0].blocks[0].type, 'cover');
});

test('Cover fields and inner text survive HTML inspection round-trip', () => {
  const cover = {
    id: 'cover-html', type: 'cover', src: 'https://example.test/photo.jpg', mediaId: 'asset-cover', alt: 'Mountain at dawn', dimRatio: 37,
    blockAlign: 'wide', duotone: { dark: '#123456', light: '#ABCDEF' },
    children: [{ id: 'cover-html-text', type: 'paragraph', text: 'Words over the image', visualStyle: { textColor: '#ffffff' } }],
  };
  const result = withHtmlDom(() => parseHtmlToBlocks(blocksToHtml([cover]), [cover]));
  assert.equal(result.error, undefined);
  const [parsed] = result.blocks;
  assert.equal(parsed.type, "cover");
  assert.equal(parsed.src, cover.src);
  assert.equal(parsed.mediaId, cover.mediaId);
  assert.equal(parsed.alt, cover.alt);
  assert.equal(parsed.dimRatio, cover.dimRatio);
  assert.equal(parsed.blockAlign, cover.blockAlign);
  assert.deepEqual(parsed.duotone, cover.duotone);
  assert.equal(parsed.children[0].text, cover.children[0].text);
  assert.deepEqual(parsed.children[0].visualStyle, cover.children[0].visualStyle);
});

test('Cover content position and inner content width survive versioned workspace, publication, template and HTML paths', () => {
  const cover = {
    id: 'positioned-cover', type: 'cover', src: 'https://example.test/photo.jpg', alt: 'Mountain at dawn',
    dimRatio: 40, contentPosition: 'top right', innerContentWidth: false, children: [{ id: 'positioned-copy', type: 'paragraph', text: 'Overlaid copy' }],
  };
  assert.equal(validContentBlocks([cover]), true);
  assert.equal(validContentBlocks([{ ...cover, contentPosition: 'upper right' }]), false);

  const rendered = renderToStaticMarkup(createElement(BlockRenderer, { blocks: [cover], variant: 'studio', hideDividers: false }));
  assert.match(rendered, /class="content-cover[^"]*is-position-top-right/);
  assert.doesNotMatch(rendered, /class="content-cover[^"]*has-constrained-content/);
  const constrainedCover = { ...cover, innerContentWidth: true };
  const explicitlyConstrained = renderToStaticMarkup(createElement(BlockRenderer, { blocks: [constrainedCover], variant: 'studio', hideDividers: false }));
  assert.match(explicitlyConstrained, /class="content-cover[^"]*has-constrained-content/);
  const defaultCover = { ...cover };
  delete defaultCover.innerContentWidth;
  const defaultConstrained = renderToStaticMarkup(createElement(BlockRenderer, { blocks: [defaultCover], variant: 'studio', hideDividers: false }));
  assert.match(defaultConstrained, /class="content-cover[^"]*has-constrained-content/);

  const htmlResult = withHtmlDom(() => parseHtmlToBlocks(blocksToHtml([cover]), [cover]));
  assert.equal(htmlResult.error, undefined);
  assert.equal(htmlResult.blocks[0].contentPosition, 'top right');
  assert.equal(htmlResult.blocks[0].innerContentWidth, false);

  const workspace = structuredClone(initialStudioWorkspace);
  const post = workspace.documents.find(item => item.kind === 'post');
  post.blocks = [cover];
  assert.equal(validateStudioWorkspace(workspace).documents.find(item => item.id === post.id).blocks[0].contentPosition, 'top right');
  assert.equal(validateStudioWorkspace(workspace).documents.find(item => item.id === post.id).blocks[0].innerContentWidth, false);
  assert.throws(() => validateStudioWorkspace({ ...workspace, version: 50 }), /invalid|unsupported/i);
  assert.throws(() => validateStudioWorkspace({ ...workspace, version: 51 }), /invalid|unsupported/i);

  const article = toLocallyPublishedArticle(post);
  assert.equal(validatePublicationSnapshot({ version: 43, posts: [article] }).posts[0].blocks[0].contentPosition, 'top right');
  assert.throws(() => validatePublicationSnapshot({ version: 42, posts: [article] }), /Cover inner-content width requires published-post snapshot v43/);
  const positionedArticle = structuredClone(article);
  delete positionedArticle.blocks[0].innerContentWidth;
  assert.throws(() => validatePublicationSnapshot({ version: 41, posts: [positionedArticle] }), /Cover content position requires published-post snapshot v42/);

  const set = createTemplateSet('Positioned Cover');
  set.parts[0].nodes = [cover];
  const store = { ...emptyTemplateStore(), sets: [set] };
  assert.equal(validateTemplateStore(store).version, '0.74.0');
  assert.equal(validateTemplateSnapshot({ version: '0.63.0', set, templateId: set.templates[0].id }).version, '0.74.0');
  assert.throws(() => validateTemplateStore({ ...store, version: '0.62.0' }), /Cover inner-content width requires template v0.63.0/);
  assert.doesNotThrow(() => validateTemplatePackage({ format: 'acm-studio-template-set', version: '0.63.0', set, media: [] }));
  assert.throws(() => validateTemplatePackage({ format: 'acm-studio-template-set', version: '0.62.0', set, media: [] }), /Cover inner-content width requires template v0.63.0/);

  const clipboard = withHtmlDom(() => readBlockClipboardPayload(blockClipboardHtml([cover])));
  assert.equal(clipboard.blocks[0].contentPosition, 'top right');
  assert.equal(clipboard.blocks[0].innerContentWidth, false);
  const legacyClipboardJson = JSON.stringify({ format: 'acm-studio-blocks', version: 28, blocks: [cover], footnotes: [] })
    .replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
  assert.equal(withHtmlDom(() => readBlockClipboardPayload(`<div data-acm-studio-blocks="${legacyClipboardJson}"></div>`)), null);

  const backup = {
    format: 'acm-studio-backup', version: 29, exportedAt: '2026-10-29T00:00:00Z',
    workspace, publications: null, media: { folders: [], assets: [] },
  };
  assert.equal(validateStudioBackup(backup).workspace.documents.find(item => item.id === post.id).blocks[0].contentPosition, 'top right');
  assert.throws(() => validateStudioBackup({ ...backup, version: 28 }), /Cover inner-content width requires backup v29/);

  const page = { id: 'home', kind: 'page', title: 'Home', slug: '', excerpt: '', status: 'published', updatedAt: '2026-10-22T00:00:00.000Z', tags: [], seoTitle: '', seoDescription: '', blocks: [] };
  const currentSite = testSiteCollection({
    format: 'acm-test-site', version: 3, siteId: 'test', documents: [page], categories: [], bin: [],
    activeDocumentId: page.id, homeDocumentId: page.id, templates: emptyTemplateStore(), browserImportComplete: true,
  });
  assert.equal(testSiteCollection({ ...structuredClone(currentSite), version: 40 }).version, 53, 'source v40 upgrades using the current fixture envelope');
  currentSite.documents[0].blocks = [cover];
  assert.equal(currentSite.version, 53);
  assert.equal(validTestSiteDocument(currentSite), true);
  assert.equal(testSiteWorkspace(currentSite).version, 63);
  assert.equal(validTestSiteDocument({ ...currentSite, version: 40 }), false);
  assert.equal(testSiteCollection(currentSite).version, 53, 'current fixture data is preserved rather than treated as a legacy document');

  const secondSite = { ...structuredClone(currentSite), siteId: 'test2' };
  const library = createGlobalTemplateLibrary({ test: currentSite, test2: secondSite });
  library.migrations.test.bases[0].parts[0].nodes = [cover];
  assert.equal(validateGlobalTemplateLibrary(library).version, 45);
  assert.throws(() => validateGlobalTemplateLibrary({ ...library, version: 32 }), /Cover inner-content width requires global template library v33/);
});

test('older publication, clipboard, backup, template and fixture envelopes reject Cover without changing the source', () => {
  const cover = { id: 'envelope-cover', type: 'cover', src: 'https://example.test/photo.jpg', alt: 'Mountain', dimRatio: 50, children: [] };

  const publication = { version: 36, posts: [{ localDocumentId: 'post', blocks: [cover] }] };
  const originalPublication = structuredClone(publication);
  assert.throws(() => validatePublicationSnapshot(publication), /Cover blocks require published-post snapshot v37/);
  assert.deepEqual(publication, originalPublication);

  const legacyClipboardJson = JSON.stringify({ format: 'acm-studio-blocks', version: 22, blocks: [cover], footnotes: [] })
    .replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
  const legacyClipboard = `<div data-acm-studio-blocks="${legacyClipboardJson}"></div>`;
  assert.equal(withHtmlDom(() => readBlockClipboardPayload(legacyClipboard)), null);

  const backup = { format: 'acm-studio-backup', version: 22, workspace: { documents: [{ blocks: [cover] }] } };
  const originalBackup = structuredClone(backup);
  assert.throws(() => validateStudioBackup(backup), /Cover blocks require backup v23/);
  assert.deepEqual(backup, originalBackup);

  const set = createTemplateSet();
  set.parts[0].nodes = [cover];
  const template = { version: '0.56.0', sets: [set], assignments: [] };
  const originalTemplate = structuredClone(template);
  assert.throws(() => validateTemplateStore(template), /Cover blocks require template v0.57.0/);
  assert.deepEqual(template, originalTemplate);

  const fixture = { format: 'acm-test-site', version: 34, documents: [{ blocks: [cover] }] };
  const originalFixture = structuredClone(fixture);
  assert.equal(validTestSiteDocument(fixture), false);
  assert.deepEqual(fixture, originalFixture);
});
