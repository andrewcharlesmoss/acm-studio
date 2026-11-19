import assert from "node:assert/strict";
import test from "node:test";
import { loadProductionModule } from "./production-module.mjs";

const { commitPageResizePlacement, pageResizeLayout, DesignPageFrame } = await loadProductionModule(new URL("../app/studio/design-page-frame.tsx", import.meta.url));
const original = { width: 600, height: 400 };
const handles = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-8, `${actual} != ${expected}`);
const handlePosition = (layout, handle) => ({
  x: layout.frame.left + layout.frame.width * (handle.includes("w") ? 0 : handle.includes("e") ? 1 : .5),
  y: layout.frame.top + layout.frame.height * (handle.includes("n") ? 0 : handle.includes("s") ? 1 : .5),
});

for (const zoom of [25, 69, 100, 200]) {
  for (const handle of handles) {
    test(`${handle} page handle tracks the pointer at ${zoom}% without moving its layout origin`, () => {
      const scale = zoom / 100;
      const start = pageResizeLayout(original, zoom);
      const startHandle = handlePosition(start, handle);
      for (const growth of [-200, -50, 0, 100, 500]) {
        const page = { width: original.width + growth, height: original.height + growth / 2 };
        const layout = pageResizeLayout(page, zoom, { ...original, handle });
        // Centre alignment and safe-start overflow must retain the same origin,
        // including when the resized page crosses the viewport's available size.
        for (const viewport of [320, 768, 1440]) {
          const startOrigin = Math.max(0, (viewport - start.footprint.width) / 2);
          const currentOrigin = Math.max(0, (viewport - layout.footprint.width) / 2);
          close(currentOrigin, startOrigin);
        }
        assert.deepEqual(layout.footprint, start.footprint);
        const moved = handlePosition(layout, handle);
        const directionX = handle.includes("w") ? -1 : handle.includes("e") ? 1 : 0;
        const directionY = handle.includes("n") ? -1 : handle.includes("s") ? 1 : 0;
        close(moved.x - startHandle.x, directionX * growth * scale);
        close(moved.y - startHandle.y, directionY * growth / 2 * scale);
        close(layout.frame.left + layout.frame.width * (1 - (directionX + 1) / 2), start.frame.width * (1 - (directionX + 1) / 2));
        close(layout.frame.top + layout.frame.height * (1 - (directionY + 1) / 2), start.frame.height * (1 - (directionY + 1) / 2));
      }
    });
  }
}

test("the scrollable frame retains its placement and reserves room for the whole page after release", () => {
  const page = { width: 750, height: 500 };
  const resize = { ...original, handle: "nw" };
  const frame = DesignPageFrame({ page, zoom: 50, resize, children: "page" });
  assert.deepEqual(frame.props.style, { width: 450, height: 300 });
  assert.equal(frame.props.className, "design-page-footprint");
  assert.deepEqual(frame.props.children.props.style, { width: 375, height: 250, left: 0, top: 0 });
  assert.equal(frame.props.children.props.className, "design-canvas-frame");
  assert.equal(frame.props.children.props.children, "page");
  const placement = commitPageResizePlacement(page, resize);
  const released = DesignPageFrame({ page, zoom: 50, placement, children: "page" });
  assert.deepEqual(released.props.style, frame.props.style);
  assert.deepEqual(released.props.children.props.style, frame.props.children.props.style);
});

test("optional fitting retains the same visible frame through successive commits", () => {
  const grown = { width: 800, height: 600 };
  const first = commitPageResizePlacement(grown, { ...original, handle: "nw" });
  const next = { width: 900, height: 1000 };
  const resize = { ...grown, handle: "se" };
  const fit = { width: 700, height: 500, margin: 10 };
  const dragging = pageResizeLayout(next, 100, resize, { placement: first, fit });
  const placement = commitPageResizePlacement(next, resize, first);
  const released = pageResizeLayout(next, 100, null, { placement, fit });
  assert.deepEqual(released, dragging);
  assert.equal(released.frame.height, 480);
  assert.equal(released.frame.top, -40);
  assert.equal(pageResizeLayout(next, 100, null, { placement }).frame.height, 1000);
});
