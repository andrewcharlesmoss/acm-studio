import assert from "node:assert/strict";
import test from "node:test";
import {
  addDocumentToWorkspace,
  commitHistory,
  deleteDocumentFromWorkspace,
  duplicateBlockAt,
  duplicateDocumentWithIds,
  insertBlockAt,
  moveBlockAt,
  redoHistory,
  removeBlockById,
  undoHistory,
} from "../app/studio/studio-command-operations.mjs";

function document() {
  return { id: "post-1", kind: "post", title: "Post", blocks: [{ id: "a", type: "paragraph" }, { id: "b", type: "heading" }] };
}

test("block commands preserve order while inserting, moving, duplicating and removing", () => {
  const inserted = insertBlockAt(document(), { id: "c", type: "quote" }, 0);
  assert.deepEqual(inserted.blocks.map((block) => block.id), ["a", "c", "b"]);
  const moved = moveBlockAt(inserted, 2, 0);
  assert.deepEqual(moved.blocks.map((block) => block.id), ["b", "a", "c"]);
  const duplicated = duplicateBlockAt(moved, 1, (type) => `${type}-copy`);
  assert.deepEqual(duplicated.blocks.map((block) => block.id), ["b", "a", "paragraph-copy", "c"]);
  assert.deepEqual(removeBlockById(duplicated, "a").blocks.map((block) => block.id), ["b", "paragraph-copy", "c"]);
});

test("document commands add, duplicate and delete documents without losing the active selection", () => {
  const workspace = { activeDocumentId: "post-1", documents: [document()] };
  const copy = duplicateDocumentWithIds(document(), (kind) => `${kind}-2`, (type) => `${type}-2`);
  const withCopy = addDocumentToWorkspace(workspace, copy);
  assert.equal(withCopy.activeDocumentId, "post-2");
  assert.equal(withCopy.documents.length, 2);
  const afterDelete = deleteDocumentFromWorkspace(withCopy, "post-2");
  assert.equal(afterDelete.activeDocumentId, "post-1");
  assert.equal(afterDelete.documents.length, 1);
});

test("history supports undo and redo and clears redo after a new commit", () => {
  const first = { value: 1 };
  const second = { value: 2 };
  const third = { value: 3 };
  const committed = commitHistory(first, [], 60);
  const undone = undoHistory(second, committed.history, committed.future, 60);
  assert.equal(undone.workspace.value, 1);
  const redone = redoHistory(undone.workspace, undone.history, undone.future, 60);
  assert.equal(redone.workspace.value, 2);
  const newCommit = commitHistory(third, redone.history, 60);
  assert.deepEqual(newCommit.future, []);
});
