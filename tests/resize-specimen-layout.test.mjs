import assert from "node:assert/strict";
import test from "node:test";
import { resizeSpecimenLayout } from "../app/studio/ui/controls/resize-specimen-layout.ts";

const base = { id: "fixture", type: "rectangle", x: -80, y: -45, width: 160, height: 90, rotation: 0, opacity: 1, fill: "#fff", stroke: "#000", strokeWidth: 1 };
for (const rotation of [0, 45, 90]) for (const zoom of [50, 100, 200]) {
  test(`enlarged ${rotation} degree object at ${zoom}% retains all corners and handle padding`, () => {
    const object = { ...base, x: -500, y: -320, width: 1100, height: 700, rotation };
    for (const viewportScale of [1, 0.6]) {
      const frame = resizeSpecimenLayout(object, zoom, viewportScale);
      const radians = rotation * Math.PI / 180;
      for (const x of [-object.width / 2, object.width / 2]) for (const y of [-object.height / 2, object.height / 2]) {
        const px = 210 + (object.x + object.width / 2 + x * Math.cos(radians) - y * Math.sin(radians)) * zoom / 100;
        const py = 210 + (object.y + object.height / 2 + x * Math.sin(radians) + y * Math.cos(radians)) * zoom / 100;
        assert.ok((px - frame.left) * viewportScale >= 23.99);
        assert.ok((py - frame.top) * viewportScale >= 23.99);
        assert.ok((frame.left + frame.width - px) * viewportScale >= 23.99);
        assert.ok((frame.top + frame.height - py) * viewportScale >= 23.99);
      }
    }
  });
}
test("the initial fixture keeps its existing canvas and zoom", () => {
  assert.deepEqual(resizeSpecimenLayout(base, 100, 1), { left: 0, top: 0, width: 420, height: 420 });
});
test("the reported 539px shape expands beyond the old clipping boundary", () => {
  const frame = resizeSpecimenLayout({ ...base, width: 539, height: 303 }, 100, 1);
  assert.ok(frame.left + frame.width >= 210 + base.x + 539 + 24);
});

test("wide viewports reserve enough canvas to compensate left expansion", () => {
  const frame = resizeSpecimenLayout({ ...base, x: -237, width: 680, height: 378 }, 100, 1, 726);
  assert.ok(frame.width - 726 >= -frame.left);
});
