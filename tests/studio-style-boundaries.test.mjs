import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = path => readFile(new URL(path, import.meta.url), "utf8");
const [publicStyles, studioStyles, rootLayout] = await Promise.all([
  read("../app/globals.css"),
  read("../app/studio/studio.css"),
  read("../app/layout.tsx"),
]);

test("Studio shell and workspace focus rules have one stylesheet owner", () => {
  const selectors = [
    "body:has(.studio-shell, .design-shell, .design-library-shell)",
    ":where(.studio-shell, .design-shell, .design-library-shell, .pane-workspace, .pl-catalogue, .rl-shell, .template-surface, .mini-golf-editor-surface, .mini-golf-standalone-page) :focus-visible",
    ":where(.studio-shell, .design-shell, .design-library-shell, .pane-workspace, .pl-catalogue, .rl-shell, .template-surface, .mini-golf-editor-surface, .mini-golf-standalone-page) :focus:not(:focus-visible)",
  ];
  const expectedRules = [
    "background: radial-gradient(circle at 83% 8%, rgba(92, 94, 92, 0.06), transparent 26rem), var(--paper);",
    "border-color: #5c5e5c !important; outline-style: solid; outline-width: var(--focus-ring-width); outline-color: var(--focus-ring-colour) !important; outline-offset: var(--focus-ring-offset);",
    "outline: none !important;",
  ];
  selectors.forEach((selector, index) => {
    assert.equal(publicStyles.includes(selector), false);
    assert.equal(studioStyles.split(selector).length - 1, 1);
    const declarations = studioStyles.slice(studioStyles.indexOf(selector) + selector.length).match(/^\s*\{([^}]+)\}/)?.[1];
    assert.equal(declarations?.trim().replace(/\s+/g, " "), expectedRules[index]);
  });
  assert.match(rootLayout, /import "\.\/studio\/studio\.css";/);
});

test("public focus and presentation baselines remain independent from Studio selectors", () => {
  assert.doesNotMatch(publicStyles, /\.studio-shell|\.design-shell|\.design-library-shell|\.pane-workspace|\.pl-catalogue|\.rl-shell|\.template-surface|\.mini-golf-editor-surface/);
  assert.match(publicStyles, /background: radial-gradient\(circle at 83% 8%, rgba\(49, 88, 201, 0\.08\), transparent 26rem\), var\(--paper\);/);
  assert.match(publicStyles, /a:focus-visible,\s*button:focus-visible,\s*input:focus-visible,\s*textarea:focus-visible,\s*select:focus-visible\s*\{\s*outline: var\(--focus-ring-width\) solid var\(--focus-ring-colour\);\s*outline-offset: var\(--focus-ring-offset\);\s*\}/);
});
