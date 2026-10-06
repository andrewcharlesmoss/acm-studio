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
  const revision = execFileSync("git", ["-C", path.dirname(guidePath), "log", "-1", "--format=%H", "--", "STYLE_GUIDE.md"], { encoding: "utf8" }).trim();
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

test("button normal and hover text colours are documented and editable in the Styles preview", () => {
  const guide = source.document;
  const component = fs.readFileSync(path.join(root, "app/studio/ui/styles/style-guide-sandbox.tsx"), "utf8");
  const styles = fs.readFileSync(path.join(root, "app/studio/ui/style-guide.css"), "utf8");
  const presetStyles = fs.readFileSync(path.join(projects, "acm-styles/src/styles.css"), "utf8");

  assert.match(guide, /\| Preset path \| Background \| Text colour \| Border \| Border width \| Hover background \| Hover text colour \|/);
  assert.match(guide, /Each button variant has separately editable text colours for its normal and\s+hover states\./);
  for (const role of ["base", "secondary", "outline"]) {
    assert.match(guide, new RegExp(`\\| buttons\\.${role} \\|`));
    assert.match(component, new RegExp(`\\{ id: "${role}", label: "${role[0].toUpperCase()}${role.slice(1)}" \\}`));
  }
  assert.match(component, /\["foreground", "Text colour"\]/);
  assert.match(component, /\["hoverForeground", "Hover text colour"\]/);
  assert.match(component, /stylePath=\{`buttons\.\$\{buttonRole\}\.\$\{key\}`\}/);
  assert.match(component, /onChange=\{value => updateButton\(key, value\)\}/);
  assert.match(component, /buttons: \{ \.\.\.current\.buttons, \[buttonRole\]: \{ \.\.\.current\.buttons\[buttonRole\], \[key\]: value \} \}/);
  assert.match(component, /style=\{variables\}/);
  assert.match(presetStyles, /color:\s*var\(--acm-button-base-foreground/);
  assert.match(presetStyles, /:is\(button, \.acm-button\):hover\s*\{[^}]*color:\s*var\(--acm-button-base-hover-foreground/);
  assert.match(styles, /\.sg-preview \.acm-button-secondary:hover\s*\{[^}]*color:\s*var\(--acm-button-secondary-hover-foreground\)/);
  assert.match(styles, /\.sg-preview \.acm-button-outline:hover\s*\{[^}]*color:\s*var\(--acm-button-outline-hover-foreground\)/);
  assert.match(component, /aria-label=\{`Reset \$\{label\}`\}/);
});

test("the source viewer remains read-only and does not use browser storage", () => {
  const component = fs.readFileSync(path.join(root, "app/studio/ui/styles/style-guide-sandbox.tsx"), "utf8");
  assert.doesNotMatch(component, /localStorage|sessionStorage|indexedDB/);
  assert.match(component, /onFocusCapture/);
  assert.match(component, /onPointerOverCapture/);
  assert.match(component, /onClickCapture/);
  const resetAllStart = component.indexOf("function resetAll()");
  const resetAllEnd = component.indexOf("function setPaletteColour", resetAllStart);
  assert.notEqual(resetAllStart, -1, "Reset All handler exists");
  assert.notEqual(resetAllEnd, -1, "Reset All handler has a bounded body");
  const resetAll = component.slice(resetAllStart, resetAllEnd);
  assert.match(resetAll, /setMobilePanel\("settings"\)/);
  assert.match(resetAll, /setHoveredSourcePath\(null\)/);
  assert.match(resetAll, /setFocusedSourcePath\(null\)/);
  assert.match(resetAll, /setPinnedSourcePath\(null\)/);
  assert.match(resetAll, /setGuideQuery\(""\)/);
  assert.match(resetAll, /setGuideMatchIndex\(0\)/);
  assert.match(resetAll, /setGuideJumpLine\(null\)/);
  assert.match(resetAll, /hasSourceInteraction\.current = false/);
});

test("the written guide defaults to formatted Markdown with an accessible source toggle", () => {
  const component = fs.readFileSync(path.join(root, "app/studio/ui/styles/style-guide-sandbox.tsx"), "utf8");
  const styles = fs.readFileSync(path.join(root, "app/studio/ui/style-guide.css"), "utf8");
  assert.match(component, /useState<GuideView>\("formatted"\)/);
  assert.match(component, /aria-label="Written guide format"/);
  assert.match(component, />Formatted<\/button>/);
  assert.match(component, />Markdown source<\/button>/);
  assert.match(component, /<FormattedGuideDocument\s+ref=\{formattedGuideRef\}\s+lines=\{lines\}\s+query=\{query\}\s+activeLine=\{activeLine\}/);
  assert.match(component, /aria-label="Full Style Guide Markdown source with line numbers"/);
  assert.match(component, /sg-guide-(?:formatted|markdown)-line-\$\{(?:row\.line|lineNumber)\}/);
  assert.match(component, /<table><thead>/);
  assert.match(component, /<List>\{block\.items\.map/);
  assert.match(component, /\}, \[activeGuideLine, hoveredGuidePath\]\);/);
  assert.match(component, /block\.lines\.some\(item => item\.line === activeLine\)/);
  assert.match(component, /item\.continuations\.some\(continuation => continuation\.line === activeLine\)/);
  assert.match(component, /aria-current=\{activeLine === row\.line \? "location" : undefined\}/);
  assert.match(styles, /\.sg-guide-view-switch button\[aria-pressed="true"\]/);
  assert.match(styles, /\.sg-formatted-table th, \.sg-formatted-table td/);
  assert.match(component, /className=\{`sg-guide-document sg-guide-markdown/);
  assert.match(styles, /\.sg-guide-markdown ol \{/);
  assert.doesNotMatch(styles, /\.sg-guide-document ol \{/);
});

test("colour swatches preserve readable text on hover and keyboard focus", () => {
  const styles = fs.readFileSync(path.join(root, "app/studio/ui/style-guide.css"), "utf8");
  assert.match(styles, /\.acm-universal-style-preset \.sg-swatch:is\(:hover, :focus-visible\)\s*\{[^}]*background:\s*var\(--acm-color-surface\)[^}]*color:\s*var\(--acm-color-text-primary\)/);
});

function collectPaths(value, prefix) {
  return Object.entries(value).flatMap(([key, nested]) => {
    const current = `${prefix}.${key}`;
    return nested && typeof nested === "object" && !Array.isArray(nested)
      ? [current, ...collectPaths(nested, current)]
      : [current];
  });
}
