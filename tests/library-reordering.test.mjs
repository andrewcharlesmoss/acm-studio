import assert from "node:assert/strict";
import test from "node:test";
import { loadProductionModule } from "./production-module.mjs";
const { movedLibraryIds, reorderLibraryDocuments, reorderLibraryTemplates } = await loadProductionModule(new URL("../app/studio/library-reordering.ts", import.meta.url));
const { createTemplateSet, emptyTemplateStore, validateTemplateStore, TEMPLATE_VERSION } = await loadProductionModule(new URL("../app/studio/template-model.ts", import.meta.url));
const { templateLibraryEntries } = await loadProductionModule(new URL("../app/studio/template-library.ts", import.meta.url));
const { createStudioTransaction, applyStudioTransaction } = await loadProductionModule(new URL("../app/studio/studio-sync.ts", import.meta.url));
const move = (baseline, id, targetId, edge = "before") => ({ baseline, id, targetId, edge });
const ids = store => templateLibraryEntries(store).map(({ set, entry }) => `${set.id}/${entry.id}`);
function fixture() { return validateTemplateStore({ ...emptyTemplateStore(), sets: [createTemplateSet("First"), createTemplateSet("Second")] }); }

test("document reordering keeps category slots, selection and all editorial fields", () => {
  const documents = [{id:"a",kind:"post", title:"A"}, {id:"page",kind:"page", title:"Page"}, {id:"b",kind:"post", title:"B"}, {id:"c",kind:"post", title:"C"}];
  const source = {documents, activeDocumentId:"a", bin:[]};
  const next = reorderLibraryDocuments(source, "post", move(["a","b","c"], "c","a"));
  assert.deepEqual(next.documents.map(item => item.id), ["c","page","a","b"]);
  assert.equal(next.activeDocumentId,"a");
  next.documents.forEach(item => assert.equal(item,documents.find(original => original.id===item.id)));
  assert.equal(reorderLibraryDocuments(source,"post",move(["b","a","c"],"c","a")),source);
});

test("moves reject stale, missing, self and unchanged targets", () => {
  assert.deepEqual(movedLibraryIds(["a","b","c"],move(["a","b","c"],"a","c","after")),["b","c","a"]);
  for (const operation of [move(["a","b"],"a","c"),move(["a","b","c"],"missing","a"),move(["a","b","c"],"a","a"),move(["a","b","c"],"b","c")]) assert.equal(movedLibraryIds(["a","b","c"],operation),null);
});

test("template migration preserves legacy sequence; mixed kinds move across owner sets", () => {
  const source = fixture();
  const legacy = {...source,version:"0.29.0"}; delete legacy.libraryOrder;
  const migrated = validateTemplateStore(legacy);
  assert.equal(migrated.version,TEMPLATE_VERSION);
  assert.deepEqual(ids(migrated),ids(source));
  const baseline=ids(source); const next=reorderLibraryTemplates(source,move(baseline,baseline.at(-1),baseline[0]));
  assert.equal(ids(next)[0],baseline.at(-1));
  assert.deepEqual(next.sets,source.sets); assert.deepEqual(next.assignments,source.assignments); assert.deepEqual(next.bin,source.bin);
  assert.deepEqual(ids(validateTemplateStore(JSON.parse(JSON.stringify(next)))),ids(next));
});

test("order metadata retains removed/Bin positions and appends new entries", () => {
  const source=fixture(); const baseline=ids(source); const next=reorderLibraryTemplates(source,move(baseline,baseline.at(-1),baseline[0]));
  const removed=next.sets[1].parts.pop();
  next.sets[1].templates.forEach(item => { item.nodes=item.nodes.filter(node => node.type!=="part" || node.partId!==removed.id); });
  const checked=validateTemplateStore(next);
  assert.ok(checked.libraryOrder.some(item=>item.entryId===removed.id));
  const restored=validateTemplateStore({...checked,sets:checked.sets.map((set,i)=>i===1?{...set,parts:[...set.parts,removed]}:set)});
  assert.equal(ids(restored)[0],baseline.at(-1));
});

test("template ordering metadata rejects malformed, duplicate and unsupported records", () => {
  const source=fixture(); const first=source.libraryOrder[0];
  for (const order of [[{...first,id:"wrong"}],[first,first],[{...first,setId:"../escape"}],[{...first,extra:true}]]) assert.throws(()=>validateTemplateStore({...source,libraryOrder:order}));
  assert.throws(()=>validateTemplateStore({...source,version:"0.29.0"}));
});

test("first canonical order move merges independent properties and rejects concurrent order", () => {
  const source=fixture(); const baseline=ids(source);
  const next=reorderLibraryTemplates(source,move(baseline,baseline.at(-1),baseline[0]));
  const transaction=createStudioTransaction(source,next,{transactionId:"move",clientId:"peer",brokerEpoch:"epoch",baseRevision:1});
  assert.ok(transaction.changes.some(change=>change.kind==="move"&&change.path.join("/")==="libraryOrder"));
  const foreign=structuredClone(source); foreign.sets[0].templates[0].name="Other title";
  const merged=applyStudioTransaction(foreign,transaction);
  assert.deepEqual(merged.conflicts,[]); assert.equal(merged.snapshot.sets[0].templates[0].name,"Other title"); assert.deepEqual(ids(merged.snapshot),ids(next));
  const competing=reorderLibraryTemplates(source,move(baseline,baseline[1],baseline[2],"after"));
  assert.ok(applyStudioTransaction(competing,transaction).conflicts.some(item=>item.reason==="order"));
});

test("materialising new entries refuses overflow without trimming recovery order",()=>{
 const source=fixture();const libraryOrder=Array.from({length:20000},(_,index)=>({id:`retained/entry-${index}`,setId:"retained",entryId:`entry-${index}`}));
 assert.throws(()=>validateTemplateStore({...source,libraryOrder}),/recovery limit/);
 assert.equal(libraryOrder.length,20000);assert.deepEqual(validateTemplateStore(validateTemplateStore(source)),source);
});
