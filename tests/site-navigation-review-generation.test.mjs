import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHostModuleEvaluator } from './production-module.mjs';

test('review acknowledgement leaves newer navigation changes staged', () => {
  const source = readFileSync(new URL('../app/studio/test-site/use-test-site-context.ts', import.meta.url), 'utf8');
  const slots=[]; let cursor=0;
  const react={useState(initial){const i=cursor++;if(!(i in slots))slots[i]=initial;return[slots[i],value=>{slots[i]=typeof value==='function'?value(slots[i]):value;}];},useRef(initial){const i=cursor++;return slots[i]??={current:initial};}};
  const require=name=>name==='react'?react:name.endsWith('test-site/contract')||name==='./contract'?{testSiteCollection:value=>value,testSiteWorkspace:()=>({version:52,documents:[],activeDocumentId:'',categories:[],bin:[]})}:name.endsWith('template-model')?{emptyTemplateStore:()=>({sets:[],assignments:{},bin:[]}),copyTemplateData:structuredClone}:new Proxy({}, {get:(_,key)=>key});
  const {useTestSiteContext:renderSiteContext}=createHostModuleEvaluator(['require','exports'],`${source}\nreturn exports;`)(require,{});
  let current={globalTemplates:[],navigationMenus:[{id:'menu',name:'Original',links:[]}],defaultNavigationMenuId:'menu',navigationAssignments:[],siteNavigation:{setId:'navigation'},homeDocumentId:'home',templates:{sets:[{id:'navigation',navigation:[]}],assignments:{},bin:[]}};
  const deferred=[];
  const site={siteId:'test',draft:current,writable:true,deferAutoSave:value=>deferred.push(value),updateDraft(update){current=update(structuredClone(current));site.draft=current;return true;}};
  const render=()=>{cursor=0;return renderSiteContext(site,{exclusiveWritable:true});};
  let context=render();
  assert.equal(context.commitNavigationMenus(value=>({...value,menus:value.menus.map(menu=>({...menu,name:'First'}))})),true);
  context=render();const reviewed=context.getNavigationReviewGeneration();
  assert.equal(context.commitNavigationMenus(value=>({...value,menus:value.menus.map(menu=>({...menu,name:'Second'}))})),true);
  context=render();context.finishNavigationReview(reviewed);
  assert.equal(context.navigationReviewPending,true);assert.deepEqual(deferred,[true,true]);
  context.finishNavigationReview(context.getNavigationReviewGeneration());
  context=render();assert.equal(context.navigationReviewPending,false);assert.deepEqual(deferred,[true,true,false]);
});
