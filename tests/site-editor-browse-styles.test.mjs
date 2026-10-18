import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { loadProductionModule } from "./production-module.mjs";

const { createStylesPreview, resolvePreviewStyle, stylesPreviewReducer, previewStyleDetails } = await loadProductionModule(new URL("../app/studio/site-editor/styles-preview-state.ts", import.meta.url));
const { stylePalettes, styleTypography, styleVariations } = await loadProductionModule(new URL("../app/studio/site-editor/style-reference-data.ts", import.meta.url));
const { BrowseStyles, StyleTypographySample } = await loadProductionModule(new URL("../app/studio/site-editor/browse-styles.tsx", import.meta.url));

test("Aa samples use the heading and body families separately at regular weight", () => {
  for (const typography of styleTypography) {
    const html = renderToStaticMarkup(createElement(StyleTypographySample, { typography }));
    assert.match(html, /font-weight:400;font-style:normal/);
    const letters = [...html.matchAll(/<span style="font-family:([^"]+)">([Aa])<\/span>/g)].map(match => [match[1].replaceAll('&quot;', '"'), match[2]]);
    assert.deepEqual(letters, [[typography.headingFamily, "A"], [typography.bodyFamily, "a"]]);
  }
});

test("reference choices include nine variations, nine palettes and eight distinct font pairings", () => {
  assert.equal(styleVariations.length, 9);
  assert.equal(stylePalettes.length, 9);
  assert.equal(styleTypography.length, 8);
  for (const variation of styleVariations) {
    const { palette, typography, variation: selected } = previewStyleDetails(variation);
    assert.equal(palette.id, variation.paletteId);
    assert.equal(typography.id, variation.typographyId);
    assert.equal(selected.id, variation.id);
  }
  const html = renderToStaticMarkup(createElement(BrowseStyles, { selection: { paletteId: "default", typographyId: "default" }, onChange() {}, onBack() {} }));
  assert.equal([...html.matchAll(/aria-pressed=/g)].length, 26);
  assert.equal([...html.matchAll(/aria-pressed="true"/g)].length, 3);
  assert.match(html, /aria-label="Back to Styles"/);
  assert.match(html, /aria-label="Beiruti &amp; Literata typography"/);
});

test("global edits flow to inherited dimensions while site overrides remain independent", () => {
  let state = createStylesPreview();
  const apply = action => { state = stylesPreviewReducer(state, action); };
  apply({ type: "change", scope: "global", patch: { paletteId: "dusk", typographyId: "type-2" } });
  assert.deepEqual(resolvePreviewStyle(state.present, "test"), { paletteId: "dusk", typographyId: "type-2" });
  apply({ type: "change", scope: "test", patch: { paletteId: "sunrise" } });
  apply({ type: "change", scope: "global", patch: { paletteId: "midnight", typographyId: "type-7" } });
  assert.deepEqual(resolvePreviewStyle(state.present, "test"), { paletteId: "sunrise", typographyId: "type-7" });
  assert.deepEqual(resolvePreviewStyle(state.present, "test2"), { paletteId: "midnight", typographyId: "type-7" });
  apply({ type: "inherit", scope: "test" });
  assert.deepEqual(resolvePreviewStyle(state.present, "test"), resolvePreviewStyle(state.present, "global"));
  apply({ type: "undo" });
  assert.equal(resolvePreviewStyle(state.present, "test").paletteId, "sunrise");
  apply({ type: "redo" });
  assert.equal(resolvePreviewStyle(state.present, "test").paletteId, "midnight");
});

test("palette and typography choices are independent and only matching pairs select a full variation", () => {
  let state = createStylesPreview();
  state = stylesPreviewReducer(state, { type: "change", scope: "test", patch: { paletteId: "evening", typographyId: "default" } });
  state = stylesPreviewReducer(state, { type: "change", scope: "test", patch: { typographyId: "type-1" } });
  assert.equal(resolvePreviewStyle(state.present, "test").paletteId, "evening");
  assert.equal(previewStyleDetails(resolvePreviewStyle(state.present, "test")).variation, undefined);
  const unchanged = stylesPreviewReducer(state, { type: "change", scope: "test", patch: { typographyId: "type-1" } });
  assert.equal(unchanged, state);
  state = stylesPreviewReducer(state, { type: "undo" });
  assert.equal(previewStyleDetails(resolvePreviewStyle(state.present, "test")).variation.id, "evening");
  state = stylesPreviewReducer(state, { type: "change", scope: "test", patch: { paletteId: "noon" } });
  assert.equal(state.future.length, 0);
});
