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
const labels = ["Browse Styles", "Typography", "Colours", "Background", "Shadows", "Layout", "Blocks"];
const { iconGeometry } = await import("@acm/icons");

test("Styles shows the reference menu in order with no editing controls or active actions", () => {
  const html = renderToStaticMarkup(createElement(StylesPreviewMenu));
  assert.deepEqual([...html.matchAll(/<span>([^<]+)<\/span>/g)].map(match => match[1]), labels);
  assert.equal([...html.matchAll(/<button[^>]*disabled=""/g)].length, labels.length);
  assert.doesNotMatch(html, /<(input|select|textarea)\b/);
  for (const name of ["text.typography", "style.colour", "style.background", "view.shadow", "layout.template"]) {
    for (const path of iconGeometry[name]["Regular-M"].paths) assert.ok(html.includes(`d="${path.d}"`), name);
  }
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
  assert.equal(settings(tree).props.children.type, StylesPreviewMenu);
  all(tree).find(node => node.type === "select").props.onChange({ currentTarget: { value: "global" } }); tree = render();
  assert.equal(settings(tree).props.label, "Site Editor Styles");
  all(tree).find(node => node.type === "select").props.onChange({ currentTarget: { value: "test" } });
  sectionButton(tree, "Identity").props.onClick(); tree = render();
  assert.equal(settings(tree).props.label, "Site Editor Identity");
  assert.equal(all(tree).find(node => node.props?.id === "site-identity-title").props.value, "Kept title");
});
