import { createHostModuleEvaluator } from "./production-module.mjs";
import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

import { loadProductionModule } from "./production-module.mjs";
const colourModel = await loadProductionModule(new URL('../app/studio/site-editor/colours-preview-model.ts', import.meta.url));
const colourPalette = await loadProductionModule(new URL("../app/studio/site-editor/typography-colour-palette.ts", import.meta.url));
const model = await loadProductionModule(new URL("../app/studio/site-editor/typography-preview-model.ts", import.meta.url));
const source = readFileSync(new URL("../app/studio/site-editor/typography-preview.tsx", import.meta.url), "utf8");
const code = (source);
const all = node => !node || typeof node !== "object" ? [] : Array.isArray(node) ? node.flatMap(all) : [node, ...all(node.props?.children)];
function harness(font, required = []) {
  const slots = []; let index = 0; const updates = []; let closed = false;
  const react = { useState(initial) { const id = index++; if (!(id in slots)) slots[id] = initial; return [slots[id], value => { slots[id] = typeof value === "function" ? value(slots[id]) : value; }]; }, useRef: () => ({ current: null }), useEffect() {}, useId: () => "fonts" };
  const jsx = (type, props) => ({ type, props });
  const require = name => name === "react" ? react : name === "react/jsx-runtime" ? { jsx, jsxs: jsx } : name.endsWith("typography-preview-model") ? model : name.endsWith("colours-preview-model") ? colourModel : name.endsWith("typography-colour-palette") ? colourPalette : new Proxy({}, { get: (_, key) => key });
  const component = createHostModuleEvaluator(["require", "exports"], `${code}\nreturn exports.FontLibrary;`)(require, {});
  let selected = required;
  const render = () => { index = 0; return component({ opener: {}, initialFamily: font?.family, selected, families: font ? [font.family] : model.referenceFonts.filter(item => ["Fira Code", "Manrope"].includes(item.name)).map(item => item.family), onClose() { closed = true; }, onUpdate: value => updates.push(value) }); };
  return { render, setSelected(value) { selected = value; }, updates, closed: () => closed };
}
test("variable font details allow deactivating a typeset family", () => {
  const font = model.referenceFonts.find(font => font.name === "Fira Code");
  const view = harness(font, [font.family]); const tree = view.render(); const nodes = all(tree);
  assert.equal(tree.props.title, "Fonts");
  assert.equal(tree.props.closeOnBackdrop, true);
  assert.equal(nodes.filter(node => node.props?.className === "site-font-library-variant").length, 1);
  const boxes = nodes.filter(node => node.type === "CheckboxControl");
  assert.equal(boxes.length, 2);
  assert.ok(boxes.every(node => node.props.checked && !node.props.disabled));
  boxes[0].props.onChange(false);
  assert.equal(all(view.render()).find(node => node.type === "StudioButton" && node.props.children === "Update").props.disabled, false);
  const unchecked = all(view.render()).filter(node => node.type === "CheckboxControl");
  assert.ok(unchecked.every(node => !node.props.checked));
  unchecked[1].props.onChange(true);
  assert.ok(all(view.render()).filter(node => node.type === "CheckboxControl").every(node => node.props.checked));
  tree.props.onClose(); assert.equal(view.closed(), true); assert.deepEqual(view.updates, []);
});
test("family changes stay draft until Update and survive returning to Library", () => {
  const font = model.referenceFonts.find(font => font.name === "Beiruti");
  const view = harness(font); let tree = view.render();
  all(tree).find(node => node.type === "CheckboxControl").props.onChange(true);
  assert.deepEqual(view.updates, []);
  tree = view.render();
  all(tree).find(node => node.props?.["aria-label"] === "Back to Library").props.onClick();
  tree = view.render();
  const boxes = all(tree).filter(node => node.type === "CheckboxControl");
  assert.equal(boxes.length, 0);
  assert.ok(all(tree).some(node => node.props?.["aria-label"] === "View Beiruti variants"));
  const update = all(tree).find(node => node.type === "StudioButton" && node.props.children === "Update");
  assert.equal(update.props.disabled, false); update.props.onClick();
  assert.deepEqual(view.updates, [[font.family]]);
  tree = view.render();
  assert.equal(view.closed(), false);
  assert.ok(all(tree).some(node => node.props?.role === "status"));
  all(tree).find(node => node.props?.["aria-label"] === "Dismiss font update message").props.onClick();
  assert.ok(!all(view.render()).some(node => node.props?.role === "status"));
});
test("static font details show only bundled weights and explain family-level selection", () => {
  const font = model.referenceFonts.find(font => font.name === "Fira Sans"); const tree = harness(font).render();
  const rows = all(tree).filter(node => node.props?.className === "site-font-library-variant");
  assert.deepEqual(rows.map(node => node.props.children.props.style.fontWeight), font.weights);
  assert.equal(rows.length, 2);
  assert.ok(all(tree).some(node => node.props?.children === "These bundled variants are enabled together."));
});

test("variable variant labels match WordPress family and weight bounds", () => {
  for (const [name, expected] of [["Fira Code", "Fira Code 300 700"], ["Manrope", "Manrope 200 800"]]) {
    const font = model.referenceFonts.find(font => font.name === name);
    const row = all(harness(font).render()).find(node => node.props?.className === "site-font-library-variant");
    const label = all(row).find(node => node.type === "CheckboxControl").props.label;
    assert.equal(label.props.children.join(""), expected);
    assert.equal(label.props.style.fontFamily, font.family);
  }
});

test("Manage Fonts shows only current families with active counts and no family toggles", () => {
  const families = model.referenceFonts.filter(font => ["Fira Code", "Manrope"].includes(font.name)).map(font => font.family);
  const nodes = all(harness(undefined, families).render());
  assert.equal(nodes.filter(node => node.type === "CheckboxControl").length, 0);
  assert.deepEqual(nodes.filter(node => node.type === "button").map(node => node.props["aria-label"]), ["View Fira Code variants", "View Manrope variants"]);
  for (const name of ["Fira Code", "Manrope"]) {
    const button = nodes.find(node => node.props?.["aria-label"] === `View ${name} variants`);
    assert.equal(button.props.children[1].props.children.join(""), "1 of 1 active");
    assert.equal(button.props.children[0].props.className, "site-font-library-family-name");
  }
  const styles = readFileSync(new URL("../app/studio/site-editor/site-editor-preview.css", import.meta.url), "utf8");
  assert.match(styles, /\.site-font-library-theme-list > button > \.site-font-library-family-name\s*\{[^}]*font-size:\s*18px/);
});

test("Font dropdown excludes disabled families without restoring an unknown selected option", async () => {
  const { styleTypography, stylePalettes } = await loadProductionModule(new URL("../app/studio/site-editor/style-reference-data.ts", import.meta.url));
  const source = readFileSync(new URL("../app/studio/site-editor/typography-element-settings.tsx", import.meta.url), "utf8");
  const code = (source);
  const jsx = (type, props) => ({ type, props });
  const react = { useState: value => [value, () => {}], useRef: value => ({ current: value }), useEffect() {}, useId: () => "settings" };
  const require = name => name === "react" ? react : name === "react/jsx-runtime" ? { jsx, jsxs: jsx } : name.endsWith("typography-preview-model") ? model : name.endsWith("colours-preview-model") ? colourModel : name.endsWith("typography-colour-palette") ? colourPalette : new Proxy({}, { get: (_, key) => key });
  const component = createHostModuleEvaluator(["require", "exports"], `${code}\nreturn exports.TypographyElementSettings;`)(require, {});
  const family = styleTypography[0].bodyFamily;
  const render = settings => all(component({ role: "text", typography: styleTypography[0], palette: stylePalettes[0], settings, authored: { family }, onChange() {}, onReset() {} })).find(node => node.type === "FontFamilySelect");
  assert.ok(render({}).props.options.some(option => option.value === family));
  const disabled = render({ disabledFonts: [family] });
  assert.ok(!disabled.props.options.some(option => option.value === family));
  assert.equal(disabled.props.value, "");
  assert.equal(render({}).props.value, family);
});

test("open Fonts dialog follows committed history while preserving unfinished edits", () => {
  const font = model.referenceFonts.find(font => font.name === "Manrope");
  const view = harness(font, [font.family]);
  let tree = view.render();
  all(tree).find(node => node.type === "CheckboxControl").props.onChange(false);
  tree = view.render();
  all(tree).find(node => node.type === "StudioButton" && node.props.children === "Update").props.onClick();
  view.setSelected([]); view.render(); tree = view.render();
  assert.ok(all(tree).some(node => node.props?.role === "status"));
  view.setSelected([font.family]); view.render(); tree = view.render();
  assert.ok(all(tree).filter(node => node.type === "CheckboxControl").every(node => node.props.checked));
  assert.ok(!all(tree).some(node => node.props?.role === "status"));
  all(tree).find(node => node.type === "CheckboxControl").props.onChange(false);
  view.setSelected([]); view.render(); tree = view.render();
  assert.ok(all(tree).filter(node => node.type === "CheckboxControl").every(node => !node.props.checked));
  all(tree).find(node => node.type === "CheckboxControl").props.onChange(true);
  const other = model.referenceFonts.find(font => font.name === "Fira Code").family;
  view.setSelected([other]); view.render(); tree = view.render();
  assert.ok(all(tree).filter(node => node.type === "CheckboxControl").every(node => node.props.checked), "foreign committed changes preserve unfinished edits");
});
