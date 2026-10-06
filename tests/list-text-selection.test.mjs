import assert from "node:assert/strict";
import { readStudioSource } from "./studio-module-source.mjs";
import test from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { loadProductionModule } from "./production-module.mjs";
import { commitHistory, undoHistory, redoHistory } from "../app/studio/studio-command-operations.mjs";

const selection = await loadProductionModule(new URL("../app/studio/list-text-selection.ts", import.meta.url));
const rich = await loadProductionModule(new URL("../app/content/rich-text.ts", import.meta.url));
const root = { id: "list", type: "list", style: "unordered", items: ["First item", "Second item", "Third item", "Untouched"] };
const point = (itemIndex, offset, listId = "list") => ({ listId, itemIndex, offset });
const range = (block = root, anchor = point(0, 3), focus = point(2, 5)) => ({ rootId: block.id, baseline: JSON.stringify(block), anchor, focus });
const selected = (block, range) => selection.listTextSegments(block, range).map(segment => rich.plainTextFromRuns(segment.runs).slice(segment.start, segment.end));

test("forward and backward three-item selections retain partial endpoints and direction", () => {
  const forward = range(), backward = range(root, point(2, 5), point(0, 3));
  assert.deepEqual(selected(root, forward), ["st item", "Second item", "Third"]);
  assert.deepEqual(selected(root, backward), selected(root, forward));
  assert.deepEqual(backward.anchor, point(2, 5));
  assert.deepEqual(selection.listTextSegments(root, range(root, point(0, 10), point(1, 0))).map(part => part.start === part.end), [true, true]);
});

test("invalid identities, stale baselines and bad offsets cannot mutate an item", () => {
  for (const invalid of [ { ...range(), rootId: "other" }, { ...range(), baseline: "stale" }, range(root, point(5, 0)), range(root, point(0, -1)), range(root, point(0, 999)), range(root, point(0, 0.5)), range(root, point(1, 0), point(1, 4)) ]) {
    assert.equal(selection.listTextSegments(root, invalid), null);
    assert.equal(selection.formatListText(root, invalid, "bold"), root);
    assert.equal(selection.replaceListText(root, invalid, []), null);
  }
});

test("formatting uses one aggregate toggle and retains unselected text and item metadata", () => {
  const styled = { ...root, items: [{ text: "First item", runs: [{ text: "First item", marks: ["bold"] }], style: { anchor: "item", className: "keep" } }, ...root.items.slice(1)] };
  assert.equal(selection.listTextMarkState(styled, range(styled), "bold"), "mixed");
  const next = selection.formatListText(styled, range(styled), "bold");
  assert.equal(selection.listTextMarkState(next, range(next), "bold"), true);
  assert.deepEqual(next.items[0].style, styled.items[0].style);
  assert.deepEqual(next.items[2].runs, [{ text: "Third", marks: ["bold"] }, { text: " item", marks: undefined }]);
  assert.equal(next.items[3], "Untouched");
  const cleared = selection.formatListText(next, range(next), "bold");
  assert.equal(selection.listTextMarkState(cleared, range(cleared), "bold"), false);
  assert.equal(styled.items[0].runs[0].marks[0], "bold");
});

test("nested reading order is selectable and formatting retains every structural owner", () => {
  const nested = { ...root, items: [{ text: "Parent", children: [{ id: "nested", type: "list", style: "ordered", items: ["Child one", "Child two"] }] }, "Next parent"] };
  const r = range(nested, point(0, 3), point(1, 4));
  assert.deepEqual(selected(nested, r), ["ent", "Child one", "Child two", "Next"]);
  const next = selection.formatListText(nested, r, "italic");
  assert.equal(next.items[0].children[0].id, "nested");
  assert.equal(next.items[0].children[0].items[1].runs[0].marks[0], "italic");
  assert.equal(selection.replaceListText(nested, r, []), null);
  assert.equal(selection.replaceListText(nested, range(nested, point(0, 2, "nested"), point(1, 2, "nested")), []).block.items[0].children[0].items[0], "Child two");
});

test("typed atoms retain one logical offset and formatting does not mark them", () => {
  const atom = { text: "\uFFFC", inline: { type: "footnote", id: "note" } };
  const block = { ...root, items: [{ text: "A\uFFFCB", runs: [{ text: "A" }, atom, { text: "B" }] }, "Last"] };
  const r = range(block, point(0, 1), point(1, 2));
  const next = selection.formatListText(block, r, "bold");
  assert.deepEqual(next.items[0].runs[1].inline, atom.inline);
  assert.equal(next.items[0].runs[1].marks, undefined);
  assert.deepEqual(selected(block, r), ["\uFFFCB", "La"]);
  assert.equal(selection.listTextContainsFootnotes(block, r), true);
  assert.equal(selection.listTextContainsFootnotes(block, range(block, point(0, 2), point(1, 2))), false);
  const legacy = { ...block, items: [{ text: "source", runs: [{ text: "source", marks: [{ type: "footnote", id: "legacy" }] }] }, "Last"] };
  assert.equal(selection.listTextContainsFootnotes(legacy, range(legacy, point(0, 0), point(1, 1))), true);
});

test("replacement merges only selected siblings and preserves first-item styling", () => {
  const block = { ...root, items: [{ text: "First item", style: { anchor: "keep" } }, ...root.items.slice(1)] };
  const changed = selection.replaceListText(block, range(block), [{ text: "new", marks: ["italic"] }]);
  assert.equal(changed.block.items.length, 2);
  assert.equal(changed.block.items[0].text, "Firnew item");
  assert.deepEqual(changed.block.items[0].style, block.items[0].style);
  assert.deepEqual(changed.caret, point(0, 6));
  assert.equal(changed.block.items[1], "Untouched");
  assert.equal(selection.replaceListText(block, range(block), [{ text: "bad", inline: { type: "unknown" } }]), null);
});

test("a List range edit is one immutable history transaction with Undo and Redo", () => {
  const original = { id: "doc", blocks: [root] };
  const committed = commitHistory(original, []);
  const changed = { ...original, blocks: [selection.replaceListText(root, range(), []).block] };
  const undone = undoHistory(changed, committed.history, committed.future);
  assert.deepEqual(undone.workspace, original);
  assert.deepEqual(redoHistory(undone.workspace, undone.history, undone.future).workspace, changed);
});

test("cross-host character extension respects emoji and combining character boundaries", () => {
  const text = "A😀e\u0301B";
  assert.equal(selection.listTextArrowOffset(text, 1, 1), 3);
  assert.equal(selection.listTextArrowOffset(text, 3, 1), 5);
  assert.equal(selection.listTextArrowOffset(text, 5, -1), 3);
  assert.equal(selection.listTextArrowOffset(text, 3, -1), 1);
});

const canvas = readStudioSource("app/studio/studio-canvas.tsx");
const ast = ts.createSourceFile("canvas.tsx", canvas, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const listField = ast.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === "ListField");
function actualHandler(name, owner = listField) {
  let handler;
  function visit(node) {
    if (ts.isFunctionDeclaration(node) && node.name?.text === name) handler = node;
    if (ts.isVariableDeclaration(node) && node.name.getText(ast) === name) handler = node.initializer;
    if (ts.isJsxAttribute(node) && node.name.getText(ast) === name) handler = node.initializer.expression;
    ts.forEachChild(node, visit);
  }
  visit(owner);
  assert.ok(handler, name);
  return ts.transpileModule(`globalThis.handler = ${handler.getText(ast)}`, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
}

test("actual beforeinput capture requires cancellability and uses replacement transfer text", () => {
  const writes = [], messages = [];
  const scope = { listCompositionRef: { current: null }, blockedListInputRef: { current: false }, textRange: () => range(), currentRef: { current: { writable: true } }, replaceSelection: (_range, runs) => writes.push(runs), textToRuns: rich.textToRuns, feedback: message => messages.push(message) };
  runInNewContext(actualHandler("beforeInput"), scope);
  let prevented = 0;
  const event = overrides => ({ inputType: "insertReplacementText", data: null, cancelable: true, preventDefault: () => prevented++, stopPropagation() {}, ...overrides });
  scope.handler(event({ dataTransfer: { getData: () => "replacement" } }));
  assert.deepEqual(writes, [[{ text: "replacement" }]]);
  scope.handler(event({}));
  assert.equal(writes.length, 1); assert.match(messages.at(-1), /retained/);
  scope.handler(event({ cancelable: false, inputType: "insertCompositionText", data: "IME" }));
  assert.equal(writes.length, 1); assert.equal(scope.blockedListInputRef.current, true); assert.equal(prevented, 2);
  scope.listCompositionRef.current = range();
  scope.handler(event({ cancelable: false, inputType: "insertCompositionText", data: "staged" }));
  assert.equal(writes.length, 1);
});

test("actual composition handlers stage native input and commit once, or restore after cancellation", () => {
  const writes = [], frames = []; let revisions = 0;
  const scope = { listCompositionRef: { current: range() }, blockedListInputRef: { current: false }, replaceSelection: (_range, runs) => writes.push(runs), textToRuns: rich.textToRuns, setCompositionRevision: fn => { revisions = fn(revisions); }, requestAnimationFrame: fn => frames.push(fn) };
  runInNewContext(actualHandler("onInputCapture"), scope);
  let stops = 0;
  scope.handler({ stopPropagation: () => stops++ });
  assert.equal(stops, 1); assert.equal(revisions, 0); assert.equal(writes.length, 0);
  runInNewContext(actualHandler("onCompositionEndCapture"), scope);
  scope.handler({ data: "入力" });
  assert.deepEqual(writes, [[{ text: "入力" }]]); assert.equal(revisions, 1); assert.equal(scope.listCompositionRef.current, null);
  scope.listCompositionRef.current = range();
  scope.handler({ data: "" });
  assert.equal(writes.length, 1); assert.equal(revisions, 2);
  frames.forEach(fn => fn()); assert.equal(scope.blockedListInputRef.current, false);
});

test("actual paste rejects a block envelope and never replaces read-only selected text", () => {
  const writes = [], messages = [];
  let payload = {};
  const scope = { textRange: () => range(), currentRef: { current: { writable: true } }, readBlockClipboardPayload: () => payload, readMathClipboardRuns: () => ({ handled: false }), editorToRuns() {}, textToRuns: rich.textToRuns, replaceSelection: (_range, runs) => writes.push(runs), feedback: message => messages.push(message) };
  runInNewContext(actualHandler("onPasteCapture"), scope);
  const event = { preventDefault() {}, stopPropagation() {}, clipboardData: { getData: () => "copied content" } };
  scope.handler(event);
  assert.equal(writes.length, 0); assert.match(messages[0], /block boundary/);
  payload = null; scope.currentRef.current.writable = false;
  scope.handler(event); assert.equal(writes.length, 0);
  scope.currentRef.current.writable = true;
  scope.handler(event); assert.deepEqual(writes, [[{ text: "copied content" }]]);
});

test("actual Footnote Copy/Cut guard refuses before clipboard writes or source removal", () => {
  const writes = [], messages = [];
  const scope = { textRange: () => range(), currentRef: { current: { block: root } }, listTextContainsFootnotes: () => true, feedback: message => messages.push(message), replaceSelection: () => writes.push("remove") };
  runInNewContext(actualHandler("copySelection"), scope);
  scope.handler({ preventDefault() {}, stopPropagation() {}, clipboardData: { setData: () => writes.push("clipboard") } }, true);
  assert.deepEqual(writes, []); assert.match(messages[0], /Footnote text/);
});

test("actual Canvas gesture ignores non-block frames and toolbar chrome while retaining List text", () => {
  const owner = ast.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === "StudioCanvasContent");
  const startNode = {}, endNode = {}, startEditor = { contains: node => node === startNode }, endEditor = { contains: node => node === endNode };
  const listRoot = { dataset: { listRootId: "list" }, contains: node => [startEditor, endEditor].includes(node) };
  const start = { startContainer: startNode }, last = { startContainer: endNode };
  const gesture = { pointerId: 1, active: false, listRoot, listEditor: startEditor, listText: true, blockId: "list", endBlockId: "list", start, last: start };
  const ranges = [], selected = [], frames = [];
  let pointed = null, target = "group";
  const scope = { Element: class {}, blockSelectionPointerTarget: () => null, crossBlockSelectionRef: { current: gesture }, document: { elementFromPoint: () => target }, listTextEditor: node => node === "item" || node === endNode ? endEditor : null, listSelectionRoot: editor => editor === endEditor || editor === startEditor ? listRoot : null, caretRangeAtPoint: () => pointed, clearMultiSelection() {}, selectBlockRange() { assert.fail("A List text drag armed structural block deletion"); }, applyCrossBlockSelection: (...range) => ranges.push(range), onSelectBlock: id => selected.push(id), window: { requestAnimationFrame: fn => frames.push(fn), getSelection: () => ({ removeAllRanges() {} }) }, setAppenderActive() {} };
  const event = { pointerId: 1, buttons: 1, clientX: 0, clientY: 0, preventDefault() {}, currentTarget: { hasPointerCapture: () => false, setPointerCapture() {}, focus() {} } };
  runInNewContext(actualHandler("onPointerMove", owner), scope);
  for (target of ["group", "other paragraph", "toolbar"]) scope.handler(event);
  assert.equal(gesture.active, false); assert.equal(ranges.length, 0);
  target = "item"; pointed = last; scope.handler(event);
  assert.equal(gesture.active, true); assert.equal(gesture.last, last);
  for (target of ["group", "other paragraph", "toolbar"]) scope.handler(event);
  assert.equal(gesture.listText, true); assert.equal(gesture.last, last);
  pointed = { startContainer: {} };
  runInNewContext(actualHandler("onPointerUp", owner), scope); scope.handler(event);
  frames.forEach(fn => fn());
  assert.deepEqual(selected, ["list"]); assert.deepEqual(ranges.at(-1), [start, last]);
  assert.equal(scope.crossBlockSelectionRef.current, null);
});

test("actual List gesture selects separate root blocks in either direction and returns to text mode", () => {
  const owner = ast.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === "StudioCanvasContent");
  for (const ids of [["first", "last"], ["last", "first"]]) {
    const nodes = [{}, {}];
    const editors = nodes.map(node => ({ contains: candidate => candidate === node }));
    const roots = ids.map(id => ({ dataset: { listRootId: id }, contains: candidate => candidate === editors[ids.indexOf(id)] }));
    const start = { startContainer: nodes[0] }, end = { startContainer: nodes[1] };
    const gesture = { pointerId: 1, listRoot: roots[0], listEditor: editors[0], listText: true, blockId: ids[0], endBlockId: ids[0], start, last: start, active: false };
    let editor = editors[1], pointed = end;
    const ranges = [], blocks = [], frames = []; let clears = 0;
    const scope = { Element: class {}, blockSelectionPointerTarget: () => null, crossBlockSelectionRef: { current: gesture }, document: { elementFromPoint: () => editor }, listTextEditor: node => editors.find((item, index) => item === node || nodes[index] === node) ?? null, listSelectionRoot: item => roots[editors.indexOf(item)] ?? null, caretRangeAtPoint: () => pointed, clearMultiSelection: () => clears++, setListTextRange: value => assert.equal(value, null), selectBlockRange: (...ids) => blocks.push(ids), applyCrossBlockSelection: (...range) => ranges.push(range), onSelectBlock() {}, window: { requestAnimationFrame: fn => frames.push(fn), getSelection: () => ({ removeAllRanges() {} }) } };
    const event = { pointerId: 1, buttons: 1, clientX: 0, clientY: 0, preventDefault() {}, currentTarget: { hasPointerCapture: () => true, focus() {} } };
    runInNewContext(actualHandler("onPointerMove", owner), scope); scope.handler(event);
    assert.equal(gesture.listText, false); assert.deepEqual(blocks.at(-1), ids);
    editor = null; pointed = { startContainer: {} }; scope.handler(event);
    assert.equal(gesture.last, end); assert.deepEqual(blocks.at(-1), ids);
    runInNewContext(actualHandler("onPointerUp", owner), scope); scope.handler(event); frames.forEach(fn => fn());
    assert.deepEqual(blocks.at(-1), ids); assert.equal(ranges.length, 0); assert.equal(frames.length, 0); assert.equal(clears, 0);
    scope.crossBlockSelectionRef.current = gesture;
    editor = editors[0]; pointed = start;
    runInNewContext(actualHandler("onPointerMove", owner), scope); scope.handler(event);
    assert.equal(gesture.listText, true); assert.equal(gesture.endBlockId, ids[0]); assert.equal(clears, 1);
  }
});

test("actual List root resolution rejects detached, foreign and non-List hosts", () => {
  const owner = ast.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === "StudioCanvasContent");
  const fn = owner.body.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === "listSelectionRoot");
  const code = ts.transpileModule(`globalThis.resolve = ${fn.getText(ast)}`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  let connected = true, contained = true, type = "list";
  const root = { get isConnected() { return connected; }, dataset: { listRootId: "list" } };
  const scope = { canvasScrollRef: { current: { contains: () => contained } }, activeDocument: { blocks: [] }, findBlockById: () => ({ type }) };
  runInNewContext(code, scope);
  const editor = { closest: () => root };
  assert.equal(scope.resolve(editor), root);
  connected = false; assert.equal(scope.resolve(editor), null);
  connected = true; contained = false; assert.equal(scope.resolve(editor), null);
  contained = true; type = "paragraph"; assert.equal(scope.resolve(editor), null);
  assert.equal(scope.resolve(null), null);
});

test("detached or replaced List origins cancel actual move and release handlers", () => {
  const owner = ast.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === "StudioCanvasContent");
  for (const name of ["onPointerMove", "onPointerUp"]) {
    let cleared = 0;
    const scope = { crossBlockSelectionRef: { current: { pointerId: 1, listRoot: {}, listEditor: {} } }, document: { elementFromPoint: () => null }, listSelectionRoot: () => null, clearMultiSelection: () => cleared++, selectBlockRange: () => assert.fail("Stale origin selected blocks") };
    runInNewContext(actualHandler(name, owner), scope);
    scope.handler({ pointerId: 1, buttons: 1 });
    assert.equal(scope.crossBlockSelectionRef.current, null); assert.equal(cleared, 1);
  }
});
