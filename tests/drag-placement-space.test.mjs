import assert from "node:assert/strict";
import test from "node:test";
import {loadProductionModule} from "./production-module.mjs";
const {reservePlacementSpace,placementEdgeGaps}=await loadProductionModule(new URL("../app/studio/drag-placement-space.ts",import.meta.url));
const {insertionGapLine}=await loadProductionModule(new URL("../app/studio/drop-gap-geometry.ts",import.meta.url));
function element(initial={}) {
 const values=new Map(Object.entries(initial).map(([key,value])=>[key,{value,priority:""}]));
 const style={getPropertyValue:key=>values.get(key)?.value??"",getPropertyPriority:key=>values.get(key)?.priority??"",setProperty:(key,value,priority="")=>values.set(key,{value,priority}),removeProperty:key=>values.delete(key)};
 return {style,ownerDocument:{defaultView:{getComputedStyle:()=>({getPropertyValue:key=>style.getPropertyValue(key)||(key.startsWith("padding-")?"8px":"normal")})}}};
}
test("one shared reservation preserves authored padding without stacking extra space, deduplicates owners, and restores authored padding",()=>{
 const owner=element({"padding-top":"13px"});const restore=reservePlacementSpace([{element:owner,axis:"y"},{element:owner,axis:"y"}]);
 assert.equal(owner.style.getPropertyValue("padding-top"),"24px");assert.equal(owner.style.getPropertyValue("padding-bottom"),"24px");assert.equal(owner.style.getPropertyValue("padding-left"),"");
 restore();assert.equal(owner.style.getPropertyValue("padding-top"),"13px");assert.equal(owner.style.getPropertyValue("padding-bottom"),"");
 const again=reservePlacementSpace([{element:owner,axis:"y"}]);assert.equal(owner.style.getPropertyValue("padding-top"),"24px");again();
});
test("horizontal reservations preserve newer authored declarations during cleanup",()=>{
 const owner=element();const restore=reservePlacementSpace([{element:owner,axis:"x"}]);assert.equal(owner.style.getPropertyValue("padding-left"),"24px");assert.equal(owner.style.getPropertyValue("padding-top"),"");
 owner.style.setProperty("padding-left","50px");restore();assert.equal(owner.style.getPropertyValue("padding-left"),"50px");assert.equal(owner.style.getPropertyValue("padding-right"),"");
});
test("outer lines align with item boundaries on either axis and at zoom",()=>{
 const box=(left,top,width,height)=>({left,top,right:left+width,bottom:top+height,width,height});
 for(const scale of [1,2])for(const axis of ["x","y"]){const owner=box(0,0,300*scale,300*scale);const rows=[box(24*scale,24*scale,50*scale,50*scale),box(100*scale,100*scale,50*scale,50*scale)];
 const first=insertionGapLine(rows,0,owner,scale,axis),last=insertionGapLine(rows,rows.length,owner,scale,axis);
 assert.equal(first[axis==="y"?"top":"left"],23);assert.equal(last[axis==="y"?"top":"left"],149);
 }
});

test("shared controller rerenders, axis changes, Preview, resize, and unmount restore their reservation",async()=>{
 const {dragControl}=await import("./drag-placement-harness.mjs");
 const spaceModule=await loadProductionModule(new URL("../app/studio/drag-placement-space.ts",import.meta.url));
 const owner=element({"padding-top":"13px"});let base=8,width=200,parentWidth=200,resize,observerCallback,disconnected=0;
 owner.getBoundingClientRect=()=>({width});
 owner.parentElement={getBoundingClientRect:()=>({width:parentWidth})};
 owner.ownerDocument.defaultView={getComputedStyle:()=>({getPropertyValue:key=>owner.style.getPropertyValue(key)||(key.startsWith("padding-")?`${base}px`:"normal")}),addEventListener:(_name,fn)=>resize=fn,removeEventListener:()=>resize=null,ResizeObserver:class{constructor(fn){observerCallback=fn;}observe(){}disconnect(){disconnected++;}}};
 const f=dragControl({mode:"raw",policy:{spaceModule,resolve:()=>null}});let ui=f.render();ui.listProps.ref(owner);f.render();
 for(let i=0;i<4;i++){f.render();assert.equal(owner.style.getPropertyValue("padding-top"),"24px");}
 base=20;parentWidth=250;observerCallback();assert.equal(owner.style.getPropertyValue("padding-bottom"),"24px");
 base=30;resize();assert.equal(owner.style.getPropertyValue("padding-bottom"),"30px");
 owner.style.setProperty("padding-top","50px");f.render();assert.equal(owner.style.getPropertyValue("padding-top"),"50px");
 f.setAxis("x");f.render();assert.equal(owner.style.getPropertyValue("padding-top"),"50px");assert.equal(owner.style.getPropertyValue("padding-left"),"30px");
 f.setReserve(false);f.render();assert.equal(owner.style.getPropertyValue("padding-left"),"");
 f.setReserve(true);f.render();f.unmount();assert.equal(owner.style.getPropertyValue("padding-right"),"");assert.equal(owner.style.getPropertyValue("padding-top"),"50px");assert.ok(disconnected>0);assert.equal(resize,null);observerCallback();assert.equal(owner.style.getPropertyValue("padding-right"),"");
});


test("end reservation preserves hit space while feedback follows item boundaries",()=>{
 const owner=element({"padding-top":"13px","padding-bottom":"0px"});
 const box=(top)=>({left:0,right:100,top,bottom:top+40,width:100,height:40});
 owner.getBoundingClientRect=()=>({width:100});owner.offsetWidth=100;
 owner.children=[{getBoundingClientRect:()=>box(13)},{getBoundingClientRect:()=>box(56)}];
 const restore=reservePlacementSpace([{element:owner,axis:"y",rows:owner.children}]);
 assert.equal(owner.style.getPropertyValue("padding-top"),"13px");
 assert.equal(owner.style.getPropertyValue("padding-bottom"),"3px");
 const gaps=placementEdgeGaps(owner);
 assert.deepEqual(gaps,{before:13,after:3});
 for(const scale of [1,2]){
  const rows=[13,56].map(top=>({left:0,right:100*scale,top:top*scale,bottom:(top+40)*scale,width:100*scale,height:40*scale}));
  const bounds={left:0,top:0,right:100*scale,bottom:500*scale,width:100*scale,height:500*scale};
  assert.equal(insertionGapLine(rows,0,bounds,scale,"y",2,gaps).top,12);
  assert.equal(insertionGapLine(rows,1,bounds,scale,"y",2,gaps).top,53.5);
  assert.equal(insertionGapLine(rows,2,bounds,scale,"y",2,gaps).top,95);
 }
 restore();assert.equal(owner.style.getPropertyValue("padding-top"),"13px");
});


test("logical inner rows exclude wrapper boundaries and appenders from shared spacing",()=>{
 const owner=element({"padding-top":"0px","padding-bottom":"0px"});
 owner.getBoundingClientRect=()=>({width:100});owner.offsetWidth=100;
 const row=top=>({getBoundingClientRect:()=>({left:0,right:100,top,bottom:top+40,width:100,height:40})});
 owner.children=[row(0),row(40),row(300)];
 const restore=reservePlacementSpace([{element:owner,axis:"y",rows:[row(0),row(56)]}]);
 assert.deepEqual(placementEdgeGaps(owner),{before:16,after:16});restore();
});
test("UI lists retain compact declared gaps at both ends without spreading items",()=>{
 const owner=element({"padding-top":"0px","padding-bottom":"0px","row-gap":"3px"});
 const restore=reservePlacementSpace([{element:owner,axis:"y"}]);
 assert.equal(owner.style.getPropertyValue("row-gap"),"3px");
 assert.deepEqual(placementEdgeGaps(owner),{before:3,after:3});
 restore();assert.equal(owner.style.getPropertyValue("row-gap"),"3px");
});

test("distributed flex free space never becomes end padding", () => {
 for (const axis of ["x", "y"]) for (const justify of ["space-between", "space-around", "space-evenly"]) for (const scale of [1, 2]) {
  const owner = element({"padding-left":"0px", "padding-right":"0px", "padding-top":"0px", "padding-bottom":"0px"});
  owner.getBoundingClientRect = () => ({width: 1000 * scale});
  owner.offsetWidth = 1000;
  owner.ownerDocument.defaultView.getComputedStyle = () => ({
   display: "flex", flexDirection: axis === "x" ? "row" : "column", justifyContent: justify,
   getPropertyValue: key => owner.style.getPropertyValue(key) || (key.endsWith("gap") ? "24px" : ""),
  });
  const box = start => axis === "x"
   ? {left:start*scale, right:(start+100)*scale, top:0, bottom:40*scale, width:100*scale, height:40*scale}
   : {left:0, right:100*scale, top:start*scale, bottom:(start+40)*scale, width:100*scale, height:40*scale};
  const rows = [0, 800].map(start => ({getBoundingClientRect: () => box(start)}));
  // Repeated reservation models the responsive observer restoring and measuring again.
  for (let refresh = 0; refresh < 3; refresh++) {
   const restore = reservePlacementSpace([{element:owner, axis, rows}]);
   assert.deepEqual(placementEdgeGaps(owner, axis), {before:24, after:24});
   restore();
   assert.deepEqual(placementEdgeGaps(owner, axis), {before:0, after:0});
  }
 }
});
