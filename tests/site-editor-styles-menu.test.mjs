import { createHostModuleEvaluator } from "./production-module.mjs";
import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { loadProductionModule } from "./production-module.mjs";
import { studioHistoryShortcut } from "../app/studio/studio-history-shortcuts.mjs";

const libraryReordering = await loadProductionModule(new URL("../app/studio/library-reordering.ts", import.meta.url));
const websiteDesign = await loadProductionModule(new URL("../app/studio/site-editor/website-design.ts", import.meta.url));

const { StylesPreviewMenu } = await loadProductionModule(new URL("../app/studio/site-editor/styles-preview-menu.tsx", import.meta.url));
const identityState = await loadProductionModule(new URL("../app/studio/site-editor/identity-preview-state.ts", import.meta.url));
const presentation = await loadProductionModule(new URL("../app/studio/site-editor/identity-preview-presentation.ts", import.meta.url));
const colourModel = await loadProductionModule(new URL("../app/studio/site-editor/colours-preview-model.ts", import.meta.url));
const stylesState = await loadProductionModule(new URL("../app/studio/site-editor/styles-preview-state.ts", import.meta.url));
const canonicalStyleGuide = await loadProductionModule(new URL("../app/studio/ui/styles/canonical-style-guide.ts", import.meta.url));
const labels = ["Browse Styles", "Typography", "Colours", "Background", "Shadows", "Layout", "Blocks"];
const { iconGeometry } = await import("@acm/icons");

test("Styles enables all implemented categories, including Blocks", () => {
  const html = renderToStaticMarkup(createElement(StylesPreviewMenu, { onBrowse() {}, onTypography() {}, onColours() {}, onBackground() {}, onShadows() {}, onLayout() {}, onBlocks() {} }));
  assert.deepEqual([...html.matchAll(/<span>([^<]+)<\/span>/g)].map(match => match[1]), labels);
  assert.equal([...html.matchAll(/<button[^>]*disabled=""/g)].length, 0);
  assert.doesNotMatch(html, /<(input|select|textarea)\b/);
  for (const name of ["text.typography", "style.colour", "style.background", "view.shadow", "layout.template"]) {
    for (const path of iconGeometry[name]["Regular-M"].paths) assert.ok(html.includes(`d="${path.d}"`), name);
  }
});

test("Styles pane header exposes Additional CSS and the reset action", async () => {
  const source = readFileSync(new URL("../app/studio/site-editor/styles-pane-header-actions.tsx", import.meta.url), "utf8");
  const code = (source);
  const slots = []; let index = 0;
  const jsx = (type, props) => ({ type, props });
  const React = { useState(initial) { const id = index++; if (!(id in slots)) slots[id] = initial; return [slots[id], value => { slots[id] = typeof value === "function" ? value(slots[id]) : value; }]; }, useRef: initial => ({ current: initial }) };
  const icon = "AcmIcon", item = "StudioMenuItem", menu = "StudioAnchoredMenu", studioIcon = "StudioIcon";
  const require = name => name.endsWith("studio-view-menu") ? { viewportWidthFor: () => undefined } : name.endsWith("use-site-editor-sessions") ? { useSiteEditorSessions: () => ({ browser: {}, test: {}, test2: {}, globals: {} }) } : name.endsWith("project-local-links") ? { useProjectLocalVisit: () => ({ canVisit: false, openLocal() {} }), ProjectLocalDocumentButton: "ProjectLocalDocumentButton" } : name.endsWith("test-site-context") ? { useTestSiteContext: () => ({ collection: { documents: [{ id: "home", kind: "page", title: "Home" }] }, homeDocumentId: "home", session: { loadError: null }, publicationFor: () => ({ status: "published" }) }) } : name === "react" ? React : name === "react/jsx-runtime" ? { jsx, jsxs: jsx } : name.endsWith("@acm/icons/react") ? { AcmIcon: icon } : name.endsWith("overlays/menu") ? { StudioMenuItem: item } : name.endsWith("overlays/anchored-menu") ? { StudioAnchoredMenu: menu } : name.endsWith("studio-icons") ? { StudioIcon: studioIcon } : {};
  const component = createHostModuleEvaluator(["require", "exports"], `${code}\nreturn exports.StylesPaneHeaderActions;`)(require, {});
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

test("Styles actions menu highlights action text blue without a hover fill", () => {
  const css = readFileSync(new URL("../app/studio/site-editor/site-editor-preview.css", import.meta.url), "utf8");
  assert.match(css, /\.site-editor-styles-header-menu \{[^}]*--acm-ui-hover-neutral-rows-background: transparent;/);
  assert.match(css, /\.site-editor-styles-header-menu \{[^}]*--acm-ui-hover-neutral-rows-foreground: var\(--acm-ui-hover-text-actions-foreground\);/);
  assert.match(css, /\.studio-anchored-menu\.site-editor-styles-header-menu\[data-menu-presentation="default"\]:not\(\.rich-text-format-menu\):not\(\.studio-block-options-menu\) button:is\(:hover, :focus-visible\):not\(:disabled\) \{ color: var\(--acm-ui-hover-neutral-rows-foreground, #1C1C1E\); background: var\(--acm-ui-hover-neutral-rows-background, #F0F0F0\); \}/);
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

test("hydration reveals saved identity controls and preview together, then scope navigation preserves edits", async () => {
  const source = readFileSync(new URL("../app/studio/site-editor/site-editor-preview.tsx", import.meta.url), "utf8");
  const code = (source);
  const slots = []; let index = 0; let hydrationReady = false; let startupValues = null; let hydrateIdentity;
  const react = {
    createElement: (type, props, ...children) => ({ type, props: { ...props, children } }),
    useState(initial) { const id = index++; if (!(id in slots)) slots[id] = initial === "test" ? "global" : initial; return [slots[id], value => { slots[id] = typeof value === "function" ? value(slots[id]) : value; }]; },
    useReducer(reducer, initial, init) { const id = index++; if (!(id in slots)) slots[id] = init(initial); const dispatch = action => { slots[id] = reducer(slots[id], action); }; if (reducer === identityState.identityPreviewReducer) hydrateIdentity = dispatch; return [slots[id], dispatch]; },
    useRef: initial => ({ current: initial }), useCallback: fn => fn, useMemo: fn => fn(), useLayoutEffect() {}, useEffect() {},
  };
  const jsx = (type, props) => ({ type, props });
  const require = name => name.endsWith("use-library-reordering") ? { useLibraryReordering: () => ({ listProps: {}, rowProps: () => ({}), line: null, canReorder: false, message: "" }) } : name.endsWith("library-reordering") ? libraryReordering : name.endsWith("studio-view-menu") ? { viewportWidthFor: () => undefined } : name.endsWith("use-site-editor-sessions") ? { useSiteEditorSessions: () => ({ browser: {}, test: {}, test2: {}, globals: {} }) } : name.endsWith("project-local-links") ? { useProjectLocalVisit: () => ({ canVisit: false }), ProjectLocalDocumentButton: "ProjectLocalDocumentButton" } : name.endsWith("test-site-context") ? { useTestSiteContext: () => ({ collection: { documents: [{ id: "home", kind: "page", title: "Home", status: "published" }] }, homeDocumentId: "home", session: { loadError: null, workspace: { documents: [{ id: "home", kind: "page", title: "Home", status: "published" }], bin: [] } }, templates: { ready: true, store: { bin: [] } }, publicationFor: () => ({ status: "published" }) }) } : name.endsWith("test-site/contract") ? { testDocumentHref: id => `/#${id}` } : name.endsWith("/sites") ? { localFixtureSites: [{ id: 'test', name: 'Test1' }, { id: 'test2', name: 'Test2' }], localFixtureName: id => id === "test2" ? "Test2" : "Test1" } : name === "react" ? react : name === "react/jsx-runtime" ? { jsx, jsxs: jsx }
    : name.endsWith("use-website-design") ? { useWebsiteDesign: () => {
      const [history, dispatch] = react.useReducer(identityState.identityPreviewReducer, undefined, identityState.createIdentityPreview);
      const [stylesHistory, dispatchStyle] = react.useReducer(stylesState.stylesPreviewReducer, undefined, stylesState.createStylesPreview);
      return { history, dispatch, stylesHistory, dispatchStyle, ready: hydrationReady, hydrated: hydrationReady, startup: startupValues, status: hydrationReady ? "Saved" : "Loading saved identity…", failure: null, flush: async () => {} };
    } }
    : name.endsWith("use-identity-persistence") ? { useIdentityPersistence: () => ({ ready: hydrationReady, startup: startupValues, status: hydrationReady ? "Saved" : "Loading saved identity…" }) }
    : name === "./website-design" ? websiteDesign
    : name.endsWith("identity-preview-state") ? identityState : name.endsWith("identity-preview-presentation") ? presentation
    : name.endsWith("canonical-style-guide") ? canonicalStyleGuide
    : name.endsWith("layout-preview-model") ? layoutModel
    : name.endsWith("background-preview-model") ? backgroundModel
    : name.endsWith("colours-preview-model") ? colourModel
    : name.endsWith("styles-preview-state") ? stylesState
    : name.endsWith("typography-preview-model") ? typographyModel
    : name.endsWith("use-blob-urls") ? { useBlobUrls: () => ({}), useBlobUrlsWithReadiness: () => ({ urls: {}, ready: true }) }
    : name.endsWith("native-fields") ? { TextInput: "input", SelectControl: "select" }
    : name === "next/navigation" ? { useRouter: () => ({ push() {} }) }
    : name.endsWith("use-local-website-notice") ? { useLocalWebsiteNotice: () => [true, () => {}, null] }
    : name.endsWith("local-website-notice") ? { LocalWebsiteNotice: "LocalWebsiteNotice" }
    : name.endsWith("use-studio-screen-navigation") ? { studioLibraryPath: () => "/studio", studioContextPath: () => "/studio", studioContentDocumentPath: () => "/studio", studioSiteEditorPath: () => "/studio/site-editor" }
    : name.endsWith("navigation-continuity") ? { getStudioNavigationPreview: () => null, saveStudioNavigationPreview() {} }
    : name.endsWith("styles-preview-menu") ? { StylesPreviewMenu }
    : name.endsWith(".css") ? {} : new Proxy({}, { get: (_, key) => key });
  const window = { history: { state: null, replaceState() {} }, dispatchEvent() {}, location: { href: "http://localhost:3010/studio/site-editor?site=test", pathname: "/studio/site-editor", search: "?site=test" } };
  const component = createHostModuleEvaluator(["require", "exports", "requestAnimationFrame", "window"], `${code}\nreturn exports.SiteEditorPreview;`)(require, {}, callback => callback(), window);
  const all = node => !node || typeof node !== "object" ? [] : Array.isArray(node) ? node.flatMap(all) : [node, ...all(node.props?.children), ...all(node.props?.primary), ...all(node.props?.secondary), ...all(node.props?.header)];
  const render = () => { index = 0; return component({ initialScope: "test" }); };
  const sectionButton = (tree, label) => all(tree).find(node => node.type === "button" && node.props.children?.some?.(child => child?.type === "strong" && child.props.children === label));
  const settings = tree => {
    const pane = all(tree).find(node => node.type === "Pane" && node.props.label !== "Site Editor Navigation");
    const fieldset = all(pane.props.children).find(node => node.type === "fieldset");
    return { ...pane, props: { ...pane.props, children: fieldset ? all(fieldset.props.children).find(node => [StylesPreviewMenu, "BrowseStyles", "TypographyPreview", "ColoursPreview", "IdentityControls", "LayoutPreview"].includes(node.type)) : pane.props.children } };
  };
  let tree = render();
  for (const type of ["IdentityControls", "IdentityPreviewHeader", "IdentityPreviewTab"])
    assert.equal(all(tree).some(node => node.type === type), false, `${type} must not paint fixture defaults during a delayed read`);
  assert.equal(all(tree).filter(node => node.props?.["aria-busy"] === "true").length, 2);
  startupValues = identityState.createIdentityPreview().present;
  startupValues.global = { title: "Cached title", tagline: "Cached tagline" };
  tree = render();
  assert.equal(all(tree).find(node => node.type === "IdentityControls").props.values.global.title, "Cached title");
  assert.equal(all(tree).find(node => node.type === "fieldset").props.disabled, true);
  assert.equal(all(tree).find(node => node.type === "IdentityPreviewHeader").props.identity.title, "Cached title");
  const saved = identityState.createIdentityPreview().present;
  saved.global = { title: "Hydrated title", tagline: "Hydrated tagline" };
  hydrateIdentity({ type: "hydrate", values: saved });
  startupValues = null; hydrationReady = true; tree = render();
  assert.equal(all(tree).find(node => node.type === "IdentityControls").props.values.global.title, "Hydrated title");
  for (const type of ["IdentityPreviewHeader", "IdentityPreviewTab"])
    assert.equal(all(tree).find(node => node.type === type).props.identity.title, "Hydrated title");
  assert.equal(all(tree).some(node => node.props?.["aria-busy"] === "true"), false);
  for (const [label, icon] of Object.entries({ Identity: "site.identity", Styles: "view.styles", Pages: "view.single", Navigation: "navigation.compass", Patterns: "symbol.outline", Templates: "layout.template" })) {
    assert.equal(all(sectionButton(tree, label)).find(node => node.type === "AcmIcon").props.name, icon);
  }
  all(tree).find(node => node.type === "IdentityControls").props.onChange({ title: "Kept title" });
  sectionButton(tree, "Styles").props.onClick(); await new Promise(setImmediate); tree = render();
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

  sectionButton(tree, "Identity").props.onClick(); await new Promise(setImmediate); tree = render();
  assert.equal(settings(tree).props.label, "Site Editor Identity");
  assert.equal(settings(tree).props.style, undefined);
  assert.equal(all(tree).find(node => node.type === "IdentityControls").props.values.global.title, "Kept title");
  all(tree).find(node => node.type === "IdentityControls").props.onReset("title"); tree = render();
  assert.equal(all(tree).find(node => node.type === "IdentityControls").props.values.global.title, "Site Title");
  all(tree).find(node => node.type === "IdentityControls").props.onChange({ title: "", tagline: "" }); tree = render();
  all(tree).find(node => node.type === "IdentityControls").props.onReset("title");
  all(tree).find(node => node.type === "IdentityControls").props.onReset("tagline"); tree = render();
  assert.equal(all(tree).find(node => node.type === "IdentityControls").props.values.global.title, "Site Title");
  assert.equal(all(tree).find(node => node.type === "IdentityControls").props.values.global.tagline, "A short description of your site.");
  all(tree).find(node => node.type === "IdentityControls").props.onChange({ title: "Reset together", tagline: "Custom tagline" }); tree = render();
  all(tree).find(node => node.type === "IdentityControls").props.onResetAll(); tree = render();
  assert.equal(all(tree).find(node => node.type === "IdentityControls").props.values.global.title, "Site Title");
  assert.equal(all(tree).find(node => node.type === "IdentityControls").props.values.global.tagline, "A short description of your site.");
  sectionButton(tree, "Styles").props.onClick(); await new Promise(setImmediate); tree = render();
  assert.equal(settings(tree).props.children.type, StylesPreviewMenu, "returning to Styles from Identity opens the Styles home");
  settings(tree).props.children.props.onTypography(); tree = render();
  sectionButton(tree, "Styles").props.onClick(); await new Promise(setImmediate); tree = render();
  assert.equal(settings(tree).props.children.type, StylesPreviewMenu, "pressing the active Styles navigation returns from Typography to the Styles home");
  settings(tree).props.children.props.onTypography(); tree = render();
  settings(tree).props.children.props.onNavigate(current => ({ ...current, view: "preset" })); tree = render();
  sectionButton(tree, "Identity").props.onClick(); await new Promise(setImmediate); tree = render();
  sectionButton(tree, "Styles").props.onClick(); await new Promise(setImmediate); tree = render();
  assert.equal(settings(tree).props.children.type, StylesPreviewMenu, "returning to Styles from Identity exits nested Typography editors");
  all(tree).find(node => node.type === "select").props.onChange({ currentTarget: { value: "test" } });
  await new Promise(resolve => setImmediate(resolve)); tree = render();
  assert.equal(settings(tree).props.children.type, StylesPreviewMenu, "site scopes expose their own inherited Styles settings");
  let host = all(tree).find(node => node.type === "SiteHomeFrame"); assert.equal(host.props.site, "test");
  host.props.onEditing(true); tree = render();
  host = all(tree).find(node => node.type === "SiteHomeFrame");
  host.props.handleRef.current = { prepareLeave: async () => false };
  all(tree).find(node => node.type === "select").props.onChange({ currentTarget: { value: "test2" } });
  await new Promise(resolve => setImmediate(resolve)); tree = render();
  assert.equal(all(tree).find(node => node.type === "SiteHomeFrame").props.site, "test", "failed flush preserves current scope and editor");
  host = all(tree).find(node => node.type === "SiteHomeFrame");host.props.handleRef.current = { prepareLeave: async () => true };
  all(tree).find(node => node.type === "select").props.onChange({ currentTarget: { value: "test2" } });
  await new Promise(resolve => setImmediate(resolve)); tree = render();
  assert.equal(all(tree).find(node => node.type === "SiteHomeFrame").props.site, "test2");
  for (const target of ["test2", "test", "global"]) {
    all(tree).find(node => node.type === "select").props.onChange({ currentTarget: { value: target } });
    await new Promise(resolve => setImmediate(resolve)); tree = render();
    sectionButton(tree, "Styles").props.onClick(); await new Promise(setImmediate); tree = render();
    settings(tree).props.children.props.onLayout(); tree = render();
    const layout = settings(tree).props.children;
    assert.equal(layout.type, "LayoutPreview");
    assert.equal(layout.props.defaultPadding, target === "global" ? undefined : `0px ${canonicalStyleGuide.UNIVERSAL_STYLE_PRESET.layout.spacing}px`, `${target} reports its own renderer's padding fallback`);
  }
});
