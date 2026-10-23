import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import postcss from "postcss";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { loadProductionModule } from "./production-module.mjs";
import { runnerImport } from "vite";
import { fileURLToPath } from "node:url";

const load = path => loadProductionModule(new URL(path, import.meta.url));
const { ExistingSiteBody, existingSitePresentation } = await load("../app/studio/test-site/existing-presentation.tsx");
const { WebsiteDesignSurface } = await load("../app/studio/site-editor/website-design-surface.tsx");
const { BlockField, StudioCanvas } = await load(process.env.STUDIO_CANVAS_SOURCE || "../app/studio/studio-canvas.tsx");
const { FeaturedImageControl } = await load("../app/studio/controls/featured-image-control.tsx");
const { createWorkspacePreviewDocument } = await load("../app/studio/editor-model.ts");
const { module: { renderTestSite } } = await runnerImport(process.env.EXISTING_SITE_RENDER_SOURCE || fileURLToPath(new URL("../app/studio/test-site/render.tsx", import.meta.url)), { root: process.cwd(), resolve: { dedupe: ["react", "react-dom"] }, environments: { inline: { resolve: { noExternal: [/^@acm\//] } } }, esbuild: { jsx: "automatic" } });
const { testSiteCollection } = await load("../app/studio/test-site/contract.ts");
const noop = () => {};
const markup = value => renderToStaticMarkup(value).replace(/<link\b[^>]*>/g, "");
function fixture(kind = "page") {
  return { ...createWorkspacePreviewDocument(kind, "test-site"), title: "Fixture", slug: "", coverImage: { src: "https://example.test/featured.png", alt: "Featured fixture" }, blocks: [
    { id: "header", type: "group", tagName: "header", layout: "flow", children: [{ id: "brand", type: "paragraph", text: "Site brand" }] },
    { id: "main", type: "group", tagName: "main", layout: "flow", children: [{ id: "body", type: "paragraph", text: "Body content" }] },
    { id: "footer", type: "group", tagName: "footer", layout: "flow", children: [{ id: "copyright", type: "paragraph", text: "Copyright" }] },
  ] };
}
function canvas(document, writable, options = {}) {
  const props = { activeDocument: document, writable, previewing: false, wordCount: 2, characterCount: 12, linkTargets: [], mediaBlockUrls: {}, selectedBlockId: null, dragOverIndex: null, showInserter: false, inserterQuery: "", filteredBlocks: [], publishFeedback: null, showCoverImage: false, ...options };
  for (const name of ["onPreviewChange", "onOpenInserter", "onSetPublishFeedback", "onDocumentFieldChange", "onApplyDocumentCode", "onFocusDocumentField", "onOpenCoverMediaLibrary", "onRemoveCoverImage", "onSelectBlock", "onClearBlockSelection", "onSetDragOverIndex", "onMoveBlockTo", "onMoveBlock", "onDuplicateBlock", "onRemoveBlock", "onRemoveBlocks", "onUpdateBlock", "onInsertBlock", "onInsertBlockAt", "onSetShowInserter", "onSetInserterQuery"]) props[name] = noop;
  return markup(createElement(StudioCanvas, props));
}

for (const kind of ["page", "post"]) {
  test(`${kind} Existing Presentation places metadata image inside main in Edit, Preview and output without changing body IDs`, () => {
    const document = fixture(kind); const before = JSON.stringify(document);
    const presentation = existingSitePresentation(document, {}, true, noop, noop);
    const main = document.blocks[1];
    const edit = markup(presentation.renderBlock({ document, block: main, mode: "edit", renderEditableBlock: (block, options) => createElement(BlockField, { block, document, ...options, onChange: noop, onTextSelection: noop, onLinkActivate: noop, onTableCellFocus: noop }) }));
    const preview = markup(presentation.renderBlock({ document, block: main, mode: "preview" }));
    const output = markup(createElement(ExistingSiteBody, { document }));
    for (const html of [edit, preview, output]) {
      assert.match(html, /<main[^>]*>[\s\S]*class="document-featured-image"[^>]*src="https:\/\/example.test\/featured.png"/);
      const body = html.includes('data-studio-block-id="body"') ? 'data-studio-block-id="body"' : "Body content";
      assert.ok(html.indexOf("featured.png") < html.indexOf(body));
      assert.equal((html.match(/class="document-featured-image"/g) ?? []).length, 1);
    }
    assert.match(edit, /aria-label="Change featured image"/);
    assert.doesNotMatch(preview, /Change featured image/);
    assert.ok(output.indexOf("Site brand") < output.indexOf("featured.png"));
    assert.ok(output.indexOf("featured.png") < output.indexOf("Copyright"));
    assert.equal(JSON.stringify(document), before);
  });
}

test("Existing Presentation respects removed and hidden images and an authored dynamic block's placement", () => {
  for (const change of [document => document.coverImage = null, document => document.displayOverrides = { coverImage: "hide" }]) {
    const document = fixture(); change(document);
    assert.doesNotMatch(markup(createElement(ExistingSiteBody, { document })), /document-featured-image|document-featured-placeholder/);
  }
  const document = fixture();
  document.blocks[1].children.push({ id: "authored-image", type: "cover-image" });
  const html = markup(createElement(ExistingSiteBody, { document }));
  assert.equal((html.match(/class="document-featured-image"/g) ?? []).length, 1);
  assert.ok(html.indexOf("Body content") < html.indexOf("featured.png"));
});

test("generated publication uses its own featured image while explicit draft preview uses the draft", () => {
  const draft = fixture();
  const source = testSiteCollection({ format: "acm-test-site", version: 2, siteId: "test2", document: draft });
  source.version = 6;
  source.publications = [{ document: { ...structuredClone(draft), status: "published", coverImage: { src: "https://example.test/published.png", alt: "Published image" } } }];
  const published = renderTestSite(source, "a".repeat(64));
  const preview = renderTestSite(source, "a".repeat(64), draft.id);
  assert.match(published, /src="https:\/\/example.test\/published.png"/);
  assert.doesNotMatch(published, /src="https:\/\/example.test\/featured.png"/);
  assert.match(preview, /src="https:\/\/example.test\/featured.png"/);
});

test("read-only canvas exposes no horizontal insertion actions; editable canvas retains them", () => {
  const document = fixture();
  assert.doesNotMatch(canvas(document, false), /class="between-blocks"/);
  assert.match(canvas(document, true), /class="between-blocks"/);
});


test("document featured image control previews managed and portable sources with overlay actions", () => {
  for (const [image, sourceUrl] of [
    [{ src: "", mediaId: "managed", alt: "Managed image" }, "blob:http://localhost:3010/managed"],
    [{ src: "/media/portable.png", alt: "Portable image" }, "/__studio/site-media/test2/portable.png"],
  ]) {
    const html = markup(createElement(FeaturedImageControl, { image, sourceUrl, onReplace: noop, onRemove: noop }));
    assert.ok(html.includes(`src="${sourceUrl}"`));
    assert.match(html, /class="page-featured-image-actions"/);
    assert.match(html, /aria-label="Replace featured image"/);
    assert.match(html, /aria-label="Remove featured image"/);
  }
  const missing = markup(createElement(FeaturedImageControl, { image: null, onReplace: noop, onRemove: noop }));
  assert.match(missing, /Set featured image/); assert.doesNotMatch(missing, /Replace|Remove|<img/);
  const unsafe = markup(createElement(FeaturedImageControl, { image: { src: "", mediaId: "managed", alt: "Missing" }, sourceUrl: "javascript:alert(1)", onReplace: noop }));
  assert.doesNotMatch(unsafe, /<img|javascript:/); assert.match(unsafe, /document-featured-placeholder/);
});


test("both local sites share portable featured-image URLs and page wrappers in canonical Edit and Preview", async () => {
  const { siteImagePreviewUrls } = await load("../app/studio/test-site/featured-images.ts");
  const name = `acm-12345678-1234-1234-1234-123456789abc-${"a".repeat(64)}.png`;
  for (const siteId of ["test", "test2"]) {
    const document = fixture(); document.coverImage = { src: `/media/${name}`, alt: "Portable featured image" };
    const before = JSON.stringify(document);
    const urls = siteImagePreviewUrls(document, siteId);
    for (const previewing of [false, true]) {
      const presentation = existingSitePresentation(document, urls, !previewing, noop, noop);
      const html = canvas(document, !previewing, { previewing, presentation, mediaBlockUrls: urls, className: "test-site-editor-surface" });
      assert.match(html, new RegExp(previewing ? 'class="document-preview' : 'class="block-canvas'));
      assert.ok(html.includes(`src="/__studio/site-media/${siteId}/${name}"`));
      assert.equal((html.match(/class="document-featured-image"/g) ?? []).length, 1);
      assert.doesNotMatch(html, /src="\/media\//);
      assert.equal(JSON.stringify(document), before);
    }
  }
});


test("local page canvas keeps the final Heading and appender in content-sized rows", () => {
  const document = fixture();
  document.coverImage = null;
  document.blocks = [{ id: "final-heading", type: "heading", level: 2, text: "Final heading", visualStyle: { padding: "0 0 24px" } }];
  const presentation = existingSitePresentation(document, {}, true, noop, noop);
  const html = canvas(document, true, { presentation, className: "test-site-editor-surface" });
  assert.match(html, /class="test-site-page" data-test-mode="edit">/);
  assert.match(html, /class="canvas-blocks"/);
  assert.ok(html.indexOf("Final heading") < html.indexOf('class="canvas-appender"'));
  assert.match(html, /padding:0 0 24px/);
  const sheet = postcss.parse(readFileSync(new URL("../app/studio/studio.css", import.meta.url), "utf8"));
  const values = (selector, property) => {
    const result = [];
    sheet.walkRules(rule => {
      if (rule.selectors.includes(selector)) rule.walkDecls(property, declaration => result.push(declaration.value));
    });
    return result;
  };
  // The page keeps its deliberate frame height; body rows must not divide it into fractional tracks.
  assert.deepEqual(values(".test-site-editor-surface .test-site-page", "min-height"), ["600px"]);
  const body = ".test-site-editor-surface .test-site-page>.canvas-blocks";
  assert.deepEqual(values(body, "grid-template-rows"), [], "a Heading followed by the appender must not create a stretched second row");
  assert.deepEqual(values(body, "min-height"), [], "the page frame must not impose its minimum height on document blocks");
  assert.deepEqual(values(".canvas-appender", "min-height"), ["46px"]);
});


test("legacy main pages share one root gutter with their outer appender in Edit and Preview", () => {
  for (const padding of [undefined, "0px", "0px 32px"]) {
    for (const previewing of [false, true]) {
      const document = fixture(); document.coverImage = null;
      const base = existingSitePresentation(document, {}, !previewing, noop, noop);
      const presentation = { ...base, renderDocument: (context, content) => createElement(WebsiteDesignSurface, { scopeId: "legacy-main", legacy: true, design: { identity: {}, styles: { paletteId: "default", typographyId: "default", ...(padding === undefined ? {} : { layout: { padding } }) } } }, base.renderDocument(context, content)) };
      const html = canvas(document, !previewing, { previewing, presentation, className: "test-site-editor-surface" });
      assert.match(html, /class="test-site-page" data-test-mode="(?:edit|preview)"/);
      assert.match(html, /<main /);
      if (!previewing) assert.match(html, /class="canvas-appender"/);
      assert.ok(!html.includes('.test-site-page:not(:has(main))'), "the presence of main cannot exclude the appender or other body siblings");
      assert.ok(html.includes(padding === undefined ? '.test-site-page{padding-inline:var(--acm-layout-spacing, 24px)}' : `.test-site-page{padding:${padding}}`));
      assert.ok(html.includes('.test-site-page main{padding-inline:0px}'), "root padding must not double the legacy main stylesheet gutter");
    }
  }
});


test("first featured-image margin stays inside the page in Edit and Preview", async () => {
  const document = fixture();
  document.blocks = [{ id: "body", type: "heading", level: 2, text: "Page body" }];
  for (const previewing of [false, true]) {
    const presentation = existingSitePresentation(document, {}, !previewing, noop, noop);
    const html = canvas(document, !previewing, { previewing, presentation, className: "test-site-editor-surface" });
    assert.match(html, /class="test-site-page" data-test-mode="(?:edit|preview)"><figure class="document-cover-shell document-dynamic-cover/);
    const page = html.slice(html.indexOf('class="test-site-page"'));
    assert.ok(page.indexOf("heading-field") > page.indexOf("</figure>"), "the body Heading follows the first featured image in both modes, independently of rich-text hydration");
  }
  const declarations = (css, selector) => {
    const result = {};
    postcss.parse(css).walkRules(rule => {
      if (rule.selectors.includes(selector)) rule.walkDecls(declaration => { result[declaration.prop] = declaration.value; });
    });
    return result;
  };
  const studio = readFileSync(new URL("../app/studio/studio.css", import.meta.url), "utf8");
  const imageCss = readFileSync(new URL("../app/content/featured-image.css", import.meta.url), "utf8");
  const { testSiteCss } = await load("../app/studio/test-site/style.ts");
  assert.equal(declarations(studio, '.test-site-editor-surface .test-site-page[data-test-mode="edit"]').display, "flow-root", "Edit must contain the first figure's margin instead of exposing the workspace outside the white page");
  assert.equal(declarations(testSiteCss, ".test-site-page").display, "flow-root", "Preview uses the same content-fitting root as Edit");
  assert.ok(testSiteCss.includes(".test-site-page a:not(.content-button){color:var(--studio-paragraph-link-color,#2f6eb4);text-decoration:underline}"), "ordinary links retain their readable link affordance without styling Button blocks");
  assert.equal(declarations(imageCss, ".document-dynamic-cover.document-cover-shell").margin, "var(--studio-block-gap, 24px) 0 0", "the authored/shared image spacing remains intact");
});
