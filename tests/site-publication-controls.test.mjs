import { testSiteVersion } from "./test-site-fixture.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, readFile, rm, realpath } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { loadViteModule as runnerImport } from "./production-module.mjs";
import { createTestSiteStore, revisionOf } from "../scripts/test-site-store.mjs";
// These Node checks exercise markup and commands; browser checks own stylesheet rendering.
// Resolve styles to an extensionless virtual module before Vite's CSS pipeline.
const semanticStyles = { name: "test-semantic-css-boundary", enforce: "pre", resolveId(id) { if (id.endsWith(".css")) return "\0test-semantic-style"; }, load(id) { if (id === "\0test-semantic-style") return "export {};"; } };
const options = { plugins: [semanticStyles], root: process.cwd(), resolve: { dedupe: ["react", "react-dom"] }, environments: { inline: { resolve: { noExternal: [/^@acm\//] } } }, esbuild: { jsx: "automatic" } };
const load = async file => (await runnerImport(path.resolve(file), options)).module;
const { testSiteCollection, validTestSiteDocument, retainLocalPublications } = await load("app/studio/test-site/contract.ts");
const { emptyTemplateStore } = await load("app/studio/template-model.ts");
const { changeLocalSiteStatus } = await load("app/studio/test-site/local-publication.ts");
const { renderTestSite } = await load("app/studio/test-site/render.tsx");
const now = "2026-10-13T12:00:00.000Z";
const backdate = "2020-02-29T09:15:00.000Z";
function fixture(siteId, kind) {
  const doc = (id, kind) => ({ id, kind, title: id, slug: id === "home" ? "" : id, excerpt: "", status: id === "home" ? "published" : "draft", updatedAt: now, tags: [], seoTitle: "", seoDescription: "", blocks: [{ id: `${id}-date`, type: "post-date", format: "iso", showIcon: false }] });
  const source = testSiteCollection({ format: "acm-test-site", version: 3, siteId, documents: [doc("home", "page"), doc("selected", kind)], categories: [], bin: [], activeDocumentId: "home", homeDocumentId: "home", templates: emptyTemplateStore(), browserImportComplete: true });
  return testSiteVersion({ ...source, globalTemplates: [], publications: source.documents.map(document => ({ document: structuredClone(document) })) },6);
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
    for (const status of ["pending", "draft", "private"]) {
      published = await save(changeLocalSiteStatus(published, "selected", status, published.templates, now));
      assert.equal(published.documents[1].status, status);
      assert.equal(published.publications.some(item => item.document.id === "selected"), false);
      assert.doesNotMatch(await readFile(path.join(root, "dist/index.html"), "utf8"), /data-test-document="selected"/);
      published = await save(changeLocalSiteStatus(published, "selected", "published", published.templates, now));
      assert.equal(published.documents[1].publishedAt, backdate);
    }
  } finally { await store.close(); await rm(root, { recursive: true, force: true }); }
});
test("invalid scheduled dates and future publication dates leave the source unchanged", () => {
  const source = fixture("test", "post"); const before = JSON.stringify(source);
  assert.throws(() => changeLocalSiteStatus(source, "selected", "scheduled", source.templates, now), /future/);

  for (const publishAt of ["invalid", "2027-01-01T00:00:00Z"]) {
    const invalid = structuredClone(source); invalid.documents[1].publishAt = publishAt;
    assert.throws(() => changeLocalSiteStatus(invalid, "selected", "published", invalid.templates, now), publishAt === "invalid" ? /workspace is invalid/ : /past or current/);
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


test("site posts and pages keep status/date controls without duplicate publishing actions", async () => {
  const { DocumentInspector } = await load("app/studio/blocks/inspectors/document-inspector.tsx");
  for (const kind of ["post", "page"]) {
    const document = fixture("test", kind).documents[1]; document.status = "published"; document.publishedAt = backdate;
    const noop = () => {};
    const html = renderToStaticMarkup(createElement(DocumentInspector, { siteContext: true, localPublication: { status: "published", publishedAt: backdate }, panel: "document", document, resolvedDocument: document, categories: [], tagSuggestions: [], pages: [], onCategorySelectionChange: noop, onAddCategory: noop, onChange: noop, onUnpublish: noop, onStatusChange: noop, onDuplicate: noop, onDelete: noop, canDelete: true, canDuplicate: true, allowedStatuses: ["draft", "pending", "private", "scheduled", "published"] }));
    assert.match(html, /inspector-setting-trigger[^>]*aria-haspopup="dialog"[^>]*>Published/);
    assert.match(html, /inspector-setting-trigger[^>]*aria-haspopup="dialog"[^>]*>29 Feb 2020, 09:15/);
    assert.doesNotMatch(html, /Update published|Return to draft|Dates save with the draft/);
    assert.doesNotMatch(html, /password-protection-toggle|sticky-post-toggle/);
  }
});

for (const siteId of ["test", "test2"]) for (const kind of ["post", "page"]) test(`${siteId} ${kind}: scheduled and password snapshots survive owned save, peer merge and reload`, async () => {
  const { createPasswordProtection, verifyPassword } = await load("app/content/password-protection.ts");
  const { createStudioTransaction, applyStudioTransaction } = await load("app/studio/studio-sync.ts");
  const root = await realpath(await mkdtemp(path.join(os.tmpdir(), "studio-scheduled-")));
  const source = fixture(siteId, kind);
  source.documents[1].publishAt = "2027-01-01T00:00:00.000Z";
  source.documents[1].passwordProtection = await createPasswordProtection("fixture-only-password");
  const captured = changeLocalSiteStatus(source, "selected", "scheduled", source.templates, now);
  const transaction = createStudioTransaction(source, captured, { clientId: "peer", transactionId: "schedule", brokerEpoch: "epoch", baseRevision: 0 });
  const applied = applyStudioTransaction(source, transaction);
  assert.equal(applied.conflicts.length, 0);
  const store = createTestSiteStore({ root, siteId, validate: validTestSiteDocument, render: renderTestSite });
  try {
    await mkdir(path.join(root, "content")); await mkdir(path.join(root, "dist"));
    await writeFile(path.join(root, "content/site.json"), JSON.stringify(source));
    await writeFile(path.join(root, "dist/index.html"), renderTestSite(source, revisionOf(source)));
    const session = await store.connect(); await store.handle(session.token, { siteId, action: "claim" });
    await store.handle(session.token, { siteId, action: "save", baseRevision: session.revision, document: applied.snapshot });
    const reloaded = await store.connect();
    const snapshot = reloaded.document.publications.find(item => item.document.id === "selected").document;
    assert.equal(snapshot.status, "scheduled");
    assert.equal(snapshot.publishAt, "2027-01-01T00:00:00.000Z");
    assert.equal(await verifyPassword("fixture-only-password", snapshot.passwordProtection), true);
    assert.equal(await verifyPassword("incorrect", snapshot.passwordProtection), false);
    const html = await readFile(path.join(root, "dist/index.html"), "utf8");
    assert.match(html, /data-test-scheduled-at="2027-01-01T00:00:00.000Z"/);
    assert.match(html, /data-test-locked="true"/);
    assert.match(html, /<template data-test-publication-body="true">/);
    assert.doesNotMatch(html, /fixture-only-password/);
    const privateSource = changeLocalSiteStatus(reloaded.document, "selected", "private", source.templates, now);
    const privateHtml = renderTestSite(privateSource, "revision");
    assert.doesNotMatch(privateHtml, /data-test-document="selected"/);
    const authored = renderTestSite(privateSource, "revision", "selected");
    assert.match(authored, /data-test-document="selected"/);
    assert.doesNotMatch(authored, /data-test-password-form/);
  } finally { await store.close(); await rm(root, { recursive: true, force: true }); }
});

test("all home statuses retain the authored home and v7 permits an unavailable publication", () => {
  const source = fixture("test", "page");
  for (const status of ["draft", "pending", "private"]) {
    const saved = changeLocalSiteStatus(source, "home", status, source.templates, now);
    assert.equal(saved.version, 13);
    assert.equal(validTestSiteDocument(saved), true);
    assert.equal(saved.documents.find(document => document.id === "home").status, status);
    assert.equal(saved.publications.some(item => item.document.id === "home"), false);
    assert.equal(validTestSiteDocument(testSiteVersion(saved, 6)), false, "legacy v6 keeps its required home publication boundary");
    const html = renderTestSite(saved, "revision");
    assert.match(html, /No published home page/);
  }
  const scheduledDraft = changeLocalSiteStatus(source, "home", "scheduled", source.templates, now, false);
  assert.equal(validTestSiteDocument(scheduledDraft), true);
  assert.equal(scheduledDraft.documents[0].publishAt, "2026-10-13T13:00:00.000Z");
  assert.equal(scheduledDraft.publications.some(item => item.document.id === "home"), false);
  const scheduled = changeLocalSiteStatus(scheduledDraft, "home", "scheduled", source.templates, now);
  assert.equal(validTestSiteDocument(scheduled), true);
  assert.equal(scheduled.publications.find(item => item.document.id === "home").document.status, "scheduled");
});

test("legacy seeded snapshots preserve their pre-edit public output when upgraded to v7", async () => {
  const { localSitePublicationSnapshots } = await load("app/studio/test-site/local-publication.ts");
  const source = fixture("test", "post");
  source.publications[1].document.status = "draft";
  assert.match(renderTestSite(source, "revision"), /data-test-document="selected"/);
  const snapshots = localSitePublicationSnapshots(source, source.templates);
  assert.equal(snapshots[1].document.status, "published");
  const upgraded = { ...source, version: 7, publications: snapshots };
  assert.equal(upgraded.documents[1].status, "draft", "authoring state stays unchanged");
  assert.match(renderTestSite(upgraded, "revision"), /data-test-document="selected"/);
  const privateSource = changeLocalSiteStatus(source, "selected", "private", source.templates, now);
  assert.doesNotMatch(renderTestSite(privateSource, "revision"), /data-test-document="selected"/);
});

test("v7 publication validation rejects withdrawn statuses and schedules without a date", () => {
  const source = fixture("test", "post");
  const upgraded = changeLocalSiteStatus(source, "selected", "published", source.templates, now);
  for (const status of ["draft", "pending", "private", "scheduled"]) {
    const invalid = structuredClone(upgraded);
    invalid.publications[1].document.status = status;
    assert.equal(validTestSiteDocument(invalid), false);
  }
});

test("legacy Undo retention keeps v6 seeded captures in their valid reader envelope", () => {
  const source = fixture("test", "post");
  source.publications[1].document.status = "draft";
  const edit = structuredClone(source); edit.documents[1].title = "Edited legacy title";
  const retained = retainLocalPublications(edit, source);
  assert.equal(retained.version, 6);
  assert.equal(validTestSiteDocument(retained), true);
  assert.deepEqual(retained.publications, source.publications);
  assert.deepEqual(Object.keys(retained).sort(), Object.keys(source).sort());
  assert.deepEqual(retained.siteNavigation, source.siteNavigation);
  assert.deepEqual(retained.globalTemplates, source.globalTemplates);
  assert.deepEqual(retained.templates, testSiteCollection(source).templates);
  assert.deepEqual(retained.templates.sets.find(set => set.id === source.siteNavigation.setId).navigation, source.templates.sets.find(set => set.id === source.siteNavigation.setId).navigation);
  assert.equal(retained.documents[1].title, "Edited legacy title");
});

for (const siteId of ["test", "test2"]) test(`${siteId}: Sticky survives peer draft save and reload; only publication capture updates its snapshot`, async () => {
  const { createStudioTransaction, applyStudioTransaction } = await load("app/studio/studio-sync.ts");
  const root = await realpath(await mkdtemp(path.join(os.tmpdir(), "studio-sticky-")));
  const source = changeLocalSiteStatus(fixture(siteId, "post"), "selected", "published", emptyTemplateStore(), now);
  const baselineDocuments = source.documents.map(document => document.id);
  const store = createTestSiteStore({ root, siteId, validate: validTestSiteDocument, render: renderTestSite });
  try {
    await mkdir(path.join(root, "content")); await mkdir(path.join(root, "dist"));
    await writeFile(path.join(root, "content/site.json"), JSON.stringify(source));
    await writeFile(path.join(root, "dist/index.html"), renderTestSite(source, revisionOf(source)));
    const session = await store.connect(); await store.handle(session.token, { siteId, action: "claim" });
    let latest = session;
    for (const sticky of [true, false]) {
      const draft = structuredClone(latest.document);
      draft.documents.find(document => document.id === "selected").sticky = sticky;
      const transaction = createStudioTransaction(latest.document, draft, { clientId: "peer", transactionId: `sticky-${sticky}`, brokerEpoch: "epoch", baseRevision: 0 });
      const applied = applyStudioTransaction(latest.document, transaction);
      assert.equal(applied.conflicts.length, 0);
      const priorPublication = JSON.parse(JSON.stringify(latest.document.publications.find(item => item.document.id === "selected")));
      latest = await store.handle(session.token, { siteId, action: "save", baseRevision: latest.revision, document: applied.snapshot });
      const reloaded = await store.connect();
      assert.equal(reloaded.document.documents.find(document => document.id === "selected").sticky, sticky);
      assert.deepEqual(reloaded.document.publications.find(item => item.document.id === "selected"), priorPublication);
      assert.deepEqual(reloaded.document.documents.map(document => document.id), baselineDocuments);
      assert.deepEqual(reloaded.document.templates, source.templates);
      const captured = changeLocalSiteStatus(reloaded.document, "selected", "published", reloaded.document.templates, now);
      latest = await store.handle(session.token, { siteId, action: "save", baseRevision: latest.revision, document: captured });
      const afterCapture = await store.connect();
      assert.equal(afterCapture.document.publications.find(item => item.document.id === "selected").document.sticky, sticky);
      assert.equal(JSON.parse(await readFile(path.join(root, "content/site.json"), "utf8")).publications.find(item => item.document.id === "selected").document.sticky, sticky);
    }
  } finally { await store.close(); await rm(root, { recursive: true, force: true }); }
});
