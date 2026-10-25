import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { loadProductionModule } from "./production-module.mjs";

const { CodeContent } = await loadProductionModule(new URL("../app/components/blocks/code-content.tsx", import.meta.url));

test("Code paints the same highlighted content in Edit and Preview, including empty and trailing lines", () => {
  for (const code of ["", "one line", "first\nsecond\n", "long ".repeat(40) + "\n\n"]) {
    const preview = renderToStaticMarkup(createElement(CodeContent, { code, language: "typescript" }));
    const edit = renderToStaticMarkup(createElement(CodeContent, { code, language: "typescript", editing: true }));
    assert.equal(edit.replace(' code-highlight', '').replace(' aria-hidden="true"', ''), preview);
    assert.match(preview, /class="studio-code-preview"/);
    assert.match(preview, /<code>.*<\/code>/s);
  }
});

test("Code uses intrinsic painted height and an overlaid input rather than integer textarea measurement", async () => {
  const css = await readFile(new URL("../app/studio/studio.css", import.meta.url), "utf8");
  assert.match(css, /\.code-highlight \{[^}]*position: relative/);
  assert.match(css, /\.code-input \{[^}]*height: 100%[^}]*position: absolute/);
  assert.match(css, /\.studio-code-preview code::after \{ content: "\\200b"; \}/);
});

test("Code editing and preview surfaces expose the same authored background", async () => {
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  const transparent = css.match(/\.block-visual-style\.has-custom-background\s+:is\(([^)]+)\)\s*\{\s*background:\s*transparent;\s*\}/);
  assert.ok(transparent);
  for (const surface of [".code-editor-shell", ".code-highlight", ".studio-code-preview"]) assert.ok(transparent[1].split(/,\s*/).includes(surface), surface);
});
