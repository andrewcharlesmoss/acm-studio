import assert from 'node:assert/strict';
import { readStudioSource } from "./studio-module-source.mjs";
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import { loadProductionModule } from './production-module.mjs';
import { commitHistory, undoHistory, redoHistory } from '../app/studio/studio-command-operations.mjs';
const load = path => loadProductionModule(new URL(path, import.meta.url));
const { mergeListItemBoundary } = await load('../app/studio/list-boundary.ts');
const { scheduleBlockCommandFocus } = await load('../app/studio/block-command-focus.ts');
const { useStudioBlockCommands: createBlockCommands } = await load('../app/studio/use-studio-block-commands.ts');
const structure = await load('../app/studio/list-structure.ts');
const rich = await load('../app/content/rich-text.ts');
const { footnoteReferenceRun } = await load('../app/content/footnote-runs.ts');
const { listItemText } = await load('../app/content/model.ts');
const { validContentBlocks } = await load('../app/studio/workspace-validation.ts');
const list = (items, id = 'root', extra = {}) => ({ id, type: 'list', style: 'unordered', items, ...extra });
const item = (text, children, extra = {}) => ({ text, ...(children ? { children } : {}), ...extra });
function textLines(root) { return root.items.flatMap(value => [typeof value === 'string' ? value : value.text, ...(typeof value === 'string' ? [] : (value.children ?? []).flatMap(textLines))]); }
function depthLines(root, depth = 0) { return root.items.flatMap(value => [{ text: typeof value === 'string' ? value : value.text, depth }, ...(typeof value === 'string' ? [] : (value.children ?? []).flatMap(child => depthLines(child, depth + 1)))]); }
function merged(source, id, index, direction, context = [source]) {
  const before = structuredClone(source), next = mergeListItemBoundary(source, id, index, direction, context);
  assert.deepEqual(source, before, 'source stays immutable');
  if (next) assert.equal(validContentBlocks([next.block]), true);
  return next;
}

for (const direction of ['backward', 'forward']) test(`trailing descendant receives a following ancestor sibling ${direction}`, () => {
  const source = list([item('1', [list(['a'], 'a-list')]), item('2', [list(['b'], 'b-list')])]);
  const next = merged(source, direction === 'backward' ? 'root' : 'a-list', direction === 'backward' ? 1 : 0, direction);
  assert.deepEqual(depthLines(next.block), [{ text: '1', depth: 0 }, { text: 'a2', depth: 1 }, { text: 'b', depth: 1 }]);
  assert.deepEqual(next.block.items[0].children.map(child => child.id), ['a-list', 'b-list']);
  assert.deepEqual({ id: next.listId, index: next.itemIndex, offset: next.offset }, { id: 'a-list', index: 0, offset: 1 });
});
for (const direction of ['backward', 'forward']) test(`parent merges its first child before its next sibling ${direction}`, () => {
  const grandchild = list(['grandchild'], 'grandchild', { style: 'ordered', marker: 'I', start: 4, reversed: true, visualStyle: { backgroundColor: '#ffee00' }, editorial: { note: 'Keep grandchild owner' } });
  const source = list([item('parent', [list([item('child', [grandchild]), 'following child'], 'child-list')]), 'next parent']);
  const next = merged(source, direction === 'backward' ? 'child-list' : 'root', 0, direction);
  assert.deepEqual(depthLines(next.block), [{ text: 'parentchild', depth: 0 }, { text: 'grandchild', depth: 1 }, { text: 'following child', depth: 1 }, { text: 'next parent', depth: 0 }]);
  assert.deepEqual(next.block.items[0].children[0], grandchild);
  assert.equal(next.block.items[0].children[1].id, 'child-list');
  assert.equal(next.offset, 6);
});

test('three-level Backspace selects the deepest preceding descendant', () => {
  const source = list([item('one', [list([item('two', [list(['three'], 'deep')])], 'middle')]), 'four']);
  const next = merged(source, 'root', 1, 'backward');
  assert.deepEqual(textLines(next.block), ['one', 'two', 'threefour']);
  assert.equal(next.listId, 'deep');
});
for (const direction of ['backward', 'forward']) test(`multiple child wrappers follow reading order ${direction}`, () => {
  const source = list([item('parent', [list([item('first', [list(['deep'], 'deep')])], 'first'), list(['second', 'tail'], 'second')]), 'root tail']);
  const next = merged(source, direction === 'backward' ? 'second' : 'deep', 0, direction);
  assert.deepEqual(textLines(next.block), ['parent', 'first', 'deepsecond', 'tail', 'root tail']);
  assert.equal(next.block.items[0].children[1].id, 'second');
});

test('direct sibling merge transfers child wrappers intact and keeps survivor appearance', () => {
  const child = list(['nested'], 'child', { marker: undefined, visualStyle: { backgroundColor: '#ffee00' } });
  const source = list([item('first', undefined, { style: { textColor: '#123456' } }), item('second', [child])]);
  const next = merged(source, 'root', 1, 'backward');
  assert.deepEqual(next.block.items[0].children, [child]);
  assert.deepEqual(next.block.items[0].style, { textColor: '#123456' });
  assert.equal(next.block.items[0].text, 'firstsecond');
});

test('virtual nested item merges into its parent and removes only its empty wrapper', () => {
  const source = list([item('parent', [list([], 'virtual')]), 'next']);
  const next = merged(source, 'virtual', 0, 'backward');
  assert.deepEqual(next.block.items, ['parent', 'next']);
});

for (const extra of [{ editorial: { note: 'Private note' } }, { editorial: { name: 'Named list' } }, { editorial: { lock: { remove: true } } }, { editorial: { lock: { move: true } } }, { visualStyle: { anchor: 'nested-anchor' } }]) test(`empty wrapper with authored ownership is not discarded ${JSON.stringify(extra)}`, () => {
  const source = list([item('parent', [list(['child'], 'child', extra)])]);
  assert.equal(merged(source, 'child', 0, 'backward'), null);
});

test('a retained annotated wrapper stays on its remaining sibling items', () => {
  const child = list(['first child', 'second child'], 'child', { editorial: { note: 'Keep' }, visualStyle: { anchor: 'child' }, start: 8 });
  const source = list([item('parent', [child])]);
  const next = merged(source, 'child', 0, 'backward');
  assert.equal(next.block.items[0].children[0].editorial.note, 'Keep');
  assert.equal(next.block.items[0].children[0].visualStyle.anchor, 'child');
  assert.deepEqual(next.block.items[0].children[0].items, ['second child']);
});

test('moving a locked promoted descendant is refused', () => {
  const source = list([item('parent', [list([item('child', [list(['grandchild'], 'locked', { editorial: { lock: { move: true } } })]), 'after'], 'child')])]);
  assert.equal(merged(source, 'child', 0, 'backward'), null);
});

test('hidden child boundaries are neither skipped nor consumed', () => {
  const source = list([item('parent', [list(['hidden'], 'hidden', { editorial: { hidden: true } })]), 'after']);
  assert.equal(merged(source, 'root', 0, 'forward'), null);
  assert.equal(merged(source, 'root', 1, 'backward'), null);
});

test('a unique removed-item anchor transfers; conflicting anchors refuse', () => {
  const source = list(['first', item('second', undefined, { style: { anchor: 'second' } })]);
  assert.equal(merged(source, 'root', 1, 'backward').block.items[0].style.anchor, 'second');
  source.items[0] = item('first', undefined, { style: { anchor: 'first' } });
  assert.equal(merged(source, 'root', 1, 'backward'), null);
});

test('marks and atoms survive once, with the caret at the old survivor boundary', () => {
  const atoms = [{ text: '\uFFFC', inline: { type: 'math', latex: 'x', alternativeText: '' } }, { text: '\uFFFC', inline: { type: 'image', mediaId: 'image', alt: '' } }];
  const source = list([item('a', undefined, { runs: [{ text: 'a', marks: ['bold'] }] }), item('\uFFFC\uFFFC', undefined, { runs: atoms })]);
  const next = merged(source, 'root', 1, 'backward');
  assert.equal(next.block.items[0].text, 'a\uFFFC\uFFFC');
  assert.deepEqual(next.block.items[0].runs[0].marks, ['bold']);
  assert.equal(next.block.items[0].runs.filter(run => run.inline).length, 2);
  assert.equal(next.offset, 1);
});

test('typed Footnote reference and companion retain exactly one owner through command history', () => {
  const runs = [{ text: 'second' }, footnoteReferenceRun('note')];
  const root = list(['first', item(rich.plainTextFromRuns(runs), undefined, { runs })]);
  const notes = { id: 'notes', type: 'footnotes', notes: [{ id: 'note', text: 'Keep this note' }] };
  let document = { id: 'doc', kind: 'post', title: 'Fixture', blocks: [root, notes] };
  const commands = createBlockCommands({ activeDocument: document, updateActiveDocument(update) { document = update(document); } });
  const next = merged(root, root.id, 1, 'backward', document.blocks);
  commands.updateBlock(root.id, () => next.block);
  assert.deepEqual(document.blocks[1], notes);
  assert.equal(document.blocks[0].items[0].runs.filter(run => run.inline?.type === 'footnote').length, 1);
});

for (const mark of [{ type: 'footnote', id: 'note' }, { type: 'inline-image', src: 'https://example.com/image.png', alt: '' }, { type: 'math', latex: 'x', alternativeText: '' }]) {
  for (const position of [0, 1]) test(`zero-text legacy ${mark.type} object at ${position} refuses a lossy merge`, () => {
    const emptyObject = item('', undefined, { runs: [{ text: '', marks: [mark] }] });
    const root = list(position ? ['first', emptyObject] : [emptyObject, 'second']);
    const blocks = [root, ...(mark.type === 'footnote' ? [{ id: 'notes', type: 'footnotes', notes: [{ id: 'note', text: 'Keep this note' }] }] : [])];
    assert.equal(validContentBlocks(blocks), true);
    let document = { id: 'doc', kind: 'post', title: 'Fixture', blocks };
    let writes = 0;
    const commands = createBlockCommands({ activeDocument: document, updateActiveDocument(update) { const next = update(document); if (next !== document) writes++; document = next; } });
    const next = merged(root, root.id, 1, 'backward', blocks);
    assert.equal(next, null);
    if (next) commands.updateBlock(root.id, () => next.block);
    assert.equal(writes, 0);
    assert.deepEqual(document.blocks, blocks);
  });
}

test('document context, invalid indices and outer boundaries are not fabricated', () => {
  const source = list(['one', 'two']);
  for (const [id, index, direction] of [['root', 0, 'backward'], ['root', 1, 'forward'], ['missing', 0, 'forward'], ['root', 0.5, 'forward'], ['root', -1, 'forward'], ['root', 9, 'forward']]) assert.equal(merged(source, id, index, direction), null);
  assert.equal(merged(source, 'root', 1, 'backward', [list(['changed', 'two'])]), null);
});

test('production command commits a boundary merge as one undoable operation', () => {
  const root = list([item('1', [list(['a'], 'a')]), '2']);
  const document = { id: 'doc', kind: 'post', title: 'Fixture', blocks: [root] };
  let history = { workspace: document, history: [], future: [] };
  const commands = createBlockCommands({ activeDocument: document, updateActiveDocument(update) { const next = update(history.workspace); if (next !== history.workspace) history = { ...commitHistory(history.workspace, history.history), workspace: next }; } });
  const next = merged(root, 'root', 1, 'backward');
  commands.updateBlock(root.id, () => next.block);
  assert.equal(history.history.length, 1);
  assert.deepEqual(textLines(history.workspace.blocks[0]), ['1', 'a2']);
  history = undoHistory(history.workspace, history.history, history.future);
  assert.deepEqual(history.workspace, document);
  history = redoHistory(history.workspace, history.history, history.future);
  assert.deepEqual(history.workspace.blocks[0], next.block);
});

const canvas = readStudioSource("app/studio/studio-canvas.tsx");
const tree = ts.createSourceFile('canvas.tsx', canvas, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let field, handler;
function find(node) { if (ts.isFunctionDeclaration(node) && node.name?.text === 'ListField') field = node; ts.forEachChild(node, find); }
find(tree);
function findHandler(node) { if (ts.isJsxAttribute(node) && node.name.text === 'onKeyDown') handler = node.initializer.expression; ts.forEachChild(node, findHandler); }
findHandler(field);
assert.ok(handler);
const compiled = ts.transpileModule(`globalThis.handle = (${handler.getText(tree)});`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
let sourceGuard;
function findSourceGuard(node) {
  if (ts.isJsxAttribute(node) && node.name.text === 'onChange' && node.initializer?.expression?.getText(tree).includes('onUpdateBlock(block.id, current => !requireSourceMatch')) sourceGuard = node.initializer.expression;
  ts.forEachChild(node, findSourceGuard);
}
findSourceGuard(tree);
assert.ok(sourceGuard);
const compiledSourceGuard = ts.transpileModule(`globalThis.change = (${sourceGuard.getText(tree)});`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
test('actual owner update refuses a deferred stale List merge without history', () => {
  const root = list(['first', 'second']);
  const original = { id: 'doc', kind: 'post', title: 'Fixture', blocks: [root] };
  let document = original, pending, writes = 0;
  const commands = createBlockCommands({ activeDocument: original, updateActiveDocument(update) { pending = update; } });
  const scope = { block: root, onUpdateBlock: commands.updateBlock };
  runInNewContext(compiledSourceGuard, scope);
  const next = merged(root, root.id, 1, 'backward');
  scope.change(next.block, true);
  document = { ...original, blocks: [list(['newer first', 'second'])] };
  const updated = pending(document);
  if (updated !== document) writes++;
  assert.equal(updated, document);
  assert.equal(writes, 0);
  assert.deepEqual(updated.blocks[0].items, ['newer first', 'second']);
});

test('actual Column and Columns callbacks retain source protection through the owner', () => {
  const callbacks = [];
  function collect(node) {
    if (ts.isJsxAttribute(node) && node.name.text === 'onChange') {
      const expression = node.initializer?.expression;
      if (expression && /candidate.id === (?:column|child).id/.test(expression.getText(tree))) callbacks.push(expression);
    }
    ts.forEachChild(node, collect);
  }
  collect(tree);
  const columnCallback = callbacks.find(node => node.getText(tree).includes('candidate.id === child.id ? next : candidate'));
  const columnsCallback = callbacks.find(node => node.getText(tree).includes('candidate.id === column.id'));
  assert.ok(columnCallback); assert.ok(columnsCallback);
  const root = list(['first', 'second']);
  const column = { id: 'column', type: 'column', children: [root] };
  const columns = { id: 'columns', type: 'columns', children: [column] };
  const original = { id: 'doc', kind: 'post', title: 'Fixture', blocks: [columns] };
  let pending;
  const commands = createBlockCommands({ activeDocument: original, updateActiveDocument(update) { pending = update; } });
  const ownerScope = { block: columns, onUpdateBlock: commands.updateBlock };
  runInNewContext(compiledSourceGuard, ownerScope);
  const columnsScope = { block: columns, column, onChange: ownerScope.change };
  const columnScope = { block: column, child: root, onChange: undefined };
  const compile = node => ts.transpileModule(`globalThis.change = (${node.getText(tree)});`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  runInNewContext(compile(columnsCallback), columnsScope);
  columnScope.onChange = columnsScope.change;
  runInNewContext(compile(columnCallback), columnScope);
  const next = merged(root, root.id, 1, 'backward', original.blocks);
  columnScope.change(next.block, true);
  const fresh = { ...original, blocks: [{ ...columns, children: [{ ...column, children: [list(['newer first', 'second'])] }] }] };
  assert.equal(pending(fresh), fresh);
  assert.deepEqual(pending(original).blocks[0].children[0].children[0].items, ['firstsecond']);
});

test('actual Library source guard refuses stale replacement and separates structural history', async () => {
  const source = await readFile(new URL('../app/studio/ui/blocks/block-specimen-catalogue.tsx', import.meta.url), 'utf8');
  const syntax = ts.createSourceFile('specimen.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const definitions = []; let update, change;
  function collect(node) {
    if (ts.isFunctionDeclaration(node) && ['allBlocks', 'replaceBlock'].includes(node.name?.text)) definitions.push(node.getText(syntax));
    if (ts.isVariableDeclaration(node) && node.name.getText(syntax) === 'updateBlock') update = node.initializer.arguments[0];
    if (ts.isJsxAttribute(node) && node.name.text === 'onChange' && node.initializer?.expression?.getText(syntax).includes('updateBlock(next, !requireSourceMatch')) change = node.initializer.expression;
    ts.forEachChild(node, collect);
  }
  collect(syntax); assert.ok(update); assert.ok(change);
  const { childContentBlocks } = await load('../app/content/block-tree.ts');
  const { editBlockSiblings } = await load('../app/studio/block-sibling-operations.ts');
  const root = list(['first', 'second']);
  const next = merged(root, root.id, 1, 'backward');
  const fresh = list(['newer first', 'second']);
  const dataRef = { current: { blocks: [fresh], document: { id: 'doc', blocks: [fresh] } } };
  const calls = [];
  const scope = { block: root, dataRef, childContentBlocks, editBlockSiblings, publish: (...args) => calls.push(args) };
  const compiled = ts.transpileModule(`${definitions.join('\n')}\nconst updateBlock = (${update.getText(syntax)}); globalThis.change = (${change.getText(syntax)});`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  runInNewContext(compiled, scope);
  scope.change(next.block, true);
  assert.equal(calls.length, 0);
  assert.equal(dataRef.current.blocks[0], fresh);
  dataRef.current = { blocks: [root], document: { id: 'doc', blocks: [root] } };
  scope.change(next.block, true);
  assert.equal(calls.length, 1);
  assert.equal(calls[0][1], undefined, 'boundary merge starts a distinct history entry');
});

for (const path of ['mini-golf-presentation.tsx']) test(`actual ${path} adapter supplies authored context and refuses stale merges`, async () => {
  const source = await readFile(new URL(`../app/studio/${path}`, import.meta.url), 'utf8');
  const syntax = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const callbacks = [], contexts = [];
  function collect(node) {
    if (ts.isJsxAttribute(node)) {
      const expression = node.initializer?.expression;
      if (node.name.text === 'onChange' && expression?.getText(syntax).includes('requireSourceMatch')) callbacks.push(expression);
      if (node.name.text === 'rootBlocks') contexts.push(expression);
    }
    ts.forEachChild(node, collect);
  }
  collect(syntax);
  assert.equal(callbacks.length, 1);
  const { templateEditorBlocks } = await load('../app/studio/template-model.ts');
  const node = list(['first', 'second']);
  const root = templateEditorBlocks([node])[0];
  const document = { id: 'doc', kind: 'post', title: 'Fixture', blocks: [root] };
  const next = merged(root, root.id, 1, 'backward', document.blocks);
  for (const callback of callbacks) {
    let pending;
    const commands = createBlockCommands({ activeDocument: document, updateActiveDocument(update) { pending = update; } });
    const scope = { commands, currentBlock: root, block: root, node, templateEditorBlocks, editingProjection: document, context: { document, onUpdateBlock: commands.updateBlock } };
    const compiled = ts.transpileModule(`globalThis.change = (${callback.getText(syntax)});`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
    runInNewContext(compiled, scope);
    scope.change(next.block, true);
    const fresh = { ...document, blocks: [list(['newer first', 'second'])] };
    assert.equal(pending(fresh), fresh);
    assert.deepEqual(pending(document).blocks[0].items, ['firstsecond']);
  }
  for (const context of contexts) {
    const scope = { editingProjection: document, context: { document } };
    runInNewContext(`globalThis.blocks = (${context.getText(syntax)});`, scope);
    assert.equal(scope.blocks, document.blocks);
  }
});
function handlerFixture(root, listId, index, { writable = true, accepted = true, collapsed = true, offset = 0 } = {}) {
  const current = structure.findListBlock(root, listId), items = current.items.length ? current.items : [''];
  const calls = [], focus = [], editor = { contains: () => true };
  const scope = { block: root, rootBlocks: [root], list: current, item: items[index], children: typeof items[index] === 'string' ? [] : items[index].children ?? [], items, index, writable,
    currentRef: { current: { block: root, writable } }, listRef: { current: {} }, window: { getSelection: () => ({ isCollapsed: collapsed, anchorNode: {}, anchorOffset: offset }) }, editorTextOffset: () => offset,
    ...structure, listItemText, mergeListItemBoundary, onChange: (next, requireSourceMatch) => { calls.push(next); scope.requiredSourceMatch = requireSourceMatch; if (accepted) scope.currentRef.current.block = next; },
    scheduleBlockCommandFocus: (_editor, target) => focus.push(target), focusRichTextEditorAtOffset: () => {},
  };
  runInNewContext(compiled, scope);
  return { scope, calls, focus, run(key, extra = {}) { let prevented = false; scope.handle({ key, currentTarget: editor, nativeEvent: {}, preventDefault() { prevented = true; }, ...extra }); return prevented; } };
}

test('actual Backspace handler merges first nested item rather than outdenting', () => {
  const source = list([item('parent', [list(['child', 'next'], 'child')])]);
  const fixture = handlerFixture(source, 'child', 0);
  assert.equal(fixture.run('Backspace'), true);
  assert.deepEqual(textLines(fixture.calls[0]), ['parentchild', 'next']);
  assert.equal(fixture.focus[0].blockId, 'root');
  assert.equal(fixture.focus[0].listItemIndex, 0);
  assert.equal(fixture.focus[0].isAccepted(), true);
  assert.equal(fixture.scope.requiredSourceMatch, true);
});

test('actual Delete handler chooses the first child before the next root sibling', () => {
  const source = list([item('parent', [list(['child', 'next'], 'child')]), 'later']);
  const fixture = handlerFixture(source, 'root', 0, { offset: 6 });
  assert.equal(fixture.run('Delete'), true);
  assert.deepEqual(textLines(fixture.calls[0]), ['parentchild', 'next', 'later']);
});

test('refused or deferred boundary updates do not grant focus', () => {
  const source = list(['first', 'second']);
  const deferred = handlerFixture(source, 'root', 1, { accepted: false });
  assert.equal(deferred.run('Backspace'), true);
  assert.equal(deferred.focus[0].isAccepted(), false);
  const locked = list([item('parent', [list(['child'], 'child', { editorial: { lock: { remove: true } } })])]);
  const refused = handlerFixture(locked, 'child', 0);
  assert.equal(refused.run('Backspace'), true);
  assert.equal(refused.calls.length, 0);
  assert.equal(refused.focus.length, 0);
});

for (const options of [{ writable: false }, { collapsed: false }, { offset: 1 }]) test(`ordinary native editing stays with its owner ${JSON.stringify(options)}`, () => {
  const fixture = handlerFixture(list(['first', 'second']), 'root', 1, options);
  fixture.run('Backspace');
  assert.equal(fixture.calls.length, 0);
  assert.equal(fixture.focus.length, 0);
});
for (const event of [{ defaultPrevented: true }, { nativeEvent: { isComposing: true } }, { altKey: true }, { shiftKey: true }, { metaKey: true }]) test(`actual boundary handler preserves another key owner ${JSON.stringify(event)}`, () => {
  const fixture = handlerFixture(list(['first', 'second']), 'root', 1);
  fixture.run('Backspace', event);
  assert.equal(fixture.calls.length, 0);
});

test('accepted List focus resolves exactly the requested item, within its owner', () => {
  const candidates = [0, 1, 2].map(index => ({ isConnected: true, dataset: { studioBlockId: 'list', listItemIndex: String(index) }, classList: { contains: name => name === 'list-item-editor' } }));
  const document = { addEventListener() {}, removeEventListener() {} };
  const owner = { isConnected: true, getAttribute: () => 'doc', querySelectorAll: () => candidates };
  const source = { ownerDocument: document, closest: () => owner };
  const previous = globalThis.requestAnimationFrame; let callback, focused;
  globalThis.requestAnimationFrame = handle => { callback = handle; };
  try { scheduleBlockCommandFocus(source, { blockId: 'list', listItemIndex: 1, isAccepted: () => true }, document, target => { focused = target; }); callback(); assert.equal(focused, candidates[1]); }
  finally { if (previous === undefined) delete globalThis.requestAnimationFrame; else globalThis.requestAnimationFrame = previous; }
});
