import { createHostModuleEvaluator } from "./production-module.mjs";
import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { loadProductionModule } from "./production-module.mjs";
const { GradientPicker } = await loadProductionModule(new URL("../app/studio/controls/gradient-picker.tsx", import.meta.url));
const { editableBackgroundGradient } = await loadProductionModule(new URL("../app/content/background-gradient.ts", import.meta.url));

test("Library background specimen exposes both popup and inline shared gradient presentations", async () => {
  const { ControlSpecimen } = await loadProductionModule(new URL("../app/studio/ui/controls/control-specimen.tsx", import.meta.url));
  const { studioControlEntries } = await loadProductionModule(new URL("../app/studio/controls/library-catalogue.ts", import.meta.url));
  const entry = studioControlEntries.find(item => item.id === "background-selection");
  const html = renderToStaticMarkup(createElement(ControlSpecimen, { entry }));
  assert.match(html, /aria-label="Inline gradient example"/);
  assert.match(html, /paragraph-gradient-inline/);
  assert.match(html, /paragraph-background-mode-swatch/);
  assert.match(html, /Gradient angle dial/);
  assert.doesNotMatch(html, /Default gradients|paragraph-gradient-presets-label|Gradient: Ocean/);
  assert.match(html, /Gradient control point at position 0% with colour #B3D3F1/);
  assert.match(html, /Gradient control point at position 100% with colour #D3BBEF/);
});

test("inline editor renders stops and settings directly without a second picker or preset grid", () => {
  const html = renderToStaticMarkup(createElement(GradientPicker, { inline: true, active: true, onOpen() {}, onChange() {} }));
  assert.match(html, /paragraph-gradient-inline/);
  assert.match(html, /Gradient control point at position/);
  assert.match(html, /Gradient angle dial/);
  assert.match(html, /<option value="linear" selected="">Linear/);
  assert.doesNotMatch(html, /Background gradient|Close gradient picker|Default gradients|paragraph-gradient-presets-label|paragraph-background-mode-swatch/);
  const trigger = renderToStaticMarkup(createElement(GradientPicker, { active: true, onOpen() {}, onChange() {} }));
  assert.match(trigger, /paragraph-background-mode-swatch/);
  assert.doesNotMatch(trigger, /paragraph-gradient-bar/);
});

test("gradient editor omits the Default preset section while retaining selected gradient colours", () => {
  const empty = renderToStaticMarkup(createElement(GradientPicker, { inline: true, active: true, onOpen() {}, onChange() {} }));
  assert.doesNotMatch(empty, /Default gradients|paragraph-gradient-presets-label|Gradient: Ocean/);
  assert.match(empty, /#B3D3F1 0%, #D3BBEF 100%/);
  assert.doesNotMatch(empty, /#BAE6FD|#A5B4FC/);
  assert.match(empty, /aria-valuenow="0"/);

  const selected = renderToStaticMarkup(createElement(GradientPicker, { inline: true, value: "ocean", active: true, onOpen() {}, onChange() {} }));
  assert.doesNotMatch(selected, /Default gradients|paragraph-gradient-presets-label|Gradient: Ocean/);
  assert.match(selected, /#BAE6FD 0%, #A5B4FC 100%/);
  assert.match(selected, /aria-valuenow="135"/);
});

test("inline production handlers update type, angle, stop position and clear through the shared callback", () => {
  const source = readFileSync(new URL("../app/studio/controls/gradient-picker.tsx", import.meta.url), "utf8");
  const code = (source);
  const slots = []; let index = 0; let dismiss;
  const react = { useState(initial) { const slot = index++; if (!(slot in slots)) slots[slot] = initial; return [slots[slot], value => { slots[slot] = typeof value === "function" ? value(slots[slot]) : value; }]; }, useRef(initial) { return { current: initial }; }, useCallback(fn) { return fn; }, useId() { return "gradient"; }, useLayoutEffect() {} };
  const jsx = (type, props) => ({ type, props });
  const require = name => name === "react" ? react : name === "react/jsx-runtime" ? { jsx, jsxs: jsx, Fragment: "Fragment" } : name === "react-dom" ? { createPortal: node => node } : name.endsWith("background-gradient") ? { editableBackgroundGradient, DEFAULT_GRADIENTS: [] } : name.endsWith("paragraph-styles") ? { paragraphBackgroundGradientCss: () => "linear-gradient(0deg,white,black)" } : name.endsWith("use-overlay-dismiss") ? { useOverlayDismiss(options) { dismiss = options; } } : new Proxy({}, { get: (_, key) => key });
  const loaded = createHostModuleEvaluator(["require", "exports", "document", "requestAnimationFrame"], `${code}\nreturn exports;`)(require, {}, { body: {} }, callback => callback());
  let value = editableBackgroundGradient();
  const render = () => { index = 0; return loaded.GradientPicker({ inline: true, value, active: true, onOpen() {}, onChange(next) { value = next; } }); };
  const all = node => !node || typeof node !== "object" ? [] : Array.isArray(node) ? node.flatMap(all) : [node, ...all(node.props?.children)];
  let tree = render();
  assert.equal(dismiss.open, false, "inline body must not intercept its parent overlay dismissal");
  all(tree).find(node => node.type === "SelectControl").props.onChange({ target: { value: "radial" } });
  assert.equal(value.type, "radial");
  tree = render(); assert.equal(all(tree).some(node => node.props?.["aria-label"] === "Gradient angle"), false);
  all(tree).find(node => node.type === "SelectControl").props.onChange({ target: { value: "linear" } });
  tree = render(); all(tree).find(node => node.props?.["aria-label"] === "Gradient angle").props.onChange({ target: { value: "120" } });
  assert.equal(value.angle, 120);
  tree = render(); all(tree).find(node => node.props?.["aria-label"] === "Gradient angle dial").props.onKeyDown({ key: "Home", preventDefault() {} });
  assert.equal(value.angle, 0);
  tree = render(); const stop = all(tree).find(node => node.props?.className === "paragraph-gradient-stop");
  stop.props.onKeyDown({ key: "ArrowRight", preventDefault() {}, stopPropagation() {} });
  assert.equal(value.stops[0].position, 10);
  tree = render(); all(tree).find(node => node.props?.className === "paragraph-gradient-stop").props.onClick();
  tree = render(); assert.equal(dismiss.open, true);
  assert.ok(all(tree).some(node => node.props?.["aria-label"] === "Gradient control point colour"));
  dismiss.onEscape(); tree = render(); assert.equal(dismiss.open, false);
  all(tree).find(node => node.type === "StudioButton" && node.props.children === "Clear").props.onClick();
  assert.equal(value, undefined);
});
