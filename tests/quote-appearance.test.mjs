import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { loadProductionModule } from "./production-module.mjs";

const { BlockField } = await loadProductionModule(new URL("../app/studio/studio-canvas.tsx", import.meta.url));
const { BlockRenderer } = await loadProductionModule(new URL("../app/components/content.tsx", import.meta.url));
const style = { fontSizeCustom: "32px", textColor: "#FF383C", lineHeight: "2", appearance: "medium", letterSpacing: "1px" };

for (const plain of [false, true]) test(`Quote ${plain ? "Plain" : "Default"} citations share the typography target without changing content`, () => {
  const block = { id: "quote", type: "quote", text: "", quoteStyle: plain ? "plain" : "default", visualStyle: style,
    children: [{ id: "child", type: "paragraph", text: "Inner override", style: { fontSizeCustom: "20px", textColor: "#0088FF" } }],
    attribution: "Marked Author", attributionRuns: [{ text: "Marked ", marks: ["bold"] }, { text: "Author", marks: [{ type: "link", url: "https://example.com/author" }] }] };
  const before = JSON.stringify(block);
  const edit = renderToStaticMarkup(createElement(BlockField, { block, rootBlocks: [block], writable: true, onChange() {} }));
  assert.match(edit, /class="quote-citation quote-citation-editor rich-text-editor"/);
  for (const variant of ["studio", "article"]) {
    const preview = renderToStaticMarkup(createElement(BlockRenderer, { blocks: [block], variant }));
    assert.match(preview, /<figcaption class="quote-citation">/);
    assert.match(preview, /font-size:20px;color:#0088FF/);
    assert.match(preview, /has-custom-font-size/);
    assert.match(preview, /<strong>Marked <\/strong>/);
    assert.match(preview, /href="https:\/\/example.com\/author"/);
  }
  assert.equal(JSON.stringify(block), before);
});

test("Quote citation explicit typography overrides compact defaults in both Studio modes", async () => {
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  for (const property of ["font-size", "font-family", "appearance", "line-height", "letter-spacing", "text-colour"]) {
    const rule = css.split("\n").find(line => line.startsWith(`.block-visual-style.has-custom-${property} :is(h1,`));
    assert.ok(rule?.includes(".quote-citation"), property);
  }
  const studio = await readFile(new URL("../app/studio/studio.css", import.meta.url), "utf8");
  assert.match(studio, /\.quote-field > \.quote-citation \{ color: var\(--muted\); display: block; font-size: var\(--studio-ui-size\); font-style: italic; margin-top: 8px; \}/);
  assert.doesNotMatch(studio, /\.quote-field > span, \.quote-field > figcaption/);
  const publicDefaults = css.match(/\.pull-quote figcaption \{[^}]+\}/)?.[0];
  assert.ok(publicDefaults?.includes("font-size: 13px"), "unstyled article citation keeps its existing hierarchy");
});

test("legacy and empty Quote citations retain their existing render availability", () => {
  for (const attribution of [undefined, "Legacy author"]) {
    const block = { id: "legacy", type: "quote", text: "Legacy quotation", attribution };
    const html = renderToStaticMarkup(createElement(BlockRenderer, { blocks: [block], variant: "studio" }));
    assert.match(html, /Legacy quotation/);
    assert.equal(html.includes('class="quote-citation"'), Boolean(attribution));
    assert.doesNotMatch(html, /has-custom-/);
  }
});
