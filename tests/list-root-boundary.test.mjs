import assert from 'node:assert/strict';
import { readStudioSource } from "./studio-module-source.mjs";
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import { loadProductionModule } from './production-module.mjs';
import { commitHistory, undoHistory, redoHistory } from '../app/studio/studio-command-operations.mjs';
const load = path => loadProductionModule(new URL(path, import.meta.url));
const { useStudioBlockCommands: createBlockCommands } = await load('../app/studio/use-studio-block-commands.ts');
const { blockCommandFocusId } = await load('../app/studio/block-command-focus.ts');
const { listItemText } = await load('../app/content/model.ts');
const list = (items, id = 'root', extra = {}) => ({ id, type: 'list', style: 'unordered', items, ...extra });
function fixture(blocks) {
  const original = { id: 'doc', kind: 'post', title: 'Fixture', blocks };
  let state = { workspace: original, history: [], future: [] };
  const command = createBlockCommands({ activeDocument: original, updateActiveDocument(update) {
    const next = update(state.workspace);
    if (next !== state.workspace) state = { ...commitHistory(state.workspace, state.history), workspace: next };
  } });
  return { command, original, state: () => state, blocks: () => state.workspace.blocks };
}

test('first populated root Backspace extracts rich text before the retained List', () => {
  const runs = [{ text: 'First', marks: ['bold'] }];
  const source = list([{ text: 'First', runs, style: { textColor: '#112233', anchor: 'first' } }, 'Second'], 'root', { editorial: { note: 'Retain list owner' }, visualStyle: { anchor: 'list' } });
  const h = fixture([source]);
  const target = h.command.exitList(source.id, 0, 'backward');
  assert.equal(blockCommandFocusId(target), h.blocks()[0].id);
  assert.deepEqual(h.blocks()[0].runs, runs);
  assert.equal(h.blocks()[0].style.anchor, 'first');
  assert.equal(h.blocks()[1].id, source.id);
  assert.deepEqual(h.blocks()[1].items, ['Second']);
  assert.deepEqual(h.blocks()[1].editorial, source.editorial);
  assert.equal(h.blocks()[1].visualStyle.anchor, 'list');
  assert.equal(source.items.length, 2, 'immutable source');
  assert.equal(h.state().history.length, 1);
  const undone = undoHistory(h.state().workspace, h.state().history, h.state().future);
  assert.deepEqual(undone.workspace, h.original);
  assert.deepEqual(redoHistory(undone.workspace, undone.history, undone.future).workspace, h.state().workspace);
});

test('empty first root promotes all plain child items without a Paragraph', () => {
  const grandchild = list(['Grandchild'], 'grandchild');
  const source = list([{ text: '', children: [list([{ text: 'Child', children: [grandchild] }, 'Other child'], 'child'), list(['Last child'], 'child-two')] }, 'Tail']);
  const h = fixture([source]);
  const target = h.command.exitList(source.id, 0, 'backward');
  assert.equal(target.listItemIndex, 0);
  assert.equal(blockCommandFocusId(target), source.id);
  assert.equal(h.blocks().length, 1);
  assert.deepEqual(h.blocks()[0].items, [{ text: 'Child', children: [grandchild] }, 'Other child', 'Last child', 'Tail']);
  assert.equal(h.blocks()[0].type, 'list');
  assert.equal(h.state().history.length, 1);
});

for (const items of [[], ['']]) test(`sole ${items.length ? 'stored' : 'virtual'} empty root is removed on Backspace`, () => {
  const h = fixture([list(items, 'root', { visualStyle: { anchor: 'empty' } })]);
  assert.ok(h.command.exitList('root', 0, 'backward'));
  assert.deepEqual(h.blocks(), []);
  assert.equal(h.state().history.length, 1);
});

test('empty first line with a following root item inserts an empty Paragraph', () => {
  const h = fixture([list(['', 'Tail'])]);
  assert.ok(h.command.exitList('root', 0, 'backward'));
  assert.equal(h.blocks()[0].type, 'paragraph');
  assert.equal(h.blocks()[0].text, '');
  assert.deepEqual(h.blocks()[1].items, ['Tail']);
});

test('Return retains its existing empty Paragraph conversion', () => {
  const h = fixture([list([''])]);
  assert.equal(blockCommandFocusId(h.command.exitList('root', 0)), 'root');
  assert.equal(h.blocks()[0].type, 'paragraph');
});

for (const lock of [{ remove: true }, { remove: true, move: true }]) test(`locked first-root removal refuses ${JSON.stringify(lock)}`, () => {
  const h = fixture([list([''], 'root', { editorial: { lock } })]);
  assert.equal(h.command.exitList('root', 0, 'backward'), null);
  assert.equal(h.blocks(), h.original.blocks);
  assert.equal(h.state().history.length, 0);
});

for (const extra of [{ editorial: { note: 'Keep' } }, { visualStyle: { anchor: 'child' } }, { editorial: { hidden: true } }]) test(`annotated child wrapper is not discarded ${JSON.stringify(extra)}`, () => {
  const source = list([{ text: '', children: [list(['Kept'], 'child', extra)] }]);
  const h = fixture([source]);
  assert.ok(h.command.exitList('root', 0, 'backward'));
  assert.deepEqual(h.blocks(), [source.items[0].children[0]]);
});

for (const extra of [{ editorial: { note: 'Keep' } }, { editorial: { name: 'Named' } }, { siteRole: 'players' }]) test(`sole empty authored owner survives as Paragraph ${JSON.stringify(extra)}`, () => {
  const h = fixture([list([''], 'root', extra)]);
  assert.equal(blockCommandFocusId(h.command.exitList('root', 0, 'backward')), 'root');
  assert.equal(h.blocks()[0].type, 'paragraph');
  for (const [key, value] of Object.entries(extra)) assert.deepEqual(h.blocks()[0][key], value);
});

for (const parent of [
  { id: 'group', type: 'group', layout: 'flow', children: [] },
  { id: 'column', type: 'column', children: [] },
  { id: 'quote', type: 'quote', text: '', children: [] },
]) test(`extraction uses ${parent.type}'s actual sibling list`, () => {
  const owner = { ...parent, children: [list(['First', 'Tail'])] };
  const h = fixture([parent.type === 'column' ? { id: 'columns', type: 'columns', children: [owner] } : owner]);
  assert.ok(h.command.exitList('root', 0, 'backward'));
  const children = parent.type === 'column' ? h.blocks()[0].children[0].children : h.blocks()[0].children;
  assert.deepEqual(children.map(block => block.type), ['paragraph', 'list']);
  assert.equal(children[0].text, 'First');
});

test('list-only parent permits promotion but rejects Paragraph extraction', () => {
  const parent = { id: 'group', type: 'group', layout: 'flow', allowedBlocks: ['list'] };
  const denied = fixture([{ ...parent, children: [list(['First', 'Tail'])] }]);
  assert.equal(denied.command.exitList('root', 0, 'backward'), null);
  assert.equal(denied.state().history.length, 0);
  const permitted = fixture([{ ...parent, children: [list([{ text: '', children: [list(['Child'], 'child')] }, 'Tail'])] }]);
  assert.ok(permitted.command.exitList('root', 0, 'backward'));
  assert.deepEqual(permitted.blocks()[0].children[0].items, ['Child', 'Tail']);
});

test('empty removal returns the deepest preceding line and its end offset', () => {
  const prior = list([{ text: 'Parent', children: [list(['Deep'], 'deep')] }], 'previous');
  const h = fixture([prior, list([''])]);
  const target = h.command.exitList('root', 0, 'backward');
  assert.equal(target.blockId, 'deep');
  assert.equal(target.listItemIndex, 0);
  assert.equal(target.offset, 4);
});

for (const stale of [false, true]) test(`deferred ${stale ? 'stale' : 'current'} owner guards mutation and focus`, () => {
  const original = { id: 'doc', kind: 'post', title: 'Fixture', blocks: [list(['First', 'Tail'])] };
  let pending;
  const command = createBlockCommands({ activeDocument: original, updateActiveDocument: update => { pending = update; } });
  const target = command.exitList('root', 0, 'backward');
  assert.equal(blockCommandFocusId(target), null);
  const current = stale ? { ...original, blocks: [list(['Changed', 'Tail'])] } : structuredClone(original);
  const next = pending(current);
  assert.equal(Boolean(blockCommandFocusId(target)), !stale);
  if (stale) assert.equal(next, current);
  else assert.equal(next.blocks[0].type, 'paragraph');
});

test('typed Footnote, Image and Math survive first-item extraction once', () => {
  const runs = [{ text: '\uFFFC', inline: { type: 'footnote', id: 'note' } }, { text: '\uFFFC', inline: { type: 'image', mediaId: 'image', alt: '' } }, { text: '\uFFFC', inline: { type: 'math', latex: 'x', alternativeText: '' } }];
  const notes = { id: 'notes', type: 'footnotes', notes: [{ id: 'note', text: 'Keep' }] };
  const source = list([{ text: '\uFFFC\uFFFC\uFFFC', runs }, 'Tail']);
  const h = fixture([source, notes]);
  assert.ok(h.command.exitList('root', 0, 'backward'));
  assert.deepEqual(h.blocks()[0].runs, runs);
  assert.deepEqual(h.blocks()[2], notes);
});

const canvas = readStudioSource("app/studio/studio-canvas.tsx");
const tree = ts.createSourceFile('canvas.tsx', canvas, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let field, handler;
function find(node) { if (ts.isFunctionDeclaration(node) && node.name?.text === 'ListField') field = node; ts.forEachChild(node, find); }
find(tree);
function inside(node) { if (ts.isJsxAttribute(node) && node.name.text === 'onKeyDown') handler = node.initializer.expression; ts.forEachChild(node, inside); }
inside(field);
const compiled = ts.transpileModule(`globalThis.handle = (${handler.getText(tree)});`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
for (const [writable, composing, offset] of [[true, false, 0], [false, false, 0], [true, true, 0], [true, false, 2]]) test(`actual first-root handler writable=${writable}, composing=${composing}, offset=${offset}`, () => {
  const calls = [], focuses = [], source = list(['First', 'Tail']);
  const editor = { contains: () => true };
  const target = { blockId: 'target', offset: 3, isAccepted: () => true };
  const scope = { writable, list: source, block: source, index: 0, item: source.items[0], listItemText,
    window: { getSelection: () => ({ isCollapsed: true, anchorNode: {}, anchorOffset: offset }) }, editorTextOffset: () => offset,
    onExitList: (...args) => { calls.push(args); return target; },
    listRef: { current: {} }, scheduleBlockCommandFocus: (_editor, actual, _scope, focus) => { assert.equal(actual, target); focus(editor); },
    focusRichTextEditorAtOffset: (_target, caret) => focuses.push(caret),
  };
  runInNewContext(compiled, scope);
  let prevented = false;
  scope.handle({ key: 'Backspace', currentTarget: editor, nativeEvent: { isComposing: composing }, preventDefault: () => { prevented = true; } });
  const handled = writable && !composing && offset === 0;
  assert.deepEqual(calls, handled ? [['root', 0, 'backward']] : []);
  assert.equal(prevented, handled);
  assert.deepEqual(focuses, handled ? [3] : []);
});

for (const file of ['template-editor.tsx', 'studio-prototype.tsx', 'mini-golf-site-editor.tsx']) test(`${file} forwards the root boundary operation`, async () => {
  const source = await readFile(new URL(`../app/studio/${file}`, import.meta.url), 'utf8');
  const syntax = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const callbacks = [];
  function collect(node) {
    if ((ts.isJsxAttribute(node) || ts.isPropertyAssignment(node)) && node.name.getText(syntax) === 'onExitList') callbacks.push(ts.isJsxAttribute(node) ? node.initializer.expression : node.initializer);
    ts.forEachChild(node, collect);
  }
  collect(syntax); assert.ok(callbacks.length);
  for (const callback of callbacks) {
    const calls = [], commands = { exitList: (...args) => calls.push(args) };
    const scope = { commands, blockCommands: commands, writable: true };
    runInNewContext(ts.transpileModule(`globalThis.exit = (${callback.getText(syntax)});`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, scope);
    scope.exit('root', 0, 'backward');
    assert.deepEqual(calls, [['root', 0, 'backward', undefined]]);
    scope.exit('root', 0, 'forward', 'child');
    assert.deepEqual(calls[1], ['root', 0, 'forward', 'child']);
    if (file === 'template-editor.tsx') { scope.writable = false; scope.exit('root', 0, 'backward'); assert.equal(calls.length, 2); }
  }
});

test('empty removal focuses the preceding container’s last visible rich line', () => {
  const prior = { id: 'group', type: 'group', layout: 'flow', children: [{ id: 'previous', type: 'paragraph', text: 'Previous' }, list(['Hidden'], 'hidden', { editorial: { hidden: true } })] };
  const h = fixture([prior, list([''])]);
  const target = h.command.exitList('root', 0, 'backward');
  assert.equal(target.blockId, 'previous');
  assert.equal(target.offset, 8);
});

test('empty removal skips a hidden preceding owner and focuses a following List', () => {
  const h = fixture([list(['Hidden'], 'hidden', { editorial: { hidden: true } }), list(['']), list(['Visible'], 'following')]);
  const target = h.command.exitList('root', 0, 'backward');
  assert.equal(target.blockId, 'following');
  assert.equal(target.listItemIndex, 0);
});

for (const prior of [
  { id: 'notes', type: 'footnotes', notes: [] },
  { id: 'cover', type: 'cover-image', alt: '' },
  { id: 'embed', type: 'embed', url: 'https://example.com', title: 'Embed', caption: 'Caption' },
]) test(`empty removal skips ${prior.type} without an unconditional rich editor`, () => {
  const h = fixture([prior, list(['']), { id: 'next', type: 'paragraph', text: 'Next' }]);
  const target = h.command.exitList('root', 0, 'backward');
  assert.ok(target, 'the complete proposal remains reader-valid');
  assert.equal(target.blockId, 'next');
  assert.equal(target.offset, 0);
  assert.deepEqual(h.blocks(), [prior, { id: 'next', type: 'paragraph', text: 'Next' }]);
});

test('promotion retains hidden child owners and focuses the first visible child', () => {
  const hidden = list(['Hidden'], 'hidden', { editorial: { hidden: true } });
  const visible = list(['Visible'], 'visible');
  const h = fixture([list([{ text: '', children: [hidden, visible] }, 'Tail'])]);
  const target = h.command.exitList('root', 0, 'backward');
  assert.equal(target.blockId, 'visible');
  assert.deepEqual(h.blocks()[0], hidden);
  assert.deepEqual(h.blocks()[1], visible);
  assert.equal(h.blocks()[2].id, 'root');
});

test('Mini Golf presentation fallback executes the same owner-gated List command', async () => {
  const source = await readFile(new URL('../app/studio/mini-golf-presentation.tsx', import.meta.url), 'utf8');
  const syntax = ts.createSourceFile('mini-golf.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let callback;
  function collect(node) { if (ts.isJsxAttribute(node) && node.name.text === 'onExitList') callback = node.initializer.expression; ts.forEachChild(node, collect); }
  collect(syntax); assert.ok(callback);
  const h = fixture([list(['First', 'Tail'])]);
  const scope = { context: { writable: true, onExitList: h.command.exitList } };
  runInNewContext(ts.transpileModule(`globalThis.exit = (${callback.getText(syntax)});`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, scope);
  assert.ok(scope.exit('root', 0, 'backward'));
  assert.equal(h.blocks()[0].type, 'paragraph');
  scope.context.writable = false;
  assert.equal(scope.exit('root', 0, 'backward'), null);
  assert.equal(h.state().history.length, 1);
  const nested = fixture([list([{ text: 'Parent', children: [list(['Deep'], 'child')] }]), { id: 'next', type: 'paragraph', text: 'Following' }]);
  scope.context = { writable: true, onExitList: nested.command.exitList };
  const focus = scope.exit('root', 0, 'forward', 'child');
  assert.equal(focus.blockId, 'child');
  assert.equal(nested.blocks()[0].items[1], 'Following');
  scope.context.writable = false;
  assert.equal(scope.exit('root', 0, 'forward', 'child'), null);
  assert.equal(nested.state().history.length, 1);
});

test('the canonical edit presentation supplies the List command', () => {
  let context;
  function collect(node) {
    if (ts.isCallExpression(node) && node.expression.getText(tree) === 'presentation?.renderBlock' && node.arguments[0]?.getText(tree).includes('mode: "edit"')) context = node.arguments[0];
    ts.forEachChild(node, collect);
  }
  collect(tree); assert.ok(context);
  assert.ok(context.properties.some(property => property.name?.getText(tree) === 'onExitList'));
});

test('Library command refusal creates no history entry', async () => {
  const source = await readFile(new URL('../app/studio/ui/blocks/block-specimen-catalogue.tsx', import.meta.url), 'utf8');
  const syntax = ts.createSourceFile('specimen.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let callback;
  function collect(node) {
    if (ts.isCallExpression(node) && node.expression.getText(syntax) === 'useStudioBlockCommands') callback = node.arguments[0].properties.find(property => property.name?.getText(syntax) === 'updateActiveDocument').initializer;
    ts.forEachChild(node, collect);
  }
  collect(syntax); assert.ok(callback);
  const published = [], blocks = [list([''], 'root', { editorial: { lock: { remove: true } } })];
  const scope = { dataRef: { current: { document: { id: 'doc', kind: 'post', title: 'Fixture', blocks }, blocks } }, publish: next => published.push(next) };
  runInNewContext(ts.transpileModule(`globalThis.update = (${callback.getText(syntax)});`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, scope);
  const command = createBlockCommands({ activeDocument: scope.dataRef.current.document, updateActiveDocument: scope.update });
  assert.equal(command.exitList('root', 0, 'backward'), null);
  assert.equal(published.length, 0);
});

test('Library history listener is reattached to the remounted Reset Example owner', async () => {
  const source = await readFile(new URL('../app/studio/ui/blocks/block-specimen-catalogue.tsx', import.meta.url), 'utf8');
  const syntax = ts.createSourceFile('specimen.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let effect;
  function collect(node) {
    if (ts.isCallExpression(node) && node.expression.getText(syntax) === 'useEffect' && node.arguments[0]?.getText(syntax).includes('handleStudioHistoryShortcut')) effect = node;
    ts.forEachChild(node, collect);
  }
  collect(syntax); assert.ok(effect);
  assert.deepEqual(effect.arguments[1].elements.map(element => element.getText(syntax)), ['redo', 'undo', 'resetRevision']);
  const listeners = new Map(), calls = [];
  const owner = id => ({ addEventListener: (name, callback) => listeners.set(id, { name, callback }), removeEventListener: () => listeners.delete(id) });
  const scope = { specimenRef: { current: owner('old') }, navigator: { platform: 'MacIntel' }, undo: () => {}, redo: () => {}, handleStudioHistoryShortcut: (...args) => calls.push(args) };
  runInNewContext(ts.transpileModule(`globalThis.attach = (${effect.arguments[0].getText(syntax)});`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, scope);
  const detach = scope.attach();
  detach(); scope.specimenRef.current = owner('reset'); scope.attach();
  assert.equal(listeners.has('old'), false);
  listeners.get('reset').callback({ key: 'z' });
  assert.equal(calls.length, 1);
});
