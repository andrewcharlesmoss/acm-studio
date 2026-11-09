import test from "node:test";
import assert from "node:assert/strict";
import { loadProductionModule } from "./production-module.mjs";

const { attachNavigationRuntime, navigationUsesMobileOverlay, templateNavigationScript } = await loadProductionModule(new URL("../app/studio/navigation-runtime.ts", import.meta.url));

test("Mobile Navigation follows Gutenberg's 600px small-screen breakpoint", () => {
  assert.equal(navigationUsesMobileOverlay(600), true);
  assert.equal(navigationUsesMobileOverlay(601), false);
  assert.match(templateNavigationScript, /navigationUsesMobileOverlay/);
});

test("the production runtime keeps an open mobile menu active beyond the breakpoint, then restores desktop links when closed", async () => {
  const globals = Object.fromEntries(["HTMLElement", "HTMLDetailsElement", "ResizeObserver", "MutationObserver", "window", "document", "getComputedStyle"].map(key => [key, globalThis[key]]));
  class Element {
    constructor({ width = 0, naturalWidth = 0, parentElement = null, isNavigation = false } = {}) {
      this.clientWidth = width;
      this.offsetWidth = naturalWidth;
      this.parentElement = parentElement;
      this.dataset = isNavigation ? { navigationOverlay: "mobile" } : {};
      this.classList = { contains: () => false };
      this.listeners = new Map();
      this.contains = () => false;
      this.open = false;
      this.style = { cssText: "" };
    }
    matches(selector) { return selector === ".template-navigation" && this.dataset.navigationOverlay === "mobile"; }
    closest(selector) {
      if (selector === ".template-header [data-compact-navigation-row]") return row;
      return null;
    }
    querySelector(selector) {
      if (selector === ":scope > .template-navigation-desktop") return desktop;
      if (selector === ":scope > .template-navigation-overlay") return overlay;
      if (selector === ":scope > .template-navigation-items") return list;
      return null;
    }
    querySelectorAll() { return []; }
    getAttribute() { return null; }
    setAttribute() {}
    removeAttribute() {}
    addEventListener(name, listener) { this.listeners.set(name, listener); }
    removeEventListener(name) { this.listeners.delete(name); }
  }
  const row = new Element({ width: 600 });
  let viewport = null;
  const wrapper = new Element();
  wrapper.closest = () => null;
  const nav = new Element({ parentElement: wrapper, isNavigation: true });
  const desktop = new Element();
  const list = new Element({ naturalWidth: 80 });
  const overlay = new Element();
  overlay.classList.contains = name => name === "template-navigation-overlay";
  const rootListeners = new Map();
  nav.querySelector = selector => selector === ":scope > .template-navigation-desktop" ? desktop : selector === ":scope > .template-navigation-overlay" ? overlay : null;
  desktop.querySelector = selector => selector === ":scope > .template-navigation-items" ? list : null;
  row.querySelector = () => null;
  nav.closest = selector => selector === ".template-header [data-compact-navigation-row]" ? row : selector === ".studio-part-resize-frame, .studio-responsive-container, .template-surface" ? viewport : null;
  nav.addEventListener = (name, listener) => rootListeners.set(name, listener);
  nav.removeEventListener = name => rootListeners.delete(name);
  nav.querySelectorAll = () => [];
  const resizeObservers = [];
  globalThis.HTMLElement = Element;
  globalThis.HTMLDetailsElement = Element;
  globalThis.ResizeObserver = class { constructor(callback) { resizeObservers.push(callback); } observe() {} disconnect() {} };
  globalThis.MutationObserver = class { constructor(callback) { this.callback = callback; } observe() {} disconnect() {} };
  globalThis.window = { addEventListener() {}, removeEventListener() {} };
  globalThis.document = { activeElement: null, fonts: { addEventListener() {}, removeEventListener() {} } };
  globalThis.getComputedStyle = () => ({ paddingLeft: "0px", paddingRight: "0px", borderLeftWidth: "0px", borderRightWidth: "0px", marginLeft: "0px", marginRight: "0px", columnGap: "0px", display: "block" });
  try {
    const cleanup = attachNavigationRuntime(nav);
    assert.equal(nav.dataset.navigationCollapsed, "true", "a short menu still collapses at 600px");
    list.offsetWidth = 900;
    resizeObservers[0]();
    assert.equal(nav.dataset.navigationCollapsed, "true", "a long menu also follows the same breakpoint");
    overlay.open = true;
    rootListeners.get("toggle")({ target: overlay });
    row.clientWidth = 601;
    resizeObservers[0]();
    assert.equal(nav.dataset.navigationCollapsed, "true", "an open mobile overlay stays active after the canvas widens");
    assert.equal(overlay.open, true, "resizing does not close the open mobile menu");
    overlay.open = false;
    rootListeners.get("toggle")({ target: overlay });
    assert.equal(nav.dataset.navigationCollapsed, "false", "closing the overlay restores desktop Navigation above 600px");
    viewport = new Element({ width: 1000 });
    row.clientWidth = 192;
    nav.clientWidth = 192;
    resizeObservers[0]();
    assert.equal(nav.dataset.navigationCollapsed, "false", "a narrow Grid track must retain desktop links in a wide canvas");
    viewport.clientWidth = 390;
    resizeObservers[0]();
    assert.equal(nav.dataset.navigationCollapsed, "true", "the same nested Navigation collapses when its actual canvas becomes mobile");
    cleanup();
  } finally {
    for (const [key, value] of Object.entries(globals)) { if (value === undefined) delete globalThis[key]; else globalThis[key] = value; }
  }
});
