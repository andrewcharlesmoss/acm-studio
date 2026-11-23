import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import test from "node:test";
import { interfaceStyleHistoryReducer } from "../app/studio/ui/styles/interface-style-history.ts";
import { unrepresentedFormattedGuideLines } from "../app/studio/ui/styles/formatted-guide-lines.ts";
import { createInterfaceStylePreset, styleGuideMarkdown } from "./style-test-presets.mjs";
import { parseStyleGuidePresets } from "../app/studio/ui/styles/style-guide-tokens.mjs";
import { createStyleGuideSource } from "../scripts/style-guide-source.mjs";

const root = path.resolve(import.meta.dirname, "..");
const projects = path.resolve(root, "..");
const guidePath = path.join(projects, "workspace-governance/STYLE_GUIDE.md");
const parsed = parseStyleGuidePresets(styleGuideMarkdown);
const preset = parsed.universalPreset;
const interfacePreset = parsed.interfacePreset;
const revision = execFileSync("git", ["-C", path.dirname(guidePath), "log", "-1", "--format=%H", "--", "STYLE_GUIDE.md"], { encoding: "utf8" }).trim();
const committed = execFileSync("git", ["-C", path.dirname(guidePath), "show", "HEAD:STYLE_GUIDE.md"], { encoding: "utf8" });
const source = createStyleGuideSource(styleGuideMarkdown, preset, interfacePreset, revision, styleGuideMarkdown !== committed);

test("bundled Style Guide matches canonical source with explicit working-tree provenance", () => {
  const guide = fs.readFileSync(guidePath, "utf8").replace(/\r\n/g, "\n");
  const revision = execFileSync("git", ["-C", path.dirname(guidePath), "log", "-1", "--format=%H", "--", "STYLE_GUIDE.md"], { encoding: "utf8" }).trim();
  assert.equal(source.document, guide);
  assert.equal(source.sourceRevision, revision);
  assert.equal(source.sourceDigest, crypto.createHash("sha256").update(guide).digest("hex"));
  assert.equal(source.sourcePath, "workspace-governance/STYLE_GUIDE.md");
  const committed = execFileSync("git", ["-C", path.dirname(guidePath), "show", "HEAD:STYLE_GUIDE.md"], { encoding: "utf8" });
  assert.equal(source.sourceWorkingTree, guide !== committed);
});

test("every preset property and text specimen has a precise guide line", () => {
  const lines = source.document.split("\n");
  const expectedPaths = [
    ...Object.keys(preset.palette).map(key => `palette.${key}`),
    ...Object.entries(preset.typography).flatMap(([role, style]) => collectPaths(style, `typography.${role}`)),
    ...Object.entries(preset.buttons).flatMap(([role, style]) => collectPaths(style, `buttons.${role}`)),
    ...Object.keys(preset.interactions).map(key => `interactions.${key}`),
    ...Object.keys(preset.layout).map(key => `layout.${key}`),
    ...Object.keys(interfacePreset.colours).map(key => `interface.colours.${key}`),
    ...Object.entries(interfacePreset.typography).flatMap(([role, style]) => collectPaths(style, `interface.typography.${role}`)),
    ...collectPaths(interfacePreset.fields, "interface.fields"),
    ...Object.entries(interfacePreset.buttons).flatMap(([role, style]) => collectPaths(style, `interface.buttons.${role}`)),
    ...Object.keys(interfacePreset.interactions).flatMap(key => [`interface.interactions.${key}.treatment`, `interface.interactions.${key}.foreground`, `interface.interactions.${key}.background`]),
    "specimen.link", "specimen.unordered-list", "specimen.ordered-list", "specimen.quote",
  ];

  for (const stylePath of expectedPaths) {
    const mapping = source.mappings[stylePath];
    assert.ok(mapping, `missing source mapping for ${stylePath}`);
    assert.equal(lines[mapping.line - 1], mapping.excerpt, `incorrect excerpt line for ${stylePath}`);
    assert.ok(mapping.heading, `missing section name for ${stylePath}`);
    assert.match(mapping.excerpt, /^\| /);
  }
});

test("the parser reads the complete live guide and reports malformed token rows clearly", () => {
  assert.deepEqual(parseStyleGuidePresets(styleGuideMarkdown), parsed);
  const broken = styleGuideMarkdown.replace(/\| interface\.buttons\.base\.background \|[^\n]+/, "| interface.buttons.base.background | --acm-ui-button-base-background | invalid | Primary interface action |");
  assert.throws(() => parseStyleGuidePresets(broken), /STYLE Guide|Style Guide line .*malformed token row “interface\.buttons\.base\.background”/i);
  assert.throws(() => parseStyleGuidePresets(styleGuideMarkdown.replace(/\| palette\.accent \|[^\n]+\n/, "")), /missing required token row “palette\.accent”/);
});

test("button normal and hover text colours are documented and editable in the Styles preview", () => {
  const guide = source.document;
  const component = ["style-guide-sandbox.tsx", "formatted-guide-document.tsx"].map(file => fs.readFileSync(path.join(root, "app/studio/ui/styles", file), "utf8")).join("\n");
  const styles = fs.readFileSync(path.join(root, "app/studio/ui/style-guide.css"), "utf8");
  const presetStyles = fs.readFileSync(new URL(import.meta.resolve("@andrewcharlesmoss/styles/styles.css")), "utf8");

  assert.match(guide, /\| Preset path \| Background \| Text colour \| Border \| Border width \| Hover background \| Hover text colour \|/);
  assert.match(guide, /Each button variant has separately editable text colours for its normal and\s+hover states\./);
  for (const role of ["base", "secondary", "outline"]) {
    assert.match(guide, new RegExp(`\\| buttons\\.${role} \\|`));
    assert.match(component, new RegExp(`\\{ id: "${role}", label: "${role[0].toUpperCase()}${role.slice(1)}" \\}`));
  }
  assert.match(component, /\["foreground", "Text colour"\]/);
  assert.match(component, /\["hoverForeground", "Hover text colour"\]/);
  assert.match(component, /stylePath=\{`buttons\.\$\{buttonRole\}\.\$\{key\}`\}/);
  assert.match(component, /onChange=\{value => updateButton\(key, value\)\}/);
  assert.match(component, /buttons: \{ \.\.\.current\.buttons, \[buttonRole\]: \{ \.\.\.current\.buttons\[buttonRole\], \[key\]: value \} \}/);
  assert.match(component, /style=\{variables\}/);
  assert.match(presetStyles, /color:\s*var\(--acm-button-base-foreground/);
  assert.match(presetStyles, /:is\(button, \.acm-button\):hover\s*\{[^}]*color:\s*var\(--acm-button-base-hover-foreground/);
  assert.match(styles, /\.sg-preview \.acm-button-secondary:hover\s*\{[^}]*color:\s*var\(--acm-button-secondary-hover-foreground\)/);
  assert.match(styles, /\.sg-preview \.acm-button-outline:hover\s*\{[^}]*color:\s*var\(--acm-button-outline-hover-foreground\)/);
  assert.match(component, /aria-label=\{`Reset \$\{label\}`\}/);
});

test("the source viewer remains read-only and does not use browser storage", () => {
  const component = ["style-guide-sandbox.tsx", "formatted-guide-document.tsx"].map(file => fs.readFileSync(path.join(root, "app/studio/ui/styles", file), "utf8")).join("\n");
  assert.doesNotMatch(component, /localStorage|sessionStorage|indexedDB/);
  assert.match(component, /onFocusCapture/);
  assert.match(component, /onPointerOverCapture/);
  assert.match(component, /onClickCapture/);
  const resetAllStart = component.indexOf("function resetAll()");
  const resetAllEnd = component.indexOf("function setPaletteColour", resetAllStart);
  assert.notEqual(resetAllStart, -1, "Reset All handler exists");
  assert.notEqual(resetAllEnd, -1, "Reset All handler has a bounded body");
  const resetAll = component.slice(resetAllStart, resetAllEnd);
  assert.doesNotMatch(resetAll, /setPanel\(/, "Reset All preserves the selected settings tab");
  assert.match(resetAll, /setMobilePanel\("settings"\)/);
  assert.match(resetAll, /dispatchSelection\(\{ type: "clear-all" \}\)/);
  assert.match(resetAll, /setGuideQuery\(""\)/);
  assert.match(resetAll, /setGuideMatchIndex\(0\)/);
  assert.match(resetAll, /setGuideJumpLine\(null\)/);
  assert.match(resetAll, /hasSourceInteraction\.current = false/);
});

test("canonical guide provenance stays at the top of the source panel", () => {
  const component = ["style-guide-sandbox.tsx", "formatted-guide-document.tsx"].map(file => fs.readFileSync(path.join(root, "app/studio/ui/styles", file), "utf8")).join("\n");
  const styles = fs.readFileSync(path.join(root, "app/studio/ui/style-guide.css"), "utf8");
  const headingIndex = component.indexOf('className="sg-guide-heading"');
  const provenanceIndex = component.indexOf('className="sg-guide-source-meta"');
  const sourceDetailIndex = component.indexOf('<section className="sg-source-detail"');

  assert.ok(headingIndex >= 0 && provenanceIndex > headingIndex && provenanceIndex < sourceDetailIndex);
  assert.match(component, /workspace-governance\/STYLE_GUIDE\.md\{sourceDigest \?/);
  assert.doesNotMatch(component, /sg-guide-footer/);
  assert.match(styles, /\.sg-guide-source-meta \{ margin: \.25rem 0 0; color: var\(--rl-muted\); font-size: \.8125rem; overflow-wrap: anywhere; \}/);
});

test("the written guide defaults to formatted Markdown with an accessible source toggle", () => {
  const component = ["style-guide-sandbox.tsx", "formatted-guide-document.tsx"].map(file => fs.readFileSync(path.join(root, "app/studio/ui/styles", file), "utf8")).join("\n");
  const styles = fs.readFileSync(path.join(root, "app/studio/ui/style-guide.css"), "utf8");
  assert.match(component, /useState<GuideView>\("formatted"\)/);
  assert.match(component, /aria-label="Written guide display"/);
  assert.match(component, />Formatted<\/button>/);
  assert.match(component, />Markdown source<\/button>/);
  assert.match(component, /<FormattedGuideDocument\s+ref=\{formattedGuideRef\}\s+lines=\{lines\}\s+query=\{query\}\s+activeLine=\{activeLine\}/);
  assert.match(component, /aria-label="Full Style Guide Markdown source with line numbers"/);
  assert.match(component, /sg-guide-(?:formatted|markdown)-line-\$\{(?:row\.line|lineNumber)\}/);
  assert.match(component, /<table className="sg-formatted-source-table"><thead>/);
  assert.match(component, /<List>\{block\.items\.map/);
  assert.match(component, /block\.lines\.some\(item => item\.line === activeLine\)/);
  assert.match(component, /item\.continuations\.some\(continuation => continuation\.line === activeLine\)/);
  assert.match(component, /aria-current=\{activeLine === row\.line \? "location" : undefined\}/);
  assert.match(styles, /\.sg-guide-view-switch button\[aria-pressed="true"\]/);
  assert.match(styles, /\.sg-formatted-table th, \.sg-formatted-table td/);
  assert.match(component, /className="sg-formatted-line" aria-label=\{`Source line \$\{block\.line\}`\}>\{block\.line\}<\/span>/);
  assert.match(styles, /\.sg-formatted-block \{ --sg-formatted-content-indent: 0rem; display: grid; grid-template-columns: minmax\(var\(--sg-source-number-track\), max-content\) minmax\(0, 1fr\);/);
  assert.match(styles, /\.sg-formatted-block > \.sg-formatted-line \{ grid-column: 1; grid-row: 1; align-self: start; justify-self: stretch; margin: 0;/);
  assert.match(component, /<span data-guide-line=\{item\.line\} className="sg-formatted-source-line">/);
  assert.match(component, /<span className="visually-hidden">Source line \{item\.line\}\.\s*<\/span>/);
  assert.doesNotMatch(styles, /\.sg-formatted-line \{[^}]*transform: translateY\(2px\)/);
  assert.match(styles, /\.sg-formatted-blank, \.sg-formatted-rule \{ min-height: calc\(\.8125rem \* 1\.4\); \}/);
  assert.match(styles, /content: attr\(data-guide-line\)/);
  assert.match(component, /if \(!text\) \{ blocks\.push\(\{ type: "blank", line \}\); index\+\+; continue; \}/);
  assert.match(component, /separatorLine: separator\?\.line \?\? null/);
  assert.match(component, /className="sg-formatted-table-separator"/);
  assert.match(styles, /\.sg-guide-formatted \.sg-formatted-source-line\[data-guide-line\] \{ display: block; \}/);
  assert.match(component, /className=\{`sg-guide-document sg-guide-markdown/);
  assert.match(component, /<CanonicalSourceLines lines=\{lines\} activeLine=\{activeLine\} query=\{query\} idPrefix="sg-guide-markdown"/);
  const lineStyles = fs.readFileSync(path.join(root, "app/studio/ui/styles/canonical-source-lines.css"), "utf8");
  assert.match(lineStyles, /\.canonical-source-lines \{/);
  assert.doesNotMatch(styles, /\.sg-guide-document ol \{/);
});

test("formatted guide numbering keeps gaps explicit and shares one unindented gutter", () => {
  const blocks = [
    { type: "heading", line: 1 },
    { type: "paragraph", line: 3, lines: [{ line: 3 }] },
    { type: "list", line: 5, items: [{ line: 5, continuations: [{ line: 6 }] }] },
    { type: "table", line: 8, separatorLine: 9, rows: [{ line: 10 }] },
  ];
  assert.deepEqual(unrepresentedFormattedGuideLines(blocks, 11), [2, 4, 7, 11]);

  const component = ["style-guide-sandbox.tsx", "formatted-guide-document.tsx"].map(file => fs.readFileSync(path.join(root, "app/studio/ui/styles", file), "utf8")).join("\n");
  const styles = fs.readFileSync(path.join(root, "app/studio/ui/style-guide.css"), "utf8");
  assert.match(component, /unrepresentedFormattedGuideLines\(blocks, lines\.length\)/);
  assert.match(component, /sg-formatted-source-fallback/);
  assert.match(component, /sg-formatted-table-fallback/);
  assert.doesNotMatch(component, /sg-guide-hidden-anchor/);
  assert.match(styles, /--sg-formatted-content-indent: 2\.5rem/);
  assert.match(styles, /\.sg-guide-formatted ul, \.sg-guide-formatted ol \{ margin: \.15rem 0 \.85rem; padding-inline-start: 2\.5rem; \}/);
  assert.match(styles, /--sg-formatted-content-indent: \.9375rem/);
  const sourceStyles = fs.readFileSync(path.join(root, "app/studio/ui/styles/canonical-source-lines.css"), "utf8");
  assert.match(sourceStyles, /--sg-source-number-width: 2rem;[^}]*--sg-source-number-gap: 0rem; --sg-source-inset: \.5rem/);
  assert.match(sourceStyles, /grid-template-columns: var\(--sg-source-number-track\)/);
  assert.match(styles, /padding: \.5rem var\(--sg-source-inset\)/);
  assert.doesNotMatch(styles, /--sg-source-number-width:/);
});

test("colour swatches preserve readable text on hover and keyboard focus", () => {
  const styles = fs.readFileSync(path.join(root, "app/studio/ui/style-guide.css"), "utf8");
  assert.match(styles, /\.acm-universal-style-preset \.sg-swatch:is\(:hover, :focus-visible:where\(html:not\(\[data-studio-focus-visible="false"\]\) \*\)\)\s*\{[^}]*background:\s*var\(--acm-color-surface\)[^}]*color:\s*var\(--acm-color-text-primary\)/);
});

function collectPaths(value, prefix) {
  return Object.entries(value).flatMap(([key, nested]) => {
    const current = `${prefix}.${key}`;
    return nested && typeof nested === "object" && !Array.isArray(nested)
      ? [current, ...collectPaths(nested, current)]
      : [current];
  });
}


test("interface preset selection and neutral hover stay separate from website Styles", () => {
  const component = fs.readFileSync(path.join(root, "app/studio/ui/styles/interface-style-settings.tsx"), "utf8");
  const stylesheet = fs.readFileSync(path.join(root, "app/studio/ui/style-guide.css"), "utf8");
  const runtime = fs.readFileSync(path.join(root, "app/studio/ui/styles/shared-style-runtime.tsx"), "utf8");
  assert.ok(source.mappings["interface.colours.selection"]);
  assert.ok(source.mappings["interface.interactions.neutralRows.treatment"]);
  assert.match(component, /"selection", label: "Interface Selection"/);
  assert.match(component, /neutralRows: "Neutral menu and list rows"/);
  assert.match(stylesheet, /\.acm-universal-style-preset \.sg-swatch\s*\{[^}]*background:\s*var\(--acm-color-surface\)/);
  assert.match(stylesheet, /\.acm-universal-style-preset \.sg-swatch:is\(:hover, :focus-visible[^}]*border-color:\s*var\(--acm-color-accent\)/);
  assert.match(runtime, /validateUniversalStylePreset\(websiteSource\.preset\)/);
  assert.match(runtime, /validateInterfaceStylePreset\(interfaceSource\.preset\)/);
  assert.match(runtime, /request !== epoch/);
  assert.match(runtime, /client.load\(websiteSessionToken.current\)/);
  assert.match(runtime, /websiteSessionToken.current = websiteSource.token/);
  assert.match(runtime, /if \(reading\) \{ queued = true; epoch\+\+/);
  assert.match(runtime, /BroadcastChannel\("studio-shared-styles-refresh"\)/);
  assert.doesNotMatch(runtime, /localStorage|sessionStorage/);
});

test("interface header typography controls affect the complete shared header", () => {
  const header = fs.readFileSync(path.join(root, "app/studio/studio-app-header.css"), "utf8");
  assert.match(header, /--studio-ui-font:\s*var\(--acm-ui-font-header/);
  assert.match(header, /font-size:\s*var\(--studio-ui-size/);
  assert.match(header, /font:\s*var\(--acm-ui-weight-header[^;]*var\(--acm-ui-size-header/);
  assert.match(header, /:is\(button, \.button-primary, \.button-secondary\)\s*\{[^}]*font-size:\s*var\(--acm-ui-size-header/);
  assert.match(header, /\.studio-app-header \.studio-state, \.studio-app-header \.studio-save-status\s*\{\s*font-size:\s*\.8125rem/);
});

test("shared panes inherit interface surfaces, borders, text, typography and neutral hover", () => {
  const panes = fs.readFileSync(path.join(root, "app/studio/panes/pane-components.css"), "utf8");
  const layout = fs.readFileSync(path.join(root, "app/layout.tsx"), "utf8");
  for (const variable of ["--acm-ui-color-border", "--acm-ui-color-primary-text", "--acm-ui-color-secondary-text", "--acm-ui-hover-neutral-rows-background", "--acm-ui-font-control", "--acm-ui-size-control"]) assert.ok(panes.includes(variable));
  assert.match(layout, /"--studio-pane-surface": interfaceStyleTokens\["--acm-ui-color-surface"\]/);
  assert.match(layout, /"--studio-pane-border": interfaceStyleTokens\["--acm-ui-color-border"\]/);
});


test("block selection has its own editable, mapped interaction colour and shared geometry", () => {
  assert.ok(source.mappings["interactions.blockSelectionColour"]);
  const interfaceComponent = fs.readFileSync(new URL("../app/studio/ui/styles/interface-style-settings.tsx", import.meta.url), "utf8");
  assert.ok(source.mappings["interface.colours.blockSelection"]);
  assert.match(interfaceComponent, /blockSelection/);
  const css = fs.readFileSync(new URL("../app/studio/studio.css", import.meta.url), "utf8");
  assert.match(css, /:is\(\.canvas-block\.is-selected, \[data-studio-selected="true"\]\).*::before/);
  assert.match(css, /border: 1px solid var\(--acm-ui-color-block-selection, #FF383C\);\s*border-radius: 0;/);
  assert.match(css, /pointer-events: none;\s*position: absolute;/);
  assert.doesNotMatch(css, /outline: 1px solid var\(--acm-color-alert/);
});

test("interface draft reset, Undo and Redo stay in the independent interface history", () => {
  const original = createInterfaceStylePreset();
  let history = { past: [], present: original, future: [] };
  const changed = structuredClone(original);
  changed.colours.label = "#000000";
  history = interfaceStyleHistoryReducer(history, { type: "change", editKey: "colours.label", update: () => changed });
  assert.equal(history.present.colours.label, "#000000");
  assert.equal(history.past.length, 1);
  history = interfaceStyleHistoryReducer(history, { type: "undo" });
  assert.equal(history.present.colours.label, original.colours.label);
  history = interfaceStyleHistoryReducer(history, { type: "redo" });
  assert.equal(history.present.colours.label, "#000000");
  history = interfaceStyleHistoryReducer(history, { type: "load", preset: original });
  assert.deepEqual(history, { past: [], present: original, future: [] });
});

test("website previews and authored buttons use website typography tokens", () => {
  const preview = fs.readFileSync(new URL("../app/studio/site-editor/site-editor-preview.css", import.meta.url), "utf8");
  const book = fs.readFileSync(new URL("../app/studio/site-editor/style-book.css", import.meta.url), "utf8");
  const button = fs.readFileSync(new URL("../app/studio/templates.css", import.meta.url), "utf8").split("\n").find(line => line.startsWith(".template-surface .content-button {"));
  assert.match(preview, /\.site-editor-preview \{[^}]*--acm-ui-font-control/);
  assert.match(preview, /\.site-identity-page \{[^}]*--acm-type-body-family/);
  assert.match(preview, /\.site-style-preview \{[^}]*--site-style-body-family/);
  assert.match(book, /\.site-style-book \{[^}]*--acm-type-body-family/);
  assert.match(book, /quote-citation[^}]*--acm-type-metadata-size/);
  assert.match(button, /--acm-type-button-family/);
  assert.match(button, /--acm-type-button-size/);
  assert.doesNotMatch(button, /--studio-ui-font|--studio-ui-size/);
});


test("Styles hover inspection is opt-in and never suppresses deliberate inspection", () => {
  const component = ["style-guide-sandbox.tsx", "formatted-guide-document.tsx"].map(file => fs.readFileSync(path.join(root, "app/studio/ui/styles", file), "utf8")).join("\n");
  assert.match(component, /\[hoverInspection, setHoverInspection\] = useState\(false\)/);
  assert.match(component, /const previewPath = event\.target instanceof Element && event\.target\.closest\("\.sg-preview"\) \? mappedPath : null;/);
  assert.match(component, /dispatchSelection\(\{ type: "hover-preview", path: previewPath \}\)/);
  assert.match(component, /<ToggleSetting label="Hover Inspection" checked=\{hoverInspection\} onChange=\{changeHoverInspection\}/);
  for (const handler of ["handleSourcePointer", "hoverGuideSource", "clearGuideHover"]) {
    assert.match(component, new RegExp(`function ${handler}\\([^)]*\\) \\{\\s*if \\(!hoverInspection\\) return;`));
  }
  const toggle = component.slice(component.indexOf("  function changeHoverInspection("), component.indexOf("  function handleSourcePointer("));
  assert.match(toggle, /dispatchSelection\(\{ type: "clear-hover" \}\)/);
  assert.match(toggle, /hasSourceInteraction\.current = false/);
  assert.match(toggle, /guideScrollSyncSuspended\.current = false/);
  assert.doesNotMatch(toggle, /setPinnedSourcePath|setFocusedSourcePath|setGuideQuery|setPreset/);
  assert.match(component, /dispatchSelection\(\{ type: "pin-source", path \}\)/);
  for (const handler of ["handleSourceFocus", "pinSource", "selectGuideSource"]) {
    const start = component.indexOf(`  function ${handler}(`);
    const body = component.slice(start, component.indexOf("\n  function ", start + 1));
    assert.doesNotMatch(body, /if \(!hoverInspection\)/);
  }
  assert.match(component, /Enable Hover Inspection to inspect rules by hovering/);
});

test("the Markdown parser builds executable presets from all current governance token tables", () => {
  const guide = styleGuideMarkdown;
  const parsed = parseStyleGuidePresets(guide);
  assert.deepEqual(parsed.universalPreset, preset);
  assert.deepEqual(parsed.interfacePreset, interfacePreset);
  const rows = guide.split("\n").filter(line => line.startsWith("| ")).map(line => line.split("|").slice(1, -1).map(cell => cell.trim()));
  const rowFor = presetPath => {
    const row = rows.find(cells => cells[0] === presetPath);
    assert.ok(row, "missing guide source row: " + presetPath);
    return row;
  };
  const cssColourNames = Object.fromEntries(Object.keys(preset.palette).map(key => [key, key.replace(/[A-Z]/g, char => "-" + char.toLowerCase())]));
  for (const [key, cssName] of Object.entries(cssColourNames)) {
    const row = rowFor("palette." + key);
    assert.equal(row[3], preset.palette[key], "guide colour value drift: " + key);
    assert.equal(row[1], "--acm-color-" + cssName, "guide colour property drift: " + key);
  }
  for (const [key, style] of Object.entries(preset.typography)) {
    const row = rowFor("typography." + key);
    assert.equal(row[1].toLowerCase(), "inter", "guide font family drift: " + key);
    assert.equal(row[2], style.size.desktop.value + style.size.desktop.unit, "guide font size drift: " + key);
    assert.equal(Number(row[3]), style.weight, "guide font weight drift: " + key);
    assert.equal(row[4], style.style, "guide font style drift: " + key);
    assert.equal(Number(row[5]), style.lineHeight.desktop.value, "guide line height drift: " + key);
    assert.equal(row[6], style.letterSpacing.desktop.value + style.letterSpacing.desktop.unit, "guide letter spacing drift: " + key);
    assert.equal(row[7], style.transform, "guide text transform drift: " + key);
  }
  for (const key of ["base", "secondary", "outline"]) {
    const button = preset.buttons[key];
    const matchingRows = rows.filter(cells => cells[0] === "buttons." + key);
    const row = matchingRows[0];
    const defaultsRow = matchingRows[1];
    assert.ok(row && defaultsRow, "missing saved/default button rows: " + key);
    assert.deepEqual(row.slice(1), [button.background, button.foreground, button.border, button.borderWidth + "px", button.hoverBackground, button.hoverForeground], "guide button token drift: " + key);
    const original = parsed.originalUniversalPreset.buttons[key];
    assert.deepEqual(defaultsRow.slice(1), [original.background, original.foreground, original.border, original.borderWidth + "px", original.hoverBackground, original.hoverForeground], "guide original button default drift: " + key);
  }
  const layoutCssNames = { spacing: "spacing", contentWidth: "content-width", radius: "radius", borderWidth: "border-width" };
  for (const [key, cssName] of Object.entries(layoutCssNames)) {
    const row = rowFor("layout." + key);
    assert.equal(row[1], "--acm-layout-" + cssName, "guide layout property drift: " + key);
    assert.equal(row[2], `${preset.layout[key].value}${preset.layout[key].unit}`, "guide layout value drift: " + key);
  }
  for (const specimen of ["link", "unordered-list", "ordered-list", "quote"]) {
    assert.ok(rows.some(row => row[0] === "`specimen." + specimen + "`"), "missing guide specimen mapping: " + specimen);
  }
});
