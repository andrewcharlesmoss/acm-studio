import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";
import { loadProductionModule } from "./production-module.mjs";

const { StylesPreviewMenu } = await loadProductionModule(new URL("../app/studio/site-editor/styles-preview-menu.tsx", import.meta.url));
const identityState = await loadProductionModule(new URL("../app/studio/site-editor/identity-preview-state.ts", import.meta.url));
const presentation = await loadProductionModule(new URL("../app/studio/site-editor/identity-preview-presentation.ts", import.meta.url));
const stylesState = await loadProductionModule(new URL("../app/studio/site-editor/styles-preview-state.ts", import.meta.url));
const labels = ["Browse Styles", "Typography", "Colours", "Background", "Shadows", "Layout", "Blocks"];
const { iconGeometry } = await import("@acm/icons");

test("Styles enables Browse Styles and leaves the other reference categories unavailable", () => {
  const html = renderToStaticMarkup(createElement(StylesPreviewMenu, { onBrowse() {} }));
  assert.deepEqual([...html.matchAll(/<span>([^<]+)<\/span>/g)].map(match => match[1]), labels);
  assert.equal([...html.matchAll(/<button[^>]*disabled=""/g)].length, labels.length - 1);
  assert.doesNotMatch(html, /<(input|select|textarea)\b/);
  for (const name of ["text.typography", "style.colour", "style.background", "view.shadow", "layout.template"]) {
    for (const path of iconGeometry[name]["Regular-M"].paths) assert.ok(html.includes(`d="${path.d}"`), name);
  }
});

test("Styles pane header exposes preview controls and unavailable actions", async () => {
  const source = readFileSync(new URL("../app/studio/site-editor/styles-pane-header-actions.tsx", import.meta.url), "utf8");
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const slots = []; let index = 0;
  const jsx = (type, props) => ({ type, props });
  const React = { useState(initial) { const id = index++; if (!(id in slots)) slots[id] = initial; return [slots[id], value => { slots[id] = typeof value === "function" ? value(slots[id]) : value; }]; }, useRef: initial => ({ current: initial }) };
  const icon = "AcmIcon", item = "StudioMenuItem", menu = "StudioAnchoredMenu", studioIcon = "StudioIcon";
  const require = name => name === "react" ? React : name === "react/jsx-runtime" ? { jsx, jsxs: jsx } : name.endsWith("@acm/icons/react") ? { AcmIcon: icon } : name.endsWith("overlays/menu") ? { StudioMenuItem: item } : name.endsWith("overlays/anchored-menu") ? { StudioAnchoredMenu: menu } : name.endsWith("studio-icons") ? { StudioIcon: studioIcon } : {};
  const component = new Function("require", "exports", `${code}\nreturn exports.StylesPaneHeaderActions;`)(require, {});
  const all = node => !node || typeof node !== "object" ? [] : Array.isArray(node) ? node.flatMap(all) : [node, ...all(node.props?.children)];
  const render = () => { index = 0; return component(); };
  let tree = render();
  const buttons = () => all(tree).filter(node => node.type === "button");
  assert.equal(buttons()[0].props.disabled, true);
  assert.equal(buttons()[0].props["aria-label"], "Open Style Book");
  assert.equal(buttons()[1].props["aria-haspopup"], "menu");
  assert.equal(buttons()[1].props["aria-expanded"], false);
  buttons()[1].props.onClick(); tree = render();
  assert.equal(buttons()[1].props["aria-expanded"], true);
  const actions = all(tree).filter(node => node.type === item);
  assert.deepEqual(actions.map(action => action.props.children), ["Additional CSS", "Reset styles"]);
  assert.ok(actions.every(action => action.props.disabled));
  const anchoredMenu = all(tree).find(node => node.type === menu);
  assert.equal(anchoredMenu.props["aria-label"], "Styles actions");
});

test("switching Styles, scopes, and Identity keeps the current temporary identity edits", () => {
  const source = readFileSync(new URL("../app/studio/site-editor/site-editor-preview.tsx", import.meta.url), "utf8");
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const slots = []; let index = 0;
  const react = {
    useState(initial) { const id = index++; if (!(id in slots)) slots[id] = initial; return [slots[id], value => { slots[id] = value; }]; },
    useReducer(reducer, initial, init) { const id = index++; if (!(id in slots)) slots[id] = init(initial); return [slots[id], action => { slots[id] = reducer(slots[id], action); }]; },
    useRef: initial => ({ current: initial }), useMemo: fn => fn(), useEffect() {},
  };
  const jsx = (type, props) => ({ type, props });
  const require = name => name === "react" ? react : name === "react/jsx-runtime" ? { jsx, jsxs: jsx }
    : name.endsWith("identity-preview-state") ? identityState : name.endsWith("identity-preview-presentation") ? presentation
    : name.endsWith("styles-preview-state") ? stylesState
    : name.endsWith("use-blob-urls") ? { useBlobUrls: () => ({}) }
    : name.endsWith("native-fields") ? { TextInput: "input", SelectControl: "select" }
    : name.endsWith("styles-preview-menu") ? { StylesPreviewMenu }
    : name.endsWith(".css") ? {} : new Proxy({}, { get: (_, key) => key });
  const component = new Function("require", "exports", `${code}\nreturn exports.SiteEditorPreview;`)(require, {});
  const all = node => !node || typeof node !== "object" ? [] : Array.isArray(node) ? node.flatMap(all) : [node, ...all(node.props?.children), ...all(node.props?.primary), ...all(node.props?.secondary)];
  const render = () => { index = 0; return component(); };
  const sectionButton = (tree, label) => all(tree).find(node => node.type === "button" && node.props.children?.some?.(child => child?.type === "strong" && child.props.children === label));
  const settings = tree => all(tree).find(node => node.type === "Pane" && node.props.label !== "Site Editor Navigation");
  let tree = render();
  for (const [label, icon] of Object.entries({ Identity: "site.identity", Styles: "view.styles", Pages: "view.single", Navigation: "navigation.compass", Patterns: "symbol.outline", Templates: "layout.template" })) {
    assert.equal(all(sectionButton(tree, label)).find(node => node.type === "AcmIcon").props.name, icon);
  }
  all(tree).find(node => node.props?.id === "site-identity-title").props.onChange({ currentTarget: { value: "Kept title" } });
  sectionButton(tree, "Styles").props.onClick(); tree = render();
  assert.equal(settings(tree).props.label, "Site Editor Styles");
  assert.deepEqual(settings(tree).props.style, { "--pane-inline-space": "28px" });
  assert.equal(settings(tree).props.children.type, StylesPreviewMenu);
  settings(tree).props.children.props.onBrowse(); tree = render();
  assert.equal(settings(tree).props.children.type, "BrowseStyles");
  settings(tree).props.children.props.onChange({ paletteId: "evening" }); tree = render();
  assert.equal(settings(tree).props.children.props.selection.paletteId, "evening");
  all(tree).find(node => node.type === "select").props.onChange({ currentTarget: { value: "global" } }); tree = render();
  assert.equal(settings(tree).props.label, "Site Editor Styles");
  assert.equal(settings(tree).props.children.props.selection.paletteId, "default");
  all(tree).find(node => node.type === "select").props.onChange({ currentTarget: { value: "test" } });
  sectionButton(tree, "Identity").props.onClick(); tree = render();
  assert.equal(settings(tree).props.label, "Site Editor Identity");
  assert.equal(settings(tree).props.style, undefined);
  assert.equal(all(tree).find(node => node.props?.id === "site-identity-title").props.value, "Kept title");
});
