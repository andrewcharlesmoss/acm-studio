import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("Studio primary actions use interface tokens while inserters retain their control treatment", () => {
  const css = read("app/studio/studio.css");
  const layout = read("app/layout.tsx");
  const design = read("app/studio/design.css");
  const media = read("app/studio/media.css");

  assert.match(layout, /universalStylePresetToCssVariables\(UNIVERSAL_STYLE_PRESET\)/);
  assert.match(layout, /<body style=\{universalStyleVariables\}>/);
  for (const [localToken, presetToken] of [
    ["--studio-shared-button-background", "--acm-ui-button-base-background"],
    ["--studio-shared-button-foreground", "--acm-ui-button-base-foreground"],
    ["--studio-shared-button-border", "--acm-ui-button-base-border"],
    ["--studio-shared-button-hover-background", "--acm-ui-button-base-hover-background"],
    ["--studio-shared-button-hover-foreground", "--acm-ui-button-base-hover-foreground"],
  ]) assert.match(layout, new RegExp(`"${localToken}": interfaceStyleTokens\\["${presetToken}"\\]`));

  assert.match(css, /\.button-primary \{ background: var\(--studio-shared-button-background\); border-color: var\(--studio-shared-button-border\); color: var\(--studio-shared-button-foreground\); \}/);
  assert.match(css, /\.button-primary:hover:not\(:disabled\) \{ background: var\(--studio-shared-button-hover-background\); color: var\(--studio-shared-button-hover-foreground\); \}/);
  assert.match(css, /\.editor-history-actions button\.editor-add-block \{ background: var\(--studio-shared-button-background\); border-color: var\(--studio-shared-button-border\); color: var\(--studio-shared-button-foreground\); \}/);
  assert.match(css, /\.editor-mode-control button\[aria-pressed="true"\] \{ background: var\(--studio-shared-button-background\); color: var\(--studio-shared-button-foreground\); \}/);
  assert.match(css, /\.canvas-appender-button \{[^}]*background: #1e1e1e;[^}]*color: #fff;/);
  assert.match(css, /\.between-blocks > span \{[^}]*background: var\(--acm-ui-color-selection, #0088FF\);[^}]*color: #fff;/);
  assert.match(css, /\.canvas-appender-button:hover:not\(:disabled\) \{ background: var\(--studio-shared-button-hover-background, #1e6ef4\); color: var\(--studio-shared-button-hover-foreground, #fff\); \}/);
  assert.match(css, /\.choose-media-button \{[^}]*background: var\(--studio-shared-button-background\);[^}]*color: var\(--studio-shared-button-foreground\);/);
  assert.match(css, /\.choose-media-button:hover:not\(:disabled\) \{ background: var\(--studio-shared-button-hover-background\); color: var\(--studio-shared-button-hover-foreground\); \}/);
  assert.doesNotMatch(design, /\.design-conflict-actions \.button-primary \{/);
  assert.doesNotMatch(media, /\.media-dialog-actions \.button-primary \{/);
});
