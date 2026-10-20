import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { loadProductionModule } from "./production-module.mjs";
const { ColourValueSwatch, ColourSwatches } = await loadProductionModule(new URL("../app/studio/controls/colour-picker.tsx", import.meta.url));
const { GradientPicker } = await loadProductionModule(new URL("../app/studio/controls/gradient-picker.tsx", import.meta.url));
const { GradientStopColour } = await loadProductionModule(new URL("../app/studio/controls/gradient-stop-colour.tsx", import.meta.url));
const read = path => readFileSync(new URL(path, import.meta.url), "utf8");

test("colour and gradient transparency shares canvas checks with an explicit compact palette variant", () => {
  const css = read("../app/studio/studio.css");
  assert.match(css, /--studio-transparency-pattern: repeating-conic-gradient\(#e0e0e0 0% 25%, #fff 0% 50%\)/);
  assert.match(css, /--studio-transparency-size: 48px 48px/);
  assert.match(css, /background: var\(--studio-transparency-pattern\) 0 0 \/ var\(--studio-transparency-size\)/);
  assert.equal((css.match(/repeating-conic-gradient/g) ?? []).length, 2);
  assert.match(css, /--studio-palette-transparency-pattern: repeating-conic-gradient\(#646970 0% 25%, #fff 0% 50%\)/);
  assert.match(css, /--studio-palette-transparency-size: 4px 4px/);
  assert.match(read("../app/studio/controls/colour-picker.tsx"), /paragraph-colour-theme-heading">THEME<\/strong>/);
  assert.match(read("../app/studio/controls/colour-picker.tsx"), /watchInspectorPopover\(anchor, paletteRef.current, 262,[\s\S]*?allowOwnerOverlap: true/);
  assert.match(css, /\.paragraph-colour-preview \{[^}]*var\(--studio-transparency-pattern\)[^}]*var\(--studio-transparency-size\)/);
  assert.match(css, /\.paragraph-colour-swatch\.has-transparency > span \{[^}]*var\(--studio-palette-transparency-pattern\)[^}]*var\(--studio-palette-transparency-size\)/);
  for (const file of ["colour-picker", "gradient-picker", "gradient-stop-colour", "background-selection"]) {
    const source = read(`../app/studio/controls/${file}.tsx`);
    assert.doesNotMatch(source, /repeating-conic-gradient/);
    assert.match(source, /var\(--studio-transparency-pattern\)/);
    assert.match(source, /var\(--studio-transparency-size\)/);
  }
  assert.match(read("../app/studio/site-editor/colours-preview.tsx"), /paragraphBackgroundGradientCss\(item.gradient\).*var\(--studio-transparency-pattern\)/);
});

test("alpha colour indicators composite above the shared checks and preserve unset semantics", () => {
  const html = renderToStaticMarkup(createElement(ColourValueSwatch, { value: "#FF000080" }));
  assert.match(html, /linear-gradient\(#FF000080, #FF000080\), var\(--studio-transparency-pattern\)/);
  assert.match(html, /background-size:auto, var\(--studio-transparency-size\)/);
  const unset = renderToStaticMarkup(createElement(ColourValueSwatch, {}));
  assert.match(unset, /is-unset/);
  assert.doesNotMatch(unset, /style=/);
  const palette = renderToStaticMarkup(createElement(ColourSwatches, { palette: [{ key: "alpha", label: "Alpha", colour: "#FF000000" }], onChange() {} }));
  assert.match(palette, /has-transparency/);
  assert.match(palette, /linear-gradient\(#FF000000, #FF000000\), var\(--studio-palette-transparency-pattern\)/);
  assert.match(palette, /background-size:auto, var\(--studio-palette-transparency-size\)/);
});

test("inline gradient stops, gradient trigger, and alpha ramp layer over the shared checks", () => {
  const value = { type: "linear", angle: 90, stops: [{ position: 0, colour: "#FF000000" }, { position: 100, colour: "#0000FF80" }] };
  for (const inline of [false, true]) {
    const html = renderToStaticMarkup(createElement(GradientPicker, { value, inline, showPresets: false, active: true, onOpen() {}, onChange() {} }));
    assert.match(html, /var\(--studio-transparency-pattern\)/);
    assert.match(html, /background-size:auto, var\(--studio-transparency-size\)/);
    if (inline) assert.match(html, /linear-gradient\(#FF000000, #FF000000\)/);
  }
  const alpha = renderToStaticMarkup(createElement(GradientStopColour, { colour: "#FF000080", onChange() {} }));
  assert.match(alpha, /linear-gradient\(90deg, transparent, #FF0000\), var\(--studio-transparency-pattern\)/);
  assert.match(alpha, /background-size:auto, var\(--studio-transparency-size\)/);
});

test("Library colour specimen includes the canonical alpha palette picker and Reset", async () => {
  const { ControlSpecimen } = await loadProductionModule(new URL("../app/studio/ui/controls/control-specimen.tsx", import.meta.url));
  const { studioControlEntries } = await loadProductionModule(new URL("../app/studio/controls/library-catalogue.ts", import.meta.url));
  const entry = studioControlEntries.find(item => item.id === "colour-picker");
  const html = renderToStaticMarkup(createElement(ControlSpecimen, { entry }));
  assert.match(html, /Alpha palette/);
  assert.match(html, /Reset example/);
});
