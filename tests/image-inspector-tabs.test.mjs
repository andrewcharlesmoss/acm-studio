import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { loadProductionModule } from './production-module.mjs';

const { BlockInspector } = await loadProductionModule(new URL('../app/studio/blocks/inspectors/block-inspector.tsx', import.meta.url));

test('Image inspector groups the existing controls into Content, Settings and Styles tabs', () => {
  const block = { id: 'image', type: 'image', src: 'https://example.test/image.png', alt: 'Landscape', title: 'Title', imageStyle: 'rounded' };
  const html = renderToStaticMarkup(createElement(BlockInspector, { block, onChange() {}, onOpenFiles() {}, canOpenFiles: true, fontSizeModeScope: 'test', fontSizeViewModes: {}, onFontSizeViewModeChange() {} }));
  assert.match(html, /role="tablist" aria-label="Image inspector"/);
  assert.equal((html.match(/role="tab"/g) ?? []).length, 3);
  const panels = [...html.matchAll(/<div[^>]*role="tabpanel"[^>]*>([\s\S]*?)(?=<div[^>]*role="tabpanel"|$)/g)];
  assert.equal(panels.length, 3);
  assert.doesNotMatch(panels[0][0].split('>')[0], /hidden/);
  for (const label of ['Choose from files', 'Alternative text', 'Mark as decorative', 'Link destination']) assert.match(panels[0][1], new RegExp(label));
  assert.doesNotMatch(panels[0][1], /Title attribute|Aspect ratio/);
  assert.match(panels[1][0].split('>')[0], /hidden/);
  for (const label of ['Advanced', 'HTML anchor', 'Title attribute']) assert.match(panels[1][1], new RegExp(label));
  assert.match(panels[2][0].split('>')[0], /hidden/);
  for (const label of ['Styles', 'Dimensions', 'Aspect ratio', 'Border']) assert.match(panels[2][1], new RegExp(label));
});
