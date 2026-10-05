import assert from "node:assert/strict";
import test from "node:test";
import { blockSelectionRange, normaliseBlockSelection } from "../app/studio/block-selection.mjs";
import { removeBlocksByIds, commitHistory, undoHistory } from "../app/studio/studio-command-operations.mjs";

const paragraph = id => ({ id, type: "paragraph", text: id });
const blocks = [
  paragraph("first"),
  { id: "image", type: "image", src: "", alt: "" },
  { id: "spacer", type: "spacer", height: 24 },
  { id: "group", type: "group", layout: "stack", children: [paragraph("child-a"), { id: "button", type: "button", label: "Action", url: "", style: "primary" }, paragraph("child-b")] },
  { id: "second-group", type: "group", layout: "stack", children: [paragraph("child-c"), paragraph("child-d")] },
  paragraph("last"),
];

test("ranges include mixed non-text block types and preserve forward/backward equivalence", () => {
  assert.deepEqual(blockSelectionRange(blocks, "first", "spacer"), ["first", "image", "spacer"]);
  assert.deepEqual(blockSelectionRange(blocks, "spacer", "first"), ["first", "image", "spacer"]);
  assert.deepEqual(blockSelectionRange(blocks, "image", "missing"), []);
});

test("nested ranges across containers do not select ancestors or unrelated children", () => {
  const ids = blockSelectionRange(blocks, "child-b", "child-c");
  assert.deepEqual(ids, ["child-b", "child-c"]);
  const document = { blocks };
  const removed = removeBlocksByIds(document, ids);
  assert.deepEqual(removed.blocks[3].children.map(block => block.id), ["child-a", "button"]);
  assert.deepEqual(removed.blocks[4].children.map(block => block.id), ["child-d"]);
  assert.equal(document.blocks[3].children.length, 3);
});

test("parent and descendant IDs are normalised without excluding independent roots", () => {
  assert.deepEqual(normaliseBlockSelection(blocks, ["child-a", "group", "image", "group", "missing"]), ["image", "group"]);
  const removed = removeBlocksByIds({ blocks }, ["child-a", "group", "image", "group"]);
  assert.deepEqual(removed.blocks.map(block => block.id), ["first", "spacer", "second-group", "last"]);
});

test("atomic deletion restores the entire mixed selection in one undo", () => {
  const original = { id: "document", blocks };
  const history = commitHistory(original, []);
  const next = removeBlocksByIds(original, ["first", "image", "button"]);
  const restored = undoHistory(next, history.history, history.future);
  assert.deepEqual(restored.workspace, original);
  assert.deepEqual(restored.future, [next]);
  assert.equal(restored.history.length, 0);
});

test("removing columns keeps valid layouts and removes a layout whose every column was selected", () => {
  const columns = { id: "columns", type: "columns", children: [
    { id: "column-a", type: "column", width: 50, children: [paragraph("column-child-a")] },
    { id: "column-b", type: "column", width: 50, children: [paragraph("column-child-b")] },
  ] };
  const original = { blocks: [paragraph("before"), columns, paragraph("after")] };
  const partial = removeBlocksByIds(original, ["column-a"]);
  assert.deepEqual(partial.blocks[1].children.map(block => block.id), ["column-b"]);
  assert.deepEqual(removeBlocksByIds(original, ["column-a", "column-b"]).blocks.map(block => block.id), ["before", "after"]);
  assert.deepEqual(removeBlocksByIds(original, ["column-child-a", "column-child-b"]).blocks[1].children.map(block => block.children.length), [0, 0]);
});

test("empty and obsolete selections do not mutate the document or create history changes", () => {
  const document = { blocks };
  assert.equal(removeBlocksByIds(document, []), document);
  assert.equal(removeBlocksByIds(document, ["missing"]), document);
});

test("the empty appender is a virtual end boundary in both drag directions", () => {
  const upward = blockSelectionRange(blocks, null, "image");
  assert.deepEqual(blockSelectionRange(blocks, "image", null), upward);
  assert.deepEqual(normaliseBlockSelection(blocks, upward), ["image", "spacer", "group", "second-group", "last"]);
  assert.ok(upward.every(id => typeof id === "string"));
  const document = { blocks };
  const history = commitHistory(document, []);
  const removed = removeBlocksByIds(document, upward);
  assert.deepEqual(removed.blocks.map(block => block.id), ["first"]);
  assert.deepEqual(undoHistory(removed, history.history, history.future).workspace, document);
});

test("an appender-to-single-block range contains only the real block and empty documents remain unchanged", () => {
  assert.deepEqual(blockSelectionRange(blocks, null, "last"), ["last"]);
  assert.deepEqual(blockSelectionRange([], null, null), []);
  assert.deepEqual(blockSelectionRange(blocks, null, "missing"), []);
  assert.deepEqual(blockSelectionRange(blocks, null, null), []);
});

test("appender ranges starting inside a group preserve earlier siblings", () => {
  const selected = blockSelectionRange(blocks, "child-b", null);
  assert.deepEqual(normaliseBlockSelection(blocks, selected), ["child-b", "second-group", "last"]);
  const removed = removeBlocksByIds({ blocks }, selected);
  assert.deepEqual(removed.blocks[3].children.map(block => block.id), ["child-a", "button"]);
});
