import assert from "node:assert/strict";
import { readStudioSource } from "./studio-module-source.mjs";
import { runInNewContext } from "node:vm";
import test from "node:test";
import ts from "typescript";
import { loadProductionModule } from "./production-module.mjs";

const load = path => loadProductionModule(new URL(path, import.meta.url));
const rich = await load("../app/content/rich-text.ts");
const image = await load("../app/content/inline-image.ts");
const math = await load("../app/content/math-runs.ts");
const language = await load("../app/content/language-runs.ts");
const link = await load("../app/content/text-link.ts");
const highlight = await load("../app/content/text-highlight.ts");
const caret = await load("../app/content/caret-formatting.ts");
const lists = await load("../app/studio/list-structure.ts");
const listText = await load("../app/content/list-item-text.ts");
const model = await load("../app/content/model.ts");
const siblings = await load("../app/studio/block-sibling-operations.ts");
const operations = await import("../app/studio/studio-command-operations.mjs");
const source = readStudioSource("app/studio/studio-canvas.tsx");
const tree = ts.createSourceFile("canvas.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const functions = new Map();
function collect(node) {
  if (ts.isFunctionDeclaration(node) && node.name) functions.set(node.name.text, node);
  if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.text === "closeHighlight") functions.set(node.name.text, node);
  ts.forEachChild(node, collect);
}
collect(tree);
function bind(names, scope) {
  const code = names.map(name => {
    assert.ok(functions.has(name), `Production ${name} exists`);
    const node = functions.get(name);
    return ts.isVariableDeclaration(node) ? `const ${name} = ${node.initializer.arguments[0].getText(tree)};` : node.getText(tree);
  }).join("\n") + `\nObject.assign(globalThis, {${names.join(",")}});`;
  runInNewContext(ts.transpileModule(code, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, scope);
}

const imageRun = image.inlineImageRun({ type: "image", src: "/fixture.svg", alt: "" });
function harness(blank = false) {
  const block = { id: "p", type: "paragraph", text: "a\uFFFC\uFFFCb", runs: [{ text: "a" }, math.mathRun({ type: "math", latex: blank ? "" : "x^2", alternativeText: "" }), imageRun, { text: "b" }] };
  const editor = { isConnected: true, dataset: { studioBlockId: "p" }, closest: () => null };
  const closed = [], writes = [], frames = [], restored = [];
  const scope = {
    ...rich, ...image, ...math, ...language, ...link, ...highlight, ...caret, ...lists, ...listText, ...siblings,
    listItemText: model.listItemText, findBlockById: operations.findBlockById,
    currentDocumentRef: { current: { id: "doc", blocks: [block] } }, writableRef: { current: true },
    writable: true, selectedLinkOwnerRef: { current: "p" }, document: { activeElement: editor },
    mathTarget: null, languageTarget: null, highlightTarget: null, imageTarget: null, imagePickerOpen: false, linkEditor: null,
    imageEpochRef: { current: 0 }, imageDismissedRef: { current: null }, mathDismissedRef: { current: null },
    richFormSelectionEpochRef: { current: 0 },
    highlightCaretReseedRef: { current: null },
    currentListTextRange: () => null, formattingTarget: block => block, activeTableCell: () => undefined, collectBlockIds: block => [block.id], captureHighlightTarget: () => {},
    requestAnimationFrame(fn) { frames.push(fn); }, restoreEditorSelection(_editor, selection) { restored.push(selection); }, setRichTextMenuBlockId() {}, onSetPublishFeedback() {}, onSelectBlock() {},
    setMathTarget(value) { scope.mathTarget = typeof value === "function" ? value(scope.mathTarget) : value; },
    setLanguageTarget(value) { scope.languageTarget = value; },
    setHighlightTarget(value) { scope.highlightTarget = value; },
    setHighlightCaptureAvailable(value) { scope.highlightCaptureAvailable = value; },
    setImageTarget(value) { scope.imageTarget = value; },
    setImagePickerOpen(value) { scope.imagePickerOpen = value; },
    setLinkEditor(value) { scope.linkEditor = value; }, setLinkError() {},
    richTextMenuTriggerRefs: { current: {} },
    setTextSelections() {},
    caretFormats(editor, _offset, marks) { if (marks !== undefined) editor.pendingFormats = marks; return editor.pendingFormats; },
    onUpdateBlock(id, updater) {
      const before = JSON.stringify(scope.currentDocumentRef.current.blocks);
      scope.currentDocumentRef.current = operations.updateBlockById(scope.currentDocumentRef.current, id, updater);
      if (JSON.stringify(scope.currentDocumentRef.current.blocks) !== before) writes.push(id);
    },
  };
  bind(["isEditableTextBlock", "isEditableRichTextBlock", "richTextContent", "withRichTextContent", "richTextFieldFromDocument", "currentLanguageField", "currentImageField", "captureImage", "openInlineImagePicker", "activateInlineImage", "closeInlineImage", "activateMathEditor", "closeMath", "toggleLanguage", "closeLanguage", "closeHighlight", "restoreMathSelection", "openHighlight", "changeHighlight", "reseedHighlightCaret", "openLinkEditor", "closeLink", "dismissRichTextForms", "prepareRichTextFormTarget"], scope);
  editor.focus = () => { scope.document.activeElement = editor; editor.onFocus?.(); };
  scope.mathField = target => scope.richTextFieldFromDocument(target, scope.currentDocumentRef.current);
  function capture(start, end) {
    const field = scope.mathField(editor);
    const target = { documentId: "doc", ownerId: "p", blockId: field.block.id, itemIndex: field.itemIndex, listId: field.listId, cell: field.cell, editor, selection: { start, end }, pending: start === end ? caret.marksAtCaret(field.runs, start) : undefined, baseline: JSON.stringify(field.runs), blockSnapshot: JSON.stringify(field.block) };
    editor.pendingFormats = target.pending;
    scope.languageCaptureRef = { current: target };
    scope.highlightTargetRef = { current: { ...target, text: rich.plainTextFromRuns(field.runs), anchor: { left: 0, bottom: 0 } } };
  }
  capture(0, 1);
  return { scope, editor, closed, writes, frames, restored, flush: () => { while (frames.length) frames.shift()(); }, capture, block: () => scope.currentDocumentRef.current.blocks[0] };
}

test("one shared rich-form switch dismisses only other forms without focus restoration", () => {
  for (const keep of ["math", "image", "language", "highlight", "link"]) {
    const closed = [];
    const scope = { mathTarget: {}, imageTarget: {}, languageTarget: {}, highlightTarget: {}, linkEditor: {} };
    for (const name of ["Math", "InlineImage", "Language", "Highlight", "Link"]) scope[`close${name}`] = restore => closed.push([name, restore]);
    bind(["dismissRichTextForms"], scope);
    scope.dismissRichTextForms(keep);
    assert.equal(closed.length, 4);
    assert.ok(closed.every(([, restore]) => restore === false));
    assert.ok(!closed.some(([name]) => name.toLowerCase().replace("inline", "") === keep));
  }
});

test("keyboard image activation dismisses Math, Language and Highlight without changing content", () => {
  const h = harness();
  h.scope.activateMathEditor(h.editor, { start: 1, end: 2 }, true);
  h.scope.languageTarget = {}; h.scope.highlightTarget = {};
  h.scope.activateInlineImage(h.editor, { start: 2, end: 3 }, true);
  assert.ok(h.scope.imageTarget);
  assert.equal(h.scope.mathTarget, null);
  assert.equal(h.scope.languageTarget, null);
  assert.equal(h.scope.highlightTarget, null);
  assert.equal(h.writes.length, 0);
});

test("keyboard Math activation cancels an image target and other forms", () => {
  const h = harness();
  h.scope.activateInlineImage(h.editor, { start: 2, end: 3 }, true);
  const epoch = h.scope.imageEpochRef.current;
  h.scope.languageTarget = {}; h.scope.highlightTarget = {};
  h.scope.activateMathEditor(h.editor, { start: 1, end: 2 }, true);
  assert.ok(h.scope.mathTarget);
  assert.equal(h.scope.imageTarget, null);
  assert.equal(h.scope.languageTarget, null);
  assert.equal(h.scope.highlightTarget, null);
  assert.ok(h.scope.imageEpochRef.current > epoch);
  assert.equal(h.writes.length, 0);
});

test("leaving exact Math selection dismisses; focusing its form retains the captured object", () => {
  for (const selection of [{ start: 2, end: 2 }, { start: 0, end: 3 }]) {
    const h = harness();
    h.scope.activateMathEditor(h.editor, { start: 1, end: 2 }, true);
    h.scope.activateMathEditor(h.editor, selection);
    assert.equal(h.scope.mathTarget, null);
    assert.equal(h.writes.length, 0);
  }
  const h = harness();
  h.scope.activateMathEditor(h.editor, { start: 1, end: 2 }, true);
  h.scope.document.activeElement = {};
  h.scope.activateMathEditor(h.editor, { start: 2, end: 2 });
  assert.ok(h.scope.mathTarget);
});

test("blank Math dismissal retains guarded cleanup and never changes a stale block", () => {
  for (const stale of [false, true]) {
    const h = harness(true);
    h.scope.activateMathEditor(h.editor, { start: 1, end: 2 }, true);
    if (stale) h.block().editorial = { name: "Renamed" };
    h.scope.activateMathEditor(h.editor, { start: 2, end: 2 });
    assert.equal(h.scope.mathTarget, null);
    assert.equal(h.block().text, stale ? "a\uFFFC\uFFFCb" : "a\uFFFCb");
  }
});

test("Image picker, Language and Highlight entry points share exclusive dismissal", () => {
  for (const [action, expected] of [["openInlineImagePicker", "image"], ["toggleLanguage", "language"], ["openHighlight", "highlight"]]) {
    const h = harness();
    h.scope.activateMathEditor(h.editor, { start: 1, end: 2 }, true);
    h.scope.activateInlineImage(h.editor, { start: 2, end: 3 }, true);
    h.scope.languageTarget = {}; h.scope.highlightTarget = {};
    h.capture(0, 1);
    h.scope[action]();
    for (const name of ["math", "image", "language", "highlight"]) assert.equal(Boolean(h.scope[`${name}Target`]), name === expected, `${action}: ${name}`);
    assert.equal(h.writes.length, 0);
  }
});

test("empty Math cleanup rebases the next Image, Language and Highlight capture", () => {
  for (const action of ["activateInlineImage", "openInlineImagePicker", "toggleLanguage", "openHighlight"]) {
    const h = harness(true);
    h.scope.activateMathEditor(h.editor, { start: 1, end: 2 }, true);
    h.capture(2, 3);
    if (action === "activateInlineImage") h.scope.activateInlineImage(h.editor, { start: 2, end: 3 }, true);
    else h.scope[action]();
    const target = h.scope.imageTarget ?? h.scope.languageTarget ?? h.scope.highlightTarget;
    assert.ok(target, action);
    assert.equal(target.selection.start, 1, action);
    assert.equal(target.selection.end, 2, action);
    assert.equal(h.block().text, "a\uFFFCb", action);
    assert.equal(h.writes.length, 1, action);
    if (target.baseline) assert.equal(target.baseline, JSON.stringify(h.block().runs), action);
    if (h.scope.imageTarget) assert.ok(h.scope.currentImageField(target), action);
    if (h.scope.languageTarget) assert.ok(h.scope.currentLanguageField(target), action);
    if (h.scope.highlightTarget) assert.equal(target.text, h.block().text, action);
  }
});

test("switching from empty Math to a second Math object rebases that object", () => {
  const h = harness(true);
  h.block().runs[2] = math.mathRun({ type: "math", latex: "y^2", alternativeText: "" });
  h.scope.activateMathEditor(h.editor, { start: 1, end: 2 }, true);
  h.scope.activateMathEditor(h.editor, { start: 2, end: 3 }, true);
  assert.equal(h.scope.mathTarget.start, 1);
  assert.equal(h.scope.mathTarget.end, 2);
  assert.equal(h.scope.mathTarget.math.latex, "y^2");
  assert.equal(h.scope.mathTarget.baseline, JSON.stringify(h.block().runs));
  assert.equal(h.writes.length, 1);
});

test("empty Math cleanup rebases the actual Link capture before closing either form", () => {
  const h = harness(true);
  h.scope.activateMathEditor(h.editor, { start: 1, end: 2 }, true);
  h.capture(3, 3);
  h.scope.openLinkEditor(h.block());
  assert.ok(h.scope.linkEditor);
  assert.equal(h.scope.mathTarget, null);
  assert.equal(h.scope.linkEditor.selection.start, 2);
  assert.equal(h.scope.linkEditor.selection.end, 2);
  assert.equal(h.scope.linkEditor.baseline, JSON.stringify(h.block().runs));
  assert.equal(h.scope.linkEditor.documentSnapshot, JSON.stringify(h.scope.currentDocumentRef.current.blocks));
  assert.equal(h.writes.length, 1);
  h.scope.closeLink(true); h.flush();
  assert.deepEqual(JSON.parse(JSON.stringify(h.restored.at(-1))), { start: 2, end: 2 });
});

test("actual rich-field selection reader notifies object owners for caret and wide selections", () => {
  for (const [start, end] of [[1, 1], [0, 3]]) {
    const calls = [];
    const node = {};
    const editor = { contains: () => true };
    const scope = { editorRef: { current: editor }, window: { getSelection: () => ({ rangeCount: 1, anchorNode: node, focusNode: node, getRangeAt: () => ({ startContainer: node, endContainer: node, startOffset: start, endOffset: end }) }) }, pendingFormatsRef: { current: null }, editorOffset: (_editor, _node, offset) => offset, editable: true, onSelectionChange() {}, activateImage: (_editor, range) => calls.push(["image", range.start, range.end]), activateMath: (_editor, range) => calls.push(["math", range.start, range.end]) };
    bind(["readSelection"], scope);
    scope.readSelection();
    assert.deepEqual(calls, [["image", start, end], ["math", start, end]]);
  }
});

function imageAfterEmptyMath() {
  const h = harness(true);
  h.scope.activateMathEditor(h.editor, { start: 1, end: 2 }, true);
  h.scope.activateInlineImage(h.editor, { start: 2, end: 3 }, true);
  assert.equal(h.frames.length, 1);
  return h;
}

test("queued cleanup restoration runs for the current form and rebased field", () => {
  const h = imageAfterEmptyMath();
  h.flush();
  assert.deepEqual(JSON.parse(JSON.stringify(h.restored)), [{ start: 1, end: 2 }]);
});

test("closing or switching the form cancels its queued cleanup restoration", () => {
  for (const action of ["close", "language", "highlight"]) {
    const h = imageAfterEmptyMath();
    if (action === "close") h.scope.closeInlineImage(false);
    else { h.capture(0, 1); h.scope[action === "language" ? "toggleLanguage" : "openHighlight"](); }
    h.flush();
    assert.equal(h.restored.length, 0, action);
  }
});

test("intentional Image, Language, Math and Highlight dismissal restores once", () => {
  for (const form of ["image", "language", "math", "highlight"]) {
    const h = harness();
    if (form === "image") h.scope.activateInlineImage(h.editor, { start: 2, end: 3 }, true);
    if (form === "math") h.scope.activateMathEditor(h.editor, { start: 1, end: 2 }, true);
    if (form === "language") h.scope.toggleLanguage();
    if (form === "highlight") h.scope.openHighlight();
    h.scope[{ image: "closeInlineImage", language: "closeLanguage", math: "closeMath", highlight: "closeHighlight" }[form]](true);
    h.flush();
    assert.equal(h.restored.length, 1, form);
  }
});

test("queued dismissal yields to a new form and synchronous focus activation", () => {
  for (const duringFocus of [false, true]) {
    const h = harness();
    h.scope.activateInlineImage(h.editor, { start: 2, end: 3 }, true);
    h.scope.closeInlineImage(true);
    h.capture(0, 1);
    if (duringFocus) h.editor.onFocus = () => h.scope.toggleLanguage();
    else h.scope.toggleLanguage();
    h.flush();
    assert.equal(h.restored.length, 0);
    assert.ok(h.scope.languageTarget);
  }
});

test("queued restoration rejects owner, document, field and writable changes", () => {
  for (const change of [
    h => { h.scope.selectedLinkOwnerRef.current = "other"; },
    h => { h.scope.currentDocumentRef.current.id = "other"; },
    h => { h.block().runs = [{ text: "changed" }]; },
    h => { h.scope.writableRef.current = false; },
    h => { h.editor.isConnected = false; },
  ]) {
    const h = harness();
    h.scope.activateInlineImage(h.editor, { start: 2, end: 3 }, true);
    h.scope.closeInlineImage(true);
    change(h);
    h.flush();
    assert.equal(h.restored.length, 0);
  }
});

test("blank Math dismissal restores only its actual cleanup result", () => {
  for (const changed of [false, true]) {
    const h = harness(true);
    h.scope.activateMathEditor(h.editor, { start: 1, end: 2 }, true);
    h.scope.closeMath(true);
    if (changed) h.block().runs = [{ text: "changed" }];
    h.flush();
    assert.equal(h.restored.length, changed ? 0 : 1);
  }
  const h = harness(true);
  h.scope.activateMathEditor(h.editor, { start: 1, end: 2 }, true);
  h.scope.onUpdateBlock = () => {};
  h.scope.closeMath(true);
  h.flush();
  assert.equal(h.restored.length, 0, "rejected or deferred cleanup cannot restore a projected caret");
});

test("actual input lifecycle invalidates pending restoration anywhere in Studio", () => {
  let effect;
  function find(node) {
    if (ts.isCallExpression(node) && node.expression.getText(tree) === "useLayoutEffect" && node.arguments[0]?.getText(tree).includes('const epoch = richFormSelectionEpochRef;')) effect = node.arguments[0];
    ts.forEachChild(node, find);
  }
  find(tree);
  assert.ok(effect);
  for (const event of ["pointerdown", "keydown", "beforeinput", "blur", "unmount"]) {
    const h = harness();
    const listeners = new Map();
    const target = { addEventListener(name, callback) { listeners.set(name, callback); }, removeEventListener(name) { listeners.delete(name); } };
    Object.assign(h.scope.document, target);
    h.scope.window = target;
    runInNewContext(ts.transpileModule(`globalThis.cleanup = (${effect.getText(tree)})();`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, h.scope);
    h.scope.activateInlineImage(h.editor, { start: 2, end: 3 }, true);
    h.scope.closeInlineImage(true);
    if (event === "unmount") h.scope.cleanup(); else listeners.get(event)();
    h.flush();
    assert.equal(h.restored.length, 0, event);
    h.scope.cleanup();
    assert.equal(listeners.size, 0);
  }
});


test("Highlight refreshes its captured field after each independent colour change", () => {
  const h = harness();
  h.scope.openHighlight();
  h.scope.changeHighlight("textColor", "#FF0000");
  h.scope.changeHighlight("backgroundColor", "#FFFF00");
  assert.deepEqual(JSON.parse(JSON.stringify(h.block().runs[0].marks)), [{ type: "highlight", textColor: "#FF0000", backgroundColor: "#FFFF00" }]);
  assert.equal(h.writes.length, 2);
  assert.equal(h.scope.highlightTarget.baseline, JSON.stringify(h.block().runs));
  assert.equal(h.scope.highlightTarget.blockSnapshot, JSON.stringify(h.block()));
  h.scope.changeHighlight("textColor");
  assert.deepEqual(JSON.parse(JSON.stringify(h.block().runs[0].marks)), [{ type: "highlight", backgroundColor: "#FFFF00" }]);
  h.scope.changeHighlight("backgroundColor");
  assert.equal(h.block().runs[0].marks, undefined);
});

test("Highlight refuses stale documents, owners, runs, structure, detached fields and writer loss", () => {
  for (const mutation of ["document", "owner", "runs", "structure", "detached", "writer"]) {
    const h = harness();
    h.scope.openHighlight();
    if (mutation === "document") h.scope.currentDocumentRef.current.id = "another-document";
    if (mutation === "owner") h.scope.selectedLinkOwnerRef.current = "another-block";
    if (mutation === "runs") h.block().runs[0].marks = ["bold"];
    if (mutation === "structure") h.block().style = { textColor: "#123456" };
    if (mutation === "detached") h.editor.isConnected = false;
    if (mutation === "writer") h.scope.writableRef.current = false;
    const before = JSON.stringify(h.scope.currentDocumentRef.current);
    h.scope.changeHighlight("textColor", "#FF0000");
    h.scope.closeHighlight(true);
    h.flush();
    assert.equal(JSON.stringify(h.scope.currentDocumentRef.current), before, mutation);
    assert.equal(h.writes.length, 0, mutation);
    assert.equal(h.restored.length, 0, mutation);
  }
});

test("caret Highlight preserves pending colours across successive choices without adding content history", () => {
  const h = harness();
  h.capture(0, 0);
  h.scope.openHighlight();
  h.scope.changeHighlight("textColor", "#FF0000");
  h.scope.changeHighlight("backgroundColor", "#FFFF00");
  assert.deepEqual(JSON.parse(JSON.stringify(h.editor.pendingFormats)), [{ type: "highlight", textColor: "#FF0000", backgroundColor: "#FFFF00" }]);
  assert.equal(h.writes.length, 0);
  h.scope.changeHighlight("textColor");
  assert.deepEqual(JSON.parse(JSON.stringify(h.editor.pendingFormats)), [{ type: "highlight", backgroundColor: "#FFFF00" }]);
  h.editor.pendingFormats = ["italic"];
  h.scope.changeHighlight("backgroundColor", "#ABCDEF");
  assert.deepEqual(h.editor.pendingFormats, ["italic"], "externally changed caret formats refuse a stale colour choice");
  assert.equal(h.writes.length, 0);
});

test("Highlight rechecks its source inside the dispatched block updater", () => {
  const h = harness();
  h.scope.openHighlight();
  h.scope.onUpdateBlock = (_id, updater) => {
    h.block().runs[0].marks = ["bold"];
    const before = h.block();
    assert.equal(updater(before), before);
  };
  h.scope.changeHighlight("textColor", "#FF0000");
  assert.deepEqual(h.block().runs[0].marks, ["bold"]);
});

test("pending-only Highlight retains a plain block snapshot without materialising runs", () => {
  const h = harness();
  h.scope.currentDocumentRef.current.blocks = [{ id: "p", type: "paragraph", text: "plain" }];
  h.capture(2, 2);
  h.scope.openHighlight();
  h.scope.changeHighlight("textColor", "#FF0000");
  assert.ok(h.scope.currentLanguageField(h.scope.highlightTarget));
  h.scope.changeHighlight("backgroundColor", "#FFFF00");
  assert.ok(h.scope.currentLanguageField(h.scope.highlightTarget));
  assert.equal(h.block().runs, undefined);
  assert.equal(h.writes.length, 0);
  assert.deepEqual(JSON.parse(JSON.stringify(h.editor.pendingFormats)), [{ type: "highlight", textColor: "#FF0000", backgroundColor: "#FFFF00" }]);
});

test("caret Highlight reseeds its own changed runs after the child render, including run boundaries", () => {
  for (const offset of [0, 1, 2]) {
    const h = harness();
    h.scope.currentDocumentRef.current.blocks = [{ id: "p", type: "paragraph", text: "abc", runs: [{ text: "ab", marks: [{ type: "highlight", backgroundColor: "#FFFF00" }] }, { text: "c" }] }];
    h.capture(offset, offset);
    h.scope.openHighlight();
    h.scope.changeHighlight("textColor", "#FF0000");
    if (h.writes.length) h.editor.pendingFormats = caret.marksAtCaret(h.block().runs, offset);
    h.scope.reseedHighlightCaret();
    h.scope.changeHighlight("backgroundColor", "#ABCDEF");
    if (h.writes.length) h.editor.pendingFormats = caret.marksAtCaret(h.block().runs, offset);
    h.scope.reseedHighlightCaret();
    assert.equal(h.writes.length, offset === 1 ? 2 : 0, `offset ${offset}: boundaries default outside the format`);
    assert.deepEqual(JSON.parse(JSON.stringify(h.editor.pendingFormats)), [{ type: "highlight", textColor: "#FF0000", backgroundColor: "#ABCDEF" }]);
    assert.ok(h.scope.currentLanguageField(h.scope.highlightTarget));
  }
});

test("Highlight reseeding refuses a switched document or an externally changed field", () => {
  for (const stale of ["document", "runs", "closed"]) {
    const h = harness();
    h.capture(1, 1);
    h.block().runs[0].marks = [{ type: "highlight", textColor: "#123456" }];
    h.capture(1, 1);
    h.scope.openHighlight();
    h.scope.changeHighlight("backgroundColor", "#FFFF00");
    h.editor.pendingFormats = ["italic"];
    if (stale === "document") h.scope.currentDocumentRef.current.id = "other";
    if (stale === "runs") h.block().runs[0].marks = ["bold"];
    if (stale === "closed") h.scope.closeHighlight(false);
    h.scope.reseedHighlightCaret();
    assert.deepEqual(h.editor.pendingFormats, ["italic"]);
  }
});
