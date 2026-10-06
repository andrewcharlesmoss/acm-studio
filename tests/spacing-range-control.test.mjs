import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { createRequire } from "node:module";
import vm from "node:vm";
import ts from "typescript";
import { resetGroupDimensionFields } from "../app/studio/blocks/group-dimensions.ts";

const require = createRequire(import.meta.url);
function load(file, overrides = {}, cache = new Map()) {
  file = resolve(file);
  if (cache.has(file)) return cache.get(file);
  const exports = {}; cache.set(file, exports);
  const source = ts.transpileModule(readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const dependency = id => Object.hasOwn(overrides, id) ? overrides[id] : id.startsWith(".")
    ? load(resolve(dirname(file), id + (id.endsWith("layout") ? ".ts" : ".tsx")), overrides, cache) : require(id);
  vm.runInNewContext(source, { exports, require: dependency });
  return exports;
}
const { SpacingRangeControl } = load("app/studio/controls/spacing-range-control.tsx");
const presets = [0, 8, 16, 24, 32, 48, 64, 96];

test("spacing range has eight Gutenberg-style positions and supports every step in both directions", () => {
  const changed = [];
  const input = SpacingRangeControl({ label: "Padding", presets, onChange: value => changed.push(value) });
  assert.equal(input.props.value, 0);
  assert.equal(input.props["aria-valuetext"], "Default");
  for (let index = 0; index < presets.length; index++) input.props.onChange({ target: { value: String(index) } });
  assert.deepEqual(changed, presets);
  for (let index = presets.length - 1; index >= 0; index--) input.props.onChange({ target: { value: String(index) } });
  assert.deepEqual(changed.slice(presets.length), [...presets].reverse());
  assert.equal(SpacingRangeControl({ label: "Padding", value: 0, presets, onChange() {} }).props.value, 0);
});

test("opening a range preserves a custom measurement and announces its actual value", () => {
  let writes = 0;
  const input = SpacingRangeControl({ label: "Margin", value: -12, presets, onChange() { writes++; } });
  assert.equal(writes, 0);
  assert.equal(input.props["aria-valuetext"], "-12 pixels, custom value");
  const units = SpacingRangeControl({ label: "Padding", value: 2, valueText: "2 rem, custom value", presets, onChange() {} });
  assert.equal(units.props["aria-valuetext"], "2 rem, custom value");
});

test("spacing ranges expose their keyboard bounds and disabled state", () => {
  const input = SpacingRangeControl({ label: "Block spacing", value: 24, presets, disabled: true, onChange() {} });
  assert.equal(typeof input.type, "function");
  assert.equal(input.props.min, 0);
  assert.equal(input.props.max, presets.length - 1);
  assert.equal(input.props.step, 1);
  assert.equal(input.props.disabled, true);
});

const group = { id: "group", type: "group", layout: "row", children: [], paddingX: 12, paddingY: 24, gap: 20, columnGap: 16, rowGap: 8, visualStyle: { margin: "8px", textColor: "#123456" } };

test("a Margin reset preserves legacy padding, layout gaps and unrelated styles", () => {
  const result = resetGroupDimensionFields(group, { textColor: "#123456" }, { padding: false, layout: false });
  assert.equal(result.paddingX, 12);
  assert.equal(result.paddingY, 24);
  assert.equal(result.gap, 20);
  assert.equal(result.columnGap, 16);
  assert.equal(result.rowGap, 8);
  assert.deepEqual(result.visualStyle, { textColor: "#123456" });
  assert.equal(group.visualStyle.margin, "8px");
});

test("Padding reset clears its legacy fields; whole Dimensions reset also clears gaps", () => {
  const padding = resetGroupDimensionFields(group, group.visualStyle, { padding: true, layout: false });
  assert.equal(padding.paddingX, undefined);
  assert.equal(padding.paddingY, undefined);
  assert.equal(padding.gap, 20);
  const section = resetGroupDimensionFields(group, { textColor: "#123456" }, { padding: true, layout: true });
  for (const field of ["paddingX", "paddingY", "gap", "columnGap", "rowGap"]) assert.equal(section[field], undefined);
  assert.equal(section.visualStyle.textColor, "#123456");
});

test("spacing labels distinguish named presets, unset, mixed and custom values", () => {
  const render = props => SpacingRangeControl({ label: "Padding", presets, onChange() {}, ...props }).props.tooltipText;
  assert.equal(render({ value: 32 }), "Medium");
  assert.equal(render({ value: 16 }), "X-Small");
  assert.equal(render({ value: 0 }), "None");
  assert.equal(render({}), "Default");
  assert.equal(render({ value: -12 }), "-12");
  assert.equal(render({ value: 32, valueText: "Mixed" }), "Mixed");
  assert.equal(render({ value: 32, valueText: "32 rem, custom value" }), "32 rem");
  assert.equal(render({ value: 10, presets: [0, 10, 20] }), "10");
});

test("range labels follow focus, thumb hover, drag cancellation and disabled state without writing values", () => {
  const states = []; let cursor = 0; let writes = 0;
  const { RangeControl } = load("app/studio/controls/range-control.tsx", {
    react: { useState(initial) { const index = cursor++; if (!(index in states)) states[index] = initial; return [states[index], next => { states[index] = next; }]; } },
  });
  const render = props => { cursor = 0; return RangeControl({ min: 0, max: 300, value: 150, onChange() { writes++; }, ...props }); };
  const input = tree => tree.props.children[0];
  const label = tree => tree.props.children[1];
  let tree = render(); assert.equal(label(tree), null);
  input(tree).props.onFocus({}); tree = render(); assert.equal(label(tree).props.children, "150");
  input(tree).props.onBlur({}); tree = render(); assert.equal(label(tree), null);
  input(tree).props.onPointerMove({ pointerType: "mouse", clientX: 100, currentTarget: { getBoundingClientRect: () => ({ left: 0, width: 200 }) } });
  tree = render(); assert.equal(label(tree).props.children, "150");
  input(tree).props.onPointerLeave({}); tree = render(); assert.equal(label(tree), null);
  input(tree).props.onPointerDown({}); tree = render(); assert.ok(label(tree));
  input(tree).props.onPointerCancel({}); tree = render(); assert.equal(label(tree), null);
  input(tree).props.onFocus({}); assert.equal(label(render({ disabled: true })), null);
  assert.equal(writes, 0);
  assert.equal(input(tree).props.type, "range");
});
