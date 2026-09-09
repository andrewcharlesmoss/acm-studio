import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { createHash } from "node:crypto";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

const require = createRequire(import.meta.url);
const cache = new Map();
function loadModule(url) {
  if (cache.has(url.href)) return cache.get(url.href);
  const exports = {}; cache.set(url.href, exports);
  let compiled = ts.transpileModule(readFileSync(url, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  if (url.pathname.endsWith("mini-golf-presentation.tsx")) compiled += "\nexports.__renderBlock = renderBlock;";
  if (url.pathname.endsWith("studio-html-editor.ts")) compiled += "\nexports.__parseTable = parseTable; exports.__parseElement = parseElement;";
  vm.runInNewContext(compiled, { exports, Node: { TEXT_NODE: 3, ELEMENT_NODE: 1 }, require: (name) => {
    // The shared editor is exercised in browser checks; this stub keeps render tests pure.
    // eslint-disable-next-line react/prop-types
    if (name === "./studio-canvas") return { BlockField: () => createElement("textarea", { "data-editor-field": true }), RichTextEditor: (props) => createElement(props.as ?? "div", {}, props.text) };
    if (name.startsWith(".")) {
      const target = new URL(name, url);
      if (name.endsWith(".ts") || name.endsWith(".tsx")) return loadModule(target);
      if (name.endsWith(".mjs")) return require(target.pathname);
      try { return loadModule(new URL(`${target.href}.ts`)); } catch (error) { if (error.code !== "ENOENT") throw error; return loadModule(new URL(`${target.href}.tsx`)); }
    }
    return require(name);
  } });
  return exports;
}
const presentationModule = loadModule(new URL("../app/studio/mini-golf-presentation.tsx", import.meta.url));
const presentation = { ...presentationModule.miniGolfPresentation, renderBlock: presentationModule.__renderBlock };
const { completeMiniGolfPage } = loadModule(new URL("../app/studio/mini-golf-page-blocks.ts", import.meta.url));
const heading = { id: "heading", type: "heading", level: 2, text: "Our scores" };
const table = { id: "table", type: "table", hasHeader: true, hasFooter: true, rows: [["Hole", "Ada", "Bo", "Cy", "Total"], ["1", "2", "3", "4", "9"], ["Total", "2", "3", "4", "9"]] };
const context = { document: { title: "Mini Golf Scorecard" }, mode: "preview", onDocumentFieldChange() {}, onFocusDocumentField() {} };
const section = { id: "scorecard", type: "section", role: "scorecard", layout: "stack", children: [heading, table] };
const render = (block, mode = "preview") => renderToStaticMarkup(presentation.renderBlock({ ...context, block, mode }));

test("source scorecard markup follows all authored player columns in both modes", () => {
  for (const mode of ["edit", "preview"]) {
    const html = render(section, mode);
    assert.match(html, /class="panel score-panel"/);
    assert.equal((html.match(/class="name-input"/g) ?? []).length, 3);
    assert.equal((html.match(/class="score-input"/g) ?? []).length, 3);
    assert.equal((html.match(/class="player-move"/g) ?? []).length, 3);
    assert.equal((html.match(/class="resize-handle"/g) ?? []).length, 3);
    assert.match(html, /class="hole-col"/);
    assert.match(html, /width:120px/);
    assert.match(html, /value="Cy"/);
    assert.match(html, /value="4"/);

    assert.match(html, /<tfoot>/);
  }
});

test("deleted table and heading remain absent, and additional nested content survives preview", () => {
  const html = render({ ...section, children: [{ id: "note", type: "paragraph", text: "Bring a pencil" }] });
  assert.doesNotMatch(html, /<table\b|Enter your scores|data-editor-field|<textarea/);
  assert.match(html, /Bring a pencil/);
});

test("preview fallback renders content without mounting an editable BlockField", () => {
  const block = { id: "custom", type: "paragraph", text: "An authored note" };
  assert.match(render(block), /An authored note/);
  assert.doesNotMatch(render(block), /contenteditable="true"|data-editor-field/);
});

test("table edits update the selected typed table while retaining its other cells", () => {
  let update;
  const tree = presentation.renderBlock({ ...context, mode: "edit", block: section, onUpdateBlock: (id, change) => { assert.equal(id, "table"); update = change; } });
  const find = (node, predicate) => {
    if (!node || typeof node !== "object") return undefined;
    if (predicate(node)) return node;
    for (const item of [node.props?.children].flat(Infinity)) { const found = find(item, predicate); if (found) return found; }
  };
  const input = find(tree, (node) => node.type === "input" && node.props.className === "name-input");
  input.props.onChange({ target: { value: "New name" } });
  const updated = update(table);
  assert.equal(updated.rows[0][1], "New name");
  assert.equal(JSON.stringify(updated.rows.slice(1)), JSON.stringify(table.rows.slice(1)));
});

test("authored table dimensions survive the source adapter", () => {
  const html = render({ ...section, children: [heading, { ...table, columnWidths: [10, 20, 30, 25, 15], rowHeights: [150, 90, 70] }] });
  assert.match(html, /class="hole-col" style="width:50px"/);
  assert.match(html, /style="width:150px"/);
  assert.match(html, /style="height:150px"/);
  assert.match(html, /style="height:90px"/);
  assert.match(html, /style="height:70px"/);
});

test("a deleted share heading does not return during rendering", () => {
  assert.doesNotMatch(render({ id: "share", type: "section", role: "share", layout: "stack", children: [] }), /Ready to share|<h2/);
});

test("preview setup fields cannot dispatch draft updates", () => {
  let updates = 0;
  const tree = presentation.renderBlock({ ...context, onUpdateBlock: () => updates++, block: { id: "setup", type: "section", role: "setup", children: [{ id: "holes", type: "field", control: "select", label: "Course holes", value: "9 Holes", options: ["9 Holes", "18 Holes"] }] } });
  const field = tree.props.children[0].props.children;
  const select = field.props.children[1];
  select.props.onChange({ target: { value: "18 Holes" } });
  assert.equal(updates, 0);
});

test("full typed page reproduces the source container hierarchy and editable values", () => {
  const blocks = completeMiniGolfPage([
    { id: "account", type: "section", role: "account", children: [{ id: "status", type: "paragraph", text: "Playing as a guest" }, { id: "signin", type: "button", label: "Sign in with ACM Account", url: "#", style: "primary" }] },
    section,
    { id: "leaderboard", type: "section", role: "leaderboard", children: [{ id: "leader-heading", type: "heading", level: 2, text: "Leaderboard" }, { id: "player", type: "paragraph", text: "Ada · 12 strokes · Average 3 · Std deviation 1 · Holes played 4 / 9" }] },
  ], "Mini Golf Scorecard", "A little friendly competition");
  const html = blocks.map((block) => render(block)).join("");
  assert.match(html, /<header class="hero"[^>]*><div class="logo-mark"[^>]*><\/div><div><p class="eyebrow"[^>]*>A little friendly competition<\/p><h1/);
  assert.match(html, /<section class="account-bar panel"[^>]*><div><p class="eyebrow"[^>]*>ACM Account<\/p><p class="account-status"/);
  assert.match(html, /href="\/api\/auth\/start\?return_to=\/"/);
  assert.match(html, /<div class="section-heading"><div><h2[^>]*>Our scores<\/h2><\/div><div class="heading-actions"><span class="progress"/);
  assert.match(html, /class="table-size-control"/);
  assert.match(html, /<article class="summary-card"><div class="card-top"><h3[^>]*>Ada<\/h3><\/div><div class="big-score">/);
  assert.match(html, /<dl><div><dt[^>]*>Average<\/dt><dd[^>]*>3<\/dd><\/div>/);
  assert.match(html, /<footer class="site-footer"><div class="footer-brand">/);
  assert.match(html, /© 2026 Mini Golf Scorecard\. All Rights Reserved\.<\/p><div class="footer-links"[^>]*><a[^>]*class="footer-link"/);
});

test("typed source leaf order and deletions control visible output without fallback content", () => {
  const footer = completeMiniGolfPage([], "Title", "").find((block) => block.role === "footer");
  const copyright = footer.children.find((block) => block.siteRole === "copyright");
  footer.children = [copyright];
  const html = render(footer);
  assert.doesNotMatch(html, /footer-brand|footer-links|footer-link|linkedin/);
  const metric = { id: "metric", type: "section", role: "metric", children: [{ id: "value", type: "paragraph", text: "42", siteRole: "metric-value" }, { id: "label", type: "paragraph", text: "Custom metric", siteRole: "metric-label" }] };
  assert.match(render(metric), /<dd[^>]*>42<\/dd><dt[^>]*>Custom metric<\/dt>/);
  assert.equal(render({ id: "footer", type: "section", role: "footer", children: [] }), '<footer class="site-footer"></footer>');
});

test("source text preserves rich runs and paragraph presentation", () => {
  const html = render({ id: "copyright", type: "paragraph", siteRole: "copyright", text: "Our club", runs: [{ text: "Our ", marks: ["bold"] }, { text: "club" }], align: "centre", style: { textColor: "#123456" } });
  assert.match(html, /<strong>Our <\/strong>club/);
  assert.match(html, /text-align:center/);
});

test("Code serialisation retains closed section and leaf role metadata", () => {
  const { blocksToHtml } = loadModule(new URL("../app/studio/studio-html-editor.ts", import.meta.url));
  const blocks = completeMiniGolfPage([], "Our club", "A subtitle");
  const html = blocksToHtml(blocks);
  for (const role of ["hero", "hero-copy", "footer", "footer-brand", "footer-links", "social-link"]) assert.match(html, new RegExp(`data-section-role="${role}"`));
  for (const role of ["title", "eyebrow", "logo", "copyright", "social-icon", "social-action"]) assert.match(html, new RegExp(`data-site-role="${role}"`));
});

test("legacy leaderboard notes remain notes while player formatting survives conversion", () => {
  const blocks = completeMiniGolfPage([{ id: "leaderboard", type: "section", role: "leaderboard", children: [{ id: "note", type: "paragraph", text: "Bring a pencil", runs: [{ text: "Bring a pencil", marks: ["bold"] }] }, { id: "leaderboard-player-1", type: "paragraph", text: "Ada · — strokes", align: "centre", runs: [{ text: "Ada", marks: ["bold"] }, { text: " · — strokes" }] }] }], "Title", "");
  const leaderboard = blocks.find((block) => block.role === "leaderboard");
  assert.equal(leaderboard.children[0].type, "paragraph");
  assert.equal(leaderboard.children[0].text, "Bring a pencil");
  const name = leaderboard.children[1].children[0];
  assert.equal(name.align, "centre");
  assert.equal(name.runs[0].marks[0], "bold");
  assert.equal(name.text, "Ada");
});

test("authored score-value styling remains visible in Preview", () => {
  const html = render({ id: "value", type: "paragraph", siteRole: "score-value", text: "12", style: { fontSize: "large" } });
  assert.match(html, /<span class="score-value" style="font-size:20px"/);
  assert.match(html, />12<\/span>/);
});

test("default hero title retains source emphasis after plain-text edits without dropping authored marks", () => {
  const title = { id: "hero-title", type: "heading", level: 1, siteRole: "title", text: "Mini golf scorecard" };
  assert.match(render(title), /Mini golf <em>scorecard<\/em>/);
  const rich = render({ ...title, runs: [{ text: title.text, marks: ["bold"] }] });
  assert.match(rich, /<strong>Mini golf <\/strong><em><strong>scorecard<\/strong><\/em>/);
  assert.doesNotMatch(render({ ...title, text: "Our golf club" }), /<em>/);
  const tree = presentation.renderBlock({ ...context, mode: "edit", block: { ...title, runs: [{ text: title.text }] } });
  assert.equal(tree.props.runs[1].text, "scorecard");
  assert.equal(tree.props.runs[1].marks.includes("italic"), true);
});


test("Mini Golf editor typography and footer spacing share the source presentation", () => {
  const css = readFileSync(new URL("../app/studio/site-draft.css", import.meta.url), "utf8");
  assert.match(css, /\.mini-golf-editor-surface :is\(\.rich-text-editor, \.block-textarea\)\s*\{\s*font-family:"Mini Golf Inter","Inter Fallback",Inter,Arial,Helvetica,sans-serif;/);
  assert.match(css, /\.mini-golf-editor-surface footer\.site-footer \{ margin-top:32px; \}/);
  assert.doesNotMatch(css, /\.canvas-block\.is-section:has\(> \.site-footer\)\s*\{[^}]*margin-top/);
});


test("table-size field applies the source 13/16/19px presentation contract in its own scorecard", () => {
  for (const [value, size] of [["Small", 13], ["Standard", 16], ["Large", 19], ["Custom", 16]]) {
    const block = { ...section, children: [{ id: "controls", type: "section", role: "scorecard-actions", children: [{ id: "size", type: "field", siteRole: "table-size", label: "Table text", control: "select", value, options: [value] }] }, table] };
    for (const mode of ["edit", "preview"]) assert.match(render(block, mode), new RegExp(`font-size:${size}px`));
  }
});

test("New Game appearance depends on its role rather than a generated ID", () => {
  const html = render({ id: "duplicate-random-id", type: "button", siteRole: "new-game", label: "New Game", url: "#", style: "secondary" });
  assert.match(html, /class="button ghost"/);
});

test("HTML editing preserves paragraph alignment and table dimension contracts", () => {
  const { blocksToHtml, __parseElement, __parseTable } = loadModule(new URL("../app/studio/studio-html-editor.ts", import.meta.url));
  const paragraph = { id: "p", type: "paragraph", text: "Aligned", align: "centre" };
  assert.match(blocksToHtml([paragraph]), /class="align-centre"/);
  const parsedParagraph = __parseElement({ tagName: "P", dataset: { blockId: "p" }, className: "align-centre", textContent: "Aligned", querySelector: () => null, childNodes: [{ nodeType: 3, textContent: "Aligned" }] }, paragraph);
  assert.equal(parsedParagraph.block.align, "centre");
  const removedAlignment = __parseElement({ tagName: "P", dataset: { blockId: "p", alignExplicit: "true" }, className: "", textContent: "Aligned", querySelector: () => null, childNodes: [{ nodeType: 3, textContent: "Aligned" }] }, paragraph);
  assert.equal(removedAlignment.block.align, undefined);
  assert.match(blocksToHtml([paragraph]), /data-align-explicit="true"/);
  const original = { ...table, columnWidths: [10, 20, 25, 30, 15], rowHeights: [120, 70, 50] };
  const html = blocksToHtml([original]);
  assert.match(html, /data-column-widths="10,20,25,30,15"/);
  assert.match(html, /data-row-heights="120,70,50"/);
  const fakeTable = (attributes = {}) => ({ getAttribute: (name) => attributes[name] ?? null, querySelector: (name) => name === "tbody" ? { querySelectorAll: () => original.rows.map((row) => ({ children: row.map((textContent) => ({ textContent })) })) } : null });
  const parsed = __parseTable(fakeTable(), "table", original);
  assert.deepEqual(Array.from(parsed.block.columnWidths), original.columnWidths);
  assert.deepEqual(Array.from(parsed.block.rowHeights), original.rowHeights);
  assert.match(__parseTable(fakeTable({ "data-column-widths": "0,-1" }), "table", original).error, /positive numbers/);
});

test("Mini Golf embeds all source Inter subsets without registering a global Inter family", () => {
  const css = readFileSync(new URL("../app/studio/site-draft.css", import.meta.url), "utf8");
  const faces = [...css.matchAll(/@font-face\s*\{([^}]+)\}/g)];
  assert.equal(faces.length, 7);
  for (const [, face] of faces) {
    assert.match(face, /font-family: 'Mini Golf Inter'/);
    assert.match(face, /font-weight: 100 900/);
    assert.match(face, /font-display: swap/);
    const path = face.match(/url\("([^"]+)"\)/)[1];
    const bytes = readFileSync(new URL(`../public${path}`, import.meta.url));
    assert.equal(bytes.subarray(0, 4).toString(), "wOF2");
  }
  assert.match(readFileSync(new URL("../public/fonts/mini-golf-inter/LICENSE.txt", import.meta.url), "utf8"), /SIL OPEN FONT LICENSE Version 1.1/);
});


test("Studio runtime shares canonical game calculations and preserves authored defaults", () => {
  const { golf, initialRuntimeGame } = loadModule(new URL("../app/studio/mini-golf-runtime.tsx", import.meta.url));
  let game = initialRuntimeGame([table]);
  assert.equal(game.players[0].name, "Ada");
  game = golf.resizePlayers(game, 2);
  const [a, b] = game.players;
  for (const [id, hole, value] of [[a.id, 0, "2"], [a.id, 1, "4"], [b.id, 0, "3"], [b.id, 1, "5"]]) game = golf.setScore(game, id, hole, value);
  const model = golf.buildExportModel(game);
  assert.equal(model.grandTotal, 14);
  assert.equal(model.holeTotals.slice(0, 2).join(","), "5,9");
  assert.equal(model.stats.map(player => `${player.total}/${player.average}/${player.deviation}`).join(","), "6/3/1,8/4/1");
  assert.equal(golf.setScore(game, a.id, 0, "invalid"), game);
  const cleared = golf.resetScores(game);
  assert.equal(cleared.players, game.players);
  assert.equal(golf.adjustScore(cleared, a.id, 0, 1).scores[a.id][0], "1");
  const runtime = { game, model, tableSize: "medium", feedback: {} };
  const rendered = renderToStaticMarkup(presentation.renderBlock({ ...context, block: { id: "progress", type: "paragraph", siteRole: "progress", text: "Untouched label" }, runtime }));
  assert.match(rendered, /2 \/ 9 holes complete/);
  assert.equal(table.rows[1][1], "2");
});


test("pristine runtime follows authored defaults while played sessions remain separate", () => {
  const { initialRuntimeGame, syncRuntimeDefaults, authoredTableSize, runtimeTableDimensions } = loadModule(new URL("../app/studio/mini-golf-runtime.tsx", import.meta.url));
  const { bindMiniGolfRuntime } = loadModule(new URL("../app/studio/mini-golf-page-blocks.ts", import.meta.url));
  const defaults = [{ id: "setup-holes", type: "field", value: "18 Holes" }, { id: "setup-players", type: "field", value: "3 Players" }, { id: "size", type: "field", siteRole: "table-size", value: "Large" }, { ...table, rows: [["Hole", "New Ada", "Bo", "Cy", "Total"], ...table.rows.slice(1)] }];
  const before = initialRuntimeGame([]);
  const next = syncRuntimeDefaults(before, false, defaults);
  assert.equal(next.holes, 18);
  assert.equal(next.players.length, 3);
  assert.equal(next.players[0].name, "New Ada");
  assert.equal(syncRuntimeDefaults(before, true, defaults), before);
  assert.equal(authoredTableSize(defaults), "large");
  assert.equal(authoredTableSize([{ id: "s", type: "field", siteRole: "table-size", value: "Standard" }]), "medium");
  const dimensions = runtimeTableDimensions({ ...table, columnWidths: [10, 30, 20, 30, 10] }, ["a", "b", "c"]);
  assert.equal(dimensions.widths.a, 150);
  const bound = bindMiniGolfRuntime([{ id: "share-html", type: "button", label: "Custom copy", url: "#", style: "secondary" }, defaults[0]]);
  const copied = bound.map((block, index) => ({ ...block, id: `random-duplicate-${index}` }));
  let action;
  const button = presentation.renderBlock({ ...context, block: copied[0], runtime: { feedback: {}, run: binding => { action = binding; } } });
  button.props.onClick();
  assert.equal(action, "html");
  assert.equal(copied[1].siteRole, "holes");
  assert.equal(initialRuntimeGame(copied).holes, 18);
});


test("versioned page definitions round-trip authored structure and report source conflicts", () => {
  const contract = loadModule(new URL("../app/studio/mini-golf-page-contract.ts", import.meta.url));
  const identity = { pageId: "home", instanceId: "staging:home:scorecard", source: { revision: "source-a", fileHashes: { "app/domain/scorecard.ts": "a".repeat(64) } } };
  const blocks = [{ id: "scores", type: "section", role: "scorecard", layout: "columns", children: [{ ...table, columnWidths: [10, 20, 30, 30, 10], rowHeights: [42, 44, 46] }, { id: "setting", type: "field", control: "select", label: "My course", value: "18 Holes", siteRole: "holes" }] }, { id: "leaderboard", type: "section", role: "leaderboard", layout: "stack", children: [{ id: "entry", type: "section", role: "leaderboard-card", layout: "stack", children: [{ id: "name", type: "paragraph", text: "Player", siteRole: "player-name", align: "right", style: { textColor: "#123456" } }] }] }];
  const baseline = contract.blocksToMiniGolfPageDefinition(blocks, identity);
  assert.equal(JSON.stringify(contract.miniGolfPageDefinitionToBlocks(JSON.parse(JSON.stringify(baseline)))), contract.canonicalMiniGolfJson(blocks));
  assert.equal(baseline.defaults.holes, "18 Holes");
  assert.equal(baseline.leaderboardTemplates[0].templateId, "entry");
  const reordered = contract.blocksToMiniGolfPageDefinition([...blocks].reverse(), identity);
  assert.equal(contract.compareMiniGolfPageChanges(baseline, baseline, reordered).status, "blocks-only");
  const source = contract.blocksToMiniGolfPageDefinition([blocks[0]], { ...identity, source: { ...identity.source, revision: "source-b" } });
  const conflict = contract.compareMiniGolfPageChanges(baseline, source, reordered);
  assert.equal(conflict.status, "conflict");
  assert.equal(conflict.source.blocks.length, 1);
  assert.equal(conflict.draft.blocks[0].id, "leaderboard");
  assert.equal(contract.compareMiniGolfPageChanges(baseline, source, source).status, "converged");
  assert.equal(contract.compareMiniGolfPageChanges(baseline, source, baseline).status, "source-only");
  assert.equal(contract.equalMiniGolfPageDefinitions(baseline, JSON.parse(JSON.stringify(baseline))), true);
  assert.throws(() => contract.blocksToMiniGolfPageDefinition([{ id: "unknown", type: "react-component" }], identity), /Unsupported/);
  assert.throws(() => contract.blocksToMiniGolfPageDefinition([table, table], identity), /duplicate/);
  assert.throws(() => contract.parseMiniGolfPageDefinition({ ...baseline, version: 2 }), /version/);
  assert.throws(() => contract.parseMiniGolfPageDefinition({ ...baseline, defaults: {} }), /disagree/);
  assert.throws(() => contract.parseMiniGolfPageDefinition({ ...baseline, unknown: true }), /Unsupported/);
  assert.throws(() => contract.blocksToMiniGolfPageDefinition([{ ...table, unsupported: () => null }], identity), /non-JSON/);
  assert.throws(() => contract.canonicalMiniGolfJson(Array(1)), /sparse array/);
  assert.throws(() => contract.canonicalMiniGolfJson({ nested: [Array(2)] }), /sparse array/);
  assert.throws(() => contract.canonicalMiniGolfJson([undefined]), /non-JSON/);
  assert.equal(contract.canonicalMiniGolfJson([null]), "[null]");
  assert.throws(() => contract.compareMiniGolfPageChanges(baseline, source, { ...baseline, instanceId: "other" }), /different/);
  assert.equal(blocks[0].children[0].rows[0][1], "Ada");
});


test("source-owned integration entrypoint exposes canonical runtime exports and is pinned in the manifest", () => {
  const entryUrl = new URL("../../mini-golf-scorecard/app/studio-integration.ts", import.meta.url);
  const entry = loadModule(entryUrl);
  const domain = loadModule(new URL("../../mini-golf-scorecard/app/domain/scorecard.ts", import.meta.url));
  for (const name of ["createGame", "setScore", "buildExportModel", "resetScores"]) assert.equal(entry[name], domain[name]);
  for (const name of ["ScoreTable", "useColumnSizing", "usePlayerReordering", "copyScorecardHtml", "copyScorecardImage", "downloadScorecardCsv", "parseStoredGame"]) assert.equal(typeof entry[name], "function");
  assert.equal(typeof entry.DEFAULT_COLUMN_WIDTH, "number");
  const manifest = JSON.parse(readFileSync(new URL("../docs/mini-golf-runtime-source.json", import.meta.url), "utf8"));
  assert.equal(manifest.files["app/studio-integration.ts"], createHash("sha256").update(readFileSync(entryUrl)).digest("hex"));
  const runtime = readFileSync(new URL("../app/studio/mini-golf-runtime.tsx", import.meta.url), "utf8");
  assert.equal((runtime.match(/from "\.\.\/\.\.\/\.\.\/mini-golf-scorecard\/app\//g) ?? []).length, 1);
  assert.match(runtime, /app\/studio-integration/);
});


test("Edit and Preview connect the canonical runtime while Edit retains table selection", () => {
  const presentationSource = readFileSync(new URL("../app/studio/mini-golf-presentation.tsx", import.meta.url), "utf8");
  const runtimeSource = readFileSync(new URL("../app/studio/mini-golf-runtime.tsx", import.meta.url), "utf8");
  const connected = presentationSource.slice(presentationSource.indexOf("function ConnectedBlock"));
  assert.match(connected, /renderBlock\(\{ \.\.\.context, runtime \}\)/);
  assert.doesNotMatch(connected, /context\.mode === "preview"/);
  assert.match(runtimeSource, /onAdjustScore=\{\(id, hole, delta\) => setGame\(game => golf\.adjustScore\(game, id, hole, delta\)\)\}/);
  let selectedId;
  const tree = presentation.renderBlock({ ...context, mode: "edit", block: section, runtime: {}, selectedBlockId: table.id, onSelectBlock: id => { selectedId = id; } });
  const tableWrapper = tree.props.children[1].props.children;
  assert.equal(tableWrapper.props["data-studio-selected"], true);
  assert.equal(tableWrapper.props["data-studio-nested-block-id"], table.id);
  tableWrapper.props.onPointerDown({ stopPropagation() {} });
  assert.equal(selectedId, table.id);
  assert.equal(tableWrapper.props.children.props.table, table);
});


test("Edit binds runtime statistics one-to-one while Preview repeats the first template", () => {
  const card = (id, name) => ({ id, type: "section", role: "leaderboard-card", layout: "stack", children: [
    { id: `${id}-name`, type: "paragraph", siteRole: "player-name", text: name },
    { id: `${id}-score`, type: "paragraph", siteRole: "score-value", text: "—" },
    ...["metric-average", "metric-deviation", "metric-holes"].map(role => ({ id: `${id}-${role}`, type: "paragraph", siteRole: role, text: "Authored metric" })),
  ] });
  const first = card("card-a", "Authored Ada");
  const second = card("card-b", "Authored Bo");
  const spare = card("card-c", "Unassigned card");
  const note = { id: "note", type: "paragraph", text: "Keep this note" };
  const leaderboard = { id: "board", type: "section", role: "leaderboard", layout: "stack", children: [first, note, second, spare] };
  const runtime = { model: { stats: [
    { id: "game-a", name: "Runtime Ada", total: 6, values: [2, 4], average: 3, deviation: 1 },
    { id: "game-b", name: "Runtime Bo", total: 8, values: [3, 5], average: 4, deviation: 1 },
  ] }, game: { holes: 9 } };
  const edit = renderToStaticMarkup(presentation.renderBlock({ ...context, mode: "edit", block: leaderboard, runtime, selectedBlockId: second.id, hoveredBlockId: first.id }));
  for (const value of ["Runtime Ada", "Runtime Bo", "3.00", "4.00", "1.00", "2 / 9", "Unassigned card"]) assert.ok(edit.includes(value));
  assert.match(edit, /data-studio-nested-block-id="card-b" data-studio-selected="true"/);
  assert.match(edit, /data-studio-nested-block-id="card-a" data-studio-selected="false" data-studio-hovered="true"/);
  assert.equal((edit.match(/data-studio-nested-block-id="card-a"/g) ?? []).length, 1);
  assert.equal((edit.match(/data-studio-nested-block-id="card-b"/g) ?? []).length, 1);
  assert.ok(edit.indexOf("Runtime Ada") < edit.indexOf("Keep this note") && edit.indexOf("Keep this note") < edit.indexOf("Runtime Bo"));
  assert.ok(edit.includes("4.00"));
  assert.match(edit, />6</);
  assert.match(edit, />8</);
  assert.equal(second.children[0].text, "Authored Bo");
  const preview = renderToStaticMarkup(presentation.renderBlock({ ...context, block: leaderboard, runtime }));
  assert.match(preview, /Runtime Ada/);
  assert.match(preview, /Runtime Bo/);
  assert.doesNotMatch(preview, /Unassigned card|Authored Ada|Authored Bo/);
});


test("runtime setup labels use the source singular and plural forms", () => {
  for (const [role, singular] of [["holes", "hole"], ["players", "player"]]) {
    const html = renderToStaticMarkup(presentation.renderBlock({ ...context, mode: "edit", block: { id: `setup-${role}`, type: "field", control: "select", label: role, value: `1 ${singular}`, siteRole: role }, runtime: { game: { holes: 1, players: [{}] } } }));
    assert.match(html, new RegExp(`>1 ${singular}</option>`));
    assert.match(html, new RegExp(`>2 ${role}</option>`));
    assert.doesNotMatch(html, new RegExp(`>1 ${role}</option>`));
  }
});

test("Mini Golf table labels and empty totals author through rows without changing calculations", () => {
  const { miniGolfTableAuthoringCells, updateMiniGolfAuthoredCell, installMiniGolfTableAuthoring } = loadModule(new URL("../app/studio/mini-golf-table-authoring.ts", import.meta.url));
  const authored = { id: "labels", type: "table", hasHeader: true, hasFooter: true, rows: [["Hole", "Ada", "Bo", "Total"], ["1", "", "", "—"], ["Total", "—", "—", "—"]] };
  const emptyTotals = { holeTotals: [0], playerTotals: [0, 0], grandTotal: 0 };
  const cells = miniGolfTableAuthoringCells(authored, emptyTotals);
  const node = (tag, value = "source") => ({ tag, value, children: [], attributes: new Map(), events: new Map(),
    get textContent() { return this.children.length ? this.children.map(child => child.textContent).join("") : this.value; },
    set textContent(value) { this.value = value; this.children = []; },
    matches(selector) { return selector.split(",").map(part => part.trim()).includes(this.tag); },
    querySelector() { return this.children.find(child => child.attributes.has("data-studio-cell-editor")) ?? null; },
    ownerDocument: { createElement: tag => node(tag, "") }, append(child) { this.children.push(child); },
    getAttribute(name) { return this.attributes.get(name) ?? null; }, setAttribute(name, value) { this.attributes.set(name, value); }, removeAttribute(name) { this.attributes.delete(name); }, addEventListener(name, handler) { this.events.set(name, handler); }, removeEventListener(name) { this.events.delete(name); },
  });
  const nodes = new Map(cells.map(cell => [cell.selector, node(cell.selector.includes(".hole-number") ? "span" : cell.selector.includes("th") ? "th" : "td")]));
  const root = { querySelector: selector => nodes.get(selector) };
  let selection;
  let edited = authored;
  const cleanup = installMiniGolfTableAuthoring(root, cells, "edit", (row, column) => { selection = [row, column]; }, (row, column, value) => { edited = updateMiniGolfAuthoredCell(edited, row, column, value); });
  for (const selector of ["thead th:first-child", "thead th:last-child", "tbody tr:nth-child(1) .hole-number", "tfoot th:first-child", "tbody tr:nth-child(1) .hole-total"]) {
    const element = nodes.get(selector);
    const control = element.querySelector() ?? element;
    assert.equal(control.getAttribute("role"), "textbox");
    assert.equal(control.getAttribute("contenteditable"), "plaintext-only");
    if (element.tag !== "span") { assert.equal(element.getAttribute("role"), null); assert.equal(element.getAttribute("contenteditable"), null); }
  }
  const emptyCell = nodes.get("tbody tr:nth-child(1) .hole-total");
  const empty = emptyCell.querySelector();
  let stopped = false;
  empty.events.get("pointerdown")({ stopPropagation() { stopped = true; }, preventDefault() { assert.fail("Native focus must remain available"); } });
  assert.equal(stopped, true);
  assert.equal(selection, undefined, "Pointerdown must not dispatch selection before native focus");
  assert.equal(emptyCell.events.has("pointerdown"), false);
  empty.events.get("focus")();
  assert.deepEqual(selection, [1, 3]);
  empty.textContent = "Not played";
  empty.events.get("input")();
  assert.equal(edited.rows[1][3], "Not played");
  assert.equal(authored.rows[1][3], "—");
  cleanup();
  assert.equal(empty.getAttribute("contenteditable"), "plaintext-only", "Effect cleanup must not remove focusability during input/selection rerenders");
  const reinstalled = installMiniGolfTableAuthoring(root, miniGolfTableAuthoringCells(edited, emptyTotals), "edit", () => undefined, () => undefined);
  assert.equal(emptyCell.querySelector(), empty, "Input renders retain the existing focused control");
  reinstalled();
  installMiniGolfTableAuthoring(root, miniGolfTableAuthoringCells(edited, emptyTotals), "preview", () => assert.fail("Preview selection"), () => assert.fail("Preview update"));
  assert.equal(emptyCell.textContent, "Not played");
  assert.equal(emptyCell.querySelector(), null);
  assert.equal(emptyCell.getAttribute("contenteditable"), null);
  const populated = miniGolfTableAuthoringCells(edited, { holeTotals: [5], playerTotals: [2, 3], grandTotal: 5 });
  const calculated = populated.find(cell => cell.selector === "tbody tr:nth-child(1) .hole-total");
  assert.equal(calculated.value, "5");
  assert.equal(calculated.editable, false);
  const populatedCleanup = installMiniGolfTableAuthoring(root, populated, "edit", () => undefined, () => assert.fail("Calculated totals are read-only"));
  assert.equal(emptyCell.textContent, "5");
  assert.equal(emptyCell.querySelector(), null);
  assert.equal(emptyCell.getAttribute("role"), null);
  populatedCleanup();
  assert.equal(miniGolfTableAuthoringCells(edited, emptyTotals).find(cell => cell.selector === calculated.selector).value, "Not played");
  const { blocksToMiniGolfPageDefinition, miniGolfPageDefinitionToBlocks } = loadModule(new URL("../app/studio/mini-golf-page-contract.ts", import.meta.url));
  const definition = blocksToMiniGolfPageDefinition([edited], { pageId: "page", instanceId: "game", source: { revision: "local", fileHashes: {} } });
  assert.equal(miniGolfPageDefinitionToBlocks(JSON.parse(JSON.stringify(definition)))[0].rows[1][3], "Not played");
  const { blocksToHtml } = loadModule(new URL("../app/studio/studio-html-editor.ts", import.meta.url));
  assert.match(blocksToHtml([edited]), /Not played/);
  let cellSelection;
  let updated;
  const wrapper = presentation.renderBlock({ ...context, mode: "edit", block: { ...section, children: [authored] }, runtime: {}, onTableCellFocus: (...args) => { cellSelection = args; }, onUpdateBlock: (id, update) => { updated = update(authored); } }).props.children[0].props.children;
  wrapper.props.children.props.onCellSelect(1, 3);
  wrapper.props.children.props.onCellChange(0, 0, "Round");
  assert.deepEqual(cellSelection, ["labels", 1, 3]);
  assert.equal(updated.rows[0][0], "Round");
});
