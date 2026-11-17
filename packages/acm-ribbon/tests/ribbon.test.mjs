import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("exposes a configurable accessible ribbon foundation", async () => {
  const [source, styles] = await Promise.all([
    readFile(new URL("src/index.tsx", root), "utf8"),
    readFile(new URL("src/styles.css", root), "utf8"),
  ]);

  assert.match(source, /export function RibbonTabs/);
  assert.match(source, /role="tablist"/);
  assert.match(source, /role="tab"/);
  assert.match(source, /ArrowRight/);
  assert.match(source, /ArrowLeft/);
  assert.match(source, /event\.key === "Home"/);
  assert.match(source, /event\.key === "End"/);
  assert.match(source, /useId\(\)\.replace\(\/:\/g, ""\)/);
  assert.match(source, /hidden=\{!effectiveActive\}/);
  assert.match(source, /aria-pressed=\{pressed\}/);
  assert.match(styles, /--acm-ribbon-panel-height: 114px/);
  assert.match(styles, /font-size: 1rem/);
  assert.match(styles, /font-size: \.8125rem; font-weight: 400;[^}]*line-height: 1\.5/);
  assert.match(styles, /font-size: \.8125rem; font-weight: 400; letter-spacing: \.03em; line-height: 1\.5/);
  assert.match(styles, /font-size: 1rem; font-weight: 400; line-height: 1\.5/);
  assert.match(styles, /--acm-ribbon-tab-hover-indicator: #b8b6ae/);
  assert.match(styles, /--acm-ribbon-tab-inline-padding: 16px/);
  assert.match(styles, /\.acm-ribbon-tabs > button::after \{[^}]*left: var\(--acm-ribbon-tab-inline-padding\);[^}]*right: var\(--acm-ribbon-tab-inline-padding\);/);
  assert.match(styles, /\.acm-ribbon-tabs > button:focus \{ border-bottom-color: transparent !important; \}/);
  assert.match(styles, /\.acm-ribbon-tabs > button\.is-active:not\(:disabled\):hover::after \{ left: 6px; right: 6px; \}/);
  assert.match(styles, /\.acm-ribbon-tabs > button:not\(:disabled\):not\(\.is-active\):is\(:hover, :focus-visible\)::after \{ background: var\(--acm-ribbon-tab-hover-indicator\); \}/);
  assert.match(styles, /\.acm-ribbon-tabs > button\.is-active::after \{ background: var\(--acm-ribbon-accent\); \}/);
  assert.doesNotMatch(styles, /\.acm-ribbon-tabs > button:hover:not\(:disabled\).*background: var\(--acm-ribbon-hover\)/);
  assert.match(styles, /\.acm-ribbon-button-compact/);
  assert.match(styles, /\.acm-ribbon-button-standard/);
  assert.match(styles, /\.acm-ribbon-button-large/);
});
