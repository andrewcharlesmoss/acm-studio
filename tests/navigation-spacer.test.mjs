import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { loadViteModule } from "./production-module.mjs";

const options = { root: process.cwd(), resolve: { dedupe: ["react", "react-dom"] }, environments: { inline: { resolve: { noExternal: [/^@acm\//] } } }, esbuild: { jsx: "automatic" } };
const [{ module: templates }, { module: navView }, { module: navItems }, { module: globals }, { module: backups }, { module: packages }, { module: fixtures }, { module: editorModel }] = await Promise.all([
  loadViteModule(path.resolve("app/studio/template-model.ts"), options),
  loadViteModule(path.resolve("app/studio/template-navigation-view.tsx"), options),
  loadViteModule(path.resolve("app/studio/navigation-items.ts"), options),
  loadViteModule(path.resolve("app/studio/global-template-contract.ts"), options),
  loadViteModule(path.resolve("app/studio/backup-store.ts"), options),
  loadViteModule(path.resolve("app/studio/template-package.ts"), options),
  loadViteModule(path.resolve("app/studio/test-site/contract.ts"), options),
  loadViteModule(path.resolve("app/studio/editor-model.ts"), options),
]);
const spacer = { id: "gap", type: "spacer", width: 32, height: 48 };
const link = { id: "home", label: "Home", url: "/" };

test("Navigation Spacer is a typed inert menu child rendered without an anchor", () => {
  const html = renderToStaticMarkup(createElement(navView.TemplateNavigationView, { node: { id: "nav", type: "element", element: "navigation" }, links: [link, spacer] }));
  assert.match(html, /class="template-navigation-spacer-item"[^>]*aria-hidden="true"/);
  assert.match(html, /class="template-navigation-spacer" style="width:32px;height:48px;flex:0 0 auto"/);
  assert.match(html, /<li class="template-navigation-spacer-item"[^>]*aria-hidden="true"><span class="template-navigation-spacer"[^>]*><\/span><\/li>/);
  const spacerItem = html.match(/<li class="template-navigation-spacer-item"[^>]*>[\s\S]*?<\/li>/)?.[0] ?? "";
  assert.doesNotMatch(spacerItem, /<a\b/);
});

test("Navigation Spacer inserts, moves, reorders, duplicates through menu helpers and removes cleanly", () => {
  let items = navItems.insertNavigationItem([link], spacer);
  assert.deepEqual(items.map(item => item.id), ["home", "gap"]);
  items = navItems.moveNavigationItem(items, "gap", -1);
  assert.equal(items[0].id, "gap");
  items = navItems.insertNavigationItem(items, { ...spacer, id: "gap-copy" }, undefined, "gap");
  assert.deepEqual(navItems.reorderNavigationItem(items, "gap-copy", "home", "after").map(item => item.id), ["gap", "home", "gap-copy"]);
  items = navItems.removeNavigationItem(items, "gap-copy");
  assert.deepEqual(items.map(item => item.id), ["gap", "home"]);
});

test("Navigation Spacer dimensions and template version gates reject invalid and legacy data", () => {
  const set = templates.createTemplateSet();
  set.navigation = [spacer];
  const store = { ...templates.emptyTemplateStore(), sets: [set] };
  assert.equal(templates.validateTemplateStore(store).version, templates.TEMPLATE_VERSION);
  assert.throws(() => templates.validateTemplateStore({ ...store, version: "0.53.0" }), /spacers require template v0.54.0/);
  assert.throws(() => templates.validateTemplateSet({ ...set, navigation: [{ ...spacer, width: -1 }] }), /bounded pixel dimensions/);
  assert.throws(() => templates.validateTemplateSnapshot({ version: "0.53.0", set, templateId: set.templates[0].id }), /spacers require template v0.54.0/);
  assert.throws(() => packages.validateTemplatePackage({ format: "acm-studio-template-set", version: "0.53.0", set, media: [] }), /spacers require template v0.54.0/);
  assert.throws(() => globals.validateGlobalTemplateLibrary({ format: "acm-global-templates", version: 24, templates: store, migrations: {} }), /spacers require global template library v25/);
  assert.throws(() => backups.validateStudioBackup({ format: "acm-studio-backup", version: 19, exportedAt: "2026-10-28T00:00:00.000Z", workspace: {}, templates: store, publications: null, media: { folders: [], assets: [] } }), /spacers require backup v20/);
});

test("Test and Test2 source serialisation preserves Navigation Spacer from v32", () => {
  const page = { id: "test-site", kind: "page", title: "Home", slug: "", excerpt: "", status: "draft", updatedAt: "2026-10-28T00:00:00.000Z", tags: [], seoTitle: "", seoDescription: "", blocks: [{ id: "body", type: "paragraph", text: "Body" }] };
  const legacy = { format: "acm-test-site", version: 2, siteId: "test", document: page };
  const browserPage = { ...page, id: "browser-home", slug: "browser-home" };
  const workspace = { ...editorModel.initialStudioWorkspace, version: 24, activeDocumentId: browserPage.id, documents: [browserPage], categories: [], bin: [] };
  const source = fixtures.importBrowserTestContent(legacy, workspace, templates.emptyTemplateStore());
  source.navigationMenus[0].links = [spacer];
  assert.equal(source.version, 55);
  assert.equal(fixtures.validTestSiteDocument(source), true);
  assert.equal(fixtures.validTestSiteDocument({ ...source, version: 31 }), false);
  assert.deepEqual(fixtures.testSiteCollection(source).navigationMenus[0].links, [spacer]);
});
