import assert from "node:assert/strict";
import test from "node:test";
import { iconGeometry, iconNames, iconMetadata, iconScales } from "@acm/icons";
import { createIconSvg } from "../app/studio/ui/icon-download.mjs";

const escapeXml = (value) => value.replace(/[<>&"']/g, (character) => ({
  "<": "&lt;",
  ">": "&gt;",
  "&": "&amp;",
  '"': "&quot;",
  "'": "&apos;",
})[character]);

test("SVG downloads preserve every symbol's selected optical geometry and pixel size", () => {
  for (const name of iconNames) {
    for (const [index, scale] of iconScales.entries()) {
      const size = [16, 24, 32][index];
      const svg = createIconSvg(name, scale, size);
      assert.match(svg, new RegExp(`width="${size}" height="${size}"`), name + "/" + scale);
      assert.ok(svg.includes(`<title>${escapeXml(iconMetadata[name].label)}</title>`), name);
      assert.ok(svg.includes(`<desc>${escapeXml(iconMetadata[name].description)}</desc>`), name);
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

test("sourced Copilot SVG downloads retain the MIT copyright and permission notice", () => {
  const svg = createIconSvg("keyboard.copilot", "Regular-S", 16);
  assert.match(svg, /<metadata>MIT License/);
  assert.match(svg, /Copyright \(c\) 2023 LobeHub/);
  assert.match(svg, /Permission is hereby granted/);
  assert.doesNotMatch(createIconSvg("action.undo", "Regular-M", 24), /<metadata>/);
});

test("PNG exports preserve rectangular keycaps and existing three-times icon dimensions", async (t) => {
  const { createSvgPng, createIconPng } = await import("../app/studio/ui/icon-download.mjs");
  const originals = new Map(["Image", "document"].map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  const sizes = [];
  let revoked = 0;
  t.after(() => { for (const [key, descriptor] of originals) { if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key]; } });
  t.mock.method(URL, "createObjectURL", () => "blob:local-sample");
  t.mock.method(URL, "revokeObjectURL", () => { revoked++; });
  Object.defineProperty(globalThis, "Image", { configurable: true, value: class { async decode() {} } });
  Object.defineProperty(globalThis, "document", { configurable: true, value: { createElement: () => {
    const canvas = { width: 0, height: 0, getContext: () => ({ drawImage: (_image, _x, _y, width, height) => sizes.push([width, height]) }), toBlob: (callback) => callback(new Blob(["png"], { type: "image/png" })) };
    return canvas;
  } } });
  await createSvgPng("<svg />", 192, 128);
  await createSvgPng("<svg />", 107, 128);
  await createIconPng("<svg />", 16);
  assert.deepEqual(sizes, [[192, 128], [107, 128], [48, 48]]);
  assert.equal(revoked, 3);
  await assert.rejects(createSvgPng("<svg />", 0, 128));
  await assert.rejects(createSvgPng("<svg />", 128, 1537));
  await assert.rejects(createSvgPng("<svg />", 128.5, 128));
});
