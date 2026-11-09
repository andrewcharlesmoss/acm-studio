import assert from 'node:assert/strict';
import test from 'node:test';
import { loadProductionModule } from './production-module.mjs';
const { navigationListViewEntries } = await loadProductionModule(new URL('../app/studio/navigation-list-view.tsx', import.meta.url));
const { templateEditorBlocks } = await loadProductionModule(new URL('../app/studio/template-model.ts', import.meta.url));

test('List View reflects current menu links and real Page List ownership without fabricating blocks', () => {
  const links = [{ id: 'page', label: 'Sample Page', url: '/sample' }, { id: 'custom', label: 'Custom link', url: 'https://example.com', children: [{ id: 'nested', label: 'Nested link', url: '/nested' }] }];
  const node = { id: 'navigation', type: 'element', element: 'navigation', pageListBlock: { id: 'pages', type: 'navigation-page-list', position: 1 }, searchEnabled: true, searchPosition: 3 };
  const projected = templateEditorBlocks([node])[0];
  const before = structuredClone({ node, links, projected });
  const events = [];
  const rows = navigationListViewEntries(projected, links, { blockId: node.id, linkId: 'nested' }, (owner, id) => events.push([owner, id]), owner => events.push([owner, 'search']));
  assert.deepEqual(rows.map(row => row.label), ['Sample Page', 'Page List', 'Custom link', 'Search']);
  assert.equal(rows[1].blockId, 'pages');
  assert.equal(rows[2].children[0].selected, true);
  rows[2].children[0].onSelect(); rows[3].onSelect();
  assert.deepEqual(events, [['navigation', 'nested'], ['navigation', 'search']]);
  assert.deepEqual({ node, links, projected }, before);
  const manual = { ...projected, children: [], data: { templateElement: 'navigation' } };
  assert.equal(navigationListViewEntries(manual, links, null, () => {}, () => {}).some(row => row.label === 'Page List'), false);
  assert.equal(navigationListViewEntries({ id: 'ordinary', type: 'group', layout: 'row', children: [] }, links, null, () => {}, () => {}), undefined);
});

test('legacy automatic Page List retains its canonical projected typed child', () => {
  const block = templateEditorBlocks([{ id: 'legacy-nav', type: 'element', element: 'navigation', automaticPageList: true }])[0];
  const rows = navigationListViewEntries(block, [], null, () => {}, () => {});
  assert.equal(rows.length, 1);
  assert.equal(rows[0].blockId, block.children[0].id);
  assert.equal(block.children[0].type, 'navigation-page-list');
});

test('Page List descendants derive from site pages and select their actual Page List owner', () => {
  const block = { id: 'pages', type: 'navigation-page-list' };
  const pages = [{ id: 'page', label: 'Sample Page', url: '/sample', children: [{ id: 'subpage', label: 'Child page', url: '/child' }] }];
  const before = structuredClone({ block, pages });
  const calls = [];
  const rows = navigationListViewEntries(block, [], null, () => {}, () => {}, { ownerId: 'navigation', links: pages, onSelect: (owner, id) => calls.push([owner, id]) });
  assert.equal(rows[0].label, 'Sample Page');
  assert.equal(rows[0].children[0].label, 'Child page');
  rows[0].children[0].onSelect();
  assert.deepEqual(calls, [['navigation', 'pages']]);
  assert.deepEqual({ block, pages }, before);
  assert.equal(rows[0].blockId, undefined);
});
