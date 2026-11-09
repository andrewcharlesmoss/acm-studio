import assert from 'node:assert/strict';
import test from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { loadProductionModule } from './production-module.mjs';
const { selectedBlockPath, BlockSelectionBreadcrumbs } = await loadProductionModule(new URL('../app/studio/block-selection-breadcrumbs.tsx', import.meta.url));
const blocks = [{ id: 'outer', type: 'group', layout: 'flow', children: [{ id: 'row', type: 'group', layout: 'row', children: [{ id: 'title', type: 'paragraph', text: 'Title' }] }] }];
const descendants = node => Array.isArray(node) ? node.flatMap(descendants) : node?.props ? [node, ...descendants(node.props.children)] : [];

test('selection trail follows the real ancestor chain and omits stale or cleared selections', () => {
  assert.deepEqual(selectedBlockPath(blocks, 'title').map(block => block.id), ['outer', 'row', 'title']);
  assert.deepEqual(selectedBlockPath(blocks, null), []);
  assert.deepEqual(selectedBlockPath(blocks, 'removed-block'), []);
});

test('Template Part and Header context selects ancestors and root without mutating blocks', () => {
  const events = [];
  const before = structuredClone(blocks);
  const tree = BlockSelectionBreadcrumbs({ root: { label: 'Template Part', name: 'Header' }, blocks, selectedId: 'title', labelFor: block => block.id, onSelect: id => events.push(id), onSelectRoot: () => events.push('root') });
  const html = renderToStaticMarkup(tree);
  assert.match(html, /aria-label="Block selection path"/);
  assert.ok(html.indexOf('Template Part') < html.indexOf('Header'));
  const buttons = descendants(tree).filter(node => node.type === 'button');
  assert.deepEqual(buttons.map(button => button.props.children), ['Header', 'outer', 'row', 'title']);
  assert.equal(buttons.at(-1).props['aria-current'], 'location');
  buttons[0].props.onClick(); buttons[2].props.onClick();
  assert.deepEqual(events, ['root', 'row']);
  assert.deepEqual(blocks, before);
});
