import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";
import * as tokens from "../app/studio/ui/styles/style-guide-tokens.mjs";
import { styleGuideMarkdown } from "./style-test-presets.mjs";
import { loadProductionModule } from "./production-module.mjs";
import * as styles from "@acm/styles";

const parsed = tokens.parseStyleGuidePresets(styleGuideMarkdown);
const websiteHistory = await loadProductionModule(new URL("../app/studio/ui/styles/style-preset-history.ts", import.meta.url));
const interfaceHistory = await loadProductionModule(new URL("../app/studio/ui/styles/interface-style-history.ts", import.meta.url));
const selection = await loadProductionModule(new URL("../app/studio/ui/styles/style-guide-selection.ts", import.meta.url));
const nodes = node => !node || typeof node !== "object" ? [] : Array.isArray(node) ? node.flatMap(nodes) : [node, ...nodes(node.props?.children)];

function sandbox(scope, panel) {
  const interfaceScope = scope === "interface";
  const saved = structuredClone(interfaceScope ? parsed.interfacePreset : parsed.universalPreset);
  if (interfaceScope) saved.colours.label = "#123456";
  else saved.palette.accent = "#123456";
  const guide = tokens.updateStyleGuideTokensFromDraft(styleGuideMarkdown, interfaceScope ? parsed.universalPreset : saved, interfaceScope ? saved : parsed.interfacePreset);
  const source = { document: guide, ...tokens.indexStyleGuide(guide, parsed.universalPreset, parsed.interfacePreset) };
  let history = { past: [], present: saved, future: [] };
  const reducer = interfaceScope ? interfaceHistory.interfaceStyleHistoryReducer : websiteHistory.stylePresetHistoryReducer;
  const react = {
    useState: initial => [panel && initial === "typography" ? panel : initial === true ? false : initial === null ? { preset: saved, source } : initial, () => {}],
    useReducer: fn => fn === selection.styleGuideSelectionReducer ? [selection.initialStyleGuideSelection, () => {}] : [history, action => { history = reducer(history, action); }],
    useMemo: fn => fn(), useCallback: fn => fn, useEffect() {}, useRef: current => ({ current }),
    useSyncExternalStore: () => "colours", forwardRef: fn => fn,
  };
  const canonical = { STYLE_GUIDE_MARKDOWN: guide, INTERFACE_STYLE_PRESET: saved, UNIVERSAL_STYLE_PRESET: saved, BUNDLED_STYLE_GUIDE_SOURCE: source, createUniversalStylePreset: () => saved };
  const jsx = (type, props) => ({ type, props });
  const require = name => name === "react" ? react : name === "react/jsx-runtime" ? { jsx, jsxs: jsx } : name === "@acm/styles" ? styles : name.endsWith("style-guide-tokens.mjs") ? tokens : name.endsWith("canonical-style-guide") ? canonical : name.endsWith("style-preset-history") ? websiteHistory : name.endsWith("style-guide-selection") ? selection : name.endsWith("interface-style-history") ? interfaceHistory : name.endsWith("interface-style-inspection") ? { useInterfaceStyleInspection: () => ({ events: {} }) } : name.endsWith("interface-style-settings") ? { interfaceStyleSections: [{ id: "colours" }] } : {};
  const file = interfaceScope ? "interface-style-sandbox.tsx" : "style-guide-sandbox.tsx";
  const code = ts.transpileModule(readFileSync(new URL(`../app/studio/ui/styles/${file}`, import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const loaded = new Function("require", "exports", `${code}\nreturn exports;`)(require, {});
  const render = () => nodes((interfaceScope ? loaded.InterfaceStyleSandbox : loaded.StyleGuideSandbox)({}));
  return { saved, render, get history() { return history; }, dispatch: action => { history = reducer(history, action); } };
}

for (const scope of ["website", "interface"]) test(`${scope} Reset All restores originals after a saved customisation and remains undoable`, () => {
  const app = sandbox(scope);
  const reset = app.render().find(node => [node.props?.children].flat().includes("Reset All"));
  assert.ok(reset);
  assert.equal(Boolean(reset.props.disabled), false);
  reset.props.onClick();
  assert.deepEqual(app.history.present, scope === "website" ? parsed.originalUniversalPreset : parsed.originalInterfacePreset);
  app.dispatch({ type: "undo" });
  assert.deepEqual(app.history.present, app.saved);
  app.dispatch({ type: "redo" });
  assert.deepEqual(app.history.present, scope === "website" ? parsed.originalUniversalPreset : parsed.originalInterfacePreset);
});


for (const scope of ["website", "interface"]) test(`${scope} individual and section resets use original values after save`, () => {
  const app = sandbox(scope, "palette");
  let tree = app.render();
  if (scope === "interface") {
    const settings = tree.find(node => node.props?.onReset && node.props?.preset);
    assert.deepEqual(settings.props.baseline, parsed.originalInterfacePreset);
    settings.props.onReset("colours.label");
    assert.equal(app.history.present.colours.label, parsed.originalInterfacePreset.colours.label);
  } else {
    tree.find(node => node.props?.["aria-label"] === "Reset Accent colour").props.onClick();
    assert.equal(app.history.present.palette.accent, parsed.originalUniversalPreset.palette.accent);
  }
  app.dispatch({ type: "undo" });
  tree = app.render();
  const section = tree.find(node => /Reset section/i.test(typeof node.props?.children === "string" ? node.props.children : ""));
  assert.ok(section);
  assert.equal(Boolean(section.props.disabled), false);
  section.props.onClick();
  assert.deepEqual(scope === "interface" ? app.history.present.colours : app.history.present.palette, scope === "interface" ? parsed.originalInterfacePreset.colours : parsed.originalUniversalPreset.palette);
  app.dispatch({ type: "undo" });
  assert.deepEqual(app.history.present, app.saved);
});
