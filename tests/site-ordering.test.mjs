import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { runnerImport } from 'vite';
import { orderedSiteIds, readSiteOrder, createSiteOrderRepository, siteOrderPreferenceKey } from '../app/studio/site-order-repository.mjs';
const ids=['acm-studio','test','test2'];
function storage(){const values=new Map();return{getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value)};}
function ownership(allowed=true){return{canWrite:()=>allowed,write:async fn=>{assert.equal(allowed,true);return fn();}};}
test('site order restores known IDs, appends new sites and rejects malformed/duplicate preferences',()=>{
 assert.deepEqual(orderedSiteIds(ids,['test2','old','test']),['test2','test','acm-studio']);
 for(const value of [null,{},['test','test'],[3]])assert.deepEqual(orderedSiteIds(ids,value),ids);
 const store=storage();store.setItem(siteOrderPreferenceKey,'broken');assert.deepEqual(readSiteOrder(store,ids),ids);store.setItem(siteOrderPreferenceKey,'x'.repeat(2049));assert.deepEqual(readSiteOrder(store,ids),ids);
});
test('site order saves under the existing writer and survives a fresh repository',async()=>{
 const store=storage();let writes=0;const owner=ownership();owner.write=async fn=>{writes++;return fn();};const repo=createSiteOrderRepository({storage:store,ids,ownership:owner,locks:null});
 assert.equal((await repo.save(['test2','acm-studio','test'],ids)).saved,true);assert.equal(writes,1);assert.deepEqual(createSiteOrderRepository({storage:store,ids,ownership:owner,locks:null}).read(),['test2','acm-studio','test']);
});
test('stale, invalid, denied and failed saves preserve the last stored site order',async()=>{
 const store=storage();const owner=ownership();const repo=createSiteOrderRepository({storage:store,ids,ownership:owner,locks:null});await repo.save(['test2','acm-studio','test'],ids);const saved=store.getItem(siteOrderPreferenceKey);
 assert.equal((await repo.save(['test','test2','acm-studio'],ids)).saved,false);assert.equal((await repo.save(['test','test'],['test2','acm-studio','test'])).reason,'invalid');assert.equal(store.getItem(siteOrderPreferenceKey),saved);
 const denied=createSiteOrderRepository({storage:store,ids,ownership:ownership(false),locks:{request:async(name,options,callback)=>{assert.equal(name,'acm-studio-writer-v1');assert.equal(options.ifAvailable,true);return callback(null);}}});assert.equal((await denied.save(ids,['test2','acm-studio','test'])).reason,'blocked');assert.equal(store.getItem(siteOrderPreferenceKey),saved);
 const failing=createSiteOrderRepository({storage:{getItem:store.getItem,setItem(){throw new Error('Quota');}},ids,ownership:owner,locks:null});assert.equal((await failing.save(ids,['test2','acm-studio','test'])).reason,'storage');
});
const options={resolve:{dedupe:['react','react-dom']},environments:{inline:{resolve:{noExternal:[/^@acm\//]}}}};
const {module: links}=await runnerImport('app/studio/project-local-links.tsx',options);
const {module: libraryMoves}=await runnerImport('app/studio/library-reordering.ts',options);
const {module: gapGeometry}=await runnerImport('app/studio/drop-gap-geometry.ts',options);
test('Sites renders three named catalogue handles alongside separate edit/visit controls',()=>{
 const html=renderToStaticMarkup(React.createElement(links.LocalFixtureSiteNavigation,{selectedSite:'test'}));
 for(const name of ['ACM Studio','Test','Test2'])assert.match(html,new RegExp(`aria-label="Reorder ${name}"`));
 assert.equal((html.match(/class="studio-site-drag-button"/g)??[]).length,3);
 assert.match(html,/Edit Test local site/);assert.match(html,/Visit Site — Test — Production/);assert.match(html,/data-active="true"/);assert.match(html,/data-library-entry-id="test"/);
 assert.doesNotMatch(html,/<div[^>]+class="studio-local-site-actions[^>]+draggable/);
});
function hookHarness(store=storage(),allowed=true){
 const slots=[];let cursor=0,effects=[];const events=new Map();
 const same=(a,b)=>a&&a.length===b.length&&a.every((v,i)=>Object.is(v,b[i]));
 const react={useCallback:fn=>fn,useLayoutEffect:(fn,deps)=>react.useEffect(fn,deps),useId:()=> 'sites-test',useRef(value){const i=cursor++;return slots[i]??={current:value};},useState(value){const i=cursor++;if(!(i in slots))slots[i]=value;return[slots[i],v=>slots[i]=typeof v==='function'?v(slots[i]):v];},useEffect(fn,deps){const i=cursor++;if(!deps||!same(slots[i]?.deps,deps)){effects.push(()=>{slots[i]?.cleanup?.();slots[i]={deps,cleanup:fn()};});}}};
 const modules={react,'./site-order-repository.mjs':{createSiteOrderRepository:opts=>createSiteOrderRepository({...opts,ownership:ownership(allowed),locks:null}),orderedSiteIds,siteOrderPreferenceKey},'./library-reordering':libraryMoves,'./drop-gap-geometry':gapGeometry,'./drag-placement-space':{maintainPlacementSpace:()=>()=>{}},'./drag-auto-scroll':{startDragAutoScroll:()=>()=>{}}};
 function load(path){const exports={};vm.runInNewContext(ts.transpileModule(readFileSync(new URL(path,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,require:name=>modules[name],queueMicrotask,JSON,Error,document:{addEventListener(){},removeEventListener(){},querySelectorAll:()=>[]},window:{localStorage:store,addEventListener:(name,fn)=>events.set(name,fn),removeEventListener:name=>events.delete(name)}});return exports;}
 modules['./use-drag-placement']=load('../app/studio/use-drag-placement.ts');modules['./use-gap-reordering']=load('../app/studio/use-gap-reordering.ts');
 modules['./use-library-reordering']=load('../app/studio/use-library-reordering.ts');const hook=load('../app/studio/use-site-ordering.ts').useSiteOrdering;
 return{store,render(){cursor=0;const ui=hook(ids);const pending=effects;effects=[];pending.forEach(fn=>fn());return ui;},event(event){events.get('storage')?.(event);}};
}
test('site keyboard reordering persists, cancels stale drags and follows cross-tab saved order',async()=>{
 const h=hookHarness();h.render();await Promise.resolve();let ui=h.render();ui.reordering.rowProps('test2').onKeyDown({key:'ArrowUp',altKey:true,preventDefault(){}});await new Promise(resolve=>setTimeout(resolve,0));ui=h.render();assert.deepEqual([...ui.order],['acm-studio','test2','test']);assert.deepEqual(readSiteOrder(h.store,ids),['acm-studio','test2','test']);
 const values=new Map();const drag={dataTransfer:{setData:(key,value)=>values.set(key,value),getData:key=>values.get(key)},preventDefault(){},stopPropagation(){},currentTarget:{getBoundingClientRect:()=>({top:0,height:40})},clientY:30};ui.reordering.rowProps('acm-studio').onDragStart(drag);
 h.store.setItem(siteOrderPreferenceKey,JSON.stringify(['test','test2','acm-studio']));h.event({key:siteOrderPreferenceKey});ui=h.render();ui.reordering.rowProps('test2').onDrop(drag);assert.deepEqual([...h.render().order],['test','test2','acm-studio']);
 const fresh=hookHarness(h.store);fresh.render();await Promise.resolve();assert.deepEqual([...fresh.render().order],['test','test2','acm-studio']);
});
test('denied site preference save keeps local reordering and visibly reports its saving limitation',async()=>{
 const h=hookHarness(storage(),false);h.render();await Promise.resolve();h.render().reordering.rowProps('test2').onKeyDown({key:'ArrowUp',altKey:true,preventDefault(){}});await new Promise(resolve=>setTimeout(resolve,0));const ui=h.render();assert.deepEqual([...ui.order],['acm-studio','test2','test']);assert.match(ui.status,/not saved/);assert.equal(h.store.getItem(siteOrderPreferenceKey),null);
});
