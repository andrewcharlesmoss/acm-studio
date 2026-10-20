import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { loadProductionModule } from "./production-module.mjs";
const { createStylesPreview, stylesPreviewReducer, resolvePreviewStyle, previewStyleDetails } = await loadProductionModule(new URL("../app/studio/site-editor/styles-preview-state.ts", import.meta.url));
const { previewBackgroundCss } = await loadProductionModule(new URL("../app/studio/site-editor/background-preview-model.ts", import.meta.url));
const { BackgroundPreview } = await loadProductionModule(new URL("../app/studio/site-editor/background-preview.tsx", import.meta.url));
const { editableBackgroundGradient } = await loadProductionModule(new URL("../app/content/background-gradient.ts", import.meta.url));
function fixture() { let state = createStylesPreview(); return { apply(action) { state = stylesPreviewReducer(state, action); }, get state() { return state; }, selection(scope = "test") { return resolvePreviewStyle(state.present, scope); } }; }
const gradient = editableBackgroundGradient();
test("background fields inherit independently and clears suppress inherited layers until reset", () => {
  const f = fixture(); const image = { id: "image", name: "Example", altText: "", blob: new Blob(["one"]) };
  f.apply({ type: "background", scope: "global", patch: { colour: "#112233", gradient, image, size: "tile", focalX: 20 } });
  f.apply({ type: "background", scope: "test", patch: { colour: "#44556680", image: null } });
  assert.equal(f.selection().background.image, null);
  assert.equal(f.selection().background.gradient, gradient);
  assert.equal(f.selection("test2").background.image, image);
  f.apply({ type: "reset-background", scope: "test", field: "image" });
  assert.equal(f.selection().background.image, image);
  assert.equal(f.selection().background.colour, "#44556680");
  f.apply({ type: "background", scope: "test", patch: { gradient: null } });
  assert.equal(f.selection().background.gradient, null);
  const count = f.state.past.length;
  f.apply({ type: "reset-background", scope: "test" });
  assert.equal(f.state.past.length, count + 1);
  assert.equal(f.selection().background.colour, "#112233");
  f.apply({ type: "undo" }); assert.equal(f.selection().background.gradient, null);
  f.apply({ type: "redo" }); assert.equal(f.selection().background.gradient, gradient);
});
test("replacing equal-metadata Blob images is recorded and undo restores bytes", async () => {
  const f = fixture(); const first = { id: "same", name: "Same", altText: "", blob: new Blob(["one"]) }; const second = { ...first, blob: new Blob(["two"]) };
  f.apply({ type: "background", scope: "test", patch: { image: first } });
  f.apply({ type: "background", scope: "test", patch: { image: second } });
  assert.equal(f.state.past.length, 2);
  assert.equal(await f.selection().background.image.blob.text(), "two");
  f.apply({ type: "undo" }); assert.equal(await f.selection().background.image.blob.text(), "one");
});
test("background resolver tracks website palette and composes independent image and gradient layers", () => {
  const f = fixture(); const image = { id: "image", name: "Example", blob: new Blob() };
  f.apply({ type: "background", scope: "test", patch: { colour: "var(--site-palette-theme-2)", gradient, image, size: "tile", width: 35, widthUnit: "vw", repeat: false, fixed: true, focalX: 12, focalY: 30 } });
  f.apply({ type: "colours", scope: "global", patch: { theme: { 2: "#AABBCC80" } } });
  const selection = f.selection(); const palette = previewStyleDetails(selection).palette;
  const css = previewBackgroundCss(selection.background, palette, selection.colours, "blob:example");
  assert.equal(css.backgroundColor, "#AABBCC80");
  assert.match(css.backgroundImage, /^url\("blob:example"\), linear-gradient/);
  assert.equal(css.backgroundSize, "35vw auto, auto"); assert.equal(css.backgroundPosition, "12% 30%");
  assert.equal(css.backgroundRepeat, "no-repeat, no-repeat"); assert.equal(css.backgroundAttachment, "fixed, scroll");
  assert.equal(previewBackgroundCss({ colour: null, gradient: null, image: null }, palette).backgroundColor, palette.colours[0]);
});
test("Background screen renders reference rows using canonical controls", () => {
  const html = renderToStaticMarkup(createElement(BackgroundPreview, { selection: { paletteId: "default", typographyId: "default" }, authored: {}, scope: "test", dispatch() {}, onBack() {} }));
  assert.match(html, /Back to Styles/); assert.match(html, /Choose background image/); assert.match(html, /Choose background colour/); assert.match(html, />Gradient</);
  assert.match(html, /Background options/); assert.doesNotMatch(html, /Coming Soon/);
});

test("Repeat is confined to Tile and never repeats the gradient layer", () => {
 const palette = previewStyleDetails({ paletteId: "default", typographyId: "default" }).palette;
 const image = { id: "image", blob: new Blob() };
 for (const size of ["cover", "contain"]) assert.equal(previewBackgroundCss({ image, gradient, size, repeat: true }, palette, {}, "blob:image").backgroundRepeat, "no-repeat, no-repeat");
 assert.equal(previewBackgroundCss({ image, gradient, size: "tile", repeat: true }, palette, {}, "blob:image").backgroundRepeat, "repeat, no-repeat");
});
test("fixed backgrounds render inside a measured preview scrollport and release their resize observer", async () => {
  const { readFileSync } = await import("node:fs");
  const ts = (await import("typescript")).default;
  const model = await loadProductionModule(new URL("../app/studio/site-editor/background-preview-model.ts", import.meta.url));
  const source = readFileSync(new URL("../app/studio/site-editor/background-preview-surface.tsx", import.meta.url), "utf8");
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  let current = { height: 0, available: 0 }; let effect; let observed; let disconnected = false; let resize;
  const scrollport = { clientHeight: 500, scrollTop: 0, getBoundingClientRect: () => ({ top: 100 }) };
  const root = { closest: selector => { assert.equal(selector, ".studio-preview-frame-content"); return scrollport; }, getBoundingClientRect: () => ({ top: 180 }) };
  const react = { useRef: () => ({ current: root }), useState: () => [current, update => { current = typeof update === "function" ? update(current) : update; }], useLayoutEffect: callback => { effect = callback; } };
  const jsx = (type, props) => ({ type, props });
  class Observer { constructor(callback) { resize = callback; } observe(element) { observed = element; } disconnect() { disconnected = true; } }
  const require = name => name === "react" ? react : name === "react/jsx-runtime" ? { jsx, jsxs: jsx } : name.endsWith("background-preview-model") ? model : {};
  const { BackgroundPreviewSurface } = new Function("require", "exports", "ResizeObserver", `${code}\nreturn exports;`)(require, {}, Observer);
  const palette = previewStyleDetails({ paletteId: "default", typographyId: "default" }).palette;
  const props = { background: { image: { id: "image", blob: new Blob() }, gradient, fixed: true }, imageUrl: "blob:image", palette, children: "Website content" };
  let tree = BackgroundPreviewSurface(props); const cleanup = effect();
  assert.equal(observed, scrollport); assert.deepEqual(current, { height: 500, available: 420 });
  tree = BackgroundPreviewSurface(props);
  assert.equal(tree.props.style.minHeight, 420);
  assert.doesNotMatch(tree.props.style.backgroundImage, /url\(/);
  const layer = tree.props.children[0];
  assert.match(layer.props.style.backgroundImage, /url\("blob:image"\)/);
  assert.equal(layer.props.style.backgroundAttachment, "scroll"); assert.equal(layer.props.style.height, 500);
  assert.equal(layer.props["aria-hidden"], "true");
  assert.equal(tree.props.children[1].props.children, "Website content");
  scrollport.clientHeight = 300; resize();
  assert.deepEqual(current, { height: 300, available: 220 });
  cleanup(); assert.equal(disconnected, true);
  const identity = BackgroundPreviewSurface({ ...props, enabled: false });
  assert.equal(identity.props.style.backgroundColor, undefined);
  assert.equal(identity.props.style.minHeight, undefined);
  assert.equal(identity.props.children[0], null);
});
