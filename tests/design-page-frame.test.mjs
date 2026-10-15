import assert from "node:assert/strict";
import test from "node:test";
import { loadProductionModule } from "./production-module.mjs";

const { pageResizeLayout, DesignPageFrame } = await loadProductionModule(new URL("../app/studio/design-page-frame.tsx", import.meta.url));
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

test("the production frame renders the fixed footprint and positioned page, then resumes normal layout after release", () => {
  const page = { width: 750, height: 500 };
  const frame = DesignPageFrame({ page, zoom: 50, resize: { ...original, handle: "nw" }, children: "page" });
  assert.deepEqual(frame.props.style, { width: 300, height: 200 });
  assert.equal(frame.props.className, "design-page-footprint");
  assert.deepEqual(frame.props.children.props.style, { width: 375, height: 250, left: -75, top: -50 });
  assert.equal(frame.props.children.props.className, "design-canvas-frame");
  assert.equal(frame.props.children.props.children, "page");
  const released = DesignPageFrame({ page, zoom: 50, children: "page" });
  assert.deepEqual(released.props.style, { width: 375, height: 250 });
  assert.deepEqual(released.props.children.props.style, { width: 375, height: 250, left: 0, top: 0 });
  assert.deepEqual(pageResizeLayout(original, 50).footprint, { width: 300, height: 200 });
});
