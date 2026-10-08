import assert from 'node:assert/strict';
import test from 'node:test';
import ts from 'typescript';
import { runInNewContext } from 'node:vm';
import { readFileSync } from 'node:fs';
import { createElement } from 'react';
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
