import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { loadViteModule } from "./production-module.mjs";

const options = { root: process.cwd(), resolve: { dedupe: ["react", "react-dom"] }, environments: { inline: { resolve: { noExternal: [/^@acm\//] } } }, esbuild: { jsx: "automatic" } };
const [{ module: templates }, { module: navigationView }, { module: globals }, { module: backups }, { module: packages }] = await Promise.all([
  loadViteModule(path.resolve("app/studio/template-model.ts"), options),
  loadViteModule(path.resolve("app/studio/template-navigation-view.tsx"), options),
  loadViteModule(path.resolve("app/studio/global-template-contract.ts"), options),
  loadViteModule(path.resolve("app/studio/backup-store.ts"), options),
  loadViteModule(path.resolve("app/studio/template-package.ts"), options),
]);

const homeLink = { id: "home-link", label: "Home", url: "/", homeLink: true };

test("Navigation Home Link resolves the owning site's current home URL", () => {
  const node = { id: "navigation", type: "element", element: "navigation" };
  const html = renderToStaticMarkup(createElement(navigationView.TemplateNavigationView, {
    node,
    links: [homeLink],
    homeHref: "/pages/current-home",
    documentHref: "/pages/current-home",
  }));
  assert.match(html, /href="\/pages\/current-home"/);
  assert.match(html, /aria-current="page"/);
  assert.match(html, />Home<\/a>/);
});

test("Navigation Home Link is accepted only by the versioned template contract", () => {
  const set = templates.createTemplateSet();
  set.navigation = [homeLink];
  const store = { ...templates.emptyTemplateStore(), sets: [set] };
  assert.equal(templates.validateTemplateStore(store).sets[0].navigation[0].homeLink, true);
  assert.throws(() => templates.validateTemplateStore({ ...store, version: "0.52.0" }), /Home Links require template v0.53.0/);
  assert.throws(() => templates.validateTemplateSnapshot({ version: "0.52.0", set, templateId: set.templates[0].id }), /Home Links require template v0.53.0/);
  assert.equal(packages.validateTemplatePackage({ format: "acm-studio-template-set", version: "0.53.0", set, media: [] }).version, "0.76.0");
  assert.throws(() => packages.validateTemplatePackage({ format: "acm-studio-template-set", version: "0.52.0", set, media: [] }), /Home Links require template v0.53.0/);
  assert.throws(() => globals.validateGlobalTemplateLibrary({ format: "acm-global-templates", version: 23, templates: store, migrations: {} }), /Home Links require global template library v24/);
  assert.throws(() => backups.validateStudioBackup({ format: "acm-studio-backup", version: 18, exportedAt: "2026-10-28T00:00:00.000Z", workspace: {}, templates: store, publications: null, media: { folders: [], assets: [] } }), /Home Links require backup v19/);
  assert.equal(templates.containsNavigationHomeLink(store), true);
  assert.equal(templates.containsNavigationHomeLink({ navigation: [{ id: "fixed", label: "About", url: "/about" }] }), false);
});
