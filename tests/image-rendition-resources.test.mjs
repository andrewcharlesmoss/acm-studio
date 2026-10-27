import assert from 'node:assert/strict';
import test from 'node:test';
import { loadProductionModule } from './production-module.mjs';
const load = path => loadProductionModule(new URL(path, import.meta.url));
const { imageRenditionSelections, referencedImageRenditions } = await load('../app/studio/image-rendition-resources.ts');
const { imageRenditionResourceKey } = await load('../app/content/image-resolution.ts');
const pin = { key: 'medium', sourceDigest: 'a'.repeat(64), renditionDigest: 'b'.repeat(64) };
const blob = new Blob(['medium'], { type: 'image/png' });
const sizes = { version: 1, bundles: [{ sourceDigest: pin.sourceDigest, width: 400, height: 200, variants: [{ key: pin.key, width: 300, height: 150, type: 'image/png', size: blob.size, digest: pin.renditionDigest, blob }] }] };
const image = { id: 'image', type: 'image', src: '', mediaId: 'media', alt: 'Landscape', imageResolution: pin };

test('only referenced exact Image sizes become object URL resources', async () => {
  const nested = [{ id: 'group', type: 'group', layout: 'flow', children: [image, { ...image, id: 'duplicate' }] }];
  const select = blocks => imageRenditionSelections(blocks);
  const resources = referencedImageRenditions(select(nested), [{ id: 'media', imageRenditions: sizes }, { id: 'unused', imageRenditions: sizes }]);
  assert.equal(resources.length, 1);
  assert.equal(resources[0].id, imageRenditionResourceKey('media', pin));
  assert.equal(await resources[0].blob.text(), 'medium');
  assert.equal(JSON.stringify(select([image, { id: 'p', type: 'paragraph', text: 'One' }])), JSON.stringify(select([image, { id: 'p', type: 'paragraph', text: 'Two' }])));
  assert.equal(referencedImageRenditions(select([{ ...image, imageResolution: { ...pin, renditionDigest: 'c'.repeat(64) } }]), [{ id: 'media', imageRenditions: sizes }]).length, 0);
  assert.equal(referencedImageRenditions(select([{ ...image, mediaId: 'other' }]), [{ id: 'media', imageRenditions: sizes }]).length, 0);
  assert.equal(referencedImageRenditions(select([image]), [{ id: 'media', imageRenditions: { version: 1, bundles: [{ ...sizes.bundles[0], variants: [{ ...sizes.bundles[0].variants[0], size: 0 }] }] } }]).length, 0);
  assert.equal(referencedImageRenditions(select([{ ...image, imageResolution: null }]), [{ id: 'media', imageRenditions: sizes }]).length, 0);
});
