import assert from 'node:assert/strict';
import test from 'node:test';
import ts from 'typescript';
import { runInNewContext } from 'node:vm';
import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import * as jsxRuntime from 'react/jsx-runtime';
import { renderToStaticMarkup } from 'react-dom/server';
import { loadProductionModule } from './production-module.mjs';
const load = path => loadProductionModule(new URL(path, import.meta.url));
const structure = await load('../app/studio/list-structure.ts');
const { setListItemBackgroundImage } = await load('../app/studio/list-item-background.ts');
const { ListField } = await load('../app/studio/blocks/editors/list.tsx');
const { ListItemInspector } = await load('../app/studio/blocks/list-item-inspector.tsx');
const { ListToolbarControls, ListItemActions, ListItemSwitcher } = await load('../app/studio/blocks/list-toolbar.tsx');
const { BlockRenderer } = await load('../app/components/content.tsx');
const { listItemCapabilityProfile, capabilityProfileFor } = await load('../app/studio/blocks/capability-profiles.ts');
const list = (items, id = 'root', extra = {}) => ({ id, type: 'list', style: 'unordered', items, ...extra });
const lines = root => root.items.flatMap(item => [typeof item === 'string' ? item : item.text, ...(typeof item === 'string' ? [] : (item.children ?? []).flatMap(lines))]);
function buttons(node) { return Array.isArray(node) ? node.flatMap(buttons) : !node?.props ? [] : node.type === 'button' ? [node] : buttons(node.props.children); }
function action(node, label) { const button = buttons(node).find(value => value.props['aria-label'] === label); assert.ok(button, label); return button; }

// Exercise the production component's state transitions without mounting its portal.
const toolbarSource = readFileSync(new URL('../app/studio/blocks/list-toolbar.tsx', import.meta.url), 'utf8');
const toolbarTree = ts.createSourceFile('list-toolbar.tsx', toolbarSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const switcherFunctions = toolbarTree.statements.filter(node => ts.isFunctionDeclaration(node) && ['ListItemSwitcher'].includes(node.name?.text)).map(node => node.getText(toolbarTree).replace(/^export /, '')).join('\n');
const compiledSwitcher = ts.transpileModule(`${switcherFunctions}\nglobalThis.render = ListItemSwitcher;`, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
function switcherHarness(props) {
  let open = false, refIndex = 0;
  const focus = [0, 0], refs = focus.map((_, index) => ({ current: { focus: () => focus[index]++ } }));
  const scope = { exports: {}, require: () => jsxRuntime, useState: () => [open, value => { open = value; }], useRef: () => refs[refIndex++],
    StudioAnchoredMenu: 'menu-fixture', StudioHoverIcon: 'icon-fixture', preserveTextSelection() {} };
  runInNewContext(compiledSwitcher, scope);
  return { focus, render: () => { refIndex = 0; return scope.render(props); } };
}
function menu(node) { return Array.isArray(node) ? node.flatMap(menu) : !node?.props ? [] : node.type === 'menu-fixture' ? [node] : menu(node.props.children); }

test('the far-left List Item button directly selects its parent and only the parent toolbar has type controls', () => {
  const root = list(['One', 'Two']);
  const selection = { listId: root.id, itemIndex: 1 };
  let parentSelected = false;
  const harness = switcherHarness({ onSelectParent: () => { parentSelected = true; } });
  const parentButton = action(harness.render(), 'Select parent block: List');
  assert.equal(parentButton.props['aria-haspopup'], undefined);
  assert.equal(menu(harness.render()).length, 0);
  const props = { root, list: root, selection, writable: true, contextBlocks: [root], onChange: () => true };
  assert.equal(buttons(ListToolbarControls(props)).some(button => button.props['aria-label']?.startsWith('Convert to')), false);
  parentButton.props.onClick();
  assert.equal(parentSelected, true);
  assert.equal(menu(harness.render()).length, 0);
  const parentToolbar = ListToolbarControls({ ...props, selection: undefined });
  assert.equal(action(parentToolbar, 'Convert to unordered list').props['aria-pressed'], true);
  assert.equal(action(parentToolbar, 'Convert to ordered list').props['aria-pressed'], false);
});

test('the separate List Item switcher retains contextual transforms and returns focus on dismissal', () => {
  const harness = switcherHarness({ onSelectParent() {} });
  action(harness.render(), 'Change List Item block type or style').props.onClick();
  const options = menu(harness.render())[0];
  assert.equal(options.props['aria-label'], 'List Item transforms');
  assert.equal(buttons(options).some(button => button.props.role === 'menuitemradio'), false);
  options.props.onClose();
  assert.equal(menu(harness.render()).length, 0);
  assert.equal(harness.focus[0], 1);
  action(harness.render(), 'Change List Item block type or style').props.onClick();
  action(harness.render(), 'Change List Item block type or style').props.onClick();
  assert.equal(menu(harness.render()).length, 0);
  assert.equal(harness.focus[0], 2);
});

test('range indentation appends the entire range in order and returns its actual first item', () => {
  const source = list([{ text: 'Parent', children: [list(['Existing'], 'nested')] }, 'One', 'Two', 'After']);
  const moved = structure.indentListItems(source, 'root', 1, 2, () => 'new');
  assert.deepEqual(lines(moved.block), ['Parent', 'Existing', 'One', 'Two', 'After']);
  assert.equal(moved.listId, 'nested');
  assert.equal(moved.itemIndex, 1);
  assert.equal(source.items.length, 4);
});

test('outdenting a range preserves tail and later wrapper reading order', () => {
  const source = list([{ text: 'Parent', children: [list(['A', 'B', 'C', 'D'], 'nested'), list(['Later'], 'later')] }, 'After']);
  const moved = structure.outdentListItems(source, 'nested', 1, 2, [source]);
  assert.deepEqual(lines(moved.block), ['Parent', 'A', 'B', 'C', 'D', 'Later', 'After']);
  assert.deepEqual(moved.block.items[2].children.map(child => child.items), [['D'], ['Later']]);
  assert.deepEqual(source.items[0].children[0].items, ['A', 'B', 'C', 'D']);
});

test('new nested wrappers inherit appearance but never duplicate the source anchor', () => {
  const source = list(['Parent', 'One', 'Two'], 'root', { style: 'ordered', marker: 'I', start: 7, reversed: true, visualStyle: { anchor: 'root-link', backgroundColor: '#123456' } });
  const moved = structure.indentListItems(source, 'root', 1, 2, () => 'nested');
  const nested = moved.block.items[0].children[0];
  assert.equal(nested.start, 6);
  assert.equal(nested.reversed, true);
  assert.equal(nested.visualStyle.backgroundColor, '#123456');
  assert.equal(nested.visualStyle.anchor, undefined);
});

test('toolbar type buttons retain dormant ordered settings and root outdent stays disabled', () => {
  const source = list(['First', 'Second'], 'root', { style: 'ordered', start: 0, reversed: true, marker: 'a' });
  let changed;
  const toolbar = ListToolbarControls({ root: source, list: source, contextBlocks: [source], writable: true, onChange: value => { changed = value.block; return true; } });
  action(toolbar, 'Convert to unordered list').props.onClick();
  assert.equal(changed.style, 'unordered');
  assert.deepEqual([changed.start, changed.reversed, changed.marker], [0, true, 'a']);
  assert.equal(action(toolbar, 'Outdent list item').props.disabled, true);
});

test('item actions change one item, preserve sibling owners and clone nested IDs and anchors', () => {
  const source = list(['Before', { text: 'Selected', style: { anchor: 'item-anchor' }, children: [list(['Child'], 'child', { visualStyle: { anchor: 'child-anchor' } })] }, 'After']);
  let result;
  const previous = globalThis.requestAnimationFrame;
  globalThis.requestAnimationFrame = () => 0;
  try {
    const props = { root: source, selection: { listId: 'root', itemIndex: 1 }, writable: true, onChange: value => { result = value; return true; } };
    action(ListItemActions(props), 'Duplicate List Item').props.onClick();
    assert.deepEqual(lines(result.block), ['Before', 'Selected', 'Child', 'Selected', 'Child', 'After']);
    const copied = result.block.items[2];
    assert.equal(copied.style.anchor, undefined);
    assert.notEqual(copied.children[0].id, 'child');
    assert.equal(copied.children[0].visualStyle.anchor, undefined);
    action(ListItemActions(props), 'Remove List Item').props.onClick();
    assert.deepEqual(result.block.items, ['Before', 'After']);
    action(ListItemActions(props), 'Move List Item up').props.onClick();
    assert.deepEqual(lines(result.block), ['Selected', 'Child', 'Before', 'After']);
  } finally { if (previous) globalThis.requestAnimationFrame = previous; else delete globalThis.requestAnimationFrame; }
  assert.deepEqual(lines(source), ['Before', 'Selected', 'Child', 'After']);
});

test('editor uses semantic lists and empty List Items retain their complete inspector', () => {
  const root = list([{ text: '', children: [list(['Child'], 'nested', { style: 'ordered', start: 4 })] }]);
  const html = renderToStaticMarkup(createElement(ListField, { block: root, rootBlocks: [root], writable: true, mediaUrls: {}, onChange() {}, labelForBlock: () => 'List' }));
  assert.match(html, /<ul role="list"/);
  assert.match(html, /<li[^>]*class="list-field-row"/);
  assert.match(html, /<ol role="list"[^>]*start="4"/);
  for (const source of [root, list([])]) {
    const pane = renderToStaticMarkup(createElement(ListItemInspector, { block: source, listId: source.id, itemIndex: 0, onChange() {} }));
    assert.match(pane, /List Item/);
    assert.match(pane, /Background/);
    assert.match(pane, /Border/);
  }
  const switcher = renderToStaticMarkup(createElement(ListItemSwitcher, { onSelectParent() {} }));
  assert.match(switcher, /Select parent block: List/);
  assert.doesNotMatch(switcher, /menuitemradio|Convert to|List options/);
  assert.match(switcher, /Change List Item block type or style/);
});

test('background images target captured item owners and reject reordering or stale content', () => {
  const root = list(['First', { text: 'Second', runs: [{ text: 'Second', marks: ['bold'] }] }]);
  const target = { listId: 'root', itemIndex: 1, baseline: JSON.stringify(root.items) };
  const changed = setListItemBackgroundImage(root, target, 'media');
  assert.equal(changed.items[0], 'First');
  assert.equal(changed.items[1].style.backgroundImageMediaId, 'media');
  assert.deepEqual(changed.items[1].runs, root.items[1].runs);
  assert.equal(setListItemBackgroundImage(list(root.items.toReversed()), target, 'media'), null);
  assert.equal(setListItemBackgroundImage(list(['First', 'Edited']), target, 'media'), null);
  assert.equal(setListItemBackgroundImage(root, { ...target, itemIndex: 2 }, 'media'), null);
  assert.equal(setListItemBackgroundImage(list([]), { ...target, itemIndex: 0, baseline: '[]' }, 'media').items[0].style.backgroundImageMediaId, 'media');
});

test('item background images and shadows share Edit and Preview presentation', () => {
  const root = list([{ text: 'Styled', style: { backgroundImageMediaId: 'media', shadow: 'soft' } }, 'Unchanged']);
  const mediaUrls = { media: 'https://example.test/image.png' };
  const edit = renderToStaticMarkup(createElement(ListField, { block: root, rootBlocks: [root], writable: true, mediaUrls, onChange() {}, labelForBlock: () => 'List' }));
  const preview = renderToStaticMarkup(createElement(BlockRenderer, { blocks: [root], variant: 'studio', mediaUrls }));
  assert.match(edit, /background-image:url/);
  assert.match(preview, /background-image:url/);
  assert.match(edit, /box-shadow:/);
  assert.match(preview, /box-shadow:/);
  for (const profile of [capabilityProfileFor('list'), listItemCapabilityProfile]) {
    assert.ok(profile.controls.some(control => control.id === 'shadow'));
    assert.ok(profile.controls.some(control => control.fields.includes('backgroundImageMediaId')));
  }
});

for (const ownership of [{ editorial: { note: 'Keep wrapper' } }, { visualStyle: { anchor: 'owned' } }, { editorial: { lock: { remove: true } } }]) test(`outdent refuses to discard an authored child wrapper ${JSON.stringify(ownership)}`, () => {
  const root = list([{ text: 'Parent', children: [list(['One', 'Two'], 'child', ownership)] }]);
  assert.equal(structure.outdentListItems(root, 'child', 0, 1, [root]), null);
});

const { scheduleBlockCommandFocus } = await load('../app/studio/block-command-focus.ts');
const { editBlockSiblings } = await load('../app/studio/block-sibling-operations.ts');
const { findBlockById } = await import('../app/studio/studio-command-operations.mjs');
const source = readFileSync(new URL('../app/studio/studio-canvas.tsx', import.meta.url), 'utf8');
const tree = ts.createSourceFile('canvas.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let renderControls;
function findRenderControls(node) { if (ts.isFunctionDeclaration(node) && node.name?.text === 'renderBlockControls') renderControls = node; ts.forEachChild(node, findRenderControls); }
findRenderControls(tree);
const compiledControls = ts.transpileModule(`${renderControls.getText(tree)};globalThis.render = renderBlockControls;`, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
function controlsFixture(selection, writable = true, presentation) {
  const root = list(['One', 'Two']);
  const scope = { exports: {}, require: () => jsxRuntime, activeDocument: { id: 'document', blocks: [root] }, findBlockById,
    selectedBlockId: 'root', activeListItems: { root: selection }, validListItemSelection: structure.validListItemSelection, listTextRange: null, parentOfNestedBlock: () => null,
    presentation, writable, blockDrag: { handleProps: () => ({}), start() {} }, transformMenuBlockId: null, BlockTransformControl: 'transform-fixture', StudioHoverIcon: 'icon-fixture',
    ListToolbarControls, ListItemSwitcher, ListItemActions, richTextMenuBlockId: null, textMarkState: () => false, formatSelectedText() {}, finishBlockDrag() {}, blockLabel: () => 'List', canMove: () => true, isBlockAlignedBlock: () => true, isEditableTextBlock: () => false,
    isEditableRichTextBlock: () => true, preserveTextSelection() {}, blockMenuItems: () => [], blockMenuBlockId: null,
    hasMultiSelection: false, htmlEditorTriggerRef: { current: null }, linkEditor: null, htmlEditor: null };
  runInNewContext(compiledControls, scope);
  return { scope, toolbar: scope.render(root)?.props.children[0] };
}
for (const selection of [undefined, { listId: 'root', itemIndex: 2 }, { listId: 'removed-nested', itemIndex: 0 }]) test(`the actual parent List toolbar retains List commands after stale item selection ${JSON.stringify(selection)}`, () => {
  const { toolbar } = controlsFixture(selection);
  function expandedButtons(node) {
    if (Array.isArray(node)) return Array.from(node).flatMap(expandedButtons);
    if (!node?.props) return [];
    if (node.type === ListToolbarControls) return expandedButtons(node.type(node.props));
    return node.type === 'button' ? [node] : expandedButtons(node.props.children);
  }
  const labels = expandedButtons(toolbar).map(button => button.props['aria-label']);
  assert.deepEqual(labels, ['Drag to reorder List block', 'Move block up', 'Move block down', 'Convert to unordered list', 'Convert to ordered list', 'Outdent list item', 'More block options']);
});
for (const writable of [true, false]) test(`actual selected List Item formatting retains accessible writable=${writable} controls`, () => {
  const { toolbar } = controlsFixture({ listId: 'root', itemIndex: 0 }, writable);
  for (const label of ['Bold selected text', 'Italicise selected text', 'More text formatting', 'Add or edit hyperlink']) {
    assert.equal(action(toolbar, label).props.disabled, !writable, label);
  }
  assert.equal(buttons(toolbar).some(button => button.props['aria-label'] === 'Text alignment'), false);
});
test('presentation-owned List controls are not duplicated by the canvas', () => {
  const { toolbar } = controlsFixture({ listId: 'root', itemIndex: 0 }, true, { ownsBlockControls: () => true });
  assert.equal(toolbar, undefined);
});

let selectListParent;
function findParentSelect(node) { if (ts.isFunctionDeclaration(node) && node.name?.text === 'selectListParent') selectListParent = node; ts.forEachChild(node, findParentSelect); }
findParentSelect(tree);
const compiledParentSelect = ts.transpileModule(`${selectListParent.getText(tree)};globalThis.select = selectListParent;`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
for (const owner of ['root', 'nested', 'missing']) test(`Select List returns focus to its ${owner} boundary without selecting child text`, () => {
  let focus = 0, canvasFocus = 0, selected, closed = false;
  const frame = { hasAttribute: () => owner === 'root', focus: () => focus++ };
  const scope = { selectBlockBoundary: id => { selected = id; }, setTransformMenuBlockId: value => { closed = value === null; },
    CSS: { escape: value => value }, canvasScrollRef: { current: { querySelector: () => owner === 'missing' ? null : frame, focus: () => canvasFocus++ } } };
  runInNewContext(compiledParentSelect, scope);
  scope.select('list');
  assert.equal(selected, 'list');
  assert.equal(closed, true);
  assert.equal(focus, owner === 'missing' ? 0 : 1);
  assert.equal(canvasFocus, owner === 'missing' ? 1 : 0);
  assert.equal(frame.tabIndex, owner === 'nested' ? -1 : undefined);
});
let changeList;
function findChange(node) { if (ts.isVariableDeclaration(node) && node.name.getText(tree) === 'changeList') changeList = node.initializer; ts.forEachChild(node, findChange); }
findChange(tree);
const compiledChange = ts.transpileModule(`globalThis.change = (${changeList.getText(tree)});`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
for (const mode of ['accepted', 'different-document', 'changed-source', 'readonly', 'later-input']) test(`actual Canvas List toolbar focus ${mode}`, () => {
  const root = list(['One', 'Two']), next = list(['One', 'Two', 'Three']);
  const original = { id: 'document', blocks: [root] };
  const candidate = { isConnected: true, dataset: { studioBlockId: 'root', listItemIndex: '2' }, classList: { contains: () => true } };
  const listeners = new Map(), document = { addEventListener: (name, handler) => listeners.set(name, handler), removeEventListener: name => listeners.delete(name) };
  const owner = { isConnected: true, getAttribute: () => 'document', querySelectorAll: () => [candidate] };
  const editor = { ownerDocument: document, closest: () => owner };
  const calls = [], currentDocumentRef = { current: original }, writableRef = { current: true };
  const scope = { block: root, listRoot: root, itemSelection: { listId: 'root', itemIndex: 1 }, activeDocument: original, currentDocumentRef, writableRef,
    editBlockSiblings, findBlockById, canvasScrollRef: { current: { querySelector: () => editor } }, CSS: { escape: value => value },
    applyBlockList: blocks => { currentDocumentRef.current = { ...original, blocks }; return true; },
    setActiveListItems() {}, onSelectBlock() {}, onSelectListItem() {}, scheduleBlockCommandFocus, focusRichTextEditorAtOffset: target => calls.push(target), document,
  };
  runInNewContext(compiledChange, scope);
  const previous = globalThis.requestAnimationFrame; let deferred;
  globalThis.requestAnimationFrame = callback => { deferred = callback; };
  try {
    assert.equal(scope.change({ block: next, listId: 'root', itemIndex: 2 }, 0), true);
    if (mode === 'different-document') currentDocumentRef.current = { id: 'another', blocks: [next] };
    if (mode === 'changed-source') currentDocumentRef.current = original;
    if (mode === 'readonly') writableRef.current = false;
    if (mode === 'later-input') listeners.get('pointerdown')({});
    deferred();
    assert.equal(calls.length, mode === 'accepted' ? 1 : 0);
    if (calls[0]) assert.equal(calls[0], candidate);
  } finally { globalThis.requestAnimationFrame = previous; }
});
