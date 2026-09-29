import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

// Exercise the real renderer without a browser or a second application build.
async function compileModule(url) {
  const source = await readFile(url, "utf8").catch(error => {
    if (error.code !== "ENOENT" || !url.pathname.endsWith(".ts")) throw error;
    url = new URL(`${url.href}x`);
    return readFile(url, "utf8");
  });
  let { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX },
  });
  outputText = outputText.replace(/import ["'][^"']+\.css["'];?/g, "");
  for (const match of [...outputText.matchAll(/from "([^"]+)"/g)]) {
    const specifier = match[1];
    let resolved;
    if (specifier.startsWith(".")) {
      resolved = specifier.endsWith(".mjs")
        ? new URL(specifier, url).href
        : await compileModule(new URL(`${specifier}.ts`, url));
    } else {
      resolved = import.meta.resolve(specifier);
    }
    outputText = outputText.replace(match[0], `from "${resolved}"`);
  }
  return `data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`;
}

const { BlockRenderer } = await import(await compileModule(new URL("../app/components/content.tsx", import.meta.url)));
const { safeImageSource } = await import(await compileModule(new URL("../app/content/rich-text.ts", import.meta.url)));
const { parseLocallyPublishedArticles, restoreLegacyPublicationCover, toLocallyPublishedArticle, validatePostForPublication } = await import(await compileModule(new URL("../app/content/local-publishing.ts", import.meta.url)));
const { blockToHtml, formatHtml, parseHtmlToBlock } = await import(await compileModule(new URL("../app/studio/studio-html-editor.ts", import.meta.url)));
const { listMarker } = await import(await compileModule(new URL("../app/content/model.ts", import.meta.url)));
const { validContentBlocks } = await import(await compileModule(new URL("../app/studio/workspace-validation.ts", import.meta.url)));
const { normaliseCustomFontSize, validCustomFontSize } = await import(await compileModule(new URL("../app/content/font-size.ts", import.meta.url)));

test("Advanced HTML anchor and class metadata is retained by the HTML source format", () => {
  const paragraph = blockToHtml({ id: "paragraph", type: "paragraph", text: "Hello", style: { anchor: "about-me" } });
  const image = blockToHtml({ id: "image", type: "image", src: "https://example.com/photo.png", alt: "Photo", visualStyle: { anchor: "portrait", className: "rounded-photo" } });
  assert.match(paragraph, /data-html-anchor="about-me"/);
  assert.match(paragraph, /data-additional-classes=""/);
  assert.match(image, /data-html-anchor="portrait"/);
  assert.match(image, /data-additional-classes="rounded-photo"/);
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
  assert.match(html, /aria-label="Add hyperlink to selected text"/);
  assert.match(html, /data-studio-block-id="items" data-list-item-index="0"/);
  assert.match(html, /data-studio-block-id="items" data-list-item-index="1"/);
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
    { id: "styled-footnotes", type: "footnotes", notes: [{ id: "one", text: "Source note" }], visualStyle: { fontSize: "large", textColor: "#123456" } },
  ];
  for (const variant of ["studio", "article"]) {
    const html = renderToStaticMarkup(createElement(BlockRenderer, { blocks, variant }));
    assert.match(html, /id="heading-link" class="block-visual-style has-custom-font-size has-custom-text-colour" style="font-size:20px;color:#123456"/);
    assert.match(html, /class="block-visual-style has-custom-background custom-list" style="background-color:#f2f2f7;padding:12px"/);
    assert.match(html, /class="block-visual-style" style="border-style:solid;border-width:2px;border-color:#123456"/);
    assert.match(html, /class="block-visual-style has-custom-font-size has-custom-text-colour" style="font-size:20px;color:#123456"><section class="article-footnotes"/);
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
    assert.match(html, /id="section-gap" class="content-spacer custom-gap" style="height:2em;width:8rem;margin:12px"/);
    assert.match(html, /id="reference-card" class="block-visual-style" style="margin:20px"/);
    assert.match(html, /<p class="embed-caption">A useful &lt;resource&gt;<\/p>/);
  }
  assert.match(blockToHtml(blocks[0]), /data-spacer-height="2" data-spacer-height-unit="em" data-spacer-width="8" data-spacer-width-unit="rem"/);
  assert.match(blockToHtml(blocks[1]), /<a href="https:\/\/example.com\/resource">Resource<\/a><p class="embed-caption">A useful &lt;resource&gt;<\/p>/);
});

test("Embed captions contribute to generated publication summaries", () => {
  const article = toLocallyPublishedArticle({
    id: "embed-caption-post", kind: "post", title: "Embedded resource", subtitle: "", slug: "embedded-resource", excerpt: "",
    status: "draft", updatedAt: "2026-09-27T00:00:00.000Z",
    blocks: [{ id: "resource", type: "embed", url: "https://example.com/resource", title: "Resource", caption: "The caption explains the link" }],
  });
  assert.equal(article.summary, "Resource The caption explains the link");
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
  assert.match(rendered, /<caption>Results<\/caption>/);
  assert.doesNotMatch(rendered, /<colgroup>/);
  const source = blockToHtml(block);
  assert.match(source, /data-fixed-width="false"/);
  assert.match(source, /class="studio-table is-striped"/);
  assert.match(source, /<caption>Results<\/caption>/);
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

test("Social Icons serialize style, spacing, alignment and per-icon link metadata", () => {
  const block = {
    id: "socials",
    type: "social-icons",
    allowWrap: false,
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
  assert.equal(validContentBlocks([{ ...block, horizontalGap: 121 }]), false);
  assert.match(html, /data-social-wrap="false"/);
  assert.match(html, /data-social-style="logos-only"/);
  assert.match(html, /data-social-horizontal-gap="12" data-social-vertical-gap="20"/);
  assert.match(html, /data-block-align-explicit="true"[^>]*class="aligncenter"/);
  assert.match(html, /rel="nofollow" data-social-url=/);
  assert.match(html, /data-html-anchor="linkedin-profile" data-additional-classes="profile-link"/);
  const rendered = renderToStaticMarkup(createElement(BlockRenderer, { blocks: [block], variant: "studio" }));
  assert.match(rendered, /social-icons-block is-horizontal is-no-wrap/);
  assert.match(rendered, /is-style-logos-only aligncenter/);
  assert.match(rendered, /column-gap:12px;row-gap:20px/);
  assert.match(rendered, /target="_blank" rel="nofollow noopener noreferrer"/);
  assert.match(rendered, /--social-icon-background:#2f6fb0/);
  assert.match(rendered, /--social-icon-colour:#ffffff/);
});

test("Social Icons block alignment does not override inner icon justification", async () => {
  const styles = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.match(styles, /\.social-icons-block\.justify-centre ul \{ justify-content: center; \}/);
  assert.match(styles, /\.social-icons-block\.justify-right ul \{ justify-content: flex-end; \}/);
  assert.match(styles, /\.prose \.social-icons-block\.aligncenter \{ margin-inline: auto; width: fit-content; max-width: 100%; \}/);
  assert.match(styles, /\.prose \.social-icons-block\.alignright \{ margin-left: auto; width: 50%; \}/);
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

test("Social Icons and Divider settings survive the semantic HTML parser round-trip", () => {
  const previousParser = globalThis.DOMParser;
  const previousNode = globalThis.Node;
  const decode = value => value.replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
  const allElements = [];
  function makeElement(tagName, attributes) {
    const element = {
      nodeType: 1,
      tagName: tagName.toUpperCase(),
      className: attributes.class ?? "",
      dataset: {},
      children: [],
      childNodes: [],
      classList: { contains: (name) => (attributes.class ?? "").split(/\s+/).includes(name) },
      getAttribute: (name) => attributes[name] ?? null,
      querySelector: () => null,
      querySelectorAll: (selector) => {
        const descendants = [];
        const visit = (parent) => parent.children.forEach((child) => { descendants.push(child); visit(child); });
        visit(element);
        return selector === "[data-block-id]" ? descendants.filter((child) => child.dataset.blockId) : [];
      },
    };
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
          const element = makeElement(tagName, attributes);
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
    const social = {
      id: "socials",
      type: "social-icons",
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
    assert.equal(parsedSocial.block.horizontalGap, 14);
    assert.equal(parsedSocial.block.verticalGap, 22);
    assert.equal(parsedSocial.block.blockAlign, "right");
    assert.equal(parsedSocial.block.children[0].rel, "nofollow");

    const divider = { id: "divider", type: "divider", tagName: "div", style: "dots", blockAlign: "center", visualStyle: { textColor: "#123456" } };
    const parsedDivider = parseHtmlToBlock(blockToHtml(divider), divider);
    assert.ok("block" in parsedDivider);
    assert.equal(parsedDivider.block.tagName, "div");
    assert.equal(parsedDivider.block.blockAlign, "center");
    assert.equal(parsedDivider.block.style, "dots");
    assert.equal(parsedDivider.block.visualStyle.textColor, "#123456");

    const group = { id: "layout-group", type: "group", layout: "row", gap: 12, columnGap: 24, rowGap: 8, children: [] };
    const groupHtml = blockToHtml(group);
    assert.match(groupHtml, /data-layout-gap="12" data-layout-column-gap="24" data-layout-row-gap="8"/);
    const parsedGroup = parseHtmlToBlock(groupHtml, { id: group.id, type: "group", layout: "row", children: [] });
    assert.ok("block" in parsedGroup);
    assert.deepEqual([parsedGroup.block.gap, parsedGroup.block.columnGap, parsedGroup.block.rowGap], [12, 24, 8]);

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
  assert.match(html, /<thead><tr style="height:60px"><th scope="col">/);
  assert.match(html, /height:100px/);
  assert.match(html, /<figcaption>Caption<\/figcaption>/);
  assert.doesNotMatch(html, /<textarea|contenteditable|<script>|Write code/);
  assert.deepEqual(blocks, before);
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
    assert.match(html, /<figcaption>— Author<\/figcaption>/);
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
  assert.deepEqual(parseLocallyPublishedArticles(JSON.stringify({ version: 4, posts: [regular, scheduled] })).map((article) => article.localDocumentId), ["scheduled-post", "regular-post"]);
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
    assert.match(html, /href="https:\/\/example\.com\/resource">Example/);
    assert.match(html, /<span class="content-button is-secondary">Unsafe<\/span>/);
    assert.match(html, /<span>Unsafe<\/span>/);
    assert.doesNotMatch(html, /href="(?:javascript|data):/i);
    assert.doesNotMatch(html, /(?:javascript|data):/i);
  }
  assert.match(studioHtml, /Enter a valid URL/);
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
      fontSize: "large", lineHeight: "1.4", padding: "8px 12px", linkColor: "#2f6eb4",
      anchor: "intro", className: "lede",
    },
  }], variant: "studio" }));
  assert.match(html, /id="intro"/);
  assert.match(html, /class="[^"]*paragraph-field[^"]*lede/);
  assert.match(html, /font-size:20px/);
  assert.match(html, /line-height:1.4/);
  assert.match(html, /padding:8px 12px/);
  assert.match(html, /--studio-paragraph-link-color:#2f6eb4/);
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
