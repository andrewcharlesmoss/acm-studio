import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import postcss from "postcss";

test("Fit to Part hides only the trailing part appender without reserving a gutter", async () => {
  const sheet = postcss.parse(await readFile(new URL("../app/studio/templates.css", import.meta.url), "utf8"));
  const rules = sheet.nodes.filter(node => node.type === "rule" && node.selector.includes(".template-fit-part"));
  assert.equal(rules.length, 2);
  const sizing = rules.find(rule => rule.selector === ".template-editing.template-fit-part :is(.block-canvas, .document-preview)");
  assert.ok(sizing, "Edit and Preview share the same fitted sizing rule");
  assert.deepEqual(sizing.nodes.map(({ prop, value }) => [prop, value]), [["min-height", "0"]]);
  const appender = rules.find(rule => rule.selector === ".template-fit-part .template-part-content > .canvas-blocks > .canvas-appender");
  assert.ok(appender, "Only the direct part appender is hidden, leaving nested controls and Full Canvas unchanged");
  assert.deepEqual(appender.nodes.map(({ prop, value }) => [prop, value]), [["display", "none"]]);
});

test("Template authoring reuses shared spacing without editor-only layout reserves", async () => {
  const templates = postcss.parse(await readFile(new URL("../app/studio/templates.css", import.meta.url), "utf8"));
  const studio = postcss.parse(await readFile(new URL("../app/studio/studio.css", import.meta.url), "utf8"));
  const values = (sheet, selector, property) => {
    const found = [];
    sheet.walkRules(rule => {
      if (rule.selectors.includes(selector)) rule.walkDecls(property, declaration => found.push(declaration.value));
    });
    return found;
  };
  const surface = ".template-editing .template-authoring-surface";
  for (const property of ["--studio-toolbar-top-space", "--studio-selected-toolbar-top-space", "--studio-selected-toolbar-gap"]) {
    assert.deepEqual(values(templates, surface, property), ["0px"]);
  }
  assert.deepEqual(values(templates, surface, "--studio-block-gap"), ["var(--template-spacing)"]);
  assert.deepEqual(values(studio, ".canvas-blocks", "padding-top"), ["var(--studio-toolbar-top-space, 52px)"]);
  assert.deepEqual(values(templates, `${surface} .template-node`, "display"), ["flow-root"]);
  assert.deepEqual(values(templates, `${surface} .studio-block-preview > .content-block`, "border-width"), ["0"]);
  assert.deepEqual(values(studio, ".studio-block-preview > .content-block.is-reading-time", "display"), ["grid"]);
  assert.deepEqual(values(templates, `${surface} .studio-column-content > .nested-add-block`, "position"), ["absolute"]);
  for (const root of [".template-authoring-surface", ".template-authoring-surface > .template-part > .template-part-content"]) {
    assert.deepEqual(values(templates, `.template-editing ${root} > .canvas-blocks > .block-position > .canvas-block`, "border-width"), ["0"]);
  }
  // Inserter/drop-marker geometry must consume the same configurable reserve.
  for (const rule of studio.nodes.filter(node => node.type === "rule" && node.selector.includes(":has(+ .block-position .canvas-block.is-selected) + .block-position"))) {
    rule.walkDecls("top", declaration => assert.ok(declaration.value.includes("var(--studio-selected-toolbar-gap, 38px)")));
  }
});

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
  assert.ok(backgrounds(studio, ".studio-shell :is(.block-editor, .editor-canvas-scroll)").some(value => value.startsWith("var(--studio-workspace-background")));
  assert.ok(backgrounds(library, ".ui-library :is(.block-editor, .editor-canvas-scroll)").some(value => value.startsWith("var(--studio-workspace-background")));
  assert.ok(backgrounds(studio, ".studio-test-context :is(.editor-canvas-scroll,.studio-site-preview-stage)").includes("var(--studio-workspace-background)"));
});
