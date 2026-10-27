import assert from 'node:assert/strict';
import test from 'node:test';
import { loadProductionModule } from './production-module.mjs';

const load = path => loadProductionModule(new URL(path, import.meta.url));
const { availableBlockTransforms, availableBlockTransformsInDocument, transformBlock } = await load('../app/studio/block-transforms.ts');
const { validContentBlocks } = await load('../app/studio/workspace-validation.ts');
const { editBlockSiblings } = await load('../app/studio/block-sibling-operations.ts');
const { findContentBlock } = await load('../app/content/block-tree.ts');
const { preservesBlockLocks } = await load('../app/content/block-editorial.ts');

const block = {
  id: 'social', type: 'social-icons',
  children: [
    { id: 'linkedin', type: 'social-linkedin', url: 'https://example.org/acm', label: 'ACM', rel: 'me' },
    { id: 'tiktok', type: 'social-tiktok', url: 'https://example.org/video', label: 'Studio', editorial: { name: 'Keep child note' } },
  ],
  socialStyle: 'pill-shape', justification: 'centre', orientation: 'vertical', allowWrap: false,
  iconSize: 'large', horizontalGap: 17, verticalGap: 23, showLabels: true, openInNewTab: true,
  visualStyle: { textColor: '#123456', margin: '12px' },
  editorial: { name: 'Community links', note: 'Keep parent note' },
};
const ids = (value, blocks = [value]) => availableBlockTransformsInDocument(value, blocks).map(choice => choice.id);

test('Social Icons offers three style variations and changes only its style field', () => {
  const transforms = availableBlockTransformsInDocument(block, [block]);
  assert.deepEqual(transforms.filter(choice => choice.socialStyle).map(choice => [choice.id, choice.socialStyle]), [
    ['social-icons-style-default', 'default'],
    ['social-icons-style-logos-only', 'logos-only'],
    ['social-icons-style-pill-shape', 'pill-shape'],
  ]);
  const choice = transforms.find(item => item.socialStyle === 'logos-only');
  const changed = transformBlock(block, choice);
  assert.equal(changed.socialStyle, 'logos-only');
  assert.deepEqual({ ...changed, socialStyle: block.socialStyle }, block);
  assert.equal(transformBlock(changed, choice), changed, 'reselecting the current variation is a no-op');
});

for (const wrapper of ['group', 'columns']) test(`Social Icons wraps intact in ${wrapper} through the complete-document path`, () => {
  const original = structuredClone(block);
  const choice = availableBlockTransformsInDocument(block, [block]).find(item => item.id === `wrap-${wrapper}`);
  assert.ok(choice);
  let sequence = 0;
  const wrapped = transformBlock(block, choice, () => `wrapper-${++sequence}`);
  const next = editBlockSiblings([block], block.id, () => [wrapped]);
  assert.equal(wrapped.type, wrapper);
  assert.equal(wrapped.id, 'wrapper-1');
  assert.equal(findContentBlock(next, block.id), block, 'retain the original Social Icons object and every nested child');
  assert.equal(findContentBlock(next, 'linkedin'), block.children[0]);
  assert.equal(findContentBlock(next, 'tiktok'), block.children[1]);
  assert.equal(validContentBlocks(next), true);
  assert.equal(preservesBlockLocks([block], next), true);
  assert.deepEqual(block, original);
});

test('Social Icons wrappers respect parent rules, locks and complete-tree depth', () => {
  for (const type of ['buttons', 'columns', 'social-icons']) {
    assert.deepEqual(availableBlockTransforms(block, { id: 'parent', type, children: [block] }).filter(choice => choice.id.startsWith('wrap-')), []);
  }
  for (const lock of [{ move: true }, { remove: true }, { move: true, remove: true }]) {
    const locked = { ...block, editorial: { ...block.editorial, lock } };
    assert.deepEqual(availableBlockTransformsInDocument(locked, [locked]).filter(choice => choice.id.startsWith('wrap-')), []);
    assert.equal(availableBlockTransformsInDocument(locked, [locked]).some(choice => choice.socialStyle === 'logos-only'), true, 'style variation remains available because it does not move the locked block');
  }
  let deep = block;
  for (let depth = 0; depth < 7; depth++) deep = { id: `depth-${depth}`, type: 'group', layout: 'flow', children: [deep] };
  assert.equal(validContentBlocks([deep]), true);
  assert.deepEqual(ids(block, [deep]).filter(id => id.startsWith('wrap-')), []);
  let nearLimit = block;
  for (let depth = 0; depth < 6; depth++) nearLimit = { id: `near-${depth}`, type: 'group', layout: 'flow', children: [nearLimit] };
  assert.deepEqual(ids(block, [nearLimit]).filter(id => id.startsWith('wrap-')), ['wrap-group'], 'Group adds one level; Columns adds two');
  assert.deepEqual(ids(block, [{ id: 'other', type: 'paragraph', text: 'Removed source' }]).filter(id => id.startsWith('wrap-')), []);
});
