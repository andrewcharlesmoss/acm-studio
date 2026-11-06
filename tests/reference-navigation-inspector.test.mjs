import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { loadProductionModule } from './production-module.mjs';

const { TemplateInspector } = await loadProductionModule(new URL('../app/studio/template-inspector.tsx', import.meta.url));
const { createReferenceTemplateParts, referenceComparisonNavigation } = await loadProductionModule(new URL('../app/studio/reference-template-parts.ts', import.meta.url));
const set = createReferenceTemplateParts();
const target = set.parts.find(part => part.id === 'tt5-header');
const sample = referenceComparisonNavigation;
const adapter = { writable: true, ownerName: 'Test1', saveLabel: 'Saved', links: [{ id: 'real', label: 'Real site link', url: '/' }], menus: [{ id: 'real-menu', name: 'Real menu' }], defaultMenuId: 'real-menu', assignments: [], reviewPending: false, canUndo: false, canRedo: false, linksFor() { return this.links; }, change() { throw Error('unexpected write'); }, changeForNavigation() { throw Error('unexpected write'); }, assign() { throw Error('unexpected write'); }, undo() {}, redo() {}, reviewSave() {} };
function render(comparisonNavigation, navigationLinkId = null, owner = adapter) {
  return renderToStaticMarkup(createElement(TemplateInspector, { set, target, siteNavigationPane: owner, comparisonNavigation, globalOriginal: true, selectedBlock: { id: 'nav', type: 'group', layout: 'row', children: [], data: { templateElement: 'navigation' } }, tab: 'block', navigationLinkId, writable: true, onChange() { throw Error('unexpected write'); }, onBlockChange() {}, onOpenMedia() {}, onEditPart() {}, users: [] }));
}
test('reference Navigation pane shows the same example links without exposing the site menu', () => {
  const html = render(sample);
  assert.match(html, /Hello from WordPress Playground!/);
  assert.match(html, /Sample Page/);
  assert.match(html, /Example links are read-only/);
  assert.doesNotMatch(html, /Real site link|Real menu|Test1 links/);
  assert.doesNotMatch(html, /aria-label="Add navigation link"/);
});
test('other templates continue to show the site-owned menu', () => {
  const html = render(undefined);
  assert.match(html, /Real site link/);
  assert.match(html, /Real menu/);
  assert.doesNotMatch(html, /Example links are read-only/);
});
test('selecting an example link opens its read-only details', () => {
  const html = render(sample, sample[0].id);
  assert.match(html, /Hello from WordPress Playground!/);
  assert.match(html, /Example links are read-only/);
  assert.doesNotMatch(html, /Real site link|Real menu/);
  assert.match(html, /disabled=""/);
});
test('an assigned site comparison menu remains editable through the canonical owner', () => {
  const owner = { ...adapter, links: sample, menus: [{ id: 'comparison', name: 'WordPress comparison', links: sample }], defaultMenuId: 'real-menu', assignments: [{ navigationId: 'nav', menuId: 'comparison' }] };
  const html = render(undefined, null, owner);
  assert.match(html, /WordPress comparison/);
  assert.match(html, /Hello from WordPress Playground!/);
  assert.match(html, /Sample Page/);
  assert.match(html, /aria-label="Add navigation link"/);
  assert.doesNotMatch(html, /Example links are read-only/);
});

test('header and footer design choices keep interactive artwork outside the choice button', () => {
  for (const kind of ['header', 'footer']) {
    const target = set.parts.find(part => part.kind === kind);
    const html = renderToStaticMarkup(createElement(TemplateInspector, {
      set, target, globalOriginal: true, selectedBlock: null, tab: 'template', writable: true,
      onChange() {}, onBlockChange() {}, onOpenMedia() {}, onEditPart() {},
      onApplyHeaderDesign() {}, onApplyFooterDesign() {}, users: [],
    }));
    const choices = [...html.matchAll(/<button\b[^>]*aria-label="Apply [^"]*"[^>]*>([\s\S]*?)<\/button>/g)];
    assert.ok(choices.length > 0, `${kind} design choices are rendered`);
    for (const [, contents] of choices) assert.equal(contents, '', 'choice button has no nested template controls');
    assert.match(html, /class="template-part-design-choice"/);
    assert.match(html, /reference-template-part-preview/);
  }
});
