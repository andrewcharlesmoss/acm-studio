import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, readFile, rm, realpath } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { runnerImport } from "vite";
import { createTestSiteStore, revisionOf } from "../scripts/test-site-store.mjs";
const options = { root: process.cwd(), resolve: { dedupe: ["react", "react-dom"] }, environments: { inline: { resolve: { noExternal: [/^@acm\//] } } }, esbuild: { jsx: "automatic" } };
const load = async file => (await runnerImport(path.resolve(file), options)).module;
const { testSiteCollection, validTestSiteDocument, retainLocalPublications } = await load("app/studio/test-site/contract.ts");
const { emptyTemplateStore } = await load("app/studio/template-model.ts");
const { changeLocalSiteStatus } = await load("app/studio/test-site/local-publication.ts");
const { renderTestSite } = await load("app/studio/test-site/render.tsx");
const now = "2026-10-13T12:00:00.000Z";
const backdate = "2020-02-29T09:15:00.000Z";
function fixture(siteId, kind) {
  const doc = (id, kind) => ({ id, kind, title: id, slug: id === "home" ? "" : id, excerpt: "", status: "draft", updatedAt: now, tags: [], seoTitle: "", seoDescription: "", blocks: [{ id: `${id}-date`, type: "post-date", format: "iso", showIcon: false }] });
  const source = testSiteCollection({ format: "acm-test-site", version: 3, siteId, documents: [doc("home", "page"), doc("selected", kind)], categories: [], bin: [], activeDocumentId: "home", homeDocumentId: "home", templates: emptyTemplateStore(), browserImportComplete: true });
  return { ...source, version: 6, globalTemplates: [], publications: source.documents.map(document => ({ document: structuredClone(document) })) };
}
for (const siteId of ["test", "test2"]) for (const kind of ["post", "page"]) test(`${siteId} ${kind}: saved backdate reaches publication and Draft/Pending withdraw it`, async () => {
  const root = await realpath(await mkdtemp(path.join(os.tmpdir(), "studio-publication-")));
  const source = fixture(siteId, kind);
  const store = createTestSiteStore({ root, siteId, validate: validTestSiteDocument, render: renderTestSite });
  try {
    await mkdir(path.join(root, "content")); await mkdir(path.join(root, "dist"));
    await writeFile(path.join(root, "content/site.json"), JSON.stringify(source));
    await writeFile(path.join(root, "dist/index.html"), renderTestSite(source, revisionOf(source)));
    const session = await store.connect(); await store.handle(session.token, { siteId, action: "claim" });
    let latest = session;
    async function save(document) { latest = await store.handle(session.token, { siteId, action: "save", baseRevision: latest.revision, document }); return latest.document; }
    let draft = structuredClone(source); draft.documents[1].publishAt = backdate;
    draft = await save(draft);
    assert.equal(JSON.parse(await readFile(path.join(root, "content/site.json"), "utf8")).documents[1].publishAt, backdate);
    assert.equal(draft.publications[1].document.publishedAt, undefined);
    let published = changeLocalSiteStatus(draft, "selected", "published", draft.templates, now);
    assert.equal(validTestSiteDocument(published), true);
    published = await save(published);
    assert.equal(published.documents[1].publishedAt, backdate);
    assert.equal(published.documents[1].publishAt, undefined);
    assert.equal(published.publications.find(item => item.document.id === "selected").document.publishedAt, backdate);
    assert.match(await readFile(path.join(root, "dist/index.html"), "utf8"), /2020-02-29/);
    const reloaded = await store.connect();
    assert.equal(reloaded.document.documents[1].publishedAt, backdate);
    for (const status of ["pending", "draft"]) {
      published = await save(changeLocalSiteStatus(published, "selected", status, published.templates, now));
      assert.equal(published.documents[1].status, status);
      assert.equal(published.publications.some(item => item.document.id === "selected"), false);
      assert.doesNotMatch(await readFile(path.join(root, "dist/index.html"), "utf8"), /data-test-document="selected"/);
      published = await save(changeLocalSiteStatus(published, "selected", "published", published.templates, now));
      assert.equal(published.documents[1].publishedAt, backdate);
    }
  } finally { await store.close(); await rm(root, { recursive: true, force: true }); }
});
test("unsupported statuses, future dates and home withdrawal leave the source unchanged", () => {
  const source = fixture("test", "post"); const before = JSON.stringify(source);
  for (const status of ["private", "scheduled"]) assert.throws(() => changeLocalSiteStatus(source, "selected", status, source.templates, now), /not supported/);
  for (const status of ["draft", "pending"]) assert.throws(() => changeLocalSiteStatus(source, "home", status, source.templates, now), /home page/);
  for (const publishAt of ["invalid", "2027-01-01T00:00:00Z"]) {
    const invalid = structuredClone(source); invalid.documents[1].publishAt = publishAt;
    assert.throws(() => changeLocalSiteStatus(invalid, "selected", "published", invalid.templates, now), /past or current/);
  }
  assert.equal(JSON.stringify(source), before);
});
test("Undo content cannot reinstate a withdrawn publication or discard an editable date", () => {
  const source = fixture("test", "post"); source.documents[1].publishAt = backdate;
  const published = changeLocalSiteStatus(source, "selected", "published", source.templates, now);
  const pending = changeLocalSiteStatus(published, "selected", "pending", source.templates, now);
  const restored = retainLocalPublications(published, pending);
  assert.equal(restored.documents[1].status, "pending");
  assert.equal(restored.publications.some(item => item.document.id === "selected"), false);
  const edited = structuredClone(published); edited.documents[1].publishAt = "2019-01-01T00:00:00.000Z";
  const undone = retainLocalPublications(edited, published);
  assert.equal(undone.documents[1].publishAt, edited.documents[1].publishAt);
  assert.equal(undone.publications[1].document.publishedAt, backdate);
});


test("the owning context captures the calendar date, awaits saving, and exposes failures", async () => {
  const { useTestSiteContext } = await load(process.env.SITE_PUBLICATION_CONTEXT_SOURCE ?? "app/studio/test-site/use-test-site-context.ts");
  const { createGlobalTemplateLibrary } = await load("app/studio/global-template-contract.ts");
  const testSource = fixture("test", "post");
  const globals = createGlobalTemplateLibrary({ test: testSource, test2: fixture("test2", "page") });
  let current = testSource; current.documents[1].publishAt = backdate;
  let context; let flushes = 0; let fail = false;
  const site = { siteId: "test", siteName: "Test", draft: current, writable: true,
    updateDraft(update) { current = update(structuredClone(current)); return true; },
    async flush() { flushes++; if (fail) throw new Error("Save unavailable"); },
  };
  function Harness() { context = useTestSiteContext(site, { exclusiveWritable: true }, undefined, globals, true); return null; }
  renderToStaticMarkup(createElement(Harness));
  await context.publishDocument("selected");
  assert.equal(current.publications.find(item => item.document.id === "selected").document.publishedAt, backdate);
  assert.equal(flushes, 1);
  await context.changePublicationStatus("selected", "pending");
  assert.equal(current.documents[1].status, "pending");
  assert.equal(flushes, 2);
  fail = true;
  await assert.rejects(context.publishDocument("selected"), /Save unavailable/);
  site.writable = false;
  const before = JSON.stringify(current);
  await assert.rejects(context.publishDocument("selected"), /unavailable/);
  assert.equal(JSON.stringify(current), before);
});


test("site posts and pages render the shared status/date buttons with the existing publication date", async () => {
  const { DocumentInspector } = await load("app/studio/blocks/inspectors/document-inspector.tsx");
  for (const kind of ["post", "page"]) {
    const document = fixture("test", kind).documents[1]; document.status = "published"; document.publishedAt = backdate;
    const noop = () => {};
    const html = renderToStaticMarkup(createElement(DocumentInspector, { siteContext: true, localPublication: { status: "published", publishedAt: backdate }, panel: "document", document, resolvedDocument: document, categories: [], tagSuggestions: [], pages: [], onCategorySelectionChange: noop, onAddCategory: noop, onChange: noop, onPublish: noop, onUnpublish: noop, onStatusChange: noop, onDuplicate: noop, onDelete: noop, canDelete: true, canDuplicate: true, allowedStatuses: ["draft", "pending", "published"] }));
    assert.match(html, /inspector-setting-trigger[^>]*aria-haspopup="dialog"[^>]*>Published/);
    assert.match(html, /inspector-setting-trigger[^>]*aria-haspopup="dialog"[^>]*>29 Feb 2020, 09:15/);
    assert.match(html, new RegExp(`Update published ${kind}`));
    assert.match(html, /Return to draft/);
    assert.doesNotMatch(html, /password-protection-toggle|sticky-post-toggle/);
  }
});
