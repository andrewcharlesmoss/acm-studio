import assert from "node:assert/strict";
import test from "node:test";
import { loadProductionModule } from "./production-module.mjs";

const { updateDocumentWithHistory } = await loadProductionModule(new URL("../app/studio/document-update-history.ts", import.meta.url));

test("document history records only accepted effective updates", () => {
  const original = { id: "doc", blocks: [] };
  let current = original; let records = 0; let calls = 0;
  const commit = update => { calls++; current = update(current); return true; };
  const record = () => { records++; };
  assert.equal(updateDocumentWithHistory(false, commit, record, doc => ({ ...doc, title: "Denied" })), false);
  assert.equal(calls, 0);
  assert.equal(updateDocumentWithHistory(true, commit, record, doc => ({ ...doc })), true);
  assert.equal(records, 0);
  assert.equal(updateDocumentWithHistory(true, commit, record, doc => ({ ...doc, title: "Accepted" })), true);
  assert.equal(current.title, "Accepted");
  assert.equal(records, 1);
  assert.equal(updateDocumentWithHistory(true, update => { update(current); return false; }, record, doc => ({ ...doc, title: "Rejected" })), false);
  assert.equal(records, 1);
  assert.equal(updateDocumentWithHistory(true, () => false, record, doc => ({ ...doc, title: "Not invoked" })), false);
  assert.equal(records, 1);
});
