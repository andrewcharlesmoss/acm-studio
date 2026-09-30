import test from "node:test";
import assert from "node:assert/strict";
import { hexToHsv, hsvToHex, hsvToHsl, hslToHsv } from "../app/studio/controls/gradient-colour.ts";

test("gradient colour surface round-trips RGB and alpha including achromatic values", () => {
  for (const colour of ["#FFFFFF", "#000000", "#FF0000", "#00FF00", "#0000FF", "#C12F2F", "#9B51E080", "#33A7B500"]) {
    assert.equal(hsvToHex(hexToHsv(colour)), colour);
  }
});
test("HSV hue selection and alpha remain independently adjustable", () => {
  assert.equal(hsvToHex({ hue: 120, saturation: 100, brightness: 100, alpha: 50 }), "#00FF0080");
  assert.equal(hsvToHex({ hue: 240, saturation: 100, brightness: 50, alpha: 0 }), "#00008000");
});
test("HSL channels convert black, white and saturated colours without NaN", () => {
  assert.deepEqual(hsvToHsl(hexToHsv("#FF0000")), [0, 100, 50]);
  assert.deepEqual(hsvToHsl(hexToHsv("#000000")), [0, 0, 0]);
  assert.deepEqual(hsvToHsl(hexToHsv("#FFFFFF")), [0, 0, 100]);
  assert.equal(hsvToHex(hslToHsv(240, 100, 50, 100)), "#0000FF");
  assert.equal(hsvToHex(hslToHsv(120, 0, 0, 100)), "#000000");
});
