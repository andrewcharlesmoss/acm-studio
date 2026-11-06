import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { partCanvasResizeBounds, clampNavigationCanvasWidth, dragNavigationCanvasWidth, navigationCanvasResizeBounds, navigationCanvasWidthFromKey } from "../app/studio/navigation-canvas-resize.ts";

test("both Navigation canvas handles resize in their own visual direction", () => {
  const bounds = navigationCanvasResizeBounds(1000);
  assert.deepEqual(bounds, { min: 320, max: 952 });
  assert.equal(dragNavigationCanvasWidth(600, 120, "right", bounds), 840);
  assert.equal(dragNavigationCanvasWidth(600, -120, "left", bounds), 840);
  assert.equal(dragNavigationCanvasWidth(600, -120, "right", bounds), 360);
  assert.equal(dragNavigationCanvasWidth(600, 120, "left", bounds), 360);
  assert.equal(dragNavigationCanvasWidth(600, -1000, "right", bounds), bounds.min);
  assert.equal(dragNavigationCanvasWidth(600, -1000, "left", bounds), bounds.max);
});

test("the canvas centre stays fixed and both edges adapt while the dragged edge follows the pointer", () => {
  const stageWidth = 1000;
  const initialLeft = (stageWidth - 600) / 2;
  const initialWidth = 600;
  const rightDelta = 80;
  const rightWidth = dragNavigationCanvasWidth(initialWidth, rightDelta, "right", { min: 320, max: 952 });
  const rightLeft = (stageWidth - rightWidth) / 2;
  assert.equal(rightLeft, 120);
  assert.equal(rightLeft + rightWidth / 2, initialLeft + initialWidth / 2);
  assert.equal(rightLeft - initialLeft, -rightDelta);
  assert.equal(rightLeft + rightWidth - (initialLeft + initialWidth), rightDelta);

  const leftDelta = 80;
  const leftWidth = dragNavigationCanvasWidth(initialWidth, leftDelta, "left", { min: 320, max: 952 });
  const left = (stageWidth - leftWidth) / 2;
  assert.equal(leftWidth, 440);
  assert.equal(left + leftWidth / 2, initialLeft + initialWidth / 2);
  assert.equal(left - initialLeft, leftDelta);
  assert.equal(left + leftWidth - (initialLeft + initialWidth), -leftDelta);
});

test("each Navigation canvas handle has accessible keyboard sizing and narrow bounds", () => {
  const bounds = navigationCanvasResizeBounds(260);
  assert.deepEqual(bounds, { min: 212, max: 212 });
  assert.equal(clampNavigationCanvasWidth(600, bounds), 212);
  for (const edge of ["left", "right"]) {
    assert.equal(navigationCanvasWidthFromKey(600, "ArrowLeft", false, edge, { min: 320, max: 952 }), edge === "left" ? 610 : 590);
    assert.equal(navigationCanvasWidthFromKey(600, "ArrowRight", true, edge, { min: 320, max: 952 }), edge === "left" ? 580 : 620);
    assert.equal(navigationCanvasWidthFromKey(600, "Home", false, edge, { min: 320, max: 952 }), 320);
    assert.equal(navigationCanvasWidthFromKey(600, "End", false, edge, { min: 320, max: 952 }), 952);
    assert.equal(navigationCanvasWidthFromKey(600, "Tab", false, edge, { min: 320, max: 952 }), null);
  }
});

test("Site Editor button defaults do not replace the resize cursor", () => {
  const css = readFileSync(new URL("../app/studio/site-editor/site-editor-preview.css", import.meta.url), "utf8");
  assert.match(css, /\.site-editor-preview \.site-navigation-canvas-resize-handle\s*\{\s*cursor:\s*col-resize;/);
});

test("part canvas expands beyond a desktop preset while retaining measured rails and zoom", () => {
  assert.deepEqual(partCanvasResizeBounds(1908, 148), { min: 320, max: 1712 });
  assert.deepEqual(partCanvasResizeBounds(954, 148, 0.5), { min: 320, max: 1664 });
  assert.deepEqual(partCanvasResizeBounds(270, 148), { min: 74, max: 74 });
});

test("all preview surfaces reserve the same visible edge clearance at maximum width", async () => {
  const { previewFrameBounds } = await import("../app/studio/controls/preview-frame-size.ts");
  for (const available of [180, 390, 820, 1440, 2400]) {
    const ordinary = previewFrameBounds(available);
    assert.deepEqual(navigationCanvasResizeBounds(available), ordinary);
    assert.deepEqual(partCanvasResizeBounds(available), ordinary);
    assert.equal((available - ordinary.max) / 2, 24);
    for (const scale of [0.5, 0.9, 1, 1.5, 2]) {
      const part = partCanvasResizeBounds(available, 0, scale);
      const visibleGap = (available - part.max * scale) / 2;
      assert.ok(visibleGap >= 24 && visibleGap < 25, `${available}px at ${scale} retains a 24px gutter`);
    }
  }
});
