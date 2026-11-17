import assert from "node:assert/strict";
import test from "node:test";
import { buildFiles } from "../scripts/build.mjs";
import { iconAddedAt, iconModifiedAt, iconNames } from "../dist/index.js";

test("every symbol has its recorded package addition timestamp", () => {
  assert.deepEqual(Object.keys(iconAddedAt).sort(), [...iconNames, "brand.linkedin", "brand.tiktok"].sort());
  for (const [name, timestamp] of Object.entries(iconAddedAt)) {
    assert.match(timestamp, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/, name);
    assert.ok(Number.isFinite(Date.parse(timestamp)), name);
  }
  assert.equal(iconAddedAt["action.undo"], "2026-09-18T23:38:47+01:00");
  assert.equal(iconAddedAt["brand.linkedin"], iconAddedAt["social.service.linkedin"]);
  assert.equal(iconAddedAt["brand.tiktok"], iconAddedAt["social.service.tiktok"]);
  assert.equal(iconAddedAt["social.icons"], "2026-09-28T18:40:03+01:00");
});

test("timestamp generation is deterministic and typed", () => {
  const files = buildFiles();
  assert.equal(files["dist/added-at.json"], JSON.stringify(iconAddedAt, null, 2) + "\n");
  assert.equal(files["dist/modified-at.json"], JSON.stringify(iconModifiedAt, null, 2) + "\n");
  assert.match(files["dist/index.js"], /export const iconAddedAt = /);
  assert.match(files["dist/index.js"], /export const iconModifiedAt = /);
  assert.match(files["dist/index.d.ts"], /iconAddedAt: Record<IconName, string>/);
  assert.match(files["dist/index.d.ts"], /iconModifiedAt: Record<IconName, string>/);
});

test("every symbol has a valid modification timestamp and aliases follow their canonical symbol", () => {
  assert.deepEqual(Object.keys(iconModifiedAt).sort(), [...iconNames, "brand.linkedin", "brand.tiktok"].sort());
  for (const [name, timestamp] of Object.entries(iconModifiedAt)) {
    assert.match(timestamp, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/, name);
    assert.ok(Number.isFinite(Date.parse(timestamp)), name);
    assert.ok(Date.parse(timestamp) >= Date.parse(iconAddedAt[name]), name);
  }
  assert.equal(iconModifiedAt["brand.linkedin"], iconModifiedAt["social.service.linkedin"]);
  assert.equal(iconModifiedAt["brand.tiktok"], iconModifiedAt["social.service.tiktok"]);
});

// This artwork changed after its introduction; keep the committed revision date.
test("records the latest inherited-state artwork revision", () => {
  assert.equal(iconModifiedAt["state.inherited"], "2026-11-02T16:20:39+00:00");
});
