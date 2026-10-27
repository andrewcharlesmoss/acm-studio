import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { loadProductionModule } from './production-module.mjs';
const load = path => loadProductionModule(new URL(path, import.meta.url));
const { resolveBlockImageSource } = await load('../app/content/image-source.ts');
const { imageRenditionResourceKey } = await load('../app/content/image-resolution.ts');
const { BlockRenderer } = await load('../app/components/blocks/block-renderer.tsx');
const pin = { key: 'medium', sourceDigest: 'a'.repeat(64), renditionDigest: 'b'.repeat(64) };
const image = { id: 'image', type: 'image', src: '', mediaId: 'media', alt: 'Landscape', caption: 'Caption', imageResolution: pin, linkDestination: 'media' };
const originals = { media: 'https://example.test/original.png' };
const sizes = { [imageRenditionResourceKey('media', pin)]: 'https://example.test/medium.png' };

test('an Image size resolves only its exact media and digest tuple', () => {
  assert.equal(resolveBlockImageSource(image, originals, sizes), 'https://example.test/medium.png');
  assert.equal(resolveBlockImageSource(image, originals, {}), null);
  assert.equal(resolveBlockImageSource({ ...image, mediaId: 'different' }, originals, sizes), null);
  assert.equal(resolveBlockImageSource({ ...image, imageResolution: { ...pin, renditionDigest: 'c'.repeat(64) } }, originals, sizes), null);
  assert.equal(resolveBlockImageSource({ ...image, imageResolution: null }, originals, sizes), null);
  assert.equal(resolveBlockImageSource({ ...image, mediaId: undefined, src: 'https://example.test/original.png' }, originals, sizes), null);
  assert.equal(resolveBlockImageSource(image, originals, { [imageRenditionResourceKey('media', pin)]: 'javascript:alert(1)' }), null);
  assert.equal(resolveBlockImageSource(image, originals, { [imageRenditionResourceKey('media', pin)]: undefined }), null);
  assert.equal(resolveBlockImageSource({ ...image, imageResolution: undefined }, originals, sizes), originals.media);
  assert.equal(resolveBlockImageSource({ ...image, mediaId: undefined, imageResolution: undefined, src: 'https://example.test/external.png' }, { 'https://example.test/external.png': 'blob:unrelated' }, sizes), 'https://example.test/external.png');
});

test('canonical renderer shows the selected size and an explicit missing-size state', () => {
  for (const variant of ['studio', 'article']) {
    const html = renderToStaticMarkup(createElement(BlockRenderer, { blocks: [image], variant, mediaUrls: originals, imageRenditionUrls: sizes }));
    assert.match(html, /https:\/\/example\.test\/medium\.png/);
    assert.doesNotMatch(html, /original\.png/);
    assert.match(html, /alt="Landscape"/);
    assert.match(html, /Caption/);
    const missing = renderToStaticMarkup(createElement(BlockRenderer, { blocks: [image], variant, mediaUrls: originals }));
    assert.doesNotMatch(missing, /original\.png/);
    assert.match(missing, /(?:selected image size is unavailable|Image size unavailable)/i);
    assert.match(missing, /Caption/);
  }
  const normal = renderToStaticMarkup(createElement(BlockRenderer, { blocks: [{ ...image, imageResolution: undefined }], mediaUrls: originals }));
  assert.match(normal, /original\.png/);
  const nested = renderToStaticMarkup(createElement(BlockRenderer, { blocks: [{ id: 'group', type: 'group', layout: 'flow', children: [image] }], mediaUrls: originals, imageRenditionUrls: sizes }));
  assert.match(nested, /medium\.png/);
  assert.doesNotMatch(nested, /original\.png/);
});
