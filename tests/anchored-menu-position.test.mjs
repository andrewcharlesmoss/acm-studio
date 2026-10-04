import assert from "node:assert/strict";
import test from "node:test";
import { anchoredMenuPosition, watchAnchoredMenu } from "../app/studio/overlays/anchored-menu-position.mjs";

const base = { anchor: { left: 320, right: 350, top: 200, bottom: 230 }, width: 176, height: 360, viewportWidth: 1280, viewportHeight: 900 };

test("toolbar menus prefer below, support end alignment and stay within narrow viewports", () => {
  assert.equal(anchoredMenuPosition(base).top, 238);
  assert.equal(anchoredMenuPosition({ ...base, align: "end" }).left, 174);
  const narrow = anchoredMenuPosition({ ...base, anchor: { left: 288, right: 318, top: 780, bottom: 810 }, viewportWidth: 390, viewportHeight: 844 });
  assert.equal(narrow.left, 206);
  assert.equal(narrow.top, 412);
  assert.ok(narrow.left + base.width <= 382);
  assert.ok(narrow.top + base.height <= 836);
});

test("oversized menus scroll on the larger side and clamp offscreen triggers", () => {
  for (const anchor of [base.anchor, { left: 1500, right: 1530, top: 1500, bottom: 1530 }, { left: -90, right: -60, top: -90, bottom: -60 }]) {
    const position = anchoredMenuPosition({ ...base, anchor, width: 1000, height: 1800, viewportWidth: 390, viewportHeight: 844 });
    assert.ok(position.left >= 8 && position.left + Math.min(1000, position.maxWidth) <= 382);
    assert.ok(position.top >= 8 && position.top + Math.min(1800, position.maxHeight) <= 836);
  }
});

test("visual viewport offsets and reduced keyboard space constrain placement", () => {
  const position = anchoredMenuPosition({ ...base, anchor: { left: 330, right: 360, top: 400, bottom: 430 }, viewportWidth: 350, viewportHeight: 450, viewportLeft: 20, viewportTop: 30 });
  assert.ok(position.left >= 28 && position.left + base.width <= 362);
  assert.ok(position.top >= 38 && position.top + Math.min(base.height, position.maxHeight) <= 472);
});

test("open menus track anchor/popup resizing and scrolling with complete listener cleanup", () => {
  const previousWindow = globalThis.window;
  const previousObserver = globalThis.ResizeObserver;
  const events = new Map();
  const visualEvents = new Map();
  const visualViewport = { width: 1280, height: 900, offsetLeft: 0, offsetTop: 0, addEventListener: (name, callback) => visualEvents.set(name, callback), removeEventListener: (name, callback) => { if (visualEvents.get(name) === callback) visualEvents.delete(name); } };
  const observed = [];
  let resize;
  let disconnected = false;
  let anchorBounds = base.anchor;
  const anchor = { getBoundingClientRect: () => anchorBounds };
  const heights = [];
  const popup = { style: { set maxHeight(value) { heights.push(value); }, get maxHeight() { return heights.at(-1); } }, scrollHeight: 360, getBoundingClientRect: () => ({ width: 176, height: 360 }) };
  const positions = [];
  const frames = new Map();
  let frameId = 0;
  const flush = () => { const pending = [...frames.values()]; frames.clear(); pending.forEach(callback => callback()); };
  globalThis.window = { innerWidth: 1280, innerHeight: 900, visualViewport, requestAnimationFrame: callback => { frames.set(++frameId, callback); return frameId; }, cancelAnimationFrame: id => frames.delete(id), addEventListener: (name, callback) => events.set(name, callback), removeEventListener: (name, callback) => { if (events.get(name) === callback) events.delete(name); } };
  globalThis.ResizeObserver = class { constructor(callback) { resize = callback; } observe(element) { observed.push(element); } disconnect() { disconnected = true; } };
  try {
    const stop = watchAnchoredMenu(anchor, popup, "start", position => positions.push(position));
    assert.deepEqual(observed, [anchor, popup]);
    window.innerWidth = 390; window.innerHeight = 844;
    visualViewport.width = 390; visualViewport.height = 844;
    anchorBounds = { left: 288, right: 318, top: 780, bottom: 810 };
    resize(); events.get("resize")(); events.get("scroll")();
    assert.equal(positions.length, 1, "observer delivery must not synchronously write popup layout");
    assert.equal(frames.size, 1, "resize and scrolling share one scheduled frame");
    flush();
    assert.equal(positions.at(-1).left, 206);
    assert.equal(positions.at(-1).top, 412);
    assert.equal(popup.style.maxWidth, "374px");
    assert.equal(popup.style.maxHeight, "764px");
    assert.ok(!heights.includes("828px"), "measuring must not expand and clamp a scrolled menu");
    visualViewport.offsetLeft = 20; visualViewport.offsetTop = 30;
    visualViewport.width = 350; visualViewport.height = 450;
    visualEvents.get("resize")(); visualEvents.get("scroll")();
    flush();
    assert.ok(positions.at(-1).left >= 28 && positions.at(-1).left + 176 <= 362);
    assert.ok(positions.at(-1).top + 360 <= 472);
    resize();
    assert.equal(frames.size, 1);
    stop();
    assert.equal(frames.size, 0, "unmount cancels pending placement");
    resize();
    assert.equal(frames.size, 0, "queued observer delivery after unmount is ignored");
    assert.equal(disconnected, true);
    assert.equal(events.size, 0);
    assert.equal(visualEvents.size, 0);
  } finally { globalThis.window = previousWindow; globalThis.ResizeObserver = previousObserver; }
});
