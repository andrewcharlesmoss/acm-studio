import assert from "node:assert/strict";
import test from "node:test";
import { loadProductionModule } from "./production-module.mjs";

const load = path => loadProductionModule(new URL(path, import.meta.url));
const { imageDisplayStyle } = await load("../app/content/image-style.ts");
const { initialStudioWorkspace } = await load("../app/studio/editor-model.ts");
const { migrateStudioWorkspace, validateStudioWorkspace, validatePublicationSnapshot } = await load("../app/studio/workspace-validation.ts");
const { toLocallyPublishedArticle } = await load("../app/content/local-publishing.ts");
const { emptyTemplateStore, createTemplateSet, validateTemplateStore, validateTemplateSnapshot } = await load("../app/studio/template-model.ts");
const { validateTemplatePackage } = await load("../app/studio/template-package.ts");
const { blockClipboardHtml, readBlockClipboardPayload } = await load("../app/studio/block-clipboard.ts");
const { validTestSiteDocument, testSiteCollection } = await load("../app/studio/test-site/contract.ts");
const { validateGlobalTemplateLibrary, createGlobalTemplateLibrary } = await load("../app/studio/global-template-contract.ts");

const values = [["classic", "3 / 2"], ["classic-portrait", "2 / 3"], ["tall", "9 / 16"]];
const image = aspectRatio => ({ id: "image", type: "image", src: "/image.png", alt: "Image", aspectRatio });
const page = { id: "home", kind: "page", title: "Home", slug: "", excerpt: "", status: "published", updatedAt: "2026-10-22T00:00:00.000Z", tags: [], seoTitle: "", seoDescription: "", blocks: [] };
const set = createTemplateSet("Original");
const nav = { ...structuredClone(set), id: "navigation", templates: [], parts: [{ id: "nav", kind: "header", name: "Navigation", nodes: [{ id: "menu", type: "element", element: "navigation" }] }] };
const legacyFixture = { format: "acm-test-site", version: 9, siteId: "test", documents: [page], categories: [], bin: [], activeDocumentId: "home", homeDocumentId: "home", templates: { ...emptyTemplateStore(), sets: [set, nav] }, siteNavigation: { setId: "navigation", partId: "nav" }, browserImportComplete: true, globalTemplates: [], publications: [{ document: page }] };

for (const [ratio, css] of values) {
  test(`${ratio} renders and persists through current envelopes, while older envelopes reject it`, () => {
    const block = image(ratio);
    assert.equal(imageDisplayStyle(block).aspectRatio, css);
    const doc = { ...initialStudioWorkspace.documents.find(item => item.kind === "post"), blocks: [block] };
    const workspace = { ...initialStudioWorkspace, documents: [doc], activeDocumentId: doc.id, bin: [] };
    assert.equal(validateStudioWorkspace(workspace).documents[0].blocks[0].aspectRatio, ratio);
    assert.throws(() => validateStudioWorkspace({ ...workspace, version: 29 }));
    assert.throws(() => migrateStudioWorkspace({ ...workspace, version: 29 }));
    const article = toLocallyPublishedArticle(doc);
    assert.equal(validatePublicationSnapshot({ version: 22, posts: [article] }).posts[0].blocks[0].aspectRatio, ratio);
    assert.throws(() => validatePublicationSnapshot({ version: 21, posts: [article] }));
    const template = structuredClone(set); template.parts[0].nodes = [block];
    const store = { ...emptyTemplateStore(), sets: [template] };
    assert.equal(validateTemplateStore(store).sets[0].parts[0].nodes[0].aspectRatio, ratio);
    assert.throws(() => validateTemplateStore({ ...store, version: "0.33.0" }));
    const html = blockClipboardHtml([block]);
    const encoded = html.match(/data-acm-studio-blocks="([^"]*)"/)[1].replaceAll("&quot;", '"').replaceAll("&lt;", "<").replaceAll("&gt;", ">").replaceAll("&amp;", "&");
    const original = globalThis.DOMParser;
    try {
      globalThis.DOMParser = class { parseFromString() { return { querySelector: () => ({ getAttribute: () => encoded }) }; } };
      assert.equal(readBlockClipboardPayload(html).blocks[0].aspectRatio, ratio);
      const old = JSON.stringify({ ...JSON.parse(encoded), version: 6 });
      globalThis.DOMParser = class { parseFromString() { return { querySelector: () => ({ getAttribute: () => old }) }; } };
      assert.equal(readBlockClipboardPayload(html), null);
    } finally { globalThis.DOMParser = original; }
    const fixture = testSiteCollection(structuredClone(legacyFixture));
    fixture.documents[0].blocks = [block];
    assert.equal(validTestSiteDocument(fixture), true);
    assert.equal(validTestSiteDocument({ ...fixture, version: 12 }), false);
  });
}

test("new ratios are gated in retained workspace and global template recovery data", () => {
  const doc = { ...initialStudioWorkspace.documents.find(item => item.kind === "post"), blocks: [image("tall")] };
  const workspace = { ...initialStudioWorkspace, bin: [{ id: "bin", deletedAt: "2026-10-22T00:00:00Z", document: { ...doc, id: "binned-image", slug: "binned-image" } }] };
  assert.doesNotThrow(() => validateStudioWorkspace(workspace));
  assert.throws(() => validateStudioWorkspace({ ...workspace, version: 29 }));
  const source = testSiteCollection(structuredClone(legacyFixture));
  const library = createGlobalTemplateLibrary({ test: source, test2: { ...source, siteId: "test2" } });
  const changed = structuredClone(library); changed.migrations.test.bases[0].parts[0].nodes = [image("classic")];
  assert.doesNotThrow(() => validateGlobalTemplateLibrary(changed));
  assert.throws(() => validateGlobalTemplateLibrary({ ...changed, version: 4 }));
});

test("typed legacy template recovery overrides respect ratio version gates", () => {
  const source = testSiteCollection(structuredClone(legacyFixture));
  const library = createGlobalTemplateLibrary({ test: source, test2: { ...source, siteId: "test2" } });
  const path = ["templates", "@page", "nodes", "@image", "aspectRatio"];
  for (const overrides of [
    [{ path: [...path.slice(0, -1), "type"], value: "image" }, { path, value: "tall" }],
    [{ path: [...path.slice(0, -1), "element"], value: "cover-image" }, { path: path.slice(0, -1), value: { aspectRatio: "classic" } }],
    [{ path: path.slice(0, -2), order: ["added"], removed: [], added: [{ ...image("classic-portrait"), id: "added" }] }],
  ]) {
    const binding = { setId: set.id, globalSetId: set.id, ids: {}, overrides };
    const fixture = { ...source, globalTemplates: [binding] };
    assert.equal(validTestSiteDocument(fixture), true);
    assert.equal(validTestSiteDocument({ ...fixture, version: 12 }), false);
    const changed = structuredClone(library); changed.migrations.test.bindings[0].overrides = overrides;
    assert.throws(() => validateGlobalTemplateLibrary(changed), /Unsupported template binding/);
    assert.throws(() => validateGlobalTemplateLibrary({ ...changed, version: 4 }), /aspect ratios require global template library v5/);
  }
  const oldValue = { ...source, globalTemplates: [{ setId: set.id, globalSetId: set.id, ids: {}, overrides: [{ path, value: "wide" }] }] };
  assert.equal(validTestSiteDocument({ ...oldValue, version: 12 }), true);
  for (const overrides of [
    [{ path, value: "tall" }],
    [{ path: [...path.slice(0, -1), "type"], value: "group" }, { path, value: "classic" }],
    [{ path: path.slice(0, -1), value: { unrelated: { aspectRatio: "classic-portrait" } } }],
  ]) {
    const retained = { ...source, version: 12, globalTemplates: [{ setId: set.id, globalSetId: set.id, ids: {}, overrides }] };
    assert.equal(validTestSiteDocument(retained), true);
    assert.deepEqual(testSiteCollection(retained).globalTemplates[0].overrides, overrides);
  }
});

test("Featured Image ratios survive template packages and snapshots and respect old version gates", () => {
  const featured = { id: "featured", type: "element", element: "cover-image", aspectRatio: "classic-portrait" };
  const template = structuredClone(set);
  const pageTemplate = template.templates.find(item => item.kind === "page");
  pageTemplate.nodes = [featured, { id: "slot", type: "element", element: "content" }];
  const snapshot = { version: "0.34.0", set: template, templateId: pageTemplate.id };
  assert.equal(validateTemplateSnapshot(snapshot).set.templates.find(item => item.id === pageTemplate.id).nodes[0].aspectRatio, "classic-portrait");
  assert.throws(() => validateTemplateSnapshot({ ...snapshot, version: "0.33.0" }));
  const pkg = { format: "acm-studio-template-set", version: "0.34.0", set: template, media: [] };
  assert.equal(validateTemplatePackage(pkg).set.templates.find(item => item.id === pageTemplate.id).nodes[0].aspectRatio, "classic-portrait");
  assert.throws(() => validateTemplatePackage({ ...pkg, version: "0.33.0" }));
});
