import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { loadProductionModule } from "./production-module.mjs";

const { CheckboxControl } = await loadProductionModule(new URL("../app/studio/controls/checkbox-control.tsx", import.meta.url));
const { RadioGroup } = await loadProductionModule(new URL("../app/studio/controls/radio-group.tsx", import.meta.url));
const options = [{ value: "a", label: "First" }, { value: "b", label: "Second", disabled: true }];

test("checkbox renders a labelled native input with checked and disabled states", () => {
  const html = renderToStaticMarkup(createElement(CheckboxControl, { label: "Example", checked: true, disabled: true, onChange() {} }));
  assert.match(html, /<label[^>]*><input[^>]*type="checkbox"[^>]*disabled=""[^>]*checked=""/);
  assert.match(html, /<span>Example<\/span><\/label>/);
  assert.doesNotMatch(html, /role="switch"/);
});

test("radio groups keep native names isolated and expose selection and individual disabled state", () => {
  const html = renderToStaticMarkup(createElement("div", null,
    createElement(RadioGroup, { label: "Group one", options, value: "a", onChange() {} }),
    createElement(RadioGroup, { label: "Group two", options, onChange() {} })));
  const inputs = [...html.matchAll(/<input[^>]*>/g)].map(match => match[0]);
  const names = inputs.map(input => input.match(/name="([^"]+)"/)[1]);
  assert.equal(names[0], names[1]);
  assert.equal(names[2], names[3]);
  assert.notEqual(names[0], names[2]);
  assert.match(inputs[0], /checked=""/);
  assert.match(inputs[1], /disabled=""/);
  assert.ok(inputs.slice(2).every(input => !input.includes('checked=""')));
  assert.equal((html.match(/role="radiogroup"/g) ?? []).length, 2);
  assert.match(html, /<legend[^>]*>Group one<\/legend>/);
});

test("disabled radio groups disable every choice while retaining their selection", () => {
  const html = renderToStaticMarkup(createElement(RadioGroup, { label: "Disabled", options, value: "b", disabled: true, onChange() {} }));
  assert.match(html, /<fieldset[^>]*disabled=""/);
  const inputs = [...html.matchAll(/<input[^>]*>/g)].map(match => match[0]);
  assert.ok(inputs.every(input => input.includes('disabled=""')));
  assert.match(inputs[1], /checked=""/);
});
