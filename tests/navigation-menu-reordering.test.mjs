import { evaluateProductionModule } from "./production-module.mjs";
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import test from 'node:test';

import { dragControl } from './drag-placement-harness.mjs';

function load(path, require, context = {}) {
  const exports = {};
  evaluateProductionModule((readFileSync(new URL(path, import.meta.url), 'utf8')), { exports, require, ...context });
  return exports;
}
const items = load('../app/studio/navigation-items.ts');
function harness({ writable = true, reject = false } = {}) {
  const changes = [], selections = [], policies = [], frames = [];
  const document = { activeElement: {}, body: {}, querySelector: () => null };
  const links = [{ id: 'a', label: 'Home', url: '/', children: [{ id: 'child-a', label: 'Child A', url: '/a' }, { id: 'child-b', label: 'Child B', url: '/b' }] }, { id: 'b', label: 'About', url: '/about' }, { id: 'c', label: 'Contact', url: '/contact' }];
  const jsx = (type, props) => typeof type === 'function' ? type(props) : ({ type, props });
  const react = { useRef: current => ({ current }), useState: value => [typeof value === 'function' ? value() : value, () => {}], useId: () => 'id', useLayoutEffect() {} };
  const { NavigationMenuList } = load('../app/studio/template-navigation-editor.tsx', name => {
    if (name === 'react') return react;
    if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx };
    if (name === './navigation-items') return items;
    if (name === './use-gap-reordering') return { useGapReordering: policy => { policies.push(policy); return { listProps: { 'data-owner': policy.ids.join(',') }, rowProps: id => ({ 'data-gap-row': id }), handleProps: () => ({ 'data-shared-handle': true }), start() {}, cancel() {}, line: null }; } };
    return new Proxy({}, { get: (_target, property) => property === 'templateId' ? () => 'new' : () => null });
  }, { document, requestAnimationFrame: fn => frames.push(fn) });
  const tree = NavigationMenuList({ links, selectedId: null, writable, suggestions: [], onChange: next => { changes.push(next); return !reject; }, onSelect: id => selections.push(id) });
  const nodes = [];
  function walk(node) { if (!node) return; if (Array.isArray(node)) return node.forEach(walk); nodes.push(node); walk(node.props?.children); }
  walk(tree);
  return { links, changes, selections, policies, nodes, document, frames, button: label => nodes.find(node => node.type === 'button' && node.props['aria-label'] === label) };
}
const order = links => Array.from(links, link => link.id);
test('menu rows expose named drag and move controls with sibling boundaries', () => {
  const h = harness();
  assert.equal(h.button('Drag Home').props['data-shared-handle'], true);
  assert.equal(h.button('Drag Home').props.draggable, true);
  assert.equal(h.button('Move Home up').props.disabled, true);
  assert.equal(h.button('Move Contact down').props.disabled, true);
  assert.equal(h.button('Move Child A up').props.disabled, true);
  assert.equal(h.button('Move Child B down').props.disabled, true);
  assert.equal(h.policies.length, 2);
  assert.deepEqual(Array.from(h.policies[1].ids), ['child-a', 'child-b']);
});
test('visible move buttons reorder canonical links with submenus and retain the button focus path', () => {
  const h = harness();
  h.button('Move Home down').props.onClick({ currentTarget: {} });
  assert.deepEqual(order(h.changes[0]), ['b', 'a', 'c']);
  assert.equal(h.changes[0][1], h.links[0]);
  assert.deepEqual(h.selections, []);
  h.button('Move Child B up').props.onClick({ currentTarget: {} });
  assert.deepEqual(order(h.changes[1][0].children), ['child-b', 'child-a']);
  assert.deepEqual(order(h.changes[1]), ['a', 'b', 'c']);
});
test('read-only and boundary callbacks make no changes, and rejected moves do not select', () => {
  for (const label of ['Move Home up', 'Move Contact down']) { const h = harness(); h.button(label).props.onClick({ currentTarget: {} }); assert.equal(h.changes.length, 0); }
  const h = harness({ writable: false });
  for (const node of h.nodes.filter(node => node.type === 'button' && /^(Drag|Move) /.test(node.props['aria-label'] ?? ''))) assert.equal(node.props.disabled, true);
  h.button('Move Home down').props.onClick({ currentTarget: {} }); assert.equal(h.changes.length, 0);
  const rejected = harness({ reject: true }); rejected.button('Move Home down').props.onClick({ currentTarget: {} }); assert.equal(rejected.selections.length, 0);
});
test('menu adapter accepts only effective sibling placements without changing the edited selection', () => {
  const h = harness(), policy = h.policies[0];
  assert.equal(policy.accepts({ id: 'a', targetId: 'b', edge: 'before' }), false);
  assert.equal(policy.accepts({ id: 'a', targetId: 'child-b', edge: 'after' }), false);
  assert.equal(policy.onMove({ id: 'a', targetId: 'child-b', edge: 'after' }), false);
  assert.equal(h.changes.length, 0);
  assert.equal(policy.onMove({ id: 'a', targetId: 'c', edge: 'after' }), true);
  assert.deepEqual(order(h.changes[0]), ['b', 'c', 'a']); assert.deepEqual(h.selections, []);
  const rejected = harness({ reject: true }); assert.equal(rejected.policies[0].onMove({ id: 'a', targetId: 'c', edge: 'after' }), false); assert.equal(rejected.selections.length, 0);
});
test('menu policy inherits pointer threshold, end placement, cancellation and stale-source rejection', () => {
  const h = harness(), policy = h.policies[0];
  const drag = dragControl({ policy });
  let ui = drag.render(); ui.handleProps('a').onPointerDown(drag.pointer(30));
  ui.handleProps('a').onPointerMove(drag.pointer(34)); ui.handleProps('a').onPointerUp(drag.pointer(34)); assert.equal(h.changes.length, 0);
  ui = drag.render(); ui.handleProps('a').onPointerDown(drag.pointer(30)); ui.handleProps('a').onPointerMove(drag.pointer(190));
  assert.ok(drag.render().line); ui.handleProps('a').onPointerUp(drag.pointer(190)); assert.deepEqual(order(h.changes[0]), ['b', 'c', 'a']);
  ui = drag.render(); ui.handleProps('a').onPointerDown(drag.pointer(30)); ui.handleProps('a').onPointerMove(drag.pointer(190)); ui.cancel(); ui.handleProps('a').onPointerUp(drag.pointer(190)); assert.equal(h.changes.length, 1);
  ui = drag.render(); ui.handleProps('a').onPointerDown(drag.pointer(30)); ui.handleProps('a').onPointerMove(drag.pointer(190)); drag.setVersion('foreign menu'); ui = drag.render(); ui.handleProps('a').onPointerUp(drag.pointer(190)); assert.equal(h.changes.length, 1);
});

test('focused boundary moves restore focus to the enabled opposite arrow without stealing focus', () => {
  const h = harness(); let focused = 0;
  const button = { isConnected: true, closest: () => ({ querySelector: () => ({ focus() { focused++; } }) }) };
  h.document.activeElement = button;
  h.button('Move About down').props.onClick({ currentTarget: button });
  assert.equal(h.frames.length, 1);
  h.document.activeElement = h.document.body;
  h.frames.shift()(); assert.equal(focused, 1);
  h.document.activeElement = button;
  h.button('Move About up').props.onClick({ currentTarget: button });
  h.document.activeElement = {}; h.frames.shift()(); assert.equal(focused, 1);
  h.button('Move About down').props.onClick({ currentTarget: button }); assert.equal(h.frames.length, 0);
  const rejected = harness({ reject: true }); rejected.document.activeElement = button;
  rejected.button('Move About down').props.onClick({ currentTarget: button }); assert.equal(rejected.frames.length, 0);
  const readonly = harness({ writable: false }); readonly.document.activeElement = button;
  readonly.button('Move About down').props.onClick({ currentTarget: button }); assert.equal(readonly.frames.length, 0);
});
