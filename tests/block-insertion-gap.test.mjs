import assert from "node:assert/strict";
import test from "node:test";
import { blockInsertionGap } from "../app/studio/block-insertion-gap.ts";

test("insertion hit areas stay entirely inside actual block gaps", () => {
  for (const gap of [0, 5, 20, 30, 80]) {
    const result = blockInsertionGap(100, 100 + gap, 100);
    assert.ok(result.top >= 0);
    assert.ok(result.top + result.height <= gap);
    assert.ok(result.height <= 30);
    assert.equal(result.top + result.height / 2, gap / 2);
  }
});

test("touching and overlapping blocks have no pointer hit area", () => {
  assert.equal(blockInsertionGap(100, 100, 100).height, 0);
  assert.equal(blockInsertionGap(110, 100, 100).height, 0);
});

test("zoom preserves the same gap in CSS coordinates", () => {
  assert.deepEqual(blockInsertionGap(200, 240, 200, 2), blockInsertionGap(100, 120, 100));
});

test("toolbar spacing and centred grid tracks use the actual gap rather than wrapper origin", () => {
  const result = blockInsertionGap(100, 158, 138);
  assert.equal(138 + result.top, 114);
  assert.equal(138 + result.top + result.height, 144);
});
