import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import test from "node:test";
import { dragControl } from "./drag-placement-harness.mjs";
import { loadViteModule as runnerImport } from "./production-module.mjs";
const load = async path => (await runnerImport(path, { environments: { inline: { resolve: { noExternal: [/^@acm\//] } } } })).module;
const geometry = await load("app/studio/drop-gap-geometry.ts");
const blocks = await load("app/studio/block-drop-position.ts");
const { reorderNavigationItem } = await load("app/studio/navigation-items.ts");
const { reorderDesignLayers } = await import("../app/studio/design-layer-operations.mjs");
const box = (left,top,width,height) => ({left,top,width,height,right:left+width,bottom:top+height});

const control=(axis="y",policy={})=>dragControl({axis,policy});
for(const axis of ["x","y"]) test(`${axis} dragging crosses both neighbours and empty gap with one centred marker`,()=>{
 const f=control(axis);let ui=f.render();ui.start(f.event(30),"a");
 for(const coordinate of [115,130,145]) { ui.listProps.onDragOver(f.event(coordinate));ui=f.render();assert.ok(ui.line);assert.equal(ui.line[axis==="x"?"left":"top"],129); }
 ui.listProps.onDrop(f.event(130));assert.equal(f.moves.length,1);assert.equal(f.moves[0].targetId,"c");assert.equal(f.moves[0].edge,"before");assert.equal(f.render().line,null);
});
test("no-op, cancellation, foreign owner, stale data, read-only and rejected policy never commit",()=>{
 for(const mode of ["noop","cancel","foreign","stale","readonly","policy","outside"]){const f=control();let ui=f.render();ui.start(f.event(30),"a");ui.listProps.onDragOver(f.event(130));assert.ok(f.render().line);
 if(mode==="cancel")ui.cancel();if(mode==="foreign")f.transfer.getData=()=>"other";if(mode==="stale")f.setVersion("changed");if(mode==="readonly")f.setWritable(false);if(mode==="policy")f.setAllowed(false);ui=f.render();const event=f.event(mode==="noop"?60:mode==="outside"?220:130);ui.listProps.onDrop(event);assert.equal(f.moves.length,0,mode);assert.equal(f.render().line,null,mode);}
});
test("gap geometry honours borders, non-uniform sizes, horizontal wrapping and zoom",()=>{
 const rows=[box(100,100,200,60),box(100,200,200,120)];const line=geometry.insertionGapLine(rows,1,box(80,80,240,300),2);assert.equal(line.top,49);assert.equal(line.height,2);
 const wrapped=[box(10,20,60,30),box(10,70,80,40)];const next=geometry.insertionGapLine(wrapped,1,box(0,0,100,130),1,"x");assert.equal(next.top,59);assert.equal(next.height,2);assert.equal(geometry.insertionGapIndex(wrapped,20,60,"x"),1);
});
test("root and nested block gaps resolve identically from each side, at transformed scale",()=>{
 const frames=[box(100,100,200,40),box(100,180,200,80),box(100,300,200,40)].map((bounds,index)=>({dataset:{studioNestedBlockId:["a","b","c"][index]},getBoundingClientRect:()=>bounds}));
 const owner={getBoundingClientRect:()=>box(100,90,200,260),querySelectorAll:()=>frames,ownerDocument:{defaultView:{getComputedStyle:()=>({display:"block",getPropertyValue:()=>"24px"})}}};frames.forEach(frame=>frame.parentElement=owner);
 const canvas={ownerDocument:owner.ownerDocument,offsetWidth:150,getBoundingClientRect:()=>box(80,80,300,300),querySelectorAll:()=>frames};
 for(const y of [255,280,305]){const root=blocks.rootBlockDropPosition(canvas,150,y);assert.equal(root.index,2);assert.equal(root.line.top,99);const nested=blocks.nestedBlockDropPosition(canvas,"a",150,y);assert.equal(nested.targetId,"c");assert.equal(nested.after,false);assert.equal(nested.line.top,99);}
});
test("Navigation accepts explicit sibling boundaries and rejects adjacent no-ops or reparenting",()=>{
 const links=[{id:"a",label:"A",url:"/a"},{id:"b",label:"B",url:"/b"},{id:"c",label:"C",url:"/c",children:[{id:"d",label:"D",url:"/d"}]}];
 assert.equal(reorderNavigationItem(links,"a","b","before"),null);assert.deepEqual(reorderNavigationItem(links,"a","b","after"),reorderNavigationItem(links,"a","c","before"));assert.equal(reorderNavigationItem(links,"a","d","before"),null);
});
test("Design layer adjacent boundaries preserve identity and never create no-op history",()=>{
 const objects=[{id:"c"},{id:"b"},{id:"a"}];assert.equal(reorderDesignLayers(objects,"a","b","before"),objects);assert.equal(reorderDesignLayers(objects,"b","a","after"),objects);assert.deepEqual(reorderDesignLayers(objects,"a","b","after"),reorderDesignLayers(objects,"a","c","before"));assert.equal(reorderDesignLayers([{id:"b",locked:true},{id:"a"}],"a","b","before")[0].id,"b");
});

test("wrapped gaps use full visual-row envelopes with unequal item heights",()=>{
 const rows=[box(10,0,40,100),box(60,0,40,20),box(10,110,60,50)];
 for(const x of [15,80,130]) for(const y of [101,105,109]) assert.equal(geometry.insertionGapIndex(rows,x,y,"x"),2);
 assert.equal(geometry.insertionGapLine(rows,2,box(0,0,150,180),1,"x").top,104);
 assert.equal(geometry.insertionGapIndex(rows,95,10,"x"),2);assert.equal(geometry.insertionGapIndex(rows,15,115,"x"),2);
});

const designSource=readFileSync(new URL("../app/studio/design-editor.tsx",import.meta.url),"utf8");
const designAst=ts.createSourceFile("design.tsx",designSource,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
function declaration(name){let found;function visit(node){if(ts.isVariableDeclaration(node)&&node.name.getText(designAst)===name)found=node.initializer;if(ts.isFunctionDeclaration(node)&&node.name?.text===name)found=node;ts.forEachChild(node,visit);}visit(designAst);assert.ok(found,name);return found.getText(designAst);}
const js=source=>ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
const pageScope={};vm.runInNewContext(js(`globalThis.reorderedPages = ${declaration("reorderedPages")};`),pageScope);
test("production Design page operation shares the hook's canonical boundary and preserves fields",()=>{
 const pages=[{id:"a",name:"A",objects:[{id:"object"}]},{id:"b",name:"B",locked:true},{id:"c",name:"C"}];let next=pages;
 const f=control("y",{accepts:move=>Boolean(pageScope.reorderedPages(pages,move.id,move.targetId,move.edge)),onMove:move=>{next=pageScope.reorderedPages(pages,move.id,move.targetId,move.edge);}});let ui=f.render();ui.start(f.event(30),"a");
 for(const y of [115,130,145]){ui.listProps.onDragOver(f.event(y));ui=f.render();assert.equal(ui.line.top,129);}ui.listProps.onDrop(f.event(130));assert.deepEqual(Array.from(next,page=>page.id),["b","a","c"]);assert.equal(next[1],pages[0]);assert.equal(next[0].locked,true);
 assert.equal(pageScope.reorderedPages(pages,"a","b","before"),null);assert.equal(pageScope.reorderedPages(pages,"b","a","after"),null);
});

test("captured pointer uses the same gap, preserves clicks and cancels stale/read-only drags",()=>{
 for(const mode of ["move","noop","stale","readonly","cancel","click","touch"]){const f=control("x");let ui=f.render();f.owner.dataset={gapContainer:"test-list",dragPlacementOwner:"test-list"};const handle={focus(){},setPointerCapture(){},hasPointerCapture:()=>true,releasePointerCapture(){},closest:()=>f.owner};
 const event=x=>({pointerId:7,pointerType:mode==="touch"?"touch":"mouse",button:0,clientX:x,clientY:30,currentTarget:handle,preventDefault(){},stopPropagation(){}});
 ui.handleProps("a").onPointerDown(event(30));if(mode!=="click"&&mode!=="touch")for(const x of [115,130,145]){ui.handleProps("a").onPointerMove(event(x));ui=f.render();assert.equal(ui.line.left,129);}
 if(mode==="stale")f.setVersion("changed");if(mode==="readonly")f.setWritable(false);if(mode==="cancel")ui.listProps.onKeyDown({key:"Escape"});ui=f.render();ui.handleProps("a").onPointerUp(event(mode==="noop"?60:130));assert.equal(f.moves.length,mode==="move"?1:0,mode);assert.equal(f.render().line,null,mode);
 }
});

test("nested template wrappers resolve only model siblings, excluding repeated toolbar anchors",()=>{
 const children=[box(10,20,30,30),box(70,20,50,60),box(140,20,40,30)].map((bounds,i)=>({dataset:{studioNestedBlockId:["a","b","c"][i]},getBoundingClientRect:()=>bounds}));
 const duplicate={dataset:{studioNestedBlockId:"c"},getBoundingClientRect:()=>box(0,0,10,10)};
 const owner={getBoundingClientRect:()=>box(0,0,200,100),querySelectorAll:()=>[...children,duplicate],ownerDocument:{defaultView:{getComputedStyle:()=>({display:"flex",flexDirection:"row",getPropertyValue:()=>"24px"})}}};
 const wrapper={parentElement:owner,querySelectorAll:()=>[children[0]]};children[0].parentElement=wrapper;
 const canvas={offsetWidth:200,getBoundingClientRect:()=>box(0,0,200,100),querySelectorAll:()=>[...children,duplicate]};
 const result=blocks.nestedBlockDropPosition(canvas,"a",130,30,["a","b","c"]);assert.equal(result.targetId,"c");assert.equal(result.line.left,129);
});

const { startDragAutoScroll } = await load("app/studio/drag-auto-scroll.ts");
test("captured dragging scrolls at an edge, refreshes geometry and stops on cancellation",()=>{
 const frames=new Map();let sequence=0,top=0,refreshes=0;const view={getComputedStyle:()=>({overflowY:"auto",overflowX:"hidden"}),requestAnimationFrame:callback=>{frames.set(++sequence,callback);return sequence;},cancelAnimationFrame:id=>frames.delete(id)};
 const scrollOwner={parentElement:null,clientHeight:100,scrollHeight:300,clientWidth:100,scrollWidth:100,getBoundingClientRect:()=>box(0,0,100,100),get scrollTop(){return top;},set scrollTop(value){top=Math.max(0,Math.min(200,value));}};
 const handle={parentElement:scrollOwner,ownerDocument:{defaultView:view}};
 const stop=startDragAutoScroll(handle,()=>({x:50,y:95}),()=>refreshes++);
 const tick=()=>{const [id,callback]=frames.entries().next().value;frames.delete(id);callback();};tick();tick();assert.equal(top,16);assert.equal(refreshes,2);stop();assert.equal(frames.size,0);
 const centre=startDragAutoScroll(handle,()=>({x:50,y:50}),()=>assert.fail("Centre should not scroll"));tick();assert.equal(top,16);centre();
});

test("ownership loss or changed source cancels edge scrolling before pointer release",()=>{
 for(const mode of ["readonly","stale"]){const f=control();f.owner.dataset={gapContainer:"test-list",dragPlacementOwner:"test-list"};const handle={focus(){},setPointerCapture(){},closest:()=>f.owner};let ui=f.render();const event=y=>({currentTarget:handle,clientX:30,clientY:y,pointerId:1,pointerType:"mouse",button:0,preventDefault(){},stopPropagation(){}});ui.handleProps("a").onPointerDown(event(30));ui.handleProps("a").onPointerMove(event(130));assert.equal(f.stops,0);
 if(mode==="readonly")f.setWritable(false);else f.setVersion("foreign-change");ui=f.render();assert.equal(f.stops,1);assert.equal(ui.line,null);f.setWritable(true);assert.equal(f.render().line,null);assert.equal(f.moves.length,0);}
});

test("canonical geometry preserves fractional CSS scale and positioned-container borders",()=>{
 const owner={offsetWidth:373,getBoundingClientRect:()=>box(100,100,745,100),ownerDocument:{defaultView:{getComputedStyle:()=>({width:"372.5px",boxSizing:"border-box"})}}};assert.equal(geometry.dropContainerScale(owner),2);
 const line=geometry.dropLineInContainer({left:0,top:9,width:100,height:2},box(100,100,200,40),box(80,60,300,200),2,{scrollLeft:3,scrollTop:4,borderLeft:1,borderTop:2});assert.equal(line.left,12);assert.equal(line.top,31);
});

test("the shared controller preserves source-specific copy and move cursor feedback", () => {
 for (const source of [{libraryType:"paragraph"},{id:"existing"}]) {
  const control=dragControl({mode:"raw",policy:{effect:value=>value.libraryType?"copy":"move",resolve:()=>({target:"gap",line:{left:0,top:49,width:100,height:2}})}});
  const ui=control.render();ui.start(control.event(30),source);ui.listProps.onDragOver(control.event(50));
  const expected=source.libraryType?"copy":"move";
  assert.equal(control.transfer.effectAllowed,expected);assert.equal(control.transfer.dropEffect,expected);
 }
});

test("shared default aligns first and last sibling markers on both axes",()=>{
 for(const axis of ["x","y"]) for(const [source,coordinate,centre] of [["c",20,20],["a",180,180]]){
  const f=control(axis);let ui=f.render();ui.start(f.event(source==="c"?160:30),source);
  ui.listProps.onDragOver(f.event(coordinate));ui=f.render();const key=axis==="x"?"left":"top",size=axis==="x"?"width":"height";
  assert.equal(ui.line[key]+ui.line[size]/2,centre);ui.listProps.onDrop(f.event(coordinate));assert.equal(f.moves.length,1);
 }
});
test("direct root, nested and Column block adapters inherit boundary-aligned ends",async()=>{
 const {columnDropPosition}=await load("app/studio/column-drop-position.ts");
 const frames=[20,100].map((top,index)=>({dataset:{studioNestedBlockId:["a","b"][index]},getBoundingClientRect:()=>box(10,top,100,40)}));
 const owner={dataset:{studioColumnDropId:"column"},offsetWidth:200,clientLeft:0,clientTop:0,scrollLeft:0,scrollTop:0,getBoundingClientRect:()=>box(0,0,200,200),querySelectorAll:()=>frames,contains:()=>true,closest(){return this;},ownerDocument:{defaultView:{getComputedStyle:()=>({display:"block",getPropertyValue:()=>"24px"})}}};frames.forEach(frame=>frame.parentElement=owner);
 for(const [y,index,centre] of [[10,0,20],[180,2,140]]){
  const root=blocks.rootBlockDropPosition(owner,30,y),nested=blocks.nestedBlockDropPosition(owner,"a",30,y),column=columnDropPosition(owner,owner,30,y);
  assert.equal(root.index,index);assert.equal(root.line.top+root.line.height/2,centre);assert.equal(nested.line.top+nested.line.height/2,centre);assert.equal(column.target.index,index);assert.equal(column.top+column.height/2,centre);
 }
});
