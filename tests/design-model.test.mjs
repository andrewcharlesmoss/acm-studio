import test from "node:test";
import assert from "node:assert/strict";
import { createDesign, migrateDesignProject, nextPageName, sanitiseFilename, validateDesignProject } from "../app/studio/design-model.ts";

test("new designs start with one named 1920 by 1080 page", () => {
  const design = createDesign();
  assert.equal(design.version, 1);
  assert.equal(design.pages.length, 1);
  assert.equal(design.pages[0].name, "Page 1");
  assert.equal(design.pages[0].width, 1920);
  assert.equal(design.pages[0].height, 1080);
  assert.doesNotThrow(() => validateDesignProject(design));
});

test("page names remain metadata and duplicate names validate", () => {
  const design = createDesign("Screenshots");
  const second = { ...design.pages[0], id: "page-2", name: "Before" };
  const renamed = { ...design, activePageId: second.id, pages: [{ ...design.pages[0], name: "Before" }, second] };
  assert.equal(nextPageName(renamed.pages), "Page 3");
  assert.doesNotThrow(() => validateDesignProject(renamed));
});

test("design validation rejects missing image assets and oversized pages", () => {
  const design = createDesign();
  const missingAsset = { ...design, pages: [{ ...design.pages[0], objects: [{ id: "image-1", type: "image", assetId: "missing", x: 0, y: 0, width: 100, height: 100, rotation: 0, opacity: 1 }] }] };
  assert.throws(() => validateDesignProject(missingAsset), /missing asset/);
  const oversized = { ...design, pages: [{ ...design.pages[0], width: 5000 }] };
  assert.throws(() => validateDesignProject(oversized), /pages are invalid/);
});

test("design validation rejects unsupported or malformed image assets", () => {
  const design = createDesign();
  const malformed = { ...design, assets: [{ id: "asset-1", name: "bad", type: "image/svg+xml", dataUrl: "data:image/svg+xml;base64,AAAA", width: 1, height: 1 }] };
  assert.throws(() => validateDesignProject(malformed), /design images are invalid/);
});

test("page filenames are safe and deterministic", () => {
  assert.equal(sanitiseFilename(" Results ✓ / final "), "results-final");
  assert.equal(sanitiseFilename("   "), "page");
});

test("design migration boundary accepts the current version and rejects unknown versions", () => {
  const design = createDesign();
  assert.equal(migrateDesignProject(design).id, design.id);
  assert.throws(() => migrateDesignProject({ ...design, version: 2 }), /version is not supported/);
});

test("design validation rejects crops that extend beyond the source image", () => {
  const design = createDesign();
  const asset = { id: "asset-1", name: "image.png", type: "image/png", dataUrl: "data:image/png;base64,AAAA", width: 1, height: 1 };
  const image = { id: "image-1", type: "image", assetId: asset.id, x: 0, y: 0, width: 100, height: 100, rotation: 0, opacity: 1, crop: { x: .8, y: 0, width: .4, height: 1 } };
  assert.throws(() => validateDesignProject({ ...design, assets: [asset], pages: [{ ...design.pages[0], objects: [image] }] }), /image crops are invalid/);
});

test("design validation rejects malformed typed annotation objects", () => {
  const design = createDesign();
  const shape = { id: "shape-1", type: "rectangle", x: 0, y: 0, width: 100, height: 100, rotation: 0, opacity: 1, stroke: "#000000", strokeWidth: 1 };
  assert.throws(() => validateDesignProject({ ...design, pages: [{ ...design.pages[0], objects: [shape] }] }), /design shapes are invalid/);
  const text = { id: "text-1", type: "text", x: 0, y: 0, width: 100, height: 40, rotation: 0, opacity: 1, text: "Label", colour: "#000000", fontFamily: "Arial", fontSize: 16, fontWeight: 400 };
  assert.throws(() => validateDesignProject({ ...design, pages: [{ ...design.pages[0], objects: [text] }] }), /design text objects are invalid/);
  const arrow = { id: "arrow-1", type: "arrow", x: 0, y: 0, width: 100, height: 40, rotation: 0, opacity: 1, stroke: "#000000", strokeWidth: 2, arrowhead: "yes" };
  assert.throws(() => validateDesignProject({ ...design, pages: [{ ...design.pages[0], objects: [arrow] }] }), /design arrows are invalid/);
});

test("arrow style fields are optional for legacy payloads and bounded when present", () => {
  const design = createDesign();
  const legacyArrow = { id: "arrow-legacy", type: "arrow", x: 0, y: 0, width: 100, height: 40, rotation: 0, opacity: 1, stroke: "#000000", strokeWidth: 2, arrowhead: true };
  assert.doesNotThrow(() => validateDesignProject({ ...design, pages: [{ ...design.pages[0], objects: [legacyArrow] }] }));
  const styledArrow = { ...legacyArrow, id: "arrow-styled", startArrowhead: true, arrowheadScale: 1.5, lineStyle: "dotted" };
  assert.doesNotThrow(() => validateDesignProject({ ...design, pages: [{ ...design.pages[0], objects: [styledArrow] }] }));
  for (const invalid of [
    { arrowheadScale: 0.49 },
    { arrowheadScale: 2.01 },
    { arrowheadScale: Number.NaN },
    { lineStyle: "dash" },
    { startArrowhead: "yes" },
  ]) {
    assert.throws(() => validateDesignProject({ ...design, pages: [{ ...design.pages[0], objects: [{ ...legacyArrow, ...invalid }] }] }), /design arrows are invalid/);
  }
});
