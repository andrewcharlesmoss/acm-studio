import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm,realpath} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {loadProductionModule} from './production-module.mjs';
import {createGlobalTemplateStore} from '../scripts/global-template-store.mjs';
import {siteImageName} from '../app/content/site-featured-image.mjs';
const globals=await loadProductionModule(new URL('../app/studio/global-template-contract.ts',import.meta.url));
const templates=await loadProductionModule(new URL('../app/studio/template-model.ts',import.meta.url));
const design=await loadProductionModule(new URL('../app/studio/site-editor/website-design.ts',import.meta.url));
function sites(){return Object.fromEntries(['test','test2'].map(siteId=>{const set=templates.createTemplateSet('Shared');const nav={...structuredClone(set),id:`${siteId}-navigation`,templates:[],parts:[{id:`${siteId}-menu`,name:'Navigation',kind:'header',nodes:[{id:`${siteId}-links`,type:'element',element:'navigation'}]}]};return[siteId,{templates:{...templates.emptyTemplateStore(),sets:[set,nav]},siteNavigation:{setId:nav.id,partId:nav.parts[0].id}}];}));}

test('global website settings persist through owned CAS with compact image references and retained originals',async()=>{
 const root=await realpath(await mkdtemp(path.join(os.tmpdir(),'website-design-gateway-')));
 const source=sites();source.test2.templates.sets[0]=structuredClone(source.test.templates.sets[0]);
 const store=createGlobalTemplateStore({root,loadContracts:async()=>globals,readSites:async()=>source});
 let writable=true;const owner=async()=>{if(!writable)throw new Error('Owner denied');};
 try{
  const first=await store.load(true,owner);const before=JSON.stringify(first.library.templates);
  const bytes=Buffer.alloc(24);Buffer.from([137,80,78,71,13,10,26,10]).copy(bytes);bytes.write('IHDR',12);
  const name=siteImageName('11111111-1111-4111-8111-111111111111',createHash('sha256').update(bytes).digest('hex'),'image/png');
  const settings=design.validateWebsiteDesign({identity:{title:'Shared title',logo:{id:'11111111-1111-4111-8111-111111111111',name:'Logo',altText:'Logo',src:`/media/${name}`}},styles:{blockStyles:{group:{headingBackground:{background:'var(--site-palette-theme-2)'},headingBackgrounds:{2:{background:'#123456'}}}}}});
  const saved=await store.save(first.revision,first.library.templates,owner,[],settings,[{name,dataBase64:bytes.toString('base64')}]);
  assert.equal(saved.library.version,6);assert.deepEqual(saved.library.websiteDesignDefaults,settings);assert.equal(JSON.stringify(saved.library.templates),before);
  assert.ok(!(await readFile(path.join(root,'work/global-template-library.json'),'utf8')).includes('dataBase64'));
  assert.deepEqual(await readFile(path.join(root,'work/global-design-media',name)),bytes);
  assert.deepEqual((await store.images(settings))[0],{name,dataBase64:bytes.toString('base64')});
  await assert.rejects(store.save(first.revision,saved.library.templates,owner,[],settings,[]),error=>error.status===409);
  writable=false;await assert.rejects(store.save(saved.revision,saved.library.templates,owner,[],{identity:{title:'Denied'},styles:{}},[]),/Owner denied/);
  assert.equal((await store.load()).library.websiteDesignDefaults.identity.title,'Shared title');
  writable=true;await assert.rejects(store.save(saved.revision,saved.library.templates,owner,[],{identity:{title:'Bad'},styles:{background:{image:{}}}},[]));
  assert.equal((await store.load()).revision,saved.revision);
 }finally{await store.close();await rm(root,{recursive:true,force:true});}
});

test('fluid Image margin survives the global gateway and Reset without accepting unsafe values',async()=>{
 const root=await realpath(await mkdtemp(path.join(os.tmpdir(),'website-design-spacing-')));
 const source=sites();source.test2.templates.sets[0]=structuredClone(source.test.templates.sets[0]);
 const store=createGlobalTemplateStore({root,loadContracts:async()=>globals,readSites:async()=>source});
 const owner=async()=>{};
 try{
  const initial=await store.load(true,owner);
  const settings={identity:{title:'Kept'},styles:{blockStyles:{image:{margin:'clamp(30px,7cqw,70px) 0'}}}};
  const saved=await store.save(initial.revision,initial.library.templates,owner,[],settings,[]);
  assert.equal((await store.load()).library.websiteDesignDefaults.styles.blockStyles.image.margin,settings.styles.blockStyles.image.margin);
  await assert.rejects(store.save(saved.revision,saved.library.templates,owner,[],{identity:{},styles:{blockStyles:{image:{margin:'clamp(1px,2cqw,3px)'}}}},[]));
  assert.equal((await store.load()).revision,saved.revision);
  const reset=await store.save(saved.revision,saved.library.templates,owner,[],{identity:settings.identity,styles:{}},[]);
  assert.deepEqual((await store.load()).library.websiteDesignDefaults,{identity:{title:'Kept'},styles:{}});
  assert.notEqual(reset.revision,saved.revision);
 }finally{await store.close();await rm(root,{recursive:true,force:true});}
});

test('website style controls retain clears, names and device values through owned gateway readback',async()=>{
 const root=await realpath(await mkdtemp(path.join(os.tmpdir(),'website-style-controls-')));
 const source=sites();source.test2.templates.sets[0]=structuredClone(source.test.templates.sets[0]);
 const store=createGlobalTemplateStore({root,loadContracts:async()=>globals,readSites:async()=>source});
 const owner=async()=>{};
 try{
  const initial=await store.load(true,owner);
  const styles={typography:{elements:{text:{colour:''}}},colours:{elements:{headings:{background:''},links:{hover:''}}},shadows:{custom:{name:'Header; {wide}',layers:[{id:'one',colour:'#00000033',inset:false,x:'0.0000001px',y:'6px',blur:'9px',spread:'0px'}]}},blockStyles:{paragraph:{fontSizeCustom:'0.0000001px',responsive:{tablet:{textColumns:5,textColor:'var(--site-palette-theme-1)'},mobile:{textColumns:6,backgroundColor:'var(--site-palette-theme-0)'}}}}};
  const saved=await store.save(initial.revision,initial.library.templates,owner,[],{identity:{},styles},[]);
  assert.deepEqual(saved.library.websiteDesignDefaults.styles,styles);
  assert.deepEqual((await store.load()).library.websiteDesignDefaults.styles,styles);
 }finally{await store.close();await rm(root,{recursive:true,force:true});}
});
