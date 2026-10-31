import assert from 'node:assert/strict';
import test from 'node:test';
import { loadProductionModule } from './production-module.mjs';

const load = path => loadProductionModule(new URL(path, import.meta.url));
const { availableBlockTransforms, availableBlockTransformsInDocument, transformBlock } = await load('../app/studio/block-transforms.ts');
const { validContentBlocks } = await load('../app/studio/workspace-validation.ts');
const { editBlockSiblings } = await load('../app/studio/block-sibling-operations.ts');
const { findContentBlock } = await load('../app/content/block-tree.ts');

const image = {
  id: 'image-source', type: 'image', src: '/media/landscape.svg', alt: 'Green hills beneath a blue sky',
  mediaId: 'managed-image', caption: 'A caption', captionRuns: [{ text: 'A ' }, { text: 'caption', marks: ['bold'] }],
  decorative: false, title: 'Landscape', aspectRatio: 'landscape', scale: 'contain', displayWidth: 640,
  displayHeight: 360, focalX: 42, focalY: 58, linkUrl: 'https://example.com/image',
  linkDestination: 'custom', opensInNewTab: true, imageStyle: 'rounded',
  imageResolution: { key: 'large', sourceDigest: 'a'.repeat(64), renditionDigest: 'b'.repeat(64) },
  imageEdit: { crop: { x: 0.04, y: 0.05, width: 0.8, height: 0.7 }, sourceWidth: 1200, sourceHeight: 800, zoom: 1.2, rotation: 90, straighten: 3, flipHorizontal: true, flipVertical: false },
  duotone: { dark: '#123456', light: '#abcdef' }, blockAlign: 'wide', wide: true,
};

const transformId = 'image-to-media-text-columns';
const choiceFrom = (block, blocks = [block]) => availableBlockTransformsInDocument(block, blocks).find(item => item.id === transformId);

test('Image Media & Text adaptation preserves Image data and alignment in the Columns wrapper', () => {
  const original = structuredClone(image);
  const choice = choiceFrom(image);
  assert.ok(choice, `expected transform choice; available: ${availableBlockTransformsInDocument(image, [image]).map(item => item.id).join(', ')}`);
  assert.equal(choice?.label, 'Media & Text (Columns)');

  let sequence = 0;
  const columns = transformBlock(image, choice, () => `generated-${++sequence}`);
  assert.equal(columns.type, 'columns');
  assert.equal(columns.blockAlign, 'wide');
  assert.deepEqual(columns.children.map(column => column.width), [50, 50]);
  const placedImage = columns.children[0].children[0];
  const { blockAlign, wide, ...sourceFields } = image;
  assert.equal(placedImage.id, image.id);
  assert.deepEqual(placedImage, sourceFields, 'all Image-owned content and presentation fields remain intact');
  assert.deepEqual(columns.children[1].children, [{ id: 'generated-4', type: 'paragraph', text: '' }]);
  assert.deepEqual(image, original, 'the transform does not mutate the source');

  const transformedTree = editBlockSiblings([image], image.id, () => [columns]);
  assert.equal(findContentBlock(transformedTree, image.id), placedImage);
  assert.equal(validContentBlocks(transformedTree), true);
});

test('Image Media & Text transform respects locks, parent allowlists, and nesting limits', () => {
  assert.equal(availableBlockTransforms(image).find(item => item.id === transformId)?.label, 'Media & Text (Columns)');
  for (const lock of [{ move: true }, { remove: true }]) {
    const locked = { ...image, editorial: { lock } };
    assert.equal(choiceFrom(locked), undefined);
  }
  const parent = { id: 'restricted', type: 'group', layout: 'flow', allowedBlocks: ['image'], children: [image] };
  assert.equal(choiceFrom(image, [parent]), undefined);
  const permitted = { ...parent, allowedBlocks: ['columns'] };
  assert.ok(choiceFrom(image, [permitted]));

  let deepImage = image;
  for (let depth = 0; depth < 8; depth++) deepImage = { id: `parent-${depth}`, type: 'group', layout: 'flow', children: [deepImage] };
  assert.equal(choiceFrom(image, [deepImage]), undefined, 'the complete-tree validator withholds a transform that exceeds nesting limits');
});

test('Image alignment that Columns cannot represent does not offer the adaptation', () => {
  for (const alignment of ['left', 'center', 'right']) {
    const aligned = { ...image, blockAlign: alignment, wide: undefined };
    assert.equal(choiceFrom(aligned), undefined);
  }
});
