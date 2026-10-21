import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
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

test("button presentation preserves native radio semantics with rich visual labels and accessible names", () => {
  const html = renderToStaticMarkup(createElement(RadioGroup, { label: "Alignment", presentation: "buttons", value: "left", options: [{ value: "left", label: createElement("span", { "aria-hidden": true }, "L"), accessibleName: "Align Left", title: "Align Left" }, { value: "right", label: "R", accessibleName: "Align Right", disabled: true }], onChange() {} }));
  assert.match(html, /studio-radio-group--buttons/);
  assert.match(html, /<input type="radio" aria-label="Align Left"[^>]*checked=""/);
  assert.match(html, /<label[^>]*title="Align Left"/);
  assert.match(html, /<input type="radio" aria-label="Align Right"[^>]*disabled=""/);
  assert.doesNotMatch(html, /role="button"|tabindex=/);
  const legacy = renderToStaticMarkup(createElement(RadioGroup, { label: "Default", options, value: "a", onChange() {} }));
  assert.doesNotMatch(legacy, /studio-radio-group--buttons/);
});

test("an inherited button group remains initially unselected with one native name for keyboard entry", () => {
 const html = renderToStaticMarkup(createElement(RadioGroup, { label: "Letter Case", presentation: "buttons", options: [{ value: "none", label: "None" }, { value: "uppercase", label: "AB", accessibleName: "Uppercase" }], onChange() {} }));
 const inputs = [...html.matchAll(/<input[^>]*>/g)].map(match => match[0]);
 assert.equal(inputs.length, 2); assert.ok(inputs.every(input => !input.includes('checked=""')));
 assert.equal(inputs[0].match(/name="([^"]+)"/)[1], inputs[1].match(/name="([^"]+)"/)[1]);
 assert.ok(inputs.every(input => input.includes('type="radio"')));
});

test("segmented radio presentation retains an accessible hidden legend and native selection", () => {
 const html = renderToStaticMarkup(createElement(RadioGroup, { label: "Shadow type", presentation: "segmented", hideLabel: true, value: "a", options, onChange() {} }));
 assert.match(html, /studio-radio-group--segmented/);
 assert.match(html, /<legend class="visually-hidden"[^>]*>Shadow type<\/legend>/);
 assert.match(html, /aria-labelledby="[^"]+-label"/);
 assert.match(html, /type="radio"[^>]*checked=""/);
 assert.match(html, /type="radio"[^>]*disabled=""/);
});

test("button radio legends preserve the visually hidden one-pixel layout", () => {
 const css = readFileSync(new URL("../app/studio/controls/choice-controls.css", import.meta.url), "utf8");
 assert.match(css, /\.studio-radio-group--buttons > legend:not\(\.visually-hidden\)/);
 assert.doesNotMatch(css, /\.studio-radio-group--buttons > legend\s*\{/);
});

test("unframed radio choices own grey-to-dark hover without a fill while segmented and selected states remain distinct", () => {
 const css = readFileSync(new URL("../app/studio/controls/choice-controls.css", import.meta.url), "utf8");
 const hover = css.match(/\.studio-radio-group--buttons:not\(\.studio-radio-group--segmented\) > label:hover:not\(:has\(input:disabled, input:checked\)\)\s*\{([^}]*)\}/)?.[1];
 assert.match(hover ?? "", /background: transparent; color: #1E1E1E/);
 assert.match(css, /\.studio-radio-group--buttons:not\(\.studio-radio-group--segmented\) > label:not\(:has\(input:checked\)\)\s*\{\s*color: #717171/);
 assert.match(css, /\.studio-radio-group--segmented > label:hover:not\(:has\(input:disabled, input:checked\)\)\s*\{[^}]*background:/);
 assert.match(css, /\.studio-radio-group--buttons > label:has\(input:checked\)\s*\{[^}]*background: #1E1E1E;[^}]*color: white/);
});
