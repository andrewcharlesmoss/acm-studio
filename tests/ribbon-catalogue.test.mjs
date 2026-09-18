import assert from "node:assert/strict";
import test from "node:test";

test("multiple real Ribbon instances render unique accessible tab/panel relationships", async () => {
  const { createRequire } = await import("node:module");
  const { pathToFileURL } = await import("node:url");
  const { default: ts } = await import("typescript");
  const { createElement, Fragment } = await import("react");
  const { renderToStaticMarkup } = await import("react-dom/server");
  const require = createRequire(import.meta.url);
  const source = readFileSync(require.resolve("@acm/ribbon"),"utf8");
  const compiled = ts.transpileModule(source,{ compilerOptions:{ jsx:ts.JsxEmit.ReactJSX, module:ts.ModuleKind.ESNext } }).outputText
    .replace(/from "(react(?:\/jsx-runtime)?)"/g, (_match,name) => "from " + JSON.stringify(pathToFileURL(require.resolve(name)).href));
  const { Ribbon, RibbonPanel, RibbonButton } = await import("data:text/javascript;base64," + Buffer.from(compiled).toString("base64"));
  const make = (key) => createElement(Ribbon,{ key, tabs:[{id:"one",label:"One"},{id:"two",label:"Two"}],activeTab:"one",onTabChange:()=>{},accessibleName:key },
    createElement(RibbonPanel,{tab:"one"},createElement(RibbonButton,null,"Demo")),
    createElement(RibbonPanel,{tab:"two"},"Hidden"));
  const markup = renderToStaticMarkup(createElement(Fragment,null,make("first"),make("second")));
  const ids = [...markup.matchAll(/ id="([^"]+)"/g)].map((match) => match[1]);
  assert.equal(ids.length,8); assert.equal(new Set(ids).size,8);
  for (const [,target] of markup.matchAll(/aria-(?:controls|labelledby)="([^"]+)"/g)) assert.ok(ids.includes(target),target);
  assert.equal([...markup.matchAll(/aria-hidden="true" tabindex="-1"/gi)].length,2);
});
import { readFileSync } from "node:fs";
import { iconNames, iconScales, iconGeometry } from "@acm/icons";
import { commandInventory, componentDescriptions, examples, flattenControls, flattenStructure, shapeOptions, structureFor, studioExample, accountExample, zoomOptions } from "../app/studio/ribbon/catalogue-model.ts";
import { controlPresentation, disabledReason, hasAccountSelection, initialDemo, rangeValue, runDemoCommand, setAccountColumns, setDemoSelection, visibleRows } from "../app/studio/ribbon/demo-state.ts";
const control = (id) => { const result = commandInventory.find((item) => item.id === id); assert.ok(result,id); return result; };
const run = (state,id,value) => runDemoCommand(state,control(id),value);
const freeze = (value) => { if (value && typeof value === "object" && !Object.isFrozen(value)) { Object.values(value).forEach(freeze); Object.freeze(value); } return value; };
test("every typed command appears in the same structure and resolves to valid original assets", () => {
  assert.equal(new Set(commandInventory.map((item) => item.id)).size,commandInventory.length);
  for (const example of examples) {
    const nodes = flattenStructure(structureFor(example));
    for (const item of flattenControls(example)) {
      assert.ok(nodes.some((node) => node.control?.id === item.id),item.id);
      assert.ok(item.icon || item.textOnlyReason,item.id);
      for (const name of [item.icon,...(item.iconVariants ?? [])].filter(Boolean)) {
        assert.ok(iconNames.includes(name),name);
        for (const scale of iconScales) assert.ok(iconGeometry[name][scale].paths.length);
      }
    }
  }
  const components = flattenStructure(structureFor(examples[0])).map((node) => node.component);
  for (const name of Object.keys(componentDescriptions)) assert.ok(components.includes(name),name);
  assert.deepEqual(studioExample.tabs.map((tab) => tab.id),["file","home","insert","arrange","view","export"]);
  assert.deepEqual(accountExample.tabs.map((tab) => tab.id),["file","home","view","data"]);
  assert.equal(accountExample.tabs[0].groups.length,0); assert.equal(accountExample.tabs[1].groups.length,0);
  assert.equal(shapeOptions.length,9); assert.equal(zoomOptions.length,491);
  assert.equal(control("studio.handoff.block").condition,"handoff");
  assert.equal(control("studio.handoff.cover").condition,"handoff");
  assert.equal(control("studio.update-media").condition,"linked");
});
test("Studio tools are exclusive, reselecting is stable and shapes clear the tool selection", () => {
  let state = initialDemo(studioExample);
  assert.equal(controlPresentation(control("studio.select"),state).pressed,true);
  state = run(state,"studio.arrow");
  assert.equal(controlPresentation(control("studio.select"),state).pressed,false);
  assert.equal(controlPresentation(control("studio.arrow"),state).pressed,true);
  state = run(state,"studio.arrow");
  assert.equal(controlPresentation(control("studio.arrow"),state).pressed,true);
  state = run(state,"studio.shapes","hexagon");
  assert.equal(controlPresentation(control("studio.arrow"),state).pressed,false);
  assert.equal(state.values["studio.shapes"],"hexagon");
});
test("selected object drives duplicate and arrangement; undo/redo always reconciles selection", () => {
  let state = { ...initialDemo(studioExample), selectedObjectId: 1 };
  state = run(state,"studio.duplicate");
  assert.equal(state.objects.at(-1).kind,"text");
  assert.equal(state.objects.at(-1).label,"Summer Notes Copy");
  assert.equal(state.selectedObjectId,3);
  state = run(state,"studio.undo");
  assert.equal(state.objects.length,2);
  assert.ok(state.objects.some((item) => item.id === state.selectedObjectId));
  state = run(state,"studio.redo");
  assert.equal(state.objects.length,3);
  assert.ok(state.objects.some((item) => item.id === state.selectedObjectId));
  state = { ...state, selectedObjectId: 1 };
  state = run(state,"studio.front");
  assert.equal(state.objects.at(-1).id,1);
  assert.equal(state.selectedObjectId,1);
  state = { ...state, selectedObjectId: 999 };
  assert.ok(disabledReason(control("studio.duplicate"),state));
  assert.equal(run(state,"studio.duplicate"),state);
});
test("Account actions require a visible editable selection and cell-selection mode", () => {
  let state = run(initialDemo(accountExample),"account.lock");
  assert.equal(disabledReason(control("account.edit"),state),undefined);
  state = run(state,"account.cell");
  assert.equal(state.selected,false); assert.equal(state.selectedRow,null); assert.equal(state.editing,false);
  assert.ok(disabledReason(control("account.edit"),state));
  state = run(state,"account.cell");
  state = setDemoSelection(state,true,true);
  assert.equal(hasAccountSelection(state),true);
  state = setAccountColumns(state,["username","email","status"]);
  assert.equal(hasAccountSelection(state),false); assert.equal(state.selectedRow,null);
  assert.ok(disabledReason(control("account.edit"),state));
  state = { ...state, columns:["name","username"], filter:"suspended" };
  state = setDemoSelection(state,true,true);
  assert.equal(state.selectedRow,"sample-2");
  state = { ...state, loading:true };
  assert.equal(hasAccountSelection(state),false);
  assert.ok(disabledReason(control("account.delete"),state));
});
test("Account search, filters, empty states and reset operate only on synthetic rows", () => {
  let state = initialDemo(accountExample);
  state = run(state,"account.search-input","Maya"); state = run(state,"account.search");
  assert.deepEqual(visibleRows(state).map((row) => row.id),["sample-1"]);
  state = run(state,"account.clear"); assert.equal(visibleRows(state).length,4);
  state = run(state,"account.status","pending_deletion"); state = run(state,"account.search");
  assert.deepEqual(visibleRows(state).map((row) => row.id),["sample-3"]);
  state = run(state,"account.search-input","no-match"); state = run(state,"account.search"); assert.equal(visibleRows(state).length,0);
  assert.equal(visibleRows(initialDemo(accountExample)).length,4);
});
test("scoped native ranges quantise, constrain, isolate overrides and reset accurately", () => {
  let state = initialDemo(accountExample);
  state = run(state,"account.row-height",49);
  assert.equal(rangeValue(control("account.row-height"),state),48);
  state = run(state,"account.row-height.scope");
  state = run(state,"account.row-height",100);
  assert.equal(state.rowHeights["sample-1"],100);
  state = { ...state, selectedRow:"sample-2" };
  assert.equal(rangeValue(control("account.row-height"),state),48);
  state = run(state,"account.row-height.reset");
  assert.equal(state.rowHeights["sample-1"],100);
  state = run(state,"account.column-width",999); assert.equal(state.columnWidths.name,420);
  state = run(state,"account.column-width.reset"); assert.equal(rangeValue(control("account.column-width"),state),150);
  assert.equal(run(state,"account.column-width",NaN),state);
});
test("state variants and field values have accurate presentation and reverse icon mapping", () => {
  let state = initialDemo(accountExample);
  state = run(state,"account.lock");
  assert.equal(controlPresentation(control("account.lock"),state).icon,"security.unlock");
  assert.ok(control("account.lock").iconVariants.includes("security.unlock"));
  assert.equal(controlPresentation(control("specimen.text"),initialDemo(examples[0])).pressed,false);
  for (const name of ["view.hide","view.single","view.snap-off","scope.selected"]) assert.ok(commandInventory.some((item) => item.iconVariants?.includes(name)),name);
  assert.deepEqual(control("account.highlight").iconVariants,["table.columns","table.both"]);
  assert.equal(disabledReason(control("studio.export.selected"),{ ...initialDemo(studioExample), locked:true }),undefined);
});
test("all demo commands run without network, browser storage or mutable fixture inputs", (t) => {
  const forbidden = () => { throw new Error("Forbidden persistence/network access"); };
  t.mock.method(globalThis,"fetch",forbidden);
  const originals = new Map();
  for (const name of ["window","localStorage","sessionStorage","indexedDB","document"]) {
    originals.set(name,Object.getOwnPropertyDescriptor(globalThis,name));
    Object.defineProperty(globalThis,name,{ configurable:true, get:forbidden });
  }
  t.after(() => { for (const [name,descriptor] of originals) { if (descriptor) Object.defineProperty(globalThis,name,descriptor); else delete globalThis[name]; } });
  for (const example of examples) {
    const state = freeze({ ...initialDemo(example), locked:false, handoff:true, linked:true });
    for (const item of flattenControls(example)) {
      const next = runDemoCommand(state,item,item.initial ?? (item.kind === "text" ? "sample" : 50));
      assert.ok(next && typeof next.message === "string",item.id);
    }
  }
  assert.equal(globalThis.fetch.mock.callCount(),0);
});
test("catalogue imports remain separate from product stores and live Account components", () => {
  for (const file of ["ribbon-catalogue.tsx","ribbon-preview.tsx","catalogue-model.ts","demo-state.ts"]) {
    const source = readFileSync(new URL("../app/studio/ribbon/" + file,import.meta.url),"utf8");
    assert.doesNotMatch(source,/from ["'][^"']*(?:store|repository|write-ownership|directory-ribbon|administration-panel)/);
    assert.doesNotMatch(source,/localStorage|sessionStorage|indexedDB|fetch\(/);
  }
});
