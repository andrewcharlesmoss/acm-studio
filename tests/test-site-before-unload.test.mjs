import assert from "node:assert/strict";
import test from "node:test";
import { shouldProtectTestSiteBeforeUnload } from "../app/studio/test-site/before-unload.ts";

test("a deliberate save-first site switch does not trigger the dirty-draft unload guard", () => {
  assert.equal(shouldProtectTestSiteBeforeUnload({ dirty: true, saving: false, promptRunning: false, editingPaused: true }), false);
});

test("ordinary dirty exits and in-flight saves or prompts remain protected", () => {
  assert.equal(shouldProtectTestSiteBeforeUnload({ dirty: true, saving: false, promptRunning: false, editingPaused: false }), true);
  assert.equal(shouldProtectTestSiteBeforeUnload({ dirty: true, saving: true, promptRunning: false, editingPaused: true }), true);
  assert.equal(shouldProtectTestSiteBeforeUnload({ dirty: false, saving: true, promptRunning: false, editingPaused: true }), true);
  assert.equal(shouldProtectTestSiteBeforeUnload({ dirty: false, saving: false, promptRunning: true, editingPaused: true }), true);
});
