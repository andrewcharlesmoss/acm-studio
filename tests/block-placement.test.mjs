import assert from "node:assert/strict";
import { readStudioSource } from "./studio-module-source.mjs";
import test from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { loadProductionModule } from "./production-module.mjs";
import { dragControl, box } from "./drag-placement-harness.mjs";
import { commitHistory, undoHistory, redoHistory } from "../app/studio/studio-command-operations.mjs";
const { moveBlockToTarget, insertBlockAtTarget } = await loadProductionModule(new URL("../app/studio/block-placement.ts", import.meta.url));
const { resolveBlockDrag } = await loadProductionModule(new URL("../app/studio/block-drag-placement.ts", import.meta.url));
const { columnDropPosition } = await loadProductionModule(new URL("../app/studio/column-drop-position.ts", import.meta.url));
const { useStudioBlockCommands: createBlockCommands } = await loadProductionModule(new URL("../app/studio/use-studio-block-commands.ts", import.meta.url));
const { validContentBlocks } = await loadProductionModule(new URL("../app/studio/workspace-validation.ts", import.meta.url));
const p = id => ({ id, type: "paragraph", text: id });
const fixture = () => [p("root"), { id: "columns", type: "columns", children: [{ id: "left", type: "column", children: [p("a"), p("b"), p("c")] }, { id: "right", type: "column", children: [] }] }, p("after")];
const ids = blocks => blocks[1].children.map(column => column.children.map(child => child.id));

test("placement moves root, cross-column and nested content in one immutable tree", () => {
  const before = fixture();
  const nested = moveBlockToTarget(before, "root", { parentId: "right", index: 0 });
  assert.equal(nested[0].type, "columns"); assert.equal(nested[0].children[1].children[0], before[0]);
  assert.deepEqual(ids(before), [["a", "b", "c"], []]);
  const across = moveBlockToTarget(before, "b", { parentId: "right", index: 0 });
  assert.deepEqual(ids(across), [["a", "c"], ["b"]]);
  assert.equal(across[0], before[0]); assert.equal(across[1].children[1].children[0], before[1].children[0].children[1]);
  const out = moveBlockToTarget(across, "b", { parentId: null, index: 3 });
  assert.deepEqual(out.map(block => block.id), ["root", "columns", "after", "b"]);
  assert.deepEqual(ids(out), [["a", "c"], []]);
});

test("same-column boundary correction preserves no-op identity and order", () => {
  const before = fixture();
  for (const index of [1, 2]) assert.equal(moveBlockToTarget(before, "b", { parentId: "left", index }), before);
  assert.deepEqual(ids(moveBlockToTarget(before, "a", { parentId: "left", index: 3 }))[0], ["b", "c", "a"]);
  assert.deepEqual(ids(moveBlockToTarget(before, "c", { parentId: "left", index: 0 }))[0], ["c", "a", "b"]);
});

test("invalid targets, descendants, restricted types and locks retain the source", () => {
  const before = fixture();
  for (const target of [{ parentId: "missing", index: 0 }, { parentId: "root", index: 0 }, { parentId: "left", index: -1 }, { parentId: "left", index: 4 }, { parentId: "left", index: 0.5 }]) assert.equal(moveBlockToTarget(before, "b", target), before);
  assert.equal(moveBlockToTarget(before, "columns", { parentId: "left", index: 0 }), before);
  assert.equal(moveBlockToTarget(before, "left", { parentId: "right", index: 0 }), before);
  const locked = fixture(); locked[0].editorial = { lock: { move: true } };
  assert.equal(moveBlockToTarget(locked, "root", { parentId: "right", index: 0 }), locked);
  const restricted = fixture(); restricted[1].children[1].allowedBlocks = ["heading"];
  assert.equal(moveBlockToTarget(restricted, "b", { parentId: "right", index: 0 })[1].children[1].children[0].id, "b");
  assert.equal(insertBlockAtTarget(before, p("a"), { parentId: "right", index: 0 }), before);
  const social = [...before, { id: "social", type: "social-icons", children: [{ id: "icon", type: "social-linkedin", url: "https://www.linkedin.com/", label: "LinkedIn" }] }];
  for (const parentId of [null, "right"]) assert.equal(moveBlockToTarget(social, "icon", { parentId, index: 0 }), social);
});

test("one history transaction restores both parents and redoes the whole move", () => {
  const original = { blocks: fixture() };
  const changed = { blocks: moveBlockToTarget(original.blocks, "b", { parentId: "right", index: 0 }) };
  const committed = commitHistory(original, []);
  const undone = undoHistory(changed, committed.history, committed.future);
  assert.deepEqual(undone.workspace, original);
  assert.deepEqual(redoHistory(undone.workspace, undone.history, undone.future).workspace, changed);
});

test("reader-valid non-owning children metadata remains untouched by placement and lock traversal", () => {
  const before = fixture(); before[0].children = {};
  assert.equal(validContentBlocks(before), true);
  const next = moveBlockToTarget(before, "b", { parentId: "right", index: 0 });
  assert.notEqual(next, before); assert.equal(next[0], before[0]); assert.deepEqual(next[0].children, {});
  assert.equal(validContentBlocks(next), true);
});

test("positioned library insertion uses the shared command once and preserves wrapper rules", () => {
  for (const type of ["paragraph", "button", "social-linkedin"]) {
    let document = { blocks: fixture() }, commits = 0;
    const commands = createBlockCommands({ activeDocument: document, updateActiveDocument: update => { document = update(document); commits++; } });
    const inserted = commands.insertBlock(type, null, "left", 1);
    assert.ok(inserted); assert.equal(commits, 1);
    const children = document.blocks[1].children[0].children;
    assert.deepEqual(children.filter(child => ["a", "b", "c"].includes(child.id)).map(child => child.id), ["a", "b", "c"]);
    assert.equal(children[1].type, type === "button" ? "buttons" : type === "social-linkedin" ? "social-icons" : type);
  }
});

test("column geometry measures direct children and compensates transformed canvas zoom", () => {
  const box = (left, top, width, height) => ({ left, top, width, height, right: left + width, bottom: top + height });
  let children = [box(120, 140, 160, 40), box(120, 220, 160, 40)];
  const column = { dataset: { studioColumnDropId: "left" }, getBoundingClientRect: () => box(120, 120, 160, 200), querySelectorAll: selector => { assert.equal(selector, ":scope > [data-studio-nested-block-id]"); return children.map(bounds => ({ getBoundingClientRect: () => bounds })); } };
  const canvas = { offsetWidth: 300, contains: candidate => candidate === column, getBoundingClientRect: () => box(100, 100, 600, 500) };
  const element = { closest: selector => { assert.equal(selector, "[data-studio-column-drop-id]"); return column; } };
  const first = columnDropPosition(canvas, element, 140, 130);
  assert.deepEqual(first.target, { parentId: "left", index: 0 }); assert.equal(first.left, 10); assert.equal(first.width, 80); assert.equal(first.top, 19);
  assert.equal(columnDropPosition(canvas, element, 140, 210).target.index, 1);
  assert.equal(columnDropPosition(canvas, element, 140, 300).target.index, 2);
  assert.equal(columnDropPosition(canvas, element, 10, 130), null);
  children = [];
  assert.equal(columnDropPosition(canvas, element, 140, 130).target.index, 0);
  assert.equal(columnDropPosition(canvas, element, 140, 130).height, 2);
});

const canvasSource = readStudioSource("app/studio/studio-canvas.tsx");
const canvasAst = ts.createSourceFile("canvas.tsx", canvasSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const owner = canvasAst.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === "StudioCanvasContent");
const handler = name => ts.transpileModule(`globalThis.handler = ${owner.body.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === name).getText(canvasAst)}`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;

function columnSurface() {
 const column={dataset:{studioColumnDropId:"right"},getBoundingClientRect:()=>box(110,10,80,170),querySelectorAll:()=>[]};
 const canvas={offsetWidth:200,getBoundingClientRect:()=>box(0,0,200,200),contains:element=>element===column,querySelectorAll:()=>[],ownerDocument:{elementFromPoint:()=>({closest:()=>column})}};
 return canvas;
}
test("actual Column proposal and commit survive equivalent template projections",()=>{
 const original=fixture(),activeDocument={id:"template",blocks:structuredClone(original)},insertions=[],pendingGroups=[];
 const proposal=resolveBlockDrag({blocks:activeDocument.blocks,source:{libraryType:"paragraph"},rootTypes:["paragraph"]},columnSurface(),150,90);assert.equal(proposal.target.parentId,"right");assert.equal(proposal.target.index,0);
 const scope={writableRef:{current:true},onInsertBlockAt:(...args)=>{insertions.push(args);return p("inserted");},setPendingGroupLayoutBlockId:value=>pendingGroups.push(value)};
 runInNewContext(handler("insertLibraryBlockAt"),scope);scope.insertLibraryBlockAt=scope.handler;runInNewContext(handler("commitCanvasPlacement"),scope);assert.equal(scope.handler(proposal.target),true);assert.deepEqual(insertions,[["paragraph",0,"right"]]);assert.deepEqual(pendingGroups,[null]);
});
test("blocks inherit shared stale, missing-source and read-only drag rejection",()=>{
 for(const mode of ["document","content","readonly","missing"]){let resolves=0;const f=dragControl({mode:"raw",policy:{resolve:()=>{resolves++;return {target:"move",line:{left:0,top:0,width:10,height:2}};}}});let ui=f.render();if(mode!=="missing")ui.start(f.event(30),{id:"root"});if(mode==="readonly")f.setWritable(false);if(mode==="document"||mode==="content")f.setVersion(mode);ui=f.render();ui.listProps.onDragOver(f.event(130));ui.listProps.onDrop(f.event(130));assert.equal(resolves,0,mode);assert.equal(f.moves.length,0,mode);}
});
test("block policy rejects locked moves, self/adjacent slots and forbidden insertions",()=>{
 const before=fixture(),canvas=columnSurface();before[0].editorial={lock:{move:true}};assert.equal(resolveBlockDrag({blocks:before,source:{id:"root"},rootTypes:[]},canvas,150,90),null);
 before[1].children[1].allowedBlocks=["heading"];assert.ok(resolveBlockDrag({blocks:before,source:{libraryType:"paragraph"},rootTypes:["paragraph"]},canvas,150,90));assert.equal(resolveBlockDrag({blocks:before,source:{libraryType:"page-link"},rootTypes:[]},canvas,150,90),null);
 const rootCanvas={offsetWidth:200,getBoundingClientRect:()=>box(0,0,200,200),querySelectorAll:()=>[box(10,20,100,30),box(10,70,100,50),box(10,140,100,40)].map(bounds=>({getBoundingClientRect:()=>bounds})),ownerDocument:{elementFromPoint:()=>null}};
 assert.equal(resolveBlockDrag({blocks:[p("a"),p("b"),p("c")],source:{id:"a"},rootTypes:[]},rootCanvas,30,60),null);assert.equal(resolveBlockDrag({blocks:[p("a")],source:{libraryType:"button"},rootTypes:["paragraph"]},rootCanvas,30,130),null);
});
test("block pointer placement inherits the same production controller and commits once",()=>{
 const f=dragControl({mode:"raw",policy:{resolve:(_source,_owner,_x,y)=>({target:y,line:{left:0,top:y,width:20,height:2}})}});let ui=f.render();ui.handleProps({id:"root"}).onPointerDown(f.pointer(30));ui.handleProps({id:"root"}).onPointerMove(f.pointer(33));assert.equal(f.render().line,null);ui.handleProps({id:"root"}).onPointerMove(f.pointer(130));ui=f.render();assert.equal(ui.line.top,130);ui.handleProps({id:"root"}).onPointerUp(f.pointer(140));assert.deepEqual(f.moves,[140]);assert.equal(f.render().line,null);
});
