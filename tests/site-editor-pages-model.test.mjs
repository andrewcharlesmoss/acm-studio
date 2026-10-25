import test from "node:test";
import assert from "node:assert/strict";
import { defaultPagesView, normalizePagesView, pageMatchesFilters, pageSearchText, queryPages, sortPages, validPagesView } from "../app/studio/site-editor/pages-model.mjs";

const page = (id, title, extra = {}) => ({ id, kind: "page", title, slug: title.toLowerCase().replaceAll(" ", "-"), excerpt: "", status: "published", updatedAt: "2026-10-01T00:00:00.000Z", tags: [], blocks: [], ...extra });

test("Pages preferences validate supported layouts and recover invalid saved values", () => {
  assert.equal(validPagesView(defaultPagesView), true);
  assert.equal(validPagesView({ ...defaultPagesView, pageSize: 12 }), false);
  assert.deepEqual(normalizePagesView(null), defaultPagesView);
});

test("Page search includes readable nested block text and supported metadata", () => {
  const value = page("one", "Home", { excerpt: "A summary", blocks: [{ type: "group", children: [{ type: "paragraph", text: "A distinctive phrase" }] }] });
  assert.match(pageSearchText(value), /distinctive phrase/);
  assert.equal(pageMatchesFilters(value, { query: "summary" }), true);
  assert.equal(pageMatchesFilters(value, { query: "missing" }), false);
});

test("Page search includes visible text from code, tables, captions, buttons and fields", () => {
  const value = page("one", "Home", { blocks: [
    { type: "code", code: "const rareWord = true;" },
    { type: "table", rows: [["Table heading", "Table phrase"]], cellRuns: [[[{ text: "Formatted cell copy" }, { text: " remains searchable" }]]], caption: "Table caption" },
    { type: "image", caption: "Image caption" },
    { type: "button", label: "Read the guide" },
    { type: "field", label: "Field label", value: "Field value" },
  ] });
  for (const query of ["rareword", "table phrase", "formatted cell copy", "table caption", "image caption", "read the guide", "field label", "field value"]) {
    assert.equal(pageMatchesFilters(value, { query }), true, `Expected page search to find ${query}`);
  }
});

test("pageOrder sorts numerically, then by case-insensitive title and stable ID", () => {
  const pages = [page("z", "zebra", { pageOrder: 2 }), page("b", "alpha", { pageOrder: -1 }), page("a", "Alpha", { pageOrder: -1 }), page("c", "middle", { pageOrder: 1 })];
  assert.deepEqual(sortPages(pages, { ...defaultPagesView, sortBy: "order" }).map(item => item.id), ["a", "b", "c", "z"]);
  assert.deepEqual(sortPages(pages, { ...defaultPagesView, sortBy: "order", direction: "desc" }).map(item => item.id), ["z", "c", "a", "b"]);
});

test("query combines selected status with filters and paginates deterministically", () => {
  const documents = [page("a", "Home"), page("b", "About", { status: "draft" }), page("c", "Contact"), { ...page("post", "A post"), kind: "post" }];
  const binned = [{ id: "bin-a", deletedAt: "2026-10-02T00:00:00.000Z", document: page("removed", "Removed") }];
  const first = queryPages({ documents, binned, status: "all", view: { ...defaultPagesView, pageSize: 1 }, page: 1 });
  assert.equal(first.total, 3);
  assert.equal(first.items[0].id, "b");
  assert.equal(first.pageCount, 3);
  assert.deepEqual(queryPages({ documents, status: "published" }).items.map(item => item.id), ["c", "a"]);
  assert.equal(queryPages({ documents, binned, status: "bin" }).items[0].id, "removed");
});
