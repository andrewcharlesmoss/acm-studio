import { loadProductionModule } from "./production-module.mjs";
import assert from "node:assert/strict";

import test from "node:test";

// Compile the domain module for the same Node versions supported by the app,
// including those without built-in TypeScript stripping.
const { fitTableColumn, resizeTableColumn } = await loadProductionModule(new URL("../app/content/model.ts", import.meta.url));

function assertTotal(widths) {
  assert.ok(Math.abs(widths.reduce((sum, width) => sum + width, 0) - 100) < 1e-9);
}

test("fitting a column shares available space without changing other columns' order or the input", () => {
  const original = [40, 35, 25];
  const fitted = fitTableColumn(original, 1, 60);
  assert.equal(fitted[1], 60);
  assert.ok(fitted[0] > fitted[2]);
  assert.ok(fitted.every(width => width >= 6));
  assertTotal(fitted);
  assert.deepEqual(original, [40, 35, 25]);
});

test("fitting very long and empty content preserves minimum widths and table bounds", () => {
  assert.deepEqual(fitTableColumn([40, 35, 25], 0, 1000), [88, 6, 6]);
  const fitted = fitTableColumn([40, 35, 25], 2, 0);
  assert.equal(fitted[2], 6);
  assertTotal(fitted);
  assert.deepEqual(fitTableColumn([100], 0, 10), [100]);
  assertTotal(fitTableColumn([6, 88, 6], 1, 20));
});

test("dragging boundaries preserves total width and cannot collapse narrow split columns", () => {
  const widths = [3, 3, 94];
  const resized = resizeTableColumn(widths, 0, 50);
  assert.ok(resized.every(width => width > 0));
  assertTotal(resized);
  assert.deepEqual(widths, [3, 3, 94]);
  assert.deepEqual(resizeTableColumn([40, 35, 25], 0, 10), [50, 25, 25]);
});
