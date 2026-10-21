import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createInterfaceStylePreset, styleGuideMarkdown, universalPreset } from "./style-test-presets.mjs";
import { parseStyleGuidePresets, updateStyleGuideTokensFromDraft, indexStyleGuide } from "../app/studio/ui/styles/style-guide-tokens.mjs";
import { loadProductionModule } from "./production-module.mjs";

const url = new URL("../app/studio/ui/styles/interface-style-inspection.tsx", import.meta.url);
const baseline = createInterfaceStylePreset();
const { InterfaceStyleSourceInspector } = await loadProductionModule(url);
const { InterfaceStyleSettings, interfaceStyleSectionFromHash } = await loadProductionModule(new URL("../app/studio/ui/styles/interface-style-settings.tsx", import.meta.url));
const noop = () => {};

test("source line numbers inherit readable source text, including selected and forced-colour states", () => {
  const css = readFileSync(new URL("../app/studio/ui/styles/canonical-source-lines.css", import.meta.url), "utf8");
  const gutter = css.match(/\.canonical-source-line-number\s*\{([^}]+)\}/)?.[1];
  assert.match(gutter, /color:\s*inherit\s*;/);
  assert.doesNotMatch(gutter, /secondary-text/);
});

test("inspector distinguishes saved values from drafts and locates them in the canonical guide", () => {
  const draft = structuredClone(baseline);
  draft.fields.radius = 8;
  const mapping = indexStyleGuide(styleGuideMarkdown, universalPreset, baseline).mappings["interface.fields.radius"];
  const html = renderToStaticMarkup(createElement(InterfaceStyleSourceInspector, {
    path: "fields.radius", pinned: true, baseline, draft,
    guideDocument: styleGuideMarkdown, mapping,
    onPin: noop, onClear: noop,
  }));
  assert.match(html, /Saved value<\/dt><dd>2/);
  assert.match(html, /Draft value<\/dt><dd>8 · Unsaved/);
  assert.match(html, new RegExp(`Line ${mapping.line}`));
  assert.match(html, /interface\.fields\.radius/);
  assert.doesNotMatch(html, /Preset JSON/);
  assert.match(html, /Clear selection/);
  const row = html.match(/<tr[^>]*>[\s\S]*?interface\.fields\.radius[\s\S]*?<\/tr>/)?.[0];
  assert.match(row, />8px</);
  assert.match(row, />2px</); // Original Default stays visible beside the draft.
  assert.match(html, /interface\.fields\.radius \| --acm-ui-field-radius \| 8px/);
  assert.match(styleGuideMarkdown, /interface\.fields\.radius \| --acm-ui-field-radius \| 2px/);
});

test("guide lines are available from the parsed Markdown even before a local save session loads", () => {
  const mapping = indexStyleGuide(styleGuideMarkdown, universalPreset, baseline).mappings["interface.fields.radius"];
  const html = renderToStaticMarkup(createElement(InterfaceStyleSourceInspector, {
    path: "fields.radius", pinned: false, baseline, draft: baseline, guideDocument: styleGuideMarkdown, mapping, onPin: noop, onClear: noop,
  }));
  assert.match(html, /Saved value/);
  assert.match(html, new RegExp(`Line ${mapping.line}`));
});

// Execute the production hook with a deterministic React state adapter.
function inspectionHarness() {
  const slots = [];
  let cursor = 0;
  const react = { useState(initial) {
    const index = cursor++;
    if (!(index in slots)) slots[index] = initial;
    return [slots[index], value => { slots[index] = value; }];
  }};
  const code = ts.transpileModule(readFileSync(url, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const require = name => name === "react" ? react : name === "./style-source-path" ? { styleSourcePathFromTarget: target => target?.path ?? null } : {};
  const { useInterfaceStyleInspection } = new Function("require", "exports", `${code}\nreturn exports;`)(require, {});
  return () => { cursor = 0; return useInterfaceStyleInspection(baseline); };
}

test("opt-in pointer inspection, keyboard focus and pinning preserve normal input actions", () => {
  const render = inspectionHarness();
  let inspection = render();
  const event = path => ({ target: { path } });
  assert.equal(inspection.enabled, false);
  inspection.events.onPointerOverCapture(event("fields.radius"));
  assert.equal(render().path, null);
  inspection.setEnabled(true);
  inspection = render();
  inspection.events.onPointerOverCapture(event("fields.radius"));
  inspection = render();
  assert.equal(inspection.path, "fields.radius");
  inspection.events.onPointerLeave();
  inspection = render();
  assert.equal(inspection.path, "fields.radius", "last source remains readable on the inspector");
  inspection.pin();
  inspection = render();
  assert.equal(inspection.pinned, "fields.radius");
  inspection.events.onPointerOverCapture(event("colours.primaryText"));
  inspection = render();
  assert.equal(inspection.path, "fields.radius", "a pin survives pointer movement over other controls");
  inspection.setEnabled(false);
  inspection = render();
  inspection.events.onFocusCapture(event("typography.header.size"));
  inspection = render();
  assert.equal(inspection.path, "typography.header.size", "keyboard inspection works with hover off");
  inspection.events.onClickCapture(event("typography.header.size"));
  inspection.events.onBlurCapture({ relatedTarget: null });
  inspection = render();
  assert.equal(inspection.pinned, null, "ordinary clicks never create a pin");
  inspection.clear();
  inspection = render();
  assert.equal(inspection.path, null);
  inspection.events.onClickCapture(event("unmapped.action"));
  assert.equal(render().path, null);
});


test("every setting in all five sections maps to a canonical leaf value", () => {
  const indexed = indexStyleGuide(styleGuideMarkdown, universalPreset, baseline).mappings;
  for (const section of ["colours", "typography", "fields", "buttons", "interactions"]) {
    const html = renderToStaticMarkup(createElement(InterfaceStyleSettings, {
      section, preset: baseline, baseline, disabled: false, inspectedPath: "fields.radius", onChange: noop, onReset: noop, onEndEdit: noop,
    }));
    const paths = [...html.matchAll(/data-style-path="([^"]+)"/g)].map(match => match[1]);
    assert.ok(paths.length);
    for (const path of paths) assert.ok(indexed[`interface.${path}`], `Unmapped setting ${path}`);
    if (section === "fields") assert.match(html, /data-source-selected="true"/);
  }
});

test("direct section links resolve only known interface sections", () => {
  assert.equal(interfaceStyleSectionFromHash("#interface-style-typography"), "typography");
  assert.equal(interfaceStyleSectionFromHash("#interface-style-fields"), "fields");
  assert.equal(interfaceStyleSectionFromHash("#interface-style-unknown"), "colours");
  assert.equal(interfaceStyleSectionFromHash(""), "colours");
});

test("full canonical source renders every saved line and highlights only the selected location", async () => {
  const { CanonicalSourceLines, canonicalSourceScrollTop } = await loadProductionModule(new URL("../app/studio/ui/styles/canonical-source-lines.tsx", import.meta.url));
  const lines = ['{', '  "radius": 2,', '  "label": "<script>unsafe</script>"', '}'];
  const html = renderToStaticMarkup(createElement(CanonicalSourceLines, { lines, activeLine: 2, idPrefix: "example" }));
  assert.equal((html.match(/data-source-line=/g) ?? []).length, lines.length);
  assert.equal((html.match(/aria-current="location"/g) ?? []).length, 1);
  assert.match(html, /id="example-line-2"[^>]*aria-current="location"/);
  assert.match(html, /&lt;script&gt;unsafe&lt;\/script&gt;/);
  assert.doesNotMatch(html, /contenteditable|<script>/i);
  assert.equal(canonicalSourceScrollTop({ top: 200 }, { top: 900, height: 20 }, 0, 400), 510);
  assert.equal(canonicalSourceScrollTop({ top: 200 }, { top: 210, height: 20 }, 0, 400), 0);
});

test("the source viewer contains the whole saved file before any setting is inspected", () => {
  const document = styleGuideMarkdown;
  const html = renderToStaticMarkup(createElement(InterfaceStyleSourceInspector, {
    path: null, pinned: false, baseline, draft: baseline,
    guideDocument: document,
    onPin: noop, onClear: noop,
  }));
  assert.match(html, /Full canonical Style Guide with line numbers/);
  assert.equal((html.match(/data-source-line=/g) ?? []).length, document.split("\n").length);
  assert.match(html, /Written Style Guide/);
  assert.match(html, /aria-label="Formatted Style Guide"/);
  assert.match(html, /aria-pressed="true">Formatted<\/button>/);
  assert.match(html, /aria-pressed="false">Markdown source<\/button>/);
  assert.match(html, /<h1><span>Workspace style guide<\/span><\/h1>/);
  assert.match(html, /<table>/);
  const formattedLines = [...html.matchAll(/id="sg-guide-formatted-line-(\d+)"/g)].map(match => Number(match[1]));
  assert.deepEqual(formattedLines, Array.from({ length: document.split("\n").length }, (_, index) => index + 1));
  assert.match(html, /workspace-governance\/STYLE_GUIDE\.md/);
  assert.doesNotMatch(html, /aria-current="location"/);
});

test("production inspection centres the selected line in either source view without moving focus or the page", async () => {
  const { canonicalSourceScrollTop } = await loadProductionModule(new URL("../app/studio/ui/styles/canonical-source-lines.tsx", import.meta.url));
  for (const view of ["formatted", "markdown"]) {
    const effects = [], scrolls = [], selected = [];
    const container = {
      scrollTop: 100, clientHeight: 300, getBoundingClientRect: () => ({ top: 200 }),
      querySelector(selector) { selected.push(selector); return { getBoundingClientRect: () => ({ top: 800, height: 20 }) }; },
      scrollTo(options) { scrolls.push(options); },
    };
    const jsx = (type, props) => ({ type, props });
    let selectedView = view;
    const react = { useState: () => [selectedView, value => { selectedView = value; }], useMemo: fn => fn(), useRef: () => ({ current: container }), useEffect: fn => effects.push(fn) };
    const code = ts.transpileModule(readFileSync(url, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
    const require = name => name === "react" ? react : name === "react/jsx-runtime" ? { jsx, jsxs: jsx } : name === "./canonical-source-lines" ? { canonicalSourceScrollTop } : name === "./style-guide-tokens.mjs" ? { parseStyleGuidePresets, updateStyleGuideTokensFromDraft } : {};
    const { InterfaceStyleSourceInspector: Inspector } = new Function("require", "exports", `${code}\nreturn exports;`)(require, {});
    const mapping = indexStyleGuide(styleGuideMarkdown, universalPreset, baseline).mappings["interface.fields.radius"];
    const render = () => Inspector({ path: "fields.radius", pinned: false, baseline, draft: baseline, guideDocument: styleGuideMarkdown,
      mapping, onPin: noop, onClear: noop });
    const nodes = node => !node || typeof node !== "object" ? [] : [node, ...[node.props?.children].flat(Infinity).flatMap(nodes)];
    const tree = nodes(render());
    const formatted = tree.find(node => node.type === "button" && node.props.children === "Formatted");
    const markdown = tree.find(node => node.type === "button" && node.props.children === "Markdown source");
    assert.equal(formatted.props["aria-pressed"], view === "formatted");
    assert.equal(markdown.props["aria-pressed"], view === "markdown");
    effects.forEach(effect => effect());
    const selector = view === "formatted" ? `[id="sg-guide-formatted-line-${mapping.line}"]` : `[data-source-line="${mapping.line}"]`;
    assert.deepEqual(selected, [selector]);
    assert.deepEqual(scrolls, [{ top: 560, behavior: "auto" }]);
    const other = view === "formatted" ? markdown : formatted;
    other.props.onClick();
    const next = nodes(render());
    assert.equal(next.find(node => node.type === "button" && node.props.children === other.props.children).props["aria-pressed"], true);
    const rawRegion = next.find(node => node.props?.["aria-label"] === "Full canonical Style Guide with line numbers");
    assert.equal(rawRegion.props["aria-hidden"], selectedView !== "markdown");
    assert.equal(rawRegion.props.tabIndex, selectedView === "markdown" ? 0 : -1);
  }
});

test("clicking an editable setting does not trap enabled hover inspection", () => {
  const render = inspectionHarness();
  let inspection = render();
  inspection.setEnabled(true);
  inspection = render();
  inspection.events.onFocusCapture({ target: { path: "fields.radius" } });
  inspection.events.onClickCapture({ target: { path: "fields.radius" } });
  inspection = render();
  assert.equal(inspection.pinned, null);
  inspection.events.onPointerOverCapture({ target: { path: "typography.header.size" } });
  assert.equal(render().path, "typography.header.size");
});

test("explicit source pins release through Escape or toggling hover inspection", () => {
  const render = inspectionHarness();
  let inspection = render();
  inspection.setEnabled(true);
  inspection = render();
  inspection.events.onFocusCapture({ target: { path: "fields.radius" } });
  inspection = render();
  inspection.pin();
  inspection = render();
  assert.equal(inspection.pinned, "fields.radius");
  inspection.events.onKeyDownCapture({ key: "Escape" });
  inspection = render();
  assert.equal(inspection.pinned, null);
  inspection.events.onPointerOverCapture({ target: { path: "colours.primaryText" } });
  inspection = render();
  assert.equal(inspection.path, "colours.primaryText");
  inspection.pin();
  inspection = render();
  inspection.setEnabled(false);
  inspection = render();
  assert.equal(inspection.pinned, null);
  inspection.setEnabled(true);
  inspection = render();
  inspection.events.onPointerOverCapture({ target: { path: "fields.radius" } });
  assert.equal(render().path, "fields.radius");
});

test("each interface property has its own exact source row, value and original default", () => {
  const paths = ["buttons.base.background", "buttons.base.foreground", "buttons.base.border", "buttons.base.borderWidth", "typography.control.family", "typography.control.size", "typography.control.weight", "interactions.buttons.treatment", "interactions.buttons.foreground", "interactions.buttons.background"];
  const mappings = indexStyleGuide(styleGuideMarkdown, universalPreset, baseline).mappings;
  const lines = paths.map(path => mappings[`interface.${path}`].line);
  assert.equal(new Set(lines).size, paths.length);
  for (const path of paths) {
    const mapping = mappings[`interface.${path}`];
    assert.equal(mapping.rowPath, `interface.${path}`);
    assert.equal(mapping.excerpt.split("|")[1].trim(), `interface.${path}`);
    assert.equal(mapping.excerpt.split("|").slice(1, -1).length, 5);
    const html = renderToStaticMarkup(createElement(InterfaceStyleSourceInspector, { path, pinned: false, baseline, draft: baseline, guideDocument: styleGuideMarkdown, mapping, onPin: noop, onClear: noop }));
    assert.match(html, new RegExp(`id="sg-guide-formatted-line-${mapping.line}"[^>]*class="[^"]*is-current-row`));
    assert.match(html, new RegExp(`data-source-line="${mapping.line}"[^>]*aria-current="location"`));
  }
});
