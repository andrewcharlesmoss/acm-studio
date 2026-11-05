import { createHostModuleEvaluator } from "./production-module.mjs";
import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { loadProductionModule } from "./production-module.mjs";
const styleLimits = await loadProductionModule(new URL("../app/studio/site-editor/website-style-limits.ts", import.meta.url));
const boxLengths = await loadProductionModule(new URL("../app/content/box-lengths.ts", import.meta.url));
import { universalPreset as UNIVERSAL_STYLE_PRESET } from "./style-test-presets.mjs";
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
test("element swatches follow WordPress palette defaults and leave inherited roles unset", () => {
  const f = fixture();
  const selection = f.selection();
  const palette = previewStyleDetails(selection).palette;
  assert.equal(model.previewElementForeground("links", undefined, palette, selection.colours), "currentColor");
  assert.equal(model.previewElementForeground("captions", undefined, palette, selection.colours), undefined);
  assert.equal(model.previewElementForeground("headings", undefined, palette, selection.colours), undefined);
  assert.equal(model.previewElementForeground("h2", undefined, palette, selection.colours), undefined);
  assert.equal(model.previewElementForeground("buttons", undefined, palette, selection.colours), palette.buttonText);
  assert.equal(model.previewElementForeground("links", "#FF00FF", palette, selection.colours), "#FF00FF");

  f.apply({ type: "colour-palette", scope: "test", paletteId: "evening" });
  const changed = f.selection();
  const changedPalette = previewStyleDetails(changed).palette;
  assert.equal(model.previewElementForeground("buttons", undefined, changedPalette, changed.colours), changedPalette.buttonText);
  assert.equal(model.previewElementForeground("captions", undefined, changedPalette, changed.colours), undefined);
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
  assert.match(html, /Edit palette/);
  for (const label of ["Link", "Captions", "Button", "Heading"]) assert.ok(html.includes(`Choose ${label} colour`));
  assert.doesNotMatch(html, /Choose Heading 1 colour|Choose Text colour|Coming Soon/);
  assert.deepEqual(styleBookExamples("colours").map(item => item.id), ["colours"]);
});

test("shared Colour row owns blue text hover without a host background override", () => {
  const css = readFileSync(new URL("../app/studio/controls/palette-colour-setting.css", import.meta.url), "utf8");
  const hover = css.match(/\.inspector-colour-setting button\.inspector-colour-row:hover:not\(:disabled\)\s*\{([^}]*)\}/)?.[1];
  assert.match(hover ?? "", /background:\s*var\(--acm-ui-hover-colour-rows-background,\s*transparent\)/);
  assert.match(hover ?? "", /color:\s*var\(--acm-ui-hover-colour-rows-foreground,\s*var\(--acm-ui-color-action-accent,\s*#0088ff\)\)/);
  const host = readFileSync(new URL("../app/studio/site-editor/site-editor-preview.css", import.meta.url), "utf8");
  const hostHover = host.match(/\.site-editor-preview button:hover[^{]+/)?.[0];
  assert.ok(hostHover?.includes(".inspector-colour-row"), "the host must defer Colour row hover to its canonical control");
  assert.ok(hostHover?.includes(".site-colours-theme-detail-row"), "the host must defer named Theme colour rows to their shared Colour row styles");
  assert.ok(hostHover?.includes(".site-colours-edit-palette"), "the host must defer the Edit palette action to its colour-only hover style");
  assert.ok(hostHover?.includes(".site-colours-palette-choice > button"), "the host must defer palette choices to their border-only hover style");
  const colours = readFileSync(new URL("../app/studio/site-editor/colours-preview.css", import.meta.url), "utf8");
  assert.doesNotMatch(colours, /\.site-colours-theme-details \.site-colours-theme-detail-row:hover\s*\{[^}]*background\s*:/);
  assert.match(colours, /\.site-colours-edit-palette:hover:not\(:disabled\)\s*\{\s*background:\s*var\(--acm-ui-hover-colour-rows-background,\s*transparent\);\s*color:\s*var\(--acm-ui-hover-colour-rows-foreground,\s*var\(--acm-ui-color-action-accent,\s*#0088ff\)\);\s*\}/);
  assert.match(colours, /\.site-colours-palette-choice > button:hover:not\(:disabled,\s*\[aria-pressed="true"\]\)\s*\{\s*background:\s*transparent;\s*border-color:\s*#949494;\s*\}/);
  const source = readFileSync(new URL("../app/studio/site-editor/colours-preview.tsx", import.meta.url), "utf8");
  assert.match(source, /className="inspector-colour-row site-colours-theme-detail-row"/);
});

test("inspector fields and shared Colour rows use the same 2px radius", () => {
  const studio = readFileSync(new URL("../app/studio/studio.css", import.meta.url), "utf8");
  const fields = studio.match(/\.inspector-sections input:not\(\[type="checkbox"\]\), \.inspector-sections textarea, \.inspector-sections select\s*\{([^}]*)\}/)?.[1];
  assert.match(fields ?? "", /border-radius:\s*2px/);

  const colour = readFileSync(new URL("../app/studio/controls/palette-colour-setting.css", import.meta.url), "utf8");
  const row = colour.match(/\.inspector-colour-setting button\.inspector-colour-row\s*\{([^}]*)\}/)?.[1];
  assert.match(row ?? "", /border-radius:\s*2px/);
});

test("an open shared colour picker highlights its trigger row", () => {
  const css = readFileSync(new URL("../app/studio/controls/palette-colour-setting.css", import.meta.url), "utf8");
  assert.match(css, /\.inspector-colour-setting button\.inspector-colour-row\[aria-expanded="true"\]\s*\{[^}]*background:\s*var\(--acm-ui-color-subtle-surface,\s*#f2f2f7\);[^}]*color:\s*var\(--acm-ui-color-action-accent,\s*#0088ff\);/);
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

  const source = readFileSync(new URL("../app/studio/controls/colour-picker.tsx", import.meta.url), "utf8");
  const code = (source);
  const slots = []; let index = 0;
  const react = { useState(initial) { const slot = index++; if (!(slot in slots)) slots[slot] = initial; return [slots[slot], value => { slots[slot] = typeof value === "function" ? value(slots[slot]) : value; }]; }, useRef() { return { current: null }; }, useId() { return "picker"; }, useLayoutEffect() {} };
  const jsx = (type, props) => ({ type, props });
  const require = name => name.endsWith("website-style-limits") ? styleLimits : name.endsWith("content/box-lengths") ? boxLengths : name === "react" ? react : name === "react/jsx-runtime" ? { jsx, jsxs: jsx, Fragment: "Fragment" } : name === "react-dom" ? { createPortal: node => node } : name.includes("canonical-style-guide") ? { UNIVERSAL_STYLE_PRESET } : name.endsWith("use-overlay-dismiss") ? { useOverlayDismiss() {} } : name.endsWith("interface-style-scope") ? { useInterfaceStylePortalStyle: () => undefined } : new Proxy({}, { get: (_, key) => key });
  const loaded = createHostModuleEvaluator(["require", "exports", "document"], `${code}\nreturn exports;`)(require, {}, { body: {} });
  const picker = loaded.ColourPicker;
  const calls = []; const literals = [];
  const props = { label: "Link", palette: [{ key: "theme-0", label: "Base", colour: "#FFFFFF" }, { key: "brand", label: "Brand", colour: "#FFFFFF" }], value: "#FFFFFF", onChange: value => literals.push(value), onSelectPalette: (entry, state) => calls.push([entry.key, state]) };
  const all = node => !node || typeof node !== "object" ? [] : Array.isArray(node) ? node.flatMap(all) : [node, ...all(node.props?.children)];
  const render = () => { index = 0; return picker(props); };
  let tree = render(); all(tree).find(node => node.type === "button" && node.props["aria-label"] === "Choose Link").props.onClick();
  tree = render();
  const swatches = all(tree).find(node => node.type?.name === "ColourSwatches");
  swatches.props.onSelectRole("brand", "#FFFFFF"); swatches.props.onChange("#FFFFFF");
  assert.deepEqual(calls, [["brand", "default"]]); assert.deepEqual(literals, []);
  tree = render();
  index = 20;
  let paletteTree = loaded.ColourSwatches(all(tree).find(node => node.type?.name === "ColourSwatches").props);
  all(paletteTree).find(node => node.type === "button" && node.props["aria-label"].startsWith("Brand,")).props.onClick();
  assert.deepEqual(literals, [undefined]);
  assert.deepEqual(calls, [["brand", "default"]]);
  props.allowClear = false;
  tree = render();
  let swatchProps = all(tree).find(node => node.type?.name === "ColourSwatches").props;
  assert.equal(swatchProps.onClear, undefined);
  index = 20; paletteTree = loaded.ColourSwatches(swatchProps);
  all(paletteTree).find(node => node.type === "button" && node.props["aria-label"].startsWith("Brand,")).props.onClick();
  tree = render();
  swatchProps = all(tree).find(node => node.type?.name === "ColourSwatches").props;
  index = 20; paletteTree = loaded.ColourSwatches(swatchProps);
  all(paletteTree).find(node => node.type === "button" && node.props["aria-label"].startsWith("Brand,")).props.onClick();
  assert.deepEqual(literals, [undefined]);
  assert.deepEqual(calls.slice(-2), [["brand", "default"], ["brand", "default"]]);
  props.allowClear = true;
  const hoverCalls = [];
  props.hoverValue = "#FFFFFF";
  props.onHoverChange = value => hoverCalls.push(value);
  tree = render();
  all(tree).find(node => node.type === "button" && node.props.children === "Hover").props.onClick();
  tree = render();
  swatchProps = all(tree).find(node => node.type?.name === "ColourSwatches").props;
  swatchProps.onSelectRole("brand", "#FFFFFF");
  tree = render();
  swatchProps = all(tree).find(node => node.type?.name === "ColourSwatches").props;
  index = 20; paletteTree = loaded.ColourSwatches(swatchProps);
  all(paletteTree).find(node => node.type === "button" && node.props["aria-label"].startsWith("Brand,")).props.onClick();
  assert.deepEqual(hoverCalls, [undefined]);
  assert.deepEqual(literals, [undefined]);
  all(tree).find(node => node.type === "button" && node.props.children === "Default").props.onClick();
  tree = render();
  all(tree).find(node => node.type === "button" && node.props["aria-label"] === "Custom link colour picker").props.onClick();
  tree = render(); all(tree).find(node => node.type === "GradientStopColour").props.onChange("#FFFFFF");
  assert.deepEqual(literals, [undefined, "#FFFFFF"]);
});

test("reselecting a Button palette colour returns to Base instead of clearing", async () => {

  const source = readFileSync(new URL("../app/studio/controls/colour-picker.tsx", import.meta.url), "utf8");
  const code = (source);
  const slots = []; let index = 0;
  const react = { useState(initial) { const slot = index++; if (!(slot in slots)) slots[slot] = initial; return [slots[slot], value => { slots[slot] = typeof value === "function" ? value(slots[slot]) : value; }]; }, useRef() { return { current: null }; }, useId() { return "picker"; }, useLayoutEffect() {} };
  const jsx = (type, props) => ({ type, props });
  const require = name => name.endsWith("website-style-limits") ? styleLimits : name.endsWith("content/box-lengths") ? boxLengths : name === "react" ? react : name === "react/jsx-runtime" ? { jsx, jsxs: jsx, Fragment: "Fragment" } : name === "react-dom" ? { createPortal: node => node } : name.includes("canonical-style-guide") ? { UNIVERSAL_STYLE_PRESET } : name.endsWith("use-overlay-dismiss") ? { useOverlayDismiss() {} } : name.endsWith("interface-style-scope") ? { useInterfaceStylePortalStyle: () => undefined } : new Proxy({}, { get: (_, key) => key });
  const loaded = createHostModuleEvaluator(["require", "exports", "document"], `${code}\nreturn exports;`)(require, {}, { body: {} });
  const all = node => !node || typeof node !== "object" ? [] : Array.isArray(node) ? node.flatMap(all) : [node, ...all(node.props?.children)];
  const palette = [{ key: "base", label: "Base", colour: "#FFFFFF" }, { key: "contrast", label: "Contrast", colour: "#111111" }];
  const selected = [];
  const props = { label: "Button colour", value: "#FFFFFF", palette, resetPaletteRole: "base", onChange() {}, onSelectPalette(entry, state) { selected.push([entry.key, state]); props.value = entry.colour; } };
  const renderPicker = () => { index = 0; return loaded.ColourPicker(props); };
  const renderSwatches = () => { const picker = renderPicker(); const swatches = all(picker).find(node => node.type?.name === "ColourSwatches"); index = 20; return loaded.ColourSwatches(swatches.props); };
  all(renderPicker()).find(node => node.type === "button" && node.props["aria-label"] === "Choose Button colour").props.onClick();
  let swatches = renderSwatches();
  all(swatches).find(node => node.type === "button" && node.props["aria-label"].startsWith("Contrast,")).props.onClick();
  swatches = renderSwatches();
  assert.equal(all(swatches).find(node => node.type === "button" && node.props["aria-label"].startsWith("Contrast,")).props["aria-pressed"], true);
  all(swatches).find(node => node.type === "button" && node.props["aria-label"].startsWith("Contrast,")).props.onClick();
  assert.deepEqual(selected, [["contrast", "default"], ["base", "default"]]);
  assert.equal(props.value, "#FFFFFF");
  swatches = renderSwatches();
  assert.equal(all(swatches).find(node => node.type === "button" && node.props["aria-label"].startsWith("Base,")).props["aria-pressed"], true);
});


test("cleared element colours remain unset through inheritance, history and unrelated edits until Reset", () => {
  const f = fixture();
  f.apply({ type: "element", scope: "global", role: "captions", patch: { colour: model.previewPaletteReference("theme-2") } });
  f.apply({ type: "element", scope: "test", role: "captions", patch: { colour: "" } });
  f.apply({ type: "colours", scope: "global", patch: { elements: { links: { hover: "#123456" }, buttons: { background: "#654321" } } } });
  f.apply({ type: "colours", scope: "test", patch: { elements: { links: { hover: "" }, buttons: { background: "" } } } });
  assert.equal(f.selection().typography.elements.captions.colour, "");
  assert.equal(f.selection().colours.elements.links.hover, "");
  assert.equal(f.selection().colours.elements.buttons.background, "");
  assert.equal(model.previewColourValue(f.selection().typography.elements.captions.colour, previewStyleDetails(f.selection()).palette), "");
  f.apply({ type: "undo" }); assert.equal(f.selection().colours.elements.links.hover, "#123456");
  f.apply({ type: "redo" }); assert.equal(f.selection().colours.elements.links.hover, "");
  f.apply({ type: "reset-colours", scope: "test", role: "captions" });
  assert.equal(f.selection().typography.elements.captions.colour, model.previewPaletteReference("theme-2"));
});

test("palette choices expose named compact strips with four decorative bands and retain selection actions", async () => {
  const { readFileSync } = await import("node:fs");

  const source = readFileSync(new URL("../app/studio/site-editor/colours-preview.tsx", import.meta.url), "utf8");
  const code = (source);
  const typographyModel = await loadProductionModule(new URL("../app/studio/site-editor/typography-preview-model.ts", import.meta.url));
  const styleProvenance = await loadProductionModule(new URL("../app/studio/site-editor/style-provenance.ts", import.meta.url));
  const slots = []; let index = 0;
  const react = { useState(initial) { const slot = index++; if (!(slot in slots)) slots[slot] = initial; return [slots[slot], value => { slots[slot] = typeof value === "function" ? value(slots[slot]) : value; }]; }, useRef() { return { current: null }; }, useEffect() {} };
  const jsx = (type, props) => ({ type, props });
  const require = name => name.endsWith("website-style-limits") ? styleLimits : name.endsWith("content/box-lengths") ? boxLengths : name === "react" ? react : name === "react/jsx-runtime" ? { jsx, jsxs: jsx, Fragment: "Fragment" } : name.endsWith("styles-preview-state") ? stateModel : name.endsWith("colours-preview-model") ? model : name.endsWith("typography-preview-model") ? typographyModel : name.endsWith("style-reference-data") ? { stylePalettes: model.referenceColourPalettes } : name.endsWith("style-provenance") ? styleProvenance : new Proxy({}, { get: (_, key) => key });
  const { ColoursPreview: Preview } = createHostModuleEvaluator(["require", "exports"], `${code}\nreturn exports;`)(require, {});
  const all = node => !node || typeof node !== "object" ? [] : Array.isArray(node) ? node.flatMap(all) : [node, ...all(node.props?.children)];
  const actions = []; const inheritedPalette = model.referenceColourPalettes[1]; const props = { selection: { paletteId: inheritedPalette.id, typographyId: "default" }, authored: {}, scope: "test", dispatch: action => actions.push(action), onBack() {} };
  const render = () => { index = 0; return Preview(props); };
  all(render()).find(node => node.props?.className === "site-colours-edit-palette").props.onClick();
  const choices = all(render()).find(node => node.props?.className === "site-colours-palettes").props.children;
  assert.equal(choices.length, 9);
  choices.forEach((wrapper, paletteIndex) => {
    const choice = wrapper.props.children[0];
    const palette = model.referenceColourPalettes[paletteIndex];
    assert.equal(choice.props["aria-label"], `${palette.name} colours${palette.id === inheritedPalette.id ? ", inherited from Universal Defaults" : ""}`);
    assert.equal(choice.props.title, palette.name);
    const strip = Array.isArray(choice.props.children) ? choice.props.children.find(child => child?.props?.className === "site-style-palette-sample") : choice.props.children;
    assert.equal(strip.props["aria-hidden"], "true");
    assert.deepEqual(strip.props.children.map(band => band.props.style.background), palette.colours.slice(0, 4));
    assert.equal(all(wrapper).some(child => child?.type === "InheritedIndicator"), palette.id === inheritedPalette.id);
  });
  assert.equal(choices[1].props.children[0].props["aria-pressed"], true);
  choices[1].props.children[0].props.onClick();
  assert.deepEqual(actions, [{ type: "colour-palette", scope: "test", paletteId: model.referenceColourPalettes[1].id }]);
});

test("Theme details expose eight editable named rows and Done returns without changing Styles", async () => {
  const { readFileSync } = await import("node:fs");

  const source = readFileSync(new URL("../app/studio/site-editor/colours-preview.tsx", import.meta.url), "utf8");
  const code = (source);
  const typographyModel = await loadProductionModule(new URL("../app/studio/site-editor/typography-preview-model.ts", import.meta.url));
  const styleProvenance = await loadProductionModule(new URL("../app/studio/site-editor/style-provenance.ts", import.meta.url));
  const slots = []; let index = 0;
  const react = { useState(initial) { const slot = index++; if (!(slot in slots)) slots[slot] = initial; return [slots[slot], value => { slots[slot] = typeof value === "function" ? value(slots[slot]) : value; }]; }, useRef() { return { current: null }; }, useEffect() {} };
  const jsx = (type, props) => ({ type, props });
  const require = name => name.endsWith("website-style-limits") ? styleLimits : name.endsWith("content/box-lengths") ? boxLengths : name === "react" ? react : name === "react/jsx-runtime" ? { jsx, jsxs: jsx, Fragment: "Fragment" } : name.endsWith("styles-preview-state") ? stateModel : name.endsWith("colours-preview-model") ? model : name.endsWith("typography-preview-model") ? typographyModel : name.endsWith("style-reference-data") ? { stylePalettes: model.referenceColourPalettes } : name.endsWith("style-provenance") ? styleProvenance : new Proxy({}, { get: (_, key) => key });
  const { ColoursPreview: Preview } = createHostModuleEvaluator(["require", "exports", "requestAnimationFrame"], `${code}\nreturn exports;`)(require, {}, callback => callback());
  const all = node => !node || typeof node !== "object" ? [] : Array.isArray(node) ? node.flatMap(all) : [node, ...all(node.props?.children)];
  const actions = []; const props = { selection: { paletteId: "default", typographyId: "default" }, authored: {}, scope: "test", dispatch: action => actions.push(action), onBack() {} };
  const render = () => { index = 0; return Preview(props); };
  all(render()).find(node => node.props?.className === "site-colours-edit-palette").props.onClick();
  all(render()).find(node => node.type === "InspectorToolsSection" && node.props.title === "Theme").props.onMenuOptionSelect("details");
  const tree = render();
  assert.equal(all(tree).find(node => node.type === "h3" && node.props.children === "THEME").props.tabIndex, -1);
  const details = all(tree).find(node => node.props?.className === "site-colours-theme-details");
  const rows = details.props.children;
  assert.equal(rows.length, 8);
  rows.forEach((row, index) => {
    assert.equal(row.type, "ColourPicker");
    assert.equal(row.props.allowClear, false);
    assert.equal(row.props.enableAlpha, true);
    const label = index === 0 ? "Base" : index === 1 ? "Contrast" : `Accent ${index - 1}`;
    let opened = false;
    const trigger = row.props.trigger({ onClick() { opened = true; }, expanded: false, controls: `palette-${index}`, disabled: false });
    assert.equal(trigger.type, "button");
    assert.equal(trigger.props["aria-label"], `Choose ${label} colour`);
    assert.equal(trigger.props["aria-controls"], `palette-${index}`);
    assert.equal(trigger.props.children[1].props.children, label);
    trigger.props.onClick(); assert.equal(opened, true);
  });
  rows[2].props.onChange("#12345680");
  assert.deepEqual(actions, [{ type: "colours", scope: "test", patch: { theme: { 2: "#12345680" } } }]);
  all(tree).find(node => node.type === "StudioButton" && node.props.children === "Done").props.onClick();
  assert.ok(all(render()).some(node => node.props?.className === "site-colours-theme-grid"));
  assert.equal(actions.length, 1);
});

test("removing all custom colours is one undoable action and retains referenced values", () => {
  const f = fixture();
  f.apply({ type: "colours", scope: "global", patch: { custom: { one: { id: "one", name: "Colour 1", colour: "#123456" } } } });
  f.apply({ type: "colours", scope: "test", patch: { custom: { two: { id: "two", name: "Colour 2", colour: "#ABCDEF80" } } } });
  const count = f.state.past.length;
  f.apply({ type: "remove-custom-colours", scope: "test" });
  assert.equal(f.state.past.length, count + 1);
  const selection = f.selection();
  assert.equal(model.previewColourEntries(previewStyleDetails(selection).palette, selection.colours).length, 8);
  assert.equal(model.previewColourValue(model.previewPaletteReference("one"), previewStyleDetails(selection).palette, selection.colours), "#123456");
  assert.equal(model.previewColourValue(model.previewPaletteReference("two"), previewStyleDetails(selection).palette, selection.colours), "#ABCDEF80");
  f.apply({ type: "remove-custom-colours", scope: "test" }); assert.equal(f.state.past.length, count + 1);
  f.apply({ type: "undo" }); assert.equal(model.previewColourEntries(previewStyleDetails(f.selection()).palette, f.selection().colours).length, 10);
  f.apply({ type: "redo" }); assert.equal(model.previewColourEntries(previewStyleDetails(f.selection()).palette, f.selection().colours).length, 8);
  assert.equal(model.previewColourEntries(previewStyleDetails(f.selection("test2")).palette, f.selection("test2").colours).length, 9);
});

test("Custom palette details, add, naming and removal use the existing owner actions", async () => {
  const { readFileSync } = await import("node:fs");

  const source = readFileSync(new URL("../app/studio/site-editor/colours-preview.tsx", import.meta.url), "utf8");
  const code = (source);
  const typographyModel = await loadProductionModule(new URL("../app/studio/site-editor/typography-preview-model.ts", import.meta.url));
  const styleProvenance = await loadProductionModule(new URL("../app/studio/site-editor/style-provenance.ts", import.meta.url));
  const slots = []; let index = 0;
  const react = { useState(initial) { const slot = index++; if (!(slot in slots)) slots[slot] = initial; return [slots[slot], value => { slots[slot] = typeof value === "function" ? value(slots[slot]) : value; }]; }, useRef() { return { current: null }; }, useEffect() {} };
  const jsx = (type, props) => ({ type, props });
  const require = name => name.endsWith("website-style-limits") ? styleLimits : name.endsWith("content/box-lengths") ? boxLengths : name === "react" ? react : name === "react/jsx-runtime" ? { jsx, jsxs: jsx, Fragment: "Fragment" } : name.endsWith("styles-preview-state") ? stateModel : name.endsWith("colours-preview-model") ? model : name.endsWith("typography-preview-model") ? typographyModel : name.endsWith("style-reference-data") ? { stylePalettes: model.referenceColourPalettes } : name.endsWith("style-provenance") ? styleProvenance : new Proxy({}, { get: (_, key) => key });
  const editorSource = readFileSync(new URL("../app/studio/controls/custom-palette-editor.tsx", import.meta.url), "utf8");
  const editorCode = (editorSource);
  const { CustomPaletteEditor } = createHostModuleEvaluator(["require", "exports", "requestAnimationFrame"], `${editorCode}\nreturn exports;`)(require, {}, callback => callback());
  const previewRequire = name => name.endsWith("custom-palette-editor") ? { CustomPaletteEditor } : require(name);
  const { ColoursPreview: Preview } = createHostModuleEvaluator(["require", "exports", "requestAnimationFrame"], `${code}\nreturn exports;`)(previewRequire, {}, callback => callback());
  const all = node => !node || typeof node !== "object" ? [] : Array.isArray(node) ? node.flatMap(all) : [node, ...all(node.props?.children)];
  const rows = [{ id: "one", name: "Colour 1", colour: "#123456" }];
  const actions = [];
  const props = { selection: { paletteId: "default", typographyId: "default", colours: { custom: { one: rows[0] } } }, authored: {}, scope: "test", dispatch: action => actions.push(action), onBack() {} };
  let customComponent;
  index = 0; let tree = Preview(props);
  all(tree).find(node => node.props?.className === "site-colours-edit-palette").props.onClick();
  index = 0; tree = Preview(props);
  const customNode = all(tree).find(node => node.type?.name === "CustomPaletteEditor");
  customComponent = customNode.type;
  slots.length = 0;
  const render = () => { index = 0; const section = customComponent(customNode.props); return section.type(section.props); };
  tree = render();
  assert.ok(all(tree).some(node => node.props?.className === "studio-custom-palette-swatches"));
  all(tree).find(node => node.props?.["aria-label"] === "Custom options").props.onClick();
  tree = render();
  all(tree).find(node => node.props?.children === "Show details").props.onClick();
  tree = render();
  assert.ok(all(tree).some(node => node.props?.className === "studio-custom-palette-details"));
  const field = all(tree).find(node => node.type === "TextInput");
  field.props.onChange({ target: { value: "Brand" } });
  assert.deepEqual(actions.pop(), { type: "colours", scope: "test", patch: { custom: { one: { ...rows[0], name: "Brand" } } } });
  all(tree).find(node => node.props?.["aria-label"] === "Remove colour: Colour 1").props.onClick();
  assert.deepEqual(actions.pop(), { type: "remove-colour", scope: "test", id: "one" });
  all(tree).find(node => node.props?.children === "Done").props.onClick();
  assert.ok(all(render()).some(node => node.props?.className === "studio-custom-palette-swatches"));
  all(render()).find(node => node.props?.["aria-label"] === "Add Colour").props.onClick();
  const added = actions.pop();
  assert.equal(Object.values(added.patch.custom)[0].name, "Colour 2");
  assert.equal(Object.values(added.patch.custom)[0].colour, "#000000");
  assert.ok(all(render()).some(node => node.props?.className === "studio-custom-palette-details"));
});


test("Library colour specimen renders the canonical Custom palette editor", async () => {
  const { createElement } = await import("react");
  const { renderToStaticMarkup } = await import("react-dom/server");
  const { ControlSpecimen } = await loadProductionModule(new URL("../app/studio/ui/controls/control-specimen.tsx", import.meta.url));
  const { studioControlEntries } = await loadProductionModule(new URL("../app/studio/controls/library-catalogue.ts", import.meta.url));
  const html = renderToStaticMarkup(createElement(ControlSpecimen, { entry: studioControlEntries.find(item => item.id === "colour-picker") }));
  assert.match(html, /studio-custom-palette-section/);
  assert.match(html, /aria-label="Custom options"/);
  assert.match(html, /aria-label="Add Colour"/);
  assert.match(html, /Colour 1/);
  assert.match(html, /Reset example/);
});

test('Custom palette header actions keep their shared hover treatment unframed', () => {
  const css = readFileSync(new URL('../app/studio/controls/custom-palette-editor.css', import.meta.url), 'utf8');
  assert.match(css, /\.studio-custom-palette-section \.studio-custom-palette-heading > div > button:is\(:hover, :active\):not\(:disabled\) \{ background: transparent; color: var\(--acm-ui-color-action-accent/);
});

test('palette matching compares equivalent RGB, alpha and hexadecimal colours without hiding duplicates', async () => {
  const { matchingColourPaletteRoles } = await loadProductionModule(new URL('../app/studio/controls/colour-picker.tsx', import.meta.url));
  const palette = [{ key: 'base', label: 'Base', colour: '#FFFFFF' }, { key: 'duplicate', label: 'Duplicate', colour: '#ffffffff' }, { key: 'alpha', label: 'Alpha', colour: '#503AA880' }];
  const keys = value => matchingColourPaletteRoles(value, palette).map(role => role.key);
  assert.deepEqual(keys('rgb(255, 255, 255)'), ['base', 'duplicate']);
  assert.deepEqual(keys('rgba(255, 255, 255, 1)'), ['base', 'duplicate']);
  assert.deepEqual(keys('#fff'), ['base', 'duplicate']);
  assert.deepEqual(keys('rgba(80, 58, 168, 0.5)'), ['alpha']);
  assert.deepEqual(keys('#503aa880'), ['alpha']);
  assert.deepEqual(keys(undefined), []);
});

test("Colours provenance follows scope and individual inherited values without label collisions", async () => {
  const typographyModel = await loadProductionModule(new URL("../app/studio/site-editor/typography-preview-model.ts", import.meta.url));
  const provenance = await loadProductionModule(new URL("../app/studio/site-editor/style-provenance.ts", import.meta.url));
  const jsx = (type, props) => ({ type, props });
  let slots = [], index = 0;
  const react = { useState(initial) { const position = index++; slots[position] ??= initial; return [slots[position], value => { slots[position] = typeof value === "function" ? value(slots[position]) : value; }]; }, useRef: () => ({ current: null }), useEffect() {} };
  const require = name => name === "react" ? react : name === "react/jsx-runtime" ? { jsx, jsxs: jsx } : name.endsWith("style-reference-data") ? { stylePalettes: model.referenceColourPalettes } : name.endsWith("style-provenance") ? provenance : name.endsWith("styles-preview-state") ? stateModel : name.endsWith("colours-preview-model") ? model : name.endsWith("typography-preview-model") ? typographyModel : name.endsWith("website-style-limits") ? styleLimits : new Proxy({}, { get: (_, key) => key });
  const source = readFileSync(new URL("../app/studio/site-editor/colours-preview.tsx", import.meta.url), "utf8");
  const { ColoursPreview: Preview } = createHostModuleEvaluator(["require", "exports"], source + "\nreturn exports;")(require, {});
  const all = node => !node || typeof node !== "object" ? [] : Array.isArray(node) ? node.flatMap(all) : [node, ...all(node.props?.children)];
  const render = (f, scope = "test", view = "menu") => { slots = []; index = 0; return Preview({ selection: f.selection(scope), authored: f.state.present[scope], scope, view, dispatch() {}, onBack() {} }); };
  const roles = tree => Object.assign({}, ...all(tree).filter(node => node.type === "SettingInheritanceProvider").map(node => node.props.values));
  const f = fixture();
  assert.ok(Object.values(roles(render(f))).every(value => !value), "reset values do not imply explicit inheritance");
  f.apply({ type: "change", scope: "global", patch: { paletteId: "evening" } });
  for (const scope of ["global", "test"]) {
    const tree = render(f, scope, "palette");
    const flags = all(tree).filter(node => node.type === "SettingInheritanceProvider").map(node => node.props.values);
    assert.equal(flags.length, 8);
    assert.ok(flags.every(value => Object.values(value)[0] === (scope === "test")), "only the child inherits the global palette");
  }
  f.apply({ type: "change", scope: "test", patch: { paletteId: "evening" } });
  assert.ok(Object.values(roles(render(f, "test", "palette"))).every(value => !value), "an explicit local palette has no inherited theme icons");
  const gradient = editableBackgroundGradient();
  const g = fixture();
  g.apply({ type: "colours", scope: "global", patch: { elements: { headings: { gradient }, buttons: { gradientId: "brand" } }, gradients: { brand: { id: "brand", name: "Brand", gradient } } } });
  let tree = render(g);
  let flags = roles(tree);
  assert.equal(flags.Heading, true); assert.equal(flags.Button, true);
  const headingTools = all(tree).find(node => node.type === "InspectorToolsSection");
  headingTools.props.onToggle("h1"); index = 0;
  tree = Preview({ selection: g.selection(), authored: g.state.present.test, scope: "test", dispatch() {}, onBack() {} });
  assert.equal(roles(tree).H1, true, "H1 inherits the aggregate Heading gradient");
  g.apply({ type: "colours", scope: "test", patch: { elements: { headings: { background: "", gradient: undefined, gradientId: undefined }, buttons: { background: "", gradient: undefined, gradientId: undefined } } } });
  flags = roles(render(g));
  assert.equal(flags.Heading, false); assert.equal(flags.Button, false, "an explicit surface choice suppresses the inherited gradient marker");
  g.apply({ type: "reset-colours", scope: "test", role: "headings" });
  assert.equal(roles(render(g)).Heading, true);
  render(g, "test", "palette"); slots[1] = "gradient"; index = 0;
  tree = Preview({ selection: g.selection(), authored: g.state.present.test, scope: "test", view: "palette", dispatch() {}, onBack() {} });
  const inheritedGradient = all(tree).find(node => node.type === "CustomGradientPaletteEditor");
  assert.deepEqual(inheritedGradient.props.inheritance, { brand: true });
  const c = fixture();
  c.apply({ type: "element", scope: "global", role: "links", patch: { colour: "#FF00FF" } });
  c.apply({ type: "colours", scope: "test", patch: { custom: { collision: { id: "collision", name: "Link", colour: "#000000" } } } });
  assert.equal(roles(render(c)).Link, true, "a local custom colour called Link cannot hide the element's inherited icon");
  tree = render(c, "test", "palette");
  assert.deepEqual(all(tree).find(node => node.type === "CustomPaletteEditor").props.inheritance, { collision: false });
  c.apply({ type: "element", scope: "test", role: "links", patch: { colour: "" } });
  assert.equal(roles(render(c)).Link, false);
  assert.equal(c.selection().typography.elements.links.colour, "");
  c.apply({ type: "reset-colours", scope: "test", role: "links" });
  assert.equal(roles(render(c)).Link, true);
});

test('element controls keep independent visibility per scope without changing inherited colours', async () => {
  const source = readFileSync(new URL('../app/studio/site-editor/colours-preview.tsx', import.meta.url), 'utf8');
  const typography = await loadProductionModule(new URL('../app/studio/site-editor/typography-preview-model.ts', import.meta.url));
  const provenance = await loadProductionModule(new URL('../app/studio/site-editor/style-provenance.ts', import.meta.url));
  const slots = []; let index = 0;
  const react = { useState(initial) { const i=index++; if (!(i in slots)) slots[i]=typeof initial === 'function' ? initial() : initial; return [slots[i], value => { slots[i]=typeof value === 'function' ? value(slots[i]) : value; }]; }, useRef() { return {current:null}; }, useEffect() {} };
  const jsx=(type,props)=>({type,props});
  const require=name=>name.endsWith('website-style-limits')?styleLimits:name.endsWith('content/box-lengths')?boxLengths:name==='react'?react:name==='react/jsx-runtime'?{jsx,jsxs:jsx,Fragment:'Fragment'}:name.endsWith('styles-preview-state')?stateModel:name.endsWith('colours-preview-model')?model:name.endsWith('typography-preview-model')?typography:name.endsWith('style-reference-data')?{stylePalettes:model.referenceColourPalettes}:name.endsWith('style-provenance')?provenance:new Proxy({}, {get:(_,key)=>key});
  const {ColoursPreview:Preview}=createHostModuleEvaluator(['require','exports'],`${source}\nreturn exports;`)(require,{});
  const all=node=>!node||typeof node!=='object'?[]:Array.isArray(node)?node.flatMap(all):[node,...all(node.props?.children)];
  const f=fixture(); f.apply({type:'element',scope:'global',role:'h3',patch:{colour:'#123456'}});
  let scope='global'; const actions=[];
  const section=()=>{index=0;return all(Preview({selection:f.selection(scope),authored:f.state.present[scope],scope,dispatch:action=>actions.push(action),onBack(){}})).find(node=>node.type==='InspectorToolsSection'&&node.props.title==='Elements');};
  section().props.onToggle('h3'); assert.equal(section().props.visible.has('h3'),false);
  scope='test'; assert.equal(section().props.visible.has('h3'),false);
  section().props.onToggle('h3'); assert.equal(section().props.visible.has('h3'),true);
  assert.equal(f.selection('test').typography.elements.h3.colour,'#123456');
  scope='global'; assert.equal(section().props.visible.has('h3'),false);
  scope='test'; assert.equal(section().props.visible.has('h3'),true);
  assert.deepEqual(actions,[]);
});

test("removing all custom gradients retains referenced values and is one undo step", () => {
  const f = fixture(); const first = editableBackgroundGradient(); const second = { ...first, angle: 42 };
  f.apply({ type: "colours", scope: "global", patch: { gradients: { a: { id: "a", name: "A", gradient: first }, b: { id: "b", name: "B", gradient: second } }, elements: { headings: { gradientId: "b" } } } });
  f.apply({ type: "remove-custom-gradients", scope: "test" });
  assert.equal(f.selection().colours.gradients.a, null);
  assert.equal(f.selection().colours.gradients.b, null);
  assert.match(model.previewRoleBackground(f.selection().colours, "h2"), /42deg/);
  assert.ok(f.selection("test2").colours.gradients.a);
  f.apply({ type: "undo" });
  assert.ok(f.selection().colours.gradients.a);
  assert.ok(f.selection().colours.gradients.b);
  f.apply({ type: "redo" });
  assert.equal(f.selection().colours.gradients.a, null);
});
