import test from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { loadProductionModule } from "./production-module.mjs";
import { readFile } from "node:fs/promises";

const headers = await loadProductionModule(new URL("../app/studio/application-section-headers.tsx", import.meta.url));

test("section headers identify their real context and share the ACM Studio home destination", () => {
	for (const [component, props, label] of [
		["DesignApplicationHeader", { section: "Design Canvas" }, "Design Canvas"],
		["DesignApplicationHeader", { section: "Design Library" }, "Design Library"],
		["SiteEditorApplicationHeader", { saveStatus: "Saved locally", viewport: "desktop", onViewportChange() {}, showTemplate: true, hasTemplate: true, onShowTemplateChange() {} }, "Site Editor"],
		["LibraryApplicationHeader", {}, "Studio UI Library"], ["DashboardApplicationHeader", {}, "Control Centre"],
  ]) {
		const html = renderToStaticMarkup(createElement(headers[component], props));
    assert.match(html, /href="\/" aria-label="ACM Studio home"/);
    assert.ok(html.includes(`studio-app-section">${label}</strong>`));
  }
});

test("section actions retain real destinations and the Site Editor departure guard marker", () => {
  const siteEditor = renderToStaticMarkup(createElement(headers.SiteEditorApplicationHeader, { saveStatus: "Saved locally", viewport: "desktop", onViewportChange() {}, showTemplate: true, hasTemplate: true, onShowTemplateChange() {} }));
  assert.match(siteEditor, /href="\/studio" data-studio-departure="true">Back to Studio/);
  assert.match(siteEditor, /class="studio-view-trigger"[^>]*aria-haspopup="menu"/);
	assert.match(siteEditor, /aria-label="View"[^>]*title="View"[^>]*aria-haspopup="menu"/);
	assert.match(siteEditor, /class="studio-view-trigger-icon"/);
  assert.doesNotMatch(siteEditor, /Editing View|Website View|Full Preview/);
  assert.match(siteEditor, /Saved locally/);
  assert.doesNotMatch(siteEditor, />Export</);
  assert.doesNotMatch(siteEditor, /aria-label="Save"/);
  const library = renderToStaticMarkup(createElement(headers.LibraryApplicationHeader));
  assert.match(library, /href="\/studio" aria-label="Back to Studio"/);
  const dashboard = renderToStaticMarkup(createElement(headers.DashboardApplicationHeader));
  assert.match(dashboard, /href="https:\/\/andrewmoss.me\/"/);
  assert.match(dashboard, /href="\/studio">Open Studio/);
});

test("production owners and the Library consume the same section presentations", async () => {
  const consumers = [
    ["design-editor.tsx", "DesignApplicationHeader"], ["design-library.tsx", "DesignApplicationHeader"],
    ["site-editor/site-editor-preview.tsx", "SiteEditorApplicationHeader"],
    ["ui/studio-ui-library.tsx", "LibraryApplicationHeader"], ["studio-dashboard.tsx", "DashboardApplicationHeader"],
  ];
  const specimen = await readFile(new URL("../app/studio/ui/workspace/application-header-example.tsx", import.meta.url), "utf8");
  for (const [path, component] of consumers) {
    const source = await readFile(new URL(`../app/studio/${path}`, import.meta.url), "utf8");
    assert.ok(source.includes(`<${component}`), `${path} consumes ${component}`);
    assert.ok(specimen.includes(`<${component}`), `Library consumes ${component}`);
  }
  assert.ok(specimen.includes("<StudioHeader"));
  assert.doesNotMatch(specimen, /<StudioAppHeader|<StudioBreadcrumbs|<StudioButton/);
});
