import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { loadProductionModule } from './production-module.mjs';
const { ParagraphEditField } = await loadProductionModule(new URL('../app/studio/blocks/paragraph/edit-field.tsx', import.meta.url));
const { BlockField } = await loadProductionModule(new URL('../app/studio/studio-canvas.tsx', import.meta.url));
const paragraph = id => ({ id, type: 'paragraph', text: '' });
const callbacks = { onChange() {}, onTextSelection() {}, onLinkActivate() {}, onTableCellFocus() {} };

test('empty Paragraph defaults are independent of selection and custom prompts stay visible', () => {
  const props = { block: paragraph('empty'), onChange() {} };
  assert.equal(ParagraphEditField(props).props['data-placeholder'], 'Type / to choose a block');
  assert.equal(ParagraphEditField(props).props['data-studio-empty'], true);
  assert.equal(ParagraphEditField({ ...props, previousSibling: paragraph('previous') }).props['data-studio-hide-default-placeholder'], true);
  assert.equal(ParagraphEditField({ ...props, previousSibling: paragraph('previous'), placeholder: 'Write title…' }).props['data-studio-hide-default-placeholder'], undefined);
  assert.equal(ParagraphEditField({ ...props, previousSibling: { ...paragraph('previous'), editorial: { hidden: true } } }).props['data-studio-hide-default-placeholder'], undefined);
});

for (const owner of ['group', 'section', 'column', 'quote']) test(`${owner} passes adjacent empty Paragraph context to the shared editor`, () => {
  const block = { id: owner, type: owner, layout: 'flow', role: 'section', children: [paragraph('first'), paragraph('second')] };
  const html = renderToStaticMarkup(createElement(BlockField, { block, ...callbacks }));
  assert.equal((html.match(/data-studio-empty="true"/g) ?? []).length, 2);
  assert.equal((html.match(/data-studio-hide-default-placeholder="true"/g) ?? []).length, 1);
});
