import assert from 'node:assert/strict';
import test from 'node:test';
import { loadProductionModule } from './production-module.mjs';

const load = path => loadProductionModule(new URL(path, import.meta.url));
const { availableBlockTransforms, availableBlockTransformsInDocument, transformBlock } = await load('../app/studio/block-transforms.ts');
const { validContentBlocks } = await load('../app/studio/workspace-validation.ts');
const { editBlockSiblings } = await load('../app/studio/block-sibling-operations.ts');
const { findContentBlock } = await load('../app/content/block-tree.ts');

const block = {
  id: 'date', type: 'post-date', dateSource: 'modified', customFormat: 'Y-m-d',
  format: 'custom', showIcon: false, align: 'right', isLink: true,
  visualStyle: { anchor: 'date-anchor', textColor: '#123456' },
  editorial: { name: 'Updated date', note: 'Preserve this metadata' },
};
const ids = (value, blocks = [value]) => availableBlockTransformsInDocument(value, blocks).map(choice => choice.id);

for (const wrapper of ['group', 'columns']) test(`Post Date wraps intact in ${wrapper} through the complete-document transform path`, () => {
  const original = structuredClone(block);
  const choices = availableBlockTransformsInDocument(block, [block]);
  assert.deepEqual(choices.map(choice => choice.id).sort(), ['wrap-columns', 'wrap-group']);
  const choice = choices.find(item => item.id === `wrap-${wrapper}`);
  let sequence = 0;
  const wrapped = transformBlock(block, choice, () => `wrapper-${++sequence}`);
  const next = editBlockSiblings([block], block.id, () => [wrapped]);
  const retained = wrapper === 'group' ? wrapped.children[0] : wrapped.children[0].children[0];
  assert.equal(wrapped.type, wrapper);
  assert.equal(findContentBlock(next, block.id), block);
  assert.equal(retained, block, 'retain the exact source block and all its fields');
  assert.equal(wrapped.id, 'wrapper-1');
  assert.equal(validContentBlocks(next), true);
  assert.deepEqual(block, original, 'wrapping does not mutate the source');
});

test('Post Date wrappers respect locks, parent restrictions and document depth', () => {
  for (const lock of [{ move: true }, { remove: true }, { move: true, remove: true }]) {
    assert.deepEqual(ids({ ...block, editorial: { ...block.editorial, lock } }), []);
  }
  for (const type of ['buttons', 'columns', 'social-icons']) {
    assert.deepEqual(availableBlockTransforms(block, { id: 'parent', type, children: [block] }), []);
  }
  const restrictedParent = { id: 'restricted', type: 'group', layout: 'flow', allowedBlocks: ['paragraph'], children: [block] };
  assert.deepEqual(availableBlockTransformsInDocument(block, [restrictedParent]), []);

  let deep = block;
  for (let depth = 0; depth < 8; depth++) deep = { id: `depth-${depth}`, type: 'group', layout: 'flow', children: [deep] };
  assert.equal(validContentBlocks([deep]), true);
  assert.deepEqual(ids(block, [deep]), []);
});
