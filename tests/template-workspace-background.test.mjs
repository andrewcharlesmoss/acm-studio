import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import postcss from "postcss";

test("Templates and content editors consume the same workspace background token", async () => {
  const templates = postcss.parse(await readFile(new URL("../app/studio/templates.css", import.meta.url), "utf8"));
  const library = postcss.parse(await readFile(new URL("../app/studio/ui/studio-ui-library.css", import.meta.url), "utf8"));
  const studio = postcss.parse(await readFile(new URL("../app/studio/studio.css", import.meta.url), "utf8"));
  function backgrounds(sheet, selector) {
    const values = [];
    sheet.walkRules(rule => {
      if (rule.selectors.includes(selector)) rule.walkDecls("background", decl => values.push(decl.value));
    });
    return values;
  }
  for (const selector of [".template-workspace", ".template-workspace .block-editor", ".template-workspace .editor-canvas-scroll"]) {
    assert.ok(backgrounds(templates, selector).some(value => value.startsWith("var(--studio-workspace-background")), selector);
  }
  assert.ok(backgrounds(library, ".ui-library :is(.block-editor, .editor-canvas-scroll)").some(value => value.startsWith("var(--studio-workspace-background")));
  assert.ok(backgrounds(studio, ".studio-test-context :is(.editor-canvas-scroll,.studio-site-preview-stage)").includes("var(--studio-workspace-background)"));
});
