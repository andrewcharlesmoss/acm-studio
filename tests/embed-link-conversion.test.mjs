import assert from "node:assert/strict";
import { readStudioSource } from "./studio-module-source.mjs";
import test from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { loadProductionModule } from "./production-module.mjs";
import { commitHistory, undoHistory, redoHistory } from "../app/studio/studio-command-operations.mjs";

const load = path => loadProductionModule(new URL(path, import.meta.url));
const { embedLinkParagraph } = await load("../app/studio/embed-link-conversion.ts");
const { validContentBlocks } = await load("../app/studio/workspace-validation.ts");
const { BlockField } = await load("../app/studio/studio-canvas.tsx");
const { BlockRenderer } = await load("../app/components/content.tsx");
const { useStudioBlockCommands } = await load("../app/studio/use-studio-block-commands.ts");
const { blockToHtml } = await load("../app/studio/studio-html-editor.ts");
function fixture(patch = {}) {
  return { id: "embed", type: "embed", url: "https://example.test/resource", title: "Resource", caption: "A useful caption", editorial: { name: "Research", note: "Keep this source", lock: { move: true, remove: true } }, siteRole: "title", visualStyle: { anchor: "resource", className: "reference", margin: "20px", textColor: "#123456" }, ...patch };
}

test("conversion retains metadata and moves appearance to the Paragraph-owned style", () => {
  const original = fixture(); const baseline = structuredClone(original);
  const next = embedLinkParagraph(original);
  assert.equal(next.id, original.id); assert.equal(next.type, "paragraph");
  assert.deepEqual(next.editorial, original.editorial); assert.equal(next.siteRole, original.siteRole);
  assert.deepEqual(next.style, original.visualStyle); assert.equal(next.visualStyle, undefined);
  assert.notEqual(next.style, original.visualStyle); assert.deepEqual(original, baseline);
  assert.equal(next.text, "Resource\nA useful caption"); assert.equal(validContentBlocks([next]), true);
});
for (const align of ["wide", "full", "left", "center", "right"]) test(`conversion preserves only supported Paragraph width ${align}`, () => {
  assert.equal(embedLinkParagraph(fixture({ blockAlign: align })).blockAlign, ["wide", "full"].includes(align) ? align : undefined);
});
for (const url of ["javascript:alert(1)", "data:text/html,example", ""]) test(`unsafe or missing URL refuses ${url}`, () => {
  assert.equal(embedLinkParagraph(fixture({ url })), null);
});
test("URL-only content uses the normalised safe address", () => {
  const next = embedLinkParagraph(fixture({ title: "", url: "example.test/resource", caption: "" }));
  assert.equal(next.text, "https://example.test/resource"); assert.equal(next.runs[0].marks[0].url, next.text);
});
test("rich caption preserves typed objects, marks and note companions", () => {
  const captionRuns = [{ text: "Emphasis ", marks: ["bold", { type: "language", language: "en", direction: "ltr" }] }, { text: "\uFFFC", inline: { type: "image", src: "https://example.test/image.png", alt: "Illustration", width: 80 } }, { text: "\uFFFC", inline: { type: "math", latex: "x+1", alternativeText: "x plus one" } }, { text: "\uFFFC", inline: { type: "footnote", id: "note" } }];
  const block = fixture({ caption: captionRuns.map(run => run.text).join(""), captionRuns });
  const notes = { id: "notes", type: "footnotes", notes: [{ id: "note", text: "Reference note" }] };
  const next = embedLinkParagraph(block, [block, notes]);
  assert.ok(next); assert.deepEqual(JSON.parse(JSON.stringify(next.runs.slice(1).flatMap(run => run.text === "\n" ? [] : [run]))), captionRuns);
  assert.equal(validContentBlocks([next, notes]), true); assert.deepEqual(notes.notes, [{ id: "note", text: "Reference note" }]);
});
for (const type of ["group", "column"]) for (const allowed of [true, false]) test(`${type} parent ${allowed ? "allows" : "refuses"} Paragraph conversion`, () => {
  const block = fixture(); const parent = { id: "parent", type, ...(type === "group" ? { layout: "flow" } : {}), allowedBlocks: allowed ? ["paragraph"] : ["embed"], children: [block] };
  const roots = type === "column" ? [{ id: "columns", type: "columns", children: [parent] }] : [parent];
  assert.equal(Boolean(embedLinkParagraph(block, roots)), allowed);
});
test("missing or changed root source refuses a stale proposal", () => {
  const block = fixture(); assert.equal(embedLinkParagraph(block, []), null);
  assert.equal(embedLinkParagraph(block, [{ ...block, title: "Changed" }]), null);
});

const canvasSource = readStudioSource("app/studio/studio-canvas.tsx");
const syntax = ts.createSourceFile("studio-canvas.tsx", canvasSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let callback;
function visit(node) { if (ts.isFunctionDeclaration(node) && node.name?.text === "convertToLink") callback = node.getText(syntax); ts.forEachChild(node, visit); }
visit(syntax); assert.ok(callback);
function convert({ writable = true, proposal = embedLinkParagraph(fixture()), onChange } = {}) {
  const scope = { writable, linkParagraph: proposal, onChange };
  runInNewContext(ts.transpileModule(`${callback}\nglobalThis.convert = convertToLink;`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, scope);
  scope.convert();
}
for (const condition of [{ writable: false }, { proposal: null }]) test(`actual conversion callback refuses ${JSON.stringify(condition)}`, () => {
  let calls = 0; convert({ ...condition, onChange() { calls++; } }); assert.equal(calls, 0);
});
test("actual conversion callback requests source-match acceptance and skips rejected writes", () => {
  const source = fixture(); const proposal = embedLinkParagraph(source); let current = source; let writes = 0;
  convert({ proposal, onChange(next, requireSourceMatch) { assert.equal(requireSourceMatch, true); if (JSON.stringify(current) !== JSON.stringify(source)) return; current = next; writes++; } });
  assert.equal(current, proposal); assert.equal(writes, 1);
  convert({ proposal, onChange(next, requireSourceMatch) { assert.equal(requireSourceMatch, true); if (JSON.stringify(current) !== JSON.stringify(source)) return; current = next; writes++; } });
  assert.equal(writes, 1);
});
test("canonical conversion is one history transaction and Undo/Redo retain complete owners", () => {
  const source = fixture(); const original = { id: "document", blocks: [source] }; let current = original; let past = [];
  const commands = useStudioBlockCommands({ activeDocument: current, updateActiveDocument(update) { const next = update(current); if (next === current) return; ({ history: past } = commitHistory(current, past)); current = next; } });
  convert({ onChange(next, match) { assert.equal(match, true); commands.updateBlock(source.id, block => JSON.stringify(block) === JSON.stringify(source) ? next : block); } });
  assert.equal(past.length, 1); assert.equal(current.blocks[0].type, "paragraph");
  const undo = undoHistory(current, past, []); assert.deepEqual(undo.workspace, original);
  const redo = redoHistory(undo.workspace, undo.history, undo.future); assert.deepEqual(redo.workspace, JSON.parse(JSON.stringify(current)));
});
test("conversion state and rich output use production Edit, Preview and HTML owners", () => {
  const block = fixture(); const next = embedLinkParagraph(block);
  const props = { selectedBlockId: block.id, onChange() {}, onTableCellFocus() {}, onTextSelection() {}, onLinkActivate() {} };
  const edit = renderToStaticMarkup(createElement(BlockField, { ...props, block: next }));
  const preview = renderToStaticMarkup(createElement(BlockRenderer, { blocks: [next], variant: "studio" }));
  for (const html of [edit, preview]) { assert.match(html, /id="resource"/); assert.match(html, /margin:20px/); assert.match(html, /color:#123456/); }
  assert.match(preview, /href="https:\/\/example.test\/resource"/);
  const markup = blockToHtml(next);
  assert.match(markup, /data-block-type="paragraph"/);
  assert.match(markup, /data-html-anchor="resource"/);
  assert.match(markup, /data-site-role="title"/);
  assert.match(markup, /href="https:\/\/example.test\/resource"/);
  assert.match(markup, /A useful caption/);
  const denied = { id: "group", type: "group", layout: "flow", allowedBlocks: ["embed"], children: [block] };
  const disabled = renderToStaticMarkup(createElement(BlockField, { ...props, block, rootBlocks: [denied] }));
  assert.match(disabled, /<button type="button" disabled="">Convert to link<\/button>/);
  const readonly = renderToStaticMarkup(createElement(BlockField, { ...props, block, writable: false }));
  assert.doesNotMatch(readonly, /Convert to link/);
});
