import assert from 'node:assert/strict';
import test from 'node:test';
import { loadProductionModule } from './production-module.mjs';
const load = path => loadProductionModule(new URL(path, import.meta.url));
const { availableBlockTransforms, availableBlockTransformsInDocument, transformBlock } = await load('../app/studio/block-transforms.ts');
const { validContentBlocks } = await load('../app/studio/workspace-validation.ts');
const { editBlockSiblings } = await load('../app/studio/block-sibling-operations.ts');
const { findContentBlock } = await load('../app/content/block-tree.ts');
const block = { id: 'reading', type: 'reading-time', mode: 'words', prefix: 'About', showRange: true, presentation: 'badge', align: 'right', visualStyle: { anchor: 'read-duration', textColor: '#123456', responsive: { mobile: { fontSizeCustom: '18px' } } }, editorial: { name: 'Reading estimate', note: 'Keep this estimate' } };
const ids = (value, blocks = [value]) => availableBlockTransformsInDocument(value, blocks).map(choice => choice.id);
for (const wrapper of ['group', 'columns']) test(`Time to Read wraps intact in ${wrapper} through the complete-document transform path`, () => {
  const original = structuredClone(block);
  const choices = availableBlockTransformsInDocument(block, [block]);
  assert.deepEqual(choices.map(choice => choice.id).sort(), ['wrap-columns', 'wrap-group']);
  const choice = choices.find(choice => choice.id === `wrap-${wrapper}`);
  let sequence = 0;
  const wrapped = transformBlock(block, choice, () => `wrapper-${++sequence}`);
  const next = editBlockSiblings([block], block.id, () => [wrapped]);
  assert.equal(wrapped.type, wrapper);
  assert.equal(findContentBlock(next, block.id), block, 'retain the exact original child, including every field');
  assert.equal(wrapped.id, 'wrapper-1');
  assert.equal(validContentBlocks(next), true);
  assert.deepEqual(block, original);
});

test('Time to Read wrappers respect structural parents, source locks and complete-tree depth', () => {
  for (const lock of [{ move: true }, { remove: true }, { move: true, remove: true }]) assert.deepEqual(ids({ ...block, editorial: { ...block.editorial, lock } }), []);
  for (const type of ['buttons', 'columns', 'social-icons']) assert.deepEqual(availableBlockTransforms(block, { id: 'parent', type, children: [block] }), []);
  let deep = block;
  for (let depth = 0; depth < 8; depth++) deep = { id: `depth-${depth}`, type: 'group', layout: 'flow', children: [deep] };
  assert.equal(validContentBlocks([deep]), true);
  assert.deepEqual(ids(block, [deep]), []);
  let nearLimit = block;
  for (let depth = 0; depth < 7; depth++) nearLimit = { id: `near-${depth}`, type: 'group', layout: 'flow', children: [nearLimit] };
  assert.deepEqual(ids(block, [nearLimit]), ['wrap-group'], 'Group adds one level; Columns adds two');
  assert.deepEqual(ids(block, [{ id: 'other', type: 'paragraph', text: 'Removed source' }]), []);
});
