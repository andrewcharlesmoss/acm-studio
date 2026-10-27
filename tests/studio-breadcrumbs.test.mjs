import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { renderToStaticMarkup } from "react-dom/server";
import { loadProductionModule } from "./production-module.mjs";

const { StudioBreadcrumbs } = await loadProductionModule(new URL("../app/studio/studio-header.tsx", import.meta.url));
const props = { studioSection: "content", hasContentDocuments: true, activeDocument: { kind: "page", title: "Test" }, siteId: "test", previewWindow: false };
const nodes = node => Array.isArray(node) ? node.flatMap(nodes) : node?.props ? [node, ...nodes(node.props.children)] : [];

test("site breadcrumbs separate all four levels and keep the document current", () => {
  const tree = StudioBreadcrumbs(props);
  const markup = renderToStaticMarkup(tree);
  assert.match(markup, /<nav[^>]+aria-label="Breadcrumb"/);
  assert.equal(nodes(tree).filter(node => node.type === "li").length, 4);
  assert.equal(nodes(tree).filter(node => node.props.name === "chevron-right").length, 3);
  assert.deepEqual(nodes(tree).filter(node => node.type === "a").map(node => [node.props.children, node.props.href]), [["Sites", "/"], ["Test", "/studio?site=test&library=page"], ["Pages", "/studio?site=test&library=page"]]);
  assert.match(markup, /<strong aria-current="page">Test<\/strong>/);
});

test("breadcrumb links use Gutenberg link colour without button-like hover treatment", () => {
  const styles = readFileSync(new URL("../app/studio/studio.css", import.meta.url), "utf8");
  assert.match(styles, /\.studio-breadcrumb-list a\s*\{[^}]*color:\s*var\(--muted\)[^}]*text-decoration:\s*none/s);
  assert.match(styles, /\.studio-breadcrumb-list a:hover\s*\{[^}]*color:\s*var\(--gutenberg-accent\)[^}]*text-decoration:\s*none/s);
  assert.match(styles, /\.studio-breadcrumb-list a:focus-visible:where\(html:not\(\[data-studio-focus-visible="false"\]\) \*\)\s*\{[^}]*outline:/s);
  const hover = styles.match(/\.studio-breadcrumb-list a:hover\s*\{([^}]*)\}/)?.[1] ?? "";
  assert.doesNotMatch(hover, /background|border-radius|padding/);
});

test("ancestor links invoke production callback while modified and preview clicks stay native", () => {
  const calls = [];
  const link = nodes(StudioBreadcrumbs({ ...props, onNavigate: target => calls.push(target) })).find(node => node.type === "a" && node.props.children === "Pages");
  const event = { button: 0, preventDefault() { this.prevented = true; } };
  link.props.onClick(event);
  assert.equal(event.prevented, true);
  assert.deepEqual(calls, ["page"]);
  for (const modifier of ["metaKey", "ctrlKey", "shiftKey", "altKey"]) {
    const native = { ...event, prevented: false, [modifier]: true };
    link.props.onClick(native);
    assert.equal(native.prevented, false);
  }
  const previewLink = nodes(StudioBreadcrumbs({ ...props, previewWindow: true, onNavigate() { assert.fail(); } })).find(node => node.type === "a");
  const native = { ...event, prevented: false };
  previewLink.props.onClick(native);
  assert.equal(native.prevented, false);
});

test("posts, templates and Studio tools use the same ancestor/current pattern", () => {
  for (const overrides of [{ siteId: "test2", activeDocument: { kind: "post", title: "Post" } }, { siteId: undefined }, { studioSection: "templates" }, { studioSection: "files" }]) {
    const tree = StudioBreadcrumbs({ ...props, ...overrides });
    const all = nodes(tree);
    assert.equal(all.filter(node => node.props["aria-current"] === "page").length, 1);
    assert.equal(all.filter(node => node.props.name === "chevron-right").length, all.filter(node => node.type === "li").length - 1);
    assert.ok(all.some(node => node.type === "a"));
  }
});

function navigation(bindings, functionName = "navigateBreadcrumb") {
  const source = readFileSync(new URL("../app/studio/studio-prototype.tsx", import.meta.url), "utf8");
  const ast = ts.createSourceFile("prototype.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let declaration;
  function visit(node) { if (ts.isFunctionDeclaration(node) && node.name?.text === functionName) declaration = node; ts.forEachChild(node, visit); }
  visit(ast);
  assert.ok(declaration);
  const scope = { ...bindings };
  runInNewContext(ts.transpileModule(`${declaration.getText(ast)};globalThis.navigate = ${functionName};`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, scope);
  return scope.navigate;
}
function fixture(overrides = {}) {
  const calls = [];
  const bindings = { hostedHome: false, prepareNavigationLeave: async () => true, switchingSite: false, selectedSite: "test", confirmCodeEditorDiscard: () => true,
    setSwitchingSite: value => calls.push(["switching", value]), testSite: { pauseEditing: value => calls.push(["pause", value]), failure: null },
    currentWorkspaceSession: { writable: true, flush: async () => calls.push(["flush"]) }, window: { location: { assign: path => calls.push(["assign", path]) } },
    libraryKind: "page", activeDocument: { kind: "post" }, switchStudioMode: (...args) => { calls.push(["mode", ...args]); return true; },
    setLibraryKind: value => calls.push(["library", value]), setLibraryPaneCollapsed: value => calls.push(["collapse", value]), setViewMode: value => calls.push(["view", value]), ...overrides };
  bindings.departurePending = { current: false };
  bindings.flushSitesDisclosureSaves = async () => true;
  bindings.globalTemplates = { session: { ready: false } };
  bindings.browserTemplateSession = { ready: false };
  bindings.setSiteFeedback = value => calls.push(["feedback", value]);
  bindings.prepareChromeDeparture = navigation(bindings, "prepareChromeDeparture");
  return { calls, navigate: navigation(bindings) };
}

test("Sites waits for owning save and cannot leave on save failure or rejected code discard", async () => {
  const success = fixture(); await success.navigate("sites");
  assert.deepEqual(success.calls, [["switching", true], ["pause", true], ["flush"], ["pause", false], ["assign", "/"], ["switching", false]]);
  const failure = fixture({ currentWorkspaceSession: { flush: async () => { throw new Error("Save unavailable"); } } });
  await failure.navigate("sites");
  assert.deepEqual(failure.calls, [["switching", true], ["pause", true], ["pause", false], ["feedback", "Saving failed. Your draft has been kept."], ["switching", false]]);
  const cancelled = fixture({ confirmCodeEditorDiscard: () => false }); await cancelled.navigate("sites");
  assert.deepEqual(cancelled.calls, [["switching", true], ["switching", false]]);
});

test("collection navigation reveals the existing library without changing the document", async () => {
  const selected = fixture(); await selected.navigate("post");
  assert.deepEqual(selected.calls, [["mode", "content", undefined, "post"], ["library", "post"], ["collapse", false]]);
  const cancelled = fixture({ switchStudioMode: () => false }); await cancelled.navigate("page"); assert.deepEqual(cancelled.calls, []);
});


test("readonly Studio Drafts can return to Sites without a prohibited save", async () => {
  const reader = fixture({ selectedSite: null, currentWorkspaceSession: { writable: false, flush() { assert.fail("Readonly cannot save"); } } });
  await reader.navigate("sites");
  assert.deepEqual(reader.calls, [["switching", true], ["assign", "/"], ["switching", false]]);
});


test("site ancestor preserves the selected Posts tab when a Page is active", async () => {
  const links = nodes(StudioBreadcrumbs({ ...props, libraryKind: "post" })).filter(node => node.type === "a");
  assert.equal(links.find(node => node.props.children === "Test").props.href, "/studio?site=test&library=post");
  assert.equal(links.find(node => node.props.children === "Pages").props.href, "/studio?site=test&library=page");
  const studio = nodes(StudioBreadcrumbs({ ...props, studioSection: "files", libraryKind: "post" })).find(node => node.type === "a");
  assert.equal(studio.props.href, "/studio?site=test&library=post");
  const templateSite = nodes(StudioBreadcrumbs({ ...props, libraryKind: "templates" })).find(node => node.type === "a" && node.props.children === "Test");
  assert.equal(templateSite.props.href, "/studio?site=test&library=page");
  const siteFromTemplates = fixture({ libraryKind: "templates", activeDocument: { kind: "page" } });
  await siteFromTemplates.navigate("site");
  assert.deepEqual(siteFromTemplates.calls, [["mode", "content", undefined, "page"], ["library", "page"], ["collapse", false]]);
  const templateTool = nodes(StudioBreadcrumbs({ ...props, studioSection: "files", libraryKind: "templates" })).find(node => node.type === "a");
  assert.equal(templateTool.props.href, "/studio?site=test&library=page");
  const content = fixture({ libraryKind: "templates", activeDocument: { kind: "page" } });
  await content.navigate("content");
  assert.deepEqual(content.calls, [["mode", "content", undefined, "page"], ["library", "page"], ["collapse", false]]);
  const site = fixture({ libraryKind: "post", activeDocument: { kind: "page" } });
  await site.navigate("site");
  assert.deepEqual(site.calls, [["mode", "content", undefined, "post"], ["library", "post"], ["collapse", false]]);
});


test("breadcrumb navigation waits for menu settlement and stays put when refused", async () => {
  let settle; const settlement = new Promise(resolve => { settle = resolve; });
  const waiting = fixture({ prepareNavigationLeave: () => settlement });
  const navigation = waiting.navigate("sites"); assert.deepEqual(waiting.calls, [["switching", true]]); settle(false); await navigation; assert.deepEqual(waiting.calls, [["switching", true], ["switching", false]]);
  const accepted = fixture({ prepareNavigationLeave: async () => true }); await accepted.navigate("page"); assert.equal(accepted.calls[0][0], "mode");
});

 test("template breadcrumb identifies the actual original or shared part", () => {
  for (const name of ["Header", "Footer", "Home Layout"]) {
    const markup = renderToStaticMarkup(StudioBreadcrumbs({ ...props, studioSection: "templates", templateTargetName: name }));
    assert.match(markup, new RegExp('aria-current="page">' + name));
    assert.doesNotMatch(markup, /Shared presentation/);
  }
});

test("Local Edit opens page content and keeps save refusal guards", async () => {
  function edit(overrides = {}) {
    const calls = [];
    const navigate = navigation({ hostedHome: false, flushSitesDisclosureSaves: async () => true, prepareNavigationLeave: async () => true, switchingSite: false, confirmCodeEditorDiscard: () => true, selectedSite: "test", libraryKind: "templates", templateTarget: { targetId: "header" }, workspace: { documents: [{ id: "home", kind: "page" }] }, testContext: { homeDocumentId: "home" }, testSite: { pauseEditing() {}, flush: async () => {}, failure: null }, setSwitchingSite() {}, studioContextPath: (site, kind) => `/studio?site=${site}&library=${kind}`, window: { location: { assign: path => calls.push(path) } }, selectDocument: document => calls.push(document.id), selectLibraryKind: kind => calls.push(kind), setViewMode: mode => calls.push(mode), setPreviewing: value => calls.push(["preview", value]), setSelectedBlockId() {}, setInspectorTab() {}, setShowInserter() {}, ...overrides }, "selectSite");
    return { calls, navigate };
  }
  const same = edit(); await same.navigate("test"); assert.deepEqual(same.calls, ["home", ["preview", false]]);
  const other = edit(); await other.navigate("test2"); assert.deepEqual(other.calls, ["/studio?site=test2&library=page"]);
  const denied = edit({ prepareNavigationLeave: async () => false }); await denied.navigate("test2"); assert.deepEqual(denied.calls, []);
  const failed = edit({ testSite: { pauseEditing() {}, flush: async () => { throw Error("failed"); } } }); await failed.navigate("test2"); assert.deepEqual(failed.calls, []);
});
