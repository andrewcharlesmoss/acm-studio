import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { loadProductionModule } from "./production-module.mjs";

const { FootnoteNumbersProvider, useFootnoteNumbers } = await loadProductionModule(new URL("../app/studio/footnote-numbers-context.tsx", import.meta.url));
const { BlockField } = await loadProductionModule(new URL("../app/studio/studio-canvas.tsx", import.meta.url));

function NumberProbe() {
  return createElement("output", null, JSON.stringify([...useFootnoteNumbers()]));
}

const reference = (id, noteId) => ({ id, type: "paragraph", text: "\uFFFC", runs: [{ text: "\uFFFC", inline: { type: "footnote", id: noteId } }] });
const notes = { id: "notes", type: "footnotes", notes: [{ id: "a", text: "First stored" }, { id: "b", text: "Second stored" }, { id: "orphan", text: "Recoverable orphan" }] };

test("numbering provider follows document reading order and excludes hidden references", () => {
  const blocks = [{ id: "group", type: "group", children: [reference("b-ref", "b"), reference("a-ref", "a")] }, { ...reference("hidden", "orphan"), editorial: { hidden: true } }, notes];
  const before = JSON.stringify(blocks);
  const html = renderToStaticMarkup(createElement(FootnoteNumbersProvider, { blocks }, createElement(NumberProbe)));
  assert.equal(html, "<output>[[&quot;b&quot;,1],[&quot;a&quot;,2]]</output>");
  assert.equal(JSON.stringify(blocks), before);
  assert.equal(renderToStaticMarkup(createElement(NumberProbe)), "<output>[]</output>");
});

test("shared editing context numbers note fields while preserving recoverable orphan notes", () => {
  const blocks = [reference("b-ref", "b"), reference("a-ref", "a"), notes];
  const html = renderToStaticMarkup(createElement(FootnoteNumbersProvider, { blocks }, createElement(BlockField, { block: notes, rootBlocks: blocks, writable: false, onChange() {} })));
  assert.match(html, /value="1"[^>]*><textarea[^>]*aria-label="Footnote 1"[^>]*readOnly=""[^>]*>Second stored/);
  assert.match(html, /value="2"[^>]*><textarea[^>]*aria-label="Footnote 2"[^>]*readOnly=""[^>]*>First stored/);
  assert.match(html, /class="is-unreferenced"[^>]*><span>Unreferenced footnote<\/span><textarea[^>]*>Recoverable orphan/);
});

test("Library and main editor supply their complete document to the shared provider", async () => {
  // The catalogue import graph is cyclic for the focused module loader;
  // mounted Library behaviour is checked separately in the browser.
  const library = await readFile(new URL("../app/studio/ui/blocks/block-specimen-catalogue.tsx", import.meta.url), "utf8");
  const canvas = await readFile(new URL("../app/studio/studio-canvas.tsx", import.meta.url), "utf8");
  assert.match(library, /return <FootnoteNumbersProvider blocks=\{data\.blocks\}><TableCaptionProvider/);
  assert.match(canvas, /<FootnoteNumbersProvider blocks=\{props\.activeDocument\.blocks\}>/);
  assert.doesNotMatch(canvas, /const FootnoteNumbersContext/);
});

test("fresh document providers do not leak numbers between independent examples", () => {
  for (const blocks of [[reference("ref", "a"), notes], [reference("ref", "b"), notes], [notes]]) {
    const html = renderToStaticMarkup(createElement(FootnoteNumbersProvider, { blocks }, createElement(NumberProbe)));
    const wanted = blocks.length === 1 ? "[]" : `[[&quot;${blocks[0].runs[0].inline.id}&quot;,1]]`;
    assert.equal(html, `<output>${wanted}</output>`);
  }
});
