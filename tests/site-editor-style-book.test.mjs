import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { loadProductionModule } from './production-module.mjs';

const { styleBookExamples, styleBookExampleText, styleBookPresentation } = await loadProductionModule(new URL('../app/studio/site-editor/style-book-model.ts', import.meta.url));
const { StyleBook } = await loadProductionModule(new URL('../app/studio/site-editor/style-book.tsx', import.meta.url));
const { createStylesPreview, stylesPreviewReducer, resolvePreviewStyle } = await loadProductionModule(new URL('../app/studio/site-editor/styles-preview-state.ts', import.meta.url));

test('Style Book filters overview, typography and individual roles without changing its fixtures', () => {
  assert.deepEqual(styleBookExamples('overview').map(item => item.id), ['colours', 'typography', 'image', 'separator', 'buttons', 'quote']);
  assert.ok(styleBookExamples('typography').some(item => item.id === 'table'));
  assert.deepEqual(styleBookExamples('buttons').map(item => item.id), ['buttons']);
  assert.deepEqual(styleBookExamples('captions').map(item => item.id), ['image']);
  assert.deepEqual(styleBookExamples('h3')[0].blocks.map(block => block.level), [3]);
  assert.equal(styleBookExamples('headings')[0].blocks.length, 6);
});

test('Typography includes the same two canonical paragraph samples as overview', () => {
  const overview = styleBookExamples('overview').find(example => example.id === 'typography');
  const typography = styleBookExamples('typography').find(example => example.id === 'typography');
  assert.equal(typography, overview);
  assert.equal(typography.blocks.length, 2);
  assert.ok(typography.blocks.every(block => block.type === 'paragraph'));
  const selection = resolvePreviewStyle(createStylesPreview().present, 'test');
  const rendered = renderToStaticMarkup(createElement(StyleBook, { selection, context: 'typography', onTypography() {}, onBrowse() {} }));
  const columns = rendered.match(/<div class="site-style-book-columns">(.*?)<p class="visually-hidden"/s)?.[1];
  assert.ok(columns);
  assert.equal((columns.match(/class="block-textarea paragraph-field/g) ?? []).length, 2);
  for (const block of typography.blocks) {
    assert.ok(columns.includes(block.text));
    assert.ok(styleBookExampleText(typography).includes(block.text));
  }
  assert.match(columns, /present and organise information/);
  assert.match(columns, /guides the reader through the content smoothly/);
});

test('Style Book follows scope inheritance, authored properties, palette changes, reset and history', () => {
  let state = createStylesPreview();
  const read = scope => styleBookPresentation(resolvePreviewStyle(state.present, scope));
  state = stylesPreviewReducer(state, { type: 'element', scope: 'global', role: 'text', patch: { family: 'Example Serif', weight: 700, letterSpacing: '2px' } });
  assert.equal(read('test')['--book-text-font-family'], 'Example Serif');
  assert.equal(read('test')['--book-text-font-weight'], 700);
  state = stylesPreviewReducer(state, { type: 'change', scope: 'test', patch: { paletteId: 'evening' } });
  assert.equal(read('test')['--book-surface'], '#1B1B1B');
  assert.equal(read('test2')['--book-surface'], '#FFFFFF');
  state = stylesPreviewReducer(state, { type: 'element', scope: 'test', role: 'h2', patch: { colour: '#123456' } });
  assert.equal(read('test')['--book-h2-color'], '#123456');
  assert.notEqual(read('test2')['--book-h2-color'], '#123456');
  state = stylesPreviewReducer(state, { type: 'reset-element', scope: 'test', role: 'h2' });
  assert.notEqual(read('test')['--book-h2-color'], '#123456');
  state = stylesPreviewReducer(state, { type: 'undo' });
  assert.equal(read('test')['--book-h2-color'], '#123456');
  state = stylesPreviewReducer(state, { type: 'redo' });
  assert.notEqual(read('test')['--book-h2-color'], '#123456');
});

test('Style Book renders canonical Studio blocks behind named navigation targets', () => {
  const selection = resolvePreviewStyle(createStylesPreview().present, 'test');
  const render = context => renderToStaticMarkup(createElement(StyleBook, { selection, context, onTypography() {}, onBrowse() {} }));
  const typography = render('typography');
  assert.match(typography, /heading-field is-h1/);
  assert.match(typography, /paragraph-field/);
  assert.match(typography, /content-table/);
  assert.match(typography, /aria-label="Open Text Typography"/);
  assert.match(typography, /aria-describedby="style-book-description-paragraph"/);
  assert.match(typography, /inert=""/);
  assert.doesNotMatch(typography, /contenteditable/i);
  const overview = render('overview');
  assert.match(overview, /src="\/specimens\/landscape.svg"/);
  assert.match(overview, /Browse Colour Variations/);
  assert.match(overview, /Open Typography/);
  assert.match(overview, /Open Buttons Typography/);
  assert.match(overview, /Illustrated green hills beneath a blue sky and yellow sun/);
});
