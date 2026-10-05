import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { loadProductionModule } from "./production-module.mjs";

const { miniGolfPresentation } = await loadProductionModule(new URL("../app/studio/mini-golf-presentation.tsx", import.meta.url));
const mediaUrls = { managed: "blob:http://localhost:3010/mini-golf-context-fixture" };
const documentFixture = blocks => ({
  id: "mini-golf-home", kind: "page", title: "Club scorecard", subtitle: "A friendly round",
  slug: "club-scorecard", author: "Alex Example", publishAt: "2026-10-05T12:00:00.000Z",
  updatedAt: "2026-10-06T12:00:00.000Z", blocks,
  coverImage: { src: "", mediaId: "managed", alt: "Course cover" },
});

function render(block, mode, document = documentFixture([block])) {
  return renderToStaticMarkup(miniGolfPresentation.renderBlock({
    block, document, mode, mediaUrls, writable: false,
    onDocumentFieldChange() {}, onFocusDocumentField() {},
  }));
}

test("Mini Golf fallback renders actual document metadata in Edit and Preview", () => {
  const cases = [
    [{ id: "title", type: "document-title", level: 2, isLink: true }, "Club scorecard", 'href="/club-scorecard"'],
    [{ id: "subtitle", type: "document-subtitle" }, "A friendly round"],
    [{ id: "author", type: "post-author", prefix: "Written by", avatar: false }, "Alex Example", "Written by"],
    [{ id: "published", type: "post-date", format: "iso", showIcon: false }, "2026-10-05"],
    [{ id: "modified", type: "post-date", dateSource: "modified", format: "iso" }, "2026-10-06"],
  ];
  for (const [block, ...values] of cases) {
    const document = documentFixture([block]);
    const before = JSON.stringify(document);
    for (const mode of ["edit", "preview"]) {
      const html = render(block, mode, document);
      for (const value of values) assert.ok(html.includes(value), `${mode} ${block.type}: ${value}`);
      assert.doesNotMatch(html, /Add (?:a title|a subtitle|an author|a publication date) in Document settings/);
    }
    assert.equal(JSON.stringify(document), before);
  }
});

test("Mini Golf fallback honours each document visibility override in both modes", () => {
  for (const [type, field] of [["document-title", "title"], ["document-subtitle", "subtitle"], ["post-author", "author"], ["post-date", "publicationDate"], ["reading-time", "readingTime"], ["cover-image", "coverImage"]]) {
    const block = { id: field, type };
    const document = { ...documentFixture([block]), displayOverrides: { [field]: "hide" } };
    for (const mode of ["edit", "preview"]) assert.doesNotMatch(render(block, mode, document), /Club scorecard|A friendly round|Alex Example|<time|Reading Time:|<img/);
  }
});

test("nested fallback metadata uses the containing document without substituting site defaults", () => {
  const block = { id: "group", type: "group", layout: "stack", children: [{ id: "nested-title", type: "document-title" }, { id: "nested-author", type: "post-author" }] };
  for (const mode of ["edit", "preview"]) {
    const html = render(block, mode);
    assert.match(html, /Club scorecard/);
    assert.match(html, /Alex Example/);
  }
});

test("Mini Golf fallback resolves managed Image and Featured Image in both modes", () => {
  for (const block of [{ id: "image", type: "image", mediaId: "managed", src: "", alt: "Managed course image" }, { id: "cover", type: "cover-image" }]) {
    for (const mode of ["edit", "preview"]) assert.ok(render(block, mode).includes(`src="${mediaUrls.managed}"`), `${mode} ${block.type}`);
  }
});

test("nested managed images retain their media lookup in Edit and Preview", () => {
  const block = { id: "images", type: "group", layout: "stack", children: [{ id: "nested-image", type: "image", mediaId: "managed", src: "", alt: "Nested course image" }] };
  for (const mode of ["edit", "preview"]) assert.ok(render(block, mode).includes(`src="${mediaUrls.managed}"`));
});

test("canonical score-table Preview resolves managed inline images in cells and captions", () => {
  const imageRun = { text: "\uFFFC", inline: { type: "image", mediaId: "managed", alt: "Inline course image", width: 32 } };
  const table = { id: "score-table", type: "table", rows: [["\uFFFC"]], cellRuns: [[[imageRun]]], caption: "\uFFFC", captionRuns: [imageRun] };
  const block = { id: "scorecard", type: "section", role: "scorecard", layout: "stack", children: [table] };
  // Edit rich-text contents initialise in a browser layout effect; the adapter
  // prop contract is checked separately in mini-golf-presentation.test.mjs.
  const html = render(block, "preview");
  assert.equal(html.split(`src="${mediaUrls.managed}"`).length - 1, 2);
  assert.doesNotMatch(html, /Image unavailable/);
});

test("unsafe and missing managed sources never replace the document with another image", () => {
  const block = { id: "image", type: "image", mediaId: "missing", src: "https://example.test/stale.png", alt: "Missing image" };
  for (const mode of ["edit", "preview"]) assert.doesNotMatch(render(block, mode), /<img/);
  const cover = { id: "cover", type: "cover-image" };
  const document = { ...documentFixture([cover]), coverImage: { src: "javascript:alert(1)", alt: "Unsafe cover" } };
  for (const mode of ["edit", "preview"]) assert.doesNotMatch(render(cover, mode, document), /<img/);
});

test("absent document metadata remains an editor prompt and is not manufactured in Preview", () => {
  for (const type of ["document-title", "document-subtitle", "post-author", "post-date"]) {
    const block = { id: type, type };
    const document = { id: "empty", kind: "page", title: "", slug: "", blocks: [block] };
    assert.match(render(block, "edit", document), /Add .* in Document settings/);
    assert.doesNotMatch(render(block, "preview", document), /Club scorecard|Alex Example|2026-10-05/);
  }
});

test("fallback reading time still measures the whole authored document", () => {
  const block = { id: "reading", type: "reading-time", mode: "words", presentation: "plain" };
  const document = documentFixture([{ id: "copy", type: "paragraph", text: "One two three four five" }, block]);
  for (const mode of ["edit", "preview"]) assert.match(render(block, mode, document), /5 words/);
});
