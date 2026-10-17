import assert from "node:assert/strict";
import test from "node:test";
import { createPreviewHistory, parsePreviewNumber, previewHistoryReducer as reduce, resolvePreview } from "../app/studio/ui/styles/website-layout-preview-state.ts";

test("sample profile changes propagate and template reset restores live inheritance", () => {
  let state = createPreviewHistory();
  state = reduce(state, { type: "change", scope: "profile", overrides: { contentWidth: 800 } });
  assert.equal(resolvePreview(state.present, "journal").values.contentWidth, 800);
  state = reduce(state, { type: "change", scope: "journal", overrides: { contentWidth: 800 } });
  state = reduce(state, { type: "change", scope: "profile", overrides: { contentWidth: 900 } });
  assert.equal(resolvePreview(state.present, "journal").values.contentWidth, 800);
  assert.equal(resolvePreview(state.present, "portfolio").values.contentWidth, 900);
  assert.equal(resolvePreview(state.present, "journal").origins.contentWidth.scope, "template");
  state = reduce(state, { type: "change", scope: "journal", overrides: {} });
  assert.equal(resolvePreview(state.present, "journal").values.contentWidth, 900);
});
test("preview inputs reject blank, non-finite and invalid values and accept full bounds", () => {
  for (const value of ["", " ", "NaN", "Infinity", "0", "8193", "-1"]) assert.equal(parsePreviewNumber(value), null);
  assert.equal(parsePreviewNumber("8192"), 8192);
  assert.equal(parsePreviewNumber("1.25"), 1.25);
  assert.equal(parsePreviewNumber("0", true), 0);
  assert.equal(parsePreviewNumber("512", true), 512);
  assert.equal(parsePreviewNumber("513", true), null);
  assert.throws(() => reduce(createPreviewHistory(), { type: "change", scope: "profile", overrides: { contentWidth: 0 } }));
});
test("responsive gutters use independent provenance and Desktop fallback", () => {
  let state = createPreviewHistory();
  state = reduce(state, { type: "change", scope: "profile", overrides: { gutters: { desktop: 40, tablet: 20 } } });
  state = reduce(state, { type: "change", scope: "journal", overrides: { gutters: { mobile: 0 } } });
  assert.deepEqual(resolvePreview(state.present, "journal").values.gutters, { desktop: 40, tablet: 20, mobile: 0 });
  assert.equal(resolvePreview(state.present, "portfolio").values.gutters.mobile, 40);
});
test("coalesced history, undo, redo and undoable reset preserve isolated drafts", () => {
  const initial = createPreviewHistory();
  let state = reduce(initial, { type: "change", scope: "profile", overrides: { wideWidth: 1200 }, editKey: "wide" });
  state = reduce(state, { type: "change", scope: "profile", overrides: { wideWidth: 1300 }, editKey: "wide" });
  assert.equal(state.past.length, 1);
  state = reduce(state, { type: "undo" });
  assert.deepEqual(state.present, initial.present);
  state = reduce(state, { type: "redo" });
  assert.equal(state.present.profile.wideWidth, 1300);
  state = reduce(state, { type: "reset" });
  assert.deepEqual(state.present, initial.present);
  state = reduce(state, { type: "undo" });
  assert.equal(state.present.profile.wideWidth, 1300);
  assert.deepEqual(createPreviewHistory(), initial);
});
test("preview history is bounded and changing one sample leaves the others untouched", () => {
  let state = createPreviewHistory();
  for (let width = 1; width <= 80; width++) state = reduce(state, { type: "change", scope: "journal", overrides: { contentWidth: width } });
  assert.equal(state.past.length, 60);
  assert.deepEqual(state.present.profile, {});
  assert.deepEqual(state.present.portfolio, {});
});
