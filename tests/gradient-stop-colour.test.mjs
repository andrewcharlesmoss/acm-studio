import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import ts from "typescript";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { loadProductionModule } from "./production-module.mjs";
const moduleUrl = new URL("../app/studio/controls/gradient-stop-colour.tsx", import.meta.url);
const { GradientStopColour } = await loadProductionModule(moduleUrl);
const colourFunctions = await loadProductionModule(new URL("../app/studio/controls/gradient-colour.ts", import.meta.url));

test("shared colour editor shows a compact format selector and an accessible prefixed hex field", () => {
  const html = renderToStaticMarkup(createElement(GradientStopColour, { colour: "#abcdef", onChange() {} }));
  assert.match(html, /class="studio-native-field gradient-colour-format-select"/);
  assert.match(html, /<span class="visually-hidden">Hex colour<\/span>/);
  assert.match(html, /class="gradient-colour-hex-prefix" aria-hidden="true">#<\/span>/);
  assert.match(html, /aria-label="Hex colour"[^>]*value="ABCDEF"/);
  assert.doesNotMatch(html, /<span>Hex colour<\/span>/);
});

test("prefixed hex editing retains validation, alpha, canonical values and format switching", () => {
  const code = ts.transpileModule(readFileSync(moduleUrl, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const slots = []; let index = 0; let value = "#FFFFFF";
  const react = { useState(initial) { const slot = index++; if (!(slot in slots)) slots[slot] = initial; return [slots[slot], next => { slots[slot] = next; }]; }, useRef(initial) { return { current: initial }; } };
  const jsx = (type, props) => ({ type, props });
  const require = name => name === "react" ? react : name === "react/jsx-runtime" ? { jsx, jsxs: jsx } : name.endsWith("gradient-colour") ? colourFunctions : new Proxy({}, { get: (_, key) => key });
  const loaded = new Function("require", "exports", `${code}\nreturn exports;`)(require, {});
  const render = (enableAlpha = true) => { index = 0; return loaded.GradientStopColour({ colour: value, enableAlpha, onChange(next) { value = next; } }); };
  const all = node => !node || typeof node !== "object" ? [] : Array.isArray(node) ? node.flatMap(all) : [node, ...all(node.props?.children)];
  let tree = render();
  const field = () => all(tree).find(node => node.props?.["aria-label"] === "Hex colour");
  field().props.onChange({ target: { value: "ab123480" } }); tree = render();
  assert.equal(field().props.value, "ab123480");
  field().props.onBlur({ target: { value: "ab123480" } }); tree = render();
  assert.equal(value, "#AB123480"); assert.equal(field().props.value, "AB123480");
  field().props.onBlur({ target: { value: "invalid" } }); assert.equal(value, "#AB123480");
  tree = render(false); field().props.onBlur({ target: { value: "12345680" } }); assert.equal(value, "#AB123480");
  all(tree).find(node => node.type === "SelectControl").props.onChange({ target: { value: "RGB" } }); tree = render();
  assert.equal(all(tree).some(node => node.props?.["aria-label"] === "Hex colour"), false);
  assert.equal(all(tree).filter(node => node.type === "NumberInput").length, 3);
});

test("live spectrum reports each captured pointer move before release", () => {
  const code = ts.transpileModule(readFileSync(moduleUrl, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const react = { useState: value => [value, () => {}], useRef: value => ({ current: value }) };
  const jsx = (type, props) => ({ type, props });
  const require = name => name === "react" ? react : name === "react/jsx-runtime" ? { jsx, jsxs: jsx } : name.endsWith("gradient-colour") ? colourFunctions : {};
  const loaded = new Function("require", "exports", `${code}\nreturn exports;`)(require, {});
  for (const deferred of [false, true]) {
    const values = [];
    const tree = loaded.GradientStopColour({ colour: "#0088FF", deferPointerChange: deferred, onChange: value => values.push(value) });
    const plane = tree.props.children[0];
    const target = { getBoundingClientRect: () => ({ left: 0, top: 0, width: 100, height: 100 }), setPointerCapture() {}, hasPointerCapture: () => true, releasePointerCapture() {} };
    const event = { currentTarget: target, pointerId: 1, clientX: 20, clientY: 20, stopPropagation() {} };
    plane.props.onPointerDown(event);
    plane.props.onPointerMove({ ...event, clientX: 70 });
    assert.equal(values.length, deferred ? 0 : 2);
    if (!deferred) assert.notEqual(values[0], values[1]);
  }
});

test("ColourPicker opts into live spectrum changes without changing its default", () => {
  const pickerUrl = new URL("../app/studio/controls/colour-picker.tsx", import.meta.url);
  const code = ts.transpileModule(readFileSync(pickerUrl, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const react = { useState: value => [value === false ? true : value, () => {}], useRef: value => ({ current: value }), useId: () => "picker", useLayoutEffect() {} };
  const jsx = (type, props) => ({ type, props });
  const noop = () => {};
  const require = name => name === "react" ? react : name === "react/jsx-runtime" ? { jsx, jsxs: jsx } : name === "react-dom" ? { createPortal: node => node } : name.endsWith("canonical-style-guide") ? { UNIVERSAL_STYLE_PRESET: { palette: {} } } : new Proxy({}, { get: (_, key) => key === "GradientStopColour" ? "Spectrum" : noop });
  const loaded = new Function("require", "exports", "document", `${code}\nreturn exports;`)(require, {}, { body: {} });
  const all = node => !node || typeof node !== "object" ? [] : Array.isArray(node) ? node.flatMap(all) : [node, ...all(node.props?.children)];
  for (const livePointerChanges of [undefined, true]) {
    const tree = loaded.ColourPicker({ label: "Example", value: "#0088FF", palette: [], livePointerChanges, onChange: noop });
    assert.equal(all(tree).find(node => node.type === "Spectrum").props.deferPointerChange, !livePointerChanges);
  }
  const settings = readFileSync(new URL("../app/studio/ui/styles/interface-style-settings.tsx", import.meta.url), "utf8");
  assert.match(settings, /<ColourPicker livePointerChanges/);
});
