import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";
import { loadProductionModule } from "./production-module.mjs";
import { studioHistoryShortcut } from "../app/studio/studio-history-shortcuts.mjs";

const { StylesPreviewMenu } = await loadProductionModule(new URL("../app/studio/site-editor/styles-preview-menu.tsx", import.meta.url));
const identityState = await loadProductionModule(new URL("../app/studio/site-editor/identity-preview-state.ts", import.meta.url));
const presentation = await loadProductionModule(new URL("../app/studio/site-editor/identity-preview-presentation.ts", import.meta.url));
const colourModel = await loadProductionModule(new URL("../app/studio/site-editor/colours-preview-model.ts", import.meta.url));
const stylesState = await loadProductionModule(new URL("../app/studio/site-editor/styles-preview-state.ts", import.meta.url));
const labels = ["Browse Styles", "Typography", "Colours", "Background", "Shadows", "Layout", "Blocks"];
const { iconGeometry } = await import("@acm/icons");

test("Styles enables Browse Styles, Typography, Colours, Background, Shadows, and Layout while Blocks remains unavailable", () => {
  const html = renderToStaticMarkup(createElement(StylesPreviewMenu, { onBrowse() {}, onTypography() {}, onColours() {}, onBackground() {}, onShadows() {}, onLayout() {} }));
  assert.deepEqual([...html.matchAll(/<span>([^<]+)<\/span>/g)].map(match => match[1]), labels);
  assert.equal([...html.matchAll(/<button[^>]*disabled=""/g)].length, labels.length - 6);
  assert.doesNotMatch(html, /<(input|select|textarea)\b/);
  for (const name of ["text.typography", "style.colour", "style.background", "view.shadow", "layout.template"]) {
    for (const path of iconGeometry[name]["Regular-M"].paths) assert.ok(html.includes(`d="${path.d}"`), name);
  }
});

test("Styles pane header exposes Additional CSS and the reset action", async () => {
  const source = readFileSync(new URL("../app/studio/site-editor/styles-pane-header-actions.tsx", import.meta.url), "utf8");
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const slots = []; let index = 0;
  const jsx = (type, props) => ({ type, props });
  const React = { useState(initial) { const id = index++; if (!(id in slots)) slots[id] = initial; return [slots[id], value => { slots[id] = typeof value === "function" ? value(slots[id]) : value; }]; }, useRef: initial => ({ current: initial }) };
  const icon = "AcmIcon", item = "StudioMenuItem", menu = "StudioAnchoredMenu", studioIcon = "StudioIcon";
  const require = name => name === "react" ? React : name === "react/jsx-runtime" ? { jsx, jsxs: jsx } : name.endsWith("@acm/icons/react") ? { AcmIcon: icon } : name.endsWith("overlays/menu") ? { StudioMenuItem: item } : name.endsWith("overlays/anchored-menu") ? { StudioAnchoredMenu: menu } : name.endsWith("studio-icons") ? { StudioIcon: studioIcon } : {};
  const component = new Function("require", "exports", `${code}\nreturn exports.StylesPaneHeaderActions;`)(require, {});
  const all = node => !node || typeof node !== "object" ? [] : Array.isArray(node) ? node.flatMap(all) : [node, ...all(node.props?.children)];
  let styleBookOpen = false; let cssOpened = false;
  const render = () => { index = 0; return component({ canReset: true, onReset() {}, onAdditionalCss() { cssOpened = true; }, styleBookOpen, onToggleStyleBook() { styleBookOpen = !styleBookOpen; } }); };
  let tree = render();
  const buttons = () => all(tree).filter(node => node.type === "button");
  assert.notEqual(buttons()[0].props.disabled, true);
  assert.equal(all(buttons()[0]).find(node => node.type === icon).props.name, "view.preview");
  assert.equal(buttons()[0].props["aria-pressed"], false);
  assert.equal(buttons()[0].props["aria-label"], "Open Style Book");
  buttons()[0].props.onClick(); tree = render();
  assert.equal(buttons()[0].props["aria-pressed"], true);
  assert.equal(buttons()[0].props["aria-label"], "Close Style Book");
  assert.equal(buttons()[1].props["aria-haspopup"], "menu");
  assert.equal(buttons()[1].props["aria-expanded"], false);
  buttons()[1].props.onClick(); tree = render();
  assert.equal(buttons()[1].props["aria-expanded"], true);
  const actions = all(tree).filter(node => node.type === item);
  assert.deepEqual(actions.map(action => action.props.children), ["Additional CSS", "Reset styles"]);
  assert.deepEqual(actions.map(action => Boolean(action.props.disabled)), [false, false]);
  assert.equal(typeof actions[1].props.onClick, "function");
  const anchoredMenu = all(tree).find(node => node.type === menu);
  assert.equal(anchoredMenu.props["aria-label"], "Styles actions");
  actions[0].props.onClick(); tree = render();
  assert.equal(cssOpened, true);
  assert.equal(buttons()[1].props["aria-expanded"], false);
});

test("Styles history recognises Mac and Windows shortcuts and preserves native editing", () => {
  const button = { closest: () => null, matches: () => false };
  const input = { closest: () => null, matches: selector => selector.includes("input") };
  const event = (key, overrides = {}) => ({ key, target: button, defaultPrevented: false, isComposing: false, altKey: false, shiftKey: false, metaKey: false, ctrlKey: false, ...overrides });
  assert.equal(studioHistoryShortcut(event("z", { metaKey: true }), "MacIntel"), "undo");
  assert.equal(studioHistoryShortcut(event("z", { metaKey: true, shiftKey: true }), "MacIntel"), "redo");
  assert.equal(studioHistoryShortcut(event("z", { ctrlKey: true }), "Win32"), "undo");
  assert.equal(studioHistoryShortcut(event("z", { ctrlKey: true, shiftKey: true }), "Win32"), "redo");
  assert.equal(studioHistoryShortcut(event("y", { ctrlKey: true }), "Win32"), "redo");
  assert.equal(studioHistoryShortcut({ ...event("z", { ctrlKey: true }), target: input }, "Win32"), null);
});

const layoutModel = await loadProductionModule(new URL("../app/studio/site-editor/layout-preview-model.ts", import.meta.url));
const backgroundModel = await loadProductionModule(new URL("../app/studio/site-editor/background-preview-model.ts", import.meta.url));
const typographyModel = await loadProductionModule(new URL("../app/studio/site-editor/typography-preview-model.ts", import.meta.url));

test("switching Styles, scopes, and Identity keeps the current temporary identity edits", () => {
  const source = readFileSync(new URL("../app/studio/site-editor/site-editor-preview.tsx", import.meta.url), "utf8");
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const slots = []; let index = 0;
  const react = {
    useState(initial) { const id = index++; if (!(id in slots)) slots[id] = initial; return [slots[id], value => { slots[id] = typeof value === "function" ? value(slots[id]) : value; }]; },
    useReducer(reducer, initial, init) { const id = index++; if (!(id in slots)) slots[id] = init(initial); return [slots[id], action => { slots[id] = reducer(slots[id], action); }]; },
    useRef: initial => ({ current: initial }), useMemo: fn => fn(), useEffect() {},
  };
  const jsx = (type, props) => ({ type, props });
  const require = name => name === "react" ? react : name === "react/jsx-runtime" ? { jsx, jsxs: jsx }
    : name.endsWith("identity-preview-state") ? identityState : name.endsWith("identity-preview-presentation") ? presentation
    : name.endsWith("layout-preview-model") ? layoutModel
    : name.endsWith("background-preview-model") ? backgroundModel
    : name.endsWith("colours-preview-model") ? colourModel
    : name.endsWith("styles-preview-state") ? stylesState
    : name.endsWith("typography-preview-model") ? typographyModel
    : name.endsWith("use-blob-urls") ? { useBlobUrls: () => ({}) }
    : name.endsWith("native-fields") ? { TextInput: "input", SelectControl: "select" }
    : name.endsWith("styles-preview-menu") ? { StylesPreviewMenu }
    : name.endsWith(".css") ? {} : new Proxy({}, { get: (_, key) => key });
  const component = new Function("require", "exports", "requestAnimationFrame", `${code}\nreturn exports.SiteEditorPreview;`)(require, {}, callback => callback());
  const all = node => !node || typeof node !== "object" ? [] : Array.isArray(node) ? node.flatMap(all) : [node, ...all(node.props?.children), ...all(node.props?.primary), ...all(node.props?.secondary), ...all(node.props?.header)];
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
  const toggleBook = () => all(tree).find(node => node.type === "StylesPaneHeaderActions").props.onToggleStyleBook();
  toggleBook(); tree = render();
  const previewFrame = all(tree).find(node => node.type === "ResizablePreviewFrame");
  assert.equal(all(previewFrame).some(node => node.props?.id === "site-editor-preview-title"), false, "the preview has no additional title above the specimens");
  assert.equal(all(previewFrame).some(node => node.type === "HistoryActions"), false);
  let book = all(tree).find(node => node.type === "StyleBook");
  assert.equal(book.props.selection.paletteId, "evening");
  assert.equal(book.props.context, "overview");
  book.props.onTypography("buttons"); tree = render();
  book = all(tree).find(node => node.type === "StyleBook");
  assert.equal(book.props.context, "buttons");
  assert.deepEqual(settings(tree).props.children.props.navigation, { view: "element", role: "buttons" });
  assert.equal(all(tree).some(node => node.type === "HistoryActions"), false);
  toggleBook(); tree = render();
  assert.equal(all(tree).some(node => node.type === "StyleBook"), false);
  assert.equal(settings(tree).props.children.props.selection.paletteId, "evening");
  settings(tree).props.children.props.onBack(); tree = render();
  settings(tree).props.children.props.onBrowse(); tree = render();

  all(tree).find(node => node.type === "select").props.onChange({ currentTarget: { value: "global" } }); tree = render();
  assert.equal(settings(tree).props.label, "Site Editor Styles");
  assert.equal(settings(tree).props.children.props.selection.paletteId, "default");
  all(tree).find(node => node.type === "select").props.onChange({ currentTarget: { value: "test" } });
  sectionButton(tree, "Identity").props.onClick(); tree = render();
  assert.equal(settings(tree).props.label, "Site Editor Identity");
  assert.equal(settings(tree).props.style, undefined);
  assert.equal(all(tree).find(node => node.props?.id === "site-identity-title").props.value, "Kept title");
  sectionButton(tree, "Styles").props.onClick(); tree = render();
  settings(tree).props.children.props.onBack(); tree = render();
  settings(tree).props.children.props.onTypography(); tree = render();
  settings(tree).props.children.props.onNavigate(current => ({ ...current, view: "preset" })); tree = render();
  sectionButton(tree, "Identity").props.onClick(); tree = render();
  sectionButton(tree, "Styles").props.onClick(); tree = render();
  assert.equal(settings(tree).props.children.props.navigation.view, "menu", "remounting Typography returns to its menu instead of a stale local preset editor");
});
