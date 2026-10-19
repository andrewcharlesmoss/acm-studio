import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import ts from "typescript";
import { loadProductionModule } from "./production-module.mjs";
const model = await loadProductionModule(new URL("../app/studio/site-editor/typography-preview-model.ts", import.meta.url));
const source = readFileSync(new URL("../app/studio/site-editor/typography-preview.tsx", import.meta.url), "utf8");
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
const all = node => !node || typeof node !== "object" ? [] : Array.isArray(node) ? node.flatMap(all) : [node, ...all(node.props?.children)];
function harness(font, required = []) {
  const slots = []; let index = 0; const updates = []; let closed = false;
  const react = { useState(initial) { const id = index++; if (!(id in slots)) slots[id] = initial; return [slots[id], value => { slots[id] = typeof value === "function" ? value(slots[id]) : value; }]; }, useRef: () => ({ current: null }), useEffect() {}, useId: () => "fonts" };
  const jsx = (type, props) => ({ type, props });
  const require = name => name === "react" ? react : name === "react/jsx-runtime" ? { jsx, jsxs: jsx } : name.endsWith("typography-preview-model") ? model : new Proxy({}, { get: (_, key) => key });
  const component = new Function("require", "exports", `${code}\nreturn exports.FontLibrary;`)(require, {});
  const render = () => { index = 0; return component({ opener: {}, initialFamily: font?.family, selected: [], required, onClose() { closed = true; }, onUpdate: value => updates.push(value) }); };
  return { render, updates, closed: () => closed };
}
test("variable font details show one real face and protect fonts in use", () => {
  const font = model.referenceFonts.find(font => font.name === "Fira Code");
  const view = harness(font, [font.family]); const tree = view.render(); const nodes = all(tree);
  assert.equal(tree.props.title, "Fonts");
  assert.equal(nodes.filter(node => node.props?.className === "site-font-library-variant").length, 1);
  const boxes = nodes.filter(node => node.type === "CheckboxControl");
  assert.equal(boxes.length, 2);
  assert.ok(boxes.every(node => node.props.checked && node.props.disabled));
  boxes[0].props.onChange(false);
  assert.equal(all(view.render()).find(node => node.type === "StudioButton" && node.props.children === "Update").props.disabled, true);
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
  assert.equal(boxes.length, model.referenceFonts.length);
  assert.deepEqual(boxes.map(node => node.props.label.props.children), model.alphabeticalReferenceFonts.map(font => font.name));
  const update = all(tree).find(node => node.type === "StudioButton" && node.props.children === "Update");
  assert.equal(update.props.disabled, false); update.props.onClick();
  assert.deepEqual(view.updates, [[font.family]]);
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

test("Library counts use WordPress variant wording", () => {
  const nodes = all(harness().render());
  for (const name of ["Fira Code", "Manrope"]) {
    const button = nodes.find(node => node.props?.["aria-label"] === `View ${name} variants`);
    assert.equal(button.props.children[0].props.children, "1 variant");
  }
});
