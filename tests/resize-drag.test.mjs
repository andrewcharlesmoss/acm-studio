import assert from "node:assert/strict";
import test from "node:test";
import { beginResizeDrag, updateResizeDrag } from "../app/studio/resize-drag.ts";
import { resizePage } from "../app/studio/page-resize.ts";
import { resizeRotatedObject } from "../app/studio/design-transform.ts";

const size = { width: 320, height: 180 };
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-8, `${actual} != ${expected}`);

for (const [handle, x, y] of [["se", 80, 90], ["nw", -80, -90], ["ne", 80, -90], ["sw", -80, 90], ["e", 80, 0], ["s", 0, 90]]) {
  test(`page ${handle}: Shift release retains stretched dimensions and continues at the new ratio`, () => {
    const resize = (basis, dx, dy, keepRatio) => resizePage(basis, handle, dx, dy, keepRatio);
    const drag = beginResizeDrag(size, { x: 0, y: 0 }, false);
    const stretched = updateResizeDrag(drag, { x, y }, false, resize);
    assert.deepEqual(updateResizeDrag(drag, { x, y }, true, resize), stretched);
    const continued = updateResizeDrag(drag, { x: x * 2, y: y * 2 }, true, resize);
    assert.ok(Math.abs(continued.width / continued.height - stretched.width / stretched.height) < 0.01);
    assert.deepEqual(updateResizeDrag(drag, { x: x * 2, y: y * 2 }, false, resize), continued);
    assert.deepEqual(size, { width: 320, height: 180 });
  });
}

for (const rotation of [0, 37, 90]) for (const centred of [false, true]) {
  test(`object at ${rotation} degrees, centred=${centred}: repeated modifier transitions preserve position and dimensions`, () => {
    const object = { ...size, id: "fixture", type: "image", assetId: "fixture", x: 120, y: 80, rotation, opacity: 1 };
    const resize = (basis, dx, dy, keepRatio) => resizeRotatedObject(basis, "se", dx, dy, keepRatio, centred);
    const drag = beginResizeDrag(object, { x: 10, y: 20 }, true);
    const first = updateResizeDrag(drag, { x: 30, y: 50 }, true, resize);
    for (const keepRatio of [false, true, false]) assert.deepEqual(updateResizeDrag(drag, { x: 30, y: 50 }, keepRatio, resize), first);
    const stretched = updateResizeDrag(drag, { x: 75, y: 105 }, false, resize);
    assert.deepEqual(updateResizeDrag(drag, { x: 75, y: 105 }, true, resize), stretched);
    const continued = updateResizeDrag(drag, { x: 95, y: 125 }, true, resize);
    close(continued.width / continued.height, stretched.width / stretched.height);
    if (centred) {
      close(continued.x + continued.width / 2, object.x + object.width / 2);
      close(continued.y + continued.height / 2, object.y + object.height / 2);
    } else {
      const anchor = value => {
        const radians = rotation * Math.PI / 180;
        return { x: value.x + value.width / 2 - value.width / 2 * Math.cos(radians) + value.height / 2 * Math.sin(radians), y: value.y + value.height / 2 - value.width / 2 * Math.sin(radians) - value.height / 2 * Math.cos(radians) };
      };
      close(anchor(continued).x, anchor(object).x);
      close(anchor(continued).y, anchor(object).y);
    }
  });
}

test("a modifier transition with a moving pointer applies only the new movement", () => {
  const resize = (basis, dx, dy, keepRatio) => resizePage(basis, "se", dx, dy, keepRatio);
  const drag = beginResizeDrag(size, { x: 0, y: 0 }, false);
  const stretched = updateResizeDrag(drag, { x: 80, y: 90 }, false, resize);
  assert.deepEqual(updateResizeDrag(drag, { x: 90, y: 100 }, true, resize), resize(stretched, 10, 10, true));
});
