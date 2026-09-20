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
const { restoreLegacyPublicationCover, toLocallyPublishedArticle } = await import(await compileModule(new URL("../app/content/local-publishing.ts", import.meta.url)));
const { blockToHtml, formatHtml } = await import(await compileModule(new URL("../app/studio/studio-html-editor.ts", import.meta.url)));

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

test("the public article renderer remains independent of the Studio presentation", () => {
  const html = renderToStaticMarkup(createElement(BlockRenderer, { blocks: [
    { id: "heading", type: "heading", level: 2, text: "Heading" },
    { id: "quote", type: "quote", text: "Quote" },
  ] }));
  assert.match(html, /class="prose"/);
  assert.match(html, /class="pull-quote align-left"/);
  assert.doesNotMatch(html, /studio-block-preview|heading-field|content-block/);
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
    const document = { kind: "post", status: "draft", title: "Test", slug: "test", author: "Andrew Moss", updatedAt: "2026-09-08T12:00:00Z", blocks };
    const html = renderToStaticMarkup(createElement(StudioCanvas, { activeDocument: document, previewing: false, wordCount: words, characterCount: 0, linkTargets: [], mediaBlockUrls: {} }));
    assert.ok(html.includes(`Reading Time: ${label}`));
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
  const { StudioCanvas } = await import(await compileModule(new URL("../app/studio/studio-canvas.tsx", import.meta.url)));
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
