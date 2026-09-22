import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync, readdirSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve, dirname } from "node:path";
import { pathToFileURL } from "node:url";
import { createElement as h, Fragment } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";
import { paneExamples, skeletonDefinition, paneStructure, defaultRegions, initialPaneDemo, updatePaneDemo, demoRows } from "../app/studio/panes/catalogue-model.ts";

const require = createRequire(import.meta.url);
const base = resolve("app/studio/panes");
const compiled = new Map();
function moduleUrl(file) {
  if (compiled.has(file)) return compiled.get(file);
  const source = readFileSync(file, "utf8").replace(/^import "[^"]+\.css";\s*$/gm, "");
  const output = ts.transpileModule(source, { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.ESNext } }).outputText
    .replace(/from "([^"]+)"/g, (_, name) => {
      const url = name.startsWith(".") ? moduleUrl(resolve(dirname(file), name + (name.endsWith("catalogue-model") ? ".ts" : ".tsx"))) : pathToFileURL(require.resolve(name)).href;
      return `from ${JSON.stringify(url)}`;
    });
  const url = "data:text/javascript;base64," + Buffer.from(output).toString("base64");
  compiled.set(file, url);
  return url;
}
const { Pane, PaneWorkspace, PaneSection, PaneTabs, PaneTabPanel } = await import(moduleUrl(resolve(base, "pane-components.tsx")));
const { PaneSpecimen } = await import(moduleUrl(resolve(base, "pane-specimen.tsx")));
const pane = (side, collapsed = false, slots = {}) => h(Pane, { side, label: `${side} sample`, width: side === "left" ? 290 : 300, collapsed, onCollapsedChange() {}, collapseIcon: h("svg"), ...slots }, h("input", { defaultValue: "Retained" }));

test("optional pane regions render only when supplied", () => {
  const bare = renderToStaticMarkup(pane("left"));
  assert.match(bare, /data-pane-region="left.body"/);
  for (const region of ["header", "tabs", "toolbar", "footer"]) assert.ok(!bare.includes(`data-pane-region="left.${region}"`));
  const all = renderToStaticMarkup(pane("left", false, { header: "Heading", tabs: "Tabs", toolbar: "Tools", footer: "Actions" }));
  for (const region of ["header", "tabs", "toolbar", "footer"]) assert.ok(all.includes(`data-pane-region="left.${region}"`));
});

test("independent collapse tracks retain hidden content and reopen controls", () => {
  for (const left of [false, true]) for (const right of [false, true]) {
    const html = renderToStaticMarkup(h(PaneWorkspace, { left: pane("left", left), right: pane("right", right) }, "Centre"));
    assert.ok(html.includes(`--pane-left-width:${left ? 0 : 290}px`));
    assert.ok(html.includes(`--pane-right-width:${right ? 0 : 300}px`));
    assert.equal((html.match(/ hidden=""/g) || []).length, Number(left) + Number(right));
    assert.equal((html.match(/value="Retained"/g) || []).length, 2);
    assert.ok(html.includes(`aria-label="${left ? "Show" : "Hide"} left sample"`));
    assert.ok(html.includes(`aria-label="${right ? "Show" : "Hide"} right sample"`));
  }
  const single = renderToStaticMarkup(h(PaneWorkspace, { right: pane("right") }, "Centre"));
  assert.ok(single.includes("--pane-left-width:0px"));
});

test("multiple component instances have unique IDs and resolvable ARIA targets", () => {
  const tabs = [{ id: "one", label: "One" }, { id: "two", label: "Two" }];
  const tabbed = h(Fragment, null, h(PaneTabs, { id: "test", label: "Example", tabs, active: "one", onChange() {} }), ...tabs.map((tab) => h(PaneTabPanel, { key: tab.id, id: "test", tab: tab.id, active: "one" }, tab.label)));
  const html = renderToStaticMarkup(h(Fragment, null, h(PaneWorkspace, { left: pane("left"), right: pane("right", true) }, h(PaneSection, { title: "Settings" }, tabbed)), h(PaneWorkspace, { left: pane("left") }, "Another")));
  const ids = [...html.matchAll(/ id="([^"]+)"/g)].map((match) => match[1]);
  assert.equal(new Set(ids).size, ids.length);
  for (const [, target] of html.matchAll(/aria-(?:controls|labelledby)="([^"]+)"/g)) assert.ok(ids.includes(target), target);
  assert.match(html, /aria-selected="false" tabindex="-1"/);
  assert.match(html, /role="tabpanel"[^>]+hidden=""/);
});

test("five actual Studio examples preserve widths and match their structure inventory", () => {
  assert.deepEqual(paneExamples.map((example) => example.width), [290, 320, 300, 224, 260]);
  for (const definition of [skeletonDefinition, ...paneExamples]) {
    const studio = definition.id !== "skeleton";
    const regions = studio ? { header: true, tabs: !!definition.tabs.length, toolbar: definition.toolbar, footer: definition.footer } : defaultRegions;
    const layout = studio ? definition.side : "both";
    const html = renderToStaticMarkup(h(PaneSpecimen, { definition, regions, layout, content: "normal", studio }));
    for (const region of paneStructure(layout === "both" ? ["left", "right"] : [layout], regions)) assert.ok(html.includes(`data-pane-region="${region.id}"`), `${definition.id}: ${region.id}`);
    assert.ok(!html.includes("undefined"));
  }
});

test("fixture updates and reset are independent, immutable and have no IO", () => {
  const first = Object.freeze(initialPaneDemo());
  const second = initialPaneDemo();
  const originalFetch = globalThis.fetch;
  globalThis.fetch = () => { throw new Error("Unexpected network access"); };
  try {
    const changed = updatePaneDemo(first, { leftCollapsed: true, value: "Changed", selected: "Home", query: "home" });
    assert.equal(changed.rightCollapsed, false);
    assert.equal(first.leftCollapsed, false);
    assert.deepEqual(second, initialPaneDemo());
    assert.notDeepEqual(changed, initialPaneDemo());
    assert.deepEqual(demoRows("empty", ["Home"], ""), []);
    assert.equal(demoRows("long", ["Home"], "").length, 40);
    assert.deepEqual(demoRows("normal", ["Home", "About"], "HOME"), ["Home"]);
  } finally { globalThis.fetch = originalFetch; }
  // Audit the complete feature boundary as well as exercising its pure handlers.
  for (const file of readdirSync(base).filter((name) => /\.tsx?$/.test(name))) {
    const source = readFileSync(resolve(base, file), "utf8");
    assert.doesNotMatch(source, /localStorage|sessionStorage|indexedDB|studioWriteOwnership|useStudioWorkspace|useTemplates|fetch\s*\(/, file);
  }
});
