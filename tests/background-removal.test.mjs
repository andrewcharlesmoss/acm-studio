import test from "node:test";
import assert from "node:assert/strict";
import { normalisePortraitPixels, normaliseSubjectPixels, normaliseSubjectMask, portraitInputSize, portraitMaskPixels } from "../app/studio/background-removal-matte.ts";
import { compactDesignAssets, createDesign, migrateDesignProject, validateDesignProject } from "../app/studio/design-model.ts";

test("portrait preprocessing bounds inference memory and rejects unsupported image sizes", () => {
  assert.deepEqual(portraitInputSize(1200, 1200), { width: 512, height: 512 });
  assert.deepEqual(portraitInputSize(800, 1200), { width: 512, height: 768 });
  assert.deepEqual(portraitInputSize(16000, 1), { width: 1024, height: 32 });
  for (const size of [[0, 1], [1.5, 2], [Infinity, 1], [4001, 4000]]) assert.throws(() => portraitInputSize(...size), /16 megapixels/);
});

test("RGB normalisation uses model channel order and excludes alpha", () => {
  const tensor = normalisePortraitPixels(new Uint8ClampedArray([255, 0, 128, 255, 0, 255, 64, 0]));
  assert.equal(tensor.length, 6);
  assert.deepEqual([...tensor.slice(0, 4)], [1, -1, -1, 1]);
  assert.ok(Math.abs(tensor[4] - (128 / 127.5 - 1)) < 1e-6);
});

test("soft matting retains partial edges and rejects invalid or empty predictions", () => {
  const pixels = portraitMaskPixels(new Float32Array([0, .25, 1, 1.2]), 4);
  assert.deepEqual([pixels[3], pixels[7], pixels[11], pixels[15]], [0, 64, 255, 255]);
  assert.throws(() => portraitMaskPixels(new Float32Array([NaN]), 1), /invalid mask/);
  assert.throws(() => portraitMaskPixels(new Float32Array([1]), 2), /invalid mask/);
  assert.throws(() => portraitMaskPixels(new Float32Array([0, .1]), 2), /No distinct subject/);
});

function fixture() {
  const design = createDesign();
  const asset = { id: "original", name: "portrait.png", type: "image/png", width: 1200, height: 1200, dataUrl: "data:image/png;base64,AAAA" };
  design.assets = [{ ...asset, id: "cutout", sourceAssetId: "original" }, asset, { ...asset, id: "unused" }];
  design.pages[0].objects = [{ id: "portrait", type: "image", assetId: "cutout", x: 10, y: 15, width: 700, height: 600, rotation: 45, opacity: .8, crop: { x: .1, y: .2, width: .8, height: .7 } }];
  return design;
}

test("general subject input excludes alpha from normalisation and handles black images", () => {
  const pixels = normaliseSubjectPixels(new Uint8ClampedArray([64, 32, 16, 255]));
  assert.ok(Math.abs(pixels[0] - (1 - .485) / .229) < 1e-6);
  assert.ok([...normaliseSubjectPixels(new Uint8ClampedArray([0, 0, 0, 255]))].every(Number.isFinite));
  assert.deepEqual([...normaliseSubjectMask(new Float32Array([.25, .5, .75]))], [0, .5, 1]);
  assert.throws(() => normaliseSubjectMask(new Float32Array([1, 1])), /No distinct subject/);
  assert.throws(() => normaliseSubjectMask(new Float32Array([NaN, 1])), /invalid mask/);
});

test("matte cleanup suppresses fringes while retaining opaque foreground and soft edges", () => {
  const rgba = portraitMaskPixels(new Float32Array([.05, .1, .55, 1]), 4, .1);
  assert.deepEqual([rgba[3], rgba[7], rgba[11], rgba[15]], [0, 0, 128, 255]);
  for (const value of [-.1, .41, NaN]) assert.throws(() => portraitMaskPixels(new Float32Array([1]), 1, value), /cleanup/);
});

test("save compaction and reload retain originals, crops and transforms", () => {
  const design = fixture();
  const saved = migrateDesignProject(JSON.parse(JSON.stringify(compactDesignAssets(design))));
  assert.deepEqual(saved.assets.map(asset => asset.id), ["cutout", "original"]);
  assert.deepEqual(saved.pages, design.pages);
  assert.deepEqual(saved.assets[1], design.assets[1]);
  const restored = structuredClone(saved);
  restored.pages[0].objects[0].assetId = "original";
  assert.deepEqual(compactDesignAssets(restored).assets.map(asset => asset.id), ["original"]);
});

test("derived images reject dangling, cyclic and chained provenance", () => {
  for (const sourceAssetId of ["missing", "cutout", 42]) {
    const design = fixture();
    design.assets[0].sourceAssetId = sourceAssetId;
    assert.throws(() => validateDesignProject(design), /invalid original/);
  }
  const design = fixture();
  design.assets[1].sourceAssetId = "unused";
  assert.throws(() => validateDesignProject(design), /directly/);
});

test("existing v1 designs remain readable without derivative metadata", () => {
  const design = fixture();
  delete design.assets[0].sourceAssetId;
  assert.equal(migrateDesignProject(design), design);
});
