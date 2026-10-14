import assert from "node:assert/strict";
import test from "node:test";
import { dragControl } from "./drag-placement-harness.mjs";
const control=()=>dragControl({mode:"library"});
const key=(key="ArrowDown")=>({key,altKey:true,preventDefault(){this.prevented=true;}});
test("library native dragging inherits the shared canonical gap and commits once",()=>{
 const f=control();let ui=f.render();ui.rowProps("a").onDragStart(f.event(30));
 for(const y of [115,130,145]){ui.rowProps(y<130?"b":"c").onDragOver(f.event(y));ui=f.render();assert.equal(ui.rowProps("b")["data-drop-edge"],undefined);assert.equal(ui.rowProps("c")["data-drop-edge"],"before");assert.equal(ui.line.top,129);}
 ui.rowProps("c").onDrop(f.event(130));assert.equal(f.moves.length,1);assert.deepEqual(JSON.parse(JSON.stringify(f.moves[0])),{id:"a",baseline:["a","b","c"],targetId:"c",edge:"before"});assert.equal(f.render().line,null);
});
test("library no-op, cancelled, Escape, stale, foreign, outside and readonly drops never write",()=>{
 for(const mode of ["noop","cancel","escape","stale","foreign","outside","readonly"]){const f=control();let ui=f.render();ui.rowProps("a").onDragStart(f.event(30));ui.rowProps("c").onDragOver(f.event(130));assert.ok(f.render().line);
 if(mode==="cancel")ui.rowProps("a").onDragEnd();if(mode==="escape")ui.rowProps("a").onKeyDown({key:"Escape"});if(mode==="stale")f.setIds(["b","a","c"]);if(mode==="foreign")f.transfer.getData=()=>"another-owner";if(mode==="readonly")f.setWritable(false);ui=f.render();ui.rowProps("c").onDrop(f.event(mode==="noop"?60:mode==="outside"?220:130));assert.equal(f.moves.length,0,mode);assert.equal(f.render().line,null,mode);assert.equal(f.render().message,"",mode);}
});
test("library Alt arrows preserve direction, bounds and read-only permissions",()=>{
 const f=control();let ui=f.render();const event=key();ui.rowProps("a").onKeyDown(event);assert.equal(event.prevented,true);assert.deepEqual(JSON.parse(JSON.stringify(f.moves[0])),{id:"a",targetId:"b",edge:"after",baseline:["a","b","c"]});ui.rowProps("c").onKeyDown(key());assert.equal(f.moves.length,1);f.setWritable(false);f.render().rowProps("b").onKeyDown(key("ArrowUp"));assert.equal(f.moves.length,1);
});
test("library pointer threshold preserves an ordinary click and suppresses drag selection clicks",()=>{
 const f=control();let ui=f.render();ui.rowProps("a").onPointerDown(f.pointer(30));ui.rowProps("a").onPointerMove(f.pointer(33));assert.equal(f.render().line,null);ui.rowProps("a").onPointerUp(f.pointer(30));const click={preventDefault(){this.prevented=true;},stopPropagation(){this.stopped=true;}};ui.rowProps("a").onClickCapture(click);assert.equal(click.prevented,undefined);
 ui=f.render();ui.rowProps("a").onPointerDown(f.pointer(30));ui.rowProps("a").onPointerMove(f.pointer(130));assert.equal(f.render().line.top,129);ui=f.render();ui.rowProps("a").onPointerUp(f.pointer(130));assert.equal(f.moves.length,1);ui.rowProps("a").onClickCapture(click);assert.equal(click.prevented,true);assert.equal(click.stopped,true);
});
test("library pointer cancelled, stale, foreign overlay and source-return destinations reject",()=>{
 for(const mode of ["cancel","stale","foreign","source"]){const f=control();let ui=f.render();ui.rowProps("a").onPointerDown(f.pointer(30));ui.rowProps("a").onPointerMove(f.pointer(130));assert.ok(f.render().line);
 if(mode==="cancel")ui.rowProps("a").onPointerCancel();if(mode==="stale")f.setIds(["b","a","c"]);if(mode==="foreign")f.owner.ownerDocument={elementFromPoint:()=>({inside:false})};ui=f.render();ui.rowProps("a").onPointerUp(f.pointer(mode==="source"?30:130));assert.equal(f.moves.length,0,mode);assert.equal(f.render().line,null,mode);}
});
test("touch preserves scrolling and native start cannot duplicate a captured gesture",()=>{
 const f=control();let ui=f.render();const touch={...f.pointer(30),pointerType:"touch"};ui.rowProps("a").onPointerDown(touch);ui.rowProps("a").onPointerMove({...touch,clientY:130});assert.equal(f.render().line,null);assert.equal(f.moves.length,0);
 ui.rowProps("a").onPointerDown(f.pointer(30));const native=f.event(30);native.preventDefault=function(){this.prevented=true;};ui.rowProps("a").onDragStart(native);assert.equal(native.prevented,true);
});
test("library announcement belongs only to its current context",()=>{
 const f=control();f.render().rowProps("a").onKeyDown(key());assert.match(f.render().message,/position 2 of 3/);f.setListKey("pages");assert.equal(f.render().message,"");f.setListKey("posts");assert.equal(f.render().message,"");
});
test("library handle availability shares permission and row count",()=>{
 const f=control();let ui=f.render();assert.equal(ui.canReorder,true);assert.equal(ui.rowProps("a").draggable,true);f.setWritable(false);ui=f.render();assert.equal(ui.canReorder,false);assert.equal(ui.rowProps("a").draggable,false);f.setWritable(true);f.setIds(["a"]);ui=f.render();assert.equal(ui.canReorder,false);assert.equal(ui.rowProps("a")["aria-description"],undefined);
});
test("adjacent native and pointer slots clear an earlier line without a move announcement",()=>{
 for(const mode of ["native","pointer"]){const f=control();let ui=f.render();if(mode==="native"){ui.rowProps("a").onDragStart(f.event(30));ui.rowProps("c").onDragOver(f.event(130));ui=f.render();ui.rowProps("b").onDragOver(f.event(60));}else{ui.rowProps("a").onPointerDown(f.pointer(30));ui.rowProps("a").onPointerMove(f.pointer(130));ui=f.render();ui.rowProps("a").onPointerMove(f.pointer(60));}assert.equal(f.render().line,null);assert.equal(f.render().message,"");}
});
test("native departure clears feedback, while transitions inside the list keep the same gap",()=>{
 const f=control();let ui=f.render();ui.rowProps("a").onDragStart(f.event(30));ui.rowProps("c").onDragOver(f.event(130));ui=f.render();ui.rowProps("b").onDragLeave({...f.event(130),relatedTarget:{inside:true}});assert.equal(f.render().line.top,129);ui.rowProps("b").onDragLeave(f.event(130));assert.equal(f.render().line,null);
});
