import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createInterfaceStylePreset } from "@acm/styles";
import { indexPresetSource } from "../app/studio/ui/styles/preset-source.mjs";
import { loadProductionModule } from "./production-module.mjs";

const url = new URL("../app/studio/ui/styles/interface-style-inspection.tsx", import.meta.url);
const baseline = createInterfaceStylePreset();
const { InterfaceStyleSourceInspector } = await loadProductionModule(url);
const { InterfaceStyleSettings, interfaceStyleSectionFromHash } = await loadProductionModule(new URL("../app/studio/ui/styles/interface-style-settings.tsx", import.meta.url));
const noop = () => {};

test("preset locations use actual source bytes for compact, reordered and repeated keys", () => {
  const document = '{\n  "buttons": {"base": {"background": "#123456"}},\n  "fields": {"radius": 2},\n  "typography": {"control": {"size": 13}, "header": {"size": 16}}\n}';
  const result = indexPresetSource(document);
  assert.deepEqual(result["fields.radius"], { line: 3, excerpt: '  "fields": {"radius": 2},', value: 2 });
  assert.equal(result["buttons.base.background"].line, 2);
  assert.equal(result["typography.header.size"].value, 16);
  assert.equal(result["typography.control.size"].value, 13);
  const escaped = JSON.stringify({ 'escaped"key': 'value " radius : 9', array: [false, null, 3] });
  assert.equal(indexPresetSource(escaped)["array.2"].value, 3);
  assert.throws(() => indexPresetSource('{"radius": invalid}'));
});

test("inspector distinguishes canonical saved values from unsaved previews and shows the exact file line", () => {
  const draft = structuredClone(baseline);
  draft.fields.radius = 8;
  const document = JSON.stringify(baseline, null, 2);
  const mapping = indexPresetSource(document)["fields.radius"];
  const html = renderToStaticMarkup(createElement(InterfaceStyleSourceInspector, {
    path: "fields.radius", pinned: true, baseline, draft,
    source: { sourcePath: "acm-styles/src/interface-style-preset.json", document },
    mapping: { line: 374, excerpt: "| interface.fields.radius | --acm-ui-field-radius | 2px | Fields |" },
    onPin: noop, onClear: noop,
  }));
  assert.match(html, /Saved value<\/dt><dd>2/);
  assert.match(html, /Draft value<\/dt><dd>8 · Unsaved/);
  assert.match(html, new RegExp(`Line ${mapping.line}`));
  assert.match(html, /&quot;radius&quot;: 2/);
  assert.match(html, /Written Style Guide · Line 374/);
  assert.match(html, /Clear selection/);
  assert.doesNotMatch(html, /&quot;radius&quot;: 8/);
});

test("bundled and unavailable metadata never invent a live file line", () => {
  for (const source of [undefined, { sourcePath: "acm-styles/src/interface-style-preset.json", document: "invalid" }]) {
    const html = renderToStaticMarkup(createElement(InterfaceStyleSourceInspector, {
      path: "fields.radius", pinned: false, baseline, draft: baseline, source, onPin: noop, onClear: noop,
    }));
    assert.match(html, /File location unavailable/);
    assert.doesNotMatch(html, / · Line \d/);
    assert.match(html, /Unchanged/);
    if (!source) assert.match(html, /Bundled value/);
  }
});

// Execute the production hook with a deterministic React state adapter.
function inspectionHarness() {
  const slots = [];
  let cursor = 0;
  const react = { useState(initial) {
    const index = cursor++;
    if (!(index in slots)) slots[index] = initial;
    return [slots[index], value => { slots[index] = value; }];
  }};
  const code = ts.transpileModule(readFileSync(url, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const require = name => name === "react" ? react : name === "./style-source-path" ? { styleSourcePathFromTarget: target => target?.path ?? null } : {};
  const { useInterfaceStyleInspection } = new Function("require", "exports", `${code}\nreturn exports;`)(require, {});
  return () => { cursor = 0; return useInterfaceStyleInspection(baseline); };
}

test("opt-in pointer inspection, keyboard focus and pinning preserve normal input actions", () => {
  const render = inspectionHarness();
  let inspection = render();
  const event = path => ({ target: { path } });
  assert.equal(inspection.enabled, false);
  inspection.events.onPointerOverCapture(event("fields.radius"));
  assert.equal(render().path, null);
  inspection.setEnabled(true);
  inspection = render();
  inspection.events.onPointerOverCapture(event("fields.radius"));
  inspection = render();
  assert.equal(inspection.path, "fields.radius");
  inspection.events.onPointerLeave();
  inspection = render();
  assert.equal(inspection.path, "fields.radius", "last source remains readable on the inspector");
  inspection.pin();
  inspection = render();
  assert.equal(inspection.pinned, "fields.radius");
  inspection.events.onPointerOverCapture(event("colours.primaryText"));
  inspection = render();
  assert.equal(inspection.path, "fields.radius", "a pin survives pointer movement over other controls");
  inspection.setEnabled(false);
  inspection = render();
  inspection.events.onFocusCapture(event("typography.header.size"));
  inspection = render();
  assert.equal(inspection.path, "typography.header.size", "keyboard inspection works with hover off");
  inspection.events.onClickCapture(event("typography.header.size"));
  inspection.events.onBlurCapture({ relatedTarget: null });
  inspection = render();
  assert.equal(inspection.pinned, "typography.header.size");
  inspection.clear();
  inspection = render();
  assert.equal(inspection.path, null);
  inspection.events.onClickCapture(event("unmapped.action"));
  assert.equal(render().path, null);
});


test("every setting in all five sections maps to a canonical leaf value", () => {
  const indexed = indexPresetSource(JSON.stringify(baseline));
  for (const section of ["colours", "typography", "fields", "buttons", "interactions"]) {
    const html = renderToStaticMarkup(createElement(InterfaceStyleSettings, {
      section, preset: baseline, baseline, disabled: false, inspectedPath: "fields.radius", onChange: noop, onReset: noop, onEndEdit: noop,
    }));
    const paths = [...html.matchAll(/data-style-path="([^"]+)"/g)].map(match => match[1]);
    assert.ok(paths.length);
    for (const path of paths) assert.ok(indexed[path], `Unmapped setting ${path}`);
    if (section === "fields") assert.match(html, /data-source-selected="true"/);
  }
});

test("direct section links resolve only known interface sections", () => {
  assert.equal(interfaceStyleSectionFromHash("#interface-style-typography"), "typography");
  assert.equal(interfaceStyleSectionFromHash("#interface-style-fields"), "fields");
  assert.equal(interfaceStyleSectionFromHash("#interface-style-unknown"), "colours");
  assert.equal(interfaceStyleSectionFromHash(""), "colours");
});
