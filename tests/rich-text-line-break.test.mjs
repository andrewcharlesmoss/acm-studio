import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
import { loadProductionModule } from './production-module.mjs';

const load = path => loadProductionModule(new URL(path, import.meta.url));
const lineBreak = await load('../app/studio/rich-text-line-break.ts');
const rich = await load('../app/content/rich-text.ts');
const caret = await load('../app/content/caret-formatting.ts');
const math = await load('../app/content/math-runs.ts');
const footnote = await load('../app/content/footnote-runs.ts');
const image = await load('../app/content/inline-image.ts');
const canvas = await readFile(new URL('../app/studio/studio-canvas.tsx', import.meta.url), 'utf8');
const tree = ts.createSourceFile('canvas.tsx', canvas, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const functions = new Map();
function find(node) {
  if (ts.isFunctionDeclaration(node) && node.name) functions.set(node.name.text, node.getText(tree));
  ts.forEachChild(node, find);
}
find(tree);
const compile = name => ts.transpileModule(`${functions.get(name)}\nglobalThis.handler = ${name};`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;

function handlerFixture({ runs = [{ text: 'first' }], selection = { start: 5, end: 5 }, pending = null, editable = true, clean = false } = {}) {
  const calls = [], editor = { innerHTML: 'initial' };
  const scope = { editable, editorRef: { current: editor }, selectionWithinEditor: () => selection,
    editorToRuns: () => runs, pendingFormatsRef: { current: pending }, ...rich, ...caret, ...lineBreak,
    withoutInteractiveFormatting: clean, normalizationAttemptRef: { current: null }, mediaUrls: {}, footnoteNumbers: new Map(),
    runsToEditorHtml: next => JSON.stringify(next), onChange: (...args) => calls.push(args),
    restoreEditorSelection: (_editor, next) => calls.push(['selection', next]), publishCaretFormats: () => {}, onSelectionChange: next => calls.push(['reported', next]),
  };
  runInNewContext(compile('handleLineBreak'), scope);
  return { scope, editor, calls, run(event = {}) { let prevented = false; scope.handler({ inputType: 'insertLineBreak', preventDefault() { prevented = true; }, ...event }); return prevented; } };
}

for (const source of ['', '\n', 'a\n', 'a\n\n', 'a\nb']) test(`typed insertion preserves ${JSON.stringify(source)}`, () => {
  const runs = rich.textToRuns(source), before = structuredClone(runs);
  const next = lineBreak.insertRichTextLineBreak(runs, source.length, source.length);
  assert.equal(rich.plainTextFromRuns(next), source + '\n');
  assert.deepEqual(runs, before);
});

test('line-break insertion replaces the selected range exactly once', () => {
  assert.equal(rich.plainTextFromRuns(lineBreak.insertRichTextLineBreak([{ text: 'abcde' }], 1, 4)), 'a\ne');
  for (const [start, end] of [[-1, 0], [1, 99], [3, 1], [0.5, 1]]) assert.equal(lineBreak.insertRichTextLineBreak([{ text: 'abc' }], start, end), null);
});

test('line breaks preserve neighbouring typed atoms', () => {
  const objects = [footnote.footnoteReferenceRun('note'), math.mathRun({ type: 'math', latex: 'x', alternativeText: '' }), image.inlineImageRun({ type: 'image', mediaId: 'media', alt: '' })];
  const next = lineBreak.insertRichTextLineBreak(objects, 1, 1);
  assert.equal(rich.plainTextFromRuns(next), '\uFFFC\n\uFFFC\uFFFC');
  assert.deepEqual(next.filter(run => run.inline), objects.map(run => ({ ...run, marks: undefined })));
});

test('actual beforeinput handler inserts one break and restores the following caret', () => {
  const fixture = handlerFixture();
  assert.equal(fixture.run(), true);
  assert.equal(fixture.calls[0][0], 'first\n');
  assert.deepEqual(structuredClone(fixture.calls[1]), ['selection', { start: 6, end: 6 }]);
  assert.equal(fixture.scope.pendingFormatsRef.current.text, 'first\n');
});

for (const event of [{ inputType: 'insertParagraph' }, { defaultPrevented: true }, { isComposing: true }]) test(`beforeinput leaves another input owner alone ${JSON.stringify(event)}`, () => {
  const fixture = handlerFixture();
  assert.equal(fixture.run(event), false);
  assert.equal(fixture.calls.length, 0);
  assert.equal(fixture.editor.innerHTML, 'initial');
});

test('read-only or unavailable selection never mutates DOM or content', () => {
  for (const options of [{ editable: false }, { selection: null }]) {
    const fixture = handlerFixture(options);
    assert.equal(fixture.run(), false);
    assert.equal(fixture.calls.length, 0);
    assert.equal(fixture.editor.innerHTML, 'initial');
  }
});

test('pending Bold, Highlight and Language continue after a line break', () => {
  const marks = ['bold', { type: 'highlight', backgroundColor: '#ffee00' }, { type: 'language', language: 'fr', direction: 'ltr' }];
  const fixture = handlerFixture({ pending: { offset: 5, text: 'first', marks, baseline: JSON.stringify([{ text: 'first' }]) } });
  assert.equal(fixture.run(), true);
  assert.deepEqual(fixture.calls[0][1].at(-1).marks, marks);
  assert.deepEqual(fixture.scope.pendingFormatsRef.current.marks, marks);
  const typed = caret.formatCaretInsertion('first\n', [{ text: 'first\nsecond' }], 6, fixture.scope.pendingFormatsRef.current.marks);
  assert.equal(typed.text, 'first\nsecond');
  assert.deepEqual(typed.runs.at(-1).marks, marks);
});

test('without interactive formatting strips link marks from the break and continuation', () => {
  const fixture = handlerFixture({ clean: true, pending: { offset: 5, text: 'first', marks: ['bold', { type: 'link', url: 'https://example.com' }] } });
  assert.equal(fixture.run(), true);
  assert.deepEqual(fixture.calls[0][1].at(-1).marks, ['bold']);
  assert.deepEqual(fixture.scope.pendingFormatsRef.current.marks, ['bold']);
});

test('modern repeated soft breaks do not trigger the legacy paragraph projection', () => {
  let invoked = false;
  const scope = { editable: true, runs: [{ text: 'one\n\ntwo' }], onSplitParagraphs: () => { invoked = true; }, editorToRuns: () => { throw new Error('Modern runs must not be projected'); } };
  runInNewContext(compile('splitLegacyParagraphsOnFocus'), scope);
  scope.handler({});
  assert.equal(invoked, false);
});

const rendererScope = { ...rich, ...lineBreak, ...math, ...image, ...footnote,
  inlineImageHtml() { throw new Error('Not part of the plain-text fixture'); }, mathObjectHtml() { throw new Error('Not part of the plain-text fixture'); }, legacyMathHtml() { throw new Error('Not part of the plain-text fixture'); } };
runInNewContext(compile('escapeHtml'), rendererScope); rendererScope.escapeHtml = rendererScope.handler;
runInNewContext(compile('runsToEditorHtml'), rendererScope);
for (const [source, expected] of [
  ['', ''], ['a\n', 'a' + lineBreak.AUTHORED_LINE_BREAK_HTML + lineBreak.LINE_BREAK_FILLER_HTML],
  ['\n\n', lineBreak.AUTHORED_LINE_BREAK_HTML.repeat(2) + lineBreak.LINE_BREAK_FILLER_HTML],
  ['a\nb', 'a' + lineBreak.AUTHORED_LINE_BREAK_HTML + 'b'],
]) test(`actual renderer separates authored breaks from filler ${JSON.stringify(source)}`, () => {
  assert.equal(rendererScope.handler(rich.textToRuns(source)), expected);
});

const { handleStudioHistoryShortcut } = await import('../app/studio/studio-history-shortcuts.mjs');
function historyTarget({ richText = false, owned = false, overlay = false, form = false } = {}) {
  return {
    isContentEditable: richText,
    matches: selector => form && selector.includes('input'),
    closest(selector) {
      if (selector === '.rich-text-editor') return richText ? this : null;
      if (selector === '[data-studio-rich-text-history]') return owned ? this : null;
      if (selector.includes('.link-editor-popover')) return overlay ? this : null;
      if (selector.startsWith('[contenteditable')) return richText ? this : null;
      return null;
    },
  };
}
for (const [platform, key, shiftKey, action] of [['MacIntel', 'z', false, 'undo'], ['MacIntel', 'z', true, 'redo'], ['Linux', 'z', false, 'undo'], ['Linux', 'y', false, 'redo'], ['Linux', 'z', true, 'redo']]) test(`owned rich-text history handles ${platform} ${key} ${shiftKey}`, () => {
  const calls = [];
  const event = { target: historyTarget({ richText: true, owned: true }), key, shiftKey, metaKey: platform === 'MacIntel', ctrlKey: platform !== 'MacIntel', preventDefault() { calls.push('prevented'); } };
  assert.equal(handleStudioHistoryShortcut(event, platform, () => calls.push('undo'), () => calls.push('redo')), true);
  assert.deepEqual(calls, ['prevented', action]);
});
test('ordinary forms, overlays and unowned rich text retain native history', () => {
  for (const flags of [{ form: true, owned: true }, { richText: true }, { richText: true, owned: true, overlay: true }]) {
    const event = { target: historyTarget(flags), key: 'z', metaKey: true, preventDefault() { throw new Error('Native editing intercepted'); } };
    assert.equal(handleStudioHistoryShortcut(event, 'MacIntel', () => { throw new Error('Wrong history'); }, () => {}), false);
  }
});
