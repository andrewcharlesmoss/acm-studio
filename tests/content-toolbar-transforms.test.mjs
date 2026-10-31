import assert from 'node:assert/strict';
import test from 'node:test';
import { loadProductionModule } from './production-module.mjs';

const load = path => loadProductionModule(new URL(path, import.meta.url));
const { availableBlockTransforms, availableBlockTransformsInDocument, transformBlock } = await load('../app/studio/block-transforms.ts');
const { validContentBlocks } = await load('../app/studio/workspace-validation.ts');
const { editBlockSiblings } = await load('../app/studio/block-sibling-operations.ts');
const { findContentBlock } = await load('../app/content/block-tree.ts');

const content = {
  id: 'content-slot', type: 'group', layout: 'flow', blockAlign: 'wide',
  data: { templateElement: 'content' },
  visualStyle: { padding: '16px', textColor: '#123456' },
  children: [{ id: 'sample-body', type: 'paragraph', text: 'Preview body' }],
};
const ids = (block, blocks = [block]) => availableBlockTransformsInDocument(block, blocks).map(choice => choice.id);

for (const wrapper of ['group', 'columns', 'details']) test(`Content slot wraps intact in ${wrapper} through the complete-document transform path`, () => {
  const original = structuredClone(content);
  const choice = availableBlockTransformsInDocument(content, [content]).find(item => item.id === `wrap-${wrapper}`);
  assert.ok(choice, `${wrapper} transform is available`);
  let sequence = 0;
  const transformed = transformBlock(content, choice, () => `generated-${++sequence}`);
  const next = editBlockSiblings([content], content.id, () => [transformed]);
  const child = wrapper === 'columns' ? transformed.children[0].children[0] : transformed.children[0];
  assert.equal(transformed.type, wrapper === 'details' ? 'group' : wrapper);
  if (wrapper === 'details') {
    assert.equal(transformed.tagName, 'details');
    assert.equal(transformed.detailsSummary, 'Details');
  }
  assert.equal(findContentBlock(next, content.id), content, 'the exact dynamic Content slot remains nested');
  assert.equal(child, content);
  assert.equal(validContentBlocks(next), true);
  assert.equal(transformed.blockAlign, 'wide', 'wide alignment transfers to the wrapper');
  assert.deepEqual(content, original, 'the transform does not mutate the source slot');
});

test('Content slot wrappers respect locks, parent restrictions and complete-tree depth', () => {
  for (const lock of [{ move: true }, { remove: true }, { move: true, remove: true }]) {
    const locked = { ...content, editorial: { lock } };
    assert.deepEqual(ids(locked), []);
  }
  for (const type of ['buttons', 'columns', 'social-icons']) {
    assert.deepEqual(availableBlockTransforms(content, { id: 'parent', type, children: [content] }), []);
  }
  const restrictedParent = { id: 'restricted', type: 'group', layout: 'flow', allowedBlocks: ['paragraph'], children: [content] };
  assert.deepEqual(availableBlockTransformsInDocument(content, [restrictedParent]), []);

  const emptySlot = { ...content, children: [] };
  let atLimit = emptySlot;
  for (let depth = 0; depth < 8; depth++) atLimit = { id: `depth-${depth}`, type: 'group', layout: 'flow', children: [atLimit] };
  assert.equal(validContentBlocks([atLimit]), true);
  assert.deepEqual(ids(emptySlot, [atLimit]), []);

  let nearLimit = emptySlot;
  for (let depth = 0; depth < 7; depth++) nearLimit = { id: `near-${depth}`, type: 'group', layout: 'flow', children: [nearLimit] };
  assert.deepEqual(ids(emptySlot, [nearLimit]), ['wrap-group', 'wrap-details'], 'Columns requires two additional levels');
});

test('Ordinary Group variations do not gain Content-only wrapper transforms', () => {
  const ordinary = { id: 'group', type: 'group', layout: 'flow', children: [{ id: 'paragraph', type: 'paragraph', text: 'Copy' }] };
  assert.ok(availableBlockTransforms(ordinary).some(choice => choice.id === 'row'));
  assert.ok(!availableBlockTransforms(ordinary).some(choice => choice.id.startsWith('wrap-')));
});

test('template Details preserves its editable summary and disclosure state in the rendered template', async () => {
  const { createElement } = await import('react');
  const { renderToStaticMarkup } = await import('react-dom/server');
  const { TemplateNodes } = await load('../app/studio/template-renderer.tsx');
  const set = { ...await load('../app/studio/template-model.ts').then(module => module.createTemplateSet()), parts: [] };
  const html = renderToStaticMarkup(createElement(TemplateNodes, {
    set,
    document: { kind: 'page', title: 'Example', slug: 'example', blocks: [] },
    nodes: [{ id: 'details', type: 'group', layout: 'flow', tagName: 'details', detailsSummary: 'Open article', openByDefault: true,
      children: [{ id: 'content-slot', type: 'element', element: 'content' }] }],
    content: createElement('p', null, 'Projected document body'),
  }));
  assert.match(html, /<details[^>]* open=""><summary>Open article<\/summary>/);
  assert.match(html, /Projected document body/);
});
