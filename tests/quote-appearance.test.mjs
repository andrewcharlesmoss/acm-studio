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
  assert.match(edit, /<figcaption class="quote-citation"><span[^>]*class="quote-citation-editor rich-text-editor"/);
  assert.doesNotMatch(edit, /Add paragraph/);
  const withAppender = renderToStaticMarkup(createElement(BlockField, { block, rootBlocks: [block], writable: true, onChange() {}, onOpenNestedInserter() {} }));
  assert.match(withAppender, /class="between-blocks nested-end-inserter"/);
  assert.match(withAppender, /aria-label="Add block"/);
  assert.doesNotMatch(withAppender, /nested-add-block/);
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
  const studio = await readFile(process.env.STUDIO_QUOTE_CSS || new URL("../app/studio/studio.css", import.meta.url), "utf8");
  assert.match(studio, /\.quote-field > \.quote-citation \{ color: inherit; display: block; font-size: 0\.8em; font-style: normal; margin-top: 8px; \}/);
  assert.doesNotMatch(studio, /\.quote-field > span, \.quote-field > figcaption/);
  const publicDefaults = css.match(/\.pull-quote figcaption \{[^}]+\}/)?.[0];
  assert.ok(publicDefaults?.includes("font-size: 13px"), "unstyled article citation keeps its existing hierarchy");
});

test("Quote visual styles stay on the quote block root so the selection frame follows its painted edge", () => {
  const block = { id: "quote", type: "quote", text: "The quotation", visualStyle: { padding: "20px 30px", textColor: "#123456" } };
  const edit = renderToStaticMarkup(createElement(BlockField, { block, rootBlocks: [block], writable: true, onChange() {} }));
  assert.match(edit, /<figure[^>]*class="quote-field align-left block-visual-style has-custom-text-colour" style="color:#123456;padding:20px 30px"/);
  assert.doesNotMatch(edit, /<div[^>]*class="block-visual-style[^>]*><figure class="quote-field/);

  for (const variant of ["studio", "article"]) {
    const preview = renderToStaticMarkup(createElement(BlockRenderer, { blocks: [block], variant }));
    assert.match(preview, /<figure[^>]*class="(?:quote-field|pull-quote) align-left block-visual-style has-custom-text-colour" style="color:#123456;padding:20px 30px"/);
    assert.doesNotMatch(preview, /<div[^>]*class="block-visual-style[^>]*><figure class="(?:quote-field|pull-quote)/);
  }
});

test("Style Book keeps its quote border on the shared quote root", async () => {
  const css = await readFile(new URL("../app/studio/site-editor/style-book.css", import.meta.url), "utf8");
  assert.match(css, /\.site-style-book \.quote-field \{ border-color: currentColor; \}/);
  assert.doesNotMatch(css, /\.site-block-style-quote > \.quote-field/);
});

test("Style Book Pullquote citation stays compact beneath the oversized quotation", async () => {
  const css = await readFile(new URL("../app/studio/site-editor/style-book.css", import.meta.url), "utf8");
  assert.match(css, /\.site-style-book \.is-pullquote \.quote-field \.block-textarea \{[^}]*font-size: var\(--book-h2-font-size\);[^}]*margin-bottom: 20px;/);
  assert.match(css, /\.site-style-book \.is-pullquote \.quote-citation \{ color: var\(--book-text-color\); font-size: var\(--acm-type-metadata-size, 1rem\); font-style: normal; margin-top: 0; text-align: center; \}/);
  assert.doesNotMatch(css, /\.site-style-book \.is-pullquote \.quote-citation \{[^}]*font: inherit/);
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

test("hidden siblings retain canonical indentation context in quotes, sections, and root previews", () => {
  const children = [
    { id: "hidden", type: "paragraph", text: "Hidden", style: { textIndent: "1em" }, editorial: { hidden: true } },
    { id: "visible", type: "paragraph", text: "Visible", style: { textIndent: "2em" } },
    { id: "following", type: "paragraph", text: "Following" },
  ];
  for (const blocks of [children, [{ id: "quote", type: "quote", text: "", children }], [{ id: "section", type: "section", layout: "stack", children }]]) {
    const html = renderToStaticMarkup(createElement(BlockRenderer, { blocks, variant: "studio" }));
    assert.doesNotMatch(html, />Hidden</);
    assert.match(html, /style="text-indent:1em">Visible<\/p>/);
    assert.match(html, /style="text-indent:2em">Following<\/p>/);
  }
});
