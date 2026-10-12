import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import postcss from "postcss";

// Protect the shared presentation boundary; real CSS cascade is checked in the
// browser using the regression procedure in docs/studio-ui-library.md.
test("template list editor and preview share inherited text colour and family", async () => {
  const source = await readFile(new URL("../app/studio/templates.css", import.meta.url), "utf8");
  const stylesheet = postcss.parse(source);
  let shared;
  stylesheet.walkRules(rule => {
    const selectors = rule.selectors;
    if (selectors.includes(".template-surface .rich-text-editor")
      && selectors.includes(".template-surface .list-item-text")) shared = rule;
  });
  assert.ok(shared, "Editable and preview list text must consume the same template presentation rule");
  const declarations = Object.fromEntries(shared.nodes.filter(node => node.type === "decl").map(node => [node.prop, node.value]));
  assert.equal(declarations.color, "inherit");
  assert.equal(declarations["font-family"], "var(--acm-type-body-family, var(--template-font))");
});
