import { evaluateProductionModule } from "./production-module.mjs";
import test from 'node:test';
import assert from 'node:assert/strict';

import { readFileSync } from 'node:fs';
import { loadProductionModule } from './production-module.mjs';
const identities=await loadProductionModule(new URL('../app/studio/site-editor/identity-preview-state.ts',import.meta.url));
const styles=await loadProductionModule(new URL('../app/studio/site-editor/styles-preview-state.ts',import.meta.url));
const design=await loadProductionModule(new URL('../app/studio/site-editor/website-design.ts',import.meta.url));
const styleValidation=await loadProductionModule(new URL('../app/studio/site-editor/website-style-validation.ts',import.meta.url));
const source=readFileSync(new URL('../app/studio/site-editor/use-website-design.ts',import.meta.url),'utf8');
function controller(){
 const slots=[],effects=[],timers=new Map(),writes=[];let cursor=0,dirty=true,result,nextTimer=0;
 let deferredHydration=null,delayHydration=false,delaySave=false,releaseSave=null,failSave=false;
 const site=(siteId,title)=>({siteId,writable:true,failure:null,draft:{version:9,siteId,websiteDesign:{identity:{title,tagline:''},styles:{}},templates:{sets:[]},siteNavigation:{setId:'nav'}},updateDraft(update){if(!this.writable)return false;this.draft=update(this.draft);writes.push(siteId);dirty=true;return true;},async flush(){if(delaySave){delaySave=false;await new Promise(resolve=>{releaseSave=resolve;});}if(failSave){failSave=false;throw new Error('The primary Studio tab stopped responding.');}this.snapshot={document:structuredClone(this.draft)};},async reconnect(){writes.push(`${siteId}:reconnect`);}});
 const first=site('test','Test'),second=site('test2','Test2');
 first.snapshot={document:structuredClone(first.draft)};second.snapshot={document:structuredClone(second.draft)};
 let confirmedGlobal={identity:{title:'Default',tagline:''},styles:{}};
 const global={confirmedWebsiteDesign:()=>confirmedGlobal,reconnectSaving(){writes.push('global:reconnect');},library:{websiteDesignDefaults:{identity:{title:'Default',tagline:''},styles:{}},templates:{sets:[]}},session:{writable:true,error:null,async flush(){confirmedGlobal=structuredClone(global.library.websiteDesignDefaults);},retryConnection(){}},saveDesign(value){global.library={...global.library,websiteDesignDefaults:value};writes.push('global');dirty=true;return true;}};
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
  if(name.endsWith('website-style-validation'))return styleValidation;
  throw new Error(name);
 }});
 function render(){if(!dirty)return;dirty=false;cursor=0;result=exports.useWebsiteDesign({test:first,test2:second,globals:global,browser:{retryEditing(){writes.push('browser:reconnect');}}});while(effects.length)effects.shift()();}
 async function settle(){for(let i=0;i<25;i++){render();await Promise.resolve();}}
 return {first,second,global,writes,render,refresh(){dirty=true;render();},settle,delaySave(){delaySave=true;},failSave(){failSave=true;},acknowledgeFirst(){first.snapshot={document:structuredClone(first.draft)};dirty=true;},releaseSave(){releaseSave?.();},get state(){return result;},runTimers(){for(const[id,fn]of [...timers]){timers.delete(id);fn();}},delay(){delayHydration=true;},release(){deferredHydration?.();},close(){slots.forEach(slot=>slot?.cleanup?.());}};
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
 c.first.draft={...c.first.draft,websiteDesign:{identity:{title:'Foreign title',tagline:''},styles:{}}};c.first.snapshot={document:structuredClone(c.first.draft)};c.refresh();await c.settle();c.runTimers();await c.settle();
 assert.match(c.state.failure,/changed while you were editing/);assert.equal(c.state.history.present.test.title,'My input');assert.deepEqual(c.writes,[]);
 assert.equal(c.state.canResetAfterValidationFailure,false,'conflict failures must not bypass draft recovery');
 c.state.retry();await c.settle();assert.equal(c.state.failure,'');assert.equal(c.state.history.present.global.title,'Default');assert.equal(c.state.history.present.test.title,'Foreign title');
 }finally{c.close();}
});

test('Reset styles can recover a validation-failed draft without discarding identity or other scopes',async()=>{
 const c=controller();try{
  await c.settle();
  c.state.dispatch({type:'change',site:'global',patch:{title:'Kept draft'}});
  c.state.dispatchStyle({type:'block-style',scope:'global',block:'image',patch:{margin:'clamp(1px,2cqw,3px)'}});
  await c.settle();c.runTimers();await c.settle();
  assert.equal(c.state.failure,styleValidation.WEBSITE_STYLE_VALIDATION_ERROR);
  assert.equal(c.state.canResetAfterValidationFailure,true);
  assert.equal(c.state.history.present.global.title,'Kept draft');
  assert.deepEqual(c.writes,[]);
  c.state.dispatchStyle({type:'reset',scope:'global'});await c.settle();
  assert.equal(c.state.failure,'');
  assert.equal(c.state.stylesHistory.present.global.blockStyles,undefined);
  assert.equal(c.state.history.present.global.title,'Kept draft');
  c.runTimers();await c.settle();
  assert.equal(c.global.library.websiteDesignDefaults.identity.title,'Kept draft');
  assert.deepEqual(c.global.library.websiteDesignDefaults.styles,{});
  assert.deepEqual(c.writes,['global']);
 }finally{c.close();}
});

test('Image Large spacing saves and Reset styles remains undoable',async()=>{
 const c=controller();try{
  await c.settle();
  const margin='clamp(30px,7cqw,70px) 0';
  c.state.dispatchStyle({type:'block-style',scope:'global',block:'image',patch:{margin}});
  await c.settle();c.runTimers();await c.settle();
  assert.equal(c.state.failure,'');
  assert.equal(c.global.library.websiteDesignDefaults.styles.blockStyles.image.margin,margin);
  c.state.dispatchStyle({type:'reset',scope:'global'});await c.settle();
  assert.equal(c.state.stylesHistory.present.global.blockStyles,undefined);
  c.state.dispatchStyle({type:'undo'});await c.settle();
  assert.equal(c.state.stylesHistory.present.global.blockStyles.image.margin,margin);
 }finally{c.close();}
});


test('a rejected site update can reconnect and retry its retained settings draft',async()=>{
 const c=controller();try{
  await c.settle();
  c.state.dispatchStyle({type:'block-style',scope:'test',block:'image',patch:{borderWidth:'12px'}});
  await c.settle();c.first.writable=false;c.refresh();c.runTimers();await c.settle();
  assert.match(c.state.failure,/Test settings cannot be saved/);
  assert.equal(c.state.canRetrySave,true);
  assert.equal(c.state.scopeReady.test,false);
  assert.equal(c.state.stylesHistory.present.test.blockStyles.image.borderWidth,'12px');
  c.state.retrySave();await c.settle();
  assert.match(c.state.failure,/Reconnecting Test/);
  assert.equal(c.state.stylesHistory.present.test.blockStyles.image.borderWidth,'12px');
  c.first.writable=true;c.refresh();await c.settle();c.runTimers();await c.settle();
  assert.equal(c.state.failure,'');
  assert.equal(c.first.draft.websiteDesign.styles.blockStyles.image.borderWidth,'12px');
  assert.equal(c.writes.filter(value=>value==='test').length,1);
  c.state.dispatchStyle({type:'reset',scope:'test'});await c.settle();c.runTimers();await c.settle();
  assert.deepEqual(c.first.draft.websiteDesign.styles,{});
 }finally{c.close();}
});

test('disconnected scoped controls reject edits and retry keeps the original conflict baseline',async()=>{
 const c=controller();try{
  await c.settle();c.first.writable=false;c.refresh();await c.settle();
  c.state.dispatchStyle({type:'block-style',scope:'test',block:'image',patch:{borderWidth:'5px'}});await c.settle();
  assert.equal(c.state.stylesHistory.present.test.blockStyles,undefined);
  c.first.writable=true;c.refresh();await c.settle();
  c.state.dispatchStyle({type:'block-style',scope:'test',block:'image',patch:{borderWidth:'12px'}});await c.settle();
  c.first.writable=false;c.refresh();c.runTimers();await c.settle();
  c.state.retrySave();await c.settle();
  c.first.draft={...c.first.draft,websiteDesign:{...c.first.draft.websiteDesign,styles:{blockStyles:{image:{borderWidth:'30px'}}}}};
  c.first.snapshot={document:structuredClone(c.first.draft)};
  c.first.writable=true;c.refresh();await c.settle();c.runTimers();await c.settle();
  assert.match(c.state.failure,/settings changed while you were editing/);
  assert.equal(c.state.canRetrySave,false);
  assert.equal(c.state.stylesHistory.present.test.blockStyles.image.borderWidth,'12px');
  assert.equal(c.first.draft.websiteDesign.styles.blockStyles.image.borderWidth,'30px');
  assert.equal(c.writes.filter(value=>value==='test').length,0);
 }finally{c.close();}
});

test('retry recognises an earlier scope saved before a later owner rejected its mutation',async()=>{
 const c=controller();try{
  await c.settle();
  c.state.dispatch({type:'change',site:'global',patch:{title:'Saved global title'}});
  c.state.dispatchStyle({type:'block-style',scope:'test',block:'image',patch:{borderWidth:'12px'}});
  await c.settle();c.first.writable=false;c.refresh();c.runTimers();await c.settle();
  assert.match(c.state.failure,/Test settings cannot be saved/);
  assert.equal(c.global.library.websiteDesignDefaults.identity.title,'Saved global title');
  c.state.retrySave();await c.settle();c.first.writable=true;c.refresh();await c.settle();c.runTimers();await c.settle();
  assert.equal(c.state.failure,'');
  assert.equal(c.first.draft.websiteDesign.styles.blockStyles.image.borderWidth,'12px');
  assert.equal(c.writes.filter(value=>value==='global').length,1,'the acknowledged global save is not replayed');
  assert.equal(c.writes.filter(value=>value==='test').length,1);
 }finally{c.close();}
});


test('a timed-out settings save recovers only after authoritative readback confirms the retained draft',async()=>{
 const c=controller();try{
  await c.settle();c.failSave();
  c.state.dispatchStyle({type:'block-style',scope:'test',block:'image',patch:{borderWidth:'12px'}});
  await c.settle();c.runTimers();await c.settle();
  assert.match(c.state.failure,/primary Studio tab stopped responding/);
  assert.equal(c.state.canRetrySave,true);
  c.state.retrySave();await c.settle();c.runTimers();await c.settle();
  assert.match(c.state.failure,/primary Studio tab stopped responding/,'optimistic draft values cannot confirm a save');
  assert.equal(c.writes.filter(value=>value==='test').length,1);
  c.acknowledgeFirst();await c.settle();c.runTimers();await c.settle();
  assert.equal(c.state.failure,'');
  assert.equal(c.state.stylesHistory.present.test.blockStyles.image.borderWidth,'12px');
  assert.equal(c.writes.filter(value=>value==='test').length,1,'late acknowledgement must not resubmit the settings');
 }finally{c.close();}
});


test('newer settings rebase onto an older staged local draft only while the committed baseline is unchanged',async()=>{
 const c=controller();try{
  await c.settle();
  c.state.dispatchStyle({type:'block-style',scope:'test',block:'paragraph',patch:{textColumns:6}});await c.settle();
  c.first.draft={...c.first.draft,websiteDesign:{...c.first.draft.websiteDesign,styles:{blockStyles:{paragraph:{textColumns:4}}}}};
  c.refresh();await c.settle();c.runTimers();await c.settle();
  assert.equal(c.state.failure,'');
  assert.equal(c.first.snapshot.document.websiteDesign.styles.blockStyles.paragraph.textColumns,6);
  assert.equal(c.state.stylesHistory.present.test.blockStyles.paragraph.textColumns,6);
 }finally{c.close();}
});

test('settings conflict choices preserve independent fields and save through the scoped owner',async()=>{
 for(const choice of ['mine','theirs']){
  const c=controller();try{
   await c.settle();c.state.dispatch({type:'change',site:'test',patch:{title:'My title',tagline:'My tagline'}});await c.settle();
   c.first.draft={...c.first.draft,websiteDesign:{identity:{title:'Saved title',tagline:''},styles:{}}};
   c.first.snapshot={document:structuredClone(c.first.draft)};c.refresh();await c.settle();c.runTimers();await c.settle();
   assert.equal(c.state.settingsConflict.scope,'test');assert.deepEqual(c.writes,[]);
   await c.state.resolveSettingsConflict(choice);await c.settle();c.runTimers();await c.settle();
   assert.equal(c.state.failure,'');assert.equal(c.state.settingsConflict,null);
   assert.equal(c.first.draft.websiteDesign.identity.title,choice==='mine'?'My title':'Saved title');
   assert.equal(c.first.draft.websiteDesign.identity.tagline,'My tagline');assert.deepEqual(c.writes,['test']);
  }finally{c.close();}
 }
});

test('independent saved site fields merge without asking to discard a dirty draft',async()=>{
 const c=controller();try{
  await c.settle();c.state.dispatch({type:'change',site:'test',patch:{title:'My title'}});await c.settle();
  c.first.draft={...c.first.draft,websiteDesign:{identity:{title:'Test',tagline:'Saved tagline'},styles:{}}};
  c.first.snapshot={document:structuredClone(c.first.draft)};c.refresh();await c.settle();c.runTimers();await c.settle();
  assert.equal(c.state.failure,'');assert.equal(c.first.draft.websiteDesign.identity.title,'My title');assert.equal(c.first.draft.websiteDesign.identity.tagline,'Saved tagline');
 }finally{c.close();}
});

test('late receipt confirms the submitted generation before draining newer edits and independent scopes',async()=>{
 const c=controller();try{
  await c.settle();c.delaySave();
  c.state.dispatch({type:'change',site:'test',patch:{title:'Submitted'}});await c.settle();c.runTimers();await c.settle();
  c.state.dispatch({type:'change',site:'test',patch:{title:'Newer input'}});
  c.state.dispatch({type:'change',site:'test2',patch:{title:'Other draft'}});await c.settle();
  assert.equal(c.state.history.present.test.title,'Newer input');
  c.failSave();c.releaseSave();await c.settle();c.runTimers();await c.settle();
  assert.match(c.state.failure,/primary Studio tab stopped responding/);
  c.acknowledgeFirst();await c.settle();
  for(let attempt=0;attempt<6;attempt++){c.runTimers();await c.settle();}
  assert.equal(c.state.failure,'');
  assert.equal(c.first.draft.websiteDesign.identity.title,'Newer input');
  assert.equal(c.second.draft.websiteDesign.identity.title,'Other draft');
  assert.deepEqual(c.writes,['test','test','test2']);
 }finally{c.close();}
});
