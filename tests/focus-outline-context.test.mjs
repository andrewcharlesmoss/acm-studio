import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { compileProductionModule, loadProductionModule } from "./production-module.mjs";

const compiled = await compileProductionModule(new URL("../app/studio/focus-outline-preferences.tsx", import.meta.url));
const providerModule = await import(`${compiled}#rsc-provider`);
const consumerModule = await import(`${compiled}#hmr-consumer`);
const { FocusPreferenceContext } = await loadProductionModule(new URL("../app/studio/focus-outline-context.ts", import.meta.url));

test("separate component boundary instances share the Focus Outline context during server rendering", () => {
  assert.notEqual(providerModule.StudioFocusOutlineProvider, consumerModule.StudioFocusOutlineProvider);
  const html = renderToStaticMarkup(createElement(providerModule.StudioFocusOutlineProvider, null, createElement(consumerModule.StudioFocusOutlineSetting)));
  assert.equal((html.match(/<select/g) ?? []).length, 1);
  assert.match(html, /value="keyboard" selected/);
});

test("all modes and failure feedback remain owned by one provider value", () => {
  for (const mode of ["on", "off", "keyboard"]) {
    const html = renderToStaticMarkup(createElement(FocusPreferenceContext.Provider, { value: { mode, setMode() {}, status: "Applies to this page; another Studio tab prevents saving." } }, createElement(consumerModule.StudioFocusOutlineSetting)));
    assert.match(html, new RegExp(`value="${mode}" selected`));
    assert.match(html, /role="status"/);
    assert.match(html, /another Studio tab prevents saving/);
  }
});
