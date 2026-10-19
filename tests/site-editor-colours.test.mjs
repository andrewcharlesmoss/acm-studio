import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { loadProductionModule } from "./production-module.mjs";
const model = await loadProductionModule(new URL("../app/studio/site-editor/colours-preview-model.ts", import.meta.url));
const stateModel = await loadProductionModule(new URL("../app/studio/site-editor/styles-preview-state.ts", import.meta.url));
const { styleBookPresentation, styleBookExamples } = await loadProductionModule(new URL("../app/studio/site-editor/style-book-model.ts", import.meta.url));
const { ColoursPreview } = await loadProductionModule(new URL("../app/studio/site-editor/colours-preview.tsx", import.meta.url));
const { editableBackgroundGradient } = await loadProductionModule(new URL("../app/content/background-gradient.ts", import.meta.url));
const { createStylesPreview, stylesPreviewReducer, resolvePreviewStyle, previewStyleDetails } = stateModel;
function fixture() { let state = createStylesPreview(); return { apply(action) { state = stylesPreviewReducer(state, action); }, get state() { return state; }, selection(scope = "test") { return resolvePreviewStyle(state.present, scope); } }; }
test("theme edits update effective default roles and inherit independently with Undo, Redo, and Reset", () => {
  const f = fixture();
  f.apply({ type: "colours", scope: "global", patch: { theme: { 0: "#DDEEFF", 1: "#223344" } } });
  assert.equal(previewStyleDetails(f.selection()).palette.buttonBackground, "#223344");
  assert.equal(styleBookPresentation(f.selection())["--book-surface"], "#DDEEFF");
  f.apply({ type: "colours", scope: "test", patch: { theme: { 0: "#112233" } } });
  assert.equal(previewStyleDetails(f.selection()).palette.colours[0], "#112233");
  assert.equal(previewStyleDetails(f.selection("test2")).palette.colours[0], "#DDEEFF");
  f.apply({ type: "reset-theme-colours", scope: "test" });
  assert.equal(previewStyleDetails(f.selection()).palette.colours[0], "#DDEEFF");
  f.apply({ type: "undo" }); assert.equal(previewStyleDetails(f.selection()).palette.colours[0], "#112233");
  f.apply({ type: "redo" }); assert.equal(previewStyleDetails(f.selection()).palette.colours[0], "#DDEEFF");
});
test("palette references track theme changes and custom colours retain resolved fallback after removal", () => {
  const f = fixture();
  f.apply({ type: "colours", scope: "global", patch: { custom: { brand: { id: "brand", name: "Brand", colour: "#12345680" } } } });
  let selection = f.selection(); let palette = previewStyleDetails(selection).palette;
  const token = model.previewPaletteReference("brand");
  assert.equal(token, "var(--site-palette-brand)");
  f.apply({ type: "element", scope: "test", role: "links", patch: { colour: token, weight: 600 } });
  f.apply({ type: "colours", scope: "global", patch: { custom: { brand: { id: "brand", name: "Renamed", colour: "#ABCDEF" } } } });
  assert.equal(styleBookPresentation(f.selection())["--site-palette-brand"], "#ABCDEF");
  f.apply({ type: "remove-colour", scope: "global", id: "brand" }); selection = f.selection();
  assert.equal(styleBookPresentation(selection)["--site-palette-brand"], "#ABCDEF");
  assert.equal(model.previewColourValue(token, palette, selection.colours), "#ABCDEF");
  assert.equal(model.previewColourEntries(palette, selection.colours).length, 8);
  f.apply({ type: "undo" }); assert.equal(model.previewColourEntries(palette, f.selection().colours).length, 9);
});
test("named gradients update inherited headings, preserve last value when removed, and reset role colours atomically", () => {
  const f = fixture(); const first = editableBackgroundGradient(); const second = { ...first, angle: 90 };
  f.apply({ type: "colours", scope: "global", patch: { gradients: { sunset: { id: "sunset", name: "Sunset", gradient: first } }, elements: { headings: { gradientId: "sunset", gradient: first } } } });
  f.apply({ type: "colours", scope: "global", patch: { gradients: { sunset: { id: "sunset", name: "Sunset", gradient: second } } } });
  assert.match(model.previewRoleBackground(f.selection().colours, "h2"), /90deg/);
  f.apply({ type: "remove-gradient", scope: "global", id: "sunset" });
  assert.match(model.previewRoleBackground(f.selection().colours, "h2"), /90deg/);
  f.apply({ type: "element", scope: "test", role: "links", patch: { colour: "#123456", weight: 700 } });
  f.apply({ type: "colours", scope: "test", patch: { elements: { links: { hover: "#654321" } } } });
  const count = f.state.past.length;
  f.apply({ type: "reset-colours", scope: "test", role: "links" });
  assert.equal(f.state.past.length, count + 1);
  assert.equal(f.selection().typography.elements.links.colour, undefined);
  assert.equal(f.selection().typography.elements.links.weight, 700);
  assert.equal(f.selection().colours.elements.links?.hover, undefined);
  f.apply({ type: "undo" }); assert.equal(f.selection().colours.elements.links.hover, "#654321");
});
test("Colours overview exposes only reference default element rows and uses an isolated colour book context", () => {
  const html = renderToStaticMarkup(createElement(ColoursPreview, { selection: { paletteId: "default", typographyId: "default" }, authored: {}, scope: "test", dispatch() {}, onBack() {} }));
  assert.match(html, /Edit Palette/);
  for (const label of ["Link", "Captions", "Button", "Heading"]) assert.ok(html.includes(`Choose ${label} colour`));
  assert.doesNotMatch(html, /Choose Heading 1 colour|Choose Text colour|Coming Soon/);
  assert.deepEqual(styleBookExamples("colours").map(item => item.id), ["colours"]);
});

test("duplicate-valued swatches retain identity independently and custom values stay literal", () => {
  const f = fixture();
  f.apply({ type: "colours", scope: "test", patch: { custom: { duplicate: { id: "duplicate", name: "Custom White", colour: "#FFFFFF" } } } });
  f.apply({ type: "element", scope: "test", role: "links", patch: { colour: model.previewPaletteReference("duplicate") } });
  f.apply({ type: "colours", scope: "test", patch: { custom: { duplicate: { id: "duplicate", name: "Custom White", colour: "#AABBCC" } } } });
  let selection = f.selection(); let palette = previewStyleDetails(selection).palette;
  assert.equal(model.previewColourValue(selection.typography.elements.links.colour, palette, selection.colours), "#AABBCC");
  assert.equal(palette.colours[0], "#FFFFFF");
  f.apply({ type: "element", scope: "test", role: "links", patch: { colour: "#FFFFFF" } });
  f.apply({ type: "colours", scope: "test", patch: { theme: { 0: "#112233" } } });
  assert.equal(f.selection().typography.elements.links.colour, "#FFFFFF");
});

test("explicit named palette overrides inherited theme edits while preserving custom entries and references", () => {
  const f = fixture();
  f.apply({ type: "colours", scope: "global", patch: { theme: { 0: "#123456" } } });
  f.apply({ type: "colours", scope: "test", patch: { custom: { brand: { id: "brand", name: "Brand", colour: "#ABCDEF" } } } });
  f.apply({ type: "element", scope: "test", role: "links", patch: { colour: model.previewPaletteReference("theme-0") } });
  f.apply({ type: "colour-palette", scope: "test", paletteId: "evening" });
  assert.equal(previewStyleDetails(f.selection()).palette.colours[0], "#1B1B1B");
  assert.equal(model.previewColourValue(f.selection().typography.elements.links.colour, previewStyleDetails(f.selection()).palette, f.selection().colours), "#1B1B1B");
  assert.equal(f.selection().colours.custom.brand.colour, "#ABCDEF");
  f.apply({ type: "undo" }); assert.equal(previewStyleDetails(f.selection()).palette.colours[0], "#123456");
  f.apply({ type: "redo" }); assert.equal(previewStyleDetails(f.selection()).palette.colours[0], "#1B1B1B");
  f.apply({ type: "reset-theme-colours", scope: "test" }); assert.equal(previewStyleDetails(f.selection()).palette.colours[0], "#123456");
});

test("shared picker sends exact selected identity once and keeps custom input literal", async () => {
  const { readFileSync } = await import("node:fs");
  const ts = (await import("typescript")).default;
  const { UNIVERSAL_STYLE_PRESET } = await import("@acm/styles");
  const source = readFileSync(new URL("../app/studio/controls/colour-picker.tsx", import.meta.url), "utf8");
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const slots = []; let index = 0;
  const react = { useState(initial) { const slot = index++; if (!(slot in slots)) slots[slot] = initial; return [slots[slot], value => { slots[slot] = typeof value === "function" ? value(slots[slot]) : value; }]; }, useRef() { return { current: null }; }, useId() { return "picker"; }, useLayoutEffect() {} };
  const jsx = (type, props) => ({ type, props });
  const require = name => name === "react" ? react : name === "react/jsx-runtime" ? { jsx, jsxs: jsx, Fragment: "Fragment" } : name === "react-dom" ? { createPortal: node => node } : name === "@acm/styles" ? { UNIVERSAL_STYLE_PRESET } : name.endsWith("use-overlay-dismiss") ? { useOverlayDismiss() {} } : new Proxy({}, { get: (_, key) => key });
  const picker = new Function("require", "exports", "document", `${code}\nreturn exports.ColourPicker;`)(require, {}, { body: {} });
  const calls = []; const literals = [];
  const props = { label: "Link", palette: [{ key: "theme-0", label: "Base", colour: "#FFFFFF" }, { key: "brand", label: "Brand", colour: "#FFFFFF" }], value: "#FFFFFF", onChange: value => literals.push(value), onSelectPalette: (entry, state) => calls.push([entry.key, state]) };
  const all = node => !node || typeof node !== "object" ? [] : Array.isArray(node) ? node.flatMap(all) : [node, ...all(node.props?.children)];
  const render = () => { index = 0; return picker(props); };
  let tree = render(); all(tree).find(node => node.type === "button" && node.props["aria-label"] === "Choose Link").props.onClick();
  tree = render();
  const swatches = all(tree).find(node => node.type?.name === "ColourSwatches");
  swatches.props.onSelectRole("brand", "#FFFFFF"); swatches.props.onChange("#FFFFFF");
  assert.deepEqual(calls, [["brand", "default"]]); assert.deepEqual(literals, []);
  all(tree).find(node => node.type === "button" && node.props["aria-label"] === "Custom link colour picker").props.onClick();
  tree = render(); all(tree).find(node => node.type === "GradientStopColour").props.onChange("#FFFFFF");
  assert.deepEqual(literals, ["#FFFFFF"]);
});
