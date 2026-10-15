import assert from "node:assert/strict";
import test from "node:test";
import { moveDesignObject, moveDesignObjectFromKey } from "../app/studio/design-transform.ts";
import { resizeSpecimenLayout } from "../app/studio/ui/controls/resize-specimen-layout.ts";

const object = { id: "example", type: "image", assetId: "fixture", x: 20, y: 30, width: 160, height: 90, rotation: 45, opacity: 1 };

test("shared movement preserves artwork, dimensions, and rotation", () => {
  const moved = moveDesignObject(object, 80, -60);
  assert.deepEqual(moved, { ...object, x: 100, y: -30 });
  assert.deepEqual(moveDesignObject(moved, -80, 60), object);
  assert.equal(object.x, 20);
});

test("Design's pointer bounds remain an explicit adapter choice", () => {
  assert.deepEqual(moveDesignObject(object, -100, -100, 0), { ...object, x: 0, y: 0 });
  assert.deepEqual(moveDesignObject(object, -100, -100), { ...object, x: -80, y: -70 });
});

test("keyboard movement retains one-pixel arrows and ten-pixel Shift arrows", () => {
  for (const [key, x, y] of [["ArrowLeft", -1, 0], ["ArrowRight", 1, 0], ["ArrowUp", 0, -1], ["ArrowDown", 0, 1]]) {
    assert.deepEqual(moveDesignObjectFromKey(object, key, false), { ...object, x: object.x + x, y: object.y + y });
    assert.deepEqual(moveDesignObjectFromKey(object, key, true), { ...object, x: object.x + x * 10, y: object.y + y * 10 });
  }
  assert.equal(moveDesignObjectFromKey(object, "Enter", false), null);
});

test("the combined canvas keeps the rotation handle inside its scrollable extent", () => {
  for (const rotation of [0, 45, 90, 180, 270]) for (const zoom of [50, 100, 200]) {
    const value = { ...object, x: -300, y: -200, width: 640, height: 360, rotation };
    const scale = zoom / 100;
    const frame = resizeSpecimenLayout(value, zoom, 1, 726, 64);
    const radians = rotation * Math.PI / 180;
    const x = 210 + (value.x + value.width / 2 - (value.height / 2 + 34 / scale) * Math.sin(radians)) * scale;
    const y = 210 + (value.y + value.height / 2 + (value.height / 2 + 34 / scale) * Math.cos(radians)) * scale;
    assert.ok(x - 14 >= frame.left && x + 14 <= frame.left + frame.width);
    assert.ok(y - 14 >= frame.top && y + 14 <= frame.top + frame.height);
  }
});
