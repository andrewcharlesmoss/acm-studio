import assert from "node:assert/strict";
import test from "node:test";
import { inspectorPopoverGeometry } from "../app/studio/panes/inspector-popover-geometry.mjs";
import { inspectorPopoverOwner, watchInspectorPopover } from "../app/studio/panes/inspector-popover-position.ts";

const base = { ownerLeft: 947, anchorTop: 200, popupHeight: 220, preferredWidth: 240, viewportWidth: 1440, viewportHeight: 900 };

test("a catalogue section menu opens outside the actual pane, with the shared gap", () => {
  const position = inspectorPopoverGeometry(base);
  assert.equal(position.left, 695);
  assert.equal(position.left + position.width, base.ownerLeft - 12);
  assert.equal(position.top, 200);
});

test("the Typography menu matches WordPress at 240px until viewport bounds require shrinking", () => {
  const desktop = inspectorPopoverGeometry({ ...base, preferredWidth: 240, allowOwnerOverlap: true });
  assert.equal(desktop.width, 240);
  assert.equal(desktop.left, base.ownerLeft - 12 - desktop.width);

  const narrow = inspectorPopoverGeometry({ ...base, preferredWidth: 240, ownerLeft: 280, viewportWidth: 390, allowOwnerOverlap: true });
  assert.equal(narrow.width, 240);
  assert.equal(narrow.left, 28);
  assert.equal(narrow.left + narrow.width, 280 - 12);

  const small = inspectorPopoverGeometry({ ...base, preferredWidth: 240, ownerLeft: 140, viewportWidth: 200, allowOwnerOverlap: true });
  assert.equal(small.width, 168);
  assert.equal(small.left, 16);
  assert.ok(small.left + small.width <= 200 - 16);
});

test("colour palettes retain six full swatches beside a tight pane and shrink only at viewport bounds", () => {
  const palette = inspectorPopoverGeometry({ ...base, ownerLeft: 288, preferredWidth: 262, allowOwnerOverlap: true });
  assert.equal(palette.width, 262);
  assert.equal(palette.width - 34, 6 * 28 + 5 * 12);
  assert.equal(palette.left, 16);
  const narrow = inspectorPopoverGeometry({ ...base, ownerLeft: 140, preferredWidth: 262, viewportWidth: 240, allowOwnerOverlap: true });
  assert.equal(narrow.width, 208);
  assert.ok(narrow.left + narrow.width <= 224);
});

test("nested portal editors retain the pane edge and can extend further left of their parent", () => {
  const palette = inspectorPopoverGeometry({ ...base, preferredWidth: 262 });
  const custom = inspectorPopoverGeometry({ ...base, preferredWidth: 260, boundaryLeft: palette.left });
  assert.equal(custom.left + custom.width, palette.left - 12);
  assert.ok(custom.left + custom.width < base.ownerLeft);
});

test("viewport constraints never flip an overlay to the right of its pane", () => {
  const tablet = inspectorPopoverGeometry({ ...base, ownerLeft: 253, viewportWidth: 768 });
  assert.equal(tablet.width, 225);
  assert.equal(tablet.left, 16);
  assert.equal(tablet.left + tablet.width, 253 - 12);
  const nearLeft = inspectorPopoverGeometry({ ...base, ownerLeft: 220 });
  assert.equal(nearLeft.left, 16);
  assert.ok(nearLeft.left < 220);
  const small = inspectorPopoverGeometry({ ...base, viewportWidth: 200, viewportHeight: 300, anchorTop: 260, popupHeight: 800 });
  assert.equal(small.width, 168);
  assert.equal(small.left, 16);
  assert.equal(small.maxHeight, 268);
  assert.equal(small.top, 16);
});

test("explicit catalogue ownership takes precedence over legacy Studio class fallback", () => {
  const catalogue = {};
  const legacy = {};
  const anchor = { closest: selector => selector.includes("data-inspector-popover-owner") ? catalogue : legacy };
  assert.equal(inspectorPopoverOwner(anchor), catalogue);
  assert.equal(inspectorPopoverOwner({ closest: selector => selector === ".studio-inspector" ? legacy : null }), legacy);
});

test("open overlays track owner and popup resize, scrolling and viewport changes, then clean up", () => {
  const previousWindow = globalThis.window;
  const previousObserver = globalThis.ResizeObserver;
  const events = new Map();
  const observed = [];
  let resize;
  let disconnected = false;
  let ownerLeft = 947;
  const owner = { getBoundingClientRect: () => ({ left: ownerLeft }) };
  const anchor = { closest: () => owner, getBoundingClientRect: () => ({ left: 1170, top: 200, bottom: 230 }) };
  const popup = { getBoundingClientRect: () => ({ height: 220 }) };
  const positions = [];
  globalThis.window = { innerWidth: 1440, innerHeight: 900, addEventListener: (name, callback) => events.set(name, callback), removeEventListener: (name, callback) => { if (events.get(name) === callback) events.delete(name); } };
  globalThis.ResizeObserver = class { constructor(callback) { resize = callback; } observe(element) { observed.push(element); } disconnect() { disconnected = true; } };
  try {
    const stop = watchInspectorPopover(anchor, popup, 240, position => positions.push(position));
    assert.ok(observed.includes(owner) && observed.includes(popup) && observed.includes(anchor));
    ownerLeft = 887; resize();
    assert.equal(positions.at(-1).left, 635);
    events.get("scroll")();
    window.innerWidth = 768; events.get("resize")();
    assert.ok(positions.at(-1).left + positions.at(-1).width <= 752);
    stop();
    assert.equal(disconnected, true);
    assert.equal(events.size, 0);
  } finally { globalThis.window = previousWindow; globalThis.ResizeObserver = previousObserver; }
});
