import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";
import { findBlockById, updateBlockById } from "../app/studio/studio-command-operations.mjs";
import { loadProductionModule } from "./production-module.mjs";

const { insertedBlockSelectionId } = await loadProductionModule(new URL("../app/studio/button-insertion.ts", import.meta.url));
const { useStudioBlockCommands: createBlockCommands } = await loadProductionModule(new URL("../app/studio/use-studio-block-commands.ts", import.meta.url));
const templateModel = await loadProductionModule(new URL("../app/studio/template-model.ts", import.meta.url));
const { createBlock } = await loadProductionModule(new URL("../app/studio/editor-model.ts", import.meta.url));
const { insertTemplateContent } = await loadProductionModule(new URL("../app/studio/template-content-insertion.ts", import.meta.url));

// Run the real bounded insertion functions with memory-only command/state
// adapters, including React's updated cursor on the next tile activation.
function insertionFunctions(file, names, environment) {
  const source = readFileSync(new URL(`../app/studio/${file}`, import.meta.url), "utf8");
  const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const functions = [];
  function visit(node) {
    if (ts.isFunctionDeclaration(node) && names.includes(node.name?.text)) functions.push(node.getText(ast));
    ts.forEachChild(node, visit);
  }
  visit(ast);
  assert.equal(functions.length, names.length);
  const javascript = ts.transpileModule(functions.join("\n"), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  return new Function("state", `with (state) { ${javascript}; return { ${names.join(", ")} }; }`)(environment);
}

function stateFixture() {
  const state = {
    writable: true, insertedBlockSelectionId,
    document: { blocks: [{ id: "before", type: "paragraph", text: "Before" }, { id: "after", type: "paragraph", text: "After" }] },
    insertAfterIndex: 0, show: true, query: "kept search", selected: null,
    setInsertAfterIndex(value) { state.insertAfterIndex = value; },
    setShowInserter(value) { state.show = value; }, setInserterQuery(value) { state.query = value; },
    setPendingColumnsLayoutBlockId() {}, setDocumentFieldSelection() {}, setSelectedDocumentField() {},
    setSelectedBlockId(id) { state.selected = id; }, setInspectorTab() {},
    blockCommands: { insertBlock(type, after, parentId) {
      return createBlockCommands({ activeDocument: state.document, updateActiveDocument(update) { state.document = update(state.document); } }).insertBlock(type, after, parentId);
    } },
  };
  return state;
}

for (const file of ["studio-prototype.tsx", "mini-golf-site-editor.tsx"]) {
  test(`${file}: repeated docked insertions stay open and preserve document order`, () => {
    const state = stateFixture();
    const owner = file === "studio-prototype.tsx" ? "use-studio-canvas-actions.ts" : file;
    if (file === "studio-prototype.tsx") {
      const coordinator = readFileSync(new URL("../app/studio/studio-prototype.tsx", import.meta.url), "utf8");
      assert.match(coordinator, /useStudioCanvasActions\(\{ blockCommands, writable, insertAfterIndex/);
      assert.match(coordinator, /onInsertBlock: \(type, parentId, options\) => insertBlock\(type, parentId, insertAfterIndex, options\?\.keepInserterOpen\)/);
    }
    const { insertBlock } = insertionFunctions(owner, ["insertBlock"], state);
    function insert(type, parent) {
      return file === "studio-prototype.tsx" ? insertBlock(type, parent, state.insertAfterIndex, true) : insertBlock(type, state.insertAfterIndex, true, parent);
    }
    insert("group"); insert("heading"); insert("spacer");
    assert.deepEqual(state.document.blocks.map(block => block.type), ["paragraph", "group", "heading", "spacer", "paragraph"]);
    assert.equal(state.show, true); assert.equal(state.query, "kept search");
    assert.equal(state.document.blocks[1].children.length, 0);
    const parent = state.document.blocks[1].id;
    insert("paragraph", parent); insert("button", parent);
    assert.deepEqual(state.document.blocks[1].children.map(block => block.type), ["paragraph", "buttons"]);
    const buttons = state.document.blocks[1].children[1];
    assert.equal(buttons.children.length, 1);
    assert.equal(buttons.children[0].type, "button");
    assert.equal(state.selected, buttons.children[0].id);
    insert("button", buttons.id);
    assert.equal(buttons.children.length, 1, "previous immutable group is retained");
    assert.equal(findBlockById(state.document.blocks, buttons.id).children.length, 2);
    assert.equal(state.document.blocks.length, 5);
    const unchanged = JSON.stringify(state.document);
    assert.equal(insert("paragraph", "missing-parent"), null);
    assert.equal(JSON.stringify(state.document), unchanged);
    state.writable = false;
    assert.equal(insert("paragraph"), null);
    assert.equal(JSON.stringify(state.document), unchanged);
    assert.equal(state.show, true); assert.equal(state.query, "kept search");
    state.writable = true;
    if (file === "studio-prototype.tsx") insertBlock("paragraph"); else insertBlock("paragraph");
    assert.equal(state.show, false); assert.equal(state.query, "");
  });
}

test("template library keeps root context after a Group and nested context for repeated children", () => {
  let counter = 0;
  const set = templateModel.createTemplateSet();
  const target = set.templates[0];
  target.nodes = [];
  const state = {
    ...templateModel, set, insertTemplateContent,
    writable: true, insertedBlockSelectionId, blocks: [], target, nodesRef: { current: [] }, insertAfter: null, selectedBlock: null, show: true, query: "filter", parentId: null,
    templateId: () => `node-${++counter}`,
    createBlock,
    groupAllowsChild: () => true,
    findBlockById,
    findTemplateNode: id => findBlockById(state.nodesRef.current, id),
    updateNodes(nodes) { state.target.nodes = nodes; state.blocks = templateModel.templateEditorBlocks(nodes); state.nodesRef.current = nodes; return true; },
    selectBlock(id) { state.selectedBlock = findBlockById(state.blocks, id); },
    setInsertAfter(value) { state.insertAfter = value; }, setShowInserter(value) { state.show = value; },
    setQuery(value) { state.query = value; }, setInserterParentId(value) { state.parentId = value; },
    commands: { updateBlock(id, update) { state.updateNodes(templateModel.templateNodesFromBlocks(updateBlockById({ blocks: state.blocks }, id, update).blocks, state.nodesRef.current)); } },
  };
  const { insertBlock } = insertionFunctions("template-editor.tsx", ["insertContent", "insertNode", "insertBlock"], state);
  const options = { keepInserterOpen: true };
  const group = insertBlock("group", undefined, options);
  insertBlock("heading", undefined, options); insertBlock("template-content", undefined, options);
  assert.deepEqual(state.target.nodes.map(block => block.type), ["group", "heading", "element"]);
  assert.equal(state.blocks[2].data.templateElement, "content");
  assert.equal(state.blocks[0].children.length, 0);
  state.parentId = group.id;
  insertBlock("paragraph", group.id, options); insertBlock("button", group.id, options);
  assert.deepEqual(state.blocks[0].children.map(block => block.type), ["paragraph", "buttons"]);
  const buttons = state.blocks[0].children[1];
  assert.equal(buttons.children.length, 1);
  assert.equal(buttons.children[0].type, "button");
  assert.equal(state.selectedBlock.id, buttons.children[0].id);
  assert.equal(state.parentId, group.id); assert.equal(state.show, true); assert.equal(state.query, "filter");
  const social = insertBlock("social-icons", undefined, options);
  state.parentId = social.id;
  insertBlock("social-linkedin", social.id, options); insertBlock("social-tiktok", social.id, options);
  assert.deepEqual(state.blocks.at(-1).children.map(block => block.type), ["social-linkedin", "social-tiktok"]);
  assert.equal(state.parentId, social.id); assert.equal(state.show, true);
  const unchanged = JSON.stringify(state.blocks);
  assert.equal(insertBlock("paragraph", "missing-parent", options), null);
  assert.equal(JSON.stringify(state.blocks), unchanged);
  state.writable = false;
  assert.equal(insertBlock("paragraph", undefined, options), null);
  assert.equal(JSON.stringify(state.blocks), unchanged);
  assert.equal(state.show, true); assert.equal(state.query, "filter");
  state.writable = true;
  state.groupAllowsChild = () => false;
  assert.equal(insertBlock("paragraph", group.id, options), null);
  assert.equal(JSON.stringify(state.blocks), unchanged);
});
