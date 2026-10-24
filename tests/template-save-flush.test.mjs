import test from 'node:test';
import assert from 'node:assert/strict';
import { createIsolatedModuleLoader } from './production-module.mjs';
function harness() {
 const slots=[];let cursor=0, effects=[],owner=true,allowed=true;const writes=[];
 const same=(a,b)=>a&&a.length===b.length&&a.every((v,i)=>Object.is(v,b[i]));
 const react={
  useState(v){const i=cursor++;if(!(i in slots))slots[i]=typeof v==='function'?v():v;return[slots[i],next=>slots[i]=typeof next==='function'?next(slots[i]):next];},
  useRef(v){const i=cursor++;return slots[i]??={current:v};},
  useCallback(fn,deps){const i=cursor++;if(!same(slots[i]?.deps,deps))slots[i]={deps,fn};return slots[i].fn;},
  useEffect(fn,deps){const i=cursor++;if(!same(slots[i]?.deps,deps)){effects.push(()=>{slots[i]?.cleanup?.();slots[i]={deps,cleanup:fn()};});}}
 };
 const store={sets:[],assignments:[],bin:[]};const copy=v=>structuredClone(v);
 const session={getStatus:()=> 'primary',isAvailable:()=>true,isPrimary:()=>owner,commitPrimary(snapshot){let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});writes.push({snapshot:copy(snapshot),resolve,reject});return promise;},submit(snapshot){return this.commitPrimary(snapshot);},close(){},retryConnection(){},resumeConflict(){}};
 const deps={react,'./template-reference-gate':{withTemplateReferenceWrite:fn=>fn(),assertBrowserGlobalReferences(){}},'./template-model':{copyTemplateData:copy,emptyTemplateStore:()=>copy(store),validateTemplateStore:v=>v},'./template-store':{loadTemplates:()=>copy(store),saveTemplates(){}},'./write-ownership':{studioWriteOwnership:{canWrite:()=>owner}},'./studio-sync':{createStudioSync:()=>session,createStudioTransaction:()=>({changes:[]})},'./studio-pending-save':{reconcileStudioPendingSave:(_,snapshot)=>({snapshot,pending:null,conflict:null})}};
 const { useTemplates } = createIsolatedModuleLoader({ overrides: deps, globals: { queueMicrotask:fn=>fn(),setTimeout:()=>0,clearTimeout(){} } })("app/studio/use-templates.ts");
 // eslint-disable-next-line react-hooks/rules-of-hooks -- Isolated dispatcher runs the production hook.
 const render=()=>{cursor=0;const ui=useTemplates(1,allowed);const pending=effects;effects=[];pending.forEach(fn=>fn());return ui;};
 render();render();render();
 return {render,writes,loseOwnership(){owner=false;allowed=false;},session};
}
test('browser menu flush awaits its owning acknowledgement before navigation can leave',async()=>{
 const h=harness();h.render().commit(s=>({...s,sets:[{id:'menu'}]}));let done=false;
 const flushing=h.render().flush().then(()=>done=true);await Promise.resolve();assert.equal(done,false);assert.equal(h.writes.length,1);
 h.writes[0].resolve();await flushing;assert.equal(done,true);
});
test('a clean read-only template session can leave without attempting a write',async()=>{
 const h=harness();h.loseOwnership();
 await h.render().flush();
 assert.equal(h.writes.length,0);
});
test('duplicate no-op acknowledgements cannot skip an earlier pending menu write',async()=>{
 const h=harness();h.render().commit(s=>({...s,sets:[{id:'menu'}]}));h.render().commit(s=>s);
 h.writes[1].resolve();let done=false;const flushing=h.render().flush().then(()=>done=true);await Promise.resolve();assert.equal(done,false);
 h.writes[0].resolve();await flushing;assert.equal(done,true);
});
test('failed acknowledgement rejects flush and retains the menu draft',async()=>{
 const h=harness();h.render().commit(s=>({...s,sets:[{id:'kept'}]}));const flushing=h.render().flush();h.writes[0].reject(new Error('Disk failure'));
 await assert.rejects(flushing,/Disk failure/);assert.equal(h.render().store.sets[0].id,'kept');
});
test('a changed menu or denied owner prevents claiming an old save as complete',async()=>{
 const h=harness();h.render().commit(s=>({...s,sets:[{id:'first'}]}));const flushing=h.render().flush();h.render().commit(s=>({...s,sets:[{id:'second'}]}));h.writes[0].resolve();
 await assert.rejects(flushing,/connection or menu changed/);h.writes[1].resolve();h.loseOwnership();await assert.rejects(h.render().flush(),/saving is unavailable/);
});

test('a failed acknowledgement can be retried successfully in the same connection',async()=>{
 const h=harness();h.render().commit(s=>({...s,sets:[{id:'kept'}]}));const first=h.render().flush();h.writes[0].reject(new Error('Temporary failure'));
 await assert.rejects(first,/Temporary failure/);await Promise.resolve();
 const retry=h.render().flush();assert.equal(h.writes.length,2);h.writes[1].resolve();await retry;
 assert.equal(h.render().store.sets[0].id,'kept');
});
