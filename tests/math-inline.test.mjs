import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";
import { loadProductionModule } from "./production-module.mjs";
const load = path => loadProductionModule(new URL(path, import.meta.url));
const math = await load("../app/content/math-runs.ts");
const validation = await load("../app/content/rich-text-validation.ts");
const rich = await load("../app/content/rich-text.ts");
const presentation = await load("../app/content/math-presentation.ts");
const footnote = await load("../app/content/footnote-runs.ts");
const workspace = await load("../app/studio/workspace-validation.ts");
const { initialStudioWorkspace } = await load("../app/studio/editor-model.ts");
const { TEMPLATE_VERSION, emptyTemplateStore, validateTemplateStore } = await load("../app/studio/template-model.ts");
const atom = math.mathRun({ type: "math", latex: "x^2", alternativeText: "x squared" });
const frozen = value => { if (value && typeof value === "object") { Object.values(value).forEach(frozen); Object.freeze(value); } return value; };
const paragraph = { id: "math-p", type: "paragraph", text: "a\uFFFCb", runs: [{ text: "a" }, atom, { text: "b" }] };

test("Math is one protected, noninteractive logical slot", () => {
  assert.equal(math.validMathRun(atom), true);
  assert.equal(rich.plainTextFromRuns([atom]), "\uFFFC");
  assert.deepEqual(rich.withoutInteractiveTextMarks([atom, footnote.footnoteReferenceRun("n")]), [{ ...atom, marks: undefined }]);
  assert.equal(footnote.readableTextFromFootnoteRuns([atom]), "x squared");
  assert.equal(footnote.insertFootnoteReference([atom], 1, "n").length, 2);
});
test("insert at every caret and replace a selection without mutating neighbours", () => {
  const source = frozen([{ text: "abcd", marks: ["bold"] }]);
  for (let offset = 0; offset <= 4; offset++) {
    const inserted = math.createMathFromRange(source, offset, offset);
    assert.equal(rich.plainTextFromRuns(inserted), "abcd".slice(0, offset) + "\uFFFC" + "abcd".slice(offset));
    assert.equal(inserted.find(run => run.inline).inline.latex, "");
  }
  const selected = math.createMathFromRange(source, 1, 3);
  assert.equal(rich.plainTextFromRuns(selected), "a\uFFFCd");
  assert.equal(selected[1].inline.latex, "bc");
  assert.deepEqual(math.restoreMathSource(selected, 1, 2).runs, [{ text: "abcd", marks: ["bold"] }]);
  for (const [start, end] of [[-1, 1], [0, 5], [2, 1], [NaN, 1]]) assert.equal(math.createMathFromRange(source, start, end), null);
});
test("split formatting survives unchanged syntax restoration; edited syntax restores current source", () => {
  const source = frozen([{ text: "x", marks: ["bold"] }, { text: "^2", marks: ["italic", { type: "highlight", backgroundColor: "#ff0" }] }]);
  const inserted = math.createMathFromRange(source, 0, 3);
  assert.deepEqual(math.restoreMathSource(inserted, 0, 1).runs, source);
  const edited = [math.mathRun({ type: "math", latex: "y^3", alternativeText: "" })];
  assert.deepEqual(math.restoreMathSource(edited, 0, 1), { runs: [{ text: "y^3", marks: undefined }], end: 3 });
});
test("legacy mismatched source and formatting remain exact and render one equation", () => {
  const mark = { type: "math", latex: "x^2", alternativeText: "square" };
  const runs = frozen([{ text: "original", marks: ["bold", mark] }, { text: " prose", marks: ["italic", mark] }]);
  const active = math.legacyMathAtRange(runs, 0, 14);
  assert.equal(active.end, 14);
  assert.deepEqual(active.sourceRuns, [{ text: "original", marks: ["bold"] }, { text: " prose", marks: ["italic"] }]);
  assert.equal(math.legacyMathAtRange([...runs, { text: " trailing" }], 0, 15), null);
  assert.equal(math.legacyMathAtRange(runs, 2, 13).end, 14);
  assert.equal(math.legacyMathAtRange(runs, -1, 1), null);
  const entries = math.mathRenderEntries(runs);
  assert.equal(entries.length, 1);
  const html = presentation.legacyMathHtml(entries[0].legacyRuns, true);
  assert.equal((html.match(/class="katex"/g) ?? []).length, 1);
  const encoded = html.match(/data-math-legacy="([^"]*)"/)[1].replaceAll("&quot;", '"').replaceAll("&amp;", "&").replaceAll("&lt;", "<").replaceAll("&gt;", ">");
  assert.deepEqual(math.legacyMathFromData(encoded), runs);
});
test("invalid, unsafe and recursive object payloads are rejected", () => {
  const base = atom.inline;
  for (const object of [{ ...base, extra: 1 }, { ...base, mathml: "<math><mi>x</mi></math>" }, { ...base, latex: "x".repeat(12001) }, { ...base, sourceRuns: [atom] }, { ...base, sourceRuns: [{ text: "x", marks: [{ type: "link", url: "/" }] }] }, { type: "math", mathml: '<math><script>x</script></math>', alternativeText: "" }]) assert.equal(validation.validRichTextRun(math.mathRun(object)), false);
  assert.equal(presentation.mathPresentation({ type: "math", latex: "\\frac{", alternativeText: "" }).error !== null, true);
  assert.equal(presentation.mathPresentation({ type: "math", latex: "", alternativeText: "" }).html, "");
  assert.doesNotMatch(presentation.mathObjectHtml({ type: "math", latex: "", alternativeText: "" }), /\uFFFC/);
});
test("Math metadata round-trips and rendered children are never authoritative", () => {
  const html = presentation.mathObjectHtml(atom.inline, true);
  assert.match(html, /contenteditable="false"/);
  const data = html.match(/data-math-object="([^"]*)"/)[1].replaceAll("&quot;", '"');
  assert.deepEqual(math.mathObjectFromData(data), atom.inline);
  assert.match(presentation.mathObjectHtml({ type: "math", latex: "<img onerror=x>", alternativeText: '"<x>' }), /&quot;&lt;x&gt;/);
});
test("new Math contract accepts every rich field and Button labels", () => {
  const richAtom = { text: "\uFFFC", runs: [atom] };
  for (const block of [paragraph, { id: "h", type: "heading", level: 2, ...richAtom }, { id: "b", type: "button", label: richAtom.text, labelRuns: richAtom.runs, url: "/", style: "primary" }, { id: "l", type: "list", style: "unordered", items: [richAtom] }, { id: "q", type: "quote", text: "quote", attribution: richAtom.text, attributionRuns: richAtom.runs }, { id: "t", type: "table", rows: [[richAtom.text]], cellRuns: [[richAtom.runs]], caption: richAtom.text, captionRuns: richAtom.runs }]) assert.equal(workspace.validContentBlocks([block]), true, block.type);
});
test("workspace, publication and template gates retain Footnote predecessors but reject under-versioned Math", () => {
  const document = { ...initialStudioWorkspace.documents[0], blocks: [paragraph] };
  const value = { ...initialStudioWorkspace, activeDocumentId: document.id, documents: [document] };
  assert.equal(workspace.validateStudioWorkspace({ ...value, version: 24 }).version, 24);
  for (const reader of [workspace.validateStudioWorkspace, workspace.migrateStudioWorkspace]) assert.throws(() => reader({ ...value, version: 23 }));
  assert.equal(TEMPLATE_VERSION, "0.26.0");
  assert.equal(validateTemplateStore({ ...emptyTemplateStore(), version: "0.24.0" }).version, TEMPLATE_VERSION);
});

// Exercise the production Canvas handlers with isolated document/history state.
// The browser replay remains the evidence for native selection and focus.
const { runInNewContext } = await import("node:vm");
const canvasSource = await readFile(new URL("../app/studio/studio-canvas.tsx", import.meta.url), "utf8");
const canvasTree = ts.createSourceFile("studio-canvas.tsx", canvasSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const declarations = new Map();
function collect(node) { if (ts.isFunctionDeclaration(node) && node.name) declarations.set(node.name.text, node); ts.forEachChild(node, collect); }
collect(canvasTree);
const handlerNames = ["isEditableTextBlock", "isEditableRichTextBlock", "richTextContent", "withRichTextContent", "richTextFieldFromDocument", "restoreMathSelection", "toggleMath", "updateMath", "closeMath"];
const handlerCode = ts.transpileModule(handlerNames.map(name => {
  assert.ok(declarations.has(name), `Production ${name} must exist`);
  return declarations.get(name).getText(canvasTree);
}).join("\n") + "\nObject.assign(globalThis, { toggleMath, updateMath, closeMath, restoreMathSelection, richTextFieldFromDocument });", { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
const operations = await import("../app/studio/studio-command-operations.mjs");
const listStructure = await load("../app/studio/list-structure.ts");
const listText = await load("../app/content/list-item-text.ts");
const model = await load("../app/content/model.ts");
function canvasHarness(block, dataset = {}, selection = { start: 0, end: 0 }, deferred = false) {
  const frames = [], pending = [], feedback = [], focused = [], selections = [];
  const editor = { isConnected: true, dataset: { studioBlockId: block.id, ...dataset }, closest: () => null, focus: () => focused.push(true) };
  const context = { ...math, ...rich, ...listStructure, ...listText, listItemText: model.listItemText, findBlockById: operations.findBlockById,
    currentDocumentRef: { current: { id: "math-doc", blocks: [structuredClone(block)] } }, writableRef: { current: true }, selectedLinkOwnerRef: { current: block.id },
    highlightTargetRef: { current: { editor, selection } }, mathCaptureRef: { current: null }, mathDismissedRef: { current: null }, mathTarget: null,
    richFormSelectionEpochRef: { current: 0 }, dismissRichTextForms: () => {}, onSetPublishFeedback: message => feedback.push(message), setRichTextMenuBlockId: () => {},
    requestAnimationFrame: callback => { frames.push(callback); return frames.length; },
    restoreEditorSelection: (_editor, value) => selections.push(value),
  };
  context.setMathTarget = value => { context.mathTarget = typeof value === "function" ? value(context.mathTarget) : value; };
  context.mathField = element => context.richTextFieldFromDocument(element, context.currentDocumentRef.current);
  context.onUpdateBlock = (id, update) => { const apply = () => { context.currentDocumentRef.current = operations.updateBlockById(context.currentDocumentRef.current, id, update); }; if (deferred) pending.push(apply); else apply(); };
  runInNewContext(handlerCode, context);
  context.mathCaptureRef.current = { documentId: "math-doc", baseline: JSON.stringify(context.mathField(editor).runs) };
  return { context, editor, focused, feedback, pending, selections, frames, flush: () => { while (pending.length) pending.shift()(); while (frames.length) frames.shift()(); }, block: () => context.currentDocumentRef.current.blocks[0] };
}
const localCopy = value => JSON.parse(JSON.stringify(value));
test("actual Canvas Math command inserts, edits and restores selected source", () => {
  const h = canvasHarness({ id: "p", type: "paragraph", text: "x^2" }, {}, { start: 0, end: 3 });
  h.context.toggleMath(); h.flush();
  assert.equal(h.block().runs[0].inline.latex, "x^2");
  assert.equal(h.context.updateMath({ type: "math", latex: "y^3", alternativeText: "cube" }), true);
  h.context.highlightTargetRef.current.selection = { start: 0, end: 1 };
  h.context.mathCaptureRef.current.baseline = JSON.stringify(h.block().runs);
  h.context.toggleMath(); h.flush();
  assert.equal(h.block().text, "y^3");
  assert.deepEqual(localCopy(h.selections.at(-1)), { start: 0, end: 3 });
});
test("actual Canvas delayed writes reject document, ownership and whole-block changes", () => {
  for (const change of [h => { h.context.currentDocumentRef.current.id = "other"; }, h => { h.context.writableRef.current = false; }, h => { h.context.currentDocumentRef.current.blocks[0].editorial = { name: "Renamed" }; }]) {
    const h = canvasHarness({ id: "p", type: "paragraph", text: "x" }, {}, { start: 0, end: 1 }, true);
    h.context.toggleMath(); change(h); h.flush();
    assert.equal(h.block().text, "x"); assert.equal(h.focused.length, 0);
  }
  const h = canvasHarness({ id: "p", type: "paragraph", text: "x" });
  h.context.currentDocumentRef.current.blocks[0].text = "Changed";
  h.context.toggleMath(); assert.equal(h.feedback.length, 1); assert.equal(h.block().text, "Changed");
});
test("actual Canvas blank cleanup is guarded and never writes into another document", () => {
  for (const scenario of ["close", "readonly", "switch", "delayed-readonly"]) {
    const h = canvasHarness({ id: "p", type: "paragraph", text: "ab" }, {}, { start: 1, end: 1 }, scenario === "delayed-readonly");
    h.context.toggleMath(); h.flush();
    if (scenario === "readonly") h.context.writableRef.current = false;
    if (scenario === "switch") h.context.currentDocumentRef.current.id = "other";
    h.context.closeMath(false);
    if (scenario === "delayed-readonly") h.context.writableRef.current = false;
    h.flush();
    assert.equal(h.block().text, scenario === "close" ? "ab" : "a\uFFFCb");
    assert.equal(h.context.mathTarget, null);
  }
});
test("actual Canvas delayed focus rejects changed owner, document and detached editor", () => {
  for (const change of [h => { h.context.selectedLinkOwnerRef.current = "other-block"; }, h => { h.context.currentDocumentRef.current.id = "other"; }, h => { h.editor.isConnected = false; }, h => { h.context.writableRef.current = false; }]) {
    const h = canvasHarness({ id: "p", type: "paragraph", text: "x" });
    h.context.restoreMathSelection(h.editor, 0, 1); change(h); h.flush(); assert.equal(h.focused.length, 0);
  }
});
test("actual Canvas edits long mismatched legacy Math in place, retaining prose and formats", () => {
  const mark = { type: "math", latex: "x^2", alternativeText: "" };
  const runs = [{ text: "a".repeat(12001), marks: ["bold", mark] }, { text: "z", marks: ["italic", mark] }];
  const h = canvasHarness({ id: "p", type: "paragraph", text: runs.map(run => run.text).join(""), runs }, {}, { start: 0, end: 12002 });
  h.context.mathTarget = { documentId: "math-doc", blockId: "p", editor: h.editor, start: 0, end: 12002, baseline: JSON.stringify(runs), blockSnapshot: JSON.stringify(h.block()), math: mark };
  assert.equal(h.context.updateMath({ type: "math", latex: "y^3", alternativeText: "cube" }), true);
  assert.equal(h.block().text.length, 12002); assert.equal(h.block().runs[0].marks[0], "bold"); assert.equal(h.block().runs[1].marks[0], "italic");
  assert.equal(h.block().runs[0].marks[1].latex, "y^3");
  assert.equal(h.context.updateMath({ type: "math", latex: "", alternativeText: "" }), true); h.flush();
  assert.deepEqual(localCopy(h.block().runs), [{ text: "a".repeat(12001), marks: ["bold"] }, { text: "z", marks: ["italic"] }]);
});
test("actual Canvas Math resolves and updates each owning rich-text field", () => {
  const fixtures = [
    [{ id: "h", type: "heading", level: 2, text: "x" }, {}, "text"],
    [{ id: "b", type: "button", label: "x", url: "/", style: "primary" }, {}, "label"],
    [{ id: "q", type: "quote", text: "body", attribution: "x" }, { quoteCitation: "true" }, "attribution"],
    [{ id: "i", type: "image", src: "/fixture.png", alt: "", caption: "x" }, {}, "caption"],
    [{ id: "e", type: "embed", url: "https://example.com", caption: "x" }, {}, "caption"],
    [{ id: "t", type: "table", rows: [["other"]], caption: "x" }, {}, "caption"],
    [{ id: "t", type: "table", rows: [["x", "other"]] }, { tableCellRow: "0", tableCellColumn: "0" }, "cell"],
    [{ id: "l", type: "list", style: "unordered", items: [{ text: "parent", children: [{ id: "nested", type: "list", style: "ordered", items: ["x"] }] }] }, { listItemIndex: "0", listContextId: "nested" }, "nested"],
  ];
  for (const [block, dataset, field] of fixtures) {
    const h = canvasHarness(block, dataset, { start: 0, end: 1 }); h.context.toggleMath(); h.flush();
    assert.equal(h.context.mathField(h.editor).runs[0].inline.latex, "x", field);
    assert.equal(h.context.updateMath({ type: "math", latex: "y", alternativeText: "" }), true, field);
    assert.equal(h.context.mathField(h.editor).runs[0].inline.latex, "y", field);
    if (field === "cell") assert.equal(h.block().rows[0][1], "other");
    if (field === "attribution") assert.equal(h.block().text, "body");
  }
});

test("actual rich editor Math paste preserves neighbours, reports invalid content and honours read-only", () => {
  const declaration = declarations.get("handleMathPaste"); assert.ok(declaration);
  const publisher = declarations.get("publishCaretFormats"); assert.ok(publisher);
  const code = ts.transpileModule(publisher.getText(canvasTree) + "\n" + declaration.getText(canvasTree) + "\nglobalThis.paste = handleMathPaste;", { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  for (const scenario of ["valid", "readonly", "handled-elsewhere", "invalid", "ordinary"]) {
    const content = [], feedback = [], selections = [], formats = [];
    const editor = { innerHTML: "unchanged" };
    const scope = { props: {}, editable: scenario !== "readonly", readMathClipboardRuns: () => scenario === "invalid" ? { handled: true, error: "Invalid Math" } : scenario === "ordinary" ? { handled: false } : { handled: true, runs: [atom] },
      editorRef: { current: editor }, selectionWithinEditor: () => ({ start: 1, end: 2 }), editorToRuns: () => [{ text: "abc" }],
      ...math, ...rich, withoutInteractiveFormatting: false, pendingFormatsRef: { current: {} }, mediaUrls: {}, footnoteNumbers: new Map(),
      runsToEditorHtml: runs => JSON.stringify(runs), onChange: (text, runs) => content.push({ text, runs }), reportFeedback: message => feedback.push(message),
      restoreEditorSelection: (_editor, selection) => selections.push(selection), onSelectionChange: () => {},
      reportCaretFormats: (_editor, snapshot) => formats.push(snapshot),
    };
    runInNewContext(code, scope);
    let prevented = false;
    scope.paste({ defaultPrevented: scenario === "handled-elsewhere", clipboardData: { getData: () => "typed Math HTML" }, preventDefault: () => { prevented = true; } });
    assert.equal(prevented, ["valid", "invalid"].includes(scenario));
    if (scenario === "valid") { assert.equal(content[0].text, "a\uFFFCc"); assert.deepEqual(localCopy(selections), [{ start: 2, end: 2 }]); assert.equal(scope.pendingFormatsRef.current, null); }
    else { assert.equal(content.length, 0); assert.equal(editor.innerHTML, "unchanged"); }
    assert.equal(feedback.length, scenario === "invalid" ? 1 : 0);
    assert.deepEqual(formats, scenario === "valid" ? [null] : []);
  }
});

test("actual shared deferred focus rejects changed rich field and changed resulting runs", () => {
  for (const change of [h => { h.editor.dataset.quoteCitation = "true"; }, h => { h.context.currentDocumentRef.current.blocks[0].text = "changed"; }]) {
    const h = canvasHarness({ id: "q", type: "quote", text: "body", attribution: "cite" });
    h.context.restoreMathSelection(h.editor, 1, 1, JSON.stringify(h.context.mathField(h.editor).runs));
    change(h); h.flush(); assert.equal(h.focused.length, 0); assert.equal(h.selections.length, 0);
  }
});
test("actual shared focus restoration restores pending formats after native focus", () => {
  const h = canvasHarness({ id: "p", type: "paragraph", text: "ab" });
  const order = [];
  h.editor.focus = () => order.push("focus");
  h.context.restoreEditorSelection = () => order.push("selection");
  h.context.caretFormats = (_editor, offset, marks) => order.push({ offset, marks });
  const pending = [{ type: "language", language: "", direction: "rtl" }];
  h.context.restoreMathSelection(h.editor, 1, 1, JSON.stringify(h.context.mathField(h.editor).runs), pending); h.flush();
  assert.deepEqual(order, ["focus", "selection", { offset: 1, marks: pending }]);
});
