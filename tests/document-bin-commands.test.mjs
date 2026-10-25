import assert from "node:assert/strict";
import test from "node:test";
import { moveFixtureDocumentsToBin, restoreFixtureDocumentsFromBin } from "../app/studio/document-bin-commands.mjs";

const page = (id, extra = {}) => ({ id, kind: "page", title: id, status: "draft", pageOrder: 4, ...extra });
const workspace = () => ({ version: 29, activeDocumentId: "page-a", documents: [page("home"), page("page-a"), page("page-b")], bin: [], categories: [] });
const templates = () => ({ sets: [{ id: "set", templates: [{ id: "template", kind: "page" }] }], assignments: [{ documentId: "page-a", kind: "page", setId: "set", templateId: "template" }] });

test("bulk Bin is one immutable transaction, protects the homepage and preserves document metadata and assignments", () => {
  const current = workspace(); const store = templates();
  assert.throws(() => moveFixtureDocumentsToBin(current, store, ["home"], { protectedDocumentIds: ["home"], createId: () => "unused" }), /home page/);
  assert.equal(current.documents.length, 3);
  const transaction = moveFixtureDocumentsToBin(current, store, ["page-a", "page-b"], { createId: (() => { let id = 0; return () => `bin-${++id}`; })(), now: () => "2026-10-25T00:00:00.000Z" });
  assert.deepEqual(transaction.workspace.documents.map(item => item.id), ["home"]);
  assert.deepEqual(transaction.workspace.bin.map(item => item.id), ["bin-1", "bin-2"]);
  assert.equal(transaction.workspace.bin[0].document.pageOrder, 4);
  assert.deepEqual(transaction.workspace.bin[0].assignment, store.assignments[0]);
  assert.deepEqual(transaction.templates.assignments, []);
  assert.equal(current.documents.length, 3, "the source snapshot is not mutated");
});

test("bulk restore revalidates IDs and assignments before restoring all selected records", () => {
  const current = { ...workspace(), documents: [page("home")], bin: [{ id: "bin-a", deletedAt: "2026-10-25T00:00:00.000Z", document: page("page-a"), assignment: templates().assignments[0] }] };
  const restored = restoreFixtureDocumentsFromBin(current, templates(), ["bin-a"]);
  assert.deepEqual(restored.workspace.documents.map(item => item.id), ["home", "page-a"]);
  assert.equal(restored.workspace.documents[1].pageOrder, 4);
  assert.deepEqual(restored.templates.assignments, templates().assignments);
  assert.throws(() => restoreFixtureDocumentsFromBin(current, templates(), ["missing"]), /no longer available/);
  assert.throws(() => restoreFixtureDocumentsFromBin(current, { ...templates(), sets: [] }, ["bin-a"]), /assigned to this document/);
  assert.equal(current.bin.length, 1, "failed restore keeps the binned copy");
});
