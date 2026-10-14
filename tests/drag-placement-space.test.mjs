import assert from "node:assert/strict";
import test from "node:test";
import {loadProductionModule} from "./production-module.mjs";
const {reservePlacementSpace,OUTER_INSERTION_GAP}=await loadProductionModule(new URL("../app/studio/drag-placement-space.ts",import.meta.url));
const {insertionGapLine}=await loadProductionModule(new URL("../app/studio/drop-gap-geometry.ts",import.meta.url));
function element(initial={}) {
 const values=new Map(Object.entries(initial).map(([key,value])=>[key,{value,priority:""}]));
 const style={getPropertyValue:key=>values.get(key)?.value??"",getPropertyPriority:key=>values.get(key)?.priority??"",setProperty:(key,value,priority="")=>values.set(key,{value,priority}),removeProperty:key=>values.delete(key)};
 return {style,ownerDocument:{defaultView:{getComputedStyle:()=>({getPropertyValue:key=>style.getPropertyValue(key)||"8px"})}}};
}
test("one shared reservation adds real outer space, deduplicates owners, and restores authored padding",()=>{
 const owner=element({"padding-top":"13px"});const restore=reservePlacementSpace([{element:owner,axis:"y"},{element:owner,axis:"y"}]);
 assert.equal(owner.style.getPropertyValue("padding-top"),"37px");assert.equal(owner.style.getPropertyValue("padding-bottom"),"32px");assert.equal(owner.style.getPropertyValue("padding-left"),"");
 restore();assert.equal(owner.style.getPropertyValue("padding-top"),"13px");assert.equal(owner.style.getPropertyValue("padding-bottom"),"");
 const again=reservePlacementSpace([{element:owner,axis:"y"}]);assert.equal(owner.style.getPropertyValue("padding-top"),"37px");again();
});
test("horizontal reservations preserve newer authored declarations during cleanup",()=>{
 const owner=element();const restore=reservePlacementSpace([{element:owner,axis:"x"}]);assert.equal(owner.style.getPropertyValue("padding-left"),"32px");assert.equal(owner.style.getPropertyValue("padding-top"),"");
 owner.style.setProperty("padding-left","50px");restore();assert.equal(owner.style.getPropertyValue("padding-left"),"50px");assert.equal(owner.style.getPropertyValue("padding-right"),"");
});
test("outer lines sit halfway inside reserved spaces on either axis and at zoom",()=>{
 const box=(left,top,width,height)=>({left,top,right:left+width,bottom:top+height,width,height});
 for(const scale of [1,2])for(const axis of ["x","y"]){const owner=box(0,0,300*scale,300*scale);const rows=[box(24*scale,24*scale,50*scale,50*scale),box(100*scale,100*scale,50*scale,50*scale)];
 const first=insertionGapLine(rows,0,owner,scale,axis),last=insertionGapLine(rows,rows.length,owner,scale,axis);
 assert.equal(first[axis==="y"?"top":"left"],OUTER_INSERTION_GAP/2-1);assert.equal(last[axis==="y"?"top":"left"],150+OUTER_INSERTION_GAP/2-1);
 }
});

test("shared controller rerenders, axis changes, Preview, resize, and unmount restore their reservation",async()=>{
 const {dragControl}=await import("./drag-placement-harness.mjs");
 const spaceModule=await loadProductionModule(new URL("../app/studio/drag-placement-space.ts",import.meta.url));
 const owner=element({"padding-top":"13px"});let base=8,width=200,parentWidth=200,resize,observerCallback,disconnected=0;
 owner.getBoundingClientRect=()=>({width});
 owner.parentElement={getBoundingClientRect:()=>({width:parentWidth})};
 owner.ownerDocument.defaultView={getComputedStyle:()=>({getPropertyValue:key=>owner.style.getPropertyValue(key)||`${base}px`}),addEventListener:(_name,fn)=>resize=fn,removeEventListener:()=>resize=null,ResizeObserver:class{constructor(fn){observerCallback=fn;}observe(){}disconnect(){disconnected++;}}};
 const f=dragControl({mode:"raw",policy:{spaceModule,resolve:()=>null}});let ui=f.render();ui.listProps.ref(owner);f.render();
 for(let i=0;i<4;i++){f.render();assert.equal(owner.style.getPropertyValue("padding-top"),"37px");}
 base=20;parentWidth=250;observerCallback();assert.equal(owner.style.getPropertyValue("padding-bottom"),"44px");
 base=30;resize();assert.equal(owner.style.getPropertyValue("padding-bottom"),"54px");
 owner.style.setProperty("padding-top","50px");f.render();assert.equal(owner.style.getPropertyValue("padding-top"),"74px");
 f.setAxis("x");f.render();assert.equal(owner.style.getPropertyValue("padding-top"),"50px");assert.equal(owner.style.getPropertyValue("padding-left"),"54px");
 f.setReserve(false);f.render();assert.equal(owner.style.getPropertyValue("padding-left"),"");
 f.setReserve(true);f.render();f.unmount();assert.equal(owner.style.getPropertyValue("padding-right"),"");assert.equal(owner.style.getPropertyValue("padding-top"),"50px");assert.ok(disconnected>0);assert.equal(resize,null);observerCallback();assert.equal(owner.style.getPropertyValue("padding-right"),"");
});
