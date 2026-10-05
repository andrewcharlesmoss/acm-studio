import { withHtmlDom as withListHtmlDom } from "./html-dom-fixture.mjs";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { compileProductionModule as compileModule } from "./production-module.mjs";

const { BlockRenderer } = await import(await compileModule(new URL("../app/components/content.tsx", import.meta.url)));
const { normaliseTextRuns, safeImageSource } = await import(await compileModule(new URL("../app/content/rich-text.ts", import.meta.url)));
const { parseLocallyPublishedArticles, restoreLegacyPublicationCover, toLocallyPublishedArticle, validatePostForPublication } = await import(await compileModule(new URL("../app/content/local-publishing.ts", import.meta.url)));
const { blockToHtml, formatHtml, parseHtmlToBlock } = await import(await compileModule(new URL("../app/studio/studio-html-editor.ts", import.meta.url)));
const { listMarker } = await import(await compileModule(new URL("../app/content/model.ts", import.meta.url)));
const { validContentBlocks } = await import(await compileModule(new URL("../app/studio/workspace-validation.ts", import.meta.url)));
const { imageDisplayStyle } = await import(await compileModule(new URL("../app/content/image-style.ts", import.meta.url)));
const { normaliseCustomFontSize, validCustomFontSize } = await import(await compileModule(new URL("../app/content/font-size.ts", import.meta.url)));
const { spacerDimensions, spacerOrientationFor } = await import(await compileModule(new URL("../app/content/spacer.ts", import.meta.url)));
const { capabilityProfileFor } = await import(await compileModule(new URL("../app/studio/blocks/capability-profiles.ts", import.meta.url)));
const { updateTableCellRuns } = await import(await compileModule(new URL("../app/content/table-cell-runs.ts", import.meta.url)));
const { updateTableCellMetadata } = await import(await compileModule(new URL("../app/content/table-cell-metadata.ts", import.meta.url)));
const { tableCellForTextTarget } = await import(await compileModule(new URL("../app/studio/table-text-target.ts", import.meta.url)));

test("Button width and Advanced CSS are exposed through shared profile sections", () => {
  const profile = capabilityProfileFor("button");
  const width = profile.controls.find(control => control.id === "width");
  const advanced = profile.controls.find(control => control.id === "advanced");
  assert.equal(width.section, "dimensions");
  assert.ok(profile.defaults.dimensions.includes("width"));
  assert.ok(advanced.fields.includes("visualStyle.additionalCss"));
  const cssCapableCoreBlocks = ["heading", "quote", "list", "table", "code", "image", "embed", "button", "divider", "spacer", "group", "columns", "column", "footnotes", "social-icons", "document-title", "cover-image", "post-date", "post-author"];
  for (const type of cssCapableCoreBlocks) {
    assert.ok(capabilityProfileFor(type).controls.find(control => control.id === "advanced")?.fields.some(field => field.endsWith("additionalCss")), `${type} exposes its mapped Additional CSS field`);
  }
  for (const type of ["social-linkedin", "social-tiktok"]) {
    assert.equal(capabilityProfileFor(type).controls.find(control => control.id === "advanced")?.fields.some(field => field.endsWith("additionalCss")), false, `${type} does not claim the Gutenberg Additional CSS field`);
  }
});

test("Advanced HTML anchor and class metadata is retained by the HTML source format", () => {
  const paragraph = blockToHtml({ id: "paragraph", type: "paragraph", text: "Hello", style: { anchor: "about-me" } });
  const image = blockToHtml({ id: "image", type: "image", src: "https://example.com/photo.png", alt: "Photo", visualStyle: { anchor: "portrait", className: "rounded-photo" } });
  assert.match(paragraph, /data-html-anchor="about-me"/);
  assert.match(paragraph, /data-additional-classes=""/);
  assert.match(paragraph, /data-additional-css=""/);
  assert.match(image, /data-html-anchor="portrait"/);
  assert.match(image, /data-additional-classes="rounded-photo"/);
});

test("Paragraph Additional CSS is retained by the HTML source format and workspace validator", () => {
  const paragraph = { id: "paragraph", type: "paragraph", text: "Hello", style: { additionalCss: "color: red; padding: 1rem;" } };
  assert.match(blockToHtml(paragraph), /data-additional-css="color: red; padding: 1rem;"/);
  assert.equal(validContentBlocks([paragraph]), true);
  assert.equal(validContentBlocks([{ ...paragraph, style: { additionalCss: "x".repeat(6001) } }]), false);
});

test("custom font sizes use the same limits in the inspector and workspace validator", () => {
  assert.equal(normaliseCustomFontSize(500, "px"), "400px");
  assert.equal(normaliseCustomFontSize(26, "vw"), "25vw");
  assert.equal(normaliseCustomFontSize(0, "px"), undefined);
  assert.equal(validCustomFontSize("400px"), true);
  assert.equal(validCustomFontSize("401px"), false);
  assert.equal(validCustomFontSize("25vh"), true);
  assert.equal(validCustomFontSize("26vh"), false);
});

test("Cover Image Fill scale validates and reaches its rendered image and HTML source", () => {
  const cover = { id: "cover-fill", type: "cover-image", aspectRatio: "wide", scale: "fill", displayWidth: 640, displayHeight: 360 };
  assert.equal(validContentBlocks([cover]), true);
  assert.equal(validContentBlocks([{ ...cover, id: "image-fill", type: "image", src: "https://example.com/image.jpg", alt: "Example image" }]), false);
  assert.equal(imageDisplayStyle(cover).objectFit, "fill");
  assert.match(blockToHtml(cover), /data-scale="fill"/);
});

test("ordered lists retain Gutenberg numbering styles through preview and HTML", () => {
  const block = { id: "letters", type: "list", style: "ordered", marker: "A", start: 27, items: ["First", "Second"] };
  assert.equal(listMarker(block, 0), "AA.");
  assert.equal(listMarker(block, 1), "AB.");
  const studio = renderToStaticMarkup(createElement(BlockRenderer, { blocks: [block], variant: "studio" }));
  const publicView = renderToStaticMarkup(createElement(BlockRenderer, { blocks: [block] }));
  assert.match(studio, /<ol[^>]*type="A"[^>]*start="27"/);
  assert.match(studio, /AA\.<\/span>/);
  assert.match(publicView, /<ol[^>]*type="A"[^>]*start="27"/);
  assert.match(blockToHtml(block), /<ol[^>]*type="A"[^>]*start="27"/);
  assert.equal(listMarker({ ...block, marker: "a", reversed: true, start: 28 }, 1), "aa.");
  assert.equal(listMarker({ ...block, marker: "I", start: 4 }, 0), "IV.");
  assert.equal(listMarker({ ...block, marker: "i", start: 9 }, 0), "ix.");
});



test("Button rich labels render and round-trip without turning the outer URL into an inline mark", () => {
  const labelRuns = [{ text: "Bold", marks: ["bold"] }, { text: " and " }, { text: "italic", marks: ["italic"] }];
  for (const url of ["/continue", ""]) {
    const block = { id: "rich-button-preview", type: "button", label: "Bold and italic", labelRuns, url, style: "primary" };
    assert.equal(validContentBlocks([block]), true);
    for (const variant of ["studio", undefined]) {
      const rendered = renderToStaticMarkup(createElement(BlockRenderer, { blocks: [block], variant }));
      assert.match(rendered, /<strong>Bold<\/strong> and <em>italic<\/em>/);
      assert.equal((rendered.match(/<a\b/g) ?? []).length, url ? 1 : 0);
    }
    withListHtmlDom(() => {
      const parsed = parseHtmlToBlock(blockToHtml(block), block);
      assert.ok("block" in parsed, parsed.error);
      assert.equal(parsed.block.label, block.label);
      assert.equal(parsed.block.url, url);
      assert.deepEqual(JSON.parse(JSON.stringify(parsed.block.labelRuns)), labelRuns);
      assert.equal(validContentBlocks([parsed.block]), true);
    });
  }
});

test("read-only Button labels retain rich presentation and disable shared formatting controls", async () => {
  const { StudioCanvas } = await import(await compileModule(new URL("../app/studio/studio-canvas.tsx", import.meta.url)));
  for (const block of [
    { id: "readonly-button", type: "button", label: "Continue", labelRuns: [{ text: "Continue", marks: ["bold"] }], url: "", style: "primary" },
    { id: "readonly-paragraph", type: "paragraph", text: "Continue" },
    { id: "readonly-image", type: "image", src: "/example.png", alt: "Example", caption: "Continue" },
    { id: "readonly-embed", type: "embed", url: "https://www.youtube.com/watch?v=fixture", title: "Example", caption: "Continue" },
    { id: "readonly-table", type: "table", rows: [["Continue"]], caption: "Continue" },
    { id: "readonly-list", type: "list", style: "unordered", items: ["Continue"] },
  ]) {
    const html = renderToStaticMarkup(createElement(StudioCanvas, {
      activeDocument: { id: "readonly-document", kind: "post", status: "draft", title: "Read-only", blocks: [block] },
      previewing: false, writable: false, selectedBlockId: block.id, wordCount: 1, characterCount: 8, linkTargets: [], mediaBlockUrls: {},
    }));
    for (const label of ["Bold selected text", "Italicise selected text", "More text formatting"]) {
      const button = html.match(new RegExp(`<button\\b[^>]*aria-label="${label}"[^>]*>`))?.[0];
      assert.ok(button, `${label} remains discoverable`);
      assert.match(button, /disabled=""/, `${label} advertises read-only availability`);
    }
    if (block.type === "button") {
      assert.match(html, /<strong>Continue<\/strong>/);
      assert.doesNotMatch(html, /aria-label="Button text"|aria-label="Add or edit hyperlink"/);
    } else if (block.type === "embed") {
      assert.match(html, /<figcaption>Continue<\/figcaption>/);
      assert.doesNotMatch(html, /contentEditable="true"/);
    } else {
      assert.doesNotMatch(html, /contentEditable="true"/);
      const fields = html.match(/<[^>]*class="[^"]*\brich-text-editor\b[^"]*"[^>]*>/g) ?? [];
      assert.ok(fields.length, `${block.type} renders its rich fields`);
      for (const field of fields) {
        assert.match(field, /contentEditable="false"/i);
        assert.match(field, /aria-readonly="true"/);
      }
    }
  }
});

test("nested Lists render, validate and round-trip through the semantic HTML source", async () => {
  const block = { id: "parent-list", type: "list", style: "ordered", marker: "A", start: 2, items: [
    { text: "Parent item", runs: [{ text: "Parent " }, { text: "item", marks: ["bold"] }], style: { anchor: "parent-item", backgroundColor: "#eaf3ff", backgroundGradient: { type: "linear", angle: 135, stops: [{ colour: "#a7d8ff", position: 0 }, { colour: "#c99bef", position: 100 }] }, fontSizeCustom: "22px", lineHeight: "1.4", linkColor: "#2563a6", padding: "8px 12px", margin: "4px" }, children: [{ id: "child-list", type: "list", style: "unordered", items: ["Nested item"] }] },
    "Sibling item",
  ] };
  assert.equal(validContentBlocks([block]), true);
  assert.equal(validContentBlocks([{ ...block, items: [{ text: "Supported colour", style: { textColor: "#000000" } }] }]), true, "List Item retains authorised text-colour support");
  assert.equal(validContentBlocks([{ ...block, items: [{ text: "Invalid colour", style: { textColor: "not-a-colour" } }] }]), false);
  assert.equal(validContentBlocks([{ ...block, items: [{ text: "Unsupported shadow", style: { shadow: "soft" } }] }]), false, "List Item still rejects unsupported generic styles");
  assert.equal(validContentBlocks([{ ...block, items: [{ text: "Parent", children: [{ ...block, id: "parent-list" }] }] }]), false, "nested IDs must remain unique");
  const studio = renderToStaticMarkup(createElement(BlockRenderer, { blocks: [block], variant: "studio" }));
  const article = renderToStaticMarkup(createElement(BlockRenderer, { blocks: [block] }));
  assert.match(studio, /<ol[^>]*type="A"[^>]*start="2"/);
  assert.match(studio, /<ul class="list-field-preview"><li class="list-field-row"><span class="list-field-marker" aria-hidden="true">•<\/span><div class="list-field-item-content"><span class="list-item-text">Nested item<\/span><\/div><\/li><\/ul>/);
  assert.match(article, /<ul><li>Nested item<\/li><\/ul>/);
  assert.match(article, /<li id="parent-item" style="font-size:22px;line-height:1\.4;background-color:#eaf3ff;background-image:linear-gradient\(135deg, [^;]+;--studio-paragraph-link-color:#2563a6;padding:8px 12px;margin:4px"/);
  const html = blockToHtml(block);
  assert.match(html, /data-block-id="child-list"/);
  assert.match(html, /data-list-item-style="\{&quot;anchor&quot;:&quot;parent-item&quot;/);
  assert.match(html, /<strong>item<\/strong>/);

  withListHtmlDom(() => {
    const parsed = parseHtmlToBlock(html, block);
    assert.ok("block" in parsed, "nested HTML is accepted");
    assert.deepEqual(JSON.parse(JSON.stringify(parsed.block)), JSON.parse(JSON.stringify(block)));
  });
});

test("Gutenberg block-width alignment reaches HTML, Studio preview and public rendering", () => {
  const blocks = [
    { id: "paragraph-width", type: "paragraph", text: "Paragraph", blockAlign: "wide" },
    { id: "heading-width", type: "heading", level: 2, text: "Heading", blockAlign: "full" },
    { id: "list-width", type: "list", style: "unordered", items: ["Item"], blockAlign: "wide" },
    { id: "code-width", type: "code", code: "const wide = true;", blockAlign: "wide" },
    { id: "quote-align", type: "quote", text: "Quote", blockAlign: "left" },
    { id: "table-align", type: "table", rows: [["Cell"]], blockAlign: "center" },
    { id: "image-align", type: "image", src: "https://example.com/image.jpg", alt: "Image", blockAlign: "right" },
    { id: "embed-align", type: "embed", url: "https://example.com", title: "Example", blockAlign: "wide" },
    { id: "divider-align", type: "divider", blockAlign: "full" },
    { id: "group-width", type: "group", layout: "stack", children: [], blockAlign: "full" },
    { id: "columns-width", type: "columns", children: [], blockAlign: "wide" },
    { id: "title-width", type: "document-title", blockAlign: "full" },
  ];
  const context = { kind: "post", title: "Document title" };
  for (const variant of ["studio", "article"]) {
    const html = renderToStaticMarkup(createElement(BlockRenderer, { blocks, variant, document: context }));
    assert.match(html, /alignwide/);
    assert.match(html, /alignfull/);
    assert.match(html, /alignleft/);
    assert.match(html, /aligncenter/);
    assert.match(html, /alignright/);
    if (variant === "studio") {
      assert.match(html, /content-block is-paragraph has-block-align-wide/);
      assert.match(html, /content-block is-heading has-block-align-full/);
    }
  }
  for (const block of blocks) {
    const html = blockToHtml(block);
    assert.match(html, /data-block-align-explicit="true"/);
    assert.match(html, new RegExp(`align${block.blockAlign}`));
  }
});

test("List items expose the rich-text toolbar and item-scoped editors", async () => {
  const { StudioCanvas } = await import(await compileModule(new URL("../app/studio/studio-canvas.tsx", import.meta.url)));
  const html = renderToStaticMarkup(createElement(StudioCanvas, {
    activeDocument: { id: "list-document", kind: "post", status: "draft", title: "List", blocks: [{ id: "items", type: "list", style: "unordered", items: ["First", "Second"] }] },
    previewing: false, wordCount: 2, characterCount: 11, linkTargets: [], mediaBlockUrls: {}, selectedBlockId: "items",
  }));
  assert.match(html, /aria-label="Bold selected text"/);
  assert.match(html, /aria-label="Italicise selected text"/);
  assert.match(html, /aria-label="Add or edit hyperlink"/);
  assert.match(html, /data-studio-block-id="items" data-list-context-id="items" data-list-item-index="0"/);
  assert.match(html, /data-studio-block-id="items" data-list-context-id="items" data-list-item-index="1"/);
  assert.doesNotMatch(html, /aria-label="Text alignment"/);
});

test("document HTML formatting keeps meaningful inline and preformatted whitespace", () => {
  const formatted = formatHtml("<p><strong>one</strong> <em>two</em></p><pre><code>one  two\n  three</code></pre><pre>   </pre>");
  assert.match(formatted, /<strong>one<\/strong> <em>two<\/em>/);
  assert.equal(formatted.includes("one  two\n  three"), true);
  assert.equal(formatted.includes("<pre>   </pre>"), true);
});

test("metadata HTML keeps dynamic block identity and settings", () => {
  const html = blockToHtml({ id: "date", type: "post-date", format: "iso", showIcon: false, align: "right" });
  assert.match(html, /data-block-type="post-date"/);
  assert.match(html, /data-metadata-format="iso"/);
  assert.match(html, /data-metadata-icon="false"/);
  assert.match(html, /align-right/);
});

test("Columns render as proportional responsive regions and retain column identities in HTML", () => {
  const blocks = [{ id: "columns", type: "columns", gap: 20, stackAt: "mobile", children: [
    { id: "column-left", type: "column", width: 33.333, children: [{ id: "left-text", type: "paragraph", text: "Left" }] },
    { id: "column-right", type: "column", width: 66.667, children: [{ id: "right-text", type: "paragraph", text: "Right" }] },
  ] }];
  const html = renderToStaticMarkup(createElement(BlockRenderer, { blocks, variant: "studio" }));
  assert.match(html, /class="content-columns"/);
  assert.match(html, /--block-layout-grid-template:minmax\(0, 33\.333fr\) minmax\(0, 66\.667fr\)/);
  assert.match(html, /class="content-column"/);
  assert.match(html, /Left/);
  assert.match(html, /Right/);
  const source = blockToHtml(blocks[0]);
  assert.match(source, /data-column-layout="true"/);
  assert.match(source, /data-block-type="column" data-block-id="column-left"/);
  assert.match(source, /data-column-width="66\.667"/);
});

test("shared visual settings render around text blocks in Studio and public views", () => {
  const blocks = [
    { id: "styled-heading", type: "heading", level: 2, text: "Heading", visualStyle: { fontSize: "large", textColor: "#123456", anchor: "heading-link" } },
    { id: "styled-list", type: "list", style: "ordered", items: ["One"], visualStyle: { backgroundColor: "#f2f2f7", padding: "12px", className: "custom-list" } },
    { id: "styled-code", type: "code", code: "let value = 1;", visualStyle: { borderStyle: "solid", borderWidth: "2px", borderColor: "#123456" } },
    { id: "note-reference", type: "paragraph", text: "\uFFFC", runs: [{ text: "\uFFFC", inline: { type: "footnote", id: "one" } }] },
    { id: "styled-footnotes", type: "footnotes", notes: [{ id: "one", text: "Source note" }], visualStyle: { fontSize: "large", textColor: "#123456" } },
  ];
  for (const variant of ["studio", "article"]) {
    const html = renderToStaticMarkup(createElement(BlockRenderer, { blocks, variant }));
    assert.match(html, /id="heading-link" class="block-visual-style has-custom-font-size has-custom-text-colour" style="font-size:20px;color:#123456"/);
    assert.match(html, /class="block-visual-style has-custom-background custom-list" style="background-color:#f2f2f7;padding:12px"/);
    assert.match(html, /class="block-visual-style" style="border-style:solid;border-width:2px;border-color:#123456"/);
    assert.match(html, /class="block-visual-style has-custom-font-size has-custom-text-colour" style="font-size:20px;color:#123456"><section class="article-footnotes"/);
    const orphan = renderToStaticMarkup(createElement(BlockRenderer, { blocks: [blocks.at(-1)], variant }));
    assert.doesNotMatch(orphan, /article-footnotes|Source note/, "unreferenced recovery notes are omitted from Preview");
    assert.match(blockToHtml(blocks.at(-1)), /Source note/, "orphan notes remain recoverable in portable source");
  }
});

test("ordered list settings, divider styles and button target reach the rendered view and HTML", () => {
  const blocks = [
    { id: "countdown", type: "list", style: "ordered", items: ["First", "Second"], start: 4, reversed: true },
    { id: "break", type: "divider", style: "dots", visualStyle: { textColor: "#123456", margin: "12px" } },
    { id: "action", type: "button", label: "Visit", url: "https://example.com", style: "primary", opensInNewTab: true, align: "right", width: 75, title: "Visit Example", rel: "nofollow" },
  ];
  const article = renderToStaticMarkup(createElement(BlockRenderer, { blocks, variant: "article" }));
  const studio = renderToStaticMarkup(createElement(BlockRenderer, { blocks, variant: "studio" }));
  assert.match(article, /<ol start="4" reversed=""><li>First<\/li>/);
  assert.match(studio, /4\.<\/span>/);
  assert.match(studio, /3\.<\/span>/);
  assert.match(article, /content-divider is-dots/);
  assert.match(article, /button-block align-right has-width-75/);
  assert.match(article, /title="Visit Example" target="_blank" rel="nofollow noopener noreferrer"/);
  assert.match(blockToHtml(blocks[0]), /<ol[^>]*start="4" reversed>/);
  assert.match(blockToHtml(blocks[1]), /class="is-dots"/);
  assert.match(blockToHtml(blocks[2]), /data-button-width="75" class="button-block align-right has-width-75"/);
  assert.match(blockToHtml(blocks[2]), /title="Visit Example" target="_blank" rel="nofollow noopener noreferrer"/);
});

test("Button interaction styles render on the selected state and survive HTML serialisation", () => {
  const block = {
    id: "stateful-button", type: "button", label: "Continue", url: "/continue", style: "primary",
    visualStyle: { textColor: "#111111", backgroundColor: "#eeeeee" },
    interactionStyles: { hover: { textColor: "#ffffff", backgroundColor: "#123456", width: 50, margin: "8px" }, focus: { borderStyle: "solid", borderWidth: "2px", borderColor: "#456789" } },
  };
  const html = renderToStaticMarkup(createElement(BlockRenderer, { blocks: [block], variant: "studio", buttonPreview: { blockId: block.id, state: "hover" } }));
  assert.match(html, /class="content-button is-primary has-button-interaction-styles[^"]*has-button-hover-width[^"]*has-button-focus-border-color[^"]*is-button-state-preview-hover"/);
  for (const declaration of ["--button-base-color:#111111", "--button-base-background-color:#eeeeee", "--button-hover-color:#ffffff", "--button-hover-background-color:#123456", "--button-hover-background-image:none", "--button-focus-border-style:solid", "--button-focus-border-width:2px", "--button-focus-border-color:#456789"]) assert.ok(html.includes(declaration), `expected rendered style ${declaration}`);
  assert.match(html, /class="button-field[^"]*has-button-hover-width[^"]*is-button-state-preview-hover" style="--button-hover-width:50%"/);
  assert.match(html, /--button-hover-margin:8px/);
  assert.match(blockToHtml(block), /data-button-interaction-styles="\{&quot;hover&quot;:/);
});

test("Buttons preview shares group sizing and typography while retaining child overrides", () => {
  const block = {
    id: "buttons", type: "buttons", horizontalGap: 24,
    visualStyle: { fontSizeCustom: "24px", textColor: "#123456", textDecoration: "underline", padding: "8px" },
    children: [
      { id: "fill", type: "button", label: "Fill", url: "", style: "primary", width: 50 },
      { id: "outline", type: "button", label: "Outline", url: "/guide", style: "secondary", width: 50, visualStyle: { fontSizeCustom: "18px", textDecoration: "none" }, interactionStyles: { hover: { width: 25 } } },
    ],
  };
  for (const variant of ["studio", "article"]) {
    const html = renderToStaticMarkup(createElement(BlockRenderer, { blocks: [block], variant, buttonPreview: { blockId: "outline", state: "hover" } }));
    assert.match(html, /--button-group-font-size:24px/);
    assert.match(html, /--button-group-text-decoration:underline/);
    assert.match(html, /--button-item-width:calc\(50% - 12px\)/);
    assert.match(html, /--button-hover-item-width:calc\(25% - 18px\)/);
    assert.match(html, /content-button-item[^"]*is-button-state-preview-hover/);
    assert.match(html, /font-size:18px;text-decoration:none/);
    assert.match(html, /style="font-size:24px;color:#123456;padding:8px"/);
    assert.doesNotMatch(html, /style="(?:[^"]*;)?text-decoration:underline/);
  }
});

test("Additional CSS reaches mapped visual targets for Image and Spacer", () => {
  const blocks = [
    { id: "image-css", type: "image", src: "https://example.com/photo.png", alt: "Photo", visualStyle: { additionalCss: "outline: 2px solid red;" } },
    { id: "spacer-css", type: "spacer", height: 32, visualStyle: { additionalCss: "opacity: 0.5;" } },
  ];
  const html = renderToStaticMarkup(createElement(BlockRenderer, { blocks, variant: "studio" }));
  assert.match(html, /class="block-visual-style" style="outline:2px solid red"/);
  assert.match(html, /class="content-spacer" style="height:32px;width:100%;opacity:0.5"/);
});

test("image display settings and decorative text reach both renderers", () => {
  const block = { id: "photo", type: "image", src: "https://example.com/photo.jpg", alt: "An informative description", decorative: true, title: "Photo", aspectRatio: "square", scale: "cover", displayWidth: 320, focalX: 25, focalY: 75, visualStyle: { borderStyle: "solid", borderColor: "#123456", borderWidth: "2px", borderRadius: "12px", shadow: "soft" } };
  for (const variant of ["studio", "article"]) {
    const html = renderToStaticMarkup(createElement(BlockRenderer, { blocks: [block], variant }));
    assert.match(html, /alt="" title="Photo"/);
    assert.match(html, /width:320px;aspect-ratio:1 \/ 1;object-fit:cover;object-position:25% 75%/);
    assert.match(html, /border-style:solid;border-width:2px;border-color:#123456;border-radius:12px;box-shadow:/);
    assert.doesNotMatch(html, /An informative description/);
  }
  const source = blockToHtml(block);
  assert.match(source, /data-decorative="true"/);
  assert.match(source, /data-aspect-ratio="square"/);
  assert.match(source, /data-display-width="320"/);
  const linked = { ...block, decorative: false, linkUrl: "https://example.com", opensInNewTab: true };
  const linkedHtml = renderToStaticMarkup(createElement(BlockRenderer, { blocks: [linked], variant: "article" }));
  assert.match(linkedHtml, /<a href="https:\/\/example.com" target="_blank" rel="noopener noreferrer"><img/);
  assert.match(blockToHtml(linked), /target="_blank" rel="noopener noreferrer"/);
});

test("Image height, rounded style and link destinations reach preview and HTML", () => {
  const base = { id: "image-options", type: "image", src: "https://example.com/photo.jpg", alt: "Mountain", displayWidth: 400, displayHeight: 240, imageStyle: "rounded" };
  const rounded = renderToStaticMarkup(createElement(BlockRenderer, { blocks: [base], variant: "studio" }));
  assert.match(rounded, /width:400px;height:240px;object-fit:cover;object-position:50% 50%;border-radius:9999px/);
  assert.match(blockToHtml(base), /data-display-height="240"/);
  assert.match(blockToHtml(base), /data-image-style="rounded"/);

  const media = { ...base, linkDestination: "media", opensInNewTab: true };
  const mediaPreview = renderToStaticMarkup(createElement(BlockRenderer, { blocks: [media], variant: "article" }));
  assert.match(mediaPreview, /<a href="https:\/\/example.com\/photo.jpg" target="_blank" rel="noopener noreferrer"><img/);
  assert.match(blockToHtml(media), /data-link-destination="media"/);

  const lightbox = { ...base, linkDestination: "lightbox" };
  const lightboxPreview = renderToStaticMarkup(createElement(BlockRenderer, { blocks: [lightbox], variant: "article" }));
  assert.match(lightboxPreview, /aria-label="Enlarge image: Mountain"/);
  assert.match(lightboxPreview, /<dialog[^>]+aria-label="Mountain"/);
  assert.match(blockToHtml(lightbox), /data-link-destination="lightbox"/);
});

test("Spacer dimensions and Embed spacing render in both views and survive HTML export", () => {
  const blocks = [
    { id: "space", type: "spacer", height: 2, heightUnit: "em", width: 8, widthUnit: "rem", visualStyle: { margin: "12px", anchor: "section-gap", className: "custom-gap" } },
    { id: "resource", type: "embed", url: "https://example.com/resource", title: "Resource", caption: "A useful <resource>", visualStyle: { margin: "20px", anchor: "reference-card" } },
  ];
  for (const variant of ["studio", "article"]) {
    const html = renderToStaticMarkup(createElement(BlockRenderer, { blocks, variant }));
    assert.match(html, /id="section-gap" class="content-spacer custom-gap" style="height:2em;width:100%;margin:12px"/);
    assert.match(html, /id="reference-card" class="block-visual-style" style="margin:20px"/);
    assert.match(html, /<figcaption>A useful &lt;resource&gt;<\/figcaption>/);
  }
  assert.match(blockToHtml(blocks[0]), /data-spacer-height="2" data-spacer-height-unit="em" data-spacer-width="8" data-spacer-width-unit="rem"/);
  assert.match(blockToHtml(blocks[1]), /<a href="https:\/\/example.com\/resource">Resource<\/a><p class="embed-caption">A useful &lt;resource&gt;<\/p>/);
});

test("Spacer uses the immediate Row parent to expose and render its horizontal axis", () => {
  const blocks = [
    { id: "vertical", type: "spacer", height: 48 },
    { id: "row", type: "group", layout: "row", children: [
      { id: "horizontal", type: "spacer", height: 48, width: 240, widthUnit: "px" },
      { id: "nested-stack", type: "section", layout: "stack", children: [{ id: "nested-vertical", type: "spacer", height: 24 }] },
    ] },
  ];
  assert.equal(spacerOrientationFor(blocks, "vertical"), "vertical");
  assert.equal(spacerOrientationFor(blocks, "horizontal"), "horizontal");
  assert.equal(spacerOrientationFor(blocks, "nested-vertical"), "vertical");
  assert.deepEqual(spacerDimensions(blocks[0]), { height: "48px", width: "100%" });
  assert.deepEqual(spacerDimensions({ id: "missing-width", type: "spacer", height: 48 }, "horizontal"), { height: "auto", width: "100px" });
  assert.deepEqual(spacerDimensions(blocks[1].children[0], "horizontal"), { height: "auto", width: "240px" });

  const html = renderToStaticMarkup(createElement(BlockRenderer, { blocks, variant: "studio" }));
  assert.match(html, /class="content-spacer" style="height:48px;width:100%"/);
  assert.match(html, /class="content-group layout-row[^"]*"[^>]*>.*?class="content-spacer" style="height:auto;width:240px"/);
  assert.match(html, /class="content-section layout-stack"[^>]*>.*?class="content-spacer" style="height:24px;width:100%"/);
});

test("Embed captions contribute to generated publication summaries", () => {
  const article = toLocallyPublishedArticle({
    id: "embed-caption-post", kind: "post", title: "Embedded resource", subtitle: "", slug: "embedded-resource", excerpt: "",
    status: "draft", updatedAt: "2026-09-27T00:00:00.000Z",
    blocks: [{ id: "resource", type: "embed", url: "https://example.com/resource", title: "Resource", caption: "The caption explains the link" }],
  });
  assert.equal(article.summary, "Resource The caption explains the link");
});

test("Embed captions preserve legacy text and support rich text in the canvas, renderers and HTML source", async () => {
  const legacy = { id: "legacy-resource-caption", type: "embed", url: "https://example.com/resource", title: "Resource", caption: "A useful resource" };
  const formatted = { ...legacy, id: "formatted-resource-caption", caption: "A\nlinked resource", captionRuns: [
    { text: "A\n", marks: ["bold"] },
    { text: "linked resource", marks: [{ type: "link", url: "https://example.com/details" }] },
  ] };
  const profile = capabilityProfileFor("embed");
  assert.equal(profile.controls.find(control => control.id === "caption")?.label, "Rich-text caption");
  assert.equal(profile.unsupported.includes("Rich-text caption"), false);
  assert.equal(validContentBlocks([legacy]), true);
  assert.equal(validContentBlocks([formatted]), true);
  assert.equal(validContentBlocks([{ ...formatted, captionRuns: [{ text: "Different text" }] }]), false);
  for (const variant of ["studio", "article"]) {
    const html = renderToStaticMarkup(createElement(BlockRenderer, { blocks: [legacy, formatted], variant }));
    assert.match(html, /<figcaption>A useful resource<\/figcaption>/);
    assert.match(html, /<figcaption><strong>A\n<\/strong><a href="https:\/\/example.com\/details">linked resource<\/a><\/figcaption>/);
  }
  const source = blockToHtml(formatted);
  assert.match(source, /<p class="embed-caption"><strong>A<br \/><\/strong><a href="https:\/\/example.com\/details">linked resource<\/a><\/p>/);

  const { StudioCanvas } = await import(await compileModule(new URL("../app/studio/studio-canvas.tsx", import.meta.url)));
  const canvas = renderToStaticMarkup(createElement(StudioCanvas, {
    activeDocument: { id: "embed-caption-document", kind: "post", status: "draft", title: "Embed captions", blocks: [formatted] },
    previewing: false, wordCount: 3, characterCount: formatted.caption.length, linkTargets: [], mediaBlockUrls: {}, selectedBlockId: formatted.id,
  }));
  assert.match(canvas, /class="embed-caption-editor rich-text-editor" contentEditable="true"/);
  assert.match(canvas, /aria-label="Embed caption"/);
  assert.match(canvas, /aria-label="Bold selected text"/);
  assert.match(canvas, /aria-label="Italicise selected text"/);
  assert.match(canvas, /aria-label="Add or edit hyperlink"/);
});

test("initially selected linked Button controls render safely without a browser document", async () => {
  const { ButtonLinkControl } = await import(await compileModule(new URL("../app/studio/button-link-control.tsx", import.meta.url)));
  const html = renderToStaticMarkup(createElement(ButtonLinkControl, {
    value: { url: "/existing" }, selected: true, writable: true, anchor: () => null, suggestions: [],
    onCaptureSelection() {}, onReturnFocus() {}, onApply() { return null; }, onUnlink() {},
  }));
  assert.match(html, /aria-label="Unlink button"/);
  assert.match(html, /aria-pressed="true"/);
  assert.doesNotMatch(html, /role="dialog"/);
});

test("Embed captions count towards reading time", async () => {
  const { readingTimeMinutes } = await import(await compileModule(new URL("../app/content/reading-time.ts", import.meta.url)));
  assert.equal(readingTimeMinutes([{ id: "resource", type: "embed", url: "https://example.com", title: "Resource", caption: Array(220).fill("word").join(" ") }]), 2);
});

test("table settings keep caption, striping and automatic cell widths in preview and HTML", () => {
  const block = { id: "comparison", type: "table", rows: [["Name", "Value"], ["A", "1"]], hasHeader: true, caption: "Results", tableStyle: "stripes", fixedWidth: false };
  const rendered = renderToStaticMarkup(createElement(BlockRenderer, { blocks: [block], variant: "studio" }));
  assert.match(rendered, /class="content-table-frame is-striped"/);
  assert.match(rendered, /class="content-table is-auto-layout"/);
  assert.match(rendered, /<figcaption id="[^"]+">Results<\/figcaption>/);
  assert.doesNotMatch(rendered, /<colgroup>/);
  const source = blockToHtml(block);
  assert.match(source, /data-fixed-width="false"/);
  assert.match(source, /class="studio-table is-striped"/);
  assert.match(source, /<caption>Results<\/caption>/);
});

test("Table per-cell tag and scope preserve legacy defaults in preview and structure edits", () => {
  const block = { id: "cell-metadata", type: "table", rows: [["Column", "Plain"], ["Row", "Value"]], hasHeader: true, cellMetadata: [[null, { tag: "td" }], [{ tag: "th", scope: "row" }, null]] };
  assert.equal(validContentBlocks([block]), true);
  assert.equal(validContentBlocks([{ ...block, cellMetadata: [[null], [{ tag: "th", scope: "row" }, null]] }]), false, "metadata dimensions must match the table grid");
  assert.equal(validContentBlocks([{ ...block, cellMetadata: [[null, { tag: "td", scope: "col" }], [{ tag: "th", scope: "row" }, null]] }]), false, "scope belongs to header cells");
  const rendered = renderToStaticMarkup(createElement(BlockRenderer, { blocks: [block], variant: "studio" }));
  assert.match(rendered, /<th scope="col"><div class="content-table-cell"[^>]*>Column/);
  assert.match(rendered, /<td><div class="content-table-cell"[^>]*>Plain/);
  assert.match(rendered, /<th scope="row"><div class="content-table-cell"[^>]*>Row/);
  const metadata = block.cellMetadata;
  assert.deepEqual(JSON.parse(JSON.stringify(updateTableCellMetadata(metadata, "insert-row-before", 0, 0, 2, 2, true))), [[null, null], [{ tag: "th", scope: "col" }, null], [{ tag: "th", scope: "row" }, null]]);
  assert.deepEqual(JSON.parse(JSON.stringify(updateTableCellMetadata(metadata, "insert-column-after", 0, 0, 2, 2))), [[null, null, null], [{ tag: "th", scope: "row" }, null, null]]);
  assert.deepEqual(JSON.parse(JSON.stringify(updateTableCellMetadata(metadata, "delete-row", 0, 0, 2, 2, true))), [[{ scope: "row" }, { tag: "td" }]]);
  assert.equal(updateTableCellMetadata(metadata, "delete-column", 0, 0, 2, 2), undefined, "redundant all-default metadata is removed after the column edit");
});

test("Table captions preserve legacy text and support rich-text editing and round-trip", async () => {
  const legacy = { id: "legacy-table-caption", type: "table", rows: [["Name", "Value"]], hasHeader: true, caption: "Results" };
  const formatted = { ...legacy, id: "formatted-table-caption", caption: "A linked result", captionRuns: [
    { text: "A ", marks: ["bold"] },
    { text: "linked result", marks: [{ type: "link", url: "https://example.com/results" }] },
  ], cellRuns: [[[ { text: "Name", marks: ["bold"] } ], [{ text: "Value" }]]] };
  assert.equal(validContentBlocks([legacy]), true, "legacy plain captions remain valid without a runs field");
  assert.equal(validContentBlocks([formatted]), true);
  assert.equal(validContentBlocks([{ ...formatted, captionRuns: [{ text: "Bad", marks: ["not-a-mark"] }] }]), false);
  assert.equal(validContentBlocks([{ ...formatted, caption: "Different text" }]), false, "caption text must match its rich-text runs");
  assert.equal(validContentBlocks([{ ...formatted, cellRuns: [[[ { text: "Other" } ], [{ text: "Value" }]]] }]), false, "cell runs must mirror the corresponding cell strings");
  assert.equal(validContentBlocks([{ ...formatted, cellRuns: [[[ { text: "Name", marks: ["not-a-mark"] } ], [{ text: "Value" }]]] }]), false, "cell runs must contain supported marks");

  for (const variant of ["studio", "article"]) {
    const html = renderToStaticMarkup(createElement(BlockRenderer, { blocks: [legacy, formatted], variant }));
    assert.match(html, /<figcaption id="[^"]+">Results<\/figcaption>/);
    assert.match(html, /<figcaption id="[^"]+"><strong>A <\/strong><a href="https:\/\/example.com\/results">linked result<\/a><\/figcaption>/);
    assert.match(html, /<th scope="col"><div class="content-table-cell"[^>]*><strong>Name<\/strong><\/div><\/th>/);
  }
  assert.match(blockToHtml(formatted), /<caption><strong>A <\/strong><a href="https:\/\/example.com\/results">linked result<\/a><\/caption>/);
  assert.match(blockToHtml(formatted), /<th><strong>Name<\/strong><\/th>/);

  const article = toLocallyPublishedArticle({ id: "table-caption-post", kind: "post", title: "Table caption", subtitle: "", slug: "table-caption", excerpt: "", status: "draft", updatedAt: "2026-09-27T00:00:00.000Z", blocks: [formatted] });
  assert.equal(article.summary, "A linked result Name Value");
  const { readingTimeMinutes } = await import(await compileModule(new URL("../app/content/reading-time.ts", import.meta.url)));
  assert.equal(readingTimeMinutes([{ id: "long-table-caption", type: "table", rows: [[""]], caption: Array(221).fill("word").join(" ") }]), 2);

  const { StudioCanvas } = await import(await compileModule(new URL("../app/studio/studio-canvas.tsx", import.meta.url)));
  const canvas = renderToStaticMarkup(createElement(StudioCanvas, {
    activeDocument: { id: "table-caption-document", kind: "post", status: "draft", title: "Table captions", blocks: [formatted] },
    previewing: false, wordCount: 3, characterCount: formatted.caption.length, linkTargets: [], mediaBlockUrls: {}, selectedBlockId: formatted.id,
  }));
  assert.match(canvas, /aria-label="Table caption"/);
  assert.match(canvas, /class="table-caption-editor rich-text-editor" contentEditable="true"/);
  assert.match(canvas, /class="table-cell-editor rich-text-editor" contentEditable="true"/);
  assert.match(canvas, /aria-label="Table header 1"/);
  assert.match(canvas, /aria-label="Bold selected text"/);
  assert.match(canvas, /aria-label="Italicise selected text"/);
  assert.match(canvas, /aria-label="Add or edit hyperlink"/);

  const withoutCaption = { id: "table-without-caption", type: "table", rows: [["Editable cell"]] };
  const blankCaptionCanvas = renderToStaticMarkup(createElement(StudioCanvas, {
    activeDocument: { id: "table-no-caption-document", kind: "post", status: "draft", title: "Table cell formatting", blocks: [withoutCaption] },
    previewing: false, wordCount: 2, characterCount: 13, linkTargets: [], mediaBlockUrls: {}, selectedBlockId: withoutCaption.id,
  }));
  assert.match(blankCaptionCanvas, /aria-label="Bold selected text"/);
  assert.match(blankCaptionCanvas, /aria-label="Italicise selected text"/);
  assert.match(blankCaptionCanvas, /aria-label="Add or edit hyperlink"/);
  assert.deepEqual(tableCellForTextTarget({ kind: "cell", rowIndex: 2, columnIndex: 1 }), { rowIndex: 2, columnIndex: 1 });
  assert.equal(tableCellForTextTarget({ kind: "caption" }), undefined, "caption focus must not reuse the previously focused cell as its formatting target");
});

test("Table structure edits keep rich-text runs aligned with their cells", () => {
  const original = [[[{ text: "A", marks: ["bold"] }, { text: " one" }], [{ text: "B", marks: ["italic"] }]], [[{ text: "C" }], [{ text: "D" }]]];
  const afterRowBefore = updateTableCellRuns(original, "insert-row-before", 1, 0, 2);
  assert.deepEqual(afterRowBefore[0], original[0]);
  assert.deepEqual(afterRowBefore[1], [[], []]);
  assert.deepEqual(afterRowBefore[2], original[1]);
  const afterRowDelete = updateTableCellRuns(original, "delete-row", 0, 0, 2);
  assert.deepEqual(afterRowDelete, [original[1]]);
  const afterColumnBefore = updateTableCellRuns(original, "insert-column-before", 0, 1, 2);
  assert.deepEqual(afterColumnBefore.map((row) => row[0]), original.map((row) => row[0]));
  assert.deepEqual(afterColumnBefore.map((row) => row[2]), original.map((row) => row[1]));
  assert.deepEqual(afterColumnBefore.map((row) => row[1]), [[], []]);
  const afterColumnDelete = updateTableCellRuns(original, "delete-column", 0, 0, 2);
  assert.deepEqual(afterColumnDelete.map((row) => row[0]), original.map((row) => row[1]));
  assert.equal(updateTableCellRuns(undefined, "insert-row-after", 0, 0, 2), undefined);
});

test("Table column content alignment renders, serialises and validates by column", () => {
  const block = { id: "aligned-table", type: "table", rows: [["Name", "Value"], ["One", "1"]], hasHeader: true, columnAlignments: ["left", "right"] };
  const rendered = renderToStaticMarkup(createElement(BlockRenderer, { blocks: [block], variant: "studio" }));
  assert.match(rendered, /<th scope="col" style="text-align:right"/);
  assert.match(rendered, /<td style="text-align:right"/);
  assert.match(blockToHtml(block), /data-column-alignments="left,right"/);
  assert.match(blockToHtml(block), /class="has-text-align-right" data-align="right"/);
  assert.equal(validContentBlocks([block]), true);
  assert.equal(validContentBlocks([{ ...block, columnAlignments: ["left"] }]), false);
  assert.equal(validContentBlocks([{ ...block, columnAlignments: ["left", "justify"] }]), false);
});

test("dynamic Gutenberg fields and Group semantics retain their compatibility settings", () => {
  const blocks = [
    { id: "title", type: "document-title", level: 3, isLink: true, linkTarget: "_blank", rel: "nofollow", blockAlign: "wide" },
    { id: "date", type: "post-date", format: "iso", isLink: true, showIcon: false },
    { id: "cover", type: "cover-image", isLink: true, linkTarget: "_blank", blockAlign: "full", aspectRatio: "wide", scale: "contain", displayWidth: 640, displayHeight: 360 },
    { id: "landmark", type: "group", layout: "stack", tagName: "nav", ariaLabel: "Related pages", children: [{ id: "item", type: "paragraph", text: "Item" }] },
  ];
  const document = { kind: "post", slug: "example", title: "Example", publishAt: "2026-09-27T09:00:00.000Z", coverImage: { src: "https://example.com/cover.jpg", alt: "Cover" } };
  const rendered = renderToStaticMarkup(createElement(BlockRenderer, { blocks, variant: "studio", document }));
  assert.match(rendered, /<h3 class=""><a href="\/writing\/example" target="_blank" rel="nofollow noopener noreferrer">Example<\/a><\/h3>/);
  assert.match(rendered, /<a href="\/writing\/example"><time/);
  assert.match(rendered, /document-dynamic-cover[^>]*alignfull/);
  assert.match(rendered, /width:640px;height:360px;aspect-ratio:16 \/ 9;object-fit:contain/);
  assert.match(rendered, /<nav[^>]*aria-label="Related pages"/);
  for (const block of blocks) assert.equal(validContentBlocks([block]), true);
  assert.match(blockToHtml(blocks[0]), /data-metadata-link="true" data-link-target="_blank" data-link-rel="nofollow"/);
  assert.match(blockToHtml(blocks[1]), /data-metadata-link="true"/);
  assert.match(blockToHtml(blocks[2]), /data-aspect-ratio="wide"[^>]*data-display-width="640"/);
  assert.match(blockToHtml(blocks[3]), /^<nav[^>]*aria-label="Related pages"/);
});

test("root Group sticky position validates and renders in Studio preview", () => {
  const group = { id: "sticky-group", type: "group", layout: "stack", position: "sticky", children: [{ id: "sticky-copy", type: "paragraph", text: "Pinned content" }] };
  const section = { id: "ordinary-section", type: "section", layout: "stack", children: [] };
  assert.equal(validContentBlocks([group]), true);
  assert.equal(validContentBlocks([{ ...group, position: "fixed" }]), false);
  assert.equal(validContentBlocks([{ ...section, position: "sticky" }]), false);
  const rendered = renderToStaticMarkup(createElement(BlockRenderer, { blocks: [group], variant: "studio" }));
  assert.match(rendered, /class="content-group layout-stack" style="position:sticky;top:0px;/);
});

test("Cover Image border and shadow styles render in Studio and article previews", () => {
  const block = { id: "styled-cover", type: "cover-image", aspectRatio: "wide", visualStyle: { borderStyle: "solid", borderWidth: "2px", borderColor: "#123456", borderRadius: "12px", shadow: "soft" } };
  const document = { kind: "post", slug: "cover-example", title: "Cover example", coverImage: { src: "https://example.com/cover.jpg", alt: "A cover" } };
  for (const variant of ["studio", "article"]) {
    const html = renderToStaticMarkup(createElement(BlockRenderer, { blocks: [block], variant, document }));
    assert.match(html, /class="block-visual-style cover-image-visual-style-frame has-cover-image-frame-override" style="[^"]*border-style:solid;border-width:2px;border-color:#123456;border-radius:12px;box-shadow:/);
    const imageStyle = html.match(/<img[^>]*style="([^"]+)"/)?.[1] ?? "";
    assert.doesNotMatch(imageStyle, /border-style|border-width|border-color|border-radius|box-shadow/);
    for (const property of ["border-style:", "border-radius:", "box-shadow:"]) {
      assert.equal(html.split(property).length - 1, 1, `${property} should be applied once to the cover frame`);
    }
  }
  assert.equal(validContentBlocks([block]), true);
  assert.match(blockToHtml(block), /data-block-type="cover-image"/);
});

test("cover frame styling does not change Image block frame behaviour", () => {
  const block = { id: "styled-image", type: "image", src: "https://example.com/photo.jpg", alt: "Photo", visualStyle: { borderStyle: "solid", borderWidth: "2px", borderColor: "#123456", borderRadius: "12px", shadow: "soft" } };
  const html = renderToStaticMarkup(createElement(BlockRenderer, { blocks: [block], variant: "studio" }));
  assert.match(html, /<img[^>]*style="[^"]*border-style:solid;border-width:2px;border-color:#123456;border-radius:12px;box-shadow:/);
  assert.equal(html.split("border-style:").length - 1, 1);
  assert.equal(html.split("border-radius:").length - 1, 1);
  assert.equal(html.split("box-shadow:").length - 1, 1);
});

test("Cover Image editor renders one styled frame without changing its canvas margins", async () => {
  const { BlockField } = await import(await compileModule(new URL("../app/studio/studio-canvas.tsx", import.meta.url)));
  const block = { id: "styled-cover", type: "cover-image", aspectRatio: "wide", visualStyle: { borderStyle: "solid", borderWidth: "2px", borderColor: "#123456", borderRadius: "12px", shadow: "soft" } };
  const document = { id: "cover-post", kind: "post", status: "draft", title: "Cover", coverImage: { src: "https://example.com/cover.jpg", alt: "Cover" }, blocks: [block] };
  const html = renderToStaticMarkup(createElement(BlockField, {
    block,
    document,
    coverImageUrl: document.coverImage.src,
    onTableCellFocus() {},
    onTextSelection() {},
    onLinkActivate() {},
    onChange() {},
  }));
  assert.match(html, /class="block-visual-style cover-image-visual-style-frame has-cover-image-frame-override" style="[^"]*border-style:solid/);
  assert.match(html, /cover-image-visual-style-frame[^>]*><div class="canvas-cover-wrap document-dynamic-cover[^>]*><div class="canvas-cover-image is-source"/);
  const imageStyle = html.match(/<img[^>]*style="([^"]+)"/)?.[1] ?? "";
  assert.doesNotMatch(imageStyle, /border-style|border-width|border-color|border-radius|box-shadow/);
  assert.equal(html.split("border-style:").length - 1, 1);
  assert.equal(html.split("border-radius:").length - 1, 1);
  assert.equal(html.split("box-shadow:").length - 1, 1);

  const renderCover = (visualStyle) => renderToStaticMarkup(createElement(BlockField, {
    block: { ...block, visualStyle },
    document,
    coverImageUrl: document.coverImage.src,
    onTableCellFocus() {},
    onTextSelection() {},
    onLinkActivate() {},
    onChange() {},
  }));
  const shadowOnly = renderCover({ shadow: "soft" });
  assert.match(shadowOnly, /class="block-visual-style cover-image-visual-style-frame" style="box-shadow:/);
  assert.doesNotMatch(shadowOnly, /has-cover-image-frame-override/);
  const noBorder = renderCover({ borderStyle: "none" });
  assert.match(noBorder, /class="block-visual-style cover-image-visual-style-frame has-cover-image-frame-override"/);
});

test("Social Icons serialize style, spacing, alignment and per-icon link metadata", () => {
  const block = {
    id: "socials",
    type: "social-icons",
    allowWrap: false,
    iconSize: "huge",
    socialStyle: "logos-only",
    horizontalGap: 12,
    verticalGap: 20,
    blockAlign: "center",
    openInNewTab: true,
    visualStyle: { textColor: "#ffffff", backgroundColor: "#2f6fb0" },
    children: [{ id: "linkedin", type: "social-linkedin", url: "https://linkedin.com/in/example", rel: "nofollow", visualStyle: { anchor: "linkedin-profile", className: "profile-link" } }],
  };
  const html = blockToHtml(block);
  assert.equal(validContentBlocks([block]), true);
  assert.equal(validContentBlocks([{ ...block, allowWrap: "false" }]), false);
  assert.equal(validContentBlocks([{ ...block, socialStyle: "round" }]), false);
  assert.equal(validContentBlocks([{ ...block, iconSize: "giant" }]), false);
  assert.equal(validContentBlocks([{ ...block, horizontalGap: 121 }]), false);
  assert.match(html, /data-social-wrap="false"/);
  assert.match(html, /data-social-style="logos-only"/);
  assert.match(html, /data-social-size="huge"/);
  assert.match(html, /data-social-horizontal-gap="12" data-social-vertical-gap="20"/);
  assert.match(html, /data-block-align-explicit="true"[^>]*class="aligncenter"/);
  assert.match(html, /rel="nofollow" data-social-url=/);
  assert.match(html, /data-html-anchor="linkedin-profile" data-additional-classes="profile-link"/);
  const rendered = renderToStaticMarkup(createElement(BlockRenderer, { blocks: [block], variant: "studio" }));
  assert.match(rendered, /social-icons-block is-horizontal is-no-wrap/);
  assert.match(rendered, /is-style-logos-only aligncenter/);
  assert.match(rendered, /social-icons-block[^"]*size-huge/);
  assert.match(rendered, /column-gap:12px;row-gap:20px/);
  assert.match(rendered, /target="_blank" rel="nofollow noopener noreferrer"/);
  assert.match(rendered, /--social-icon-background:#2f6fb0/);
  assert.match(rendered, /--social-icon-colour:#ffffff/);
});

test("Social Icons Logos Only honours custom colour and the shared label toggle", async () => {
  const styles = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.match(styles, /\.social-icons-block\.is-style-logos-only \.social-icon-item\.is-linkedin \{ color: var\(--social-icon-colour, #0a66c2\); \}/);
  assert.match(styles, /\.social-icons-block\.is-style-logos-only \.social-icon-item\.is-tiktok \{ color: var\(--social-icon-colour, #171717\); \}/);
  assert.doesNotMatch(styles, /\.is-style-logos-only \.social-icon-label\s*\{[^}]*display:\s*none/);
  const { BlockField } = await import(await compileModule(new URL("../app/studio/studio-canvas.tsx", import.meta.url)));
  for (const socialStyle of ["default", "logos-only", "pill-shape"]) for (const showLabels of [true, false]) {
    const block = { id: "socials", type: "social-icons", socialStyle, showLabels, visualStyle: { textColor: "#ab1234" }, children: [
      { id: "linkedin", type: "social-linkedin", url: "https://linkedin.com/in/example", label: "My profile" },
      { id: "tiktok", type: "social-tiktok", url: "https://tiktok.com/@example", label: "My videos" },
    ] };
    const edit = renderToStaticMarkup(createElement(BlockField, { block, selectedBlockId: block.id, onChange() {}, onTableCellFocus() {}, onTextSelection() {}, onLinkActivate() {} }));
    const preview = renderToStaticMarkup(createElement(BlockRenderer, { blocks: [block], variant: "studio" }));
    for (const html of [edit, preview]) {
      assert.match(html, /--social-icon-colour:#ab1234/);
      assert.equal((html.match(/class="social-icon-label"/g) ?? []).length, showLabels ? 2 : 0, `${socialStyle} labels ${showLabels}`);
      assert.match(html, /aria-label="My profile"/);
      assert.match(html, /aria-label="My videos"/);
    }
  }
});

test("Social Icons block alignment does not override inner icon justification", async () => {
  const styles = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  const studioStyles = await readFile(new URL("../app/studio/studio.css", import.meta.url), "utf8");
  assert.match(styles, /\.social-icons-block\.size-small \{ font-size: 16px; \}/);
  assert.match(styles, /\.social-icons-block\.size-small \.social-icon-item,\s*\.social-icons-block\.size-small \.social-icons-add \{ position: relative; \}/);
  assert.match(styles, /\.social-icons-block\.size-small \.social-icon-item::before,\s*\.social-icons-block\.size-small \.social-icons-add::before \{ content: ""; inset: -12px; position: absolute; \}/, "small links and the add control get a transparent expanded hit target");
  assert.match(styles, /\.social-icons-block\.size-normal \{ font-size: 24px; \}/);
  assert.match(styles, /\.social-icons-block\.size-large \{ font-size: 36px; \}/);
  assert.match(styles, /\.social-icons-block\.size-huge \{ font-size: 48px; \}/);
  assert.match(styles, /\.social-icons-block\.is-style-logos-only \.social-icon-glyph svg \{ height: 1\.25em; width: 1\.25em; \}/);
  assert.match(styles, /\.social-icons-block\.justify-centre ul \{ justify-content: center; \}/);
  assert.match(styles, /\.social-icons-block\.justify-right ul \{ justify-content: flex-end; \}/);
  assert.match(styles, /\.prose \.social-icons-block\.aligncenter \{ margin-inline: auto; width: fit-content; max-width: 100%; \}/);
  assert.match(styles, /\.prose \.social-icons-block\.alignright \{ margin-left: auto; width: 50%; \}/);
  assert.match(studioStyles, /\.social-icons-block\.size-small \.social-icons-add \{ height: 24px; width: 24px; \}/, "the visible plus button stays at its small visual scale");
  assert.doesNotMatch(styles, /\.social-icons-block\.align(?:center|right) ul \{ justify-content:/);
});

test("Divider preserves its selected semantic element and alignment in preview and HTML", () => {
  const divider = { id: "section-divider", type: "divider", tagName: "div", style: "wide", blockAlign: "center" };
  assert.equal(validContentBlocks([divider]), true);
  assert.equal(validContentBlocks([{ ...divider, tagName: "span" }]), false);
  const html = blockToHtml(divider);
  assert.match(html, /^<div[^>]*data-block-type="divider"[^>]*class="is-wide aligncenter"><\/div>$/);
  const studio = renderToStaticMarkup(createElement(BlockRenderer, { blocks: [divider], variant: "studio" }));
  const article = renderToStaticMarkup(createElement(BlockRenderer, { blocks: [divider] }));
  assert.match(studio, /<div class="content-divider is-wide" role="separator" aria-orientation="horizontal"><\/div>/);
  assert.match(article, /<div class="content-divider is-wide aligncenter" role="separator" aria-orientation="horizontal"><\/div>/);
});

test("Separator background colour and gradient style the editable, studio and public rule", async () => {
  const solid = { id: "solid-separator", type: "divider", visualStyle: { backgroundColor: "#123456" } };
  const solidMarkup = renderToStaticMarkup(createElement(BlockRenderer, { blocks: [solid], variant: "studio" }));
  assert.match(solidMarkup, /<hr class="content-divider is-default" style="color:#123456;border-top-color:#123456"\/>/);
  assert.doesNotMatch(solidMarkup, /<div[^>]*style="[^"]*background-color:#123456/);

  const gradient = { id: "gradient-separator", type: "divider", style: "wide", visualStyle: { backgroundGradient: { type: "linear", angle: 90, stops: [{ colour: "#123456", position: 0 }, { colour: "#ABCDEF", position: 100 }] } } };
  const studio = renderToStaticMarkup(createElement(BlockRenderer, { blocks: [gradient], variant: "studio" }));
  const article = renderToStaticMarkup(createElement(BlockRenderer, { blocks: [gradient] }));
  assert.match(studio, /<hr class="content-divider is-wide" style="background-image:linear-gradient\(90deg, #123456 0%, #ABCDEF 100%\);border:0;height:3px"\/>/);
  assert.match(article, /<hr class="content-divider is-wide" style="background-image:linear-gradient\(90deg, #123456 0%, #ABCDEF 100%\);border:0;height:3px"\/>/);

  const { BlockField } = await import(await compileModule(new URL("../app/studio/studio-canvas.tsx", import.meta.url)));
  const renderEditable = block => renderToStaticMarkup(createElement(BlockField, {
    block,
    document: { id: "separator-post", kind: "post", status: "draft", title: "Separator", blocks: [block] },
    onTableCellFocus() {},
    onTextSelection() {},
    onLinkActivate() {},
    onChange() {},
  }));
  assert.match(renderEditable(solid), /<hr class="content-divider is-default" style="color:#123456;border-top-color:#123456"\/>/);
  assert.match(renderEditable(gradient), /<hr class="content-divider is-wide" style="background-image:linear-gradient\(90deg, #123456 0%, #ABCDEF 100%\);border:0;height:3px"\/>/);
});

test("Social Icons, Divider, Cover Image and layout settings survive the semantic HTML parser round-trip", () => {
  const previousParser = globalThis.DOMParser;
  const previousNode = globalThis.Node;
  const previousHTMLElement = globalThis.HTMLElement;
  const decode = value => value.replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
  const allElements = [];
  class MinimalHTMLElement {}
  function makeElement(tagName, attributes, parentElement) {
    const element = Object.assign(new MinimalHTMLElement(), {
      nodeType: 1,
      tagName: tagName.toUpperCase(),
      className: attributes.class ?? "",
      dataset: {},
      children: [],
      childNodes: [],
      parentElement,
      classList: { contains: (name) => (attributes.class ?? "").split(/\s+/).includes(name) },
      getAttribute: (name) => attributes[name] ?? null,
      hasAttribute: (name) => Object.hasOwn(attributes, name),
      querySelector: (selector) => {
        const descendants = [];
        const visit = (parent) => parent.children.forEach((child) => { descendants.push(child); visit(child); });
        visit(element);
        return descendants.find((child) => selector.startsWith(".")
          ? child.classList.contains(selector.slice(1))
          : child.tagName.toLowerCase() === selector.toLowerCase()) ?? null;
      },
      querySelectorAll: (selector) => {
        const descendants = [];
        const visit = (parent) => parent.children.forEach((child) => { descendants.push(child); visit(child); });
        visit(element);
        return selector === "[data-block-id]" ? descendants.filter((child) => child.dataset.blockId) : descendants.filter((child) => child.tagName.toLowerCase() === selector.toLowerCase());
      },
      cloneNode: () => {
        const clone = makeElement(tagName, { ...attributes }, parentElement);
        clone.childNodes = element.childNodes.map(child => child.nodeType === 3 ? { ...child } : child.cloneNode(true));
        clone.children = clone.childNodes.filter(child => child.nodeType === 1);
        Object.defineProperty(clone, "textContent", { get: () => clone.childNodes.map(child => child.textContent).join("") });
        return clone;
      },
      closest: (selector) => {
        if (typeof selector !== "string") return null;
        let current = element;
        while (current) {
          if (current.tagName && selector.toLowerCase() === current.tagName.toLowerCase()) return current;
          current = current.parentElement;
        }
        return null;
      },
    });
    for (const [name, value] of Object.entries(attributes)) {
      if (name.startsWith("data-")) element.dataset[name.slice(5).replace(/-([a-z])/g, (_match, letter) => letter.toUpperCase())] = value;
    }
    allElements.push(element);
    return element;
  }
  class MinimalDOMParser {
    parseFromString(markup) {
      allElements.length = 0;
      const body = { children: [], childNodes: [] };
      const stack = [body];
      const voidTags = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"]);
      for (const token of markup.match(/<[^>]+>|[^<]+/g) ?? []) {
        if (token.startsWith("</")) { stack.pop(); continue; }
        if (token.startsWith("<")) {
          const [, tagName, rawAttributes = ""] = token.match(/^<([a-z][\w-]*)\b([^>]*)>$/i) ?? [];
          if (!tagName) continue;
          const attributes = Object.fromEntries([...rawAttributes.matchAll(/([\w:-]+)="([^"]*)"/g)].map((match) => [match[1], decode(match[2])]));
          for (const name of ["reversed"]) if (new RegExp(`(?:^|\\s)${name}(?:\\s|$)`).test(rawAttributes)) attributes[name] = "";
          const element = makeElement(tagName, attributes, stack.at(-1));
          stack.at(-1).children.push(element);
          stack.at(-1).childNodes.push(element);
          if (!voidTags.has(tagName.toLowerCase()) && !/\/\s*>$/.test(token)) stack.push(element);
          continue;
        }
        const text = { nodeType: 3, textContent: decode(token) };
        stack.at(-1).childNodes.push(text);
      }
      for (const element of allElements) Object.defineProperty(element, "textContent", { get: () => element.childNodes.map((child) => child.textContent).join("") });
      return {
        body: { childNodes: body.childNodes },
        querySelector: () => null,
        querySelectorAll: (selector) => selector === "[data-block-id]" ? allElements.filter((element) => element.dataset.blockId) : [],
      };
    }
  }
  try {
    globalThis.DOMParser = MinimalDOMParser;
    globalThis.Node = { TEXT_NODE: 3, ELEMENT_NODE: 1 };
    globalThis.HTMLElement = MinimalHTMLElement;
    const social = {
      id: "socials",
      type: "social-icons",
      iconSize: "huge",
      socialStyle: "pill-shape",
      horizontalGap: 14,
      verticalGap: 22,
      blockAlign: "right",
      openInNewTab: true,
      visualStyle: { backgroundColor: "#234567" },
      children: [{ id: "linkedin", type: "social-linkedin", url: "https://linkedin.com/in/example", label: "Work profile", rel: "nofollow" }],
    };
    const parsedSocial = parseHtmlToBlock(blockToHtml(social), social);
    assert.ok("block" in parsedSocial);
    assert.equal(parsedSocial.block.socialStyle, "pill-shape");
    assert.equal(parsedSocial.block.iconSize, "huge");
    assert.equal(parsedSocial.block.horizontalGap, 14);
    assert.equal(parsedSocial.block.verticalGap, 22);
    assert.equal(parsedSocial.block.blockAlign, "right");
    assert.equal(parsedSocial.block.children[0].rel, "nofollow");

    const image = { id: "rich-caption-image", type: "image", src: "https://example.com/image.png", alt: "Example", caption: "A linked caption", captionRuns: [
      { text: "A ", marks: ["bold"] },
      { text: "linked caption", marks: [{ type: "link", url: "https://example.com/caption" }] },
    ] };
    const parsedImage = parseHtmlToBlock(blockToHtml(image), image);
    assert.ok("block" in parsedImage);
    assert.equal(parsedImage.block.caption, image.caption);
    assert.deepEqual(JSON.parse(JSON.stringify(parsedImage.block.captionRuns)), image.captionRuns);

    const embed = { id: "rich-caption-embed", type: "embed", url: "https://example.com/resource", title: "Resource", caption: "A\nlinked resource", captionRuns: [
      { text: "A\n", marks: ["bold"] },
      { text: "linked resource", marks: [{ type: "link", url: "https://example.com/details" }] },
    ] };
    const parsedEmbed = parseHtmlToBlock(blockToHtml(embed), embed);
    assert.ok("block" in parsedEmbed);
    assert.equal(parsedEmbed.block.caption, embed.caption);
    assert.deepEqual(JSON.parse(JSON.stringify(normaliseTextRuns(parsedEmbed.block.captionRuns))), embed.captionRuns);

    const table = { id: "rich-caption-table", type: "table", rows: [["Name", "Value"]], hasHeader: true, caption: "A linked result", captionRuns: [
      { text: "A ", marks: ["bold"] },
      { text: "linked result", marks: [{ type: "link", url: "https://example.com/results" }] },
    ], cellRuns: [[[ { text: "Name", marks: ["bold"] } ], [{ text: "Value", marks: [{ type: "link", url: "https://example.com/value" }] }]]] };
    const parsedTable = parseHtmlToBlock(blockToHtml(table), table);
    assert.ok("block" in parsedTable);
    assert.equal(parsedTable.block.caption, table.caption);
    assert.deepEqual(JSON.parse(JSON.stringify(parsedTable.block.captionRuns)), table.captionRuns);
    assert.deepEqual(JSON.parse(JSON.stringify(parsedTable.block.cellRuns)), table.cellRuns);

    const multipleSections = { id: "multi-section-table", type: "table", rows: [["Head one"], ["Head two"], ["Body"], ["Foot one"], ["Foot two"]], hasHeader: true, hasFooter: true, headerRowCount: 2, footerRowCount: 2, caption: "Caption", rowHeights: [45, 50, 60, 65, 70], columnWidths: [100], cellMetadata: [[{ scope: "rowgroup" }], [{ scope: null }], [{ tag: "th", scope: "row" }], [null], [null]], cellRuns: [[[{ text: "Head one", marks: ["bold"] }]], [[{ text: "Head two" }]], [[{ text: "Body" }]], [[{ text: "Foot one" }]], [[{ text: "Foot two" }]]] };
    const parsedMultiple = parseHtmlToBlock(blockToHtml(multipleSections), multipleSections);
    assert.ok("block" in parsedMultiple, JSON.stringify(parsedMultiple));
    for (const field of ["rows", "cellRuns", "cellMetadata", "rowHeights", "columnWidths", "caption", "headerRowCount", "footerRowCount"]) assert.deepEqual(JSON.parse(JSON.stringify(parsedMultiple.block[field])), multipleSections[field], field);
    assert.equal(validContentBlocks([parsedMultiple.block]), true);

    const divider = { id: "divider", type: "divider", tagName: "div", style: "dots", blockAlign: "center", visualStyle: { textColor: "#123456" } };
    const parsedDivider = parseHtmlToBlock(blockToHtml(divider), divider);
    assert.ok("block" in parsedDivider);
    assert.equal(parsedDivider.block.tagName, "div");
    assert.equal(parsedDivider.block.blockAlign, "center");
    assert.equal(parsedDivider.block.style, "dots");
    assert.equal(parsedDivider.block.visualStyle.textColor, "#123456");

    const cover = { id: "cover-fill", type: "cover-image", aspectRatio: "wide", scale: "fill", displayWidth: 640, displayHeight: 360 };
    const parsedCover = parseHtmlToBlock(blockToHtml(cover), cover);
    assert.ok("block" in parsedCover);
    assert.equal(parsedCover.block.scale, "fill");

    const button = { id: "stateful-button", type: "button", label: "Continue", url: "/continue", style: "primary", interactionStyles: { hover: { textColor: "#ffffff", backgroundColor: "#123456" }, focus: { borderStyle: "solid", borderWidth: "2px", borderColor: "#456789" } } };
    const parsedButton = parseHtmlToBlock(blockToHtml(button), button);
    assert.ok("block" in parsedButton);
    assert.deepEqual(parsedButton.block.interactionStyles, button.interactionStyles);

    const group = { id: "layout-group", type: "group", layout: "row", gap: 12, columnGap: 24, rowGap: 8, children: [] };
    const groupHtml = blockToHtml(group);
    assert.match(groupHtml, /data-layout-gap="12" data-layout-column-gap="24" data-layout-row-gap="8"/);
    const parsedGroup = parseHtmlToBlock(groupHtml, { id: group.id, type: "group", layout: "row", children: [] });
    assert.ok("block" in parsedGroup);
    assert.deepEqual([parsedGroup.block.gap, parsedGroup.block.columnGap, parsedGroup.block.rowGap], [12, 24, 8]);

    for (const start of [-2, 0, 100000]) {
      const signedList = { id: "signed-list", type: "list", style: "ordered", start, reversed: true, marker: "a", items: [{ text: "Marked", runs: [{ text: "Marked", marks: ["bold"] }] }] };
      const parsedSignedList = parseHtmlToBlock(blockToHtml(signedList), signedList);
      assert.ok("block" in parsedSignedList, JSON.stringify(parsedSignedList));
      assert.equal(parsedSignedList.block.start, start);
      assert.equal(parsedSignedList.block.reversed, true);
      assert.equal(parsedSignedList.block.marker, "a");
      assert.deepEqual(parsedSignedList.block.items[0].runs[0].marks, ["bold"]);
    }

    const flowGroup = { id: "flow-group", type: "group", layout: "flow", allowedBlocks: ["paragraph", "heading"], children: [] };
    const flowGroupHtml = blockToHtml(flowGroup);
    assert.match(flowGroupHtml, /class="studio-group layout-flow/);
    const parsedFlowGroup = parseHtmlToBlock(flowGroupHtml, flowGroup);
    assert.ok("block" in parsedFlowGroup);
    assert.equal(parsedFlowGroup.block.layout, "flow");
    assert.deepEqual(parsedFlowGroup.block.allowedBlocks, ["paragraph", "heading"]);

    const rowJustification = { id: "row-justification", type: "group", layout: "row", horizontalAlign: "space-between", children: [{ id: "row-first", type: "paragraph", text: "First" }, { id: "row-second", type: "paragraph", text: "Second" }] };
    const rowJustificationHtml = blockToHtml(rowJustification);
    assert.match(rowJustificationHtml, /data-layout-horizontal-align="space-between"/);
    const parsedRowJustification = parseHtmlToBlock(rowJustificationHtml, rowJustification);
    assert.ok("block" in parsedRowJustification);
    assert.equal(parsedRowJustification.block.horizontalAlign, "space-between");

    const stackJustification = { id: "stack-justification", type: "group", layout: "stack", verticalAlign: "space-between", children: [{ id: "stack-first", type: "paragraph", text: "First" }, { id: "stack-second", type: "paragraph", text: "Second" }] };
    const stackJustificationHtml = blockToHtml(stackJustification);
    assert.match(stackJustificationHtml, /data-layout-vertical-align="space-between"/);
    const parsedStackJustification = parseHtmlToBlock(stackJustificationHtml, stackJustification);
    assert.ok("block" in parsedStackJustification);
    assert.equal(parsedStackJustification.block.verticalAlign, "space-between");

    const stickyGroup = { id: "sticky-group", type: "group", layout: "stack", position: "sticky", children: [{ id: "sticky-copy", type: "paragraph", text: "Pinned" }] };
    const stickyGroupHtml = blockToHtml(stickyGroup);
    assert.match(stickyGroupHtml, /data-group-position="sticky"/);
    const parsedStickyGroup = parseHtmlToBlock(stickyGroupHtml, stickyGroup);
    assert.ok("block" in parsedStickyGroup);
    assert.equal(parsedStickyGroup.block.position, "sticky");

    const columns = { id: "layout-columns", type: "columns", gap: 12, columnGap: 24, rowGap: 8, children: [{ id: "layout-column", type: "column", width: 100, verticalAlign: "bottom", gap: 4, columnGap: 10, rowGap: 6, children: [] }] };
    const columnsHtml = blockToHtml(columns);
    assert.match(columnsHtml, /data-block-id="layout-column"[^>]*data-layout-vertical-align="bottom" data-layout-gap="4" data-layout-column-gap="10" data-layout-row-gap="6"/);
    assert.doesNotMatch(columnsHtml, /data-column-vertical-align=/);
    const originalColumns = { id: columns.id, type: "columns", children: [{ id: "layout-column", type: "column", width: 100, children: [] }] };
    const parsedColumns = parseHtmlToBlock(columnsHtml, originalColumns);
    assert.ok("block" in parsedColumns);
    assert.deepEqual([parsedColumns.block.gap, parsedColumns.block.columnGap, parsedColumns.block.rowGap], [12, 24, 8]);
    assert.deepEqual([parsedColumns.block.children[0].gap, parsedColumns.block.children[0].columnGap, parsedColumns.block.children[0].rowGap], [4, 10, 6]);
    assert.equal(parsedColumns.block.children[0].verticalAlign, "bottom");

    const legacyColumnHtml = columnsHtml.replace('data-layout-vertical-align="bottom"', 'data-column-vertical-align="top"');
    const parsedLegacyColumn = parseHtmlToBlock(legacyColumnHtml, originalColumns);
    assert.ok("block" in parsedLegacyColumn);
    assert.equal(parsedLegacyColumn.block.children[0].verticalAlign, "top");
  } finally {
    if (previousParser === undefined) delete globalThis.DOMParser;
    else globalThis.DOMParser = previousParser;
    if (previousNode === undefined) delete globalThis.Node;
    else globalThis.Node = previousNode;
    if (previousHTMLElement === undefined) delete globalThis.HTMLElement;
    else globalThis.HTMLElement = previousHTMLElement;
  }
});

test("Studio preview preserves block order, semantic content and raw whitespace without editable controls", () => {
  const blocks = [
    { id: "paragraph", type: "paragraph", text: "First\n\nLast", align: "centre" },
    ...[1, 2, 3, 4, 5, 6].map(level => ({ id: `heading-${level}`, type: "heading", level, text: `Level ${level}` })),
    { id: "list", type: "list", style: "ordered", items: ["Repeated", "Repeated"] },
    { id: "quote", type: "quote", text: "A quotation", attribution: "Author" },
    { id: "button", type: "button", label: "Continue", url: "/projects", style: "secondary" },
    { id: "code", type: "code", language: "unknown", code: "<script>alert(1)</script>\n  indented\n" },
    { id: "table", type: "table", rows: [["Heading"], ["Body"]], hasHeader: true, rowHeights: [60, 100], columnWidths: [100] },
    { id: "image", type: "image", src: "/example.png", alt: "Example", caption: "Caption" },
    { id: "embed", type: "embed", url: "/resource", title: "Resource" },
    { id: "divider", type: "divider" },
  ];
  const before = structuredClone(blocks);
  const html = renderToStaticMarkup(createElement(BlockRenderer, { blocks, variant: "studio" }));
  assert.deepEqual([...html.matchAll(/data-preview-block-id="([^"]+)"/g)].map(match => match[1]), blocks.map(block => block.id));
  assert.match(html, /First\n\nLast/);
  for (let level = 1; level <= 6; level++) assert.match(html, new RegExp(`<h${level} class="[^"]*is-h${level}[^"]*">Level ${level}</h${level}>`));
  assert.match(html, /<ol class="list-field-preview">/);
  assert.equal((html.match(/class="list-item-text">Repeated/g) ?? []).length, 2);
  assert.match(html, /<blockquote[^>]*>A quotation<\/blockquote>/);
  assert.match(html, /class="content-button is-secondary" href="\/projects">Continue/);
  assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;\n {2}indented\n/);
  assert.match(html, /<thead><tr class="has-explicit-row-height" style="height:60px"><th scope="col">/);
  assert.match(html, /height:100px/);
  assert.match(html, /<figcaption>Caption<\/figcaption>/);
  assert.doesNotMatch(html, /<textarea|contenteditable|<script>|Write code/);
  assert.deepEqual(blocks, before);
});

test("Image captions preserve legacy plain text and render supported rich-text marks", async () => {
  const legacy = { id: "legacy-image", type: "image", src: "/example.png", alt: "Example", caption: "Plain caption" };
  const formatted = { ...legacy, id: "formatted-image", caption: "A linked caption", captionRuns: [
    { text: "A ", marks: ["bold"] },
    { text: "linked caption", marks: [{ type: "link", url: "https://example.com" }] },
  ] };
  assert.equal(validContentBlocks([legacy]), true, "legacy captions remain valid without a runs field");
  assert.equal(validContentBlocks([formatted]), true);
  assert.equal(validContentBlocks([{ ...formatted, captionRuns: [{ text: "Bad", marks: ["not-a-mark"] }] }]), false);
  assert.equal(validContentBlocks([{ ...formatted, caption: undefined }]), false, "rich caption runs require their mirrored summary text");
  assert.equal(validContentBlocks([{ ...formatted, caption: "Different text" }]), false, "caption text must match the rich-text runs");
  for (const variant of ["studio", "article"]) {
    const html = renderToStaticMarkup(createElement(BlockRenderer, { blocks: [legacy, formatted], variant }));
    assert.match(html, /<figcaption>Plain caption<\/figcaption>/);
    assert.match(html, /<figcaption><strong>A <\/strong><a href="https:\/\/example.com">linked caption<\/a><\/figcaption>/);
  }
  assert.match(blockToHtml(formatted), /<figcaption><strong>A <\/strong><a href="https:\/\/example.com">linked caption<\/a><\/figcaption>/);
  const { StudioCanvas } = await import(await compileModule(new URL("../app/studio/studio-canvas.tsx", import.meta.url)));
  const canvas = renderToStaticMarkup(createElement(StudioCanvas, {
    activeDocument: { id: "image-caption-document", kind: "post", status: "draft", title: "Image captions", blocks: [formatted] },
    previewing: false, wordCount: 3, characterCount: formatted.caption.length, linkTargets: [], mediaBlockUrls: {}, selectedBlockId: formatted.id,
  }));
  assert.match(canvas, /aria-label="Image caption"/);
  assert.match(canvas, /class="image-caption-editor rich-text-editor" contentEditable="true"/);
  assert.match(canvas, /aria-label="Bold selected text"/);
  assert.match(canvas, /aria-label="Italicise selected text"/);
  assert.match(canvas, /aria-label="Add or edit hyperlink"/);
});

test("formatted list items preserve inline links and marks in previews and HTML", () => {
  const block = { id: "links", type: "list", style: "unordered", items: [
    "Plain item",
    { text: "Bold link", runs: [{ text: "Bold ", marks: ["bold"] }, { text: "link", marks: [{ type: "link", url: "https://example.com" }] }] },
  ] };
  const studio = renderToStaticMarkup(createElement(BlockRenderer, { blocks: [block], variant: "studio" }));
  const publicView = renderToStaticMarkup(createElement(BlockRenderer, { blocks: [block] }));
  for (const html of [studio, publicView, blockToHtml(block)]) {
    assert.match(html, /Plain item/);
    assert.match(html, /<strong>Bold <\/strong>/);
    assert.match(html, /<a href="https:\/\/example\.com">link<\/a>/);
    assert.doesNotMatch(html, /\[object Object\]/);
  }
});

test("the public article renderer remains independent of the Studio presentation", () => {
  const html = renderToStaticMarkup(createElement(BlockRenderer, { blocks: [
    { id: "heading", type: "heading", level: 2, text: "Heading" },
    { id: "quote", type: "quote", text: "Quote" },
  ] }));
  assert.match(html, /class="prose"/);
  assert.match(html, /class="pull-quote align-left"/);
  assert.doesNotMatch(html, /studio-block-preview|heading-field|content-block/);
});

test("Heading Fit text reaches Studio and public renderers without exposing measurement props", () => {
  const block = { id: "heading-fit", type: "heading", level: 2, text: "A fitted heading", visualStyle: { fitText: true, fontFamily: "inter" } };
  for (const variant of ["studio", "article"]) {
    const html = renderToStaticMarkup(createElement(BlockRenderer, { blocks: [block], variant }));
    assert.match(html, /<h2 class="[^"]*has-fit-text">A fitted heading<\/h2>/);
    assert.doesNotMatch(html, /styleSignature|fitTextSignature/);
  }
});

test("vertical Paragraph and Heading orientation render in both previews without horizontal Fit text", () => {
  const blocks = [
    { id: "vertical-p", type: "paragraph", text: "Vertical paragraph", style: { orientation: "vertical-rl", fitText: true } },
    { id: "vertical-h", type: "heading", level: 2, text: "Vertical heading", visualStyle: { orientation: "vertical-rl", fitText: true } },
  ];
  for (const variant of ["studio", "article"]) {
    const html = renderToStaticMarkup(createElement(BlockRenderer, { blocks, variant }));
    assert.match(html, /writing-mode:vertical-rl/);
    assert.match(html, /text-orientation:mixed/);
    assert.doesNotMatch(html, /has-fit-text/);
    assert.match(html, /Vertical paragraph/);
    assert.match(html, /Vertical heading/);
  }
});

test("custom font size and Appearance render for Paragraph and Heading in Studio and public views", () => {
  const blocks = [
    { id: "custom-p", type: "paragraph", text: "Custom size", style: { fontSizeCustom: "1.5rem", appearance: "medium" } },
    { id: "custom-h", type: "heading", level: 2, text: "Custom weight", visualStyle: { fontSizeCustom: "28px", appearance: "extra-bold-italic" } },
  ];
  for (const variant of ["studio", "article"]) {
    const html = renderToStaticMarkup(createElement(BlockRenderer, { blocks, variant }));
    assert.match(html, /font-size:1\.5rem/);
    assert.match(html, /font-size:28px/);
    assert.match(html, /font-weight:500/);
    assert.match(html, /font-weight:800/);
    assert.match(html, /font-style:italic/);
  }
});

test("Plain quotes keep their text alignment in Studio and public previews", () => {
  const block = { id: "quote", type: "quote", text: "A considered thought", attribution: "Author", align: "centre", quoteStyle: "plain" };
  for (const variant of ["studio", "article"]) {
    const html = renderToStaticMarkup(createElement(BlockRenderer, { blocks: [block], variant }));
    assert.match(html, /class="(?:quote-field|pull-quote) align-centre is-style-plain"/);
    assert.match(html, /<blockquote[^>]*>A considered thought<\/blockquote>/);
    assert.match(html, /<figcaption>Author<\/figcaption>/);
    const authored = renderToStaticMarkup(createElement(BlockRenderer, { blocks: [{ ...block, attribution: "— Author" }], variant }));
    assert.match(authored, /<figcaption>— Author<\/figcaption>/, "authored citation punctuation is retained");
    const rich = renderToStaticMarkup(createElement(BlockRenderer, { blocks: [{ ...block, attribution: "Author", attributionRuns: [{ text: "Author", marks: ["bold"] }] }], variant }));
    assert.match(rich, /<figcaption><strong>Author<\/strong><\/figcaption>/);
  }
  assert.match(blockToHtml(block), /class="align-centre is-style-plain"/);
});

test("local publications preserve cover images and the default post cover", () => {
  const base = {
    id: "post-1", kind: "post", title: "Post", subtitle: "", slug: "post", excerpt: "Summary",
    status: "draft", updatedAt: "2026-09-02T00:00:00.000Z", blocks: [{ id: "paragraph", type: "paragraph", text: "Content" }],
  };
  const defaultCover = toLocallyPublishedArticle(base);
  assert.deepEqual(defaultCover.coverImage, { src: "", alt: "Mock cover image" });

  const selectedCover = toLocallyPublishedArticle({ ...base, coverImage: { src: "", mediaId: "media-1", alt: "A cover" } });
  assert.deepEqual(selectedCover.coverImage, { src: "", mediaId: "media-1", alt: "A cover" });
  assert.deepEqual(selectedCover.mediaIds, ["media-1"]);

  const removedCover = toLocallyPublishedArticle({ ...base, coverImage: null });
  assert.equal(removedCover.coverImage, null);
});

test("local publications use the selected publication date", () => {
  const article = toLocallyPublishedArticle({
    id: "post-1", kind: "post", title: "Post", subtitle: "", slug: "post", excerpt: "Summary",
    status: "published", publishAt: "2026-09-03T14:30:00.000Z", publishedAt: "2026-09-03T14:30:00.000Z",
    updatedAt: "2026-09-03T15:00:00.000Z", blocks: [{ id: "paragraph", type: "paragraph", text: "Content" }],
  });
  assert.equal(article.publishedAt, "2026-09-03");
  assert.equal(article.displayDate, "3 September 2026");
});

test("scheduled posts retain their scheduled time and sticky posts sort first", () => {
  const scheduledAt = "2026-09-24T14:30:00.000Z";
  const scheduled = toLocallyPublishedArticle({
    id: "scheduled-post", kind: "post", title: "Scheduled", subtitle: "", slug: "scheduled", excerpt: "Summary",
    status: "scheduled", publishAt: scheduledAt, sticky: true, updatedAt: "2026-09-23T15:00:00.000Z",
    blocks: [{ id: "paragraph-scheduled", type: "paragraph", text: "Scheduled content" }],
  });
  const regular = toLocallyPublishedArticle({
    id: "regular-post", kind: "post", title: "Regular", subtitle: "", slug: "regular", excerpt: "Summary",
    status: "published", publishedAt: "2026-09-25T12:00:00.000Z", updatedAt: "2026-09-25T12:00:00.000Z",
    blocks: [{ id: "paragraph-regular", type: "paragraph", text: "Regular content" }],
  });
  assert.equal(scheduled.scheduledAt, scheduledAt);
  assert.equal(scheduled.sticky, true);
  assert.deepEqual(parseLocallyPublishedArticles(JSON.stringify({ version: 5, posts: [regular, scheduled] })).map((article) => article.localDocumentId), ["scheduled-post", "regular-post"]);
});

test("scheduled posts require a future publication time", () => {
  const document = {
    id: "scheduled-post", kind: "post", title: "Scheduled", slug: "scheduled", excerpt: "Summary",
    status: "scheduled", updatedAt: "2026-09-23T15:00:00.000Z", tags: [], blocks: [{ id: "body", type: "paragraph", text: "Content" }],
  };
  assert.match(validatePostForPublication(document, [document], []), /Choose a future publish date and time/);
  assert.equal(validatePostForPublication({ ...document, publishAt: "2999-09-24T14:30:00.000Z" }, [document], []), null);
});

test("legacy local publications recover the selected cover from the matching workspace document", () => {
  const article = { localDocumentId: "post-1", mediaIds: ["body-media"], title: "Post", slug: "post", blocks: [], publishedAt: "2026-09-02", displayDate: "2 September 2026", readingTime: "1 minute read", section: "Technology", summary: "Summary" };
  const workspace = JSON.stringify({ documents: [{ id: "post-1", kind: "post", coverImage: { src: "", mediaId: "cover-media", alt: "Selected cover" } }] });
  const restored = restoreLegacyPublicationCover(article, workspace);
  assert.deepEqual(restored.coverImage, { src: "", mediaId: "cover-media", alt: "Selected cover" });
  assert.deepEqual(restored.mediaIds, ["body-media", "cover-media"]);
});

test("portable rich-text links preserve the new-tab setting without unsafe rendering", () => {
  const html = renderToStaticMarkup(createElement(BlockRenderer, { blocks: [{
    id: "link", type: "paragraph", text: "Open ACM", runs: [
      { text: "Open " },
      { text: "ACM", marks: [{ type: "link", url: "https://example.com", opensInNewTab: true }] },
    ],
  }], variant: "studio" }));
  assert.match(html, /href="https:\/\/example.com" target="_blank" rel="noopener noreferrer">ACM<\/a>/);
  assert.doesNotMatch(html, /javascript:/i);
});

test("embed and button blocks use the rich-text URL policy", () => {
  const blocks = [
    { id: "valid-button", type: "button", label: "Continue", url: "https://example.com/continue", style: "primary" },
    { id: "valid-embed", type: "embed", title: "Example", url: "example.com/resource" },
    { id: "unsafe-button", type: "button", label: "Unsafe", url: " JAVASCRIPT:alert(1) ", style: "secondary" },
    { id: "unsafe-embed", type: "embed", title: "Unsafe", url: "data:text/html,<script>alert(1)</script>" },
  ];
  const studioHtml = renderToStaticMarkup(createElement(BlockRenderer, { blocks, variant: "studio" }));
  const articleHtml = renderToStaticMarkup(createElement(BlockRenderer, { blocks }));

  for (const html of [studioHtml, articleHtml]) {
    assert.match(html, /href="https:\/\/example\.com\/continue">Continue/);
    assert.match(html, /href="https:\/\/example\.com\/resource" target="_blank" rel="noopener noreferrer">Open original content/);
    assert.match(html, /<span class="content-button is-secondary">Unsafe<\/span>/);
    assert.match(html, /Enter a valid web address\./);
    assert.doesNotMatch(html, /href="(?:javascript|data):/i);
    assert.doesNotMatch(html, /(?:javascript|data):/i);
  }
  assert.match(studioHtml, /Enter a valid web address\./);
  const unsafeEmbedSource = blockToHtml(blocks[3]);
  assert.match(unsafeEmbedSource, /<span>Unsafe<\/span>/);
  assert.doesNotMatch(unsafeEmbedSource, /href="(?:javascript|data):/i);
});

test("image sources allow local or HTTPS images and managed blob URLs only", () => {
  assert.equal(safeImageSource("https://example.com/image.png"), "https://example.com/image.png");
  assert.equal(safeImageSource("/images/image.png"), "/images/image.png");
  assert.equal(safeImageSource("blob:https://example.com/id", { allowBlob: true }), "blob:https://example.com/id");
  for (const source of ["javascript:alert(1)", "data:image/svg+xml,<svg>", "//example.com/image.png", "blob:https://example.com/id"]) {
    assert.equal(safeImageSource(source), null);
  }
});

test("image blocks do not render unsupported sources", () => {
  const html = renderToStaticMarkup(createElement(BlockRenderer, { blocks: [
    { id: "unsafe", type: "image", src: "data:image/svg+xml,<svg onload=alert(1)>", alt: "Unsafe" },
    { id: "managed", type: "image", src: "", mediaId: "media-1", alt: "Managed" },
  ], mediaUrls: { "media-1": "blob:https://example.com/media-1" }, variant: "studio" }));
  assert.match(html, /data-preview-block-id="unsafe"/);
  assert.doesNotMatch(html, /data:image|onload=/i);
  assert.match(html, /src="blob:https:\/\/example.com\/media-1"/);
});

test("cover images use the same source policy as content images", async () => {
  const { StudioCanvas } = await import(await compileModule(new URL("../app/studio/studio-canvas.tsx", import.meta.url)));
  const html = renderToStaticMarkup(createElement(StudioCanvas, {
    activeDocument: { kind: "post", status: "draft", title: "Cover", blocks: [], coverImage: { src: "data:image/svg+xml,<svg>", alt: "Unsafe cover" } },
    previewing: true, showCoverImage: true, coverImageUrl: "data:image/svg+xml,<svg>", wordCount: 0, characterCount: 0, linkTargets: [], mediaBlockUrls: {},
  }));
  assert.doesNotMatch(html, /data:image|<img/);
});

test("paragraph presentation settings render through the shared Studio and public renderer", () => {
  const html = renderToStaticMarkup(createElement(BlockRenderer, { blocks: [{
    id: "styled-paragraph", type: "paragraph", text: "Styled paragraph", style: {
      fontSize: "large", lineHeight: "1.4", padding: "8px 12px", linkColor: "#2f6eb4", linkHoverColor: "#1e1e1e",
      anchor: "intro", className: "lede",
    },
  }], variant: "studio" }));
  assert.match(html, /id="intro"/);
  assert.match(html, /class="[^"]*paragraph-field[^"]*lede/);
  assert.match(html, /font-size:20px/);
  assert.match(html, /line-height:1.4/);
  assert.match(html, /padding:8px 12px/);
  assert.match(html, /--studio-paragraph-link-color:#2f6eb4/);
  assert.match(html, /--studio-paragraph-link-hover-color:#1e1e1e/);
  assert.match(html, /--studio-paragraph-link-hover-filter:none/);
});

test("public Paragraph links consume the block's independent Default and Hover colours", async () => {
  const html = renderToStaticMarkup(createElement(BlockRenderer, { blocks: [{
    id: "public-paragraph", type: "paragraph", text: "Read more", runs: [{ text: "Read more", marks: [{ type: "link", url: "https://example.com" }] }], style: {
      linkColor: "#2f6eb4", linkHoverColor: "#1e1e1e",
    },
  }], variant: "article" }));
  const styles = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.match(html, /class="paragraph-content align-left"/);
  assert.match(html, /--studio-paragraph-link-color:#2f6eb4/);
  assert.match(html, /--studio-paragraph-link-hover-color:#1e1e1e/);
  assert.match(styles, /\.prose \.paragraph-content a \{ color: var\(--studio-paragraph-link-color, inherit\); \}/);
  assert.match(styles, /\.prose \.paragraph-content a:hover \{ color: var\(--studio-paragraph-link-hover-color, var\(--studio-paragraph-link-color, #1f4f88\)\); filter: var\(--studio-paragraph-link-hover-filter, brightness\(\.8\)\); \}/);
});

test("reading time rounds body words consistently across editor and publication", async () => {
  const { readingTimeMinutes, readingTimeLabel } = await import(await compileModule(new URL("../app/content/reading-time.ts", import.meta.url)));
  const { StudioCanvas } = await import(await compileModule(new URL("../app/studio/studio-canvas.tsx", import.meta.url)));
  const { toLocallyPublishedArticle } = await import(await compileModule(new URL("../app/content/local-publishing.ts", import.meta.url)));
  for (const [words, minutes] of [[0, 1], [220, 1], [221, 2], [440, 2], [441, 3]]) {
    const blocks = [
      { id: "reading", type: "reading-time", presentation: "badge" },
      { id: "p", type: "paragraph", text: Array(words).fill("word").join(" ") },
    ];
    assert.equal(readingTimeMinutes(blocks), minutes);
    const label = `${minutes} ${minutes === 1 ? "minute" : "minutes"}`;
    assert.equal(readingTimeLabel(blocks), label);
    const document = { kind: "post", status: "draft", title: "Test", slug: "test", excerpt: "", author: "Andrew Moss", updatedAt: "2026-09-08T12:00:00Z", blocks };
    const html = renderToStaticMarkup(createElement(StudioCanvas, { activeDocument: document, previewing: false, wordCount: words, characterCount: 0, linkTargets: [], mediaBlockUrls: {} }));
    assert.ok(html.includes(`Reading Time: ${label}`));
    assert.doesNotMatch(html, /Calculated from ordinary content/);
    assert.equal(toLocallyPublishedArticle(document).readingTime, label);
  }
  assert.equal(readingTimeMinutes([{ id: "t", type: "table", rows: [[Array(220).fill("word").join(" ")]] }, { id: "i", type: "image", caption: "Caption", alt: "Alternative", src: "" }]), 2);
  const richCaption = { id: "rich-caption", type: "image", alt: "", src: "", caption: Array(221).fill("word").join(" "), captionRuns: [{ text: Array(221).fill("word").join(" "), marks: ["bold"] }] };
  assert.equal(readingTimeMinutes([richCaption]), 2, "the mirrored caption continues to contribute to reading time");
  const richCaptionPost = toLocallyPublishedArticle({ kind: "post", status: "draft", title: "Caption", slug: "caption", excerpt: "", author: "Andrew Moss", updatedAt: "2026-09-08T12:00:00Z", blocks: [richCaption] });
  assert.ok(richCaptionPost.summary.startsWith(richCaption.caption.slice(0, 120)), "the mirrored caption continues to contribute to publication summaries");
  assert.ok(richCaptionPost.summary.endsWith("…"), "long captions retain the publication summary limit");
  assert.equal(readingTimeMinutes([{ id: "i", type: "image", alt: Array(500).fill("word").join(" "), src: "" }]), 1);
  assert.equal(readingTimeMinutes([
    { id: "section", type: "section", children: [
      { id: "group", type: "group", layout: "stack", children: [
        { id: "p", type: "paragraph", text: Array(220).fill("word").join(" ") },
        { id: "meta", type: "post-author" },
      ] },
      { id: "date", type: "post-date" },
    ] },
  ]), 1);
  assert.equal(readingTimeMinutes([{ id: "group", type: "group", children: [{ id: "p", type: "paragraph", text: Array(221).fill("word").join(" ") }] }]), 2);
});

test("Studio byline follows the selected publication date and never invents a draft date", async () => {
  const { StudioCanvas } = await import(await compileModule(new URL("../app/studio/studio-canvas.tsx", import.meta.url)));
  for (const [dates, expected] of [
    [{ publishAt: "2026-09-01T12:00:00Z", publishedAt: "2026-09-02T12:00:00Z" }, "1 September 2026"],
    [{ publishedAt: "2026-08-15T12:00:00Z" }, "15 August 2026"],
    [{}, "Not yet published"],
    [{ publishAt: "invalid" }, "Not yet published"],
  ]) {
    const html = renderToStaticMarkup(createElement(StudioCanvas, {
      activeDocument: { kind: "post", status: "draft", title: "Date test", author: "Andrew Moss", blocks: [
        { id: "reading", type: "reading-time" },
        { id: "author", type: "post-author" },
        { id: "date", type: "post-date" },
      ], ...dates },
      previewing: false, wordCount: 0, characterCount: 0, linkTargets: [], mediaBlockUrls: {},
    }));
    if (expected === "Not yet published") { assert.match(html, /Add a publication date in Document settings/); assert.doesNotMatch(html, /<time/); }
    else { assert.ok(html.includes(expected), `missing ${expected}: ${html}`); assert.ok(html.includes(`dateTime="${dates.publishAt ?? dates.publishedAt}"`)); }
  }
});

test("Studio modes share heading slots, expose the current mode and omit editing metadata from preview", async () => {
  const { BlockField, StudioCanvas } = await import(await compileModule(new URL("../app/studio/studio-canvas.tsx", import.meta.url)));
  const dynamicProps = { onTableCellFocus() {}, onTextSelection() {}, onLinkActivate() {}, onChange() {} };
  assert.match(renderToStaticMarkup(createElement(BlockField, { ...dynamicProps, block: { id: "title", type: "document-title" }, document: { title: "Example title" } })), /<h2[^>]*>Example title<\/h2>/);
  assert.match(renderToStaticMarkup(createElement(BlockField, { ...dynamicProps, block: { id: "subtitle", type: "document-subtitle" }, document: { subtitle: "A supporting summary" } })), /<p[^>]*template-subtitle[^>]*>A supporting summary<\/p>/);
  assert.doesNotMatch(renderToStaticMarkup(createElement(BlockField, { ...dynamicProps, block: { id: "hidden-subtitle", type: "document-subtitle" }, document: { subtitle: "A supporting summary", displayOverrides: { subtitle: "hide" } } })), /A supporting summary|template-subtitle/);
  for (const kind of ["page", "post"]) {
    for (const subtitle of ["A subtitle\nAnother line", ""]) {
      const props = {
        activeDocument: { kind, status: "draft", title: "Example title", subtitle, excerpt: "Preview-only metadata", blocks: [{ id: "divider", type: "divider" }] },
        wordCount: 2, characterCount: 13, linkTargets: [], mediaBlockUrls: {},
      };
      const edit = renderToStaticMarkup(createElement(StudioCanvas, { ...props, previewing: false }));
      const preview = renderToStaticMarkup(createElement(StudioCanvas, { ...props, previewing: true }));
      for (const html of [edit, preview]) {
        assert.match(html, /class="document-title-field"/);
        assert.match(html, new RegExp(`role="group" aria-label="${kind === "post" ? "Post" : "Page"} view"`));
      }
      assert.match(edit, /class="document-subtitle-field"/);
      if (subtitle) assert.match(preview, /class="document-subtitle-field"/);
      else assert.doesNotMatch(preview, /document-subtitle-field|preview-subtitle/);
      assert.match(edit, /aria-pressed="true">Edit<\/button>/);
      assert.match(preview, /aria-pressed="true">Preview<\/button>/);
      assert.match(edit, /<label class="canvas-title-label"/);
      assert.doesNotMatch(edit, /editor-publication-details|Reading Time|Andrew Moss|0 Comments/);
      assert.match(preview, /<h1 class="preview-title">Example title<\/h1>/);
      assert.doesNotMatch(preview, /editor-publication-details/);
      assert.doesNotMatch(preview, /POST DRAFT|PAGE DRAFT|preview-meta|canvas-title-label|canvas-subtitle-label|Preview-only metadata|<textarea/);
      assert.doesNotMatch(preview, /content-divider|divider-field/);
      assert.match(edit, /divider-field/);
      assert.match(preview, /class="editor-document-actions" aria-hidden="true">[\s\S]*<button type="button"[^>]*disabled=""/);
      if (subtitle) assert.ok(preview.includes(subtitle));
    }
  }
});

test("document metadata blocks share values between Studio and local rendering", async () => {
  const { BlockRenderer } = await import(await compileModule(new URL("../app/components/content.tsx", import.meta.url)));
  const blocks = [
    { id: "reading", type: "reading-time", prefix: "Read:", presentation: "plain" },
    { id: "author", type: "post-author", prefix: "Written by", avatar: true },
    { id: "date", type: "post-date", format: "iso", showIcon: false },
    { id: "body", type: "paragraph", text: "one two" },
  ];
  const document = { kind: "post", author: "Ada Lovelace", publishAt: "2026-09-02T12:00:00Z" };
  const html = renderToStaticMarkup(createElement(BlockRenderer, { blocks, variant: "studio", document }));
  assert.match(html, /Read: 1 minute/);
  assert.match(html, /Written by <strong>Ada Lovelace<\/strong>/);
  assert.match(html, /2026-09-02/);
  assert.doesNotMatch(html, /0 Comments/);
  const missing = renderToStaticMarkup(createElement(BlockRenderer, { blocks: blocks.slice(0, 3), variant: "studio", document: { kind: "page" } }));
  assert.doesNotMatch(missing, /Ada Lovelace|2026-09-02/);
});

test("document metadata visibility shares the same Edit and Preview contract", async () => {
  const { BlockField } = await import(await compileModule(new URL("../app/studio/studio-canvas.tsx", import.meta.url)));
  const cases = [
    { block: { id: "reading", type: "reading-time", prefix: "Read:", presentation: "plain" }, field: "readingTime", text: /Read: 1 minute/ },
    { block: { id: "author", type: "post-author", prefix: "Written by", avatar: true }, field: "author", text: /Ada Lovelace/ },
    { block: { id: "date", type: "post-date", format: "iso", showIcon: false }, field: "publicationDate", text: /2026-09-02/ },
  ];
  for (const { block, field, text } of cases) for (const visibility of [undefined, "show", "hide"]) {
    const document = { kind: "post", author: "Ada Lovelace", publishAt: "2026-09-02T12:00:00Z", displayOverrides: { [field]: visibility } };
    const original = structuredClone(block);
    const edit = renderToStaticMarkup(createElement(BlockField, { block, document, onChange() {}, onTableCellFocus() {}, onTextSelection() {}, onLinkActivate() {} }));
    const preview = renderToStaticMarkup(createElement(BlockRenderer, { blocks: [block], variant: "studio", document }));
    for (const html of [edit, preview]) {
      if (visibility === "hide") assert.doesNotMatch(html, text, `${block.type} hidden`);
      else assert.match(html, text, `${block.type} visible`);
    }
    assert.deepEqual(block, original, "visibility does not delete or modify authored records");
  }
});

test("metadata line height uses shared inheritance and Author exposes no unsupported link colour", async () => {
  const styles = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.match(styles, /\.block-visual-style\.has-custom-line-height :is\(\.metadata-block, \.metadata-block-editor,[^)]*\.reading-time-badge\) \{ line-height: inherit; \}/);
  const { BlockField } = await import(await compileModule(new URL("../app/studio/studio-canvas.tsx", import.meta.url)));
  for (const type of ["reading-time", "post-author", "post-date"]) {
    const block = { id: type, type, visualStyle: { lineHeight: "2.5" } };
    const props = { block, document: { kind: "post", author: "Ada Lovelace", publishAt: "2026-09-02T12:00:00Z" }, onChange() {}, onTableCellFocus() {}, onTextSelection() {}, onLinkActivate() {} };
    for (const html of [renderToStaticMarkup(createElement(BlockField, props)), renderToStaticMarkup(createElement(BlockRenderer, { blocks: [block], variant: "studio", document: props.document }))]) {
      assert.match(html, /has-custom-line-height/);
      assert.match(html, /line-height:2.5/);
    }
  }
  assert.equal(capabilityProfileFor("post-author").controls.some(control => control.id === "link-colour"), false);
  assert.equal(capabilityProfileFor("post-author").defaults.elements.includes("link-colour"), false);
  assert.equal(capabilityProfileFor("post-date").controls.some(control => control.id === "link-colour"), true);
});

test("Table pane styles target the real table while figure spacing and caption stay independent", () => {
  const block = { id: "styled-table", type: "table", rows: [["Cell"]], caption: "Independent caption", visualStyle: { margin: "12px", padding: "8px", borderStyle: "solid", borderWidth: "3px", borderColor: "#123456", textColor: "#654321", letterSpacing: "2px", textTransform: "uppercase" } };
  const html = renderToStaticMarkup(createElement(BlockRenderer, { blocks: [block], variant: "studio" }));
  assert.match(html, /style="[^"]*padding:8px;[^"]*margin:12px/);
  assert.match(html, /<table[^>]*style="[^"]*border-width:3px/);
  assert.match(html, /<table[^>]*style="[^"]*letter-spacing:2px/);
  assert.match(html, /<\/table><figcaption id="[^"]+">Independent caption<\/figcaption>/);
  const captionId = html.match(/<figcaption id="([^"]+)"/)[1];
  assert.ok(html.includes(`aria-labelledby="${captionId}"`));
});

test("Heading and Code managed background images render in the shared Studio preview", () => {
  for (const type of ["heading", "code"]) {
    const block = { id: type, type, text: "Text", code: "const value = 1;", level: 2, visualStyle: { backgroundImageMediaId: "fixture", backgroundSize: "contain", backgroundRepeat: "no-repeat", backgroundPositionX: 20, backgroundPositionY: 80 } };
    const html = renderToStaticMarkup(createElement(BlockRenderer, { blocks: [block], variant: "studio", mediaUrls: { fixture: "blob:fixture-image" } }));
    assert.match(html, /background-image:url/);
    assert.match(html, /blob:fixture-image/);
    assert.match(html, /background-size:contain/);
  }
});


test("nested List visual styles survive unchanged parent and child HTML editing", () => {
  const grandchild = { id: "styled-grandchild", type: "list", style: "unordered", visualStyle: { backgroundColor: "#d1e7dd", anchor: "deep-anchor", className: "deep-example", additionalCss: "color: #123456;" }, items: ["Deep item"] };
  const child = { id: "styled-child", type: "list", style: "ordered", start: 3, visualStyle: { backgroundColor: "#fff3cd" }, items: [{ text: "Nested item", runs: [{ text: "Nested item" }], children: [grandchild] }] };
  const parent = { id: "styled-root", type: "list", style: "unordered", items: [{ text: "Parent item", runs: [{ text: "Parent item" }], children: [child] }] };
  assert.equal(validContentBlocks([parent]), true);
  for (const selected of [parent, child]) {
    const html = blockToHtml(selected);
    assert.match(html, /data-html-anchor="deep-anchor"/);
    assert.match(html, /data-additional-classes="deep-example"/);
    withListHtmlDom(() => {
      const parsed = parseHtmlToBlock(html, selected, [parent]);
      assert.ok("block" in parsed, "unchanged nested List HTML is accepted");
      assert.deepEqual(JSON.parse(JSON.stringify(parsed.block)), JSON.parse(JSON.stringify(selected)));
    });
  }
  for (const variant of ["studio", "article"]) {
    const html = renderToStaticMarkup(createElement(BlockRenderer, { blocks: [parent], variant }));
    assert.match(html, /id="deep-anchor"/);
    assert.match(html, /background-color:#d1e7dd/);
    assert.match(html, /background-color:#fff3cd/);
  }
});


test("multiple Table section rows share semantic Edit and Preview presentation", async () => {
  const { TableField } = await import(await compileModule(new URL("../app/studio/studio-canvas.tsx", import.meta.url)));
  const block = { id: "multi-sections", type: "table", rows: [["Head one"], ["Head two"], ["Body"], ["Foot one"], ["Foot two"]], hasHeader: true, hasFooter: true, headerRowCount: 2, footerRowCount: 2, caption: "Caption", rowHeights: [45, 50, 60, 65, 70], columnWidths: [100], fixedWidth: false };
  const edit = renderToStaticMarkup(createElement(TableField, { block, onCellFocus() {}, onCaptionFocus() {}, onTextSelection() {}, onLinkActivate() {}, onChange() {} }));
  for (const html of [edit, renderToStaticMarkup(createElement(BlockRenderer, { blocks: [block], variant: "studio" })), renderToStaticMarkup(createElement(BlockRenderer, { blocks: [block], variant: "article" }))]) {
    for (const [section, count] of [["thead", 2], ["tbody", 1], ["tfoot", 2]]) {
      const markup = html.match(new RegExp(`<${section}>([\\s\\S]*?)</${section}>`))[1];
      assert.equal((markup.match(/<tr[ >]/g) ?? []).length, count, section);
    }
    assert.equal((html.match(/<th scope="col"/g) ?? []).length, 2);
    assert.match(html, /is-auto-layout/);
    assert.doesNotMatch(html, /<colgroup>/);
    assert.match(html, /height:50px/);
  }
  assert.match(edit, /aria-label="Table header row 2, column 1"/);
  assert.match(edit, /aria-label="Table footer row 2, column 1"/);
});
