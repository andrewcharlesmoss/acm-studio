import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { createElement as h, Fragment } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { loadProductionModule } from "./production-module.mjs";
import { paneExamples, skeletonDefinition, paneStructure, defaultRegions, initialPaneDemo, updatePaneDemo, demoRows } from "../app/studio/panes/catalogue-model.ts";

const base = resolve("app/studio/panes");
const { Pane, PaneWorkspace, PaneSection, PaneTabs, PaneTabPanel } = await loadProductionModule(new URL("../app/studio/panes/pane-components.tsx", import.meta.url));
const { PaneSpecimen } = await loadProductionModule(new URL("../app/studio/panes/pane-specimen.tsx", import.meta.url));
const { CatalogueNavigation } = await loadProductionModule(new URL("../app/studio/ui/catalogue-navigation.tsx", import.meta.url));
const { BlockLibraryNavigation } = await loadProductionModule(new URL("../app/studio/ui/blocks/block-library-navigation.tsx", import.meta.url));
const { ControlsNavigation, ControlsNavigationMenu } = await loadProductionModule(new URL("../app/studio/ui/controls/controls-navigation.tsx", import.meta.url));
const { CatalogueNavigationSpecimen } = await loadProductionModule(new URL("../app/studio/panes/catalogue-navigation-specimen.tsx", import.meta.url));
const pane = (side, collapsed = false, slots = {}) => h(Pane, { side, label: `${side} sample`, width: side === "left" ? 290 : 300, collapsed, onCollapsedChange() {}, collapseIcon: h("svg"), ...slots }, h("input", { defaultValue: "Retained" }));

test("shared region insets support a horizontal override while retaining the default spacing fallback", () => {
  const css = readFileSync(resolve(base, "pane-components.css"), "utf8");
  for (const selector of [".pane-header, .pane-toolbar, .pane-footer", ".pane-body"]) {
    const declaration = css.slice(css.indexOf(`${selector} {`)).split("}")[0];
    assert.ok(declaration.includes("padding: var(--pane-space) var(--pane-inline-space, var(--pane-space))"));
  }
  assert.match(css, /\[data-pane-spacing="flush"\]\s*\{\s*padding:\s*0;/);
});

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

test("pane tabs default to line-only hover indicators", () => {
  // The focus contract verifies the qualifier separately from tab geometry.
  const componentCss = readFileSync(resolve(base, "pane-components.css"), "utf8").replaceAll(':where(html:not([data-studio-focus-visible="false"]) *)', "");
  const html = renderToStaticMarkup(h(PaneTabs, { id: "default", label: "Default tabs", tabs: [{ id: "one", label: "One" }, { id: "two", label: "Two" }], active: "one", onChange() {} }));
  const selectedOnlyHtml = renderToStaticMarkup(h(PaneTabs, { id: "selected-only", label: "Selected only tabs", tabs: [{ id: "one", label: "One" }], active: "one", onChange() {}, indicatorVariant: "selected" }));
  assert.match(html, /class="pane-tabs"/);
  assert.match(selectedOnlyHtml, /class="pane-tabs pane-tabs--selected-only"/);
  assert.doesNotMatch(componentCss, /pane-tab-label::before/);
  assert.match(componentCss, /\.pane-tabs \.pane-tab-label::after\s*\{[^}]*right:\s*var\(--pane-tab-label-inset, 16px\);[^}]*left:\s*var\(--pane-tab-label-inset, 16px\);[^}]*height:\s*3px;/);
  assert.match(componentCss, /\.pane-tabs button\[aria-selected="true"\]:not\(:disabled\):hover \.pane-tab-label::after\s*\{\s*right:\s*6px;\s*left:\s*6px;/);
  assert.doesNotMatch(componentCss, /\.pane-tabs button:not\(:disabled\):is\(:hover, :focus-visible\) \.pane-tab-label::after\s*\{\s*right:\s*0;\s*left:\s*0;/);
  assert.match(componentCss, /transition:\s*left \.12s ease, right \.12s ease, background-color \.12s ease/);
  assert.match(componentCss, /\.pane-tabs \[aria-selected="true"\] \.pane-tab-label::after\s*\{\s*background:\s*#555;/);
  assert.match(componentCss, /\.pane-tabs button:not\(:disabled\):not\(\[aria-selected="true"\]\):is\(:hover, :focus-visible\) \.pane-tab-label::after\s*\{\s*background:\s*var\(--pane-tab-hover-indicator, #b8b6ae\);/);
  assert.match(componentCss, /\.pane-tabs--selected-only button:not\(:disabled\):not\(\[aria-selected="true"\]\):is\(:hover, :focus-visible\) \.pane-tab-label::after\s*\{\s*background:\s*transparent;/);
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

test("catalogue navigation shares accessible grouped presentation across production and the Pane Library", () => {
  const common = renderToStaticMarkup(h(CatalogueNavigation, {
    title: "Example menu", ariaLabel: "Example menu", navigationLabel: "Example destinations",
    leadingItems: [{ id: "all", label: "All items", current: true, onSelect() {} }],
    groups: [{ id: "text", label: "Text", headingHref: "#text", items: [{ id: "paragraph", label: "Paragraph", href: "#paragraph" }] }],
  }));
  assert.match(common, /<aside class="ui-catalogue-navigation" aria-label="Example menu">/);
  assert.match(common, /<nav aria-label="Example destinations">/);
  assert.match(common, /<button type="button" aria-current="location">All items<\/button>/);
  assert.match(common, /<h3><a href="#text">Text<\/a><\/h3>/);
  assert.match(common, /<a href="#paragraph">Paragraph<\/a>/);

  const blocks = renderToStaticMarkup(h(BlockLibraryNavigation, { active: "paragraph", onSelect() {} }));
  assert.match(blocks, /aria-label="Block Library menu"/);
  assert.match(blocks, /<h2>Block Library<\/h2>/);
  assert.match(blocks, /<h3>Text<\/h3>/);
  assert.match(blocks, /<button type="button" aria-current="location">Paragraph<\/button>/);

  const controls = renderToStaticMarkup(h(ControlsNavigation));
  assert.match(controls, /aria-label="Controls menu"/);
  assert.match(controls, /<h2>Jump to<\/h2>/);
  assert.match(controls, /<a href="#/);
  assert.match(controls, /aria-label="Control specimens"/);

  const example = renderToStaticMarkup(h(CatalogueNavigationSpecimen));
  assert.match(example, /aria-label="Catalogue Navigation Example"/);
  assert.match(example, /Choose a version to compare how the same grouped list/);
  assert.match(example, /<label class="pl-field">Version/);
  assert.match(example, /<option value="blocks" selected="">Block Library<\/option>/);
  assert.match(example, /<option value="controls">Controls<\/option>/);
  assert.match(example, /aria-label="Block Library navigation example"/);
  assert.doesNotMatch(example, /aria-label="Controls navigation example"/);
  assert.doesNotMatch(example, /<aside class="ui-catalogue-navigation" aria-label="Controls menu">/);
  assert.equal((example.match(/>Reset Example<\/button>/g) ?? []).length, 1);
  const navigationCss = readFileSync(resolve("app/studio/ui/catalogue-navigation.css"), "utf8");
  assert.match(navigationCss, /\.ui-catalogue-navigation-list \{ display:grid; gap:\.1rem/);
  assert.match(navigationCss, /\.ui-catalogue-navigation-list a,\.ui-catalogue-navigation-list button \{ display:block; width:100%; padding:\.35rem \.65rem/);
  const controlsMenu = html => html.match(/<aside class="ui-catalogue-navigation" aria-label="Controls menu">.*?<\/aside>/s)?.[0].replaceAll(/href="[^"]+"/g, 'href="#example"');
  const controlsExample = renderToStaticMarkup(h(ControlsNavigationMenu, { activeId: "text-input", hrefForDestination: id => `#${id}`, onNavigate() {} }));
  assert.equal(controlsMenu(controlsExample), controlsMenu(controls), "The shared Controls menu renders the complete production group and item order");
  const exampleTargets = [...example.matchAll(/ id="([^"]+)"/g)].map(match => match[1]);
  for (const [, target] of example.matchAll(/href="#([^"]+)"/g)) assert.ok(exampleTargets.includes(target), `Unresolved example destination: ${target}`);
  assert.match(example, /Reset Example/);
  assert.match(example, /selections stay in separate temporary example state/);
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
