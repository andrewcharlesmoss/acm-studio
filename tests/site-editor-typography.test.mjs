import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { loadProductionModule } from "./production-module.mjs";
const { createStylesPreview, resolvePreviewStyle, stylesPreviewReducer } = await loadProductionModule(new URL("../app/studio/site-editor/styles-preview-state.ts", import.meta.url));
const { typographyFieldsCss, resolvedTypographyFields, resolveFontSizePresets, fontSizePresetCss, validFontSizePreset, defaultFontSizePresets, typographyInUseFamilies, visibleTypographyFonts, customTypographyStartingSize, typographySizeMode, reconcileTypographySizeMode } = await loadProductionModule(new URL("../app/studio/site-editor/typography-preview-model.ts", import.meta.url));
const { styleTypography } = await loadProductionModule(new URL("../app/studio/site-editor/style-reference-data.ts", import.meta.url));

test("element properties inherit independently, reset restores global, and undo preserves scopes", () => {
 let state = createStylesPreview();
 const apply = action => { state = stylesPreviewReducer(state, action); };
 apply({ type: "element", scope: "global", role: "h2", patch: { weight: 700, lineHeight: "1.3" } });
 apply({ type: "element", scope: "test", role: "h2", patch: { weight: 300 } });
 apply({ type: "element", scope: "global", role: "h2", patch: { lineHeight: "1.6" } });
 let settings = resolvePreviewStyle(state.present, "test").typography;
 assert.deepEqual(settings.elements.h2, { weight: 300, lineHeight: "1.6" });
 assert.equal(resolvePreviewStyle(state.present, "test2").typography.elements.h2.weight, 700);
 apply({ type: "reset-element", scope: "test", role: "h2" });
 assert.equal(resolvePreviewStyle(state.present, "test").typography.elements.h2.weight, 700);
 apply({ type: "undo" }); assert.equal(resolvePreviewStyle(state.present, "test").typography.elements.h2.weight, 300);
 apply({ type: "redo" }); assert.equal(resolvePreviewStyle(state.present, "test").typography.elements.h2.weight, 700);
});
test("resetting selected typography fields reveals inherited values and stays undoable", () => {
 let state = createStylesPreview();
 const apply = action => { state = stylesPreviewReducer(state, action); };
 apply({ type: "element", scope: "global", role: "text", patch: { family: "Fira Code", lineHeight: "1.5", size: "1.25rem" } });
 apply({ type: "element", scope: "test", role: "text", patch: { family: "Manrope", lineHeight: "2", letterSpacing: "0.2em" } });

 apply({ type: "reset-element-fields", scope: "test", role: "text", fields: ["family", "lineHeight"] });
 let settings = resolvePreviewStyle(state.present, "test").typography;
 assert.deepEqual(settings.elements.text, { family: "Fira Code", lineHeight: "1.5", size: "1.25rem", letterSpacing: "0.2em" });

 apply({ type: "undo" });
 settings = resolvePreviewStyle(state.present, "test").typography;
 assert.deepEqual(settings.elements.text, { family: "Manrope", lineHeight: "2", size: "1.25rem", letterSpacing: "0.2em" });
 apply({ type: "redo" });
 settings = resolvePreviewStyle(state.present, "test").typography;
 assert.deepEqual(settings.elements.text, { family: "Fira Code", lineHeight: "1.5", size: "1.25rem", letterSpacing: "0.2em" });
});
test("heading levels inherit all-heading properties while custom size clears its inherited preset", () => {
 const settings = { elements: { headings: { weight: 700 }, h2: { lineHeight: "2" }, text: { size: "24px", preset: "" } } };
 const h2 = resolvedTypographyFields(styleTypography[0], settings, "h2");
 assert.equal(h2.weight, 700); assert.equal(h2.lineHeight, "2"); assert.equal(h2.preset, "x-large");
 const text = resolvedTypographyFields(styleTypography[0], settings, "text");
 assert.equal(text.size, "24px"); assert.equal(text.preset, "");
});
test("reapplying the active Typeset clears authored element settings and is undoable", () => {
 let state = createStylesPreview();
 state = stylesPreviewReducer(state, { type: "element", scope: "global", role: "text", patch: { weight: 800 } });
 state = stylesPreviewReducer(state, { type: "change", scope: "global", patch: { typographyId: "default" } });
 assert.deepEqual(resolvePreviewStyle(state.present, "global").typography.elements, {});
 state = stylesPreviewReducer(state, { type: "undo" });
 assert.equal(resolvePreviewStyle(state.present, "global").typography.elements.text.weight, 800);
});
test("font presets validate boundaries, inherit independently, and use preview container fluid sizes", () => {
 const custom = { id: "custom-one", name: "Custom", size: "2rem", min: "1rem", max: "3rem", fluid: true };
 assert.equal(validFontSizePreset(custom), true);
 assert.equal(validFontSizePreset({ ...custom, min: "4rem" }), false);
 assert.equal(validFontSizePreset({ ...custom, size: "401px" }), false);
 assert.equal(validFontSizePreset({ ...custom, size: "0rem" }), false);
 assert.match(fontSizePresetCss(custom), /^clamp\(.+cqw/);
 let state = createStylesPreview();
 state = stylesPreviewReducer(state, { type: "font-preset", scope: "global", id: custom.id, preset: custom });
 const before = state;
 state = stylesPreviewReducer(state, { type: "font-preset", scope: "test", id: custom.id, preset: { ...custom, min: "9rem" } });
 assert.equal(state, before);
 state = stylesPreviewReducer(state, { type: "font-preset", scope: "test", id: custom.id, preset: null });
 assert.equal(resolveFontSizePresets(resolvePreviewStyle(state.present, "test").typography).length, 5);
 assert.equal(resolveFontSizePresets(resolvePreviewStyle(state.present, "test2").typography).length, 6);
 assert.equal(resolvedTypographyFields(styleTypography[0], {}, "text").preset, "large");
 assert.equal(defaultFontSizePresets[1].max, "1.125rem");
});

test("Reset Styles clears only the selected scope and is fully undoable", () => {
 let state = createStylesPreview();
 state = stylesPreviewReducer(state, { type: "change", scope: "global", patch: { paletteId: "midnight", typographyId: "type-1" } });
 state = stylesPreviewReducer(state, { type: "element", scope: "global", role: "text", patch: { weight: 700 } });
 state = stylesPreviewReducer(state, { type: "change", scope: "test", patch: { paletteId: "noon" } });
 state = stylesPreviewReducer(state, { type: "element", scope: "test", role: "h1", patch: { size: "4rem" } });
 state = stylesPreviewReducer(state, { type: "change", scope: "test2", patch: { typographyId: "type-2" } });
 const globalBeforeReset = state.present.global;
 const test2BeforeReset = state.present.test2;

 state = stylesPreviewReducer(state, { type: "reset", scope: "test" });
 assert.deepEqual(state.present.test, {});
 assert.equal(state.present.global, globalBeforeReset);
 assert.equal(state.present.test2, test2BeforeReset);
 state = stylesPreviewReducer(state, { type: "undo" });
 assert.equal(state.present.test.paletteId, "noon");
 assert.deepEqual(state.present.test.typography.elements.h1, { size: "4rem" });
 state = stylesPreviewReducer(state, { type: "redo" });
 assert.deepEqual(state.present.test, {});

 state = stylesPreviewReducer(state, { type: "reset", scope: "global" });
 assert.deepEqual(state.present.global, { paletteId: "default", typographyId: "default" });
 state = stylesPreviewReducer(state, { type: "undo" });
 assert.equal(state.present.global, globalBeforeReset);
 state = stylesPreviewReducer(state, { type: "redo" });
 assert.deepEqual(resolvePreviewStyle(state.present, "global"), { paletteId: "default", typographyId: "default" });
});

test("family overrides retain requested CSS weights rather than silently replacing them", () => {
 const family = '"TT5 Fira Sans", sans-serif';
 const inherited = resolvedTypographyFields(styleTypography[5], { elements: { headings: { family } } }, "h2");
 assert.equal(inherited.weight, styleTypography[5].headingWeight);
 const authored = resolvedTypographyFields(styleTypography[0], { elements: { text: { family, weight: 900 } } }, "text");
 assert.equal(authored.weight, 900);
 const literata = resolvedTypographyFields(styleTypography[0], { elements: { text: { family: '"TT5 Literata", serif', weight: 700 } } }, "text");
 assert.equal(literata.weight, 700);
});


test("element families remain available when font availability is changed, until the authored use is undone", () => {
 let state = createStylesPreview();
 const family = '"TT5 Literata", serif';
 state = stylesPreviewReducer(state, { type: "fonts", scope: "test", families: [family] });
 state = stylesPreviewReducer(state, { type: "element", scope: "test", role: "captions", patch: { family } });
 state = stylesPreviewReducer(state, { type: "fonts", scope: "test", families: [] });
 let settings = resolvePreviewStyle(state.present, "test").typography;
 assert.equal(typographyInUseFamilies(styleTypography[0], settings).includes(family), true);
 state = stylesPreviewReducer(state, { type: "undo" });
 state = stylesPreviewReducer(state, { type: "undo" });
 settings = resolvePreviewStyle(state.present, "test").typography;
 assert.equal(typographyInUseFamilies(styleTypography[0], settings).includes(family), false);
});

test("custom size starts at the actual role preset and history restores its editing mode", () => {
 const h1 = resolvedTypographyFields(styleTypography[0], {}, "h1");
 const caption = resolvedTypographyFields(styleTypography[0], {}, "captions");
 assert.equal(customTypographyStartingSize(h1, {}), "2.15rem");
 assert.equal(customTypographyStartingSize(caption, {}), "0.875rem");
 let state = createStylesPreview();
 const beforeMode = typographySizeMode(h1);
 state = stylesPreviewReducer(state, { type: "element", scope: "global", role: "h1", patch: { preset: "", size: customTypographyStartingSize(h1, {}) } });
 const custom = resolvedTypographyFields(styleTypography[0], resolvePreviewStyle(state.present, "global").typography, "h1");
 assert.equal(custom.size, "2.15rem");
 const customMode = typographySizeMode(custom);
 assert.equal(reconcileTypographySizeMode(beforeMode, customMode, "custom"), "custom");
 state = stylesPreviewReducer(state, { type: "undo" });
 const restored = resolvedTypographyFields(styleTypography[0], resolvePreviewStyle(state.present, "global").typography ?? {}, "h1");
 assert.equal(reconcileTypographySizeMode(customMode, typographySizeMode(restored), "custom"), "presets");
 assert.equal(reconcileTypographySizeMode("custom", "custom", "presets"), "presets", "a local view-only toggle is retained while the effective mode is unchanged");
});

const { ElementTypographySample } = await loadProductionModule(new URL("../app/studio/site-editor/element-typography-sample.tsx", import.meta.url));

test("Elements thumbnails use each Typeset's resolved role font and authored overrides", () => {
 const render = (role, selection) => renderToStaticMarkup(createElement(ElementTypographySample, { role, selection }));
 const defaultSelection = { paletteId: "default", typographyId: "default" };
 const pairedSelection = { paletteId: "default", typographyId: "type-1" };
 for (const role of ["text", "links", "headings", "captions", "buttons"]) {
  const html = render(role, defaultSelection);
  assert.match(html, /font-family:&quot;TT5 Manrope&quot;, sans-serif/);
  assert.doesNotMatch(html, /Georgia|font-size:|line-height:|text-align:/);
  assert.match(html, /aria-hidden="true"/);
 }
 assert.match(render("headings", pairedSelection), /font-family:&quot;TT5 Beiruti&quot;, sans-serif;font-weight:500/);
 for (const role of ["text", "links", "captions", "buttons"]) assert.match(render(role, pairedSelection), /font-family:&quot;TT5 Literata&quot;, serif;font-weight:300/);
 const override = { ...pairedSelection, typography: { elements: { links: { family: '"TT5 Fira Code", monospace', weight: 700, decoration: "line-through", align: "right", size: "10rem" } } } };
 const html = render("links", override);
 assert.match(html, /font-family:&quot;TT5 Fira Code&quot;, monospace;font-weight:700;text-decoration:line-through/);
 assert.doesNotMatch(html, /font-size:|text-align:/);
 assert.match(render("links", pairedSelection), /text-decoration:underline/);
 assert.match(render("buttons", { paletteId: "dusk", typographyId: "default" }), /color:#E2E2E2;background-color:#650DD4/);
});


test("Fonts shows exactly each Typeset's declared families in alphabetical name order", () => {
 const expected = [
  ["Fira Code", "Manrope"],
  ["Beiruti", "Literata"],
  ["Fira Code", "Vollkorn"],
  ["Platypi", "Ysabeau Office"],
  ["Manrope", "Roboto Slab"],
  ["Literata", "Ysabeau Office"],
  ["Literata", "Platypi"],
  ["Fira Sans", "Literata"],
 ];
 for (const [index, typography] of styleTypography.entries()) {
  assert.deepEqual(visibleTypographyFonts(typography, {}).map(font => font.name), expected[index], typography.name);
 }
 assert.ok(typographyInUseFamilies(styleTypography[0], {}).includes('"TT5 Fira Code", monospace'), "Default retains its declared code font even though its text uses Manrope");
});

test("Fonts alphabetically retains enabled extras and authored role uses without duplicates", () => {
 const settings = { enabledFonts: ['"TT5 Manrope", sans-serif', '"TT5 Fira Sans", sans-serif', '"TT5 Literata", serif'], elements: { captions: { family: '"TT5 Fira Code", monospace' } } };
 assert.deepEqual(visibleTypographyFonts(styleTypography[1], settings).map(font => font.name), ["Beiruti", "Fira Code", "Fira Sans", "Literata", "Manrope"]);
 assert.ok(typographyInUseFamilies(styleTypography[1], settings).includes('"TT5 Fira Code", monospace'));
 assert.equal(typographyInUseFamilies(styleTypography[1], settings).includes('"TT5 Manrope", sans-serif'), false, "enabled extras remain removable when no resolved element uses them");
});

test("Text colour inherits into body roles while headings and buttons retain palette foregrounds", () => {
 let state = createStylesPreview();
 const apply = action => { state = stylesPreviewReducer(state, action); };
 apply({ type: "element", scope: "global", role: "text", patch: { colour: "#123456" } });
 apply({ type: "element", scope: "test", role: "captions", patch: { colour: "#654321" } });
 let settings = resolvePreviewStyle(state.present, "test").typography;
 for (const role of ["text", "links"]) { const fields = resolvedTypographyFields(styleTypography[0], settings, role); assert.equal(fields.colour, "#123456"); assert.equal(typographyFieldsCss(fields, settings).color, "#123456"); }
 assert.equal(resolvedTypographyFields(styleTypography[0], settings, "captions").colour, "#654321");
 for (const role of ["headings", "h1", "buttons"]) assert.equal(resolvedTypographyFields(styleTypography[0], settings, role).colour, undefined);
 apply({ type: "reset-element", scope: "test", role: "captions" });
 settings = resolvePreviewStyle(state.present, "test").typography;
 assert.equal(resolvedTypographyFields(styleTypography[0], settings, "captions").colour, "#123456");
 apply({ type: "undo" }); assert.equal(resolvePreviewStyle(state.present, "test").typography.elements.captions.colour, "#654321");
 apply({ type: "element", scope: "test", role: "headings", patch: { colour: "#ABCDEF" } });
 const html = renderToStaticMarkup(createElement(ElementTypographySample, { role: "headings", selection: resolvePreviewStyle(state.present, "test") }));
 assert.match(html, /color:#ABCDEF/);
});

test("font deactivation applies fallback without deleting authored use and supports scope history", () => {
 const family = '"TT5 Manrope", sans-serif';
 let state = createStylesPreview();
 state = stylesPreviewReducer(state, { type: "fonts", scope: "global", families: [], disabledFamilies: [family] });
 let settings = resolvePreviewStyle(state.present, "test").typography;
 assert.deepEqual(settings.disabledFonts, [family]);
 const fields = resolvedTypographyFields(styleTypography[0], settings, "text");
 assert.equal(fields.family, family);
 assert.equal(typographyFieldsCss(fields, settings).fontFamily, "sans-serif");
 assert.ok(visibleTypographyFonts(styleTypography[0], settings).some(font => font.family === family));
 state = stylesPreviewReducer(state, { type: "fonts", scope: "test", families: [], disabledFamilies: [] });
 assert.equal(typographyFieldsCss(fields, resolvePreviewStyle(state.present, "test").typography).fontFamily, family);
 assert.deepEqual(resolvePreviewStyle(state.present, "test2").typography.disabledFonts, [family]);
 state = stylesPreviewReducer(state, { type: "undo" });
 assert.deepEqual(resolvePreviewStyle(state.present, "test").typography.disabledFonts, [family]);
 state = stylesPreviewReducer(state, { type: "redo" });
 assert.deepEqual(resolvePreviewStyle(state.present, "test").typography.disabledFonts, []);
 state = stylesPreviewReducer(state, { type: "reset", scope: "test" });
 assert.deepEqual(resolvePreviewStyle(state.present, "test").typography.disabledFonts, [family]);
});

test("availability edits retain off-screen choices and deactivated extras remain recoverable", async () => {
 const { updatedFontAvailability } = await loadProductionModule(new URL("../app/studio/site-editor/typography-preview-model.ts", import.meta.url));
 const manrope = '\"TT5 Manrope\", sans-serif', beiruti = '\"TT5 Beiruti\", sans-serif';
 const settings = { disabledFonts: [manrope], enabledFonts: [beiruti] };
 const change = updatedFontAvailability(settings, [beiruti], [], []);
 assert.deepEqual(change.disabledFamilies, [manrope, beiruti]);
 assert.deepEqual(change.families, []);
 assert.ok(visibleTypographyFonts(styleTypography[1], { disabledFonts: [manrope] }).some(font => font.family === manrope));
});
