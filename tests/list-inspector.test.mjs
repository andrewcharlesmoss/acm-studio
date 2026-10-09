import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import { createElement } from 'react';
import * as jsxRuntime from 'react/jsx-runtime';
import { renderToStaticMarkup } from 'react-dom/server';
import { loadProductionModule } from './production-module.mjs';

const load = path => loadProductionModule(new URL(path, import.meta.url));
const { BlockInspector } = await load('../app/studio/blocks/inspectors/block-inspector.tsx');
const { appendInspectorListItem } = await load('../app/studio/blocks/list-content-inspector.tsx');
const { focusInspectorListItem, ListInspectorCanvasContext } = await load('../app/studio/list-inspector-navigation.tsx');
const { validListItemSelection, findListBlock } = await load('../app/studio/list-structure.ts');
const list = (items = ['First', 'Second'], extra = {}) => ({ id: 'root', type: 'list', style: 'unordered', items, ...extra });
const props = block => ({ block, onChange() {}, onOpenFiles() {}, canOpenFiles: false, fontSizeModeScope: 'test', fontSizeViewModes: {}, onFontSizeViewModeChange() {} });
const render = block => renderToStaticMarkup(createElement(ListInspectorCanvasContext.Provider, { value: { current: null } }, createElement(BlockInspector, props(block))));

test('parent List has three accessible tabs, initially Content, with settings and styles in separate panels', () => {
  const html = render(list(undefined, { style: 'ordered' }));
  assert.match(html, /An organised collection of items displayed in a specific order\./);
  assert.equal((html.match(/role="tab"/g) ?? []).length, 3);
  assert.match(html, /role="tablist" aria-label="List inspector"/);
  const panels = [...html.matchAll(/<div[^>]*role="tabpanel"[^>]*>([\s\S]*?)(?=<div[^>]*role="tabpanel"|$)/g)];
  assert.equal(panels.length, 3);
  assert.doesNotMatch(panels[0][0].split('>')[0], /hidden/);
  assert.match(panels[0][1], /Select List Item 1/);
  assert.match(panels[0][1], /Select List Item 2/);
  assert.match(panels[0][1], /Add List Item/);
  assert.doesNotMatch(panels[0][1], /Start value|Typography/);
  assert.match(panels[1][0].split('>')[0], /hidden/);
  assert.match(panels[1][1], /List style|Start value|Reverse order/);
  assert.match(panels[1][1], /Advanced/);
  assert.match(panels[1][1], /aria-expanded="false"[^>]*><span>Advanced/);
  assert.doesNotMatch(panels[1][1], /Typography/);
  assert.match(panels[2][0].split('>')[0], /hidden/);
  for (const section of ['Typography', 'Background', 'Dimensions', 'Border', 'Elements']) assert.match(panels[2][1], new RegExp(section));
  assert.doesNotMatch(panels[2][1], /Start value|Advanced/);
});

test('bulleted Lists hide dormant numbering settings and item selection retains the item inspector', () => {
  const root = list(undefined, { marker: 'I', start: -2, reversed: true });
  assert.doesNotMatch(render(root), /Start value|Reverse order|List style/);
  const html = renderToStaticMarkup(createElement(BlockInspector, { ...props(root), selectedListItem: { blockId: 'root', listId: 'root', itemIndex: 1 } }));
  assert.match(html, /<h2>List Item<\/h2>/);
  assert.doesNotMatch(html, /aria-label="List inspector"/);
});

test('adding an item preserves existing rich text, nesting, numbering, appearance and the immutable source', () => {
  const root = list([{ text: 'First', runs: [{ text: 'First', marks: [{ type: 'bold' }] }], children: [list(['Child'], { id: 'child' })] }], { marker: 'a', start: 0, reversed: true, visualStyle: { color: '#123456' } });
  const before = structuredClone(root);
  const next = appendInspectorListItem(root);
  assert.deepEqual(root, before);
  assert.notEqual(next.items, root.items);
  assert.equal(next.items[0], root.items[0]);
  assert.deepEqual(next, { ...root, items: [...root.items, ''] });
  assert.deepEqual(appendInspectorListItem(list([])).items, ['', '']);
});

test('Undo or replacement of the selected item returns to the parent List pane', () => {
  for (const [listId, itemIndex] of [['root', 2], ['removed-child', 0], ['root', -1]]) {
    const html = renderToStaticMarkup(createElement(BlockInspector, { ...props(list()), selectedListItem: { blockId: 'root', listId, itemIndex } }));
    assert.match(html, /aria-label="List inspector"/);
    assert.match(html, /<h2>List<\/h2>/);
  }
});

test('selection validation preserves virtual and nested items but never clamps removed items onto a sibling', () => {
  const root = list([{ text: 'Parent', children: [list([], { id: 'nested' })] }, 'Second']);
  for (const selection of [{ listId: 'root', itemIndex: 1 }, { listId: 'nested', itemIndex: 0 }]) assert.equal(validListItemSelection(root, selection), selection);
  for (const selection of [undefined, { listId: 'missing', itemIndex: 0 }, { listId: 'root', itemIndex: 2 }, { listId: 'root', itemIndex: -1 }, { listId: 'root', itemIndex: 0.5 }, { listId: 'nested', itemIndex: 1 }]) assert.equal(validListItemSelection(root, selection), undefined);
});

const canvasSource = readFileSync(new URL('../app/studio/studio-canvas.tsx', import.meta.url), 'utf8');
const canvasTree = ts.createSourceFile('studio-canvas.tsx', canvasSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let activeListContext;
function findContext(node) { if (ts.isFunctionDeclaration(node) && node.name?.text === 'activeListContext') activeListContext = node; ts.forEachChild(node, findContext); }
findContext(canvasTree);
const compiledContext = ts.transpileModule(`${activeListContext.getText(canvasTree)};globalThis.resolve = activeListContext;`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
test('the actual Canvas formatting context refuses an item removed by Undo', () => {
  const scope = { activeListItems: { root: { listId: 'root', itemIndex: 2 } }, quoteCitationTargets: {}, validListItemSelection, findListBlock };
  runInNewContext(compiledContext, scope);
  assert.equal(scope.resolve(list()), undefined);
  scope.activeListItems.root = { listId: 'removed-nested', itemIndex: 0 };
  assert.equal(scope.resolve(list()), undefined);
  scope.activeListItems.root = { listId: 'root', itemIndex: 1 };
  assert.deepEqual(JSON.parse(JSON.stringify(scope.resolve(list()))), { listId: 'root', itemIndex: 1 });
});

function editor(listId, itemIndex, writable = true) {
  return { isConnected: true, dataset: { listContextId: listId, listItemIndex: String(itemIndex) }, getAttribute: () => writable ? 'true' : 'false', focused: 0, focus() { this.focused++; } };
}
function canvas(...editors) { return { isConnected: true, querySelectorAll: () => editors }; }

test('item navigation is limited to the supplied editor, exact list and index, and writable connected fields', () => {
  const first = editor('root', 0), nested = editor('nested', 0), second = editor('root', 1);
  const scope = canvas(first, nested, second);
  assert.equal(focusInspectorListItem(scope, 'root', 1), true);
  assert.deepEqual([first.focused, nested.focused, second.focused], [0, 0, 1]);
  assert.equal(focusInspectorListItem(scope, 'nested', 0), true);
  assert.equal(focusInspectorListItem(scope, 'missing', 0), false);
  for (const index of [-1, 0.5, NaN]) assert.equal(focusInspectorListItem(scope, 'root', index), false);
  assert.equal(focusInspectorListItem(null, 'root', 0), false);
  assert.equal(focusInspectorListItem({ ...scope, isConnected: false }, 'root', 0), false);
  assert.equal(focusInspectorListItem(canvas(editor('root', 0, false)), 'root', 0), false);
  assert.equal(focusInspectorListItem(canvas({ ...first, isConnected: false }), 'root', 0), false);
});

const source = readFileSync(new URL('../app/studio/blocks/list-content-inspector.tsx', import.meta.url), 'utf8');
const tree = ts.createSourceFile('list-content-inspector.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const component = tree.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'ListContentInspector').getText(tree).replace(/^export /, '');
const compiled = ts.transpileModule(`${component}\nglobalThis.render = ListContentInspector;`, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
function buttons(node) { return Array.isArray(node) ? node.flatMap(buttons) : !node?.props ? [] : node.type === 'button' ? [node] : buttons(node.props.children); }
function harness(initial, accept) {
  let block = initial, pending = null, effects = [];
  const target = editor('root', 2), ref = { current: null }, owner = { current: canvas(target) };
  const scope = { exports: {}, require: () => jsxRuntime, ListInspectorCanvasContext, AcmIcon: 'icon', appendInspectorListItem, focusInspectorListItem,
    useContext: () => owner, useState: () => [pending, value => { pending = value; }], useRef: () => ref, useLayoutEffect: callback => effects.push(callback) };
  runInNewContext(compiled, scope);
  return { target, setBlock: value => { block = value; }, render: () => {
    effects = [];
    const node = scope.render({ block, onChange: next => { if (accept) block = next; } });
    effects.forEach(callback => callback());
    return node;
  } };
}

test('the real add handler focuses only the accepted new item once', () => {
  const h = harness(list(), true);
  buttons(h.render()).find(button => button.props['aria-label'] === 'Add List Item').props.onClick();
  h.render();
  assert.equal(h.target.focused, 1);
  h.render();
  assert.equal(h.target.focused, 1);
});

test('rejected or superseded adds never focus a later item with the same index', () => {
  for (const replacement of [list(['First', 'Second', '']), list(['First', 'Second', 'Changed']), list(['First', 'Second', ''], { id: 'other' })]) {
    const h = harness(list(), false);
    buttons(h.render()).find(button => button.props['aria-label'] === 'Add List Item').props.onClick();
    h.render();
    h.setBlock(replacement);
    h.render();
    assert.equal(h.target.focused, 0);
  }
});
