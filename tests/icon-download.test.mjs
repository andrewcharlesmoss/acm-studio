import assert from "node:assert/strict";
import test from "node:test";
import { iconGeometry, iconNames, iconMetadata, iconScales } from "@acm/icons";
import { createIconSvg } from "../app/studio/ui/icon-download.mjs";

test("SVG downloads preserve every symbol's selected optical geometry and pixel size", () => {
  for (const name of iconNames) {
    for (const [index, scale] of iconScales.entries()) {
      const size = [16, 24, 32][index];
      const svg = createIconSvg(name, scale, size);
      assert.match(svg, new RegExp(`width="${size}" height="${size}"`), name + "/" + scale);
      assert.ok(svg.includes(`<title>${iconMetadata[name].label}</title>`), name);
      assert.ok(svg.includes(`<desc>${iconMetadata[name].description}</desc>`), name);
      assert.ok(svg.includes(`stroke-width="${iconGeometry[name][scale].strokeWidth}"`), name + "/" + scale);
      for (const { d } of iconGeometry[name][scale].paths) assert.ok(svg.includes(`d="${d}"`), name + "/" + scale);
      assert.match(svg, /stroke="#1C1C1E"/);
      assert.doesNotMatch(svg, /currentColor|<script|href=/i);
    }
  }
});

test("SVG download builder rejects invalid sizes and unknown icons", () => {
  assert.throws(() => createIconSvg("not-an-icon", "Regular-M", 24), /valid ACM icon/);
  assert.throws(() => createIconSvg("action.undo", "Regular-M", 0), /valid ACM icon/);
  assert.throws(() => createIconSvg("action.undo", "Regular-M", 513), /valid ACM icon/);
});
