import assert from "node:assert/strict";
import { readStudioSource } from "./studio-module-source.mjs";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";
import { loadProductionModule } from "./production-module.mjs";

const { richTextPointAtOffset } = await loadProductionModule(new URL("../app/studio/rich-text-dom.ts", import.meta.url));

const canvas = readStudioSource("app/studio/studio-canvas.tsx");
const source = canvas.slice(canvas.indexOf("function restoreEditorSelection("), canvas.indexOf("function escapeHtml(")).replace(/^export\s+/gm, "");
const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;

function fixture(values) {
  const nodes = values.map(value => ({ nodeType: 3, nodeValue: value, textContent: value, childNodes: [] }));
  const lastChild = { nodeType: 1, tagName: "STRONG", dataset: {}, textContent: values.join(""), childNodes: nodes };
  const editor = { nodeType: 1, tagName: "DIV", dataset: {}, nodeValue: null, lastChild, childNodes: values.length ? [lastChild] : [] };
  const points = [];
  let restored = false;
  const check = (node, offset) => {
    assert.ok(Number.isInteger(offset) && offset >= 0);
    assert.ok(offset <= (node.nodeType === 3 ? node.nodeValue.length : node.childNodes.length), "Range offset must respect node type");
    points.push({ node, offset });
  };
  const context = { richTextPointAtOffset, Node: { TEXT_NODE: 3 }, NodeFilter: { SHOW_TEXT: 4 }, document: {
    createTreeWalker() { let index = 0; return { nextNode: () => nodes[index++] ?? null }; },
    createRange: () => ({ setStart: check, setEnd: check }),
  }, window: { getSelection: () => ({ removeAllRanges() {}, addRange() { restored = true; } }) } };
  vm.runInNewContext(compiled + "\nthis.restore = restoreEditorSelection; this.point = editorPointAtOffset;", context);
  return { ...context, editor, nodes, points, restored: () => restored };
}

test("selection after undo clamps to the last text node inside formatted content", () => {
  const state = fixture(["Mini golf ", "scorecard"]);
  state.restore(state.editor, { start: 70, end: 90 });
  assert.equal(state.points[0].node, state.nodes[1]);
  assert.equal(state.points[0].offset, 9);
  assert.equal(state.points[1].offset, 9);
  assert.equal(state.restored(), true);
});

test("selection restoration handles empty content and invalid or fractional offsets", () => {
  const empty = fixture([]);
  empty.restore(empty.editor, { start: 8, end: 30 });
  assert.equal(empty.points[0].node, empty.editor);
  assert.equal(empty.points[0].offset, 0);
  for (const offset of [-1, NaN, Infinity, 1.8]) {
    const state = fixture(["Hello"]);
    state.restore(state.editor, { start: offset, end: offset });
    assert.equal(state.points[0].offset, offset === 1.8 ? 1 : 0);
  }
});

test("selection offsets across multiple text nodes retain the intended range", () => {
  const state = fixture(["Hello", " world"]);
  state.restore(state.editor, { start: 2, end: 8 });
  assert.equal(state.points[0].node, state.nodes[0]);
  assert.equal(state.points[0].offset, 2);
  assert.equal(state.points[1].node, state.nodes[1]);
  assert.equal(state.points[1].offset, 3);
});

test("cross-block pointer selection preserves backward anchor and focus", () => {
  const source = canvas.slice(canvas.indexOf("function applyCrossBlockSelection("), canvas.indexOf("function escapeHtml("));
  const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  const nodeA = { textContent: "first block" };
  const nodeB = { textContent: "second block" };
  let selectedRange = null;
  let selectedDirection = null;
  const context = {
    Range: { START_TO_START: 0 },
    document: { createRange: () => ({ setStart(node, offset) { this.start = [node, offset]; }, setEnd(node, offset) { this.end = [node, offset]; } }) },
    window: { getSelection: () => ({ setBaseAndExtent(anchorNode, anchorOffset, focusNode, focusOffset) { selectedDirection = [[anchorNode, anchorOffset], [focusNode, focusOffset]]; }, removeAllRanges() { selectedRange = null; }, addRange(range) { selectedRange = range; } }) },
  };
  vm.runInNewContext(`${compiled}\nthis.selectRange = applyCrossBlockSelection;`, context);
  const start = { startContainer: nodeB, startOffset: 4, compareBoundaryPoints: () => 1 };
  const end = { startContainer: nodeA, startOffset: 2 };
  context.selectRange(start, end);
  assert.deepEqual(selectedDirection, [[nodeB, 4], [nodeA, 2]]);
  assert.equal(selectedRange, null);
});

test("cross-block pointer selection falls back to an ordered range when direction APIs are unavailable", () => {
  const source = canvas.slice(canvas.indexOf("function applyCrossBlockSelection("), canvas.indexOf("function escapeHtml("));
  const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  const nodeA = { textContent: "first block" };
  const nodeB = { textContent: "second block" };
  let selectedRange = null;
  const context = {
    Range: { START_TO_START: 0 },
    document: { createRange: () => ({ setStart(node, offset) { this.start = [node, offset]; }, setEnd(node, offset) { this.end = [node, offset]; } }) },
    window: { getSelection: () => ({ removeAllRanges() { selectedRange = null; }, addRange(range) { selectedRange = range; } }) },
  };
  vm.runInNewContext(`${compiled}\nthis.selectRange = applyCrossBlockSelection;`, context);
  const start = { startContainer: nodeB, startOffset: 4, compareBoundaryPoints: () => 1 };
  const end = { startContainer: nodeA, startOffset: 2 };
  context.selectRange(start, end);
  assert.equal(selectedRange.start[0], nodeA);
  assert.equal(selectedRange.start[1], 2);
  assert.equal(selectedRange.end[0], nodeB);
  assert.equal(selectedRange.end[1], 4);
});
