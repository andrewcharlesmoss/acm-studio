import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { interfaceStylePresetToCssVariables } from "@acm/styles";
import { createInterfaceStylePreset } from "./style-test-presets.mjs";
import { loadProductionModule } from "./production-module.mjs";

const settingsUrl = new URL("../app/studio/ui/styles/interface-style-settings.tsx", import.meta.url);
const { InterfaceStyleSettings } = await loadProductionModule(settingsUrl);
const noop = () => {};
const baseline = createInterfaceStylePreset();

function markup(section, preset = baseline) {
  return renderToStaticMarkup(createElement(InterfaceStyleSettings, { section, preset, baseline, disabled: false, onChange: noop, onReset: noop, onEndEdit: noop }));
}

function compile(url, dependencies = {}) {
  const code = ts.transpileModule(readFileSync(url, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const jsx = (type, props) => ({ type, props });
  const react = { useState: initial => [initial, noop], createElement: (type, props, ...children) => jsx(type, children.length ? { ...props, children } : props) };
  const require = name => name in dependencies ? dependencies[name] : name === "react" ? react : name === "react/jsx-runtime" ? { jsx, jsxs: jsx } : name === "@acm/styles" ? { interfaceStylePresetToCssVariables } : new Proxy({}, { get: (_, key) => key });
  return new Function("require", "exports", "document", `${code}\nreturn exports;`)(require, {}, { body: {} });
}
const component = compile(settingsUrl).InterfaceStyleSettings;
function nodes(node) {
  if (!node || typeof node !== "object") return [];
  if (Array.isArray(node)) return node.flatMap(nodes);
  if (typeof node.type === "function") return nodes(node.type(node.props));
  return [node, ...nodes(node.props?.children)];
}
function view(section, preset = structuredClone(baseline), disabled = false) {
  const changes = [], resets = [], edits = [];
  return { changes, resets, edits, nodes: nodes(component({ section, preset, baseline, disabled,
    onChange: (...args) => changes.push(args), onReset: path => resets.push(path), onEndEdit: () => edits.push("end"),
  })) };
}

test("all interface colour settings render the shared swatch and Hex trigger", () => {
  const colours = markup("colours");
  assert.equal((colours.match(/class="studio-colour-value-trigger"/g) ?? []).length, Object.keys(baseline.colours).length);
  assert.match(colours, /aria-label="Choose Primary Text"/);
  assert.match(colours, new RegExp(baseline.colours.primaryText));
  assert.doesNotMatch(colours, /type="text"/);
  assert.equal((markup("buttons").match(/class="studio-colour-value-trigger"/g) ?? []).length, 9);
  const field = view("colours").nodes.find(node => node.type === "ColourPicker" && node.props.label === "Primary Text");
  assert.equal(field.props.allowClear, false);
  assert.equal(field.props.enableAlpha, false);
  assert.equal(field.props.palette.find(entry => entry.key === "primaryText").colour, baseline.colours.primaryText);
  const active = view("colours");
  const colour = active.nodes.find(node => node.type === "ColourPicker");
  colour.props.onChange("#aabbcc");
  colour.props.onChange(undefined);
  colour.props.onChange("#12345678");
  assert.deepEqual(active.changes, [["colours.surface", "#AABBCC"]]);
});

test("visual metrics pair bounded sliders with exact pixel entry and accept zero", () => {
  for (const [section, expected] of [["typography", 2], ["fields", 1], ["buttons", 3]]) {
    const html = markup(section);
    assert.equal((html.match(/type="range"/g) ?? []).length, expected);
    assert.equal((html.match(/class="studio-number-unit-field /g) ?? []).length, expected);
  }
  const field = view("fields");
  const slider = field.nodes.find(node => node.type === "RangeControl");
  const exact = field.nodes.find(node => node.type === "NumberUnitField");
  assert.deepEqual([slider.props.min, slider.props.max], [0, 16]);
  assert.deepEqual(exact.props.units, ["px"]);
  slider.props.onPointerDown();
  slider.props.onChange({ target: { value: "0" } });
  slider.props.onChange({ target: { value: "8" } });
  slider.props.onPointerUp();
  exact.props.inputProps.onChange({ target: { value: "2.5" } });
  exact.props.inputProps.onChange({ target: { value: "" } });
  exact.props.inputProps.onChange({ target: { value: "17" } });
  exact.props.inputProps.onBlur();
  assert.deepEqual(field.changes, [["fields.radius", 0], ["fields.radius", 8], ["fields.radius", 2.5]]);
  assert.equal(field.edits.length, 3);
  const compact = view("typography").nodes.find(node => node.type === "RangeControl" && node.props["aria-label"] === "Compact controls font size slider");
  assert.equal(compact.props.min, 13);
  assert.equal(compact.props.max, 24);
});

test("font weights have readable names while retaining custom saved values", () => {
  const preset = structuredClone(baseline);
  preset.typography.control.weight = 450;
  const html = markup("typography", preset);
  assert.match(html, /Custom \(450\)/);
  assert.match(html, /Regular \(400\)/);
  assert.match(html, /Semibold \(600\)/);
  const typography = view("typography", preset);
  const weight = typography.nodes.find(node => node.type === "SelectControl" && node.props["aria-label"] === "Compact controls font weight");
  weight.props.onChange({ target: { value: "600" } });
  assert.deepEqual(typography.changes, [["typography.control.weight", 600]]);
});

test("hover settings show only the colours used by their treatment without clearing hidden values", () => {
  for (const [treatment, expected] of [["none", 0], ["text-icon", 1], ["background", 2]]) {
    const preset = structuredClone(baseline);
    for (const value of Object.values(preset.interactions)) value.treatment = treatment;
    const options = view("interactions", preset);
    assert.equal(options.nodes.filter(node => node.type === "ColourPicker").length, expected * Object.keys(preset.interactions).length);
    const select = options.nodes.find(node => node.type === "SelectControl");
    select.props.onChange({ target: { value: "none" } });
    assert.deepEqual(options.changes, [["interactions.textActions.treatment", "none"]]);
    assert.equal(preset.interactions.textActions.foreground, baseline.interactions.textActions.foreground);
  }
});

test("per-setting resets are available only for changed values and loading disables all controls", () => {
  const preset = structuredClone(baseline);
  preset.fields.radius = 8;
  const changed = view("fields", preset);
  const reset = changed.nodes.find(node => node.type === "StudioButton");
  assert.equal(reset.props.disabled, false);
  reset.props.onClick();
  assert.deepEqual(changed.resets, ["fields.radius"]);
  assert.equal(view("fields").nodes.find(node => node.type === "StudioButton").props.disabled, true);
  for (const section of ["colours", "typography", "fields", "buttons", "interactions"]) {
    const controls = view(section, preset, true).nodes;
    const disabled = controls.filter(node => ["ColourPicker", "SelectControl", "RangeControl"].includes(node.type) || node.type === "StudioButton" && node.props["aria-label"]?.startsWith("Reset "));
    assert.ok(disabled.every(node => node.props.disabled));
    assert.ok(controls.filter(node => node.type === "NumberUnitField").every(node => node.props.inputProps.disabled));
  }
});

test("draft tokens are attached to production previews rather than the settings form", async () => {
  const { InterfaceStyleSandbox } = await loadProductionModule(new URL("../app/studio/ui/styles/interface-style-sandbox.tsx", import.meta.url));
  const html = renderToStaticMarkup(createElement(InterfaceStyleSandbox));
  const form = html.match(/<section class="interface-style-page"[^>]*>/)?.[0];
  const preview = html.match(/<aside class="interface-style-preview"[^>]*>/)?.[0];
  assert.ok(form);
  assert.ok(preview);
  assert.doesNotMatch(form, /style=/);
  assert.match(preview, /--acm-ui-color-primary-text:/);
  assert.match(preview, /--acm-ui-size-control:/);
});

test("shared value-field picker opens the production palette with its draft interface scope", () => {
  const slots = []; let index = 0;
  const react = {
    useState(initial) { const slot = index++; if (!(slot in slots)) slots[slot] = initial; return [slots[slot], next => { slots[slot] = typeof next === "function" ? next(slots[slot]) : next; }]; },
    useRef: () => ({ current: null }), useId: () => "value-picker", useLayoutEffect: noop,
  };
  const { ColourPicker } = compile(new URL("../app/studio/controls/colour-picker.tsx", import.meta.url), {
    react, "react-dom": { createPortal: node => node }, "@acm/styles": { UNIVERSAL_STYLE_PRESET: { palette: {} } },
    "../ui/styles/interface-style-scope": { useInterfaceStylePortalStyle: () => ({ "--acm-ui-color-primary-text": "#ABCDEF" }) },
    "../overlays/use-overlay-dismiss": { useOverlayDismiss: noop },
  });
  const render = () => { index = 0; return nodes(ColourPicker({ label: "Interface text", presentation: "value-field", value: "#1C1C1E", onChange: noop, allowClear: false, palette: [] })); };
  render().find(node => node.props?.["aria-label"] === "Choose Interface text").props.onClick();
  const palette = render().find(node => node.props?.role === "dialog");
  assert.equal(palette.props["aria-label"], "Interface text colour palette");
  assert.equal(palette.props.style["--acm-ui-color-primary-text"], "#ABCDEF");
  assert.ok(!render().some(node => node.type === "StudioButton" && node.props.children === "Clear"));
});
