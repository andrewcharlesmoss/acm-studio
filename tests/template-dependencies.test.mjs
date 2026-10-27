import { evaluateProductionModule } from "./production-module.mjs";
import test from 'node:test';

import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { loadViteModule as runnerImport } from './production-module.mjs';
import { mkdtemp, realpath, rm, readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createGlobalTemplateStore } from '../scripts/global-template-store.mjs';
import { createTemplateDependencyGate } from '../scripts/template-dependency-gate.mjs';
const options = { environments: { inline: { resolve: { noExternal: [/^@acm\//] } } } };
const {module: model} = await runnerImport('app/studio/template-model.ts', options);
const {module: deps} = await runnerImport('app/studio/template-dependencies.ts', options);
const {module: bin} = await runnerImport('app/studio/global-template-bin.ts', options);
const {module: contract} = await runnerImport('app/studio/global-template-contract.ts', options);
const {module: deletion} = await runnerImport('app/studio/global-template-deletion.ts', options);
const {module: fixtures} = await runnerImport('app/studio/test-site/template-dependencies.ts', options);
const {module: fixtureContract} = await runnerImport('app/studio/test-site/contract.ts', options);
const {module: gate} = await runnerImport('app/studio/template-reference-gate.ts', options);
function fixture() {
 let set = model.createTemplateSet('Shared');
 let post = set.templates.find(t=>t.kind==='post');
 const replacement = {...structuredClone(post),id:'replacement',name:'Replacement',isDefault:false}; model.visitTemplateNodes(replacement.nodes,n=>n.id=model.templateId()); set.templates.push(replacement); set = model.validateTemplateSet(set); post = set.templates.find(t=>t.kind==='post');
 const templates = {...model.emptyTemplateStore(),sets:[set],assignments:[{documentId:'post',kind:'post',setId:set.id,templateId:post.id}]};
 const document={id:'post',kind:'post',title:'Post',slug:'post',status:'draft',updatedAt:'2026-10-14T00:00:00.000Z',excerpt:'',blocks:[],tags:[],author:'Andrew',category:'',seoTitle:'',seoDescription:''};
 const workspace={version:26,documents:[document],categories:[],activeDocumentId:document.id,bin:[]};
 const library={format:'acm-global-templates',version:2,templates:{...structuredClone(templates),assignments:[]},migrations:{test:{bindings:[],bases:[]},test2:{bindings:[],bases:[]}}};
 const target={setId:set.id,entryId:post.id};
 const source={owner:'drafts',workspace,templates,bindings:deps.dependencyBindings('drafts',templates,library)};
 const sites = Object.fromEntries(['test','test2'].map(siteId=>[siteId,{format:'acm-test-site',version:8,siteId,documents:[{...document,id:'home',kind:'page'}],categories:[],bin:[],activeDocumentId:'home',homeDocumentId:'home',browserImportComplete:true,templates:{...structuredClone(templates),assignments:[]},globalTemplates:[],publications:[],siteNavigation:{setId:set.id,partId:set.parts.find(p=>p.kind==='header').id}}]));
 return {set,post,replacement,templates,document,workspace,library,target,source,sites};
}
test('dependencies distinguish authored, published, binned, default and recovery uses',()=>{
 const f=fixture();f.source.publications=[{document:f.document,assignment:f.templates.assignments[0]}];f.workspace.bin=[{id:'binned',document:{...f.document,id:'old'},assignment:{...f.templates.assignments[0],documentId:'old'},deletedAt:f.document.updatedAt}];f.templates.defaultTemplateIds={post:f.post.id};
 const rows=deps.collectGlobalTemplateDependencies(f.library,f.target,[f.source]);
 assert.deepEqual(rows.map(r=>r.kind),['document','bin','publication','default','recovery']);assert.equal(rows.filter(r=>r.blocking).length,4);
 assert.equal(rows.at(-1).manageable,false);
});
test('replacement updates all selected assignments and preserves bodies, status and recovery artwork',()=>{
 const f=fixture();f.source.publications=[{document:f.document,assignment:f.templates.assignments[0]}];f.workspace.bin=[{id:'binned',document:{...f.document,id:'old'},assignment:{...f.templates.assignments[0],documentId:'old'},deletedAt:f.document.updatedAt}];f.templates.defaultTemplateIds={post:f.post.id};
 const before=JSON.stringify(f.source);const rows=deps.collectOwnerTemplateDependencies(f.source,f.target).filter(r=>r.manageable);
 const changed=deps.changeTemplateDependencies(f.source,f.library,f.target,rows,{setId:f.set.id,entryId:f.replacement.id});
 assert.equal(changed.templates.assignments[0].templateId,'replacement');assert.equal(changed.workspace.bin[0].assignment.templateId,'replacement');assert.equal(changed.publications[0].assignment.templateId,'replacement');assert.equal(changed.templates.defaultTemplateIds.post,'replacement');
 assert.deepEqual(changed.workspace.documents,f.workspace.documents);assert.deepEqual(changed.templates.sets,f.templates.sets);assert.equal(JSON.stringify(f.source),before);
});
test('detach freezes inherited metadata and removes only selected assignments',()=>{
 const f=fixture();f.post.defaults={author:'Inherited',category:'News',tags:['shared']};f.library.templates.sets[0].templates.find(t=>t.id===f.post.id).defaults=f.post.defaults;
 f.document.templateOverrides={author:false,category:false,tags:false,parentPageId:false};
 const rows=deps.collectOwnerTemplateDependencies(f.source,f.target).filter(r=>r.manageable);
 const changed=deps.changeTemplateDependencies(f.source,f.library,f.target,rows,null);
 assert.equal(changed.templates.assignments.length,0);assert.equal(changed.workspace.documents[0].author,'Inherited');assert.deepEqual(changed.workspace.documents[0].tags,['shared']);assert.deepEqual(changed.workspace.documents[0].blocks,f.document.blocks);assert.equal(changed.workspace.documents[0].status,'draft');assert.equal(changed.workspace.documents[0].templateOverrides.author,true);
});
test('stale selection and wrong replacement kind fail without mutation',()=>{
 const f=fixture();const rows=deps.collectOwnerTemplateDependencies(f.source,f.target).filter(r=>r.manageable);const before=JSON.stringify(f.source);
 assert.throws(()=>deps.changeTemplateDependencies(f.source,f.library,f.target,rows,{setId:f.set.id,entryId:f.set.templates.find(t=>t.kind==='page').id}),/same kind/);
 f.templates.assignments=[];assert.throws(()=>deps.changeTemplateDependencies(f.source,f.library,f.target,rows,null),/changed/);f.templates.assignments=[{documentId:'post',kind:'post',setId:f.set.id,templateId:f.post.id}];assert.equal(JSON.stringify(f.source),before);
});
test('alias ancestry is matched by ID and canonical references remain visible',()=>{
 const f=fixture();const local=structuredClone(f.templates);local.sets[0].id='local';local.sets[0].templates.find(t=>t.id===f.post.id).id='alias';local.assignments[0]={...local.assignments[0],setId:'local',templateId:'alias'};
 const source={...f.source,owner:'test',templates:local,bindings:[{setId:'local',globalSetId:f.set.id,ids:{[f.post.id]:'alias'},overrides:[]}]};
 assert.equal(deps.collectOwnerTemplateDependencies(source,f.target).filter(r=>r.blocking).length,1);
 source.templates.assignments[0]=f.templates.assignments[0];assert.equal(deps.collectOwnerTemplateDependencies(source,f.target).filter(r=>r.blocking).length,1);
 const part=f.set.parts[0];source.siteNavigation={setId:f.set.id,partId:part.id};assert.equal(deps.collectOwnerTemplateDependencies(source,{setId:f.set.id,entryId:part.id}).some(r=>r.kind==='navigation'&&r.blocking),true);
});
test('unused global entries move to Bin and restore exact IDs; v1 stays readable',()=>{
 const f=fixture();const moved=bin.moveGlobalTemplateToBin(f.library.templates,f.target,'bin','2026-10-14T00:00:00.000Z');
 assert.doesNotThrow(()=>contract.validateGlobalTemplateLibrary({...f.library,templates:moved}));assert.throws(()=>contract.validateGlobalTemplateLibrary({...f.library,version:1,templates:moved}),/Bin/);
 assert.doesNotThrow(()=>bin.assertRecoverableGlobalTransition(f.library.templates,moved));assert.equal(contract.globalTemplateChangeCanUndo(f.library.templates,moved),true);
 const restored=bin.restoreGlobalTemplate(moved,'bin');assert.deepEqual(restored.sets[0].templates.find(t=>t.id===f.post.id),f.post);assert.equal(restored.bin.length,0);assert.equal(contract.globalTemplateChangeCanUndo(moved,restored),true);
 assert.throws(()=>bin.assertRecoverableGlobalTransition(moved,{...moved,bin:moved.bin.map(item=>({...item,entry:{...item.entry,name:'Destroyed'}}))}),/recovery payload/);
 assert.throws(()=>bin.assertRecoverableGlobalTransition(moved,{...moved,bin:[]}),/permanent|recover|restor/i);
 assert.throws(()=>bin.restoreGlobalTemplate({...moved,sets:f.library.templates.sets},'bin'),/already|collision/i);
});
test('shared-part references block removal and structural rows cannot be bulk detached',()=>{
 const f=fixture();const part=f.set.parts[0];f.library.templates.sets[0].templates[0].nodes.push({id:'ref',type:'part',partId:part.id});
 const target={setId:f.set.id,entryId:part.id};assert.equal(deps.collectGlobalTemplateDependencies(f.library,target,[]).filter(r=>r.kind==='part').length>0,true);
 assert.throws(()=>bin.moveGlobalTemplateToBin(f.library.templates,target),/referenc/i);
});
test('global removal requires browser proof and rejects retained active assignments',()=>{
 const f=fixture();const moved=bin.moveGlobalTemplateToBin(f.library.templates,f.target,'bin');
 assert.throws(()=>deletion.assertGlobalTemplateRemoval(f.library,moved,f.sites,undefined),/browser|Drafts/i);
 assert.throws(()=>deletion.assertGlobalTemplateRemoval(f.library,moved,f.sites,deps.ownerTemplateReferences(f.source)),/assign|depend/i);
 assert.doesNotThrow(()=>deletion.assertGlobalTemplateRemoval(f.library,moved,f.sites,[]));
});
test('stale browser writes cannot reintroduce removed templates while removal is pending',async()=>{
 const f=fixture();gate.installGlobalReferenceLibrary(f.library);const moved=bin.moveGlobalTemplateToBin(f.library.templates,f.target,'bin');gate.protectGlobalReferenceRemoval(moved);
 assert.throws(()=>gate.assertBrowserGlobalReferences(f.templates),/unavailable/);
 const workspace={...f.workspace,bin:[{assignment:f.templates.assignments[0]}]};assert.throws(()=>gate.assertBrowserWorkspaceGlobalReferences(workspace,()=>f.templates),/unavailable/);
 gate.installGlobalReferenceLibrary({...f.library,templates:moved});assert.throws(()=>gate.assertBrowserGlobalReferences(f.templates),/unavailable/);
 gate.installGlobalReferenceLibrary(f.library);assert.doesNotThrow(()=>gate.assertBrowserGlobalReferences(f.templates));
});
test('server mutation gate serialises racing save/removal and recovers after failed saves',async()=>{
 const gate=createTemplateDependencyGate();const order=[];let release;
 const first=gate.run(async()=>{order.push('save');await new Promise(r=>release=r);throw new Error('CAS');});
 const second=gate.run(async()=>{order.push('delete');});await Promise.resolve();assert.deepEqual(order,['save']);release();await assert.rejects(first,/CAS/);await second;assert.deepEqual(order,['save','delete']);
});

test('fixture publication detach omits the assignment key and preserves captured body/status',()=>{
 const f=fixture();const site=f.sites.test;site.documents.push(f.document);site.templates.assignments=[f.templates.assignments[0]];site.publications=[{document:{...f.document,status:'published',excerpt:'Captured body'},assignment:f.templates.assignments[0]}];
 assert.equal(fixtureContract.validTestSiteDocument(site),true);const source=fixtures.fixtureTemplateDependencySnapshot(site,f.library);const rows=deps.collectOwnerTemplateDependencies(source,f.target).filter(r=>r.kind==='publication');
 const changed=fixtures.changeFixtureTemplateDependencies(site,f.library,f.target,rows,null);assert.equal(fixtureContract.validTestSiteDocument(changed),true);assert.equal(Object.hasOwn(changed.publications[0],'assignment'),false);assert.equal(changed.publications[0].document.excerpt,'Captured body');assert.equal(changed.publications[0].document.status,'published');assert.deepEqual(changed.documents,site.documents);assert.deepEqual(changed.templates.assignments,site.templates.assignments);
});
test('fixture active/Bin/publication/default uses replace and detach through validated aggregate',()=>{
 const f=fixture();const site=f.sites.test;site.documents.push(f.document);site.templates.assignments=[f.templates.assignments[0]];site.templates.defaultTemplateIds={post:f.post.id};site.publications=[{document:{...f.document,status:'published'},assignment:f.templates.assignments[0]}];site.bin=[{id:'binned',deletedAt:f.document.updatedAt,document:{...f.document,id:'old',slug:'old'},assignment:{...f.templates.assignments[0],documentId:'old'}}];
 const rows=deps.collectOwnerTemplateDependencies(fixtures.fixtureTemplateDependencySnapshot(site,f.library),f.target).filter(r=>r.manageable);const changed=fixtures.changeFixtureTemplateDependencies(site,f.library,f.target,rows,null);assert.equal(fixtureContract.validTestSiteDocument(changed),true);assert.equal(changed.templates.assignments.length,0);assert.equal(changed.templates.defaultTemplateIds.post,undefined);assert.equal(changed.bin[0].assignment,undefined);assert.equal(changed.publications[0].assignment,undefined);
});
test('production global gateway rejects dependency removal, saves recoverable moves and preserves source on stale/payload failures',async()=>{
 const f=fixture();const root=await realpath(await mkdtemp(path.join(os.tmpdir(),'acm-dependency-gateway-')));const store=createGlobalTemplateStore({root,loadContracts:async()=>({...contract,...deletion,createGlobalTemplateLibrary:()=>f.library}),readSites:async()=>f.sites});
 try {
  const initial=await store.load(true);const globalPost=initial.library.templates.sets.flatMap(s=>s.templates).find(t=>t.id===f.post.id);const set=initial.library.templates.sets.find(s=>s.templates.includes(globalPost));const target={setId:set.id,entryId:globalPost.id};const moved=bin.moveGlobalTemplateToBin(initial.library.templates,target,'bin');
  await assert.rejects(store.save(initial.revision,moved,async()=>{},deps.ownerTemplateReferences(f.source)),/Drafts/);
  f.sites.test.templates.assignments=[f.templates.assignments[0]];f.sites.test.documents.push(f.document);await assert.rejects(store.save(initial.revision,moved,async()=>{},[]),/dependencies/);f.sites.test.templates.assignments=[];
  const saved=await store.save(initial.revision,moved,async()=>{},[]);assert.equal(saved.library.version,6);assert.equal(saved.library.templates.bin.length,1);const raw=await readFile(path.join(root,'work/global-template-library.json'),'utf8');
  await assert.rejects(store.save(initial.revision,initial.library.templates,async()=>{},[]),e=>e.status===409);
  const corrupted=structuredClone(saved.library.templates);corrupted.bin[0].entry.name='Overwrite';await assert.rejects(store.save(saved.revision,corrupted,async()=>{},[]),/recovery payload/);assert.equal(await readFile(path.join(root,'work/global-template-library.json'),'utf8'),raw);
  const restored=await store.save(saved.revision,bin.restoreGlobalTemplate(saved.library.templates,'bin'),async()=>{},[]);assert.equal(restored.library.templates.bin.length,0);
 } finally {await store.close();await rm(root,{recursive:true,force:true});}
});

test('fixture reference validation rejects an old published assignment after global removal',()=>{
 const f=fixture();f.sites.test.documents.push(f.document);f.sites.test.publications=[{document:{...f.document,status:'published'},assignment:f.templates.assignments[0]}];
 const moved=bin.moveGlobalTemplateToBin(f.library.templates,f.target,'bin');const library={...f.library,templates:moved};const snapshot=fixtures.fixtureTemplateDependencySnapshot(f.sites.test,library);
 assert.throws(()=>deps.assertActiveGlobalReferences(library,deps.ownerTemplateReferences(snapshot),snapshot.bindings),/unavailable/);
});

function controllerFixture({failTest=false,failDraftAssignments=false}={}) {
 const f=fixture();const reports=[];let test2Writes=0;
 for(const site of Object.values(f.sites)){site.documents.push(structuredClone(f.document));site.templates.assignments=structuredClone(f.templates.assignments);}
 const browser={ready:true,writable:true,loadError:null,workspace:f.workspace,flush:async()=>{},commit(update){this.workspace=update(this.workspace);return true;}};
 const browserTemplates={ready:true,writable:true,error:null,store:f.templates,flush:async()=>{},commit(update){if(failDraftAssignments)return false;this.store=update(this.store);return true;}};
 const site=(draft,second=false)=>({draft,writable:true,failure:null,flush:async()=>{if(failTest&&!second)throw new Error('CAS rejected');},updateDraft(update){if(second)test2Writes++;this.draft=update(this.draft);return true;}});
 const firstSite=site(f.sites.test),secondSite=site(f.sites.test2,true),globals={library:f.library,initialised:true,session:{store:f.library.templates,error:null}};
 const exports={};const react={useState:v=>[v,()=>{}],useRef:v=>({current:v}),useLayoutEffect:fn=>fn()};
 const modules={'react':react,'react/jsx-runtime':{jsx:(type,props)=>({type,props})},'./template-dependency-dialog':{TemplateDependencyDialog:()=>null},'./template-dependencies':deps,'./global-template-bin':bin,'./test-site/template-dependencies':fixtures};
 const source=(readFileSync(new URL('../app/studio/use-template-dependencies.tsx',import.meta.url),'utf8'));
 evaluateProductionModule(source,{exports,require:name=>modules[name],Error,requestAnimationFrame:fn=>fn()});
 const ui=exports.useTemplateDependencies({target:f.target,onTargetChange(){},globals,browser,browserTemplates,firstSite,secondSite,beforeOpen:async()=>true,onOpenTemplate(){}});
 return {f,browser,browserTemplates,firstSite,secondSite,reports,ui,get test2Writes(){return test2Writes;}};
}
test('production dependency controller saves each owner and reports acknowledged outcomes',async()=>{
 const h=controllerFixture();const rows=h.ui.dialog.props.rows.filter(r=>r.manageable);await h.ui.dialog.props.onApply(rows,{setId:h.f.set.id,entryId:h.f.replacement.id},message=>h.reports.push(message));
 assert.equal(h.reports.length,3);assert.equal(h.test2Writes,1);assert.equal(h.browserTemplates.store.assignments[0].templateId,'replacement');assert.equal(h.firstSite.draft.templates.assignments[0].templateId,'replacement');
});
test('production bulk controller preserves completed owner saves and stops after an owner failure',async()=>{
 const h=controllerFixture({failTest:true});const rows=h.ui.dialog.props.rows.filter(r=>r.manageable);await assert.rejects(h.ui.dialog.props.onApply(rows,{setId:h.f.set.id,entryId:h.f.replacement.id},message=>h.reports.push(message)),/Test: CAS rejected.*remaining owners were not changed/);
 assert.equal(h.reports.length,1);assert.equal(h.test2Writes,0);assert.equal(h.browserTemplates.store.assignments[0].templateId,'replacement');assert.equal(h.secondSite.draft.templates.assignments[0].templateId,h.f.post.id);
});
test('draft metadata preparation failure cannot silently detach its old layout',async()=>{
 const h=controllerFixture({failDraftAssignments:true});const rows=h.ui.dialog.props.rows.filter(r=>r.manageable&&r.owner==='drafts');await assert.rejects(h.ui.dialog.props.onApply(rows,null,()=>{}),/Metadata was prepared, but template assignments were not saved/);
 assert.equal(h.browserTemplates.store.assignments[0].templateId,h.f.post.id);assert.equal(h.browser.workspace.documents[0].templateOverrides.author,true);assert.equal(h.test2Writes,0);
});
