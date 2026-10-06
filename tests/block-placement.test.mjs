import assert from "node:assert/strict";
import { readStudioSource } from "./studio-module-source.mjs";
import test from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { loadProductionModule } from "./production-module.mjs";
import { commitHistory, undoHistory, redoHistory } from "../app/studio/studio-command-operations.mjs";
const { moveBlockToTarget, insertBlockAtTarget } = await loadProductionModule(new URL("../app/studio/block-placement.ts", import.meta.url));
const { columnDropPosition } = await loadProductionModule(new URL("../app/studio/column-drop-position.ts", import.meta.url));
const { useStudioBlockCommands } = await loadProductionModule(new URL("../app/studio/use-studio-block-commands.ts", import.meta.url));
const { validContentBlocks } = await loadProductionModule(new URL("../app/studio/workspace-validation.ts", import.meta.url));
const p = id => ({ id, type: "paragraph", text: id });
const fixture = () => [p("root"), { id: "columns", type: "columns", children: [{ id: "left", type: "column", children: [p("a"), p("b"), p("c")] }, { id: "right", type: "column", children: [] }] }, p("after")];
const ids = blocks => blocks[1].children.map(column => column.children.map(child => child.id));

test("placement moves root, cross-column and nested content in one immutable tree", () => {
  const before = fixture();
  const nested = moveBlockToTarget(before, "root", { parentId: "right", index: 0 });
  assert.equal(nested[0].type, "columns"); assert.equal(nested[0].children[1].children[0], before[0]);
  assert.deepEqual(ids(before), [["a", "b", "c"], []]);
  const across = moveBlockToTarget(before, "b", { parentId: "right", index: 0 });
  assert.deepEqual(ids(across), [["a", "c"], ["b"]]);
  assert.equal(across[0], before[0]); assert.equal(across[1].children[1].children[0], before[1].children[0].children[1]);
  const out = moveBlockToTarget(across, "b", { parentId: null, index: 3 });
  assert.deepEqual(out.map(block => block.id), ["root", "columns", "after", "b"]);
  assert.deepEqual(ids(out), [["a", "c"], []]);
});

test("same-column boundary correction preserves no-op identity and order", () => {
  const before = fixture();
  for (const index of [1, 2]) assert.equal(moveBlockToTarget(before, "b", { parentId: "left", index }), before);
  assert.deepEqual(ids(moveBlockToTarget(before, "a", { parentId: "left", index: 3 }))[0], ["b", "c", "a"]);
  assert.deepEqual(ids(moveBlockToTarget(before, "c", { parentId: "left", index: 0 }))[0], ["c", "a", "b"]);
});

test("invalid targets, descendants, restricted types and locks retain the source", () => {
  const before = fixture();
  for (const target of [{ parentId: "missing", index: 0 }, { parentId: "root", index: 0 }, { parentId: "left", index: -1 }, { parentId: "left", index: 4 }, { parentId: "left", index: 0.5 }]) assert.equal(moveBlockToTarget(before, "b", target), before);
  assert.equal(moveBlockToTarget(before, "columns", { parentId: "left", index: 0 }), before);
  assert.equal(moveBlockToTarget(before, "left", { parentId: "right", index: 0 }), before);
  const locked = fixture(); locked[0].editorial = { lock: { move: true } };
  assert.equal(moveBlockToTarget(locked, "root", { parentId: "right", index: 0 }), locked);
  const restricted = fixture(); restricted[1].children[1].allowedBlocks = ["heading"];
  assert.equal(moveBlockToTarget(restricted, "b", { parentId: "right", index: 0 }), restricted);
  assert.equal(insertBlockAtTarget(before, p("a"), { parentId: "right", index: 0 }), before);
  const social = [...before, { id: "social", type: "social-icons", children: [{ id: "icon", type: "social-linkedin", url: "https://www.linkedin.com/", label: "LinkedIn" }] }];
  for (const parentId of [null, "right"]) assert.equal(moveBlockToTarget(social, "icon", { parentId, index: 0 }), social);
});

test("one history transaction restores both parents and redoes the whole move", () => {
  const original = { blocks: fixture() };
  const changed = { blocks: moveBlockToTarget(original.blocks, "b", { parentId: "right", index: 0 }) };
  const committed = commitHistory(original, []);
  const undone = undoHistory(changed, committed.history, committed.future);
  assert.deepEqual(undone.workspace, original);
  assert.deepEqual(redoHistory(undone.workspace, undone.history, undone.future).workspace, changed);
});

test("reader-valid non-owning children metadata remains untouched by placement and lock traversal", () => {
  const before = fixture(); before[0].children = {};
  assert.equal(validContentBlocks(before), true);
  const next = moveBlockToTarget(before, "b", { parentId: "right", index: 0 });
  assert.notEqual(next, before); assert.equal(next[0], before[0]); assert.deepEqual(next[0].children, {});
  assert.equal(validContentBlocks(next), true);
});

test("positioned library insertion uses the shared command once and preserves wrapper rules", () => {
  for (const type of ["paragraph", "button", "social-linkedin"]) {
    let document = { blocks: fixture() }, commits = 0;
    const commands = useStudioBlockCommands({ activeDocument: document, updateActiveDocument: update => { document = update(document); commits++; } });
    const inserted = commands.insertBlock(type, null, "left", 1);
    assert.ok(inserted); assert.equal(commits, 1);
    const children = document.blocks[1].children[0].children;
    assert.deepEqual(children.filter(child => ["a", "b", "c"].includes(child.id)).map(child => child.id), ["a", "b", "c"]);
    assert.equal(children[1].type, type === "button" ? "buttons" : type === "social-linkedin" ? "social-icons" : type);
  }
});

test("column geometry measures direct children and compensates transformed canvas zoom", () => {
  const box = (left, top, width, height) => ({ left, top, width, height, right: left + width, bottom: top + height });
  let children = [box(120, 140, 160, 40), box(120, 220, 160, 40)];
  const column = { dataset: { studioColumnDropId: "left" }, getBoundingClientRect: () => box(120, 120, 160, 200), querySelectorAll: selector => { assert.equal(selector, ":scope > [data-studio-nested-block-id]"); return children.map(bounds => ({ getBoundingClientRect: () => bounds })); } };
  const canvas = { offsetWidth: 300, contains: candidate => candidate === column, getBoundingClientRect: () => box(100, 100, 600, 500) };
  const element = { closest: selector => { assert.equal(selector, "[data-studio-column-drop-id]"); return column; } };
  const first = columnDropPosition(canvas, element, 140, 130);
  assert.deepEqual(first.target, { parentId: "left", index: 0 }); assert.equal(first.left, 10); assert.equal(first.width, 80); assert.equal(first.top, 18);
  assert.equal(columnDropPosition(canvas, element, 140, 210).target.index, 1);
  assert.equal(columnDropPosition(canvas, element, 140, 300).target.index, 2);
  assert.equal(columnDropPosition(canvas, element, 10, 130), null);
  children = [];
  assert.equal(columnDropPosition(canvas, element, 140, 130).target.index, 0);
  assert.equal(columnDropPosition(canvas, element, 140, 130).height, 24);
});

const canvasSource = readStudioSource("app/studio/studio-canvas.tsx");
const canvasAst = ts.createSourceFile("canvas.tsx", canvasSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const owner = canvasAst.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === "StudioCanvasContent");
const handler = name => ts.transpileModule(`globalThis.handler = ${owner.body.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === name).getText(canvasAst)}`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;

test("actual Column drop recalculates placement; equivalent projections survive indicator rerenders", () => {
  const original = fixture(), insertions = []; let finished = 0;
  const activeDocument = { id: "template", blocks: structuredClone(original) };
  const scope = { activeDocument, blockDragBaseline: JSON.stringify(activeDocument.blocks), dragSessionRef: { current: { documentId: "template", baseline: JSON.stringify(original), libraryType: "paragraph" } }, writable: true, writableRef: { current: true }, previewing: false, codeEditor: null, Element: class {}, columnDropPosition: () => ({ target: { parentId: "right", index: 0 } }), nestedDragBlockIdRef: { current: null }, draggingIndexRef: { current: null }, onInsertBlockAt: (...args) => insertions.push(args), finishBlockDrag: () => finished++ };
  runInNewContext(handler("insertLibraryBlockAt"), scope);
  scope.insertLibraryBlockAt = scope.handler;
  runInNewContext(handler("handleCanvasDrop"), scope);
  scope.handler({ target: null, currentTarget: {}, preventDefault() {}, stopPropagation() {} });
  assert.deepEqual(insertions, [["paragraph", 0, "right"]]); assert.equal(finished, 1);
});

test("actual drag handlers refuse stale documents, changed content, missing sessions and read-only drops", () => {
  for (const name of ["handleCanvasDragOver", "handleCanvasDrop"]) for (const mode of ["document", "content", "readonly", "missing", "preview", "code"]) {
    let finished = 0;
    const blocks = fixture();
    const scope = { activeDocument: { id: "current", blocks }, blockDragBaseline: JSON.stringify(blocks), dragSessionRef: { current: { documentId: "current", baseline: JSON.stringify(blocks), libraryType: "paragraph" } }, writable: true, previewing: false, codeEditor: null, finishBlockDrag: () => finished++, columnDropPosition: () => assert.fail("Invalid session reached the drop target") };
    if (mode === "document") scope.dragSessionRef.current.documentId = "old";
    if (mode === "content") scope.blockDragBaseline = "changed";
    if (mode === "readonly") scope.writable = false;
    if (mode === "missing") scope.dragSessionRef.current = null;
    if (mode === "preview") scope.previewing = true;
    if (mode === "code") scope.codeEditor = {};
    runInNewContext(handler(name), scope);
    scope.handler({ preventDefault() {} }); assert.equal(finished, 1, name + mode);
  }
});
