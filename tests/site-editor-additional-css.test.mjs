import assert from "node:assert/strict";
import test from "node:test";
import { loadProductionModule } from "./production-module.mjs";
const { validateAdditionalCss, compileAdditionalCss } = await loadProductionModule(new URL("../app/studio/site-editor/additional-css.ts", import.meta.url));
const { createStylesPreview, resolvePreviewStyle, stylesPreviewReducer } = await loadProductionModule(new URL("../app/studio/site-editor/styles-preview-state.ts", import.meta.url));

test("CSS inherits, supports an explicit empty override, reset, and Styles history", () => {
  let state = createStylesPreview();
  const change = (scope, value) => { state = stylesPreviewReducer(state, { type: "change", scope, patch: { additionalCss: value } }); };
  change("global", "p { color: red }");
  assert.equal(resolvePreviewStyle(state.present, "test").additionalCss, "p { color: red }");
  change("test", "");
  assert.equal(resolvePreviewStyle(state.present, "test").additionalCss, "");
  assert.equal(resolvePreviewStyle(state.present, "test2").additionalCss, "p { color: red }");
  state = stylesPreviewReducer(state, { type: "reset-css", scope: "test" });
  assert.equal(resolvePreviewStyle(state.present, "test").additionalCss, "p { color: red }");
  state = stylesPreviewReducer(state, { type: "undo" });
  assert.equal(resolvePreviewStyle(state.present, "test").additionalCss, "");
  state = stylesPreviewReducer(state, { type: "redo" });
  state = stylesPreviewReducer(state, { type: "reset", scope: "global" });
  assert.equal(resolvePreviewStyle(state.present, "test").additionalCss, undefined);
});

test("resource and global constructs fail before any browser parser can load them", () => {
  for (const css of ['@import "https://example.com/x.css";', '@font-face { src: url(x) }', 'p { background: url(https://example.com) }', 'p { background: u\\72l(x) }', 'p { background: image-set("https://example.com/x" 1x) }', '@property --x { syntax: "*"; }', '</style><script>alert(1)</script>']) {
    assert.ok(validateAdditionalCss(css), css);
    assert.equal(compileAdditionalCss(css, () => { throw new Error("must never parse"); }).css, "");
  }
  assert.equal(validateAdditionalCss('@media (width < 500px) { p { color: red; } }'), undefined);
  assert.ok(validateAdditionalCss("x".repeat(30001)));
});

test("compiler serialises parsed rules only and rejects unrecognised functions/rules", () => {
  const style = value => ({ 0: "color", length: 1, cssText: `color: ${value};`, getPropertyValue: () => value });
  const sheet = rules => () => ({ replaceSync() {}, cssRules: rules });
  const rule = { type: 1, selectorText: "p", style: style("red"), cssRules: [] };
  assert.match(compileAdditionalCss("p { color:red }", sheet([rule])).css, /^@scope \(\[data-site-custom-css-root\]\)/);
  assert.ok(compileAdditionalCss("p {}", sheet([{ ...rule, style: style("unknown-function(x)") }])).error);
  assert.ok(compileAdditionalCss("p {}", sheet([{ type: 7 }])).error);
  assert.ok(compileAdditionalCss("p {}", sheet([{ ...rule, cssRules: [{ type: 7 }] }])).error);
  assert.ok(compileAdditionalCss("p {}", sheet([{ type: 4, conditionText: "(width < 500px)", cssRules: [{ ...rule, style: style("url(x)") }] }])).error);
});
