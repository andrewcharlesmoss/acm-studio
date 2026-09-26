import assert from "node:assert/strict";
import test from "node:test";
import { createKeyboardSvg } from "@acm/icons/keyboard";
import { createKeyboardCatalogueState, getKeyboardAppearancePreset, getKeyboardAppearancePresetName, getKeyboardColourControlKey, keyboardCatalogueReducer, KEYBOARD_APPEARANCE_PRESETS } from "../app/studio/ui/keyboard-appearance.mjs";

test("Studio keyboard preview starts with its filled Default preset", () => {
  assert.deepEqual(KEYBOARD_APPEARANCE_PRESETS.default, {
    colour: "#1C1C1E",
    borderColour: "#1C1C1E",
    fillColour: "#F2F2F7",
    matchBorder: true,
    transparent: false,
    dark: false,
  });
  assert.equal(getKeyboardAppearancePresetName({ ...KEYBOARD_APPEARANCE_PRESETS.default }), "default");
});

test("preset selection and reset share the same appearance definitions", () => {
  const initial = createKeyboardCatalogueState();
  assert.deepEqual(initial.appearance, KEYBOARD_APPEARANCE_PRESETS.default);
  const selectedDefault = keyboardCatalogueReducer(initial, { type: "set-preset", value: "default" });
  assert.deepEqual(selectedDefault.appearance, initial.appearance);
  assert.equal(getKeyboardAppearancePresetName(initial.appearance), "default");
  assert.equal(getKeyboardAppearancePreset("custom"), undefined);
});

test("reset restores custom, dark and transparent settings while preserving preview selections", () => {
  const initial = createKeyboardCatalogueState();
  let custom = keyboardCatalogueReducer(initial, { type: "set-platform", value: "windows" });
  custom = keyboardCatalogueReducer(custom, { type: "select-key", value: "windows" });
  custom = keyboardCatalogueReducer(custom, { type: "set-mode", value: "symbol" });
  custom = keyboardCatalogueReducer(custom, { type: "set-height", value: 512 });
  custom = keyboardCatalogueReducer(custom, { type: "set-preset", value: "dark" });
  custom = keyboardCatalogueReducer(custom, { type: "update-appearance", changes: { transparent: true, matchBorder: false, borderColour: "#C03562", fillColour: "#E6BD42" } });
  custom = keyboardCatalogueReducer(custom, { type: "set-symbol-colour", value: "#1273A9" });
  assert.equal(getKeyboardAppearancePresetName(custom.appearance), "custom");

  const reset = keyboardCatalogueReducer(custom, { type: "reset-appearance" });
  assert.deepEqual(reset.appearance, KEYBOARD_APPEARANCE_PRESETS.default);
  assert.deepEqual(
    { selected: reset.selected, platform: reset.platform, mode: reset.mode, height: reset.height },
    { selected: "windows", platform: "windows", mode: "symbol", height: 512 },
  );
  assert.equal(reset.status, "Colours reset to default.");
  assert.equal(reset.resetRevision, 1);
  assert.notEqual(getKeyboardColourControlKey("symbol", reset.resetRevision), getKeyboardColourControlKey("symbol", custom.resetRevision));
  assert.equal(getKeyboardAppearancePresetName(reset.appearance), "default");

  const repeatedReset = keyboardCatalogueReducer(reset, { type: "reset-appearance" });
  assert.deepEqual(repeatedReset.appearance, reset.appearance);
  assert.equal(repeatedReset.resetRevision, 2);
  assert.deepEqual(
    { selected: repeatedReset.selected, platform: repeatedReset.platform, mode: repeatedReset.mode, height: repeatedReset.height },
    { selected: reset.selected, platform: reset.platform, mode: reset.mode, height: reset.height },
  );
});

test("linked borders follow symbol colour changes and reset restores the link", () => {
  let state = createKeyboardCatalogueState();
  state = keyboardCatalogueReducer(state, { type: "set-symbol-colour", value: "#1273A9" });
  assert.equal(state.appearance.borderColour, "#1273A9");
  state = keyboardCatalogueReducer(state, { type: "set-border-match", value: false });
  state = keyboardCatalogueReducer(state, { type: "update-appearance", changes: { borderColour: "#C03562" } });
  state = keyboardCatalogueReducer(state, { type: "set-symbol-colour", value: "#E6BD42" });
  assert.equal(state.appearance.borderColour, "#C03562");
  state = keyboardCatalogueReducer(state, { type: "reset-appearance" });
  assert.equal(state.appearance.matchBorder, true);
  assert.equal(state.appearance.borderColour, state.appearance.colour);
});

test("Default exports filled keycaps in ACM colours while preserving dimensions and transparency outside", () => {
  const appearance = getKeyboardAppearancePreset("default");
  const svg = createKeyboardSvg("enter", {
    height: 128,
    colour: appearance.colour,
    borderColour: appearance.matchBorder ? appearance.colour : appearance.borderColour,
    fillColour: appearance.transparent ? "none" : appearance.fillColour,
  });
  assert.match(svg, /width="107" height="128" viewBox="0 0 60 72"/);
  assert.match(svg, /stroke="#1C1C1E" fill="#F2F2F7"/);
  assert.match(svg, /stroke="#1C1C1E" fill="#F2F2F7" \/>/);
  assert.match(svg, /fill="none"/);
});

test("Default PNG rasterisation receives the filled SVG at its existing dimensions", async (t) => {
  const { createSvgPng } = await import("../app/studio/ui/icon-download.mjs");
  const appearance = getKeyboardAppearancePreset("default");
  const svg = createKeyboardSvg("enter", {
    height: 128,
    colour: appearance.colour,
    borderColour: appearance.matchBorder ? appearance.colour : appearance.borderColour,
    fillColour: appearance.transparent ? "none" : appearance.fillColour,
  });
  const originals = new Map(["Image", "document"].map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  let rasterSource = "";
  let rasterDimensions = [];
  t.after(() => { for (const [key, descriptor] of originals) { if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key]; } });
  t.mock.method(URL, "createObjectURL", (blob) => { rasterSource = blob instanceof Blob ? "svg" : ""; return "blob:keyboard-default"; });
  t.mock.method(URL, "revokeObjectURL", () => {});
  Object.defineProperty(globalThis, "Image", { configurable: true, value: class { async decode() {} set src(value) { assert.equal(value, "blob:keyboard-default"); } } });
  Object.defineProperty(globalThis, "document", { configurable: true, value: { createElement: () => {
    const canvas = { width: 0, height: 0, getContext: () => ({ drawImage: () => rasterDimensions.push([canvas.width, canvas.height]) }), toBlob: (callback) => callback(new Blob(["png"], { type: "image/png" })) };
    return canvas;
  } } });

  const png = await createSvgPng(svg, 107, 128);
  assert.equal(rasterSource, "svg");
  assert.deepEqual(rasterDimensions, [[107, 128]]);
  assert.equal(png.type, "image/png");
  assert.match(svg, /stroke="#1C1C1E" fill="#F2F2F7"/);
  assert.match(svg, /fill="none"/);
});
