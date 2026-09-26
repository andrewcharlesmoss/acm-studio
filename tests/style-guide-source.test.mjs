import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const projects = path.resolve(root, "..");
const source = JSON.parse(fs.readFileSync(path.join(root, "app/studio/ui/styles/style-guide-source.json"), "utf8"));
const guidePath = path.join(projects, "workspace-governance/STYLE_GUIDE.md");
const presetPath = path.join(projects, "acm-styles/src/universal-style-preset.json");
const preset = JSON.parse(fs.readFileSync(presetPath, "utf8"));

test("bundled Style Guide matches its committed canonical source", () => {
  const guide = fs.readFileSync(guidePath, "utf8").replace(/\r\n/g, "\n");
  const revision = execFileSync("git", ["-C", path.dirname(guidePath), "rev-parse", "HEAD"], { encoding: "utf8" }).trim();
  assert.equal(source.document, guide);
  assert.equal(source.sourceRevision, revision);
  assert.equal(source.sourceDigest, crypto.createHash("sha256").update(guide).digest("hex"));
  assert.equal(source.sourcePath, "workspace-governance/STYLE_GUIDE.md");
});

test("every preset property and text specimen has a precise guide line", () => {
  const lines = source.document.split("\n");
  const expectedPaths = [
    ...Object.keys(preset.palette).map(key => `palette.${key}`),
    ...Object.entries(preset.typography).flatMap(([role, style]) => collectPaths(style, `typography.${role}`)),
    ...Object.entries(preset.buttons).flatMap(([role, style]) => collectPaths(style, `buttons.${role}`)),
    ...Object.keys(preset.layout).map(key => `layout.${key}`),
    "specimen.link", "specimen.unordered-list", "specimen.ordered-list", "specimen.quote",
  ];

  for (const stylePath of expectedPaths) {
    const mapping = source.mappings[stylePath];
    assert.ok(mapping, `missing source mapping for ${stylePath}`);
    assert.equal(lines[mapping.line - 1], mapping.excerpt, `incorrect excerpt line for ${stylePath}`);
    assert.ok(mapping.heading, `missing section name for ${stylePath}`);
    assert.match(mapping.excerpt, /^\| /);
  }
});

test("the source bundle generator reports stale line references without writing", () => {
  assert.doesNotThrow(() => execFileSync("node", ["scripts/generate-style-guide-source.mjs", "--check"], { cwd: root, stdio: "pipe" }));
});

test("the source viewer remains read-only and does not use browser storage", () => {
  const component = fs.readFileSync(path.join(root, "app/studio/ui/styles/style-guide-sandbox.tsx"), "utf8");
  assert.doesNotMatch(component, /localStorage|sessionStorage|indexedDB/);
  assert.match(component, /onFocusCapture/);
  assert.match(component, /onPointerOverCapture/);
  assert.match(component, /onClickCapture/);
});

function collectPaths(value, prefix) {
  return Object.entries(value).flatMap(([key, nested]) => {
    const current = `${prefix}.${key}`;
    return nested && typeof nested === "object" && !Array.isArray(nested)
      ? [current, ...collectPaths(nested, current)]
      : [current];
  });
}
