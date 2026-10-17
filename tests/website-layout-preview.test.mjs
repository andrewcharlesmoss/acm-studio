import assert from "node:assert/strict";
import test from "node:test";
import { createPreviewHistory, parsePreviewNumber, previewHistoryReducer as reduce, resolvePreview } from "../app/studio/ui/styles/website-layout-preview-state.ts";

test("sample profile changes propagate and template reset restores live inheritance", () => {
  let state = createPreviewHistory();
  state = reduce(state, { type: "change", scope: "profile", overrides: { ...state.present.profile, contentWidth: 800 } });
  assert.equal(resolvePreview(state.present, "journal").values.contentWidth, 800);
  state = reduce(state, { type: "change", scope: "journal", overrides: { contentWidth: 800 } });
  state = reduce(state, { type: "change", scope: "profile", overrides: { ...state.present.profile, contentWidth: 900 } });
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
test("responsive gutters inherit independent canonical viewport values", () => {
  let state = createPreviewHistory();
  state = reduce(state, { type: "change", scope: "profile", overrides: { ...state.present.profile, gutters: { desktop: 40, tablet: 20, mobile: 24 } } });
  state = reduce(state, { type: "change", scope: "journal", overrides: { gutters: { mobile: 0 } } });
  assert.deepEqual(resolvePreview(state.present, "journal").values.gutters, { desktop: 40, tablet: 20, mobile: 0 });
  assert.equal(resolvePreview(state.present, "portfolio").values.gutters.mobile, 24);
});
test("coalesced history, undo, redo and undoable reset preserve isolated drafts", () => {
  const initial = createPreviewHistory();
  let state = reduce(initial, { type: "change", scope: "profile", overrides: { ...initial.present.profile, wideWidth: 1200 }, editKey: "wide" });
  state = reduce(state, { type: "change", scope: "profile", overrides: { ...state.present.profile, wideWidth: 1300 }, editKey: "wide" });
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
  assert.deepEqual(state.present.profile, createPreviewHistory().present.profile);
  assert.deepEqual(state.present.portfolio, {});
});

test("shared profile owns complete canonical values without a defaults parent", () => {
  const state = createPreviewHistory();
  assert.deepEqual(state.present.profile, { siteWidth: { mode: "full" }, contentWidth: 720, wideWidth: 1120, gutters: { desktop: 24, tablet: 24, mobile: 24 } });
  const resolved = resolvePreview(state.present, "profile");
  for (const key of ["siteWidth", "contentWidth", "wideWidth"]) assert.equal(resolved.origins[key].scope, "profile");
  for (const device of ["desktop", "tablet", "mobile"]) {
    assert.equal(resolved.origins.gutters[device].scope, "profile");
    assert.equal(resolved.origins.gutters[device].viewport, device);
  }
});

test("canonical profile rejects missing values and incomplete devices", () => {
  const state = createPreviewHistory();
  for (const key of ["siteWidth", "contentWidth", "wideWidth", "gutters"]) {
    const incomplete = { ...state.present.profile }; delete incomplete[key];
    assert.throws(() => reduce(state, { type: "change", scope: "profile", overrides: incomplete }));
  }
  for (const device of ["desktop", "tablet", "mobile"]) {
    const incomplete = { ...state.present.profile, gutters: { ...state.present.profile.gutters } }; delete incomplete.gutters[device];
    assert.throws(() => reduce(state, { type: "change", scope: "profile", overrides: incomplete }));
  }
});
test("canonical gutter reset restores only that device and remains undoable", () => {
  const initial = createPreviewHistory();
  let state = reduce(initial, { type: "change", scope: "profile", overrides: { ...initial.present.profile, gutters: { desktop: 40, tablet: 20, mobile: 10 } } });
  state = reduce(state, { type: "change", scope: "profile", overrides: { ...state.present.profile, gutters: { ...state.present.profile.gutters, tablet: initial.present.profile.gutters.tablet } } });
  assert.deepEqual(state.present.profile.gutters, { desktop: 40, tablet: 24, mobile: 10 });
  assert.deepEqual(reduce(state, { type: "undo" }).present.profile.gutters, { desktop: 40, tablet: 20, mobile: 10 });
});

test("initial and updated profiles detach nested canonical values", () => {
  const first = createPreviewHistory();
  const second = createPreviewHistory();
  assert.notEqual(first.present.profile, second.present.profile);
  assert.notEqual(first.present.profile.siteWidth, second.present.profile.siteWidth);
  assert.notEqual(first.present.profile.gutters, second.present.profile.gutters);
  const incoming = { siteWidth: { mode: "max", maxWidth: 1440 }, contentWidth: 800, wideWidth: 1200, gutters: { desktop: 40, tablet: 20, mobile: 10 } };
  const updated = reduce(first, { type: "change", scope: "profile", overrides: incoming });
  incoming.siteWidth.maxWidth = 1600; incoming.gutters.mobile = 99;
  assert.equal(updated.present.profile.siteWidth.maxWidth, 1440);
  assert.equal(updated.present.profile.gutters.mobile, 10);
  assert.deepEqual(first.present.profile, second.present.profile);
});
