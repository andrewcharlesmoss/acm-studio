import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { createRequire } from "node:module";
import vm from "node:vm";
import ts from "typescript";
import { spacingRangeSettings } from "../app/studio/controls/spacing-range-settings.ts";

const require = createRequire(import.meta.url);
function load(file, react, cache = new Map()) {
  file = resolve(file);
  if (cache.has(file)) return cache.get(file);
  const exports = {}; cache.set(file, exports);
  const compiled = ts.transpileModule(readFileSync(file, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const dependency = id => {
    if (id === "react") return react;
    if (id.endsWith(".css")) return {};
    if (!id.startsWith(".")) return require(id);
    const base = resolve(dirname(file), id);
    return load([base, `${base}.ts`, `${base}.tsx`].find(existsSync), react, cache);
  };
  vm.runInNewContext(compiled, { exports, require: dependency });
  return exports;
}
function nodes(element) { return element && typeof element === "object" ? [element, ...[element.props?.children].flat(Infinity).flatMap(nodes)] : []; }
function fixture(value = "300px", { corners = false, negative = false } = {}) {
  let states = [], cursor = 0; const changes = [];
  const react = { ...require("react"), useId: () => "spacing-unit-test", useState(initial) { const index = cursor++; if (!(index in states)) states[index] = typeof initial === "function" ? initial() : initial; return [states[index], next => { states[index] = next; }]; } };
  const { BoxLengthSetting } = load("app/studio/box-length-setting.tsx", react);
  const tree = BoxLengthSetting({ label: corners ? "Radius" : "Padding", value, layout: "all", corners, presets: corners ? undefined : [0, 8, 16, 24, 32, 48, 64, 96], min: negative ? -100 : 0, max: corners ? 100 : 160, onChange() {} });
  const row = nodes(tree).find(node => typeof node.type === "function" && node.type.name === "BoxLengthRow");
  states = [];
  const render = nextValue => { cursor = 0; return nodes(row.type({ ...row.props, value: nextValue ?? value, onChange: next => changes.push(next) })); };
  const control = (tree, type) => tree.find(node => type === "range" ? typeof node.type === "function" && node.type.name === "RangeControl" : node.type === type);
  return { render, control, changes };
}

test("spacing ranges use the selected unit and decimal steps for em/rem", () => {
  for (const [unit, max, step] of [["px",300,1],["rem",10,0.1],["em",10,0.1],["%",100,1],["vw",100,1],["vh",100,1],["ch",100,1]]) {
    assert.deepEqual(spacingRangeSettings(unit, false), { min: 0, max, step });
    assert.equal(spacingRangeSettings(unit, true).min, -max);
  }
});

test("changing 300px to rem preserves the field value while the slider uses its new scale", () => {
  const f = fixture(); let tree = f.render();
  assert.equal(f.control(tree,"range").props.max, 300);
  f.control(tree,"select").props.onChange({ target: { value: "rem" } });
  assert.deepEqual(f.changes, ["300rem"]);
  tree = f.render("300rem");
  assert.equal(f.control(tree,"input").props.value, 300);
  assert.equal(f.control(tree,"input").props.max, undefined);
  const range = f.control(tree,"range");
  assert.equal(range.props.max, 10); assert.equal(range.props.value, 10); assert.equal(range.props.step, 0.1);
  assert.equal(range.props.tooltipText, "10");
  range.props.onChange({ target: { value: "9.9" } });
  assert.equal(f.changes.at(-1), "9.9rem");
});

test("manual custom values may exceed the slider; radius retains its separate bounds", () => {
  const f = fixture("1rem"); let tree = f.render();
  f.control(tree,"input").props.onChange({ target: { value: "25.5" } });
  tree = f.render(); f.control(tree,"input").props.onBlur();
  assert.equal(f.changes.at(-1), "25.5rem");
  const radius = fixture("20px", { corners: true });
  assert.equal(radius.control(radius.render(),"range").props.max, 100);
});

test("custom entry preserves negative margins, bounds padding at zero and rejects non-canonical lengths", () => {
  for (const [negative, entered, expected] of [[false,"-12","0rem"],[true,"-12","-12rem"],[false,"1e21",undefined],[false,"1e-7",undefined],[false,"Infinity",undefined]]) {
    const f = fixture("1rem", { negative }); let tree = f.render();
    f.control(tree,"input").props.onChange({ target: { value: entered } });
    tree = f.render(); f.control(tree,"input").props.onBlur();
    assert.equal(f.changes.at(-1), expected);
  }
});
