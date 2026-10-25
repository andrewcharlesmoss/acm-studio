import { createHostModuleEvaluator } from "./production-module.mjs";
import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { loadProductionModule } from "./production-module.mjs";
const { LineHeightSetting, steppedLineHeight } = await loadProductionModule(new URL("../app/studio/controls/line-height-setting.tsx", import.meta.url));
const nodes = element => !element || typeof element !== "object" ? [] : Array.isArray(element) ? element.flatMap(nodes) : [element, ...nodes(element.props?.children)];

test("legacy text mode preserves CSS lengths and clear behaviour", () => {
 const changes = [];
 const tree = LineHeightSetting({ value: "1.5em", onChange: value => changes.push(value) });
 const input = nodes(tree).find(node => node.props?.inputMode === "decimal");
 input.props.onChange({ target: { value: "24px" } }); input.props.onChange({ target: { value: "" } });
 assert.deepEqual(changes, ["24px", undefined]);
 const html = renderToStaticMarkup(createElement(LineHeightSetting, { value: "1.5em", onChange() {} }));
 assert.match(html, /type="text"[^>]*value="1.5em"/); assert.doesNotMatch(html, /Increase|Decrease|type="number"/);
});
test("unitless stepper increments, clamps, exposes limits and can clear", () => {
 assert.equal(steppedLineHeight("1.4", 1), "1.5");
 assert.equal(steppedLineHeight("1.5", -1), "1.4");
 assert.equal(steppedLineHeight("0.1", -1), "0.1");
 assert.equal(steppedLineHeight("10", 1), "10");
 assert.equal(steppedLineHeight(undefined, 1), "1.6");

 const html = renderToStaticMarkup(createElement(LineHeightSetting, { stepper: true, label: "Line Height", value: "0.1", onChange() {} }));
 assert.match(html, /type="number"/); assert.match(html, /aria-label="Decrease Line Height"[^>]*disabled=""/);
 const disabled = renderToStaticMarkup(createElement(LineHeightSetting, { stepper: true, disabled: true, value: "1.5", onChange() {} }));
 assert.equal((disabled.match(/disabled=""/g) ?? []).length, 3);
});

function stepperHarness() {
 const source = readFileSync(new URL("../app/studio/controls/line-height-setting.tsx", import.meta.url), "utf8");
 const code = (source);
 const slots = []; let index = 0; let dirty = false;
 const useState = initial => { const id = index++; if (!(id in slots)) slots[id] = initial; return [slots[id], next => { const value = typeof next === "function" ? next(slots[id]) : next; if (value !== slots[id]) { slots[id] = value; dirty = true; } }]; };
 const jsx = (type, props) => ({ type, props });
 const require = name => name === "react" ? { useState } : name === "react/jsx-runtime" ? { jsx, jsxs: jsx } : name.endsWith("native-fields") ? { TextInput: "input", NumberInput: "input" } : name.endsWith("button") ? { StudioButton: "button" } : name === "@acm/icons/react" ? { AcmIcon: "svg" } : {};
 const component = createHostModuleEvaluator(["require", "exports"], `${code}\nreturn exports.LineHeightSetting;`)(require, {});
 const changes = [];
 const props = { value: "1.4", label: "Line Height", stepper: true, onChange: value => { changes.push(value); props.value = value; } };
 function render() { let tree; do { dirty = false; index = 0; tree = component(props); if (typeof tree.type === "function") tree = tree.type(tree.props); } while (dirty); return tree; }
 return { props, changes, input: () => nodes(render()).find(node => node.type === "input"), render };
}

test("the production stepper preserves incomplete decimal drafts and resynchronises history", () => {
 const fixture = stepperHarness();
 for (const raw of ["", "0", "0.", "0.8"]) {
  fixture.input().props.onChange({ target: { value: raw } });
  assert.equal(fixture.input().props.value, raw);
 }
 assert.deepEqual(fixture.changes, []);
 fixture.input().props.onBlur();
 assert.deepEqual(fixture.changes, ["0.8"]);
 assert.equal(fixture.input().props.value, "0.8");
 fixture.props.value = "1.4";
 assert.equal(fixture.input().props.value, "1.4", "Undo updates the input without a remount");
 fixture.input().props.onChange({ target: { value: "100" } });
 assert.equal(fixture.input().props.value, "100", "typing is not clamped mid-entry");
 fixture.input().props.onBlur(); assert.equal(fixture.input().props.value, "10");
 fixture.input().props.onChange({ target: { value: "" } }); fixture.input().props.onBlur();
 assert.equal(fixture.props.value, undefined);
 const increase = nodes(fixture.render()).find(node => node.props?.["aria-label"] === "Increase Line Height");
 increase.props.onClick(); assert.equal(fixture.input().props.value, "1.6");
});

test('integer Styles steppers begin at the supplied inherited default', () => {
 assert.equal(steppedLineHeight(undefined, 1, 1, 6, 1, 1), '2');
 assert.equal(steppedLineHeight(undefined, -1, 1, 6, 1, 1), '1');
 assert.equal(steppedLineHeight('6', 1, 1, 6, 1, 1), '6');
 const html = renderToStaticMarkup(createElement(LineHeightSetting, { stepper: true, label: 'Columns', min: 1, max: 6, step: 1, defaultValue: 1, placeholder: '', onChange() {} }));
 assert.match(html, /aria-label="Columns"[^>]*min="1"[^>]*max="6"[^>]*step="1"/);
 assert.match(html, /aria-label="Increase Columns"/);
});
