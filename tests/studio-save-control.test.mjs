import test from "node:test";
import assert from "node:assert/strict";
import { studioSaveControlState } from "../app/studio/studio-save-control.ts";

test("save control reflects the actual persistence status without treating failures as saved", () => {
  assert.equal(studioSaveControlState("Unsaved changes"), "draft");
  assert.equal(studioSaveControlState("Could not save locally"), "draft");
  assert.equal(studioSaveControlState("QuotaExceededError: storage is full"), "draft");
  assert.equal(studioSaveControlState("Saving…"), "saving");
  assert.equal(studioSaveControlState("Saved locally 09:42"), "saved");
  assert.equal(studioSaveControlState("Published locally just now"), "saved");
  assert.equal(studioSaveControlState("Draft saved locally"), "saved");
  assert.equal(studioSaveControlState("Post scheduled locally"), "saved");
  assert.equal(studioSaveControlState("Synced with another Test2 tab"), "saved");
  assert.equal(studioSaveControlState("Waiting for Test save handover…"), "unavailable");
  assert.equal(studioSaveControlState("Local saving unavailable — editing is paused"), "unavailable");
  assert.equal(studioSaveControlState("Preparing local workspace…"), "unavailable");
});
