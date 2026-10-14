import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { loadProductionModule } from "./production-module.mjs";
const read=path=>readFileSync(new URL(`../app/studio/${path}`,import.meta.url),"utf8");
test("Studio insertion-gap consumers inherit one controller, geometry and renderer",()=>{
 for(const path of ["studio-canvas.tsx","use-gap-reordering.ts"])assert.match(read(path),/from "\.\/use-drag-placement"/);
 assert.match(read("use-library-reordering.ts"),/from "\.\/use-gap-reordering"/);
 for(const path of ["use-gap-reordering.ts","column-drop-position.ts","block-drop-position.ts"])assert.match(read(path),/from "\.\/drop-gap-geometry"/);
 for(const path of ["studio-canvas.tsx","studio-navigation-pane.tsx","template-workspace.tsx","project-local-links.tsx","template-navigation-editor.tsx","design-editor.tsx"]){assert.match(read(path),/from "\.\/drag-placement-indicator"/);assert.doesNotMatch(read(path),/className="studio-gap-line"/);}
 for(const path of ["use-library-reordering.ts","use-gap-reordering.ts"]){assert.doesNotMatch(read(path),/setPointerCapture|startDragAutoScroll/);}
 assert.equal((read("studio.css").match(/\.studio-gap-line \{/g)??[]).length,1);assert.doesNotMatch(read("studio.css"),/\[data-drop-edge[^\n]*::after|\.column-drop-indicator/);assert.doesNotMatch(read("design.css"),/is-drop-before|is-drop-after|page-drop-guide/);
});
test("the shared indicator renders exactly one noninteractive line for either HTML owner",async()=>{
 const {DragPlacementIndicator}=await loadProductionModule(new URL("../app/studio/drag-placement-indicator.tsx",import.meta.url));
 assert.equal(renderToStaticMarkup(React.createElement(DragPlacementIndicator,{line:null})),"");
 for(const as of ["div","li"]){const html=renderToStaticMarkup(React.createElement(DragPlacementIndicator,{as,line:{left:0,top:49,width:100,height:2}}));assert.equal((html.match(/class="studio-gap-line"/g)??[]).length,1);assert.match(html,new RegExp(`^<${as} `));assert.match(html,/aria-hidden="true"/);assert.match(html,/top:49px/);assert.doesNotMatch(html,/tabindex|button/);}
});
