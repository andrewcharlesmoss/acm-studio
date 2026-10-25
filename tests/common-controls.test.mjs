import assert from "node:assert/strict";
import test from "node:test";
import { createElement as h } from "react";
import { renderToStaticMarkup as render } from "react-dom/server";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { loadProductionModule } from "./production-module.mjs";
import { auditControlLibraryLinks, inspectControlSource } from "../scripts/check-control-library-links.mjs";

const fields = await loadProductionModule(new URL("../app/studio/controls/native-fields.tsx", import.meta.url));
const { FormField } = await loadProductionModule(new URL("../app/studio/controls/form-field.tsx", import.meta.url));
const { NumberUnitField } = await loadProductionModule(new URL("../app/studio/controls/number-unit-field.tsx", import.meta.url));
const { RangeControl } = await loadProductionModule(new URL("../app/studio/controls/range-control.tsx", import.meta.url));
const { StudioButton } = await loadProductionModule(new URL("../app/studio/controls/button.tsx", import.meta.url));
const { StudioTooltipGroup } = await loadProductionModule(new URL("../app/studio/controls/tooltip-group.tsx", import.meta.url));
const { FontFamilySelect } = await loadProductionModule(new URL("../app/studio/controls/font-family-setting.tsx", import.meta.url));
const { controlLibraryLinks } = await loadProductionModule(new URL("../app/studio/controls/control-library-links.ts", import.meta.url));
const { studioControlEntries } = await loadProductionModule(new URL("../app/studio/controls/library-catalogue.ts", import.meta.url));
const { CommonFieldSpecimen, commonFieldIds } = await loadProductionModule(new URL("../app/studio/ui/controls/common-field-specimens.tsx", import.meta.url));

test("shared native fields preserve native constraints, semantics and Library links", () => {
  for (const [component, type, id] of [[fields.TextInput, "email", "text-input"], [fields.SearchInput, "search", "search-field"], [fields.NumberInput, "number", "number-field"]]) {
    const html = render(h(component, { ...(type === "email" ? { type } : {}), id: "field", name: "example", defaultValue: "10", className: "feature-field", readOnly: true, disabled: true, required: true, min: 0, max: 100, step: 5 }));
    for (const attribute of [`type="${type}"`, 'id="field"', 'name="example"', 'value="10"', 'readOnly=""', 'disabled=""', 'required=""', 'min="0"', 'max="100"', 'step="5"', 'class="studio-native-field feature-field"', `data-studio-library-href="${controlLibraryLinks[id]}"`]) assert.ok(html.includes(attribute), attribute);
  }
  const text = render(h(fields.TextArea, { rows: 3, maxLength: 120, defaultValue: "First\nSecond", readOnly: true }));
  assert.match(text, /rows="3"/); assert.match(text, /maxLength="120"/); assert.match(text, />First\nSecond<\/textarea>/);
  const select = render(h(fields.SelectControl, { defaultValue: "b", disabled: true }, h("option", { value: "a", disabled: true }, "Unavailable"), h("optgroup", { label: "Group" }, h("option", { value: "b" }, "Selected"))));
  assert.match(select, /<select[^>]*disabled=""/); assert.match(select, /<option value="a" disabled=""/); assert.match(select, /<optgroup label="Group"><option value="b" selected=""/);
});

test("FormField associates label, description and owner-supplied error without ID collisions", () => {
  const html = render(h("div", null, ...[1, 2].map(key => h(FormField, { key, label: "Label", description: "Help", error: "Required" }, attrs => h(fields.TextInput, { ...attrs, required: true })))));
  const ids = [...html.matchAll(/ id="([^"]+)"/g)].map(match => match[1]);
  assert.equal(ids.length, 6); assert.equal(new Set(ids).size, 6);
  for (const id of ids.filter(id => !id.endsWith("-help") && !id.endsWith("-error"))) {
    assert.ok(html.includes(`for="${id}"`)); assert.ok(html.includes(`aria-describedby="${id}-help ${id}-error"`));
  }
  assert.equal((html.match(/aria-invalid="true"/g) ?? []).length, 2);
  assert.equal((html.match(/role="alert"/g) ?? []).length, 2);
});

test("composed production controls link their canonical entries and retain native children", () => {
  const html = render(h(NumberUnitField, { inputProps: { "aria-label": "Size", value: 24, readOnly: true, step: 1 }, unitProps: { "aria-label": "Unit", defaultValue: "px" }, units: ["px", "rem"] }));
  for (const id of ["number-unit-field", "number-field", "select-dropdown"]) assert.ok(html.includes(controlLibraryLinks[id]));
  assert.match(html, /type="number"/); assert.match(html, /<select/);
  assert.ok(render(h(RangeControl, { "aria-label": "Range", value: 50, readOnly: true })).includes(controlLibraryLinks["slider-foundation"]));
  assert.ok(render(h(StudioButton, { disabled: true }, "Action")).includes(controlLibraryLinks.button));
  assert.ok(render(h(StudioButton, { variant: "text" }, "Text")).includes(controlLibraryLinks["text-action"]));
  assert.ok(render(h(StudioTooltipGroup, null, h("button", { "data-studio-tooltip": "Help" }, "Action"))).includes(controlLibraryLinks.tooltip));
});

test("number-unit field centres the unit and outlines it on hover without adding a background fill", () => {
  const css = readFileSync(new URL("../app/studio/controls/number-unit-field.css", import.meta.url), "utf8");
  assert.match(css, /studio-number-unit-field > select[^}]*outline: 1px solid transparent; outline-offset: -4px;/);
  assert.match(css, /studio-number-unit-field > select[^}]*text-align: center; text-align-last: center;/);
  assert.match(css, /\.studio-number-unit-field > select:not\(:disabled\):hover \{ outline-color: var\(--studio-range-accent, var\(--gutenberg-accent, #3858e9\)\); \}/);
  const metadata = studioControlEntries.find(entry => entry.id === "number-unit-field");
  assert.match(metadata.states, /blue unit outline on hover/);
});

test("FontFamilySelect keeps native selection by default and opts into font previews explicitly", () => {
  const options = [{ value: "", label: "Default" }, { value: "Inter", label: "Inter" }, { value: "Literata", label: "Literata" }];
  const native = render(h(FontFamilySelect, { value: "Inter", options, onChange: () => {} }));
  assert.match(native, /<label><span>Font<\/span><select/);
  assert.match(native, /<option value="Inter" selected="">Inter<\/option>/);
  assert.doesNotMatch(native, /aria-haspopup="menu"/);

  const preview = render(h(FontFamilySelect, { value: "Literata", options, previewOptions: true, onChange: () => {} }));
  assert.match(preview, />Font<\/span>/);
  assert.match(preview, /aria-haspopup="menu"/);
  assert.match(preview, /Literata/);
  assert.doesNotMatch(preview, /<select/);
  const disabled = render(h(FontFamilySelect, { value: "Inter", options, previewOptions: true, disabled: true, onChange: () => {} }));
  assert.match(disabled, /<button[^>]*disabled=""/);
  assert.match(disabled, /aria-expanded="false"/);
});

test("shared Font Default stays controlled after clearing an authored value in native and preview dropdowns", () => {
  const options = [{ value: "", label: "Default" }, { value: "Inter", label: "Inter" }, { value: "Literata", label: "Literata" }];
  for (const previewOptions of [false, true]) {
    let value = "Literata";
    const props = () => ({ value, options, previewOptions, onChange: next => { value = next || undefined; } });
    const choose = next => {
      const element = FontFamilySelect(props());
      if (previewOptions) element.props.onChange(next);
      else element.props.children[1].props.onChange({ target: { value: next } });
    };
    choose("");
    assert.equal(value, undefined);
    const cleared = render(h(FontFamilySelect, props()));
    if (previewOptions) {
      const element = FontFamilySelect(props());
      assert.equal(element.props.value, "");
      assert.deepEqual(element.props.options.map(option => option.value), ["", "Inter", "Literata"]);
      assert.match(cleared, /id="[^"]+-value">Default<\/span>/);
    } else assert.match(cleared, /<option value="" selected="">Default<\/option>/);
    choose("Inter");
    assert.equal(value, "Inter");
    choose("");
    assert.equal(value, undefined);
  }
});

test("Font controls preserve explicit and imported families without adding a Default choice to required lists", () => {
  const options = [{ value: "Inter", label: "Inter" }];
  for (const previewOptions of [false, true]) {
    const html = render(h(FontFamilySelect, { value: "Imported Family", options, previewOptions, onChange() {} }));
    assert.match(html, /Imported Family/);
    assert.doesNotMatch(html, /Default/);
  }
});

test("Library Font specimen demonstrates shared unset selections and inherited sample rendering", async () => {
  const { ControlSpecimen } = await loadProductionModule(new URL("../app/studio/ui/controls/control-specimen.tsx", import.meta.url));
  const entry = studioControlEntries.find(entry => entry.id === "font-family");
  const html = render(h(ControlSpecimen, { entry }));
  assert.match(html, /<option value="" selected="">Default<\/option>/);
  assert.match(html, /id="[^"]+-value">Default<\/span>/);
  assert.match(html, /Font Override: Default \(inherits Inter\)/);
  assert.match(html, /font-family:Inter,[^"]*sans-serif/);
});

test("all common-control specimens render real controls and registered catalogue entries", () => {
  const ids = new Set(studioControlEntries.map(entry => entry.id));
  for (const href of Object.values(controlLibraryLinks)) assert.ok(ids.has(href.split("#")[1]), href);
  for (const kind of commonFieldIds) {
    const html = render(h(CommonFieldSpecimen, { kind }));
    assert.ok(html.includes('data-studio-library-href='), kind);
    assert.ok(html.includes("ui-common-control-specimen"), kind);
  }
});

test("coverage audit rejects ordinary native fields and unknown dynamic types", () => {
  const result = inspectControlSource('<><input/><input type="number"/><input type={kind}/><textarea/><select/><input type="range"/></>', "app/studio/example.tsx");
  assert.equal(result.unlinked.length, 6);
  assert.equal(inspectControlSource('<><input type="checkbox"/><input type="range"/></>', "app/studio/studio-canvas.tsx").unlinked.length, 2);
  assert.equal(inspectControlSource('<><input type="checkbox"/><input type="range"/></>', "app/studio/controls/toggle-setting.tsx").exceptions.length, 1);
  assert.equal(inspectControlSource('<><input type="checkbox"/><input type="range"/></>', "app/studio/controls/toggle-setting.tsx").unlinked.length, 1);
  const audit = auditControlLibraryLinks(fileURLToPath(new URL("../", import.meta.url)));
  assert.deepEqual(audit.unlinked, []);
  assert.ok(audit.linked.length >= 273);
  assert.ok(audit.exceptions.every(item => item.reason));
});
