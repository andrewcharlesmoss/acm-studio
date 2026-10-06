import assert from 'node:assert/strict';
import { readStudioSource } from "./studio-module-source.mjs";
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import { loadProductionModule } from './production-module.mjs';
import { commitHistory, undoHistory, redoHistory } from '../app/studio/studio-command-operations.mjs';
const load = path => loadProductionModule(new URL(path, import.meta.url));
const { useStudioBlockCommands: commands } = await load('../app/studio/use-studio-block-commands.ts');
const { listItemText } = await load('../app/content/model.ts');
const { blockCommandFocusId } = await load('../app/studio/block-command-focus.ts');
const list = (items, id = 'root', extra = {}) => ({ id, type: 'list', style: 'unordered', items, ...extra });
const paragraph = (text, extra = {}) => ({ id: 'next', type: 'paragraph', text, ...extra });
function fixture(blocks) {
  const original = { id: 'doc', kind: 'post', title: 'Fixture', blocks };
  let state = { workspace: original, history: [], future: [] };
  const command = commands({ activeDocument: original, updateActiveDocument(update) {
    const next = update(state.workspace);
    if (next !== state.workspace) state = { ...commitHistory(state.workspace, state.history), workspace: next };
  } });
  return { command, original, state: () => state, blocks: () => state.workspace.blocks };
}
for (const following of [paragraph('Following'), { ...paragraph('Heading'), type: 'heading', level: 2 }, list(['One', 'Two'], 'next', { style: 'ordered', start: 8, reversed: true })]) test(`final Delete appends ${following.type} as items without concatenating text`, () => {
  const h = fixture([list(['Before', 'End']), following]);
  const target = h.command.exitList('root', 1, 'forward');
  assert.equal(blockCommandFocusId(target), 'root');
  assert.equal(target.listItemIndex, 1); assert.equal(target.offset, 3);
  assert.deepEqual(h.blocks()[0].items, ['Before', 'End', ...(following.type === 'list' ? following.items : [following.text])]);
  assert.equal(h.blocks().length, 1); assert.equal(h.blocks()[0].style, 'unordered');
  assert.equal(h.state().history.length, 1);
  const undo = undoHistory(h.state().workspace, h.state().history, h.state().future);
  assert.deepEqual(undo.workspace, h.original);
  assert.deepEqual(redoHistory(undo.workspace, undo.history, undo.future).workspace, h.state().workspace);
});
test('deepest terminal nested item appends to outer root and retains original caret', () => {
  const child = list(['Deep'], 'child', { visualStyle: { anchor: 'deep', backgroundColor: '#ffee00' } });
  const source = list([{ text: 'Parent', children: [child] }]);
  const h = fixture([source, paragraph('External')]);
  const target = h.command.exitList('root', 0, 'forward', 'child');
  assert.equal(target.blockId, 'child'); assert.equal(target.listItemIndex, 0); assert.equal(target.offset, 4);
  assert.deepEqual(h.blocks()[0].items, [source.items[0], 'External']);
});
for (const [listId, index] of [['root', 0], ['missing', 0], ['root', 9], ['root', -1], ['root', 0.5]]) test(`non-terminal or invalid ${listId}/${index} refuses without history`, () => {
  const h = fixture([list(['First', 'Last']), paragraph('Next')]);
  assert.equal(h.command.exitList('root', index, 'forward', listId), null);
  assert.equal(h.blocks(), h.original.blocks); assert.equal(h.state().history.length, 0);
});
for (const following of [undefined, { id: 'next', type: 'spacer', height: 24 }, paragraph('Hidden', { editorial: { hidden: true } }), paragraph('Locked', { editorial: { lock: { remove: true } } }), paragraph('Named', { editorial: { name: 'Keep' } }), paragraph('Note', { editorial: { note: 'Keep' } }), paragraph('Role', { siteRole: 'players' }), paragraph('Aligned', { align: 'centre' }), list(['Styled'], 'next', { visualStyle: { anchor: 'owner' } })]) test(`unsupported or protected following ${JSON.stringify(following)} refuses`, () => {
  const h = fixture([list(['End']), ...(following ? [following] : [])]);
  assert.equal(h.command.exitList('root', 0, 'forward'), null);
  assert.equal(h.blocks(), h.original.blocks); assert.equal(h.state().history.length, 0);
});
test('following empty List wrapper is removed as one operation', () => {
  const h = fixture([list(['End']), list([], 'next')]);
  assert.ok(h.command.exitList('root', 0, 'forward'));
  assert.deepEqual(h.blocks()[0].items, ['End']); assert.equal(h.blocks().length, 1);
});
test('virtual empty current item retains its editable line and caret', () => {
  const h = fixture([list([]), paragraph('Next')]);
  const target = h.command.exitList('root', 0, 'forward');
  assert.deepEqual(h.blocks()[0].items, ['', 'Next']);
  assert.equal(target.listItemIndex, 0); assert.equal(target.offset, 0);
});
test('rich multiline Paragraph retains marks and style with one anchor owner', () => {
  const runs = [{ text: 'One\n', marks: ['bold'] }, { text: 'Two', marks: ['italic'] }];
  const h = fixture([list(['End']), paragraph('One\nTwo', { runs, style: { textColor: '#112233', anchor: 'paragraph' } })]);
  assert.ok(h.command.exitList('root', 0, 'forward'));
  assert.deepEqual(h.blocks()[0].items.slice(1), [
    { text: 'One', runs: [{ text: 'One', marks: ['bold'] }], style: { textColor: '#112233', anchor: 'paragraph' } },
    { text: 'Two', runs: [{ text: 'Two', marks: ['italic'] }], style: { textColor: '#112233' } },
  ]);
});
test('typed objects and Footnote companion survive external append', () => {
  const runs = [{ text: '\uFFFC', inline: { type: 'footnote', id: 'note' } }, { text: '\uFFFC', inline: { type: 'image', mediaId: 'image', alt: '' } }, { text: '\uFFFC', inline: { type: 'math', latex: 'x', alternativeText: '' } }];
  const notes = { id: 'notes', type: 'footnotes', notes: [{ id: 'note', text: 'Keep' }] };
  const h = fixture([list(['End']), paragraph('\uFFFC\uFFFC\uFFFC', { runs }), notes]);
  assert.ok(h.command.exitList('root', 0, 'forward'));
  assert.deepEqual(h.blocks()[0].items[1].runs, runs.map(run => ({ ...run, marks: undefined }))); assert.deepEqual(h.blocks()[1], notes);
});
for (const parent of [{ id: 'group', type: 'group', layout: 'flow' }, { id: 'column', type: 'column' }, { id: 'quote', type: 'quote', text: '' }]) test(`uses actual ${parent.type} siblings`, () => {
  const owner = { ...parent, children: [list(['End']), paragraph('Next')] };
  const h = fixture([parent.type === 'column' ? { id: 'columns', type: 'columns', children: [owner] } : owner]);
  assert.ok(h.command.exitList('root', 0, 'forward'));
  const next = parent.type === 'column' ? h.blocks()[0].children[0] : h.blocks()[0];
  assert.deepEqual(next.children[0].items, ['End', 'Next']); assert.equal(next.children.length, 1);
});
for (const stale of ['document', 'source', 'following', 'none']) test(`deferred ${stale} capture controls acceptance and focus`, () => {
  const original = { id: 'doc', kind: 'post', title: 'Fixture', blocks: [list(['End']), paragraph('Next')] };
  let pending;
  const command = commands({ activeDocument: original, updateActiveDocument: update => { pending = update; } });
  const target = command.exitList('root', 0, 'forward'); assert.equal(blockCommandFocusId(target), null);
  const current = structuredClone(original);
  if (stale === 'document') current.id = 'other';
  if (stale === 'source') current.blocks[0].items[0] = 'Changed';
  if (stale === 'following') current.blocks[1].text = 'Changed';
  const next = pending(current);
  assert.equal(Boolean(blockCommandFocusId(target)), stale === 'none');
  if (stale !== 'none') assert.equal(next, current);
});

const source = readStudioSource("app/studio/studio-canvas.tsx");
const syntax = ts.createSourceFile('canvas.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let field, handler;
function collect(node) { if (ts.isFunctionDeclaration(node) && node.name?.text === 'ListField') field = node; ts.forEachChild(node, collect); }
collect(syntax);
function inner(node) { if (ts.isJsxAttribute(node) && node.name.text === 'onKeyDown') handler = node.initializer.expression; ts.forEachChild(node, inner); }
inner(field);
for (const [writable, composing, offset] of [[true, false, 3], [false, false, 3], [true, true, 3], [true, false, 1]]) test(`actual terminal Delete handler writable=${writable}, composing=${composing}, offset=${offset}`, () => {
  const calls = [], focuses = [], root = list([{ text: 'Parent', children: [list(['End'], 'child')] }]);
  const editor = { contains: () => true }, target = { blockId: 'child', listItemIndex: 0, offset: 3, isAccepted: () => true };
  const scope = { writable, block: root, list: root.items[0].children[0], item: 'End', index: 0, rootBlocks: [root], listItemText,
    window: { getSelection: () => ({ isCollapsed: true, anchorNode: {}, anchorOffset: offset }) }, editorTextOffset: () => offset,
    mergeListItemBoundary: () => null, onExitList: (...args) => { calls.push(args); return target; }, listRef: { current: {} },
    scheduleBlockCommandFocus: (_editor, actual, _scope, focus) => { assert.equal(actual, target); focus(editor); }, focusRichTextEditorAtOffset: (_editor, caret) => focuses.push(caret),
  };
  runInNewContext(ts.transpileModule(`globalThis.handle = (${handler.getText(syntax)});`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, scope);
  scope.handle({ key: 'Delete', currentTarget: editor, nativeEvent: { isComposing: composing }, preventDefault() {} });
  const accepted = writable && !composing && offset === 3;
  assert.deepEqual(calls, accepted ? [['root', 0, 'forward', 'child']] : []); assert.deepEqual(focuses, accepted ? [3] : []);
});
