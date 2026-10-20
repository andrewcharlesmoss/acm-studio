import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { loadProductionModule } from "./production-module.mjs";
const { ShadowPresetsSpecimen } = await loadProductionModule(new URL("../app/studio/ui/controls/shadow-presets-specimen.tsx", import.meta.url));

test("shadow Library specimen renders the canonical preset list with isolated initial state", () => {
  const html = renderToStaticMarkup(createElement(ShadowPresetsSpecimen));
  for (const name of ["Natural", "Deep", "Sharp", "Outlined", "Crisp", "Add shadow", "Shadow presets example"]) assert.ok(html.includes(name), name);
  assert.match(html, /site-shadows-preview/);
  assert.doesNotMatch(html, /Shadow 1/);
});

test("bare native dialogs inherit padded rounded presentation without feature classes", () => {
  const css = readFileSync(new URL("../app/studio/studio.css", import.meta.url), "utf8");
  const rule = css.match(/\.studio-dialog\.studio-dialog-default \{([^}]+)\}/)[1];
  for (const value of ["padding: 24px", "border-radius: 8px", "width: 480px"]) assert.ok(rule.includes(value), value);
  assert.match(css, /max-width: calc\(100vw - 32px\)/);
  assert.match(readFileSync(new URL("../app/studio/overlays/dialog.tsx", import.meta.url), "utf8"), /className \|\| "studio-dialog-default"/);
  assert.match(readFileSync(new URL("../app/studio/controls/library-catalogue.ts", import.meta.url), "utf8"), /id: "shadow-presets"/);
});
