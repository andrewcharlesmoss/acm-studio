import assert from 'node:assert/strict';
import test from 'node:test';
import { legacyGlobalTemplateLibrary } from "./helpers/legacy-global-template-library.mjs";
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { loadProductionModule } from './production-module.mjs';
import { withHtmlDom } from './html-dom-fixture.mjs';

const load = path => loadProductionModule(new URL(path, import.meta.url));
const coverApi = await load('../app/content/cover-block.ts');
const { validContentBlocks, validateStudioWorkspace, migrateStudioWorkspace, validatePublicationSnapshot } = await load('../app/studio/workspace-validation.ts');
const videoApi = await load('../app/content/video-block.ts');
const { initialStudioWorkspace } = await load('../app/studio/editor-model.ts');
const { toLocallyPublishedArticle } = await load('../app/content/local-publishing.ts');
const { blocksToHtml, parseHtmlToBlocks } = await load('../app/studio/studio-html-editor.ts');
const { BlockRenderer } = await load('../app/components/content.tsx');
const { blockClipboardHtml, readBlockClipboardPayload } = await load('../app/studio/block-clipboard.ts');
const { validateStudioBackup } = await load('../app/studio/backup-store.ts');
const { validateTemplateStore, validateTemplateSnapshot, emptyTemplateStore, createTemplateSet } = await load('../app/studio/template-model.ts');
const { validateTemplatePackage } = await load('../app/studio/template-package.ts');
const { validTestSiteDocument, testSiteCollection, testSiteWorkspace } = await load('../app/studio/test-site/contract.ts');
const { createGlobalTemplateLibrary: createCurrentGlobalTemplateLibrary, validateGlobalTemplateLibrary } = await load('../app/studio/global-template-contract.ts');
const createGlobalTemplateLibrary = sites => legacyGlobalTemplateLibrary(createCurrentGlobalTemplateLibrary(sites));
const { availableBlockTransformsInDocument, transformBlock } = await load('../app/studio/block-transforms.ts');

const cover = overrides => ({ id: 'cover-video', type: 'cover', src: 'https://example.test/fallback.jpg', alt: 'Fallback', dimRatio: 35, children: [{ id: 'copy', type: 'paragraph', text: 'Overlaid copy' }], ...overrides });
const video = url => coverApi.coverVideoBackground(url);

test('Cover accepts only fixed YouTube, Vimeo, TikTok and VideoPress players', () => {
  for (const [url, provider] of [
    ['https://www.youtube.com/watch?v=aqz-KE-bpKQ', 'youtube'],
    ['https://vimeo.com/76979871', 'vimeo'],
    ['https://www.tiktok.com/@scout2015/video/6718335390845095173', 'tiktok'],
    ['https://videopress.com/v/zKLzUDgS', 'videopress'],
  ]) {
    const parsed = video(url);
    assert.equal(parsed?.provider, provider);
    assert.equal(coverApi.validCoverVideoBackground(parsed), true);
    assert.match(coverApi.coverVideoPlayerUrl(parsed), /^https:\/\//);
  }
  const youtubePlayer = new URL(coverApi.coverVideoPlayerUrl(video('https://www.youtube.com/watch?v=aqz-KE-bpKQ')));
  assert.equal(youtubePlayer.searchParams.get('autoplay'), '1');
  assert.equal(youtubePlayer.searchParams.get('mute'), '1');
  assert.equal(youtubePlayer.searchParams.get('loop'), '1');
  assert.equal(youtubePlayer.searchParams.get('playlist'), 'aqz-KE-bpKQ');
  const youtubePlaylistPlayer = new URL(coverApi.coverVideoPlayerUrl(video('https://www.youtube.com/playlist?list=PL1234567890')));
  assert.equal(youtubePlaylistPlayer.searchParams.get('loop'), '1');
  assert.equal(youtubePlaylistPlayer.searchParams.get('listType'), 'playlist');
  assert.equal(youtubePlaylistPlayer.searchParams.get('list'), 'PL1234567890');
  assert.equal(youtubePlaylistPlayer.searchParams.has('playlist'), false);
  const vimeoPlayer = new URL(coverApi.coverVideoPlayerUrl(video('https://vimeo.com/76979871')));
  assert.equal(vimeoPlayer.searchParams.get('autoplay'), '1');
  assert.equal(vimeoPlayer.searchParams.get('muted'), '1');
  assert.equal(vimeoPlayer.searchParams.get('background'), '1');
  const videoPressPlayer = new URL(coverApi.coverVideoPlayerUrl(video('https://videopress.com/v/zKLzUDgS')));
  assert.equal(videoPressPlayer.searchParams.get('autoplay'), '1');
  assert.equal(videoPressPlayer.searchParams.get('muted'), '1');
  assert.equal(videoPressPlayer.searchParams.get('loop'), '1');
  const youtubeReducedMotion = new URL(coverApi.coverVideoPlayerUrl(video('https://www.youtube.com/watch?v=aqz-KE-bpKQ'), false));
  assert.equal(youtubeReducedMotion.searchParams.has('autoplay'), false);
  assert.equal(youtubeReducedMotion.searchParams.get('loop'), '1');
  const vimeoReducedMotion = new URL(coverApi.coverVideoPlayerUrl(video('https://vimeo.com/76979871'), false));
  assert.equal(vimeoReducedMotion.searchParams.has('autoplay'), false);
  assert.equal(vimeoReducedMotion.searchParams.has('background'), false);
  assert.equal(vimeoReducedMotion.searchParams.get('muted'), '1');
  const videoPressReducedMotion = new URL(coverApi.coverVideoPlayerUrl(video('https://videopress.com/v/zKLzUDgS'), false));
  assert.equal(videoPressReducedMotion.searchParams.has('autoplay'), false);
  assert.equal(videoPressReducedMotion.searchParams.get('loop'), '1');
  for (const url of [
    'https://example.test/video.mp4',
    'https://animoto.com/play/abc123',
    'https://wordpress.tv/2020/01/01/example/',
    'http://vimeo.com/76979871',
    'https://user@vimeo.com/76979871',
    'https://vimeo.com:444/76979871',
    'https://youtube.com/watch?v=aqz-KE-bpKQ&next=https://evil.test',
    `https://vimeo.com/${'x'.repeat(2050)}`,
  ]) assert.equal(video(url), null, url);
});

test('a validated WordPress.tv oEmbed result maps to the existing VideoPress Cover contract', () => {
  const source = 'https://wordpress.tv/2025/12/03/state-of-the-word-2025/';
  const result = {
    provider: 'WordPress.tv',
    kind: 'frame',
    title: 'State of the Word 2025',
    src: 'https://video.wordpress.com/embed/4llYxnAK?hd=0&cover=1',
  };
  const background = coverApi.coverVideoBackgroundFromWordPressTv(source, result);
  assert.deepEqual(background, { provider: 'videopress', url: 'https://videopress.com/v/4llYxnAK' });
  const player = new URL(coverApi.coverVideoPlayerUrl(background));
  assert.equal(player.pathname, '/embed/4llYxnAK');
  assert.equal(player.searchParams.get('hd'), '0');
  assert.equal(player.searchParams.get('cover'), '1');
  assert.equal(player.searchParams.get('autoplay'), '1');
  assert.equal(player.searchParams.get('muted'), '1');
  assert.equal(player.searchParams.get('loop'), '1');
  assert.equal(coverApi.coverVideoBackgroundFromWordPressTv('https://example.test/video', result), null);
  assert.equal(coverApi.coverVideoBackgroundFromWordPressTv(source, { ...result, src: 'https://evil.test/embed/4llYxnAK' }), null);
  assert.equal(coverApi.coverVideoBackgroundFromWordPressTv(source, { ...result, src: 'https://video.wordpress.com/embed/4llYxnAK?next=https://evil.test' }), null);
});

test('Cover renders a sandboxed fixed player behind overlay and inner blocks; legacy image Covers remain unchanged', () => {
  const block = cover({ videoBackground: video('https://vimeo.com/76979871') });
  const markup = renderToStaticMarkup(createElement(BlockRenderer, { blocks: [block], variant: 'studio', hideDividers: false }));
  assert.match(markup, /class="content-cover-video"/);
  assert.match(markup, /sandbox="allow-scripts allow-same-origin allow-presentation"/);
  assert.match(markup, /https:\/\/player\.vimeo\.com\/video\/76979871\?/);
  assert.ok(markup.indexOf('content-cover-video') < markup.indexOf('content-cover-overlay'));
  assert.ok(markup.indexOf('content-cover-overlay') < markup.indexOf('content-cover-inner'));
  assert.match(markup, /Overlaid copy/);
  const legacy = renderToStaticMarkup(createElement(BlockRenderer, { blocks: [cover()], variant: 'studio', hideDividers: false }));
  assert.doesNotMatch(legacy, /content-cover-video|<iframe/);
  assert.match(legacy, /content-cover-background/);
});

test('Cover video data round-trips through HTML and all current versioned envelopes', () => {
  const block = cover({ videoBackground: video('https://www.youtube.com/watch?v=aqz-KE-bpKQ') });
  assert.equal(validContentBlocks([block]), true);
  assert.equal(validContentBlocks([cover({ videoBackground: { provider: 'youtube', url: 'https://example.test/video.mp4' } })]), false);
  const parsedHtml = withHtmlDom(() => parseHtmlToBlocks(blocksToHtml([block]), [block]));
  assert.equal(parsedHtml.error, undefined);
  assert.deepEqual(parsedHtml.blocks[0].videoBackground, block.videoBackground);

  const workspace = structuredClone(initialStudioWorkspace);
  workspace.documents[0].blocks = [block];
  assert.equal(validateStudioWorkspace(workspace).version, 64);
  assert.throws(() => validateStudioWorkspace({ ...workspace, version: 53 }), /unsupported|invalid/i);
  assert.throws(() => migrateStudioWorkspace({ ...workspace, version: 53 }), /unsupported|invalid/i);
  const article = toLocallyPublishedArticle(workspace.documents[0]);
  assert.equal(validatePublicationSnapshot({ version: 45, posts: [article] }).posts[0].blocks[0].videoBackground.provider, 'youtube');
  assert.throws(() => validatePublicationSnapshot({ version: 44, posts: [article] }), /Cover video backgrounds require published-post snapshot v45/);

  const set = createTemplateSet('Video Cover');
  set.parts[0].nodes = [block];
  const store = { ...emptyTemplateStore(), sets: [set] };
  assert.equal(validateTemplateStore(store).version, '0.76.0');
  assert.throws(() => validateTemplateStore({ ...store, version: '0.64.0' }), /Cover video backgrounds require template v0.65.0/);
  assert.equal(validateTemplateSnapshot({ version: '0.65.0', set, templateId: set.templates[0].id }).version, '0.76.0');
  assert.throws(() => validateTemplateSnapshot({ version: '0.64.0', set, templateId: set.templates[0].id }), /Cover video backgrounds require template v0.65.0/);
  assert.doesNotThrow(() => validateTemplatePackage({ format: 'acm-studio-template-set', version: '0.65.0', set, media: [] }));
  assert.throws(() => validateTemplatePackage({ format: 'acm-studio-template-set', version: '0.64.0', set, media: [] }), /Cover video backgrounds require template v0.65.0/);

  const copied = withHtmlDom(() => readBlockClipboardPayload(blockClipboardHtml([block])));
  assert.deepEqual(copied.blocks[0].videoBackground, block.videoBackground);
  const oldClipboard = JSON.stringify({ format: 'acm-studio-blocks', version: 30, blocks: [block], footnotes: [] })
    .replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
  assert.equal(withHtmlDom(() => readBlockClipboardPayload(`<div data-acm-studio-blocks="${oldClipboard}"></div>`)), null);

  const backup = { format: 'acm-studio-backup', version: 31, exportedAt: '2026-10-30T00:00:00Z', workspace, publications: null, media: { folders: [], assets: [] } };
  assert.equal(validateStudioBackup(backup).workspace.documents[0].blocks[0].videoBackground.provider, 'youtube');
  assert.throws(() => validateStudioBackup({ ...backup, version: 30 }), /Cover video backgrounds require backup v31/);

  const page = { id: 'home', kind: 'page', title: 'Home', slug: '', excerpt: '', status: 'published', updatedAt: '2026-10-22T00:00:00.000Z', tags: [], seoTitle: '', seoDescription: '', blocks: [] };
  const siteTemplates = { ...emptyTemplateStore(), sets: [createTemplateSet('Video Site')] };
  const fixture = testSiteCollection({ format: 'acm-test-site', version: 3, siteId: 'test', documents: [page], categories: [], bin: [], activeDocumentId: page.id, homeDocumentId: page.id, templates: siteTemplates, browserImportComplete: true });
  fixture.documents[0].blocks = [block];
  assert.equal(fixture.version, 55);
  assert.equal(validTestSiteDocument(fixture), true);
  assert.equal(testSiteWorkspace(fixture).version, 64);
  assert.equal(validTestSiteDocument({ ...fixture, version: 42 }), false);

  const second = { ...structuredClone(fixture), siteId: 'test2' };
  const library = createGlobalTemplateLibrary({ test: fixture, test2: second });
  library.migrations.test.bases[0].parts[0].nodes = [block];
  assert.equal(validateGlobalTemplateLibrary(library).version, 47);
  assert.throws(() => validateGlobalTemplateLibrary({ ...library, version: 34 }), /Cover video backgrounds require global template library v35/);
});

test('Native Video uses a safe file URL, its own video renderer, and round-trips its settings', () => {
  assert.equal(videoApi.safeVideoSource('https://media.example.test/clip.mp4'), 'https://media.example.test/clip.mp4');
  assert.equal(videoApi.safeVideoSource('/media/clip.mp4'), '/media/clip.mp4');
  assert.equal(videoApi.safeVideoSource('http://media.example.test/clip.mp4'), null);
  assert.equal(videoApi.safeVideoSource('javascript:alert(1)'), null);
  assert.equal(videoApi.safeVideoSource('//media.example.test/clip.mp4'), null);
  const block = { id: 'native-video', type: 'video', src: 'https://media.example.test/clip.mp4', caption: 'Field test', controls: true, muted: true, preload: 'metadata', poster: 'https://media.example.test/poster.jpg' };
  assert.equal(videoApi.validVideoBlock(block), true);
  assert.equal(validContentBlocks([block]), true);
  assert.equal(validContentBlocks([{ ...block, autoplay: 'yes' }]), false);
  const markup = renderToStaticMarkup(createElement(BlockRenderer, { blocks: [block], variant: 'article' }));
  assert.match(markup, /<video[^>]+src="https:\/\/media\.example\.test\/clip\.mp4"/);
  assert.match(markup, /controls/);
  assert.match(markup, /<figcaption>Field test<\/figcaption>/);
  assert.doesNotMatch(markup, /<iframe/);
  const parsed = withHtmlDom(() => parseHtmlToBlocks(blocksToHtml([block]), [block]));
  assert.equal(parsed.error, undefined);
  assert.equal(parsed.blocks[0].src, block.src);
  assert.equal(parsed.blocks[0].caption, block.caption);
  assert.equal(parsed.blocks[0].controls, block.controls);
  assert.equal(parsed.blocks[0].muted, block.muted);
  assert.equal(parsed.blocks[0].preload, block.preload);
  assert.equal(parsed.blocks[0].poster, block.poster);

  const workspace = structuredClone(initialStudioWorkspace);
  workspace.documents[0].blocks = [block];
  assert.equal(validateStudioWorkspace(workspace).version, 64);
  assert.throws(() => validateStudioWorkspace({ ...workspace, version: 54 }), /unsupported|invalid/i);
  const article = toLocallyPublishedArticle(workspace.documents[0]);
  assert.equal(validatePublicationSnapshot({ version: 46, posts: [article] }).version, 55);
  assert.throws(() => validatePublicationSnapshot({ version: 45, posts: [article] }), /Video blocks require published-post snapshot v46/);
  const clipboard = withHtmlDom(() => readBlockClipboardPayload(blockClipboardHtml([block])));
  assert.equal(clipboard.blocks[0].src, block.src);
  const legacyClipboard = JSON.stringify({ format: 'acm-studio-blocks', version: 31, blocks: [block], footnotes: [] }).replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
  assert.equal(withHtmlDom(() => readBlockClipboardPayload(`<div data-acm-studio-blocks="${legacyClipboard}"></div>`)), null);
  const backup = { format: 'acm-studio-backup', version: 32, exportedAt: '2026-10-30T00:00:00Z', workspace, publications: null, media: { folders: [], assets: [] } };
  assert.equal(validateStudioBackup(backup).workspace.documents[0].blocks[0].src, block.src);
  assert.throws(() => validateStudioBackup({ ...backup, version: 31 }), /Video blocks require backup v32/);

  const set = createTemplateSet('Native Video');
  set.parts[0].nodes = [block];
  const store = { ...emptyTemplateStore(), sets: [set] };
  assert.equal(validateTemplateStore(store).version, '0.76.0');
  assert.throws(() => validateTemplateStore({ ...store, version: '0.65.0' }), /Video blocks require template v0.66.0/);
  assert.equal(validateTemplatePackage({ format: 'acm-studio-template-set', version: '0.66.0', set, media: [] }).version, '0.76.0');
  assert.throws(() => validateTemplatePackage({ format: 'acm-studio-template-set', version: '0.65.0', set, media: [] }), /Video blocks require template package v0.66.0/);

  const page = { id: 'video-home', kind: 'page', title: 'Home', slug: '', excerpt: '', status: 'published', updatedAt: '2026-10-30T00:00:00.000Z', tags: [], seoTitle: '', seoDescription: '', blocks: [] };
  const site = testSiteCollection({ format: 'acm-test-site', version: 3, siteId: 'test', documents: [page], categories: [], bin: [], activeDocumentId: page.id, homeDocumentId: page.id, templates: emptyTemplateStore(), browserImportComplete: true });
  site.documents[0].blocks = [block];
  assert.equal(site.version, 55);
  assert.equal(validTestSiteDocument(site), true);
  assert.equal(validTestSiteDocument({ ...site, version: 43 }), false);
  const secondSite = { ...structuredClone(site), siteId: 'test2' };
  assert.equal(validTestSiteDocument(secondSite), true);
  assert.equal(validTestSiteDocument({ ...secondSite, version: 43 }), false);

  const globalLibrary = createGlobalTemplateLibrary({ test: site, test2: secondSite });
  globalLibrary.migrations.test.bases[0].parts[0].nodes = [block];
  assert.equal(validateGlobalTemplateLibrary(globalLibrary).version, 47);
  assert.throws(() => validateGlobalTemplateLibrary({ ...globalLibrary, version: 35 }), /Video blocks require global template library v36/);
});


test('native Cover video source validates, renders as a reduced-motion-aware background, and round-trips safely', () => {
  const source = 'https://media.example.test/background.mp4';
  assert.equal(coverApi.validNativeCoverVideoSource(source), true);
  for (const invalid of ['http://media.example.test/video.mp4', '//evil.example/video.mp4', 'javascript:alert(1)', 'https://user@media.example/video.mp4', 'https://', ' https://media.example/video.mp4 ']) {
    assert.equal(coverApi.validNativeCoverVideoSource(invalid), false, invalid);
  }
  const nativeCover = { id: 'native-cover', type: 'cover', src: 'https://media.example.test/poster.jpg', alt: 'Still image', dimRatio: 30, nativeVideoUrl: source, children: [] };
  assert.equal(validContentBlocks([nativeCover]), true);
  assert.equal(validContentBlocks([{ ...nativeCover, nativeVideoUrl: 'http://media.example.test/background.mp4' }]), false);
  assert.equal(validContentBlocks([{ ...nativeCover, videoBackground: video('https://vimeo.com/76979871') }]), false, 'provider iframe and native sources are distinct and mutually exclusive');

  const markup = renderToStaticMarkup(createElement(BlockRenderer, { blocks: [nativeCover], variant: 'studio' }));
  assert.match(markup, /class="content-cover-native-video"/);
  assert.match(markup, /<video[^>]+src="https:\/\/media\.example\.test\/background\.mp4"/);
  assert.match(markup, /poster="https:\/\/media\.example\.test\/poster\.jpg"/);
  assert.match(markup, /muted=""/);
  assert.match(markup, /aria-hidden="true"/);
  assert.ok(markup.indexOf('content-cover-native-video') < markup.indexOf('content-cover-overlay'));
  assert.ok(markup.indexOf('content-cover-overlay') < markup.indexOf('content-cover-inner'));
  const html = blocksToHtml([nativeCover]);
  const parsed = withHtmlDom(() => parseHtmlToBlocks(html, [nativeCover]));
  assert.equal(parsed.error, undefined);
  assert.equal(parsed.blocks[0].nativeVideoUrl, source);
  const unsafeHtml = html.replace(source, 'http://media.example.test/background.mp4');
  assert.match(withHtmlDom(() => parseHtmlToBlocks(unsafeHtml, [nativeCover])).error, /native video source is invalid/i);

  const clean = { id: 'native-cover', type: 'cover', src: '', alt: '', dimRatio: 0, nativeVideoUrl: source, title: 'Exact caption', blockAlign: 'wide', editorial: { name: 'Editorial identity', note: 'Preserve me' }, siteRole: 'title', children: [] };
  const videoSourceCover = {
    ...clean,
    src: 'https://media.example.test/poster.jpg',
    alt: 'Poster alternative text',
    dimRatio: 34,
    contentPosition: 'top left',
    imageStyle: 'rounded',
    visualStyle: { backgroundColor: '#ffffff' },
    children: [{ id: 'video-cover-child', type: 'paragraph', text: 'Gutenberg drops this child on conversion.' }],
  };
  assert.equal(validContentBlocks([videoSourceCover]), true);
  const videoChoice = availableBlockTransformsInDocument(videoSourceCover, [videoSourceCover]).find(item => item.id === 'cover-to-video');
  assert.ok(videoChoice, 'a native video background matches despite Cover-only presentation and child content');
  const convertedVideo = transformBlock(videoSourceCover, videoChoice);
  assert.deepEqual(convertedVideo, { id: clean.id, type: 'video', src: source, caption: clean.title, blockAlign: clean.blockAlign, editorial: clean.editorial, siteRole: clean.siteRole });
  assert.equal(validContentBlocks([convertedVideo]), true);

  const empty = {
    id: 'empty-cover', type: 'cover', src: '', alt: 'Unused Cover alternative', dimRatio: 50,
    title: 'Empty Cover title', blockAlign: 'wide', siteRole: 'eyebrow',
    editorial: { name: 'Empty Cover identity', note: 'Retain identity' },
    visualStyle: { margin: '12px' },
    children: [{ id: 'empty-cover-child', type: 'paragraph', text: 'Gutenberg drops this child too.' }],
  };
  assert.equal(validContentBlocks([empty]), true);
  const emptyChoice = availableBlockTransformsInDocument(empty, [empty]).find(item => item.id === 'cover-to-video');
  assert.ok(emptyChoice, 'a no-source Cover with children and no overlay colour or gradient matches');
  const emptyVideo = transformBlock(empty, emptyChoice);
  assert.deepEqual(emptyVideo, { id: empty.id, type: 'video', src: '', caption: empty.title, blockAlign: 'wide', editorial: empty.editorial, siteRole: 'eyebrow' });
  assert.equal(validContentBlocks([emptyVideo]), true, 'an empty Video block is a valid editing state');

  const customOpacity = { ...empty, visualStyle: undefined, dimRatio: 20 };
  const customOpacityChoice = availableBlockTransformsInDocument(customOpacity, [customOpacity]).find(item => item.id === 'cover-to-video');
  assert.ok(customOpacityChoice, 'the transform matches without overlay colour or gradient, even with non-default opacity');
  assert.equal(transformBlock(customOpacity, customOpacityChoice).dimRatio, undefined, 'the transform drops Cover overlay opacity');

  const sourceUnavailable = [
    { ...clean, videoBackground: video('https://vimeo.com/76979871') },
    { ...clean, nativeVideoUrl: 'http://media.example.test/background.mp4' },
    { ...clean, editorial: { lock: { move: true } } },
    { ...clean, editorial: { lock: { remove: true } } },
  ];
  for (const candidate of sourceUnavailable) assert.ok(!availableBlockTransformsInDocument(candidate, [candidate]).some(item => item.id === 'cover-to-video'));

  const emptyUnavailable = [
    { ...empty, videoBackground: video('https://vimeo.com/76979871') },
    { ...empty, src: 'https://media.example.test/image.jpg' },
    { ...empty, mediaId: 'managed-file' },
    { ...empty, visualStyle: { backgroundColor: '#ffffff' } },
    { ...empty, visualStyle: { backgroundGradient: 'ocean' } },
    { ...empty, editorial: { lock: { move: true } } },
    { ...empty, editorial: { lock: { remove: true } } },
    { ...empty, children: [{ id: 'locked-child', type: 'paragraph', text: 'Locked child', editorial: { lock: { remove: true } } }] },
  ];
  for (const candidate of emptyUnavailable) assert.ok(!availableBlockTransformsInDocument(candidate, [candidate]).some(item => item.id === 'cover-to-video'), `Cover-to-Video should be unavailable for ${JSON.stringify(candidate)}`);
  const restricted = { id: 'restricted-group', type: 'group', layout: 'flow', allowedBlocks: ['image'], children: [clean] };
  assert.ok(!availableBlockTransformsInDocument(clean, [restricted]).some(item => item.id === 'cover-to-video'));
});

test('native Cover video source is rejected by every under-versioned carrier', () => {
  const source = 'https://media.example.test/background.mp4';
  const nativeCover = { id: 'native-cover', type: 'cover', src: '', alt: '', dimRatio: 0, nativeVideoUrl: source, children: [] };
  const workspace = structuredClone(initialStudioWorkspace);
  workspace.documents[0].blocks = [nativeCover];
  assert.equal(validateStudioWorkspace(workspace).version, 64);
  assert.throws(() => validateStudioWorkspace({ ...workspace, version: 55 }), /invalid|unsupported/i);
  const article = toLocallyPublishedArticle({ ...workspace.documents[0], blocks: [nativeCover] });
  assert.equal(validatePublicationSnapshot({ version: 47, posts: [article] }).version, 55);
  assert.throws(() => validatePublicationSnapshot({ version: 46, posts: [article] }), /Native Cover video sources require published-post snapshot v47/);

  const set = createTemplateSet('Native Cover');
  set.parts[0].nodes = [nativeCover];
  const store = { ...emptyTemplateStore(), sets: [set] };
  assert.equal(validateTemplateStore(store).version, '0.76.0');
  assert.throws(() => validateTemplateStore({ ...store, version: '0.66.0' }), /Native Cover video sources require template v0.67.0/);
  assert.throws(() => validateTemplateSnapshot({ version: '0.66.0', set, templateId: set.templates[0].id }), /Native Cover video sources require template v0.67.0/);
  assert.throws(() => validateTemplatePackage({ format: 'acm-studio-template-set', version: '0.66.0', set, media: [] }), /Native Cover video sources require template package v0.67.0/);

  const clipboard = withHtmlDom(() => readBlockClipboardPayload(blockClipboardHtml([nativeCover])));
  assert.equal(clipboard.blocks[0].nativeVideoUrl, source);
  const oldClipboardJson = JSON.stringify({ format: 'acm-studio-blocks', version: 32, blocks: [nativeCover], footnotes: [] }).replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
  assert.equal(withHtmlDom(() => readBlockClipboardPayload(`<div data-acm-studio-blocks="${oldClipboardJson}"></div>`)), null);
  const backup = { format: 'acm-studio-backup', version: 33, exportedAt: '2026-10-30T00:00:00Z', workspace, publications: null, media: { folders: [], assets: [] } };
  assert.equal(validateStudioBackup(backup).workspace.documents[0].blocks[0].nativeVideoUrl, source);
  assert.throws(() => validateStudioBackup({ ...backup, version: 32 }), /Native Cover video sources require backup v33/);

  const page = { id: 'native-home', kind: 'page', title: 'Home', slug: '', excerpt: '', status: 'published', updatedAt: '2026-10-30T00:00:00.000Z', tags: [], seoTitle: '', seoDescription: '', blocks: [nativeCover] };
  const sourceSite = testSiteCollection({ format: 'acm-test-site', version: 2, siteId: 'test', document: { ...page, blocks: [] } });
  sourceSite.documents[0].blocks = [nativeCover];
  const site = testSiteCollection({ ...sourceSite, version: 45 });
  assert.equal(site.version, 55);
  assert.equal(validTestSiteDocument(site), true);
  const withDesign = { ...site, websiteDesign: { identity: { title: "Updated" }, styles: {} } };
  assert.equal(validTestSiteDocument(withDesign), true);
  assert.equal(validTestSiteDocument({ ...withDesign, version: 27 }), false);
  assert.equal(validTestSiteDocument({ ...site, version: 44 }), false);
  const legacySite44 = structuredClone(site);
  legacySite44.version = 44;
  legacySite44.documents[0].blocks = [];
  legacySite44.publications = [];
  assert.equal(validTestSiteDocument(legacySite44), true);
  const migratedSite45 = testSiteCollection(legacySite44);
  assert.equal(migratedSite45.version, 55);
  assert.deepEqual(migratedSite45.navigationMenus, legacySite44.navigationMenus);
  assert.equal(migratedSite45.documents[0].id, legacySite44.documents[0].id);
  assert.equal(legacySite44.version, 44);
  const secondSite = { ...structuredClone(site), siteId: 'test2' };
  const library = createGlobalTemplateLibrary({ test: site, test2: secondSite });
  library.migrations.test.bases[0].parts[0].nodes = [nativeCover];
  assert.equal(validateGlobalTemplateLibrary(library).version, 47);
  assert.throws(() => validateGlobalTemplateLibrary({ ...library, version: 36 }), /Native Cover video sources require global template library v37/);
});
