import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { loadProductionModule } from './production-module.mjs';

const { comparisonHomeBlocks, comparisonHomeWordPressMarkup } = await loadProductionModule(new URL('../app/studio/site-editor/comparison-home-model.ts', import.meta.url));
const { ComparisonHome } = await loadProductionModule(new URL('../app/studio/site-editor/comparison-home.tsx', import.meta.url));
const { createStylesPreview, resolvePreviewStyle, stylesPreviewReducer } = await loadProductionModule(new URL('../app/studio/site-editor/styles-preview-state.ts', import.meta.url));

test('comparison Home covers the supported key content types in a stable order', () => {
  assert.deepEqual(comparisonHomeBlocks.filter(block => block.type === 'heading').map(block => block.level), [1, 2, 3, 4, 5, 6]);
  for (const type of ['paragraph', 'list', 'quote', 'image', 'buttons', 'divider', 'table', 'code']) assert.ok(comparisonHomeBlocks.some(block => block.type === type));
  const ids = comparisonHomeBlocks.flatMap(block => [block.id, ...(block.type === 'buttons' ? block.children.map(button => button.id) : [])]);
  assert.equal(new Set(ids).size, ids.length);
});

test('WordPress export uses the same fixture content and escapes the supplied image URL', () => {
  const html = comparisonHomeWordPressMarkup('https://example.com/sample.png?first=1&second="two"');
  for (const block of comparisonHomeBlocks) {
    if (block.type === 'heading' || block.type === 'quote') assert.ok(html.includes(block.text));
  }
  assert.match(html, /<strong>bold statement<\/strong>/);
  assert.match(html, /<em>italic thought<\/em>/);
  assert.match(html, /<!-- wp:list \{"ordered":true\} -->/);
  assert.match(html, /https:\/\/example.com\/sample.png\?first=1&amp;second=&quot;two&quot;/);
  assert.match(html, /is-style-outline/);
  assert.equal((html.match(/<!-- wp:heading /g) ?? []).length, 6);
  assert.equal((html.match(/<!-- wp:/g) ?? []).length, (html.match(/<!-- \/wp:/g) ?? []).length);
});

test('ordinary Home renders canonical blocks with effective Styles roles and no editing state', () => {
  let state = createStylesPreview();
  state = stylesPreviewReducer(state, { type: 'element', scope: 'global', role: 'links', patch: { colour: '#123456', decoration: 'line-through' } });
  const html = renderToStaticMarkup(createElement(ComparisonHome, { selection: resolvePreviewStyle(state.present, 'test') }));
  for (const text of ['A place for good ideas', 'Illustrated green hills', 'Three parts of a simple story.', 'A sample quotation', 'Explore the story', 'Find out more']) assert.ok(html.includes(text));
  assert.match(html, /--book-links-color:#123456/);
  assert.match(html, /--book-links-text-decoration:line-through/);
  assert.match(html, /<strong>bold statement<\/strong>/);
  assert.match(html, /content-table/);
  assert.doesNotMatch(html, /contenteditable|site-style-book-target/);
});
