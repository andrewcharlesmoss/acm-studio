import test from "node:test";
import assert from "node:assert/strict";
import { createDesign } from "../app/studio/design-model.ts";
import {
  DESIGN_IMPORT_MAX_BYTES,
  DESIGN_IMPORT_MAX_OBJECTS,
  DESIGN_IMAGE_MAX_BYTES,
  inspectDesignImageBytes,
  validateDesignImportFileSize,
  validateDesignImportResources,
} from "../app/studio/design-import-limits.mjs";

function png(width, height) {
  const bytes = new Uint8Array(24);
  bytes.set([137, 80, 78, 71, 13, 10, 26, 10], 0);
  const view = new DataView(bytes.buffer);
  view.setUint32(16, width);
  view.setUint32(20, height);
  return bytes;
}

function asset(bytes, width, height, id = "asset-1") {
  return { id, name: "image.png", type: "image/png", dataUrl: `data:image/png;base64,${Buffer.from(bytes).toString("base64")}`, width, height };
}

test("design import file size is bounded before reading", () => {
  assert.doesNotThrow(() => validateDesignImportFileSize(1));
  assert.doesNotThrow(() => validateDesignImportFileSize(DESIGN_IMPORT_MAX_BYTES));
  for (const size of [0, DESIGN_IMPORT_MAX_BYTES + 1, -1, Number.NaN, Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(() => validateDesignImportFileSize(size), /8 MB or smaller/);
  }
});

test("image headers are checked against per-file, dimension and pixel limits before decode", () => {
  assert.deepEqual(inspectDesignImageBytes(png(1920, 1080), "image/png"), { width: 1920, height: 1080 });
  assert.throws(() => inspectDesignImageBytes(png(8192, 8192), "image/png"), /import limits/);
  assert.throws(() => inspectDesignImageBytes(new Uint8Array(DESIGN_IMAGE_MAX_BYTES + 1), "image/png"), /import limits/);
  assert.throws(() => inspectDesignImageBytes(png(2, 2), "image/jpeg"), /import limits/);
});

test("design imports bound pages, assets and aggregate drawing objects", () => {
  const design = createDesign();
  const safe = { ...design, assets: [asset(png(2, 2), 2, 2)] };
  assert.doesNotThrow(() => validateDesignImportResources(safe));
  assert.throws(() => validateDesignImportResources({ ...design, pages: Array(101).fill(design.pages[0]) }), /import limits/);
  assert.throws(() => validateDesignImportResources({ ...design, assets: Array(101).fill(asset(png(2, 2), 2, 2)) }), /import limits/);
  assert.throws(() => validateDesignImportResources({ ...design, pages: [{ ...design.pages[0], objects: Array(DESIGN_IMPORT_MAX_OBJECTS + 1).fill({}) }] }), /import limits/);
});

test("design imports reject image bytes that disagree with declared dimensions", () => {
  const design = createDesign();
  assert.throws(() => validateDesignImportResources({ ...design, assets: [asset(png(32, 16), 16, 32)] }), /import limits/);
});

test("design imports bound cumulative decoded image pixels", () => {
  const design = createDesign();
  const assets = [1, 2, 3].map(index => asset(png(4096, 4096), 4096, 4096, `asset-${index}`));
  assert.throws(() => validateDesignImportResources({ ...design, assets }), /import limits/);
});
