import test from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { loadProductionModule } from "./production-module.mjs";

const { TemplateNavigationView } = await loadProductionModule(new URL("../app/studio/template-navigation-view.tsx", import.meta.url));

test("authoring appender follows desktop links and stays out of the hamburger", () => {
  const html = renderToStaticMarkup(createElement(TemplateNavigationView, {
    node: { id: "navigation", type: "element", element: "navigation", overlayMenu: "mobile" },
    links: [{ id: "page", label: "Sample Page", url: "#sample-page" }],
    overlayAppender: createElement("button", { "aria-label": "Add navigation link" }, "+"),
  }));
  const desktop = html.split('<details class="template-navigation-overlay"')[0];
  assert.match(desktop, /Sample Page[\s\S]*class="navigation-appender"[\s\S]*Add navigation link/);
  assert.doesNotMatch(html.match(/<summary[\s\S]*?<\/summary>/)?.[0] ?? "", /Add navigation link/);
  assert.equal((html.match(/aria-label="Add navigation link"/g) ?? []).length, 1);
});

test("public navigation has no authoring appender", () => {
  const html = renderToStaticMarkup(createElement(TemplateNavigationView, {
    node: { id: "navigation", type: "element", element: "navigation", overlayMenu: "mobile" },
    links: [{ id: "page", label: "Sample Page", url: "#sample-page" }],
  }));
  assert.doesNotMatch(html, /navigation-appender|Add navigation link/);
});

test("an unselected Navigation hides its desktop link appender", () => {
  const html = renderToStaticMarkup(createElement(TemplateNavigationView, {
    node: { id: "navigation", type: "element", element: "navigation", overlayMenu: "mobile" },
    links: [{ id: "page", label: "Sample Page", url: "#sample-page" }],
    overlayAppender: createElement("button", { "aria-label": "Add navigation link" }, "+"),
    showDesktopAppender: false,
  }));
  assert.doesNotMatch(html.split('<details class="template-navigation-overlay"')[0], /Add navigation link/);
});
