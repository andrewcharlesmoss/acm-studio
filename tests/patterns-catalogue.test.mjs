import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { loadProductionModule } from './production-module.mjs';
const { PatternsCatalogue } = await loadProductionModule(new URL('../app/studio/site-editor/patterns-catalogue.tsx', import.meta.url));
const { createReferenceTemplateParts, referenceComparisonMenuLinks, referencePartIds } = await loadProductionModule(new URL('../app/studio/reference-template-parts.ts', import.meta.url));
const { validateTemplateSet } = await loadProductionModule(new URL('../app/studio/template-model.ts', import.meta.url));

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

test('the seven Twenty Twenty-Five parts retain their WordPress structure and valid template contract', () => {
  const set = createReferenceTemplateParts();
  assert.deepEqual(set.parts.map(part => part.id), referencePartIds.map(id => `tt5-${id}`));
  assert.doesNotThrow(() => validateTemplateSet(set));
  const all = nodes => nodes.flatMap(node => [node, ...(node.children ? all(node.children) : [])]);
  const part = id => set.parts.find(candidate => candidate.id === `tt5-${id}`);
  const sidebar = all(part('sidebar').nodes);
  const query = sidebar.find(node => node.type === 'query-loop');
  assert.equal(query.count, 4);
  assert.equal(query.order, 'desc');
  assert.equal(query.stickyFirst, true);
  assert.deepEqual(query.children.map(node => node.type), ['post-template', 'no-results']);
  assert.deepEqual(query.children[0].children.map(node => node.type), ['title', 'post-date']);

  const header = all(part('header').nodes);
  assert.deepEqual(header.filter(node => node.type === 'element').map(node => node.element), ['site-title', 'navigation']);
  const largeHeader = all(part('header-large-title').nodes);
  assert.equal(largeHeader.find(node => node.type === 'element' && node.element === 'site-title').visualStyle.fontSizeCustom, '100px');
  assert.ok(largeHeader.some(node => node.type === 'group' && node.visualStyle?.borderWidthSides?.bottom === '1px'));

  const footer = all(part('footer').nodes);
  assert.deepEqual(footer.filter(node => node.type === 'element').map(node => node.element), ['site-logo', 'site-title', 'site-tagline', 'navigation', 'navigation', 'site-credit']);
  assert.ok(footer.some(node => node.type === 'spacer' && node.height === 40));
  assert.ok(footer.some(node => node.type === 'spacer' && node.height === 70));

  const newsletter = all(part('footer-newsletter').nodes);
  assert.deepEqual(newsletter.slice(-4).map(node => node.type), ['buttons', 'button', 'spacer', 'element']);
  assert.equal(newsletter.filter(node => node.type === 'button').length, 1);
  assert.equal(newsletter.find(node => node.type === 'button').url, '');
  const columns = all(part('footer-columns').nodes);
  assert.deepEqual(columns.filter(node => node.type === 'element').map(node => node.element), ['site-title', 'site-tagline', 'navigation', 'navigation', 'site-credit']);
  assert.deepEqual(referenceComparisonMenuLinks('tt5-footer-columns-stories-navigation').map(link => link.label), ['Blog', 'About', 'FAQs', 'Authors']);
  assert.deepEqual(referenceComparisonMenuLinks('tt5-footer-columns-featured-navigation').map(link => link.label), ['Events', 'Shop', 'Patterns', 'Themes']);
});
