import test from "node:test";
import assert from "node:assert/strict";
import { formatRotationAngle, resizeRotatedObject, rotationCursorCss } from "../app/studio/design-transform.ts";

test("rotation readout uses Canva-style signed angles", () => {
  assert.equal(formatRotationAngle(0), "0°");
  assert.equal(formatRotationAngle(20), "20°");
  assert.equal(formatRotationAngle(223), "-137°");
  assert.equal(formatRotationAngle(340), "-20°");
  assert.equal(formatRotationAngle(180), "180°");
});

const base = { id: "image", type: "image", assetId: "fixture", x: 400, y: 300, width: 200, height: 100, rotation: 0, opacity: 1 };
test("degenerate and extreme proportions remain finite and bounded", () => {
  for (const [width, height] of [[0, 0], [0, 50], [4096, 1]]) {
    const result = resizeRotatedObject({ ...base, width, height }, "se", 100, 100, true, false);
    for (const key of ["x", "y", "width", "height"]) assert.ok(Number.isFinite(result[key]));
    assert.ok(result.width <= 4096 && result.height <= 4096);
  }
});
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-8, `${a} != ${b}`);
function point(object, sx, sy) {
  const angle = object.rotation * Math.PI / 180;
  return { x: object.x + object.width / 2 + sx * object.width / 2 * Math.cos(angle) - sy * object.height / 2 * Math.sin(angle), y: object.y + object.height / 2 + sx * object.width / 2 * Math.sin(angle) + sy * object.height / 2 * Math.cos(angle) };
}
for (const rotation of [0, 45, 90, 135, 180, 270, 359]) {
  for (const [handle, sx, sy] of [["nw", -1, -1], ["ne", 1, -1], ["se", 1, 1], ["sw", -1, 1]]) {
    test(`corner ${handle} shrinks naturally at ${rotation} degrees and fixes the opposite corner`, () => {
      const object = { ...base, rotation };
      const start = point(object, sx, sy);
      const fixed = point(object, -sx, -sy);
      const dx = (fixed.x - start.x) / 4;
      const dy = (fixed.y - start.y) / 4;
      for (const keepRatio of [false, true]) {
        const result = resizeRotatedObject(object, handle, dx, dy, keepRatio, false);
        close(result.width, 150); close(result.height, 75);
        const anchor = point(result, -sx, -sy);
        close(anchor.x, fixed.x); close(anchor.y, fixed.y);
        const dragged = point(result, sx, sy);
        close(dragged.x, start.x + dx); close(dragged.y, start.y + dy);
      }
    });
  }
}
test("free resizing stretches and centred resizing preserves the centre", () => {
  const object = { ...base, rotation: 180 };
  const stretched = resizeRotatedObject(object, "se", 40, 0, false, false);
  close(stretched.width, 160); close(stretched.height, 100);
  const centred = resizeRotatedObject(object, "se", 20, 10, true, true);
  close(centred.width, 160); close(centred.height, 80);
  close(centred.x + centred.width / 2, 500);
  close(centred.y + centred.height / 2, 350);
});
test("minimum and maximum size preserve ratio and the opposite corner", () => {
  for (const delta of [-10000, 10000]) {
    const result = resizeRotatedObject(base, "se", delta, delta / 2, true, false);
    close(result.width / result.height, 2);
    assert.ok(result.width <= 4096 && result.height >= 10);
    close(result.x, base.x); close(result.y, base.y);
  }
});
test("cursor faces inward and turns with the object while retaining its hotspot", () => {
  for (const [angle, expected] of [[0,180], [90,270], [180,360], [270,450], [-90,450], [360,180]]) {
    const cursor = rotationCursorCss(angle);
    assert.ok(decodeURIComponent(cursor).includes(`rotate(${expected} 16 16)`));
    assert.ok(cursor.endsWith('16 16, crosshair'));
  }
});
