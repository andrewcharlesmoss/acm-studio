import { testSiteVersion } from "./test-site-fixture.mjs";
import assert from "node:assert/strict";
import test from "node:test";
import path from "node:path";
import { loadViteModule } from "./production-module.mjs";

const options = { root: process.cwd(), resolve: { dedupe: ["react", "react-dom"] }, environments: { inline: { resolve: { noExternal: [/^@acm\//] } } }, esbuild: { jsx: "automatic" } };
const [{ module: validation }, { module: contract }, { module: revisions }] = await Promise.all([
  loadViteModule(path.resolve("app/studio/workspace-validation.ts"), options),
  loadViteModule(path.resolve("app/studio/test-site/contract.ts"), options),
  loadViteModule(path.resolve("app/studio/document-revisions.ts"), options),
]);

const page = (id = "page-one", extra = {}) => ({ id, kind: "page", title: id, slug: id, excerpt: "", status: "draft", updatedAt: "2026-10-25T00:00:00.000Z", tags: [], seoTitle: "", seoDescription: "", blocks: [], ...extra });

test("pageOrder is accepted only on v29 pages and v28 workspaces upgrade without inventing an order", () => {
  const previous = { version: 28, activeDocumentId: "page-one", documents: [page()], categories: [], bin: [] };
  assert.equal(validation.migrateStudioWorkspace(previous).version, 33);
  assert.equal(Object.hasOwn(validation.migrateStudioWorkspace(previous).documents[0], "pageOrder"), false);
  assert.equal(validation.validateStudioWorkspace({ ...previous, version: 29, documents: [page("page-one", { pageOrder: -2147483648 })] }).documents[0].pageOrder, -2147483648);
  for (const invalid of [
    { version: 28, documents: [page("page-one", { pageOrder: 1 })] },
    { version: 29, documents: [page("page-one", { pageOrder: 2147483648 })] },
    { version: 29, documents: [page("page-one", { pageOrder: 1.5 })] },
    { version: 29, documents: [{ ...page("post-one"), kind: "post", pageOrder: 1 }] },
  ]) assert.throws(() => validation.validateStudioWorkspace({ activeDocumentId: invalid.documents[0].id, categories: [], bin: [], ...invalid }));
});

test("fixture v10 stays compatible and an owned pageOrder edit upgrades to the current version", () => {
  const source = contract.testSiteCollection({ format: "acm-test-site", version: 2, siteId: "test", document: page("test-site") });
  const legacy = testSiteVersion({ ...source, globalTemplates: [], publications: [] },10);
  assert.equal(contract.validTestSiteDocument(legacy), true);
  assert.equal(contract.validTestSiteDocument({ ...legacy, documents: legacy.documents.map(item => ({ ...item, pageOrder: 3 })) }), false);
  const updated = contract.testDocumentFromEditor({ ...legacy.documents[0], pageOrder: -12 }, legacy);
  assert.equal(updated.version, 16);
  assert.equal(contract.validTestSiteDocument(updated), true);
  assert.equal(contract.testSiteCollection(updated).documents[0].pageOrder, -12);
});

test("revision restoration retains the current structural page order", () => {
  const current = page("page-one", { title: "Current title", pageOrder: 7 });
  const saved = page("page-one", { title: "Earlier title" });
  const restored = revisions.restoreDocumentRevision(current, saved);
  assert.equal(restored.title, "Earlier title");
  assert.equal(restored.pageOrder, 7);
});
