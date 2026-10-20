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
function nodes(element) {
  if (!element || typeof element !== "object") return [];
  const rendered = element.type?.$$typeof === Symbol.for("react.forward_ref") ? element.type.render(element.props, null)
    : typeof element.type === "function" && element.type.name === "NumberUnitField" ? element.type(element.props) : element;
  return [element, ...(rendered !== element ? nodes(rendered) : [element.props?.children].flat(Infinity).flatMap(nodes))];
}
function fixture(value = "300px", { corners = false, negative = false, single = false, props = {} } = {}) {
  let states = [], cursor = 0; const changes = [];
  const react = { ...require("react"), useId: () => "spacing-unit-test", useState(initial) { const index = cursor++; if (!(index in states)) states[index] = typeof initial === "function" ? initial() : initial; return [states[index], next => { states[index] = typeof next === "function" ? next(states[index]) : next; }]; } };
  const { BoxLengthSetting } = load("app/studio/box-length-setting.tsx", react);
  const tree = BoxLengthSetting({ label: corners ? "Radius" : "Padding", value, layout: single ? "single" : "all", corners, presets: corners ? undefined : [0, 8, 16, 24, 32, 48, 64, 96], min: negative ? -100 : 0, max: corners ? 100 : 160, onChange: next => changes.push(next), ...props });
  const row = nodes(tree).find(node => typeof node.type === "function" && node.type.name === "BoxLengthRow");
  states = [];
  const render = nextValue => { cursor = 0; return nodes(row.type({ ...row.props, value: nextValue ?? value, onChange: next => changes.push(next) })); };
  const control = (tree, type) => tree.find(node => type === "range" ? typeof node.type === "function" && node.type.name === "RangeControl" : node.type === type);
  return { render, control, changes, tree, update: row.props.onChange };
}

test("spacing ranges use the selected unit and decimal steps for em/rem", () => {
  for (const [unit, max, step] of [["px",300,1],["rem",10,0.01],["em",10,0.01],["%",100,1],["vw",100,1],["vh",100,1],["ch",100,1]]) {
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
  assert.equal(range.props.max, 10); assert.equal(range.props.value, 10); assert.equal(range.props.step, 0.01);
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

 test("single spacing has one canonical row, no link action, and scalar updates", () => {
  const f = fixture("1.2rem", { single: true });
  assert.equal(nodes(f.tree).filter(node => node.type?.name === "BoxLengthRow").length, 1);
  assert.equal(nodes(f.tree).some(node => node.props?.["aria-label"]?.includes("sides")), false);
  f.update("2rem"); f.update("3vw"); f.update(undefined);
  assert.deepEqual(f.changes, ["2rem", "3vw", undefined]);
  let tree = f.render();
  f.control(tree, "select").props.onChange({ target: { value: "em" } });
  assert.equal(f.changes.at(-1), "1.2em");
 });

test("relative spacing sliders preserve hundredths in value and tooltip", () => {
  const f = fixture("1.2rem", { single: true });
  const range = f.control(f.render(), "range");
  assert.equal(range.props.step, 0.01);
  range.props.onChange({ target: { value: "5.84" } });
  assert.equal(f.changes.at(-1), "5.84rem");
  const updated = f.render("5.84rem");
  assert.equal(f.control(updated, "input").props.value, 5.84);
  assert.equal(f.control(updated, "range").props.tooltipText, "5.84");
});

test("spacing units can be restricted without changing existing consumers or legacy values", () => {
  const defaults = fixture("2ch");
  const defaultOptions = nodes(defaults.control(defaults.render(), "select")).filter(node => node.type === "option");
  assert.ok(defaultOptions.some(node => node.props.value === "ch" && !node.props.disabled));
  const six = ["px", "%", "em", "rem", "vw", "vh"];
  const react = { ...require("react"), useId: () => "restricted-unit-test", useState: initial => [typeof initial === "function" ? initial() : initial, () => {}] };
  const { BoxLengthSetting } = load("app/studio/box-length-setting.tsx", react);
  for (const value of ["2rem", "2ch"]) {
    const tree = BoxLengthSetting({ label: "Spacing", value, layout: "single", compact: true, unitOptions: six, min: 0, max: 160, onChange() {} });
    const row = nodes(tree).find(node => node.type?.name === "BoxLengthRow");
    const options = nodes(row.type(row.props)).filter(node => node.type === "option");
    assert.deepEqual(options.filter(node => !node.props.disabled).map(node => node.props.value), six);
    if (value === "2ch") assert.equal(options.find(node => node.props.value === "ch").props.disabled, true);
  }
});


test("Styles length presets preserve fluid lengths and custom percentage widths without changing editor defaults", () => {
  const presetValues = [{value:'0px',label:'None'},{value:'20px',label:'Small'},{value:'clamp(30px,5cqw,50px)',label:'Regular'}];
  const f = fixture('20px', {single:true, props:{presetValues,presets:undefined,canReset:false}});
  let range = f.control(f.render(), 'range');
  assert.equal(range.props.value,1);
  assert.equal(range.props['aria-valuetext'],'Small');
  assert.equal(range.props.style['--spacing-segments'],2, 'segmented track has its required paint geometry');
  assert.equal(range.props.tooltipText,'Small', 'tooltip shows the preset name rather than its index');
  range.props.onChange({target:{value:'2'}});
  assert.equal(f.changes.at(-1),'clamp(30px,5cqw,50px)');
  range = f.control(f.render(f.changes.at(-1)), 'range');
  assert.equal(range.props['aria-valuetext'],'Regular');
  assert.equal(range.props.value,2);
  const width = fixture('', {single:true,props:{presetUnit:'%',presets:[0,25,50,75,100]}});
  const preset = width.render().find(node => node.type?.name === 'SpacingRangeControl');
  preset.props.onChange(50);
  assert.equal(width.changes.at(-1),'50%');
  const gap = fixture('16px', {single:true,props:{initiallyCustom:true,singleAxis:'Vertical'}});
  assert.equal(gap.control(gap.render(),'input').props.value,16);
  assert.equal(gap.control(gap.render(),'range').props.value,16);
});
