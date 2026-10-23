import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import postcss from "postcss";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { loadProductionModule } from "./production-module.mjs";

// Node checks the shared presentation contract and actual rendered markup;
// pointer/frame pixel measurements remain a separate browser check.
test("Separator surface contributes no implicit padding or minimum height", () => {
  const source = process.env.STUDIO_DIVIDER_CSS || new URL("../app/studio/studio.css", import.meta.url);
  const sheet = postcss.parse(readFileSync(source, "utf8"));
  let surface;
  sheet.walkRules(rule => {
    if (rule.selector === ".divider-field") surface = Object.fromEntries(rule.nodes.filter(node => node.type === "decl").map(node => [node.prop, node.value]));
  });
  assert.ok(surface);
  assert.equal(surface.padding, "0");
  assert.equal(surface["min-height"], undefined);
  assert.equal(surface.height, undefined);
});

test("root and nested Separators share Edit/Preview surfaces and preserve authored spacing and appearance", async () => {
  const { StudioCanvas } = await loadProductionModule(new URL("../app/studio/studio-canvas.tsx", import.meta.url));
  for (const nested of [false, true]) for (const authored of [false, true]) for (const appearance of ["default", "wide", "dots"]) {
    const divider = { id: "rule", type: "divider", style: appearance,
      ...(authored ? { visualStyle: { padding: "12px", margin: "20px", backgroundColor: "#123456", borderRadius: "9px" } } : {}) };
    const block = nested ? { id: "group", type: "group", layout: "flow", children: [divider] } : divider;
    const before = structuredClone(block);
    for (const previewing of [false, true]) {
      const html = renderToStaticMarkup(createElement(StudioCanvas, {
        activeDocument: { id: "example", kind: "post", title: "Example", blocks: [block] }, writable: true,
        previewing, presentation: { hideDividers: false }, showCoverImage: false, selectedBlockId: divider.id,
        mediaBlockUrls: {}, linkTargets: [], wordCount: 0, characterCount: 0,
      }));
      assert.match(html, /class="divider-field"/);
      assert.match(html, new RegExp(`class="content-divider is-${appearance}"`));
      if (authored) {
        assert.match(html, /padding:12px/);
        assert.match(html, /margin:20px/);
        assert.match(html, /border-top-color:#123456/);
        assert.match(html, /border-radius:9px/);
      } else assert.match(html, /<div class="divider-field"><hr/);
      if (!previewing) {
        if (nested) assert.match(html, /data-studio-nested-block-id="rule" data-studio-selected="true"/);
        else assert.match(html, /class="canvas-block is-divider is-selected"/);
      }
    }
    assert.deepEqual(block, before);
  }
});
