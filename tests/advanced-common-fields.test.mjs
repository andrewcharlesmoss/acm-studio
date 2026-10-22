import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { loadProductionModule } from "./production-module.mjs";
const load = path => loadProductionModule(new URL(path, import.meta.url));
const model = await load("../app/studio/template-model.ts");
const { capabilityProfileFor, navigationCapabilityProfile, pageLinkCapabilityProfile } = await load("../app/studio/blocks/capability-profiles.ts");
const { BlockRenderer } = await load("../app/components/content.tsx");
const { BlockField } = await load("../app/studio/studio-canvas.tsx");
const { TemplateNavigationView } = await load("../app/studio/template-navigation-view.tsx");
const { TemplateNodes } = await load("../app/studio/template-renderer.tsx");
const { paragraphStyleToCss } = await load("../app/content/paragraph-styles.ts");
const { NavigationCanvasEditor } = await load("../app/studio/template-navigation-editor.tsx");
const { validateTemplatePackage } = await load("../app/studio/template-package.ts");
const fields = ["visualStyle.anchor", "visualStyle.className", "visualStyle.additionalCss"];
const style = { anchor: "example-anchor", className: "example-class", additionalCss: "background-color: #ddeeff; padding: 7px;" };
for (const type of ["buttons", "social-linkedin", "social-tiktok", "reading-time"]) {
  test(`${type} exposes exactly the common Advanced fields`, () => {
    assert.deepEqual(capabilityProfileFor(type).controls.filter(control => control.section === "advanced").flatMap(control => control.fields), fields);
  });
  test(`${type} renders common Advanced fields in Edit and Preview`, () => {
    const value = type === "buttons" ? { id: type, type, children: [{ id: "button", type: "button", label: "Example", url: "/", style: "primary" }] }
      : type === "reading-time" ? { id: type, type, mode: "reading-time" }
      : { id: type, type, url: "https://example.com", label: "Example" };
    value.visualStyle = style;
    const document = { id: "document", kind: "post", title: "Example", blocks: [value] };
    for (const [context, component, props] of [["Edit", BlockField, { block: value, document, onChange() {}, onTableCellFocus() {}, onTextSelection() {}, onLinkActivate() {} }], ["Preview", BlockRenderer, { blocks: [value], document, variant: "studio" }]]) {
      const html = renderToStaticMarkup(createElement(component, props));
      assert.equal((html.match(/id="example-anchor"/g) ?? []).length, 1, context);
      assert.match(html, /class="[^"]*example-class/);
      assert.equal((html.match(/padding:7px/g) ?? []).length, 1, context);
      assert.match(html, /background-color:#ddeeff/);
    }
  });
}
test("Navigation inventory retains accessible label after common fields; Page link has exactly three", () => {
  assert.deepEqual(navigationCapabilityProfile.controls.filter(control => control.section === "advanced").flatMap(control => control.fields), [...fields, "ariaLabel"]);
  assert.deepEqual(pageLinkCapabilityProfile.controls.filter(control => control.section === "advanced").flatMap(control => control.fields), fields);
});
function fixture() {
  const set = model.createTemplateSet("Advanced fixture");
  const node = { id: "navigation", type: "element", element: "navigation", overlayMenu: "mobile", visualStyle: { ...style, anchor: "navigation-anchor" }, ariaLabel: "Example navigation" };
  set.navigation = [{ id: "link", label: "Example", url: "/", visualStyle: { ...style }, children: [{ id: "child", label: "Child", url: "/child", visualStyle: { ...style, anchor: "child-anchor" } }] }];
  set.parts[0].nodes = [node];
  return { set, node };
}
test("Page link Advanced fields round-trip through store, package and template projection", () => {
  const { set, node } = fixture();
  const store = model.validateTemplateStore({ version: model.TEMPLATE_VERSION, sets: [set], assignments: [] });
  assert.deepEqual(store.sets[0].navigation[0].visualStyle, style);
  assert.deepEqual(validateTemplatePackage({ format: "acm-studio-template-set", version: model.TEMPLATE_VERSION, set, media: [] }).set.navigation[0].visualStyle, style);
  assert.deepEqual(model.templateNodesFromBlocks(model.templateEditorBlocks([node]))[0].visualStyle, node.visualStyle);
  assert.throws(() => model.validateTemplateStore({ ...store, version: "0.30.0" }), /v0.31.0/);
  delete set.navigation[0].visualStyle.anchor; delete set.navigation[0].visualStyle.additionalCss;
  delete set.navigation[0].children[0].visualStyle.anchor; delete set.navigation[0].children[0].visualStyle.additionalCss;
  assert.equal(model.validateTemplateStore({ version: "0.30.0", sets: [set], assignments: [], libraryOrder: store.libraryOrder }).version, model.TEMPLATE_VERSION);
  assert.throws(() => model.validateTemplateSet({ ...set, navigation: [{ id: "invalid", label: "Example", url: "/", visualStyle: { padding: "5px" } }] }), /supported settings/);
});
for (const overlayMenu of ["never", "mobile", "always"]) test(`Navigation ${overlayMenu} retains safe presentation with no duplicate link anchors`, () => {
  const { set, node } = fixture(); node.overlayMenu = overlayMenu;
  for (const [name, component, props] of [["Edit", NavigationCanvasEditor, { node, links: set.navigation, writable: true, selectedId: null, suggestions: [], onSelect() {}, onChange() {} }], ["Preview/static", TemplateNavigationView, { node, links: set.navigation }]]) {
    const html = renderToStaticMarkup(createElement(component, props));
    for (const anchor of ["navigation-anchor", "example-anchor", "child-anchor"]) assert.equal((html.match(new RegExp(`id="${anchor}"`, "g")) ?? []).length, 1, `${name}: ${anchor}`);
    assert.match(html, /<nav[^>]*class="[^"]*example-class/);
    assert.match(html, /aria-label="Example navigation"/);
    assert.match(html, /<li[^>]*style="[^"]*padding:7px/);
  }
});

test("shared navigation runtime moves anchors to the active container presentation and cleans up", async () => {
  const { attachNavigationRuntime, templateNavigationScript } = await load("../app/studio/navigation-runtime.ts");
  const originals = Object.fromEntries(["HTMLElement", "ResizeObserver", "MutationObserver", "window", "document", "getComputedStyle"].map(key => [key, globalThis[key]]));
  const listeners = new Map(); let callback, visibilityCallback, disconnected = false;
  class Element {
    constructor(classes, parentElement = null) { this.classes = classes; this.parentElement = parentElement; this.dataset = {}; this.id = ""; this.classList = { contains: name => classes.includes(name) }; }
    matches(selector) { return selector === ".template-navigation" && this.classes.includes("template-navigation"); }
    closest(selector) {
      if (selector !== ".template-navigation") return null;
      // eslint-disable-next-line @typescript-eslint/no-this-alias -- Minimal DOM fixture walks its own ancestor chain.
      let item = this;
      while (item && !item.matches(".template-navigation")) item = item.parentElement;
      return item;
    }
    removeAttribute() { this.id = ""; }
    addEventListener(name, listener) { listeners.set(name, listener); }
    removeEventListener(name) { listeners.delete(name); }
  }
  const root = new Element(["template-navigation"]);
  const desktop = new Element(["template-navigation-desktop"], root);
  const overlay = new Element(["template-navigation-overlay"], root);
  const customNav = new Element(["template-navigation"], overlay);
  const customDesktop = new Element(["template-navigation-desktop"], customNav);
  const copies = [new Element([], desktop), new Element([], customDesktop), new Element([], desktop), new Element([], customDesktop)];
  copies.forEach((item, index) => { item.dataset.navigationAnchor = index < 2 ? "parent-anchor" : "submenu-anchor"; });
  root.querySelectorAll = () => copies;
  customNav.querySelectorAll = () => [copies[1], copies[3]];
  root.querySelector = () => desktop;
  customNav.querySelector = () => customDesktop;
  let narrow = false;
  globalThis.HTMLElement = Element;
  globalThis.ResizeObserver = class { constructor(refresh) { callback = refresh; } observe() {} disconnect() { disconnected = true; } };
  globalThis.MutationObserver = class { constructor(refresh) { visibilityCallback = refresh; } observe(_root, options) { assert.deepEqual(options.attributeFilter, ["hidden", "style", "class"]); } disconnect() {} };
  globalThis.window = { addEventListener() {}, removeEventListener() {} };
  globalThis.document = { activeElement: null, fonts: { addEventListener() {}, removeEventListener() {} } };
  globalThis.getComputedStyle = item => ({ display: item === desktop && narrow ? "none" : "block" });
  try {
    const cleanup = attachNavigationRuntime(root);
    const childCleanup = attachNavigationRuntime(customNav);
    assert.deepEqual(copies.map(item => item.id), ["parent-anchor", "", "submenu-anchor", ""]);
    narrow = true; callback();
    assert.deepEqual(copies.map(item => item.id), ["", "parent-anchor", "", "submenu-anchor"]);
    narrow = false; visibilityCallback();
    assert.deepEqual(copies.map(item => item.id), ["parent-anchor", "", "submenu-anchor", ""]);
    childCleanup(); cleanup(); assert.equal(disconnected, true); assert.equal(listeners.size, 0);
    assert.match(templateNavigationScript, /data-navigation-anchor/);
    assert.match(templateNavigationScript, /ResizeObserver/);
  } finally {
    for (const [key, value] of Object.entries(originals)) { if (value === undefined) delete globalThis[key]; else globalThis[key] = value; }
  }
});


test("custom overlay static output preserves link CSS and emits only one authored anchor", () => {
  const { set, node } = fixture();
  node.overlayPartId = "overlay-part"; node.overlayMenu = "always";
  set.parts.push({ id: "overlay-part", name: "Overlay", kind: "overlay", nodes: [{ id: "overlay-layout", type: "group", layout: "stack", children: [{ id: "overlay-navigation", type: "element", element: "navigation", overlayMenu: "never" }] }] });
  const html = renderToStaticMarkup(createElement(TemplateNodes, { set, nodes: [node], document: { id: "document", kind: "post", title: "Example", blocks: [] } }));
  assert.equal((html.match(/id="example-anchor"/g) ?? []).length, 1);
  assert.equal((html.match(/id="child-anchor"/g) ?? []).length, 1);
  assert.equal((html.match(/data-navigation-anchor="example-anchor"/g) ?? []).length, 3);
  assert.match(html, /navigation-overlay-layout/);
  assert.match(html, /padding:7px/);
  assert.deepEqual(paragraphStyleToCss({ additionalCss: "background: url(https://example.com/x); color: #123456;" }), {});
});


test("generated document routing hands both Navigation and Page link anchors to the active document", async () => {
  const { attachNavigationRuntime } = await load("../app/studio/navigation-runtime.ts");
  const originals = Object.fromEntries(["HTMLElement", "MutationObserver", "window", "document", "getComputedStyle"].map(key => [key, globalThis[key]]));
  let refresh, disconnected = false;
  class Element {
    constructor(anchor, parentElement) { this.dataset = { navigationAnchor: anchor }; this.parentElement = parentElement; this.id = anchor; this.classList = { contains: () => false }; }
    removeAttribute() { this.id = ""; }
  }
  const pages = [{ hidden: false, parentElement: null, classList: { contains: () => false } }, { hidden: true, parentElement: null, classList: { contains: () => false } }];
  const nodes = pages.flatMap(page => [new Element("navigation-anchor", page), new Element("link-anchor", page)]);
  const root = { querySelectorAll: selector => selector === "[data-navigation-anchor]" ? nodes : [], addEventListener() {}, removeEventListener() {} };
  globalThis.HTMLElement = Element;
  globalThis.MutationObserver = class { constructor(callback) { refresh = callback; } observe() {} disconnect() { disconnected = true; } };
  globalThis.window = { addEventListener() {}, removeEventListener() {} };
  globalThis.document = { activeElement: null, fonts: { addEventListener() {}, removeEventListener() {} } };
  globalThis.getComputedStyle = () => ({ display: "block" });
  try {
    const cleanup = attachNavigationRuntime(root);
    assert.deepEqual(nodes.map(item => item.id), ["navigation-anchor", "link-anchor", "", ""]);
    pages[0].hidden = true; pages[1].hidden = false; refresh();
    assert.deepEqual(nodes.map(item => item.id), ["", "", "navigation-anchor", "link-anchor"]);
    cleanup(); assert.equal(disconnected, true);
  } finally {
    for (const [key, value] of Object.entries(originals)) { if (value === undefined) delete globalThis[key]; else globalThis[key] = value; }
  }
});
