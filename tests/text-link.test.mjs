import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { loadProductionModule } from "./production-module.mjs";

const load = path => loadProductionModule(new URL(path, import.meta.url));
const link = await load("../app/content/text-link.ts");
const rich = await load("../app/content/rich-text.ts");
const caret = await load("../app/content/caret-formatting.ts");
const list = await load("../app/studio/list-structure.ts");
const listText = await load("../app/content/list-item-text.ts");
const model = await load("../app/content/model.ts");
const operations = await import("../app/studio/studio-command-operations.mjs");
const mark = { type: "link", url: "/one" };
const copy = value => JSON.parse(JSON.stringify(value));
const draft = { url: "example.org", text: "", opensInNewTab: false };

test("caret insertion uses URL fallback or title and preserves surrounding marks", () => {
  for (const start of [0, 1, 2]) {
    const next = link.applyTextLink([{ text: "ab", marks: ["bold"] }], { start, end: start }, { ...draft, text: "title" }, ["italic"]);
    assert.equal(rich.plainTextFromRuns(next.runs), "ab".slice(0, start) + "title" + "ab".slice(start));
    assert.deepEqual(next.runs.find(run => run.text === "title").marks, ["italic", { type: "link", url: "https://example.org", opensInNewTab: undefined }]);
  }
  assert.equal(rich.plainTextFromRuns(link.applyTextLink([], { start: 0, end: 0 }, draft).runs), "https://example.org");
});
test("existing link expands across non-link marks; mixed and different links are inactive", () => {
  const runs = [{ text: "a", marks: [mark, "bold"] }, { text: "bc", marks: [mark, "italic"] }, { text: "d" }];
  assert.deepEqual(link.textLinkAtRange(runs, { start: 1, end: 1 }), { mark, start: 0, end: 3 });
  assert.deepEqual(link.textLinkAtRange(runs, { start: 1, end: 2 }), { mark, start: 0, end: 3 });
  for (const range of [{ start: 0, end: 0 }, { start: 3, end: 3 }, { start: 0, end: 4 }]) assert.equal(link.textLinkAtRange(runs, range), null);
  assert.equal(link.textLinkAtRange([{ text: "a", marks: [mark] }, { text: "b", marks: [{ ...mark, url: "/two" }] }], { start: 0, end: 2 }), null);
  assert.equal(link.textLinkAtRange(runs, { start: 1, end: 1 }, []), null);
});
test("unchanged selected text preserves mixed formatting and typed objects", () => {
  const atom = { text: "\uFFFC", inline: { type: "footnote", id: "n" } };
  const runs = [{ text: "a", marks: ["bold"] }, atom, { text: "b", marks: ["italic"] }];
  const next = link.applyTextLink(runs, { start: 0, end: 3 }, { ...draft, text: "a\uFFFCb", opensInNewTab: true });
  assert.deepEqual(copy(next.runs[1]), atom);
  assert.ok(next.runs[0].marks.includes("bold")); assert.ok(next.runs[2].marks.includes("italic"));
  assert.equal(link.applyTextLink(runs, { start: 0, end: 3 }, { ...draft, text: "replacement" }), null);
  const removed = link.removeTextLink(next.runs, { start: 0, end: 3 });
  assert.equal(rich.plainTextFromRuns(removed), "a\uFFFCb"); assert.ok(removed[0].marks.includes("bold"));
});
test("invalid ranges, unsafe URLs and zero-length legacy metadata refuse mutation", () => {
  for (const range of [{ start: -1, end: 1 }, { start: 1.5, end: 2 }, { start: 2, end: 1 }, { start: 0, end: 4 }]) assert.equal(link.applyTextLink([{ text: "abc" }], range, draft), null);
  assert.equal(link.applyTextLink([{ text: "abc" }], { start: 0, end: 1 }, { ...draft, url: "javascript:alert(1)" }), null);
  assert.equal(link.applyTextLink([{ text: "", marks: [{ type: "footnote", id: "n" }] }], { start: 0, end: 0 }, draft), null);
});
test("legacy object marks remain intact and never become nested link descendants", () => {
  for (const object of [{ type: "footnote", id: "n" }, { type: "math", latex: "x", alternativeText: "x" }, { type: "inline-image", mediaId: "image", alt: "image" }]) {
    const runs = [{ text: "before " }, { text: "source", marks: [object, "bold"] }, { text: " after" }];
    const next = link.applyTextLink(runs, { start: 0, end: 19 }, { ...draft, text: "before source after" });
    assert.deepEqual(next.runs[1], runs[1]); assert.ok(next.runs[0].marks.some(mark => mark.type === "link"));
    assert.equal(link.textLinkAtRange(next.runs, { start: 0, end: 19 }), null);
  }
});

const source = await readFile(new URL("../app/studio/studio-canvas.tsx", import.meta.url), "utf8");
const tree = ts.createSourceFile("canvas.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const declarations = new Map();
function collect(node) { if (ts.isFunctionDeclaration(node) && node.name) declarations.set(node.name.text, node); ts.forEachChild(node, collect); }
collect(tree);
const names = ["isEditableTextBlock", "isEditableRichTextBlock", "richTextContent", "withRichTextContent", "richTextFieldFromDocument", "currentLanguageField", "openLinkEditor", "closeLink", "commitLink", "applyLink", "removeLink", "restoreMathSelection"];
const code = ts.transpileModule(names.map(name => { assert.ok(declarations.has(name)); return declarations.get(name).getText(tree); }).join("\n") + "\nObject.assign(globalThis, { richTextFieldFromDocument, openLinkEditor, closeLink, applyLink, removeLink });", { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
function harness(block, dataset = {}, selection = { start: 0, end: 0 }, deferred = false) {
  const writes = [], focus = [], pending = [], frames = [];
  const editor = { isConnected: true, dataset: { studioBlockId: block.id, ...dataset }, closest: () => null };
  const scope = { ...link, ...rich, ...caret, ...list, ...listText, listItemText: model.listItemText, findBlockById: operations.findBlockById,
    collectBlockIds: value => [value.id],
    currentDocumentRef: { current: { id: "doc", blocks: [copy(block)] } }, selectedLinkOwnerRef: { current: block.id }, writableRef: { current: true }, richFormSelectionEpochRef: { current: 0 }, linkEditor: null,
    activeTableCell: () => undefined, currentListTextRange: () => null, formattingTarget: value => value,
    captureHighlightTarget: () => {}, setRichTextMenuBlockId: () => {}, onSetPublishFeedback: () => {},
    prepareRichTextFormTarget: (_keep, target) => ({ ...target, documentSnapshot: JSON.stringify(scope.currentDocumentRef.current.blocks) }),
    document: { activeElement: editor }, requestAnimationFrame: fn => frames.push(fn),
    restoreEditorSelection: (_editor, value) => focus.push(value), caretFormats: () => {},
  };
  scope.setLinkEditor = value => { scope.linkEditor = value; }; scope.setLinkError = value => { scope.error = value; };
  scope.onUpdateBlock = (id, update) => { const apply = () => { const before = JSON.stringify(scope.currentDocumentRef.current); scope.currentDocumentRef.current = operations.updateBlockById(scope.currentDocumentRef.current, id, update); if (before !== JSON.stringify(scope.currentDocumentRef.current)) writes.push(true); }; if (deferred) pending.push(apply); else apply(); };
  runInNewContext(code, scope);
  editor.focus = () => { scope.document.activeElement = editor; };
  scope.mathField = target => scope.richTextFieldFromDocument(target, scope.currentDocumentRef.current);
  scope.captureHighlightTarget = () => {
    const field = scope.richTextFieldFromDocument(editor, scope.currentDocumentRef.current);
    scope.languageCaptureRef = { current: { documentId: "doc", ownerId: block.id, blockId: field.block.id, itemIndex: field.itemIndex, listId: field.listId, cell: field.cell, editor, selection, range: null, baseline: JSON.stringify(field.runs), blockSnapshot: JSON.stringify(field.block), pending: selection.start === selection.end ? caret.marksAtCaret(field.runs, selection.start) : undefined } };
  };
  return { scope, editor, writes, focus, field: () => scope.richTextFieldFromDocument(editor, scope.currentDocumentRef.current), flush: () => { while (pending.length) pending.shift()(); }, flushFocus: () => { while (frames.length) frames.shift()(); } };
}
test("actual Link command inserts at caret in each supported field", () => {
  const fixtures = [
    [{ id: "p", type: "paragraph", text: "ab" }, {}],
    [{ id: "h", type: "heading", level: 2, text: "ab" }, {}],
    [{ id: "l", type: "list", items: ["ab", "untouched"] }, { listItemIndex: "0", listContextId: "l" }],
    [{ id: "q", type: "quote", text: "untouched", attribution: "ab" }, { quoteCitation: "true" }],
    [{ id: "t", type: "table", rows: [["ab", "untouched"]], caption: "untouched" }, { tableCellRow: "0", tableCellColumn: "0" }],
    [{ id: "t", type: "table", rows: [["untouched"]], caption: "ab" }, {}],
    [{ id: "i", type: "image", src: "/image.png", alt: "", caption: "ab" }, {}],
    [{ id: "e", type: "embed", url: "https://example.org", caption: "ab" }, {}],
  ];
  for (const [block, dataset] of fixtures) {
    const h = harness(block, dataset, { start: 1, end: 1 }); h.scope.openLinkEditor(block);
    assert.ok(h.scope.linkEditor, block.type); Object.assign(h.scope.linkEditor, { ...draft, text: "X" });
    let prevented = false; h.scope.applyLink({ preventDefault: () => { prevented = true; } });
    assert.equal(prevented, true); assert.equal(rich.plainTextFromRuns(h.field().runs), "aXb"); assert.equal(h.writes.length, 1); assert.equal(h.scope.linkEditor, null);
  }
});
test("actual existing caret link edit and unlink preserve non-link formats; unchanged apply is inert", () => {
  const block = { id: "p", type: "paragraph", text: "abc", runs: [{ text: "a", marks: [mark, "bold"] }, { text: "bc", marks: [mark, "italic"] }] };
  const h = harness(block, {}, { start: 1, end: 1 }); h.scope.openLinkEditor(block);
  assert.equal(h.scope.linkEditor.text, "abc"); h.scope.applyLink({ preventDefault() {} }); assert.equal(h.writes.length, 0);
  h.scope.openLinkEditor(block); h.scope.linkEditor.url = "/two"; h.scope.applyLink({ preventDefault() {} }); assert.equal(h.writes.length, 1);
  assert.deepEqual(copy(h.field().runs[0].marks), ["bold", { ...mark, url: "/two" }]);
  h.scope.openLinkEditor(block); h.scope.removeLink(); assert.equal(h.writes.length, 2);
  assert.deepEqual(copy(h.field().runs), [{ text: "a", marks: ["bold"] }, { text: "bc", marks: ["italic"] }]);
});
test("actual deferred command rejects ownership, document, field and block changes", () => {
  for (const change of [h => { h.scope.writableRef.current = false; }, h => { h.scope.currentDocumentRef.current.id = "other"; }, h => { h.scope.selectedLinkOwnerRef.current = "other"; }, h => { h.editor.isConnected = false; }, h => { h.editor.dataset.quoteCitation = "true"; }, h => { h.scope.currentDocumentRef.current.blocks[0].editorial = { name: "changed" }; }]) {
    const block = { id: "q", type: "quote", text: "abc", attribution: "xyz" };
    const h = harness(block, {}, { start: 1, end: 1 }, true); h.scope.openLinkEditor(block); Object.assign(h.scope.linkEditor, { ...draft, text: "X" }); h.scope.applyLink({ preventDefault() {} }); change(h); h.flush(); h.flushFocus(); assert.equal(h.writes.length, 0); assert.equal(h.focus.length, 0);
  }
});
test("actual Link focus restoration waits for accepted runs and yields to a newer action", () => {
  const block = { id: "p", type: "paragraph", text: "abc" };
  for (const change of [null, h => { h.scope.richFormSelectionEpochRef.current++; }, h => { h.scope.currentDocumentRef.current.id = "other"; }, h => { h.scope.writableRef.current = false; }]) {
    const h = harness(block, {}, { start: 1, end: 1 }); h.scope.openLinkEditor(block); Object.assign(h.scope.linkEditor, { ...draft, text: "X" }); h.scope.applyLink({ preventDefault() {} });
    if (change) change(h); h.flushFocus(); assert.equal(h.focus.length, change ? 0 : 1);
    if (!change) assert.deepEqual(copy(h.focus[0]), { start: 2, end: 2 });
  }
  const delayed = harness(block, {}, { start: 1, end: 1 }, true); delayed.scope.openLinkEditor(block); Object.assign(delayed.scope.linkEditor, { ...draft, text: "X" }); delayed.scope.applyLink({ preventDefault() {} }); delayed.flushFocus(); assert.equal(delayed.focus.length, 0);
});
test("actual Link cancel restores captured caret without a content operation", () => {
  const block = { id: "p", type: "paragraph", text: "abc" }; const h = harness(block, {}, { start: 1, end: 1 });
  h.scope.openLinkEditor(block); h.scope.closeLink(true); h.flushFocus(); assert.equal(h.writes.length, 0); assert.deepEqual(copy(h.focus), [{ start: 1, end: 1 }]);
});
