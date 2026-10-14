import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import * as jsxRuntime from "react/jsx-runtime";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";
import { loadProductionModule } from "./production-module.mjs";

const production = await loadProductionModule(new URL("../app/studio/project-local-links.tsx", import.meta.url));
const registry = await loadProductionModule(new URL("../app/studio/project-registry.ts", import.meta.url));
const fixtures = await loadProductionModule(new URL("../app/studio/test-site/sites.ts", import.meta.url));
const navigation = await loadProductionModule(new URL("../app/studio/use-studio-screen-navigation.ts", import.meta.url));
const nodes = node => Array.isArray(node) ? node.flatMap(nodes) : node?.props ? [node, ...nodes(node.props.children)] : [];

// Render the actual component with its browser-discovery hook result supplied.
// No synthetic implementation of its action, address or title rules is used.
function component(name, bindings) {
  const source = readFileSync(new URL("../app/studio/project-local-links.tsx", import.meta.url), "utf8");
  const ast = ts.createSourceFile("links.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const declaration = ast.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === name);
  assert.ok(declaration);
  const scope = { exports: {}, require: () => jsxRuntime, ...bindings };
  runInNewContext(ts.transpileModule(`${declaration.getText(ast)};globalThis.component = ${name};`, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText, scope);
  return scope.component;
}

test("Sites includes ACM Studio before Test and Test2 without changing fixture contexts", () => {
  const calls = [];
  const list = component("LocalFixtureSiteNavigation", { ...registry, ...fixtures, ...navigation, ProjectLocalSiteNavigation: production.ProjectLocalSiteNavigation, useSiteOrdering: ids => ({ order: ids, reordering: { rowProps: () => ({}), canReorder: true, message: "" }, status: "" }) });
  const tree = list({ selectedSite: "test2", libraryKind: "page", onSelectSite: id => calls.push(id) });
  const cards = nodes(tree).filter(node => node.type === production.ProjectLocalSiteNavigation);
  assert.deepEqual(cards.map(node => node.props.id), ["acm-studio", "test", "test2"]);
  assert.equal(cards[0].props.active, false);
  assert.equal(cards[0].props.onSelectTest, undefined);
  assert.equal(cards[1].props.studioHref, "/studio?site=test&library=page");
  assert.equal(cards[2].props.active, true);
  cards[2].props.onSelectTest();
  assert.deepEqual(calls, ["test2"]);
  const html = renderToStaticMarkup(tree);
  assert.doesNotMatch(html, /aria-label="Edit ACM Studio local site"/);
  assert.match(html, /https:\/\/acm-studio\.andrewcharlesmoss\.chatgpt\.site/);
});

test("ACM Studio Local Visit uses its own homepage even when Project Ports is unavailable", () => {
  const link = component("ProjectLocalLink", {
    useLocalProjectVisit: () => ({ local: true, canVisit: false, opening: false, openLocal() { assert.fail("Self visit must not discover another server"); } }),
    isLocalFixtureSiteId: id => ["test", "test2"].includes(id),
    StudioIcon: () => null,
  });
  const tree = link({ id: "acm-studio", name: "ACM Studio" });
  const actions = nodes(tree);
  const visit = actions.find(node => node.type === "a");
  assert.equal(visit.props.href, "/");
  assert.equal(visit.props.target, "_blank");
  assert.equal(visit.props.rel, "noopener noreferrer");
  assert.equal(visit.props["aria-label"], "Visit Site — ACM Studio — Local");
  const edit = actions.find(node => node.type === "button");
  assert.equal(edit.props.disabled, true);
  assert.match(edit.props["aria-label"], /Edit Site.*not available yet/);
});

test("hosted Studio does not offer a local visit and fixture Edit retains its guarded callback", () => {
  let local = false;
  const link = component("ProjectLocalLink", {
    useLocalProjectVisit: () => ({ local, canVisit: false, opening: false, openLocal() {} }),
    isLocalFixtureSiteId: id => id === "test",
    localFixtureHref: id => `/studio?site=${id}`,
    StudioIcon: () => null,
  });
  assert.equal(nodes(link({ id: "acm-studio", name: "ACM Studio" })).filter(node => node.type === "a").length, 0);
  local = true;
  let selected = false;
  const edit = nodes(link({ id: "test", name: "Test", studioHref: "/studio?site=test&library=page", active: true, onEdit() { selected = true; } })).find(node => node.type === "a");
  assert.equal(edit.props.href, "/studio?site=test&library=page");
  assert.equal(edit.props["aria-current"], "page");
  let prevented = false;
  edit.props.onClick({ preventDefault() { prevented = true; } });
  assert.equal(prevented && selected, true);
});

test("self-site status uses the browser address without a discovered service", () => {
  const status = component("ProjectLocalStatus", {
    useContext: () => ({ local: true, currentAddress: "localhost:4321", snapshot: { available: false, projects: [] } }),
    LocalProjectsContext: {},
  });
  const html = renderToStaticMarkup(status({ id: "acm-studio" }));
  assert.match(html, /Local server running — localhost:4321/);
  assert.match(html, /data-state="running"/);
  assert.doesNotMatch(html, /Project Ports unavailable/);
});
