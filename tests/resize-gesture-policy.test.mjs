import assert from "node:assert/strict";
import test from "node:test";
import { shouldCommitResizeGesture } from "../app/studio/resize-gesture-policy.ts";

test("resize commits on pointer release or capture loss and rolls back on explicit cancellation", () => {
  assert.equal(shouldCommitResizeGesture("pointer-up"), true);
  assert.equal(shouldCommitResizeGesture("capture-loss"), true);
  assert.equal(shouldCommitResizeGesture("pointer-cancel"), false);
  assert.equal(shouldCommitResizeGesture("escape"), false);
});
