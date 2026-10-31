import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { createTestSiteRendererLoader } from '../scripts/test-site-renderer-loader.mjs';
import { loadProductionModule } from './production-module.mjs';
import { createStudioHttpFixture } from './helpers/studio-http-fixture.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const watcher=()=>{const events=new EventEmitter();events.add=()=>{};return events;};
const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return{promise,resolve,reject};};

test('renderer loader retries rejected imports, deduplicates callers and retains a newer load after stale rejection',async()=>{
 const events=watcher();let calls=0;const attempts=[];
 const loader=createTestSiteRendererLoader({root,watcher:events,importRenderer:(_entry,config)=>{calls++;assert.equal(config.server.perEnvironmentStartEndDuringDev,true);const attempt=deferred();attempts.push(attempt);return attempt.promise;}});
 try{
  const first=loader.load();assert.equal(loader.load(),first);await Promise.resolve();attempts[0].reject(new Error('Transient import failure'));
  await assert.rejects(first,/Transient import failure/);
  const retry=loader.load();await Promise.resolve();attempts[1].resolve({module:{generation:1},dependencies:[]});assert.equal((await retry).generation,1);assert.equal(calls,2);
  events.emit('change',path.join(root,'app/studio/test-site/render.tsx'));
  const stale=loader.load();await Promise.resolve();
  events.emit('change',path.join(root,'app/studio/test-site/render.tsx'));
  const replacement=loader.load();await Promise.resolve();attempts[2].reject(new Error('Stale failure'));await assert.rejects(stale,/Stale failure/);
  assert.equal(loader.load(),replacement);attempts[3].resolve({module:{generation:2},dependencies:[]});assert.equal((await replacement).generation,2);assert.equal(calls,4);
 }finally{loader.close();assert.equal(events.listenerCount('change'),0);}
});

test('real Vite inline renderer imports CSS and renders a current isolated fixture',async()=>{
 const loader=createTestSiteRendererLoader({root,watcher:watcher()});
 try{
  const contracts=await loader.load();
  const templates=await loadProductionModule(new URL('../app/studio/template-model.ts',import.meta.url));
  const home={id:'temporary-home',kind:'page',title:'Renderer regression',slug:'',excerpt:'',status:'published',updatedAt:'2026-10-31T00:00:00Z',tags:[],seoTitle:'',seoDescription:'',blocks:[{id:'temporary-pullquote',type:'quote',text:'CSS renderer regression'}]};
  const fixture=contracts.testSiteCollection({format:'acm-test-site',version:3,siteId:'test',documents:[home],categories:[],bin:[],activeDocumentId:home.id,homeDocumentId:home.id,templates:templates.emptyTemplateStore(),browserImportComplete:true});
  const html=contracts.renderTestSite(fixture,'renderer-regression');
  assert.match(html,/CSS renderer regression/);assert.match(html,/is-pullquote > blockquote/);assert.match(html,/acm-test-revision/);
 }finally{loader.close();}
});

test('isolated HTTP gateway loads the CSS renderer and reads global templates without changing fixture sources',async()=>{
 const fixture=await createStudioHttpFixture();
 try{
  const response=await fetch(`${fixture.origin}/__studio/test-site`,{method:'POST',headers:{Origin:fixture.origin,'Sec-Fetch-Site':'same-origin','Content-Type':'application/json','X-Studio-Client':'codex-history'},body:JSON.stringify({siteId:'test',action:'global-read',initialise:false})});
  assert.equal(response.status,200,await response.clone().text());assert.ok((await response.json()).library);
  const sources=await Promise.all(Object.values(fixture.fixtureRoots).map(directory=>readFile(path.join(directory,'content/site.json'),'utf8')));
  assert.deepEqual(sources,fixture.initialSources);
 }finally{await fixture.close();}
});
