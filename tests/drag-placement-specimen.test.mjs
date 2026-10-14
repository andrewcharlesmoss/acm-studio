import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { loadProductionModule } from "./production-module.mjs";
const {DragPlacementSpecimen,applyExampleMove}=await loadProductionModule(new URL("../app/studio/ui/controls/drag-placement-specimen.tsx",import.meta.url));
test("the catalogue specimen renders real shared handles, layout choices, and scoped history",()=>{
 const html=renderToStaticMarkup(React.createElement(DragPlacementSpecimen));
 for(const label of ["Vertical","Horizontal","Wrapped","Read-only example","Undo","Redo"])assert.ok(html.includes(label));
 assert.equal((html.match(/data-gap-row=/g)??[]).length,4);
 assert.equal((html.match(/aria-label="Reorder /g)??[]).length,4);
 assert.match(html,/data-drag-placement-owner=/);assert.doesNotMatch(html,/class="studio-gap-line"/);assert.match(html,/History position 0 of 0/);
});
test("example commits reject unchanged and stale positions without history",()=>{
 const history={orders:[["a","b","c"]],cursor:0};
 for(const move of [{id:"a",targetId:"b",edge:"before",baseline:["a","b","c"]},{id:"a",targetId:"c",edge:"before",baseline:["b","a","c"]}])assert.equal(applyExampleMove(history,move),history);
 const changed=applyExampleMove(history,{id:"a",targetId:"c",edge:"before",baseline:["a","b","c"]});assert.deepEqual(changed,{orders:[["a","b","c"],["b","a","c"]],cursor:1});
 const branch=applyExampleMove({...changed,cursor:0},{id:"c",targetId:"a",edge:"before",baseline:["a","b","c"]});assert.deepEqual(branch,{orders:[["a","b","c"],["c","a","b"]],cursor:1});
});
test("specimen inherits production input and geometry without persistence or separate handlers",()=>{
 const source=readFileSync(new URL("../app/studio/ui/controls/drag-placement-specimen.tsx",import.meta.url),"utf8");
 assert.match(source,/useGapReordering/);assert.match(source,/DragPlacementIndicator as="li" line={drag.line}/);assert.match(source,/\.\.\.drag.handleProps\(id\)/);
 assert.doesNotMatch(source,/localStorage|sessionStorage|indexedDB|write-ownership|setPointerCapture|onDragOver|onDrop/);
});
