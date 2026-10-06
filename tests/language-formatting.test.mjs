import assert from "node:assert/strict";
import { readStudioSource } from "./studio-module-source.mjs";
import { runInNewContext } from "node:vm";
import test from "node:test";
import ts from "typescript";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { loadProductionModule } from "./production-module.mjs";
const load = path => loadProductionModule(new URL(path, import.meta.url));
const language = await load("../app/content/language-runs.ts");
const rich = await load("../app/content/rich-text.ts");
const caret = await load("../app/content/caret-formatting.ts");
const validation = await load("../app/content/rich-text-validation.ts");
const contract = await load("../app/content/rich-text-contract.ts");
const workspace = await load("../app/studio/workspace-validation.ts");
const { initialStudioWorkspace } = await load("../app/studio/editor-model.ts");
const html = await load("../app/studio/studio-html-editor.ts");
const content = await load("../app/components/content.tsx");
const fr = { type: "language", language: "fr", direction: "ltr" };
const en = { ...fr, language: "en" };
const blank = { ...fr, language: "", direction: "rtl" };
const copy = value => JSON.parse(JSON.stringify(value));

test("Language allows direction-only and bounded tag syntax without pretending registry validation", () => {
  for (const tag of ["", "fr", "zh-Hant-TW", "en-u-ca-gregory", "x-private", "i-klingon"]) assert.equal(validation.validRichTextMark({ ...fr, language: tag }), true, tag);
  for (const tag of ["a", "en_uk", "en--us", "en-<script>", "a".repeat(256)]) assert.equal(validation.validRichTextMark({ ...fr, language: tag }), false, tag);
  assert.equal(validation.validRichTextMark({ ...fr, direction: "auto" }), false);
  assert.equal(validation.validRichTextMark({ ...fr, language: "en" + "-abcdefgh".repeat(40) }), true, "retain historically readable values");
});
test("Language checked state follows caret boundary and explicit pending rules", () => {
  const runs = [{ text: "a", marks: [fr] }, { text: "b", marks: [en] }];
  assert.deepEqual(language.languageAtRange(runs, 1, 1), en);
  assert.equal(language.languageAtRange(runs, 0, 0), undefined);
  assert.equal(language.languageAtRange(runs, 2, 2), undefined);
  assert.equal(language.languageAtRange(runs, 1, 1, []), undefined);
  assert.deepEqual(language.languageAtRange(runs, 1, 1, [fr]), fr);
  assert.equal(language.languageAtRange(runs, 0, 2), undefined);
  assert.equal(language.languageAtRange([{ text: "a", marks: [fr] }, { text: "b", marks: ["bold"] }], 1, 1), undefined);
});
test("equal Language attributes stay active across split formatting; atoms are excluded", () => {
  const runs = [{ text: "a", marks: [fr, "bold"] }, { text: "b", marks: [fr, "italic"] }];
  assert.deepEqual(language.languageAtRange(runs, 0, 2), fr);
  assert.deepEqual(language.languageRangeAtCaret(runs, 1, fr), { start: 0, end: 2 });
  assert.deepEqual(rich.updateTextMark(runs, 0, 2, fr, "remove"), [{ text: "a", marks: ["bold"] }, { text: "b", marks: ["italic"] }]);
  const atom = { text: "\uFFFC", inline: { type: "footnote", id: "n" } };
  assert.equal(language.languageAtRange([...runs, atom], 0, 3), undefined);
  assert.deepEqual(rich.updateTextMark([atom], 0, 1, fr, "set"), [{ ...atom, marks: undefined }]);
});
test("extended Language is detected inside Math recovery and old envelopes reject it", () => {
  assert.equal(contract.containsExtendedLanguage({ sourceRuns: [{ text: "x", marks: [blank] }] }), true);
  assert.equal(contract.containsExtendedLanguage({ sourceRuns: [{ text: "x", marks: [fr] }] }), false);
  for (const mark of [blank, { ...fr, language: "en-u-ca-gregory" }]) {
    const paragraph = { id: "p", type: "paragraph", text: "x", runs: [{ text: "x", marks: [mark] }] };
    const document = { ...initialStudioWorkspace.documents[0], blocks: [paragraph] };
    const value = { ...initialStudioWorkspace, activeDocumentId: document.id, documents: [document] };
    assert.equal(workspace.validateStudioWorkspace({ ...value, version: 24 }).version, 24);
    for (const reader of [workspace.validateStudioWorkspace, workspace.migrateStudioWorkspace]) assert.throws(() => reader({ ...value, version: 23 }));
  }
});
test("editor export and Preview use bdo for directional override", () => {
  const block = { id: "p", type: "paragraph", text: "x", runs: [{ text: "x", marks: [blank] }] };
  assert.match(html.blockToHtml(block), /<bdo lang="" dir="rtl">x<\/bdo>/);
  assert.match(renderToStaticMarkup(React.createElement(content.BlockRenderer, { blocks: [block], variant: "studio" })), /<bdo lang="" dir="rtl">x<\/bdo>/);
});
const source = readStudioSource("app/studio/studio-canvas.tsx");
const tree = ts.createSourceFile("canvas.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const declarations = new Map();
function collect(node) { if (ts.isFunctionDeclaration(node) && node.name) declarations.set(node.name.text, node); ts.forEachChild(node, collect); }
collect(tree);
const names = ["isEditableTextBlock", "isEditableRichTextBlock", "richTextContent", "withRichTextContent", "richTextFieldFromDocument", "currentLanguageField", "commitLanguage", "toggleLanguage", "applyLanguage", "closeLanguage"];
const code = ts.transpileModule(names.map(name => { assert.ok(declarations.has(name)); return declarations.get(name).getText(tree); }).join("\n") + "\nObject.assign(globalThis, { richTextFieldFromDocument, commitLanguage, toggleLanguage, applyLanguage, closeLanguage });", { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
const operations = await import("../app/studio/studio-command-operations.mjs");
const list = await load("../app/studio/list-structure.ts");
const listText = await load("../app/content/list-item-text.ts");
const model = await load("../app/content/model.ts");
function harness(block, dataset = {}, selection = { start: 0, end: 1 }, deferred = false) {
  const pending = [], focus = [], writes = [];
  let formats;
  const editor = { isConnected: true, dataset: { studioBlockId: block.id, ...dataset }, closest: () => null };
  const scope = { ...language, ...caret, ...rich, ...list, ...listText, listItemText: model.listItemText, findBlockById: operations.findBlockById,
    currentDocumentRef: { current: { id: "doc", blocks: [structuredClone(block)] } }, writableRef: { current: true }, selectedLinkOwnerRef: { current: block.id }, languageTarget: null,
    richFormSelectionEpochRef: { current: 0 }, prepareRichTextFormTarget: (_keep, target) => target, dismissRichTextForms: () => {}, languageCaptureRef: { current: null }, setRichTextMenuBlockId: () => {}, onSetPublishFeedback: () => {}, setTextSelections: () => {}, restoreMathSelection: (...args) => focus.push(args),
    caretFormats: (_editor, offset, marks) => { if (marks !== undefined) formats = marks; return formats ?? caret.marksAtCaret(scope.richTextFieldFromDocument(editor, scope.currentDocumentRef.current).runs, offset); },
  };
  scope.setLanguageTarget = value => { scope.languageTarget = value; };
  scope.onUpdateBlock = (id, update) => { const apply = () => { const before = JSON.stringify(scope.currentDocumentRef.current); scope.currentDocumentRef.current = operations.updateBlockById(scope.currentDocumentRef.current, id, update); if (before !== JSON.stringify(scope.currentDocumentRef.current)) writes.push(true); }; if (deferred) pending.push(apply); else apply(); };
  runInNewContext(code, scope);
  const field = scope.richTextFieldFromDocument(editor, scope.currentDocumentRef.current);
  scope.languageCaptureRef.current = { documentId: "doc", ownerId: block.id, blockId: block.id, itemIndex: field.itemIndex, listId: field.listId, cell: field.cell, editor, selection, baseline: JSON.stringify(field.runs), blockSnapshot: JSON.stringify(block), pending: selection.start === selection.end ? scope.caretFormats(editor, selection.start) : undefined };
  return { scope, editor, writes, focus, flush: () => { while (pending.length) pending.shift()(); }, field: () => scope.richTextFieldFromDocument(editor, scope.currentDocumentRef.current), formats: () => formats };
}
test("actual Language command sets pending caret formatting without a document operation", () => {
  const h = harness({ id: "p", type: "paragraph", text: "ab" }, {}, { start: 1, end: 1 });
  h.scope.toggleLanguage(); assert.ok(h.scope.languageTarget);
  assert.equal(h.scope.applyLanguage(blank), true);
  assert.deepEqual(copy(h.formats()), [blank]); assert.equal(h.writes.length, 0);
  const inserted = caret.formatCaretInsertion("ab", [{ text: "aXb" }], 1, h.formats());
  assert.deepEqual(inserted.runs[1].marks, [blank]);
});
test("actual Language active click removes the contiguous extent and retains other formats", () => {
  const h = harness({ id: "p", type: "paragraph", text: "abc", runs: [{ text: "a", marks: [fr, "bold"] }, { text: "b", marks: [fr, "italic"] }, { text: "c" }] }, {}, { start: 1, end: 1 });
  h.scope.toggleLanguage(); assert.equal(h.scope.languageTarget, null);
  assert.deepEqual(copy(h.field().runs), [{ text: "a", marks: ["bold"] }, { text: "b", marks: ["italic"] }, { text: "c" }]);
  assert.equal(h.writes.length, 1);
});
test("actual Language selected operation guards deferred document, owner, field and block changes", () => {
  for (const change of [h => { h.scope.currentDocumentRef.current.id = "other"; }, h => { h.scope.writableRef.current = false; }, h => { h.editor.isConnected = false; }, h => { h.scope.selectedLinkOwnerRef.current = "other"; }, h => { h.scope.currentDocumentRef.current.blocks[0].editorial = { name: "changed" }; }, h => { h.editor.dataset.quoteCitation = "true"; }]) {
    const h = harness({ id: "q", type: "quote", text: "abc", attribution: "xyz" }, {}, { start: 0, end: 1 }, true);
    h.scope.toggleLanguage(); assert.equal(h.scope.applyLanguage(fr), true); change(h); h.flush();
    assert.equal(h.writes.length, 0);
  }
});
test("actual Language selected operation reaches each rich field without changing its neighbours", () => {
  const fixtures = [
    [{ id: "h", type: "heading", level: 2, text: "x" }, {}],
    [{ id: "b", type: "button", label: "x", url: "/", style: "primary" }, {}],
    [{ id: "q", type: "quote", text: "body", attribution: "x" }, { quoteCitation: "true" }],
    [{ id: "i", type: "image", src: "/fixture.png", alt: "", caption: "x" }, {}],
    [{ id: "e", type: "embed", url: "https://example.com", caption: "x" }, {}],
    [{ id: "t", type: "table", rows: [["other"]], caption: "x" }, {}],
    [{ id: "t", type: "table", rows: [["x", "other"]] }, { tableCellRow: "0", tableCellColumn: "0" }],
    [{ id: "l", type: "list", style: "unordered", items: [{ text: "parent", children: [{ id: "nested", type: "list", style: "ordered", items: ["x"] }] }] }, { listItemIndex: "0", listContextId: "nested" }],
  ];
  for (const [block, dataset] of fixtures) {
    const h = harness(block, dataset); h.scope.toggleLanguage(); assert.equal(h.scope.applyLanguage(fr), true, block.type);
    assert.deepEqual(copy(h.field().runs[0].marks), [fr]); assert.equal(h.writes.length, 1);
    if (block.type === "quote") assert.equal(h.scope.currentDocumentRef.current.blocks[0].text, "body");
    if (dataset.tableCellRow) assert.equal(h.scope.currentDocumentRef.current.blocks[0].rows[0][1], "other");
  }
});
