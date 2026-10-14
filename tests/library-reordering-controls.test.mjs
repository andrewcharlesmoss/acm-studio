import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import test from "node:test";
import { runnerImport } from "vite";
const { module: ordering } = await runnerImport("app/studio/library-reordering.ts", { environments: { inline: { resolve: { noExternal: [/^@acm\//] } } } });
function control() {
  const slots=[]; let cursor=0; let ids=["a","b","c"]; let writable=true; let listKey="posts"; const moves=[];
  const react={useId:()=>"list-one",useRef:value=>{const index=cursor++;return slots[index]??={current:value};},useState:value=>{const index=cursor++;if(!(index in slots))slots[index]=value;return[slots[index],next=>{slots[index]=next;}];}};
  const exports={}; const source=ts.transpileModule(readFileSync(new URL("../app/studio/use-library-reordering.ts",import.meta.url),"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  vm.runInNewContext(source,{exports,require:name=>name === "react" ? react : ordering});
  return {moves,render(){cursor=0;return exports.useLibraryReordering(ids,writable,move=>{moves.push(JSON.parse(JSON.stringify(move)));return true;},listKey);},setIds:value=>{ids=value;},setWritable:value=>{writable=value;},setListKey:value=>{listKey=value;}};
}
function event(y=20) {const values=new Map();return{clientY:y,currentTarget:{getBoundingClientRect:()=>({top:0,height:40})},dataTransfer:{setData:(key,value)=>values.set(key,value),getData:key=>values.get(key)??""},preventDefault(){this.prevented=true;}};}

test("real row drag shows destination and submits before/after move",()=>{
 const f=control();let ui=f.render();const drag=event();ui.rowProps("a").onDragStart(drag);ui.rowProps("c").onDragOver(drag);ui=f.render();assert.equal(ui.rowProps("c")["data-drop-edge"],"after");ui.rowProps("c").onDrop(drag);assert.deepEqual(f.moves,[{id:"a",baseline:["a","b","c"],targetId:"c",edge:"after"}]);assert.equal(f.render().rowProps("c")["data-drop-edge"],undefined);
});

test("cancelled, Escape, stale, foreign and readonly drags cannot reorder",()=>{
 for(const mode of ["cancelled","escape","stale","foreign","readonly"]){const f=control();let ui=f.render();const drag=event();ui.rowProps("a").onDragStart(drag);if(mode==="cancelled")ui.rowProps("a").onDragEnd();if(mode==="escape")ui.rowProps("a").onKeyDown({key:"Escape"});if(mode==="stale")f.setIds(["b","a","c"]);if(mode==="foreign")drag.dataTransfer.getData=()=>"other-list";if(mode==="readonly")f.setWritable(false);ui=f.render();ui.rowProps("c").onDrop(drag);assert.equal(f.moves.length,0,mode);}
});

test("Alt arrows move focused row and respect bounds and read-only state",()=>{
 const f=control();const key={key:"ArrowDown",altKey:true,preventDefault(){this.prevented=true;}};f.render().rowProps("a").onKeyDown(key);assert.equal(key.prevented,true);assert.deepEqual(f.moves[0],{id:"a",targetId:"b",edge:"after",baseline:["a","b","c"]});f.render().rowProps("c").onKeyDown(key);assert.equal(f.moves.length,1);f.setWritable(false);f.render().rowProps("b").onKeyDown(key);assert.equal(f.moves.length,1);assert.equal(f.render().rowProps("a").draggable,false);
});

function pointerEvent(targetId="c", y=30) {
 const target={dataset:{libraryEntryId:targetId,libraryReorderOwner:"list-one"},getBoundingClientRect:()=>({top:0,height:40})};target.closest=()=>target;
 return {button:0,pointerType:"mouse",pointerId:1,clientX:0,clientY:y,currentTarget:{focus(){},setPointerCapture(){},hasPointerCapture:()=>true,releasePointerCapture(){},ownerDocument:{elementFromPoint:()=>target}},preventDefault(){this.prevented=true;}};
}
test("pointer drag submits once, keeps ordinary click and suppresses drag selection click",()=>{
 const f=control();let ui=f.render();const down=pointerEvent("a",0);ui.rowProps("a").onPointerDown(down);
 const click={preventDefault(){this.prevented=true;},stopPropagation(){this.stopped=true;}};
 ui.rowProps("a").onPointerUp(down);ui.rowProps("a").onClickCapture(click);assert.equal(click.prevented,undefined);
 ui.rowProps("a").onPointerDown(down);ui.rowProps("a").onPointerMove(pointerEvent("c",3));assert.equal(f.render().rowProps("c")["data-drop-edge"],undefined);
 ui.rowProps("a").onPointerMove(pointerEvent("c",30));ui=f.render();assert.equal(ui.rowProps("c")["data-drop-edge"],"after");
 const native=event();ui.rowProps("a").onDragStart(native);assert.equal(native.prevented,true);
 ui.rowProps("a").onPointerUp(pointerEvent());ui.rowProps("c").onDrop(native);assert.equal(f.moves.length,1);
 ui.rowProps("a").onClickCapture(click);assert.equal(click.prevented,true);assert.equal(click.stopped,true);
});
test("pointer cancelled/stale/foreign targets reject, and touch retains ordinary scrolling",()=>{
 for(const mode of ["cancel","stale","foreign"]){const f=control();let ui=f.render();ui.rowProps("a").onPointerDown(pointerEvent("a",0));const moved=pointerEvent();if(mode==="foreign")moved.currentTarget.ownerDocument.elementFromPoint=()=>null;ui.rowProps("a").onPointerMove(moved);if(mode==="cancel")ui.rowProps("a").onPointerCancel();if(mode==="stale")f.setIds(["b","a","c"]);ui=f.render();ui.rowProps("a").onPointerUp(moved);assert.equal(f.moves.length,0,mode);}
 const f=control();const touch={...pointerEvent(),pointerType:"touch"};f.render().rowProps("a").onPointerDown(touch);assert.equal(touch.prevented,undefined);
});
test("announcement belongs only to its current category/context",()=>{
 const f=control();f.render().rowProps("a").onKeyDown({key:"ArrowDown",altKey:true,preventDefault(){}});assert.match(f.render().message,/position 2 of 3/);f.setListKey("pages");assert.equal(f.render().message,"");f.setListKey("posts");assert.equal(f.render().message,"");
});

test("drag handle availability uses the same permission and row count as dragging", () => {
 const f=control();let ui=f.render();assert.equal(ui.canReorder,true);assert.equal(ui.rowProps("a").draggable,ui.canReorder);
 f.setWritable(false);ui=f.render();assert.equal(ui.canReorder,false);assert.equal(ui.rowProps("a").draggable,ui.canReorder);
 f.setWritable(true);f.setIds(["a"]);ui=f.render();assert.equal(ui.canReorder,false);assert.equal(ui.rowProps("a").draggable,ui.canReorder);assert.equal(ui.rowProps("a")["aria-description"],undefined);
});

test("native placement line appears only for an effective position change", () => {
 for (const [source,target,y,expected] of [["a","b",10,undefined],["b","a",30,undefined],["a","a",30,undefined],["a","b",30,"after"],["b","a",10,"before"]]) {
  const f=control();let ui=f.render();const drag=event(y);ui.rowProps(source).onDragStart(drag);ui.rowProps(target).onDragOver(drag);ui=f.render();assert.equal(ui.rowProps(target === "b" && expected === "after" ? "c" : target)["data-drop-edge"],target === "b" && expected === "after" ? "before" : expected,`${source}/${target}/${y}`);ui.rowProps(target).onDrop(drag);assert.equal(f.moves.length,expected?1:0);if(!expected)assert.equal(f.render().message,"");
 }
});
test("pointer placement clears a previous line when the destination becomes a no-op", () => {
 const f=control();let ui=f.render();ui.rowProps("a").onPointerDown(pointerEvent("a",0));ui.rowProps("a").onPointerMove(pointerEvent("c",30));assert.equal(f.render().rowProps("c")["data-drop-edge"],"after");
 ui=f.render();ui.rowProps("a").onPointerMove(pointerEvent("b",10));ui=f.render();assert.equal(ui.rowProps("b")["data-drop-edge"],undefined);assert.equal(ui.rowProps("c")["data-drop-edge"],undefined);ui.rowProps("a").onPointerUp(pointerEvent("b",10));assert.equal(f.moves.length,0);assert.equal(f.render().message,"");
});
test("native no-op, source, invalid and denied targets clear the previous line", () => {
 for (const mode of ["adjacent","source","missing","denied","stale"]) {
  const f=control();let ui=f.render();const drag=event(30);ui.rowProps("a").onDragStart(drag);ui.rowProps("c").onDragOver(drag);assert.equal(f.render().rowProps("c")["data-drop-edge"],"after");
  if(mode==="denied")f.setWritable(false);if(mode==="stale")f.setIds(["b","a","c"]);ui=f.render();ui.rowProps(mode==="source"?"a":mode==="missing"?"missing":"b").onDragOver(event(10));ui=f.render();assert.equal(ui.rowProps("c")["data-drop-edge"],undefined);
 }
});

test("pointer return to the dragged item clears the line and creates no move announcement", () => {
 const f=control();let ui=f.render();ui.rowProps("a").onPointerDown(pointerEvent("a",0));ui.rowProps("a").onPointerMove(pointerEvent("c",30));assert.equal(f.render().rowProps("c")["data-drop-edge"],"after");
 ui=f.render();ui.rowProps("a").onPointerMove(pointerEvent("a",10));ui=f.render();assert.equal(ui.rowProps("c")["data-drop-edge"],undefined);ui.rowProps("a").onPointerUp(pointerEvent("a",10));assert.equal(f.moves.length,0);assert.equal(f.render().message,"");
});

test("native departure clears placement while movement inside the same target retains it", () => {
 const f=control();let ui=f.render();const drag=event(30);ui.rowProps("a").onDragStart(drag);ui.rowProps("c").onDragOver(drag);ui=f.render();
 ui.rowProps("c").onDragLeave({relatedTarget:{},currentTarget:{contains:()=>true}});assert.equal(f.render().rowProps("c")["data-drop-edge"],"after");
 ui=f.render();ui.rowProps("c").onDragLeave({relatedTarget:null,currentTarget:{contains:()=>false}});assert.equal(f.render().rowProps("c")["data-drop-edge"],undefined);
});

 test("both edges of one gap share one centred marker", () => {
  const f=control();let ui=f.render();ui.rowProps("a").onDragStart(event());
  const rows=[{dataset:{libraryEntryId:"b",libraryReorderOwner:"list-one"},getBoundingClientRect:()=>({top:50,bottom:90,height:40}),offsetHeight:40,clientTop:0},{dataset:{libraryEntryId:"c",libraryReorderOwner:"list-one"},getBoundingClientRect:()=>({top:100,bottom:160,height:60}),offsetHeight:60,clientTop:1}];
  const over=(id,y)=>{const e=event(y);e.currentTarget={...rows[id==="b"?0:1],ownerDocument:{querySelectorAll:()=>rows}};return e;};
  ui.rowProps("b").onDragOver(over("b",85));ui=f.render();
  assert.equal(ui.rowProps("b")["data-drop-edge"],undefined);assert.equal(ui.rowProps("c")["data-drop-edge"],"before");assert.equal(ui.rowProps("c").style["--library-drop-top"],"-7px");
  ui.rowProps("c").onDragOver(over("c",105));ui=f.render();assert.equal(ui.rowProps("c").style["--library-drop-top"],"-7px");assert.equal(ui.rowProps("b")["data-drop-edge"],undefined);
 });

test("pointer handle, either row edge and empty gap retain the same measured line",()=>{
 const f=control();let ui=f.render();ui.rowProps("a").onPointerDown(pointerEvent("a",0));
 const rows=["b","c"].map((id,index)=>({dataset:{libraryEntryId:id,libraryReorderOwner:"list-one"},offsetHeight:40,clientTop:0,getBoundingClientRect:()=>({top:50+index*50,bottom:90+index*50,height:40,left:0,right:100})}));
 const doc={querySelectorAll:()=>rows};rows.forEach(row=>row.ownerDocument=doc);
 for(const [index,y] of [[0,85],[1,105],[-1,95]]){
  const e=pointerEvent("a",y);e.clientX=20;e.currentTarget.ownerDocument={...doc,elementFromPoint:()=>index<0?{closest:()=>null}:{closest:selector=>{assert.equal(selector,"[data-library-drop-row]");return rows[index];}}};
  ui.rowProps("a").onPointerMove(e);ui=f.render();assert.equal(ui.rowProps("c")["data-drop-edge"],"before");assert.equal(ui.rowProps("c").style["--library-drop-top"],"-6px");assert.equal(ui.rowProps("b")["data-drop-edge"],undefined);
 }
 ui.rowProps("a").onPointerUp(pointerEvent());assert.equal(f.moves.length,1);
});
