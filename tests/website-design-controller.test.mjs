import { evaluateProductionModule } from "./production-module.mjs";
import test from 'node:test';
import assert from 'node:assert/strict';

import { readFileSync } from 'node:fs';
import { loadProductionModule } from './production-module.mjs';
const identities=await loadProductionModule(new URL('../app/studio/site-editor/identity-preview-state.ts',import.meta.url));
const styles=await loadProductionModule(new URL('../app/studio/site-editor/styles-preview-state.ts',import.meta.url));
const design=await loadProductionModule(new URL('../app/studio/site-editor/website-design.ts',import.meta.url));
const source=readFileSync(new URL('../app/studio/site-editor/use-website-design.ts',import.meta.url),'utf8');
function controller(){
 const slots=[],effects=[],timers=new Map(),writes=[];let cursor=0,dirty=true,result,nextTimer=0;
 let deferredHydration=null,delayHydration=false,delaySave=false,releaseSave=null;
 const site=(siteId,title)=>({siteId,writable:true,failure:null,draft:{version:9,siteId,websiteDesign:{identity:{title,tagline:''},styles:{}},templates:{sets:[]},siteNavigation:{setId:'nav'}},updateDraft(update){this.draft=update(this.draft);writes.push(siteId);dirty=true;return true;},async flush(){if(delaySave){delaySave=false;await new Promise(resolve=>{releaseSave=resolve;});}},async reconnect(){}});
 const first=site('test','Test'),second=site('test2','Test2');
 const global={library:{websiteDesignDefaults:{identity:{title:'Default',tagline:''},styles:{}},templates:{sets:[]}},session:{writable:true,error:null,async flush(){},retryConnection(){}},saveDesign(value){global.library={...global.library,websiteDesignDefaults:value};writes.push('global');dirty=true;return true;}};
 const react={
  useRef(value){const i=cursor++;return slots[i]??={current:value};},
  useState(value){const i=cursor++;if(!(i in slots))slots[i]=typeof value==='function'?value():value;return[slots[i],next=>{const value=typeof next==='function'?next(slots[i]):next;if(!Object.is(slots[i],value)){slots[i]=value;dirty=true;}}];},
  useReducer(reducer,arg,init){const i=cursor++;if(!(i in slots)){const cell={value:init?init(arg):arg};cell.dispatch=action=>{const next=reducer(cell.value,action);if(next!==cell.value){cell.value=next;dirty=true;}};slots[i]=cell;}return[slots[i].value,slots[i].dispatch];},
  useMemo(fn,deps){const i=cursor++;if(!slots[i]||deps.some((value,index)=>!Object.is(value,slots[i].deps[index])))slots[i]={value:fn(),deps};return slots[i].value;},
  useEffect(fn,deps){const i=cursor++;if(!slots[i]||!deps||deps.some((value,index)=>!Object.is(value,slots[i].deps?.[index]))){const old=slots[i];slots[i]={deps};effects.push(()=>{old?.cleanup?.();slots[i].cleanup=fn();});}},
  useSyncExternalStore(_subscribe,get){cursor++;return get();},
 };react.useLayoutEffect=react.useEffect;
 const exports={};
 evaluateProductionModule((source),{exports,Error,Boolean,JSON,Object,Promise,queueMicrotask,window:{addEventListener(){},removeEventListener(){},confirm:()=>true},setTimeout(fn){const id=++nextTimer;timers.set(id,fn);return id;},clearTimeout:id=>timers.delete(id),require(name){
  if(name==='react')return react;
  if(name.endsWith('use-studio-workspace'))return {useStudioWorkspace(){}};
  if(name.endsWith('website-design-startup-cache'))return {readWebsiteDesignStartup:()=>null};
  if(name.endsWith('use-test-site'))return {useTestSite:(_enabled,_owner,id)=>id==='test'?first:second};
  if(name.endsWith('test-site/contract'))return {testSiteCollection:value=>value};
  if(name.endsWith('local-publication'))return {localSitePublicationSnapshots:()=>[]};
  if(name.endsWith('use-global-templates'))return {useGlobalTemplates:()=>global};
  if(name.endsWith('global-template-contract'))return {migrateGlobalTemplateBindings:()=>[]};
  if(name.endsWith('identity-repository'))return {createIdentityStore:()=>({read:async()=>null})};
  if(name.endsWith('identity-preview-state'))return identities;
  if(name.endsWith('styles-preview-state'))return styles;
  if(name.endsWith('website-design'))return {...design,hydrateWebsiteDesign(value){if(delayHydration){delayHydration=false;return new Promise(resolve=>{deferredHydration=()=>resolve({identity:value.identity,styles:value.styles});});}return Promise.resolve({identity:value.identity,styles:value.styles});}};
  throw new Error(name);
 }});
 function render(){if(!dirty)return;dirty=false;cursor=0;result=exports.useWebsiteDesign();while(effects.length)effects.shift()();}
 async function settle(){for(let i=0;i<25;i++){render();await Promise.resolve();}}
 return {first,second,global,writes,render,refresh(){dirty=true;render();},settle,delaySave(){delaySave=true;},releaseSave(){releaseSave?.();},get state(){return result;},runTimers(){for(const[id,fn]of [...timers]){timers.delete(id);fn();}},delay(){delayHydration=true;},release(){deferredHydration?.();},close(){slots.forEach(slot=>slot?.cleanup?.());}};
}

test('the production controller hydrates before saving, saves the selected site only, and reloads saved values',async()=>{
 const c=controller();try{
  await c.settle();assert.equal(c.state.ready,true);assert.deepEqual(c.writes,[]);
  c.state.dispatch({type:'change',site:'test',patch:{title:'Changed'}});await c.settle();c.runTimers();await c.settle();
  assert.equal(c.first.draft.websiteDesign.identity.title,'Changed');assert.equal(c.second.draft.websiteDesign.identity.title,'Test2');assert.deepEqual(c.writes,['test']);
  assert.deepEqual(c.first.draft.websiteDesign.styles,{},'identity saving cannot materialise inferred reference style IDs');
 }finally{c.close();}
});

test('a delayed foreign hydration cannot replace a newer user draft',async()=>{
 const c=controller();try{
  await c.settle();const dispatch=c.state.dispatch;
  c.delay();c.global.library={...c.global.library,websiteDesignDefaults:{identity:{title:'Foreign'},styles:{}}};c.global.session={...c.global.session};c.refresh();await c.settle();
  dispatch({type:'change',site:'test',patch:{title:'Retained input'}});await c.settle();c.release();await c.settle();
  assert.equal(c.state.history.present.test.title,'Retained input');
 }finally{c.close();}
});

test('edits made during a pending save are drained as the next generation',async()=>{
 const c=controller();try{await c.settle();c.delaySave();c.state.dispatch({type:'change',site:'test',patch:{title:'First'}});await c.settle();c.runTimers();await c.settle();
 c.state.dispatch({type:'change',site:'test',patch:{title:'Second'}});await c.settle();c.releaseSave();await c.settle();c.runTimers();await c.settle();
 assert.equal(c.first.draft.websiteDesign.identity.title,'Second');assert.deepEqual(c.writes,['test','test']);
 }finally{c.close();}
});
test('foreign settings changes preserve a dirty draft and explicit reload discards only after confirmation',async()=>{
 const c=controller();try{await c.settle();c.state.dispatch({type:'change',site:'test',patch:{title:'My input'}});await c.settle();
 c.global.library={...c.global.library,websiteDesignDefaults:{identity:{title:'Foreign default'},styles:{}}};c.refresh();await c.settle();c.runTimers();await c.settle();
 assert.match(c.state.failure,/changed while you were editing/);assert.equal(c.state.history.present.test.title,'My input');assert.deepEqual(c.writes,[]);
 c.state.retry();await c.settle();assert.equal(c.state.failure,'');assert.equal(c.state.history.present.global.title,'Foreign default');assert.equal(c.state.history.present.test.title,'Test');
 }finally{c.close();}
});
