import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";
import test from "node:test";
import ts from "typescript";
import { loadProductionModule } from "./production-module.mjs";
import { withHtmlDom } from "./html-dom-fixture.mjs";

const load = path => loadProductionModule(new URL(path, import.meta.url));
const operations = await load("../app/studio/block-menu-selection.ts");
const { blockMenuSiblingSelection, insertAtBlockSelectionEdge, pasteBlockSelectionAppearance } = operations;
const { editBlockSiblings } = await load("../app/studio/block-sibling-operations.ts");
const { cloneBlocksForInsertion } = await load("../app/studio/block-copy.ts");
const { createBlock } = await load("../app/studio/editor-model.ts");
const { createButtonForInsertion } = await load("../app/studio/button-insertion.ts");
const { validContentBlocks } = await load("../app/studio/workspace-validation.ts");
const { permitsBlockTreeChanges, containsTemplateContent, parentOfNestedBlock, groupAllowsChild } = await load("../app/studio/block-inserter-options.ts");
const { preservesBlockLocks } = await load("../app/content/block-editorial.ts");
const { reconcileFootnoteBlocks, canRemoveFootnoteOwners, preservesReferencedFootnotes } = await load("../app/content/footnote-reconciliation.ts");
const html = await load("../app/studio/studio-html-editor.ts");
const { findBlockById } = await import("../app/studio/studio-command-operations.mjs");
const { normaliseBlockSelection, orderedBlockEntries } = await import("../app/studio/block-selection.mjs");
const paragraph = id => ({ id, type: "paragraph", text: id, style: { anchor: `${id}-anchor` } });
const plain = value => JSON.parse(JSON.stringify(value));

const source = await readFile(new URL("../app/studio/studio-canvas.tsx", import.meta.url), "utf8");
const tree = ts.createSourceFile("studio-canvas.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const functions = new Map();
let pointerHandler;
let keyboardHandler;
function visit(node) {
  if (ts.isFunctionDeclaration(node) && node.name) functions.set(node.name.text, node);
  if (ts.isJsxAttribute(node) && node.name.getText(tree) === "onPointerDownCapture"
    && ts.isJsxExpression(node.initializer) && node.initializer.expression?.getText(tree).includes("clearMultiSelection()")) pointerHandler = node.initializer.expression;
  if (ts.isJsxAttribute(node) && node.name.getText(tree) === "onKeyDownCapture"
    && ts.isJsxExpression(node.initializer) && node.initializer.expression?.getText(tree).includes("let action: BlockMenuAction")) keyboardHandler = node.initializer.expression;
  ts.forEachChild(node, visit);
}
visit(tree);

function canvasScope(blocks, selectedIds, appearance = null) {
  const names = ["applyBlockList", "applyHtmlEditor", "applyCodeEditor", "canRemove", "menuBlocks", "groupingProposal", "newSiblingBlock", "blockMenuItems", "runBlockMenuAction"];
  for (const name of names) assert.ok(functions.has(name), `actual Canvas ${name}`);
  const compiled = ts.transpileModule(names.map(name => functions.get(name).getText(tree)).join("\n")
    + ";Object.assign(globalThis, {action: runBlockMenuAction, items: blockMenuItems, applyHtmlEditor, applyCodeEditor, applyBlockList});", { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  let sequence = 0;
  const document = { id: "document", blocks };
  const committed = [], focused = [], selected = [];
  const scope = {
    ...operations, ...html, editBlockSiblings, createBlock, createButtonForInsertion, validContentBlocks,
    permitsBlockTreeChanges, containsTemplateContent, parentOfNestedBlock, preservesBlockLocks,
    reconcileFootnoteBlocks, canRemoveFootnoteOwners, preservesReferencedFootnotes, groupAllowsChild, findBlockById, normaliseBlockSelection, orderedBlockEntries,
    structuredClone, crypto: { randomUUID: () => `created-${++sequence}` },
    cloneClipboardBlocks: items => cloneBlocksForInsertion(items, prefix => `${prefix}-${++sequence}`),
    activeDocument: document, currentDocumentRef: { current: document }, writable: true, writableRef: { current: true },
    validSelectionIds: selectedIds, copiedAppearance: appearance, allowHtmlEditing: true,
    setBlockMenuBlockId: () => {}, onSetPublishFeedback: () => {},
    onApplyDocumentCode: next => committed.push(next), focusInsertedBlock: id => focused.push(id),
    setBlockSelection: ids => selected.push(Array.from(ids)), onSelectBlock: id => focused.push(id),
    clearMultiSelection: () => selected.push([]), onClearBlockSelection: () => focused.push(null),
    selectionAnchorRef: { current: null }, selectionFocusRef: { current: null },
    requestAnimationFrame: callback => callback(), canvasScrollRef: { current: { focus() {} } }, htmlEditorTriggerRef: { current: null },
    htmlEditor: null, codeEditor: null, codeEditorToggleRef: { current: null },
    setHtmlEditor: value => { scope.htmlEditor = typeof value === "function" ? value(scope.htmlEditor) : value; },
    setCodeEditor: value => { scope.codeEditor = typeof value === "function" ? value(scope.codeEditor) : value; },
    onCodeEditorDirtyChange: value => { scope.codeDirty = value; },
  };
  runInNewContext(compiled, scope);
  return { scope, committed, focused, selected };
}

test("selection edges use canonical sibling order, including nested Group and Column owners", () => {
  const a = paragraph("a"), b = paragraph("b"), outside = paragraph("outside");
  for (const container of [null, { id: "group", type: "group", layout: "flow", children: [a, b] }, { id: "column", type: "column", children: [a, b] }]) {
    const blocks = container ? [container, outside] : [a, b, outside];
    assert.deepEqual(blockMenuSiblingSelection(blocks, [b, a]), [a, b]);
    const before = insertAtBlockSelectionEdge(blocks, [b, a], [paragraph("new")], false);
    const after = insertAtBlockSelectionEdge(blocks, [b, a], [paragraph("new")], true);
    assert.deepEqual((container ? before[0].children : before).map(block => block.id), container ? ["new", "a", "b"] : ["new", "a", "b", "outside"]);
    assert.deepEqual((container ? after[0].children : after).map(block => block.id), container ? ["a", "b", "new"] : ["a", "b", "new", "outside"]);
    if (container) assert.equal(after[1], outside);
  }
});

function codeFormScope() {
  const initial = createBlock("paragraph", "html-owner");
  initial.text = "Unchanged content";
  const block = initial;
  const h = canvasScope([block], [block.id]);
  const blockDraft = html.blockToHtml(block);
  h.scope.htmlEditor = { documentId: "document", blockId: block.id, initialBlockSnapshot: JSON.stringify(block), initialDraft: blockDraft, draft: blockDraft, error: null };
  const draft = html.formatHtml(html.blocksToHtml([block]));
  h.scope.codeEditor = { documentId: "document", initialDraft: draft, draft, initialBlocksSnapshot: JSON.stringify([block]), error: null };
  return { ...h, block };
}

test("unchanged actual HTML and Code Apply close without a content-history transaction", () => withHtmlDom(() => {
  for (const form of ["html", "code"]) {
    const h = codeFormScope();
    if (form === "html") h.scope.applyHtmlEditor(h.block); else h.scope.applyCodeEditor();
    assert.equal(h.scope[`${form}Editor`], null, form);
    assert.equal(h.committed.length, 0, form);
    if (form === "code") assert.equal(h.scope.codeDirty, false);
  }
}));

test("unchanged Apply keeps the form open after writer, document or source freshness is lost", () => withHtmlDom(() => {
  for (const form of ["html", "code"]) for (const stale of ["writer", "render-writer", "document", "source"]) {
    const h = codeFormScope();
    if (stale === "writer") h.scope.writableRef.current = false;
    if (stale === "render-writer") h.scope.writable = false;
    if (stale === "document") h.scope.currentDocumentRef.current = { ...h.scope.activeDocument, id: "other-document" };
    if (stale === "source") h.scope.currentDocumentRef.current = { ...h.scope.activeDocument, blocks: [{ ...h.block, text: "External change" }] };
    if (form === "html") h.scope.applyHtmlEditor(h.block); else h.scope.applyCodeEditor();
    assert.ok(h.scope[`${form}Editor`], `${form}: ${stale}`);
    assert.equal(h.committed.length, 0, `${form}: ${stale}`);
  }
}));

test("actual changed HTML and Code Apply still dispatch one validated content transaction", () => withHtmlDom(() => {
  for (const form of ["html", "code"]) {
    const h = codeFormScope();
    h.scope[`${form}Editor`].draft = h.scope[`${form}Editor`].draft.replace("Unchanged content", "Changed content");
    if (form === "html") h.scope.applyHtmlEditor(h.block); else h.scope.applyCodeEditor();
    assert.equal(h.scope[`${form}Editor`], null, form);
    assert.equal(h.committed.length, 1, form);
    assert.equal(h.committed[0][0].text, "Changed content", form);
  }
}));

test("HTML Apply refuses an open stale draft after both document refs rerender", () => withHtmlDom(() => {
  for (const changedDraft of [false, true]) for (const stale of ["content", "type", "document"]) {
    const h = codeFormScope();
    if (changedDraft) h.scope.htmlEditor.draft = h.scope.htmlEditor.draft.replace("Unchanged content", "Draft content");
    const block = stale === "content" ? { ...h.block, text: "Newer content" }
      : stale === "type" ? { id: h.block.id, type: "heading", level: 2, text: "Newer heading" } : h.block;
    const document = { ...h.scope.activeDocument, id: stale === "document" ? "other-document" : "document", blocks: [block] };
    h.scope.activeDocument = document;
    h.scope.currentDocumentRef.current = document;
    h.scope.applyHtmlEditor(block);
    assert.match(h.scope.htmlEditor.error, /changed outside the HTML editor/);
    assert.equal(h.committed.length, 0);
    assert.equal(h.scope.currentDocumentRef.current.blocks[0], block);
  }
}));

test("List Item child lists have separate sibling ownership", () => {
  const a = { id: "a", type: "list", style: "unordered", items: ["A"] };
  const b = { ...a, id: "b", items: ["B"] }, c = { ...a, id: "c", items: ["C"] };
  const blocks = [{ id: "list", type: "list", style: "unordered", items: [{ text: "first", children: [a, b] }, { text: "second", children: [c] }] }];
  assert.deepEqual(blockMenuSiblingSelection(blocks, [b, a]), [a, b]);
  assert.equal(blockMenuSiblingSelection(blocks, [a, c]), null);
  assert.equal(insertAtBlockSelectionEdge(blocks, [a, c], [{ ...c, id: "copy" }], true), blocks);
  const next = insertAtBlockSelectionEdge(blocks, [a, b], [{ ...c, id: "copy" }], true);
  assert.deepEqual(next[0].items[0].children.map(block => block.id), ["a", "b", "copy"]);
  assert.equal(next[0].items[1], blocks[0].items[1]);
});

test("actual Duplicate clones every selected sibling as one batch and selects all copies", async () => {
  const a = paragraph("a"), b = paragraph("b"), outside = paragraph("outside");
  for (const trigger of [a, b]) {
    const { scope, committed, focused, selected } = canvasScope([a, b, outside], ["b", "a"]);
    await scope.action("duplicate", trigger);
    assert.equal(committed.length, 1);
    const next = committed[0];
    assert.deepEqual(next.map(block => block.text), ["a", "b", "a", "b", "outside"]);
    assert.equal(next[0], a); assert.equal(next[1], b); assert.equal(next[4], outside);
    assert.notEqual(next[2].id, a.id); assert.notEqual(next[3].id, b.id);
    assert.equal(next[2].style.anchor, undefined); assert.equal(next[3].style.anchor, undefined);
    assert.equal(new Set(next.map(block => block.id)).size, next.length);
    assert.deepEqual(selected, [[next[2].id, next[3].id]]);
    assert.deepEqual(focused, [next[3].id]);
  }
});

test("actual Add before/after use selection edges from either selected block's menu", async () => {
  const a = paragraph("a"), b = paragraph("b"), outside = paragraph("outside");
  for (const action of ["before", "after"]) for (const trigger of [a, b]) {
    const { scope, committed, focused } = canvasScope([a, b, outside], ["b", "a"]);
    await scope.action(action, trigger);
    assert.equal(committed.length, 1);
    const index = action === "before" ? 0 : 2;
    const next = committed[0];
    assert.equal(next[index].type, "paragraph"); assert.equal(next[index].text, "");
    assert.deepEqual(next.filter((_, position) => position !== index), [a, b, outside]);
    assert.deepEqual(focused, [next[index].id]);
  }
});

test("Buttons selection edges insert an individual Button and retain its inherited appearance", async () => {
  const a = { id: "a", type: "button", label: "A", url: "", style: "primary" };
  const b = { ...a, id: "b", label: "B", style: "secondary" };
  const blocks = [{ id: "buttons", type: "buttons", children: [a, b] }];
  for (const action of ["before", "after"]) {
    const { scope, committed } = canvasScope(blocks, ["a", "b"]);
    await scope.action(action, b);
    const added = committed[0][0].children[action === "before" ? 0 : 2];
    assert.equal(added.type, "button"); assert.equal(added.style, action === "before" ? a.style : b.style);
    assert.equal(validContentBlocks(committed[0]), true);
  }
});

test("actual Duplicate remaps a selected Footnotes owner and preserves external note references", async () => {
  const referenced = { id: "ref", type: "paragraph", text: "\ufffc", runs: [{ text: "\ufffc", inline: { type: "footnote", id: "note" } }] };
  const notes = { id: "notes", type: "footnotes", notes: [{ id: "note", text: "Original note" }] };
  assert.equal(validContentBlocks([referenced, notes]), true);
  for (const ids of [["ref"], ["ref", "notes"]]) {
    const { scope, committed } = canvasScope([referenced, notes], ids);
    await scope.action("duplicate", referenced);
    assert.equal(committed.length, 1);
    const next = committed[0], copy = next.find(block => block.type === "paragraph" && block.id !== "ref");
    assert.equal(validContentBlocks(next), true);
    if (ids.length === 1) assert.equal(copy.runs[0].inline.id, "note");
    else {
      const copiedNotes = next.find(block => block.type === "footnotes" && block.id !== "notes");
      assert.notEqual(copiedNotes.notes[0].id, "note");
      assert.equal(copy.runs[0].inline.id, copiedNotes.notes[0].id);
    }
    assert.equal(referenced.runs[0].inline.id, "note"); assert.equal(notes.notes[0].id, "note");
  }
});

test("Paste styles targets every destination in one transaction, retaining content and unique anchors", async () => {
  const a = paragraph("a"), b = paragraph("b"), outside = paragraph("outside");
  const appearance = { ...paragraph("source"), style: { anchor: "source-anchor", textColor: "#FF0000", fontSizeCustom: "32px" } };
  const { scope, committed } = canvasScope([a, b, outside], ["a", "b"], appearance);
  await scope.action("paste-styles", b);
  assert.equal(committed.length, 1);
  assert.equal(committed[0][0].style.textColor, "#FF0000"); assert.equal(committed[0][1].style.textColor, "#FF0000");
  assert.equal(committed[0][0].style.anchor, "a-anchor"); assert.equal(committed[0][1].style.anchor, "b-anchor");
  assert.equal(committed[0][0].text, a.text); assert.equal(committed[0][1].text, b.text); assert.equal(committed[0][2], outside);
  assert.deepEqual(plain(pasteBlockSelectionAppearance([a], [{ ...b, id: "missing" }], appearance)), [a]);
});

test("different sibling owners, restricted insertions and Template Content refuse whole-selection duplication", async () => {
  const a = paragraph("a"), b = paragraph("b");
  const branches = [{ id: "g1", type: "group", layout: "flow", children: [a] }, { id: "g2", type: "group", layout: "flow", children: [b] }];
  const { scope, committed } = canvasScope(branches, ["a", "b"]);
  for (const action of ["duplicate", "before", "after"]) {
    const item = scope.items(b).find(item => item.action === action);
    assert.equal(item.disabled, true); assert.match(item.disabledReason, /same container/);
    await scope.action(action, b);
  }
  assert.equal(committed.length, 0);
  const oldHeading = { id: "old", type: "heading", level: 2, text: "Grandfathered" };
  const restricted = canvasScope([{ id: "restricted", type: "group", layout: "flow", allowedBlocks: ["paragraph"], children: [a, oldHeading] }], ["a", "old"]);
  assert.equal(restricted.scope.items(a).find(item => item.action === "duplicate").disabled, true);
  await restricted.scope.action("duplicate", a); assert.equal(restricted.committed.length, 0);
  const content = { id: "content", type: "template-content" };
  const template = canvasScope([a, content], ["a", "content"]);
  assert.equal(template.scope.items(a).find(item => item.action === "duplicate").disabled, true);
});

test("actual commit boundary refuses lost ownership, changed documents and stale content without selection changes", async () => {
  const a = paragraph("a"), b = paragraph("b");
  for (const scenario of ["lost-writer", "changed-document", "stale-blocks"]) {
    const { scope, committed, selected, focused } = canvasScope([a, b], ["a", "b"]);
    if (scenario === "lost-writer") scope.writableRef.current = false;
    if (scenario === "changed-document") scope.currentDocumentRef.current = { ...scope.activeDocument, id: "other" };
    if (scenario === "stale-blocks") scope.currentDocumentRef.current = { ...scope.activeDocument, blocks: [a, { ...b, text: "New text" }] };
    await scope.action("duplicate", b);
    assert.equal(committed.length, 0, scenario); assert.equal(selected.length, 0, scenario); assert.equal(focused.length, 0, scenario);
  }
});

test("actual Canvas pointer capture preserves the block range while using a toolbar or portalled block menu", () => {
  assert.ok(pointerHandler);
  const compiled = ts.transpileModule(`globalThis.pointer = ${pointerHandler.getText(tree)};`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  for (const selector of [".canvas-block-toolbar", ".studio-block-options-menu", ".multi-block-toolbar"]) {
    let cleared = 0;
    class Target { closest(query) { return query.split(/,\s*/).includes(selector) ? this : null; } }
    const scope = { Element: Target, crossBlockSelectionRef: { current: null }, previewing: false, codeEditor: null, clearMultiSelection: () => cleared++ };
    runInNewContext(compiled, scope);
    scope.pointer({ target: new Target(), button: 0 });
    assert.equal(cleared, 0);
  }
});

test("actual Canvas leaves Escape to the range toolbar and menu instead of clearing its selection", () => {
  assert.ok(keyboardHandler);
  const compiled = ts.transpileModule(`globalThis.keydown = ${keyboardHandler.getText(tree)};`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  for (const selector of [".studio-block-options-menu", ".multi-block-toolbar"]) {
    let cleared = 0;
    class Target { closest(query) { return query.split(/,\s*/).includes(selector) ? this : null; } }
    const scope = { Element: Target, previewing: false, codeEditor: null, selectedBlockId: null, clearMultiSelection: () => cleared++, blockSelectionModeRef: { current: true }, selectedBlockIdsRef: { current: ["a", "b"] } };
    runInNewContext(compiled, scope);
    scope.keydown({ target: new Target(), key: "Escape", preventDefault() {}, stopPropagation() {} });
    assert.equal(cleared, 0);
  }
});

test("range menu resolves its owning block and anchors to its visible trigger", () => {
  assert.match(source, /const multiMenuBlock = findBlockById\(activeDocument\.blocks, selectedRoots\.at\(-1\)/);
  assert.match(source, /element && !hasMultiSelection && blockMenuBlockId === block\.id/);
  assert.match(source, /ref=\{element => \{ if \(element && blockMenuBlockId === multiMenuBlock\.id\) htmlEditorTriggerRef\.current = element;/);
});

test("mixed Group selection wraps every sibling intact and selects the new wrapper from either menu owner", async () => {
  const child = paragraph("inside"), sibling = paragraph("sibling"), outside = paragraph("outside");
  const group = { id: "existing-group", type: "group", layout: "row", children: [child], visualStyle: { anchor: "group-anchor" } };
  for (const order of [[group, sibling], [sibling, group]]) for (const owner of [group, sibling]) {
    const blocks = [...order, outside];
    const before = plain(blocks);
    const { scope, committed, focused } = canvasScope(blocks, order.map(item => item.id));
    assert.equal(scope.items(owner).find(item => item.action === "group").label, "Group");
    await scope.action("group", owner);
    assert.equal(committed.length, 1);
    assert.equal(committed[0][0].type, "group"); assert.equal(committed[0][0].layout, "flow");
    assert.deepEqual(plain(committed[0][0].children), before.slice(0, 2));
    assert.equal(committed[0][1], outside);
    assert.equal(focused[0], committed[0][0].id);
    assert.deepEqual(plain(blocks), before);
  }
});

test("nested Group wrapping selects the new wrapper rather than an existing ancestor", async () => {
  const inside = paragraph("inside"), sibling = paragraph("sibling");
  const group = { id: "inner", type: "group", layout: "stack", children: [inside] };
  const outer = { id: "outer", type: "group", layout: "flow", children: [group, sibling] };
  const { scope, committed, focused } = canvasScope([outer], ["sibling", "inner"]);
  await scope.action("group", group);
  const wrapper = committed[0][0].children[0];
  assert.equal(wrapper.type, "group"); assert.deepEqual(wrapper.children.map(item => item.id), ["inner", "sibling"]);
  assert.equal(focused[0], wrapper.id); assert.notEqual(focused[0], "outer");
});

test("single-selected Group still ungroups while mixed cross-owner ranges refuse grouping", async () => {
  const child = paragraph("inside"), sibling = paragraph("sibling");
  const group = { id: "inner", type: "group", layout: "flow", children: [child] };
  const single = canvasScope([group, sibling], ["inner", "inside"]);
  assert.equal(single.scope.items(group).find(item => item.action === "group").label, "Ungroup");
  await single.scope.action("group", group);
  assert.deepEqual(plain(single.committed[0].map(item => item.id)), ["inside", "sibling"]);
  assert.equal(single.focused[0], "inside");
  const cross = canvasScope([{ id: "outer", type: "group", layout: "flow", children: [group] }, sibling], ["inner", "sibling"]);
  for (const owner of [group, sibling]) {
    const item = cross.scope.items(owner).find(item => item.action === "group");
    assert.equal(item.label, "Group"); assert.equal(item.disabled, true); assert.match(item.disabledReason, /same container/);
    await cross.scope.action("group", owner);
  }
  assert.equal(cross.committed.length, 0);
});

test("Group proposals retain parent restrictions, protected template owners and movement/removal locks", async () => {
  const a = paragraph("a"), b = paragraph("b");
  const scenarios = [
    { blocks: [{ id: "restricted", type: "group", layout: "flow", allowedBlocks: ["paragraph"], children: [a, b] }], selected: ["a", "b"], owner: a },
    { blocks: [{ ...a, editorial: { lock: { move: true } } }, b], selected: ["a", "b"], owner: b },
    { blocks: [{ ...a, editorial: { lock: { remove: true } } }, b], selected: ["a", "b"], owner: b },
    { blocks: [{ id: "locked-group", type: "group", layout: "flow", children: [a], editorial: { lock: { remove: true } } }], selected: ["locked-group"], ownerId: "locked-group" },
    { blocks: [{ id: "part", type: "group", layout: "flow", data: { templatePart: "header" }, children: [a] }, b], selected: ["part", "b"], owner: b },
  ];
  for (const scenario of scenarios) {
    const { scope, committed } = canvasScope(scenario.blocks, scenario.selected);
    const owner = scenario.owner ?? scenario.blocks.find(item => item.id === scenario.ownerId);
    assert.equal(scope.items(owner).find(item => item.action === "group").disabled, true);
    await scope.action("group", owner); assert.equal(committed.length, 0);
  }
});

test("Group focus hand-back focuses a nested boundary without entering or selecting its editable child", () => {
  const compiled = ts.transpileModule(functions.get("focusInsertedBlock").getText(tree) + ";globalThis.focusBoundary = focusInsertedBlock;", { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  let frameFocused = 0, childFocused = 0;
  const frame = { dataset: { studioNestedBlockId: "nested-wrapper" }, hasAttribute: () => false, querySelector: () => ({ focus: () => childFocused++ }), focus: () => frameFocused++ };
  const selected = [];
  const scope = { clearMultiSelection() {}, onSelectBlock: id => selected.push(id), requestAnimationFrame: callback => callback(), canvasScrollRef: { current: { querySelectorAll: () => [frame] } } };
  runInNewContext(compiled, scope);
  scope.focusBoundary("nested-wrapper", false);
  assert.equal(frame.tabIndex, -1); assert.equal(frameFocused, 1); assert.equal(childFocused, 0);
  assert.deepEqual(selected, ["nested-wrapper"]);
});
