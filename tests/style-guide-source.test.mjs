import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import test from "node:test";
import { interfaceStyleHistoryReducer } from "../app/studio/ui/styles/interface-style-history.ts";
import { createInterfaceStylePreset } from "../../acm-styles/src/index.ts";

const root = path.resolve(import.meta.dirname, "..");
const projects = path.resolve(root, "..");
const source = JSON.parse(fs.readFileSync(path.join(root, "app/studio/ui/styles/style-guide-source.json"), "utf8"));
const guidePath = path.join(projects, "workspace-governance/STYLE_GUIDE.md");
const presetPath = path.join(projects, "acm-styles/src/universal-style-preset.json");
const preset = JSON.parse(fs.readFileSync(presetPath, "utf8"));
const interfacePresetPath = path.join(projects, "acm-styles/src/interface-style-preset.json");
const interfacePreset = JSON.parse(fs.readFileSync(interfacePresetPath, "utf8"));

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

test("the source bundle generator reports stale line references without writing", () => {
  assert.doesNotThrow(() => execFileSync("node", ["scripts/generate-style-guide-source.mjs", "--check"], { cwd: root, stdio: "pipe" }));
});

test("button normal and hover text colours are documented and editable in the Styles preview", () => {
  const guide = source.document;
  const component = fs.readFileSync(path.join(root, "app/studio/ui/styles/style-guide-sandbox.tsx"), "utf8");
  const styles = fs.readFileSync(path.join(root, "app/studio/ui/style-guide.css"), "utf8");
  const presetStyles = fs.readFileSync(path.join(projects, "acm-styles/src/styles.css"), "utf8");

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
  const component = fs.readFileSync(path.join(root, "app/studio/ui/styles/style-guide-sandbox.tsx"), "utf8");
  assert.doesNotMatch(component, /localStorage|sessionStorage|indexedDB/);
  assert.match(component, /onFocusCapture/);
  assert.match(component, /onPointerOverCapture/);
  assert.match(component, /onClickCapture/);
  const resetAllStart = component.indexOf("function resetAll()");
  const resetAllEnd = component.indexOf("function setPaletteColour", resetAllStart);
  assert.notEqual(resetAllStart, -1, "Reset All handler exists");
  assert.notEqual(resetAllEnd, -1, "Reset All handler has a bounded body");
  const resetAll = component.slice(resetAllStart, resetAllEnd);
  assert.match(resetAll, /setMobilePanel\("settings"\)/);
  assert.match(resetAll, /setHoveredSourcePath\(null\)/);
  assert.match(resetAll, /setFocusedSourcePath\(null\)/);
  assert.match(resetAll, /setPinnedSourcePath\(null\)/);
  assert.match(resetAll, /setGuideQuery\(""\)/);
  assert.match(resetAll, /setGuideMatchIndex\(0\)/);
  assert.match(resetAll, /setGuideJumpLine\(null\)/);
  assert.match(resetAll, /hasSourceInteraction\.current = false/);
});

test("the written guide defaults to formatted Markdown with an accessible source toggle", () => {
  const component = fs.readFileSync(path.join(root, "app/studio/ui/styles/style-guide-sandbox.tsx"), "utf8");
  const styles = fs.readFileSync(path.join(root, "app/studio/ui/style-guide.css"), "utf8");
  assert.match(component, /useState<GuideView>\("formatted"\)/);
  assert.match(component, /aria-label="Written guide format"/);
  assert.match(component, />Formatted<\/button>/);
  assert.match(component, />Markdown source<\/button>/);
  assert.match(component, /<FormattedGuideDocument\s+ref=\{formattedGuideRef\}\s+lines=\{lines\}\s+query=\{query\}\s+activeLine=\{activeLine\}/);
  assert.match(component, /aria-label="Full Style Guide Markdown source with line numbers"/);
  assert.match(component, /sg-guide-(?:formatted|markdown)-line-\$\{(?:row\.line|lineNumber)\}/);
  assert.match(component, /<table><thead>/);
  assert.match(component, /<List>\{block\.items\.map/);
  assert.match(component, /\}, \[activeGuideLine, hoveredGuidePath\]\);/);
  assert.match(component, /block\.lines\.some\(item => item\.line === activeLine\)/);
  assert.match(component, /item\.continuations\.some\(continuation => continuation\.line === activeLine\)/);
  assert.match(component, /aria-current=\{activeLine === row\.line \? "location" : undefined\}/);
  assert.match(styles, /\.sg-guide-view-switch button\[aria-pressed="true"\]/);
  assert.match(styles, /\.sg-formatted-table th, \.sg-formatted-table td/);
  assert.match(component, /className="sg-formatted-line" aria-label=\{`Source line \$\{block\.line\}`\}>\{block\.line\}<\/span>/);
  assert.match(styles, /\.sg-formatted-block \{ display: grid; grid-template-columns: minmax\(3\.5rem, max-content\) minmax\(0, 1fr\);/);
  assert.match(styles, /\.sg-formatted-block > \.sg-formatted-line \{ grid-column: 1; grid-row: 1;/);
  assert.match(component, /className=\{`sg-guide-document sg-guide-markdown/);
  assert.match(component, /<CanonicalSourceLines lines=\{lines\} activeLine=\{activeLine\} query=\{query\} idPrefix="sg-guide-markdown"/);
  const lineStyles = fs.readFileSync(path.join(root, "app/studio/ui/styles/canonical-source-lines.css"), "utf8");
  assert.match(lineStyles, /\.canonical-source-lines \{/);
  assert.doesNotMatch(styles, /\.sg-guide-document ol \{/);
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
  const studio = fs.readFileSync(new URL("../app/studio/studio.css", import.meta.url), "utf8");
  const button = studio.split("\n").find(line => line.startsWith(".content-button {"));
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
  const component = fs.readFileSync(path.join(root, "app/studio/ui/styles/style-guide-sandbox.tsx"), "utf8");
  assert.match(component, /\[hoverInspection, setHoverInspection\] = useState\(false\)/);
  assert.match(component, /<ToggleSetting label="Hover Inspection" checked=\{hoverInspection\} onChange=\{changeHoverInspection\}/);
  for (const handler of ["handleSourcePointer", "hoverGuideSource", "clearGuideHover"]) {
    assert.match(component, new RegExp(`function ${handler}\\([^)]*\\) \\{\\s*if \\(!hoverInspection\\) return;`));
  }
  const toggle = component.slice(component.indexOf("  function changeHoverInspection("), component.indexOf("  function handleSourcePointer("));
  assert.match(toggle, /setHoveredSourcePath\(null\)/);
  assert.match(toggle, /setHoveredGuidePath\(null\)/);
  assert.match(toggle, /hasSourceInteraction\.current = false/);
  assert.match(toggle, /guideScrollSyncSuspended\.current = false/);
  assert.doesNotMatch(toggle, /setPinnedSourcePath|setFocusedSourcePath|setGuideQuery|setPreset/);
  for (const handler of ["handleSourceFocus", "pinSource", "selectGuideSource"]) {
    const start = component.indexOf(`  function ${handler}(`);
    const body = component.slice(start, component.indexOf("\n  function ", start + 1));
    assert.doesNotMatch(body, /if \(!hoverInspection\)/);
  }
  assert.match(component, /Enable Hover Inspection to inspect rules by hovering/);
});
