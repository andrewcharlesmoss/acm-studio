import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { loadViteModule } from "./production-module.mjs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

const options = { root: process.cwd(), resolve: { dedupe: ["react", "react-dom"] }, environments: { inline: { resolve: { noExternal: [/^@acm\//] } } }, esbuild: { jsx: "automatic" } };
const [{ module: pageList }, { module: templates }, { module: packages }, { module: globals }, { module: backups }, { module: editor }, { module: localPublishing }, { module: navigationSearch }, { module: navigationItems }] = await Promise.all([
  loadViteModule(path.resolve("app/studio/navigation-page-list.ts"), options),
  loadViteModule(path.resolve("app/studio/template-model.ts"), options),
  loadViteModule(path.resolve("app/studio/template-package.ts"), options),
  loadViteModule(path.resolve("app/studio/global-template-contract.ts"), options),
  loadViteModule(path.resolve("app/studio/backup-store.ts"), options),
  loadViteModule(path.resolve("app/studio/editor-model.ts"), options),
  loadViteModule(path.resolve("app/content/local-publishing.ts"), options),
  loadViteModule(path.resolve("app/studio/navigation-search.ts"), options),
  loadViteModule(path.resolve("app/studio/navigation-items.ts"), options),
]);
const { module: navigationView } = await loadViteModule(path.resolve("app/studio/template-navigation-view.tsx"), options);

test("Navigation Page List follows page hierarchy and excludes posts", () => {
  const documents = [
    { id: "home", kind: "page", title: "Home" },
    { id: "about", kind: "page", title: "About", parentPageId: "home" },
    { id: "team", kind: "page", title: "Team", parentPageId: "about" },
    { id: "news", kind: "post", title: "News" },
  ];
  const links = pageList.navigationPageListLinks(documents, document => `/${document.id}`);
  assert.deepEqual(links.map(link => [link.id, link.label, link.url]), [["page-list-home", "Home", "/home"]]);
  assert.deepEqual(links[0].children.map(link => [link.label, link.url]), [["About", "/about"]]);
  assert.deepEqual(links[0].children[0].children.map(link => link.label), ["Team"]);
});

test("Navigation Search indexes available local publications and excludes protected or future scheduled content", () => {
  const entries = localPublishing.localPublicationSearchEntries([
    { kind: "page", slug: "about-us", title: "About us", summary: "Our work", blocks: [{ type: "paragraph", text: "A public history of gardens." }, { type: "paragraph", text: "Hidden private phrase", editorial: { hidden: true } }] },
    { kind: "post", slug: "scheduled", title: "Future garden", summary: "", scheduledAt: "2026-10-29T00:00:00.000Z", blocks: [] },
    { kind: "post", slug: "protected", title: "Private garden", summary: "", passwordProtection: { salt: "salt", hash: "hash" }, blocks: [] },
    { kind: "post", slug: "due-now", title: "Due garden", summary: "", scheduledAt: "2026-10-28T00:00:00.000Z", blocks: [{ type: "paragraph", text: "Ready to read." }] },
  ], Date.parse("2026-10-28T00:00:00.000Z"));
  assert.deepEqual(entries.map(entry => [entry.title, entry.href]), [["About us", "/pages/about-us"], ["Due garden", "/writing/due-now"]]);
  assert.match(entries[0].text, /public history of gardens/i);
  assert.doesNotMatch(entries[0].text, /hidden private phrase/i);
  assert.match(entries[1].text, /Ready to read/);
  assert.doesNotMatch(JSON.stringify(entries), /protected|Future garden/);
  assert.deepEqual(localPublishing.localPublicationSearchEntries([
    { kind: "post", slug: "scheduled", title: "Future garden", summary: "", scheduledAt: "2026-10-29T00:00:00.000Z", blocks: [] },
  ], Date.parse("2026-10-29T00:00:00.000Z")).map(entry => entry.title), ["Future garden"]);
  const searchable = localPublishing.searchableContentText([
    { type: "code", code: "const garden = true;" },
    { type: "button", label: "Visit the garden", url: "/garden", style: "primary" },
    { type: "field", control: "text", label: "Garden name", value: "Rose garden" },
    { type: "paragraph", text: "Private hidden text", editorial: { hidden: true } },
  ]);
  assert.match(searchable, /const garden = true/);
  assert.match(searchable, /Visit the garden/);
  assert.match(searchable, /Garden name Rose garden/);
  assert.doesNotMatch(searchable, /Private hidden text/);
});

test("fixture Navigation Search stays scoped to its selected site's publication state", () => {
  const documents = [
    { id: "draft", kind: "page", title: "Draft Garden", excerpt: "Unpublished garden", status: "draft", blocks: [{ type: "paragraph", text: "Only in this draft." }] },
    { id: "published", kind: "post", title: "Published Garden", excerpt: "Local site garden", status: "published", blocks: [{ type: "paragraph", text: "Visible garden article." }] },
    { id: "locked", kind: "post", title: "Locked Garden", excerpt: "Private", status: "published", passwordProtection: { salt: "salt", hash: "hash" }, blocks: [] },
  ];
  const href = document => `/fixture/${document.id}`;
  const preview = navigationSearch.fixtureNavigationSearchEntries(documents, href, { includeDrafts: true });
  assert.deepEqual(preview.map(entry => [entry.title, entry.href]), [["Draft Garden", "/fixture/draft"], ["Published Garden", "/fixture/published"]]);
  assert.match(preview[0].text, /Only in this draft/);
  assert.doesNotMatch(JSON.stringify(preview), /Locked Garden/);
  const output = navigationSearch.fixtureNavigationSearchEntries(documents, href, { includeDrafts: false });
  assert.deepEqual(output.map(entry => entry.title), ["Published Garden"]);
});

test("editing a Navigation Page List materializes it as links at its saved root position", () => {
  const menu = [{ id: "before", label: "Before", url: "/before" }, { id: "after", label: "After", url: "/after" }];
  const pages = [
    { id: "page-list-about", label: "About", url: "/about", children: [{ id: "page-list-team", label: "Team", url: "/team" }] },
  ];
  const next = pageList.materializeNavigationPageList(menu, pages, 1);
  assert.ok(next);
  assert.deepEqual(next.map(link => link.label), ["Before", "About", "After"]);
  assert.notEqual(next[1].id, "page-list-about");
  assert.notEqual(next[1].children[0].id, "page-list-team");
  assert.deepEqual(next[1].children.map(link => [link.label, link.url]), [["Team", "/team"]]);
  assert.deepEqual(menu.map(link => link.label), ["Before", "After"], "the source menu remains unchanged");
});

test("Page List conversion refuses menu capacity and excessive page depth", () => {
  const fullMenu = Array.from({ length: 100 }, (_, index) => ({ id: `link-${index}`, label: `Link ${index}`, url: `/${index}` }));
  assert.equal(pageList.materializeNavigationPageList(fullMenu, [{ id: "page", label: "Page", url: "/page" }], 100), null);
  let deep = { id: "page-list-6", label: "Level 6", url: "/6" };
  for (let level = 5; level >= 0; level--) deep = { id: `page-list-${level}`, label: `Level ${level}`, url: `/${level}`, children: [deep] };
  assert.equal(pageList.materializeNavigationPageList([], [deep], 0), null);
});

test("Home Link is a fixed destination item that can be inserted into a submenu", () => {
  const menu = [{ id: "submenu", label: "More", url: "#", children: [] }];
  const home = { id: "home-link", label: "Home", url: "/", homeLink: true };
  const next = navigationItems.insertNavigationItem(menu, home, "submenu");
  assert.deepEqual(next[0].children, [home]);
  assert.equal(navigationItems.navigationEntries(next).find(entry => entry.link.id === home.id).depth, 1);
});

test("automatic Navigation Page List requires template v0.46.0", () => {
  const set = templates.createTemplateSet();
  set.parts[0].nodes = [{ id: "navigation-page-list", type: "element", element: "navigation", automaticPageList: true, automaticPageListPosition: 1 }];
  const store = { ...templates.emptyTemplateStore(), version: "0.46.0", sets: [set] };
  const snapshot = { version: "0.46.0", set, templateId: set.templates[0].id };
  const packageValue = { format: "acm-studio-template-set", version: "0.46.0", set, media: [] };

  assert.equal(templates.validateTemplateStore(store).version, templates.TEMPLATE_VERSION);
  const node = set.parts[0].nodes[0];
  const projected = templates.templateEditorBlocks([node])[0];
  assert.equal(projected.data.automaticPageListPosition, 1);
  assert.equal(templates.templateNodesFromBlocks([projected], [node])[0].automaticPageListPosition, 1);
  assert.throws(() => templates.validateTemplateStore({ ...store, sets: [{ ...set, parts: [{ ...set.parts[0], nodes: [{ ...node, automaticPageListPosition: 101 }] }] }] }), /Navigation settings are invalid/);
  assert.throws(() => templates.validateTemplateStore({ ...store, sets: [{ ...set, parts: [{ ...set.parts[0], nodes: [{ ...node, automaticPageList: undefined }] }] }] }), /Navigation settings are invalid/);
  assert.equal(templates.validateTemplateSnapshot(snapshot).version, templates.TEMPLATE_VERSION);
  assert.equal(packages.validateTemplatePackage(packageValue).version, templates.TEMPLATE_VERSION);
  assert.throws(() => templates.validateTemplateStore({ ...store, version: "0.45.0" }), /Automatic Navigation Page Lists require template v0\.46\.0/);
  assert.throws(() => templates.validateTemplateSnapshot({ ...snapshot, version: "0.45.0" }), /Automatic Navigation Page Lists require template v0\.46\.0/);
  assert.throws(() => packages.validateTemplatePackage({ ...packageValue, version: "0.45.0" }), /Automatic Navigation Page Lists require template v0\.46\.0/);

  const libraryStore = { ...templates.emptyTemplateStore(), version: "0.46.0", sets: [set] };
  const library = { format: "acm-global-templates", version: 17, templates: libraryStore,
    header: { setId: set.id, partId: set.parts[0].id },
    migrations: { test: { bindings: [], bases: [] }, test2: { bindings: [], bases: [] } } };
  assert.equal(globals.validateGlobalTemplateLibrary(library).version, 24);
  assert.throws(() => globals.validateGlobalTemplateLibrary({ ...library, version: 16 }), /Automatic Navigation Page Lists require global template library v17/);

  const backup = { format: "acm-studio-backup", version: 12, exportedAt: "2026-10-28T00:00:00.000Z",
    workspace: editor.initialStudioWorkspace, templates: store, publications: null, media: { folders: [], assets: [] } };
  assert.equal(backups.validateStudioBackup(backup).version, 12);
  assert.throws(() => backups.validateStudioBackup({ ...backup, version: 11 }), /Automatic Navigation Page Lists require backup v12/);
});

test("Navigation Search requires template, package, global library and backup v0.47.0", () => {
  const set = templates.createTemplateSet();
  const node = { id: "navigation-search", type: "element", element: "navigation", searchEnabled: true, searchPosition: 1, searchButtonUseIcon: true, searchLabelVisible: false, searchButtonPosition: "inside", searchPlaceholder: "Find a page", searchWidth: 75 };
  set.parts[0].nodes = [node];
  const store = { ...templates.emptyTemplateStore(), version: "0.47.0", sets: [set] };
  const snapshot = { version: "0.47.0", set, templateId: set.templates[0].id };
  const packageValue = { format: "acm-studio-template-set", version: "0.47.0", set, media: [] };
  assert.equal(templates.validateTemplateStore(store).version, templates.TEMPLATE_VERSION);
  assert.equal(templates.validateTemplateSnapshot(snapshot).version, templates.TEMPLATE_VERSION);
  assert.equal(packages.validateTemplatePackage(packageValue).version, templates.TEMPLATE_VERSION);
  const block = templates.templateEditorBlocks([node])[0];
  assert.equal(block.data.searchEnabled, true);
  assert.equal(block.data.searchPosition, 1);
  assert.equal(block.data.searchButtonUseIcon, true);
  assert.equal(block.data.searchLabelVisible, false);
  assert.equal(block.data.searchButtonPosition, "inside");
  assert.equal(block.data.searchPlaceholder, "Find a page");
  assert.equal(block.data.searchWidth, 75);
  const roundTrip = templates.templateNodesFromBlocks([block], [node])[0];
  assert.equal(roundTrip.searchEnabled, true);
  assert.equal(roundTrip.searchPosition, 1);
  assert.equal(roundTrip.searchButtonUseIcon, true);
  assert.equal(roundTrip.searchLabelVisible, false);
  assert.equal(roundTrip.searchButtonPosition, "inside");
  assert.equal(roundTrip.searchPlaceholder, "Find a page");
  assert.equal(roundTrip.searchWidth, 75);
  assert.throws(() => templates.validateTemplateStore({ ...store, version: "0.46.0" }), /Navigation Search requires template v0\.47\.0/);
  assert.throws(() => templates.validateTemplateSnapshot({ ...snapshot, version: "0.46.0" }), /Navigation Search requires template v0\.47\.0/);
  assert.throws(() => packages.validateTemplatePackage({ ...packageValue, version: "0.46.0" }), /Navigation Search requires template v0\.47\.0/);
  assert.throws(() => templates.validateTemplateStore({ ...store, sets: [{ ...set, parts: [{ ...set.parts[0], nodes: [{ ...node, searchPosition: 101 }] }] }] }), /Navigation settings are invalid/);
  assert.throws(() => templates.validateTemplateStore({ ...store, sets: [{ ...set, parts: [{ ...set.parts[0], nodes: [{ ...node, searchEnabled: false }] }] }] }), /Navigation settings are invalid/);
  assert.throws(() => templates.validateTemplateStore({ ...store, sets: [{ ...set, parts: [{ ...set.parts[0], nodes: [{ ...node, searchWidth: 101 }] }] }] }), /Navigation settings are invalid/);

  const library = { format: "acm-global-templates", version: 18, templates: store,
    header: { setId: set.id, partId: set.parts[0].id },
    migrations: { test: { bindings: [], bases: [] }, test2: { bindings: [], bases: [] } } };
  assert.equal(globals.validateGlobalTemplateLibrary(library).version, 24);
  assert.throws(() => globals.validateGlobalTemplateLibrary({ ...library, version: 17 }), /Navigation Search requires global template library v18/);

  const backup = { format: "acm-studio-backup", version: 13, exportedAt: "2026-10-28T00:00:00.000Z",
    workspace: editor.initialStudioWorkspace, templates: store, publications: null, media: { folders: [], assets: [] } };
  assert.equal(backups.validateStudioBackup(backup).version, 13);
  assert.throws(() => backups.validateStudioBackup({ ...backup, version: 12 }), /Navigation Search requires backup v13/);
});

test("Navigation Search styles persist independently and are gated by their containing contracts", () => {
  const set = templates.createTemplateSet();
  const searchStyle = { anchor: "search-target", className: "custom-search", additionalCss: "outline-color: #123456;", textColor: "#123456", backgroundColor: "#f0f0f0", padding: "12px", borderStyle: "solid", borderColor: "#334455", borderWidth: "2px", borderRadius: "6px", minHeight: "40px" };
  const node = { id: "navigation-search-style", type: "element", element: "navigation", searchEnabled: true, searchVisualStyle: searchStyle };
  set.parts[0].nodes = [node];
  const store = { ...templates.emptyTemplateStore(), sets: [set] };
  const snapshot = { version: templates.TEMPLATE_VERSION, set, templateId: set.templates[0].id };
  const packageValue = { format: "acm-studio-template-set", version: templates.TEMPLATE_VERSION, set, media: [] };

  assert.deepEqual(templates.validateTemplateStore(store).sets[0].parts[0].nodes[0].searchVisualStyle, searchStyle);
  assert.deepEqual(templates.validateTemplateSnapshot(snapshot).set.parts[0].nodes[0].searchVisualStyle, searchStyle);
  assert.deepEqual(packages.validateTemplatePackage(packageValue).set.parts[0].nodes[0].searchVisualStyle, searchStyle);

  const block = templates.templateEditorBlocks([node])[0];
  assert.deepEqual(block.searchVisualStyle, searchStyle);
  const roundTrip = templates.templateNodesFromBlocks([block], [node])[0];
  assert.deepEqual(roundTrip.searchVisualStyle, searchStyle);

  const outside = navigationSearch.navigationSearchStyleTargets(searchStyle, "outside");
  assert.equal(outside.rootStyle.padding, "12px");
  assert.equal(outside.rootStyle.outlineColor, undefined);
  assert.equal(outside.labelStyle.textColor, undefined);
  assert.equal(outside.fieldStyle.borderColor, "#334455");
  assert.equal(outside.fieldStyle.backgroundColor, undefined);
  assert.equal(outside.buttonStyle.backgroundColor, "#f0f0f0");
  assert.equal(outside.wrapperStyle.minHeight, "40px");
  assert.equal(outside.wrapperStyle.borderStyle, undefined);
  const inside = navigationSearch.navigationSearchStyleTargets(searchStyle, "inside");
  assert.equal(inside.wrapperStyle.borderColor, "#334455");
  assert.equal(inside.fieldStyle.borderColor, undefined);
  assert.equal(inside.buttonStyle.borderColor, undefined);
  const noButton = navigationSearch.navigationSearchStyleTargets(searchStyle, "no-button");
  assert.equal(noButton.fieldStyle.textColor, "#123456");
  assert.equal(noButton.fieldStyle.backgroundColor, "#f0f0f0");
  assert.equal(noButton.buttonStyle.backgroundColor, "#f0f0f0");

  const html = renderToStaticMarkup(createElement(navigationView.TemplateNavigationView, { node, links: [] }));
  assert.match(html, /id="search-target" class="template-navigation-search-item custom-search" style="padding:12px;outline-color:#123456"/);
  assert.match(html, /<label[^>]*><span>Search<\/span><\/label><div class="template-navigation-search-inside-wrapper" style="min-height:40px"><input[^>]*style="border-style:solid;border-width:2px;border-color:#334455;border-radius:6px;width:var\(--navigation-search-width, 100%\)"/);
  assert.match(html, /<button[^>]*style="color:#123456;background-color:#f0f0f0;border-style:solid;border-width:2px;border-color:#334455;border-radius:6px"/);
  assert.match(html, /<input[^>]*border-style:solid;border-width:2px;border-color:#334455;border-radius:6px/);
  assert.equal((html.match(/id="search-target"/g) ?? []).length, 1, "The Advanced anchor is applied once even though the Search preview is also represented in the hidden overlay menu.");
  const insideHtml = renderToStaticMarkup(createElement(navigationView.TemplateNavigationView, { node: { ...node, searchButtonPosition: "inside" }, links: [] }));
  assert.match(insideHtml, /class="template-navigation-search-inside-wrapper" style="min-height:40px;border-style:solid;border-width:2px;border-color:#334455;border-radius:6px"/);
  assert.match(insideHtml, /<input[^>]*style="width:var\(--navigation-search-width, 100%\)"/);
  const noButtonHtml = renderToStaticMarkup(createElement(navigationView.TemplateNavigationView, { node: { ...node, searchButtonPosition: "no-button" }, links: [] }));
  assert.match(noButtonHtml, /<input[^>]*style="color:#123456;background-color:#f0f0f0;border-style:solid;border-width:2px;border-color:#334455;border-radius:6px;width:var\(--navigation-search-width, 100%\)"/);

  assert.throws(() => templates.validateTemplateStore({ ...store, version: "0.47.0" }), /Navigation Search styles require template v0\.48\.0/);
  assert.throws(() => templates.validateTemplateSnapshot({ ...snapshot, version: "0.47.0" }), /Navigation Search styles require template v0\.48\.0/);
  assert.throws(() => packages.validateTemplatePackage({ ...packageValue, version: "0.47.0" }), /Navigation Search styles require template v0\.48\.0/);
  assert.throws(() => globals.validateGlobalTemplateLibrary({ format: "acm-global-templates", version: 18,
    templates: store, header: { setId: set.id, partId: set.parts[0].id },
    migrations: { test: { bindings: [], bases: [] }, test2: { bindings: [], bases: [] } } }), /Navigation Search styles require global template library v19/);

  const backup = { format: "acm-studio-backup", version: 14, exportedAt: "2026-10-28T00:00:00.000Z",
    workspace: editor.initialStudioWorkspace, templates: store, publications: null, media: { folders: [], assets: [] } };
  assert.equal(backups.validateStudioBackup(backup).version, 14);
  assert.throws(() => backups.validateStudioBackup({ ...backup, version: 13 }), /Navigation Search styles require backup v14/);
});

test("Navigation renders the automatic Page List inside the root menu list", () => {
  const html = renderToStaticMarkup(createElement(navigationView.TemplateNavigationView, {
    node: { id: "navigation", type: "element", element: "navigation", automaticPageList: true },
    links: [{ id: "about", label: "About", url: "/about" }],
    pageListLinks: [{ id: "page-list-home", label: "Home", url: "/" }, { id: "page-list-child", label: "Child", url: "/child" }],
  }));
  assert.match(html, /<ul class="template-navigation-items"><li[^>]*>.*?About.*?<\/li><li class="template-navigation-page-list" data-navigation-page-list(?:="true")?><ul class="template-navigation-items template-navigation-page-list-items">/);
  assert.match(html, /href="\/child">Child<\/a>/);
});

test("Navigation renders the automatic Page List at its saved position between links", () => {
  const html = renderToStaticMarkup(createElement(navigationView.TemplateNavigationView, {
    node: { id: "navigation", type: "element", element: "navigation", automaticPageList: true, automaticPageListPosition: 1 },
    links: [{ id: "home", label: "Home", url: "/" }, { id: "about", label: "About", url: "/about" }],
    pageListLinks: [{ id: "page-list-help", label: "Help", url: "/help" }],
  }));
  const home = html.indexOf(">Home</a>");
  const pageList = html.indexOf("data-navigation-page-list");
  const about = html.indexOf(">About</a>");
  assert.ok(home >= 0 && home < pageList && pageList < about, "Page List should render between its neighbouring links");
});

test("Navigation Search renders inside the menu at its saved position", () => {
  const html = renderToStaticMarkup(createElement(navigationView.TemplateNavigationView, {
    node: { id: "navigation", type: "element", element: "navigation", searchEnabled: true, searchPosition: 1 },
    links: [{ id: "home", label: "Home", url: "/" }, { id: "about", label: "About", url: "/about" }],
  }));
  const home = html.indexOf(">Home</a>");
  const search = html.indexOf("data-navigation-search");
  const about = html.indexOf(">About</a>");
  assert.ok(home >= 0 && home < search && search < about, "Search should render between its neighbouring menu links");
  assert.match(html, /type="search"[^>]*name="s"|name="s"[^>]*type="search"/);
  assert.match(html, /aria-label="Search"/);
  assert.match(html, />Search<\/button>/, "the default button should use text, as in Gutenberg");
  const iconHtml = renderToStaticMarkup(createElement(navigationView.TemplateNavigationView, {
    node: { id: "navigation-icon-search", type: "element", element: "navigation", searchEnabled: true, searchButtonUseIcon: true },
    links: [],
  }));
  assert.doesNotMatch(iconHtml, />Search<\/button>/);
  assert.match(iconHtml, /data-icon="true"/);
});

test("Navigation Search renders its button position, label, placeholder and width settings", () => {
  const html = renderToStaticMarkup(createElement(navigationView.TemplateNavigationView, {
    node: { id: "navigation-search-options", type: "element", element: "navigation", searchEnabled: true, searchLabelVisible: false, searchButtonPosition: "inside", searchPlaceholder: "Find a page", searchWidth: 75 },
    links: [],
  }));
  assert.match(html, /data-button-position="inside"/);
  assert.match(html, /class="visually-hidden">Search<\/span>/);
  assert.match(html, /placeholder="Find a page"/);
  assert.match(html, /--navigation-search-width:75%/);
  const buttonOnly = renderToStaticMarkup(createElement(navigationView.TemplateNavigationView, {
    node: { id: "navigation-search-button-only", type: "element", element: "navigation", searchEnabled: true, searchButtonPosition: "button-only" },
    links: [],
  }));
  assert.match(buttonOnly, /data-navigation-search-reveal="true"/);
  assert.match(buttonOnly, /type="search"[^>]*hidden/);
});
