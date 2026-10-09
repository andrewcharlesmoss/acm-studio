import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import vm from "node:vm";
import { mkdtemp, mkdir, writeFile, readFile, rm, realpath } from "node:fs/promises";
import os from "node:os";
import { runnerImport } from "vite";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { createTestSiteStore, revisionOf } from "../scripts/test-site-store.mjs";
const options = { root: process.cwd(), resolve: { dedupe: ["react", "react-dom"] }, environments: { inline: { resolve: { noExternal: [/^@acm\//] } } }, esbuild: { jsx: "automatic" } };
const { module: contract } = await runnerImport(path.resolve("app/studio/test-site/contract.ts"), options);
const { module: model } = await runnerImport(path.resolve("app/studio/template-model.ts"), options);
const { module: renderer } = await runnerImport(path.resolve("app/studio/test-site/render.tsx"), options);
const { module: navigation } = await runnerImport(path.resolve("app/studio/test-site/navigation.tsx"), options);
const { module: sync } = await runnerImport(path.resolve("app/studio/studio-sync.ts"), options);
function page(id = "test-site", kind = "page") { return { id, kind, title: id, slug: id === "test-site" ? "" : "repeated-slug", excerpt: "", status: "draft", updatedAt: "2026-10-09T00:00:00.000Z", tags: [], seoTitle: "", seoDescription: "", blocks: [{ id: `${id}-paragraph`, type: "paragraph", text: `Content for ${id}` }] }; }
const legacy = () => ({ format: "acm-test-site", version: 2, siteId: "test", document: page() });
const workspace = () => ({ version: 24, activeDocumentId: "page-one", documents: [page("page-one"), page("post-one", "post")], categories: [], bin: [] });
function imported() { return contract.importBrowserTestContent(legacy(), workspace(), model.emptyTemplateStore()); }
function valid(value) { assert.equal(contract.validTestSiteDocument(value), true); }
test("editor navigation matches website documents and preserves the body or assigned template in both modes", () => {
  const site = imported(); site.documents[1].title = '<script>Fixture & title</script>';
  const before = JSON.stringify(site);
  for (const mode of ["edit", "preview"]) {
    for (const base of [{}, { renderDocument: (_context, content) => createElement("section", { className: "assigned-template" }, content) }]) {
      const presentation = navigation.withTestSiteNavigation(base, site.siteId, site.documents, () => {});
      const html = renderToStaticMarkup(presentation.renderDocument({ document: site.documents[1], mode }, createElement("p", null, "Editable body")));
      assert.equal((html.match(/data-test-link=/g) ?? []).length, site.documents.length);
      assert.match(html, /aria-label="Test content"/);
      assert.match(html, /documentId=page-one" aria-current="page"/);
      assert.match(html, /&lt;script&gt;Fixture &amp; title&lt;\/script&gt;/);
      assert.match(html, /<p>Editable body<\/p>/);
      if (base.renderDocument) assert.match(html, /class="assigned-template"/);
    }
  }
  assert.equal(JSON.stringify(site), before);
  const single = navigation.withTestSiteNavigation({}, "test2", [page()], () => {});
  assert.equal(renderToStaticMarkup(single.renderDocument({ document: page(), mode: "edit" }, "Body")), "Body");
});
test("v1/v2 upgrade preserves home, metadata and regions without writing or consuming browser originals", () => {
  const source = legacy(); source.document.author = "Fixture author";
  const upgraded = contract.testSiteCollection(source); valid(upgraded);
  assert.deepEqual(upgraded.documents[0], source.document); assert.equal(source.version, 2);
  const v1 = { format: "acm-test-site", version: 1, siteId: "test", regions: Object.fromEntries(["header", "main", "footer"].map(region => [region, { id: `test-${region}`, type: "group", layout: "flow", tagName: region, children: [] }])) };
  valid(v1); const collection = contract.testSiteCollection(v1); valid(collection);
  assert.deepEqual(collection.documents[0].blocks.map(block => block.tagName), ["header", "main", "footer"]);
  const browser = workspace(); const before = JSON.stringify(browser); const site = contract.importBrowserTestContent(source, browser, model.emptyTemplateStore());
  valid(site); assert.equal(JSON.stringify(browser), before); assert.equal(site.documents.length, 3);
  assert.equal(contract.importBrowserTestContent(site, browser, model.emptyTemplateStore()), site);
});
test("collection validates ownership, home, duplicate IDs, categories, parents and portable media", () => {
  const good = imported(); valid(good);
  for (const mutate of [
    value => { value.siteId = "other"; }, value => { value.homeDocumentId = "post-one"; },
    value => { value.documents.push(value.documents[0]); }, value => { value.documents[1].parentPageId = "missing"; },
    value => { value.documents[1].categoryIds = ["missing"]; }, value => { value.documents[1].coverImage = { src: "", alt: "", mediaId: "browser-image" }; },
    value => { value.documents[1].blocks[0].runs = [{ type: "image", src: "blob:browser-image", alt: "" }]; },
    value => { value.unknown = true; }, value => { value.browserImportComplete = "yes"; },
  ]) { const invalid = structuredClone(good); mutate(invalid); assert.equal(contract.validTestSiteDocument(invalid), false); }
  const collision = workspace(); collision.documents[0].id = "test-site";
  assert.throws(() => contract.importBrowserTestContent(legacy(), collision, model.emptyTemplateStore()), /ID/);
  const media = workspace(); media.documents[0].coverImage = { src: "", alt: "", mediaId: "browser-only" };
  assert.throws(() => contract.importBrowserTestContent(legacy(), media, model.emptyTemplateStore()), /portable/);
  assert.equal(media.documents[0].coverImage.mediaId, "browser-only");
});
test("import carries templates, assignments, categories and binned documents as one aggregate", () => {
  const browser = workspace(); browser.categories = [{ id: "category-one", name: "One" }]; browser.documents[1].categoryIds = ["category-one"];
  browser.bin.push({ id: "bin-one", deletedAt: "2026-10-09T00:00:00Z", document: page("binned-one") });
  const set = model.createTemplateSet("Fixture"); const templates = { ...model.emptyTemplateStore(), sets: [set], assignments: [{ documentId: "post-one", kind: "post", setId: set.id, templateId: set.templates.find(item => item.kind === "post").id }] };
  const site = contract.importBrowserTestContent(legacy(), browser, templates); valid(site);
  assert.deepEqual(site.templates, templates); assert.deepEqual(site.categories, browser.categories); assert.deepEqual(site.bin, browser.bin);
  const wrong = structuredClone(site); wrong.templates.assignments[0].documentId = "another-site"; assert.equal(contract.validTestSiteDocument(wrong), false);
});
test("tab selection is independent of the home and transactions merge separate document edits", () => {
  const base = imported(); const a = structuredClone(base); const b = structuredClone(base);
  a.documents[1].title = "Edited page"; b.documents[2].title = "Edited post";
  const transaction = sync.createStudioTransaction(base, a, { clientId: "a", transactionId: "change-a", brokerEpoch: "epoch", baseRevision: 0 });
  const merged = sync.applyStudioTransaction(b, transaction); assert.equal(merged.conflicts.length, 0);
  assert.equal(merged.snapshot.documents[1].title, "Edited page"); assert.equal(merged.snapshot.documents[2].title, "Edited post"); valid(merged.snapshot);
  assert.equal(contract.testSiteWorkspace(base, "post-one").activeDocumentId, "post-one"); assert.equal(base.homeDocumentId, "test-site");
  assert.equal(contract.testSiteWorkspace(base, "deleted").activeDocumentId, "test-site");
});
test("renderer safely routes all documents and retains the home on an invalid document link", () => {
  const site = imported(); site.documents[1].title = '</script><script>alert("x")</script>';
  const html = renderer.renderTestSite(site, revisionOf(site));
  assert.match(html, /Content for page-one/); assert.match(html, /Content for post-one/); assert.match(html, /&lt;\/script&gt;/);
  assert.equal(html.includes(site.documents[1].title), false);
  const pages = site.documents.map(page => ({ dataset: { testDocument: page.id, testHome: String(page.id === site.homeDocumentId), testTitle: page.title }, hidden: page.id !== site.homeDocumentId }));
  const links = pages.map(page => ({ dataset: { testLink: page.dataset.testDocument }, setAttribute() {}, removeAttribute() {} }));
  const document = { title: "Test", querySelectorAll: selector => selector === "[data-test-document]" ? pages : links };
  const location = { hash: "#document=post-one" }; let onHashChange;
  vm.runInNewContext(html.match(/<script>([\s\S]*)<\/script>/)[1], { document, location, addEventListener: (_name, callback) => { onHashChange = callback; } });
  assert.equal(pages.find(page => !page.hidden).dataset.testDocument, "post-one");
  location.hash = "#footnote-one"; onHashChange(); assert.equal(pages.find(page => !page.hidden).dataset.testDocument, "post-one");
  location.hash = "#document=unknown"; onHashChange(); assert.equal(pages.find(page => !page.hidden).dataset.testDocument, "test-site");
  location.hash = "#document=%ZZ"; onHashChange(); assert.equal(pages.find(page => !page.hidden).dataset.testDocument, "test-site");
});
test("v3 aggregate saves and reloads through the unchanged revision gateway, rejects stale/unsafe updates", async () => {
  const root = await realpath(await mkdtemp(path.join(os.tmpdir(), "test-site-collection-")));
  const source = legacy(); const revision = revisionOf(source);
  await mkdir(path.join(root, "content")); await mkdir(path.join(root, "dist"));
  await writeFile(path.join(root, "content/site.json"), JSON.stringify(source)); await writeFile(path.join(root, "dist/index.html"), renderer.renderTestSite(source, revision));
  const store = createTestSiteStore({ root, validate: contract.validTestSiteDocument, render: renderer.renderTestSite });
  try {
    const session = await store.connect(); await store.handle(session.token, { siteId: "test", action: "claim" });
    const aggregate = imported(); const saved = await store.handle(session.token, { siteId: "test", action: "save", baseRevision: revision, document: aggregate });
    const fresh = await store.handle(session.token, { siteId: "test", action: "read" }); assert.deepEqual(fresh.document, aggregate); assert.equal(fresh.revision, saved.previewRevision);
    assert.deepEqual(JSON.parse(await readFile(path.join(root, `.studio/history/${revision}.json`), "utf8")), source);
    await assert.rejects(store.handle(session.token, { siteId: "test", action: "save", baseRevision: revision, document: aggregate }), error => error.status === 409);
    const unsafe = structuredClone(aggregate); unsafe.documents[1].coverImage = { src: "blob:invalid", alt: "" };
    await assert.rejects(store.handle(session.token, { siteId: "test", action: "save", baseRevision: saved.revision, document: unsafe }));
    assert.deepEqual(JSON.parse(await readFile(path.join(root, "content/site.json"), "utf8")), aggregate);
  } finally { await store.close(); await rm(root, { recursive: true, force: true }); }
});
