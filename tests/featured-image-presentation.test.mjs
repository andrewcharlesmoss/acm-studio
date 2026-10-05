import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { loadProductionModule } from "./production-module.mjs";

const load = path => loadProductionModule(new URL(path, import.meta.url));
const { resolveImageSource } = await load("../app/content/image-source.ts");
const { BlockRenderer } = await load("../app/components/content.tsx");
const { BlockField } = await load("../app/studio/studio-canvas.tsx");
const { TemplateNodes } = await load("../app/studio/template-renderer.tsx");
const { createTemplateSet } = await load("../app/studio/template-model.ts");
const { validContentBlocks } = await load("../app/studio/workspace-validation.ts");
const { blockToHtml } = await load("../app/studio/studio-html-editor.ts");

const mediaUrls = { cover: "blob:http://localhost:3010/featured-image-fixture" };
const baseBlock = { id: "featured", type: "cover-image", aspectRatio: "square", displayWidth: 320 };
const managedCover = { src: "", mediaId: "cover", alt: "Managed featured image" };
const documentFixture = coverImage => ({ id: "featured-post", kind: "post", title: "Featured image example", slug: "featured-image-example", coverImage, blocks: [baseBlock] });
const set = createTemplateSet("Featured Image Test");

function contentHtml(block, document, variant = "studio") {
  return renderToStaticMarkup(createElement(BlockRenderer, { blocks: [block], document, mediaUrls, variant }));
}

function editHtml(block, document, extra = {}) {
  return renderToStaticMarkup(createElement(BlockField, {
    block, document, mediaUrls, onChange() {}, onTextSelection() {}, onLinkActivate() {}, onTableCellFocus() {}, ...extra,
  }));
}

function templateHtml(block, document, extra = {}) {
  const node = { ...block, type: "element", element: "cover-image" };
  return renderToStaticMarkup(createElement(TemplateNodes, { set, nodes: [node], document, mediaUrls, ...extra }));
}

test("managed source uses a resolved URL and refuses stale or unsafe fallbacks", () => {
  assert.equal(resolveImageSource(managedCover, mediaUrls), mediaUrls.cover);
  assert.equal(resolveImageSource(managedCover, mediaUrls, "blob:http://localhost:3010/owner-cover"), "blob:http://localhost:3010/owner-cover");
  assert.equal(resolveImageSource({ ...managedCover, src: "https://example.test/stale.png" }, {}), null);
  for (const unsafe of ["javascript:alert(1)", "data:image/svg+xml,<svg/>", "//example.test/cover.png"]) {
    assert.equal(resolveImageSource(managedCover, { cover: unsafe }), null);
    assert.equal(resolveImageSource({ src: unsafe }), null);
  }
  assert.equal(resolveImageSource(null, mediaUrls), null);
  assert.equal(resolveImageSource(undefined, mediaUrls), null);
});

test("authored sources preserve external and local paths but cannot author browser blobs", () => {
  for (const src of ["https://example.test/cover.png", "http://localhost:3010/cover.png", "/cover.png"]) assert.equal(resolveImageSource({ src }), src);
  assert.equal(resolveImageSource({ src: mediaUrls.cover }), null);
});

test("managed Featured Image renders in Edit, both content variants and Template", () => {
  const document = documentFixture(managedCover);
  const before = JSON.stringify(document);
  for (const html of [editHtml(baseBlock, document), contentHtml(baseBlock, document), contentHtml(baseBlock, document, "article"), templateHtml(baseBlock, document), templateHtml(baseBlock, document, { editingDocument: true })]) {
    assert.match(html, /src="blob:http:\/\/localhost:3010\/featured-image-fixture"/);
    assert.match(html, /class="document-featured-image"/);
    assert.match(html, /alt="Managed featured image"/);
    assert.doesNotMatch(html, /class="image-placeholder"/);
  }
  assert.equal(JSON.stringify(document), before);
});

test("external Featured Image resolves from its document without a redundant editor URL", () => {
  const document = documentFixture({ src: "https://example.test/cover.png", alt: "Authored cover" });
  for (const html of [editHtml(baseBlock, document), contentHtml(baseBlock, document), templateHtml(baseBlock, document)]) assert.match(html, /src="https:\/\/example.test\/cover.png"/);
});

test("missing managed sources remain deliberate placeholders without unrelated images", () => {
  const document = documentFixture({ src: "https://example.test/stale.png", mediaId: "missing", alt: "Missing cover" });
  for (const html of [editHtml(baseBlock, document), contentHtml(baseBlock, document), templateHtml(baseBlock, document)]) {
    assert.doesNotMatch(html, /<img/);
    assert.doesNotMatch(html, /stale\.png/);
  }
});

test("fixed Template images use their own managed source and presentation class", () => {
  const html = templateHtml({ ...baseBlock, fixedImage: managedCover }, documentFixture({ src: "https://example.test/document.png", alt: "Document cover" }), { templatePreview: true });
  assert.match(html, /src="blob:http:\/\/localhost:3010\/featured-image-fixture"/);
  assert.match(html, /class="document-featured-image"/);
  assert.doesNotMatch(html, /document\.png/);
});

test("hidden document Featured Image stays hidden in Edit, content Preview and Template", () => {
  const document = { ...documentFixture(managedCover), displayOverrides: { coverImage: "hide" } };
  for (const html of [editHtml(baseBlock, document), contentHtml(baseBlock, document), templateHtml(baseBlock, document)]) {
    assert.doesNotMatch(html, /document-featured-image|<img|canvas-cover-image/);
  }
});

for (const [aspectRatio, expected] of [["original", null], ["square", "1 / 1"], ["portrait", "3 / 4"], ["landscape", "4 / 3"], ["wide", "16 / 9"]]) {
  test(`${aspectRatio} dimensions and scale reach every Featured Image renderer`, () => {
    const block = { ...baseBlock, aspectRatio, displayHeight: 180, scale: "contain" };
    const document = documentFixture(managedCover);
    for (const html of [editHtml(block, document), contentHtml(block, document), templateHtml(block, document)]) {
      assert.match(html, /width:320px;height:180px/);
      assert.match(html, /object-fit:contain/);
      if (expected) assert.ok(html.includes(`aspect-ratio:${expected}`));
      else assert.doesNotMatch(html, /aspect-ratio:/);
    }
    assert.equal(validContentBlocks([block]), true);
    assert.match(blockToHtml(block), /data-display-width="320"/);
    assert.match(blockToHtml(block), /data-display-height="180"/);
  });
}

test("Cover, Contain and Fill preserve their explicit typed scaling", () => {
  for (const scale of ["cover", "contain", "fill"]) {
    const block = { ...baseBlock, scale };
    for (const html of [editHtml(block, documentFixture(managedCover)), contentHtml(block, documentFixture(managedCover)), templateHtml(block, documentFixture(managedCover))]) assert.ok(html.includes(`object-fit:${scale}`));
  }
});

test("link safety and single frame ownership remain intact", () => {
  const block = { ...baseBlock, isLink: true, linkTarget: "_blank", rel: "nofollow", visualStyle: { borderStyle: "solid", borderWidth: "2px", borderColor: "#123456", borderRadius: "12px", shadow: "soft" } };
  const document = documentFixture(managedCover);
  for (const html of [editHtml(block, document), contentHtml(block, document), templateHtml(block, document)]) {
    for (const property of ["border-style:", "border-radius:", "box-shadow:"]) assert.equal(html.split(property).length - 1, 1);
    const imageStyle = html.match(/<img[^>]*style="([^"]+)"/)?.[1];
    assert.doesNotMatch(imageStyle, /border-style|border-radius|box-shadow/);
  }
  for (const html of [contentHtml(block, document), templateHtml(block, document)]) assert.match(html, /href="\/writing\/featured-image-example" target="_blank" rel="nofollow noopener noreferrer"/);
});

test("shared CSS removes source-frame constraints while retaining empty cover frames", async () => {
  const css = await readFile(new URL("../app/content/featured-image.css", import.meta.url), "utf8");
  const layout = await readFile(new URL("../app/layout.tsx", import.meta.url), "utf8");
  assert.match(layout, /import "\.\/content\/featured-image\.css"/);
  assert.match(css, /\.document-featured-image\s*\{[^}]*width: 100%;[^}]*height: auto;/);
  assert.match(css, /\.document-dynamic-cover > \.canvas-cover-image\.is-source\s*\{[^}]*aspect-ratio: auto;/);
  assert.match(css, /\.canvas-cover-image \.document-featured-image\s*\{\s*height: auto;/);
  assert.doesNotMatch(css, /\.canvas-cover-image\s*\{/);
});
