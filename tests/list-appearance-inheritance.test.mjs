import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { loadProductionModule } from "./production-module.mjs";

const { BlockField } = await loadProductionModule(new URL("../app/studio/studio-canvas.tsx", import.meta.url));
const { BlockRenderer } = await loadProductionModule(new URL("../app/components/content.tsx", import.meta.url));
const { visualStyleClassName } = await loadProductionModule(new URL("../app/content/paragraph-styles.ts", import.meta.url));
const style = { textColor: "#FF383C", fontSizeCustom: "32px", lineHeight: "2", appearance: "bold", letterSpacing: "1px", className: "authored-item" };

for (const ordered of [false, true]) test(`item-owned ${ordered ? "ordered" : "unordered"} appearance uses shared inheritance in Edit and Preview`, () => {
  const block = { id: "list", type: "list", style: ordered ? "ordered" : "unordered", marker: "a", start: 3, reversed: true, items: [
    { text: "Styled item", style, children: [{ id: "nested", type: "list", style: "unordered", items: ["Inherited child", { text: "Explicit child", style: { textColor: "#0088FF", fontSizeCustom: "20px" } }] }] },
    "Untouched sibling",
  ] };
  const before = JSON.stringify(block);
  const edit = renderToStaticMarkup(createElement(BlockField, { block, onChange() {}, onTableCellFocus() {}, onTextSelection() {}, onLinkActivate() {} }));
  const preview = renderToStaticMarkup(createElement(BlockRenderer, { blocks: [block], variant: "studio" }));
  for (const html of [edit, preview]) {
    assert.ok(html.includes(`class="list-field-row ${visualStyleClassName(style)}"`));
    assert.match(html, /class="list-field-row block-visual-style has-custom-font-size has-custom-text-colour" style="font-size:20px;color:#0088FF"/);
    assert.match(html, /class="list-field-row"><span class="list-field-marker"/);
    assert.match(html, ordered ? /aria-hidden="true">c\.<\/span>/ : /aria-hidden="true">•<\/span>/);
    assert.equal((html.match(/authored-item/g) ?? []).length, 1, "custom classes are not duplicated");
  }
  const article = renderToStaticMarkup(createElement(BlockRenderer, { blocks: [block] }));
  assert.match(article, /<li class="authored-item" style="font-size:32px;font-style:normal;font-weight:700;line-height:2;letter-spacing:1px;color:#FF383C"/);
  assert.doesNotMatch(article, /list-field-marker|has-custom-font-size/);
  assert.equal(JSON.stringify(block), before, "presentation does not mutate authored data");
});

test("shared typography rules cover the actual List editor and marker line height", async () => {
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  for (const property of ["font-size", "font-family", "appearance", "line-height", "letter-spacing", "text-colour"]) {
    const rule = css.split("\n").find(line => line.startsWith(`.block-visual-style.has-custom-${property} :is(h1,`));
    assert.ok(rule?.includes(".list-item-editor"), property);
  }
  assert.match(css, /has-custom-line-height :is\([^)]*\.list-field-marker[^)]*\) \{ line-height: inherit; \}/);
  const studio = await readFile(new URL("../app/studio/studio.css", import.meta.url), "utf8");
  assert.match(studio, /\.list-field-marker \{ color: var\(--ink\); font-size: 16px; line-height: 1\.55;/, "unstyled defaults remain available");
});
