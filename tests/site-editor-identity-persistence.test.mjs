import test from 'node:test';
import assert from 'node:assert/strict';
import {loadProductionModule} from './production-module.mjs';
const {createIdentityRepository,validateIdentitySnapshot,IdentityStorageError}=await loadProductionModule(new URL('../app/studio/site-editor/identity-repository.ts',import.meta.url));
const {createIdentityPreview,identityPreviewReducer}=await loadProductionModule(new URL('../app/studio/site-editor/identity-preview-state.ts',import.meta.url));
const ownership={canWrite:()=>true,write:operation=>operation()};
function fixture(){
 let data=null;let writes=0;
 return {store:{async read(){return data===null?null:validateIdentitySnapshot(structuredClone(data));},async compareAndSet(revision,values){if((data?.revision??0)!==revision)throw new IdentityStorageError('conflict');data=structuredClone(validateIdentitySnapshot({version:1,revision:revision+1,values}));writes++;return data;}},get data(){return data;},set data(value){data=value;},get writes(){return writes;}};
}
test('identity repository hydrates without a write and round trips all scopes, empty text, Hide and Blob bytes',async()=>{
 const f=fixture(),repo=createIdentityRepository({store:f.store,ownership});
 await assert.rejects(repo.save(createIdentityPreview().present),/unavailable/);
 const values=await repo.load();assert.equal(f.writes,0);
 const image={id:'image',name:'Logo',altText:'Description',blob:new Blob(['bytes'],{type:'image/png'})};
 values.global.title='Global brand';values.global.logo=image;values.test={title:'',tagline:'',hidden:{title:true},icon:image};values.test2={tagline:'Other'};
 await repo.save(values);
 const loaded=await createIdentityRepository({store:f.store,ownership}).load();
 assert.equal(loaded.test.title,'');assert.equal(loaded.test.hidden.title,true);assert.equal(loaded.test2.tagline,'Other');assert.equal(await loaded.global.logo.blob.text(),'bytes');
 const reset=identityPreviewReducer({past:[],present:loaded,future:[]},{type:'reset-all',site:'global'});assert.equal(reset.present.global.title,'Site Title');assert.equal(reset.present.test.title,'');
});
test('fresh reads and CAS reject stale tabs without overwriting their saved data or draft',async()=>{
 const f=fixture(),a=createIdentityRepository({store:f.store,ownership}),b=createIdentityRepository({store:f.store,ownership});
 const av=await a.load(),bv=await b.load();av.test.title='First';bv.test.title='Stale';await a.save(av);
 await assert.rejects(b.save(bv),/conflict/);await assert.rejects(b.save(bv),/conflict/);
 assert.equal(f.data.values.test.title,'First');assert.equal(bv.test.title,'Stale');assert.equal(f.writes,1);
});
test('bounded saving uses the existing lock and denied or absent ownership never writes',async()=>{
 const f=fixture();const names=[];
 const locked=createIdentityRepository({store:f.store,ownership:{canWrite:()=>false},locks:{async request(name,options,callback){names.push([name,options]);return callback({name});}}});
 await locked.load();await locked.save(createIdentityPreview().present);assert.equal(f.writes,1);assert.equal(names[0][0],'acm-studio-writer-v1');assert.equal(names[0][1].ifAvailable,true);
 for(const locks of [null,{request:async(_name,_options,callback)=>callback(null)}]){
  const blocked=createIdentityRepository({store:f.store,ownership:{canWrite:()=>false},locks});await blocked.load();await assert.rejects(blocked.save(createIdentityPreview().present),/blocked|unavailable/);assert.equal(f.writes,1);
 }
});
test('corrupt data, unsupported versions and invalid images fail without replacement',async()=>{
 for(const data of [{version:2,revision:1,values:createIdentityPreview().present},{version:1,revision:1,values:{...createIdentityPreview().present,test:{title:42}}},{version:1,revision:1,values:{...createIdentityPreview().present,test:{logo:{id:'bad',name:'Bad',altText:'',blob:new Blob(['text'],{type:'text/plain'})}}}}]){
  const f=fixture();f.data=data;const repo=createIdentityRepository({store:f.store,ownership});await assert.rejects(repo.load(),/corrupt/);await assert.rejects(repo.save(createIdentityPreview().present));assert.equal(f.writes,0);
 }
});
test('write failure remains explicit and does not silently retry queued drafts',async()=>{
 let writes=0;const repo=createIdentityRepository({ownership,store:{read:async()=>null,compareAndSet:async()=>{writes++;throw new Error('quota');}}});await repo.load();
 await assert.rejects(repo.save(createIdentityPreview().present),/quota/);await assert.rejects(repo.save(createIdentityPreview().present),/quota/);assert.equal(writes,1);
});

test('owning persistence hook installs saved values before saving and reports failures without replacing drafts',async()=>{
 const {readFileSync}=await import('node:fs');const ts=(await import('typescript')).default;
 const source=readFileSync(new URL('../app/studio/site-editor/use-identity-persistence.ts',import.meta.url),'utf8');
 const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const saved=createIdentityPreview().present;saved.test.title='Restored';
 let resolveLoad;let writes=0;let beforeUnload;const slots=[];let cursor=0;let effects=[];const previous=[];
 const react={useState(initial){const id=cursor++;if(!(id in slots))slots[id]=initial;return[slots[id],value=>{slots[id]=value;}];},useRef(initial){const id=cursor++;slots[id]??={current:initial};return slots[id];},useEffect(effect,deps){const id=cursor++;if(!previous[id]||deps.some((dep,index)=>dep!==previous[id][index])){previous[id]=deps;effects.push(effect);}}};
 const repo={load:()=>new Promise(resolve=>{resolveLoad=resolve;}),save:async()=>{writes++;throw new IdentityStorageError('conflict');}};
 const require=name=>name==='react'?react:{createIdentityRepository:()=>repo,createIdentityStore:()=>({}),IdentityStorageError};
 const {useIdentityPersistence}=new Function('require','exports',code+'\nreturn exports;')(require,{});
 const oldWindow=globalThis.window;globalThis.window={indexedDB:{},addEventListener(name,listener){if(name==='beforeunload')beforeUnload=listener;},removeEventListener(){}};
 let values=createIdentityPreview().present;
 const dispatch=action=>{assert.equal(action.type,'hydrate');values=action.values;};
 const render=()=>{cursor=0;const result=useIdentityPersistence(values,dispatch);const run=effects;effects=[];run.forEach(effect=>effect());return result;};
 try{
  assert.equal(render().ready,false);assert.equal(writes,0);
  let prevented=false;beforeUnload({preventDefault(){prevented=true;}});assert.equal(prevented,false);
  resolveLoad(saved);await new Promise(resolve=>setImmediate(resolve));
  assert.equal(render().ready,true);assert.equal(values.test.title,'Restored');assert.equal(writes,0);
  values={...values,test:{title:'Draft'}};render();await new Promise(resolve=>setImmediate(resolve));
  assert.match(render().status,/another tab changed/);assert.equal(values.test.title,'Draft');assert.equal(writes,1);
  beforeUnload({preventDefault(){prevented=true;}});assert.equal(prevented,true);
 }finally{globalThis.window=oldWindow;}
});

test('late upgrade after a blocked open cannot create schema outside the released lock',async()=>{
 const {createIdentityStore}=await loadProductionModule(new URL('../app/studio/site-editor/identity-repository.ts',import.meta.url));
 let request;let created=0;let aborted=0;let closed=0;
 const store=createIdentityStore({open(){request={result:{createObjectStore(){created++;},close(){closed++;}},transaction:{abort(){aborted++;}}};return request;}});
 const saving=store.compareAndSet(0,createIdentityPreview().present);
 request.onblocked();await assert.rejects(saving,/blocked/);
 request.onupgradeneeded();request.onsuccess();
 assert.equal(created,0);assert.equal(aborted,1);assert.equal(closed,1);
});
