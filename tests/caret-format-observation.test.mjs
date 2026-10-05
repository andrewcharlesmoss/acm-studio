import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";
import test from "node:test";
import ts from "typescript";
import { loadProductionModule } from "./production-module.mjs";

const load = path => loadProductionModule(new URL(path, import.meta.url));
const commands = await load("../app/studio/caret-formatting-command.ts");
const rich = await load("../app/content/rich-text.ts");
const caret = await load("../app/content/caret-formatting.ts");
const tableStructure = await load("../app/studio/table-structure-selection.ts");
const source = await readFile(new URL("../app/studio/studio-canvas.tsx", import.meta.url), "utf8");
const tree = ts.createSourceFile("canvas.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const declarations = new Map();
let caretEffect;
let tableEffect;
function collect(node) {
  if (ts.isFunctionDeclaration(node) && node.name) declarations.set(node.name.text, node);
  if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.text === "reportCaretFormats" && ts.isCallExpression(node.initializer) && node.initializer.expression.getText(tree) === "useCallback") declarations.set(node.name.text, node);
  if (ts.isCallExpression(node) && node.expression.getText(tree) === "useLayoutEffect" && node.arguments[0]?.getText(tree).includes("editor.addEventListener(CARET_FORMAT_EVENT")) caretEffect = node.arguments[0];
  if (ts.isCallExpression(node) && node.expression.getText(tree) === "useLayoutEffect" && node.arguments[0]?.getText(tree).includes("changedTableStructures(previousTableBlocksRef.current")) tableEffect = node.arguments[0];
  ts.forEachChild(node, collect);
}
collect(tree);
function bind(names, scope) {
  const code = names.map(name => {
    assert.ok(declarations.has(name), `Actual production ${name} exists`);
    const node = declarations.get(name);
    return ts.isVariableDeclaration(node) ? `const ${name} = ${node.initializer.arguments[0].getText(tree)};` : node.getText(tree);
  }).join("\n") + `\nObject.assign(globalThis, {${names.join(",")}});`;
  runInNewContext(ts.transpileModule(code, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, scope);
}
const normal = value => JSON.parse(JSON.stringify(value));

function fixture(text = "abc", runs = [{ text }]) {
  const publications = [], selections = [], writes = [];
  let listener;
  const node = {};
  const editor = {
    contains: candidate => candidate === node,
    addEventListener: (_name, callback) => { listener = callback; },
    removeEventListener: () => {},
    dispatchEvent: event => { listener(event); },
  };
  let start = text.length, end = text.length;
  let inside = true;
  const scope = {
    ...rich, ...caret, ...commands,
    text, sourceRuns: runs, renderedRuns: runs, editable: true, withoutInteractiveFormatting: false,
    editorRef: { current: editor }, pendingFormatsRef: { current: null }, normalizationAttemptRef: { current: null },
    reportCaretFormats: (_editor, snapshot) => publications.push(normal(snapshot)),
    onSelectionChange: selection => selections.push(normal(selection)),
    onContentChange: (text, runs) => writes.push(normal({ text, runs })),
    editorOffset: (_editor, _node, offset) => offset,
    editorToRuns: () => scope.domRuns ?? runs,
    window: { getSelection: () => ({ rangeCount: 1, anchorNode: inside ? node : null, focusNode: inside ? node : null, getRangeAt: () => ({ startContainer: node, endContainer: node, startOffset: start, endOffset: end }) }) },
    onKeyDownProp: undefined, activateImage: undefined, activateMath: undefined,
    moveCaretBetweenEditors: () => false,
    CustomEvent: class { constructor(type, options) { this.type = type; this.detail = options.detail; } },
  };
  bind(["publishCaretFormats", "selectionWithinEditor", "readSelection", "onChange", "handleInput", "handleKeyDown"], scope);
  assert.ok(caretEffect);
  runInNewContext(ts.transpileModule(`globalThis.install = ${caretEffect.getText(tree)};`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, scope);
  scope.install();
  const command = (offset, marks) => {
    const request = { offset, marks };
    listener({ detail: request });
    return normal(request.result);
  };
  // The actual keyboard handler calls the same event command as the toolbar.
  scope.caretFormats = (_editor, offset, marks) => command(offset, marks);
  return { scope, editor, publications, selections, writes, command, range(a, b = a) { start = a; end = b; }, outside() { inside = false; } };
}

test("observations distinguish explicit empty formats from stale content and caret positions", () => {
  const runs = [{ text: "abc", marks: ["bold"] }];
  const snapshot = { offset: 3, marks: [], text: "abc", baseline: JSON.stringify(runs) };
  assert.deepEqual(commands.observedCaretFormats(snapshot, "abc", runs, 3), []);
  assert.equal(commands.observedCaretFormats(snapshot, "abc", runs, 2), undefined);
  assert.equal(commands.observedCaretFormats(snapshot, "abcd", runs, 3), undefined);
  assert.equal(commands.observedCaretFormats(snapshot, "abc", [{ text: "abc" }], 3), undefined);
});

test("actual caret setter publishes once while command queries do not publish", () => {
  const f = fixture();
  assert.deepEqual(f.command(3, ["bold"]), ["bold"]);
  assert.equal(f.publications.length, 1);
  assert.deepEqual(f.command(3), ["bold"]);
  assert.deepEqual(f.command(2), []);
  assert.equal(f.publications.length, 1);
  assert.deepEqual(f.command(3, []), []);
  assert.deepEqual(f.publications.at(-1).marks, []);
  assert.equal(f.writes.length, 0);
});

test("actual keyboard Bold and Italic publish pending marks without modifying content", () => {
  const f = fixture();
  const key = key => f.scope.handleKeyDown({ key, metaKey: true, ctrlKey: false, shiftKey: false, altKey: false, preventDefault() {} });
  key("b"); key("i");
  assert.deepEqual(f.publications.at(-1).marks, ["bold", "italic"]);
  key("b");
  assert.deepEqual(f.publications.at(-1).marks, ["italic"]);
  assert.equal(f.writes.length, 0);
});

test("actual typing advances the observation and same-text Undo invalidates it", () => {
  const f = fixture();
  f.command(3, ["bold"]);
  f.scope.domRuns = [{ text: "abcx" }];
  f.range(4);
  f.scope.handleInput();
  const written = f.writes.at(-1);
  assert.equal(written.text, "abcx");
  assert.deepEqual(written.runs.at(-1), { text: "x", marks: ["bold"] });
  const snapshot = f.publications.at(-1);
  assert.equal(snapshot.offset, 4);
  assert.deepEqual(commands.observedCaretFormats(snapshot, written.text, written.runs, 4), ["bold"]);
  f.scope.text = written.text;
  f.scope.sourceRuns = written.runs;
  f.scope.renderedRuns = written.runs;
  f.scope.install();
  assert.ok(f.scope.pendingFormatsRef.current);
  f.scope.sourceRuns = [{ text: "abcx" }];
  f.scope.renderedRuns = f.scope.sourceRuns;
  f.scope.install();
  assert.equal(f.scope.pendingFormatsRef.current, null);
  assert.equal(f.publications.at(-1), null);
});

test("genuine caret movement clears formats while toolbar focus preserves them", () => {
  const f = fixture();
  f.command(3, ["bold"]);
  f.outside(); f.scope.readSelection();
  assert.deepEqual(f.scope.pendingFormatsRef.current.marks, ["bold"]);
  const moved = fixture(); moved.command(3, ["italic"]); moved.range(1, 2); moved.scope.readSelection();
  assert.equal(moved.scope.pendingFormatsRef.current, null);
  assert.equal(moved.publications.at(-1), null);
});

test("Highlight and Language keep unrelated typing formats and clear channels independently", () => {
  const f = fixture();
  f.command(3, ["bold"]);
  const highlight = { type: "highlight", textColor: "#FF0000", backgroundColor: "#FFFF00" };
  f.command(3, caret.changeCaretMark(f.command(3), highlight, "set"));
  f.command(3, caret.changeCaretMark(f.command(3), { type: "language", code: "fr" }, "set"));
  f.command(3, caret.changeCaretMark(f.command(3), { type: "highlight", backgroundColor: "#FFFF00" }, "set"));
  assert.deepEqual(f.publications.at(-1).marks, ["bold", { type: "language", code: "fr" }, { type: "highlight", backgroundColor: "#FFFF00" }]);
});

test("Button observations use the stored baseline while filtering prohibited pending formats", () => {
  const runs = [{ text: "abc", marks: [{ type: "link", url: "https://example.test" }, "bold"] }];
  const f = fixture("abc", runs);
  f.scope.withoutInteractiveFormatting = true;
  f.scope.renderedRuns = rich.withoutInteractiveTextMarks(runs);
  f.scope.install();
  f.command(3, ["italic", { type: "link", url: "https://example.test" }]);
  assert.deepEqual(commands.observedCaretFormats(f.publications.at(-1), "abc", runs, 3), ["italic"]);
});

test("actual render resolver uses snapshots and model state without editor or selection refs", () => {
  const block = { id: "p", type: "paragraph", text: "abc" };
  const scope = {
    ...rich, ...caret, ...commands,
    activeDocument: { id: "doc", blocks: [block] },
    caretFormatSnapshots: { p: { documentId: "doc", offset: 3, text: "abc", marks: ["bold"], baseline: JSON.stringify([{ text: "abc" }]) } },
    textSelections: { p: { start: 3, end: 3 } }, listTextRange: null,
    nestedRichTextTargets: {}, formattingTarget: value => value,
    activeListContext: () => undefined, activeTableCell: () => undefined,
    richTextContent: value => ({ text: value.text, runs: value.runs }),
    textEditor() { throw new Error("Render queried an editor"); },
    caretFormats() { throw new Error("Render dispatched a command"); },
    currentListTextRange() { throw new Error("Render queried DOM selection"); },
    textSelectionsRef: { get current() { throw new Error("Render read a selection ref"); } },
  };
  bind(["richTextSelectionKey", "selectionKey", "displayedCaretFormats", "textMarkState"], scope);
  assert.equal(scope.textMarkState(block, "bold"), true);
  scope.activeDocument.id = "other";
  assert.equal(scope.textMarkState(block, "bold"), false);
  scope.activeDocument.id = "doc";
  scope.textSelections.p = { start: 2, end: 2 };
  assert.equal(scope.textMarkState(block, "bold"), false);
  scope.textSelections.p = { start: 0, end: 3 };
  block.runs = [{ text: "a", marks: ["bold"] }, { text: "bc" }];
  assert.equal(scope.textMarkState(block, "bold"), "mixed");
});

test("actual publisher clears removed fields on unmount and preserves sibling observations", () => {
  let state = {};
  let field = { block: { id: "table" }, cell: { rowIndex: 1, columnIndex: 0 } };
  const editor = { dataset: { studioBlockId: "table", tableCellRow: "1", tableCellColumn: "0" } };
  const scope = {
    canvasScrollRef: { current: { contains: () => true } },
    currentDocumentRef: { current: { id: "doc" } },
    richTextFieldFromDocument: () => field,
    setCaretFormatSnapshots: update => { state = update(state); },
  };
  bind(["richTextSelectionKey", "reportCaretFormats"], scope);
  const snapshot = { offset: 3, text: "abc", marks: ["bold"], baseline: JSON.stringify([{ text: "abc" }]) };
  scope.reportCaretFormats(editor, snapshot);
  assert.equal(state["table:cell:1:0"].documentId, "doc");
  const unchanged = state;
  scope.reportCaretFormats(editor, snapshot);
  assert.equal(state, unchanged, "Equivalent publication does not trigger another render");
  state.other = { ...snapshot, documentId: "doc" };
  field = null;
  scope.reportCaretFormats(editor, null);
  assert.equal(state["table:cell:1:0"], undefined);
  assert.deepEqual(normal(state.other.marks), ["bold"]);
  scope.reportCaretFormats(editor, snapshot);
  assert.equal(state["table:cell:1:0"], undefined, "A removed field cannot publish another observation");
  field = { block: { id: "quote" }, itemIndex: -1, listId: "quote" };
  const citation = { dataset: { studioBlockId: "quote", quoteCitation: "true" } };
  scope.reportCaretFormats(citation, snapshot);
  assert.ok(state["quote:list:quote:item:-1"]);
  field = null;
  scope.reportCaretFormats(citation, null);
  assert.equal(state["quote:list:quote:item:-1"], undefined, "Removed citation clears its citation key without optional List attributes");
});

test("actual table structure invalidation clears its Highlight capture and observations", () => {
  const before = { id: "table", type: "table", rows: [["one", "two"], ["three", "four"]] };
  const after = { ...before, rows: [["one", "two"]] };
  const states = { setCaretFormatSnapshots: { "table:cell:1:0": { offset: 3 }, other: { offset: 2 } }, setHighlightCaptureAvailable: true };
  const scope = {
    ...tableStructure,
    previousTableBlocksRef: { current: [before] }, activeDocument: { blocks: [after] }, nestedRichTextTargets: {},
    textSelectionsRef: { current: {} }, highlightTargetRef: { current: { blockId: "table", cell: { rowIndex: 1, columnIndex: 0 } } },
  };
  for (const name of ["setTableCellSelections", "setTableTextTargets", "setTextSelections", "setCaretFormatSnapshots", "setLinkEditor", "setLanguageTarget", "setHighlightTarget", "setHighlightCaptureAvailable", "setTableAlignmentMenuBlockId", "setRichTextMenuBlockId"]) scope[name] = update => { states[name] = typeof update === "function" ? update(states[name] ?? {}) : update; };
  assert.ok(tableEffect);
  runInNewContext(ts.transpileModule(`globalThis.invalidateTable = ${tableEffect.getText(tree)};`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, scope);
  scope.invalidateTable();
  assert.equal(scope.highlightTargetRef.current, null);
  assert.equal(states.setHighlightCaptureAvailable, false);
  assert.equal(states.setCaretFormatSnapshots["table:cell:1:0"], undefined);
  assert.equal(states.setCaretFormatSnapshots.other.offset, 2);
});
