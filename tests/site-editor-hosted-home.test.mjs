import { createHostModuleEvaluator } from "./production-module.mjs";
import test from 'node:test';import assert from 'node:assert/strict';
import { loadProductionModule } from './production-module.mjs';
const {hostedHomeCanMutate,authoredHome,hostedHomeHref,hostedHomeProtocol,validHostedHomeMessage,flushHostedHome,hostedHomeTemplateTarget}=await loadProductionModule(new URL('../app/studio/site-editor/hosted-home-contract.ts',import.meta.url));
const {testSiteCollection}=await loadProductionModule(new URL('../app/studio/test-site/contract.ts',import.meta.url));
function site(id='test'){const source=testSiteCollection({format:'acm-test-site',version:2,siteId:id,document:{id:'home-renamed',kind:'page',title:'Draft home',slug:'',excerpt:'',status:'draft',updatedAt:'2026-10-22T00:00:00.000Z',tags:[],seoTitle:'',seoDescription:'',blocks:[]}});source.siteId=id;return source;}
test('home selection uses current authored home ID, including an empty page, and rejects missing or mismatched sources',()=>{
 for(const id of ['test','test2']){const source=site(id);assert.equal(authoredHome(source,id).id,'home-renamed');assert.equal(authoredHome(source,id).blocks.length,0);assert.equal(hostedHomeHref(id),`/studio?site=${id}&siteEditorHome=1`);source.homeDocumentId='missing';assert.throws(()=>authoredHome(source,id),/unavailable/);}
 assert.throws(()=>authoredHome(site(),'test2'),/another site/);
});
test('bridge rejects other origins, sources and site identities',()=>{
 const source={};const data={protocol:hostedHomeProtocol,site:'test',action:'prepare-leave',requestId:'request-1'};
 const valid={origin:'http://localhost:3010',source,data};assert.equal(Boolean(validHostedHomeMessage(valid,source,valid.origin,'test')),true);
 for(const changed of [{source:{}},{origin:'https://example.com'},{data:{...data,site:'test2'}},{data:{...data,site:'other'}},{data:{...data,protocol:'other'}},{data:null}])assert.equal(Boolean(validHostedHomeMessage({...valid,...changed},source,valid.origin,'test')),false);
});
test('leave saves draft only after code/navigation approval, holds editing paused until unmount and resumes on failure',async()=>{
 for(const failure of ['code','navigation','navigation-throws','flush','reported',null]){
  const calls=[];let paused=false;
  const accepted=await flushHostedHome({pause(value){paused=value;calls.push(['pause',value]);},discardCode(){calls.push('code');return failure!=='code';},async prepareNavigation(){calls.push('navigation');if(failure==='navigation-throws')throw new Error('fail');return failure!=='navigation';},async flush(){assert.equal(paused,true);calls.push('flush');if(failure==='flush')throw new Error('save failed');},failed:()=>failure==='reported'});
  assert.equal(accepted,failure===null);assert.equal(paused,failure===null);
  if(['code','navigation','navigation-throws'].includes(failure))assert.equal(calls.includes('flush'),false);
 }
});


test('hosted preview and preparing/prepared editors cannot mutate hidden history',()=>{
 assert.equal(hostedHomeCanMutate(false,false,false,false),true);
 assert.equal(hostedHomeCanMutate(true,true,false,false),true);
 for(const [editing,busy,prepared] of [[false,false,false],[true,true,false],[true,false,true],[false,true,true]])assert.equal(hostedHomeCanMutate(true,editing,busy,prepared),false);
});

test('Edit Header resolves a fixture-rendered shared part to its global original and rejects unrelated targets',()=>{
 const library={templates:{sets:[{id:'global-set',templates:[],parts:[{id:'global-header',kind:'header'}]}]},migrations:{
  test:{bindings:[],bases:[]},
  test2:{bindings:[{setId:'fixture-set',globalSetId:'global-set',ids:{'global-header':'fixture-header'}}],bases:[]},
 }};
 assert.deepEqual(hostedHomeTemplateTarget(library,'test2','fixture-set','fixture-header'),{setId:'global-set',targetId:'global-header',scope:'global'});
 assert.equal(hostedHomeTemplateTarget(library,'test2','fixture-set','unrelated-part'),null);
 assert.equal(hostedHomeTemplateTarget(library,'test2','missing-set','global-header'),null);
 assert.equal(hostedHomeTemplateTarget(null,'test2','fixture-set','fixture-header'),null);
});

test('parent frame correlates exact child acknowledgements and opens templates only after a saved leave',async()=>{
 const {readFileSync}=await import('node:fs');
 const source=readFileSync(new URL('../app/studio/site-editor/site-home-frame.tsx',import.meta.url),'utf8');
 const code=(source);
 const listeners=new Map();const posted=[];const opened=[];let autoAccept=null;const child={postMessage(data,origin){posted.push({data,origin});if(data.action==='prepare-leave'&&autoAccept!==null)queueMicrotask(()=>listeners.get('message')({source:child,origin,data:{protocol:hostedHomeProtocol,site:'test',action:'leave-result',requestId:data.requestId,accepted:autoAccept}}));}};const handle={current:null};let frameRef;
 const react={useRef:()=>({current:null}),useState:initial=>[initial,()=>{}],useCallback:callback=>callback,useImperativeHandle(ref,create){ref.current=create();},useEffect(effect){effect();}};
 const jsx=(type,props)=>{if(type==='iframe')frameRef=props.ref;return{type,props};};
 const contract={hostedHomeHref,hostedHomeProtocol,validHostedHomeMessage};
 const require=name=>name==='react'?react:name==='react/jsx-runtime'?{jsx,jsxs:jsx}:contract;
 const oldWindow=globalThis.window;globalThis.window={location:{origin:'http://localhost:3010'},addEventListener(name,listener){listeners.set(name,listener);},removeEventListener(){}};
 try{
  const {SiteHomeFrame}=createHostModuleEvaluator(['require', 'exports'], code+'\nreturn exports;')(require,{});
  SiteHomeFrame({site:'test',handleRef:handle,onEditing(){},onOpenTemplate:(site,target)=>opened.push({site,target})});frameRef.current={contentWindow:child};
  const message=data=>listeners.get('message')({source:child,origin:window.location.origin,data:{protocol:hostedHomeProtocol,site:'test',...data}});
  assert.equal(await handle.current.prepareLeave(),false);
  message({action:'ready'});
  const pending=handle.current.prepareLeave();assert.equal(posted.length,1);assert.equal(posted[0].origin,window.location.origin);
  message({action:'leave-result',requestId:'wrong',accepted:true});
  message({action:'leave-result',requestId:posted[0].data.requestId,accepted:false});
  assert.equal(await pending,false);
  autoAccept=false;
  message({action:'open-template',setId:'shared-set',targetId:'shared-header'});
  await new Promise(resolve=>setTimeout(resolve,0));
  assert.equal(opened.length,0);
  autoAccept=true;
  message({action:'open-template',setId:'shared-set',targetId:'shared-header'});
  await new Promise(resolve=>setTimeout(resolve,0));
  assert.deepEqual(opened,[{site:'test',target:{setId:'shared-set',targetId:'shared-header',scope:'global'}}]);
  message({action:'open-template',setId:'',targetId:'shared-header'});
  await new Promise(resolve=>setTimeout(resolve,0));
  assert.equal(opened.length,1);
 }finally{globalThis.window=oldWindow;}
});
