import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { loadProductionModule } from './production-module.mjs';
const { PatternsCatalogue } = await loadProductionModule(new URL('../app/studio/site-editor/patterns-catalogue.tsx', import.meta.url));
const { createReferenceTemplateParts } = await loadProductionModule(new URL('../app/studio/reference-template-parts.ts', import.meta.url));

test('pattern catalogue renders the real reference entries and navigation controls', () => {
  const set = createReferenceTemplateParts();
  const entries = set.parts.map(entry => ({ set, entry }));
  const html = renderToStaticMarkup(createElement(PatternsCatalogue, { entries, scope: 'test' }));
  assert.match(html, /aria-label="Change layout, grid"/);
  assert.match(html, /aria-label="View options"/);
  assert.match(html, /Footer Newsletter/);
  assert.match(html, /target=tt5-footer-newsletter/);
  assert.equal((html.match(/class="site-pattern-card"/g) || []).length, 7);
});
