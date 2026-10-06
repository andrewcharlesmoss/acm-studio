import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { readStudioSource } from "./studio-module-source.mjs";

test("source inspection resolves canonical project and sibling package paths", () => {
  for (const path of ["app/studio/controls/background-selection.tsx", "../acm-styles/src/styles.css"]) {
    assert.equal(readStudioSource(path), readFileSync(new URL(`../${path}`, import.meta.url), "utf8"));
  }
});

test("source inspection follows the extracted inspector modules", () => {
  const source = readStudioSource("app/studio/studio-inspectors.tsx");
  for (const path of ["document-inspector", "block-inspector", "paragraph-inspector"]) {
    assert.ok(source.includes(readFileSync(new URL(`../app/studio/blocks/inspectors/${path}.tsx`, import.meta.url), "utf8")));
  }
});
