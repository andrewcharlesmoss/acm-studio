import assert from "node:assert/strict";
import test from "node:test";
import { createUniversalStylePreset } from "@acm/styles";
import { createStylePresetHistory, stylePresetHistoryReducer } from "../app/studio/ui/styles/style-preset-history.ts";

const change = (history, update, editKey) => stylePresetHistoryReducer(history, { type: "change", update, editKey });
const colour = value => preset => ({ ...preset, buttons: { ...preset.buttons, base: { ...preset.buttons.base, background: value } } });
const command = (history, type) => stylePresetHistoryReducer(history, { type });

test("continuous colour edits undo as one step, then redo the final value", () => {
  const baseline = createUniversalStylePreset();
  let history = createStylePresetHistory(baseline);
  history = change(history, colour("#FF0000"), "buttons.base.background");
  history = change(history, colour("#AA0000"), "buttons.base.background");
  assert.equal(history.past.length, 1);
  history = command(history, "undo");
  assert.deepEqual(history.present, baseline);
  assert.equal(history.past.length, 0);
  history = command(history, "redo");
  assert.equal(history.present.buttons.base.background, "#AA0000");
  assert.equal(history.future.length, 0);
  assert.equal(baseline.buttons.base.background, "#0088FF");
});

test("focus boundaries, different properties and resets create separate actions", () => {
  let history = createStylePresetHistory(createUniversalStylePreset());
  history = change(history, colour("#FF0000"), "buttons.base.background");
  history = command(history, "end-edit");
  history = change(history, colour("#AA0000"), "buttons.base.background");
  history = change(history, preset => ({ ...preset, layout: { ...preset.layout, spacing: 30 } }), "layout.spacing");
  const edited = history.present;
  history = change(history, () => createUniversalStylePreset());
  assert.equal(history.past.length, 4);
  assert.deepEqual(command(history, "undo").present, edited);
});

test("no-op edits retain redo and real edits discard the old branch", () => {
  let history = createStylePresetHistory(createUniversalStylePreset());
  history = change(history, colour("#FF0000"));
  history = command(history, "undo");
  const unchanged = change(history, preset => structuredClone(preset));
  assert.equal(unchanged, history);
  assert.equal(unchanged.future.length, 1);
  history = change(history, colour("#00FF00"), "buttons.base.background");
  assert.equal(history.future.length, 0);
  assert.equal(command(history, "redo"), history);
});

test("responsive overrides and inherited values round-trip without losing other styles", () => {
  const baseline = createUniversalStylePreset();
  let history = createStylePresetHistory(baseline);
  history = change(history, preset => ({ ...preset, typography: { ...preset.typography, body: { ...preset.typography.body, size: { ...preset.typography.body.size, tablet: { value: 2, unit: "rem" } } } } }));
  const tabletOverride = history.present;
  history = command(history, "undo");
  assert.deepEqual(history.present, baseline);
  history = command(history, "redo");
  assert.deepEqual(history.present, tabletOverride);
  assert.deepEqual(history.present.palette, baseline.palette);
});

test("history is bounded and empty history commands are harmless", () => {
  let history = createStylePresetHistory(createUniversalStylePreset());
  assert.equal(command(history, "undo"), history);
  assert.equal(command(history, "redo"), history);
  for (let spacing = 1; spacing <= 80; spacing++) history = change(history, preset => ({ ...preset, layout: { ...preset.layout, spacing } }));
  assert.equal(history.past.length, 60);
  for (let index = 0; index < 60; index++) history = command(history, "undo");
  assert.equal(history.present.layout.spacing, 20);
  assert.equal(history.future.length, 60);
});
