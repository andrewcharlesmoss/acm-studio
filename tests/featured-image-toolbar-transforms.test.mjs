import assert from 'node:assert/strict';
import test from 'node:test';
import { loadProductionModule } from './production-module.mjs';

const load = path => loadProductionModule(new URL(path, import.meta.url));
const { availableBlockTransforms, availableBlockTransformsInDocument, transformBlock } = await load('../app/studio/block-transforms.ts');
const { validContentBlocks } = await load('../app/studio/workspace-validation.ts');
const { findContentBlock } = await load('../app/content/block-tree.ts');

const featured = {
  id: 'featured', type: 'cover-image', align: 'right', blockAlign: 'wide', isLink: true,
  duotone: { dark: '#123456', light: '#ABCDEF' },
  linkTarget: '_blank', rel: 'nofollow', aspectRatio: 'wide', scale: 'cover',
  displayWidth: 640, displayHeight: 360, focalX: 37, focalY: 62,
  visualStyle: { margin: '12px', borderRadius: '8px' },
  editorial: { name: 'Hero image', lock: {} },
};

test('Featured Image wraps intact in Group and Columns, preserving all authored fields', () => {
  for (const wrapper of ['group', 'columns']) {
    const original = structuredClone(featured);
    const choice = availableBlockTransformsInDocument(featured, [featured]).find(item => item.id === `wrap-${wrapper}`);
    assert.ok(choice, `${wrapper} transform is available`);
    let sequence = 0;
    const result = transformBlock(featured, choice, () => `generated-${++sequence}`);
    const children = wrapper === 'group' ? result.children : result.children[0].children;
    assert.equal(result.type, wrapper);
    assert.equal(findContentBlock([result], 'featured'), featured, 'the exact Featured Image remains nested');
    assert.deepEqual(featured, original, 'transform does not mutate the source block');
    assert.equal(validContentBlocks([result]), true);
    assert.equal(result.blockAlign, 'wide', 'wide alignment transfers to the wrapper');
    assert.deepEqual(children, [featured]);
  }
});

test('Featured Image wrapping respects source locks, parent restrictions and whole-tree depth', () => {
  for (const lock of [{ move: true }, { remove: true }, { move: true, remove: true }]) {
    assert.deepEqual(availableBlockTransformsInDocument({ ...featured, editorial: { lock } }, [{ ...featured, editorial: { lock } }]), []);
  }
  for (const type of ['buttons', 'columns', 'social-icons']) {
    assert.deepEqual(availableBlockTransforms({ ...featured }, { id: 'parent', type, children: [featured] }), []);
  }
  let atLimit = featured;
  for (let depth = 0; depth < 8; depth++) atLimit = { id: `depth-${depth}`, type: 'group', layout: 'flow', children: [atLimit] };
  assert.equal(validContentBlocks([atLimit]), true);
  assert.deepEqual(availableBlockTransformsInDocument(featured, [atLimit]), []);
  let nearLimit = featured;
  for (let depth = 0; depth < 7; depth++) nearLimit = { id: `near-${depth}`, type: 'group', layout: 'flow', children: [nearLimit] };
  assert.deepEqual(availableBlockTransformsInDocument(featured, [nearLimit]).map(item => item.id), ['wrap-group']);
});
