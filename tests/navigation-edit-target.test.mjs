import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { loadProductionModule } from './production-module.mjs';
const { NavigationEditControls } = await loadProductionModule(new URL('../app/studio/navigation-edit-target.tsx', import.meta.url));
const drafts = await loadProductionModule(new URL('../app/studio/draft-navigation.ts', import.meta.url));
const projection = await loadProductionModule(new URL('../app/studio/draft-global-templates.ts', import.meta.url));
const model = await loadProductionModule(new URL('../app/studio/template-model.ts', import.meta.url));
const globals = await loadProductionModule(new URL('../app/studio/global-template-contract.ts', import.meta.url));
function fixture() {
 const base = model.createTemplateSet('Recovery design');
 const sites = Object.fromEntries(['test','test2'].map(site => {
  const set = {...structuredClone(base), id:`${site}-menu`, templates:[], parts:[{id:`${site}-part`,name:'Navigation',kind:'header',nodes:[{id:`${site}-node`,type:'element',element:'navigation'}]}], navigation:[{id:'home',label:'Home',url:'/',visualStyle:{fontSizeCustom:'24px'}}]};
  return [site,{templates:{...model.emptyTemplateStore(),sets:[set]},siteNavigation:{setId:set.id,partId:set.parts[0].id}}];
 }));
 const library = globals.createGlobalTemplateLibrary(sites);
 const source = model.validateTemplateStore(sites.test.templates);
 return {source,library};
}
test('all contexts expose the three independent navigation targets and Edit navigation', () => {
 for (const target of ['drafts','test','test2']) {
  const html = renderToStaticMarkup(createElement(NavigationEditControls,{target,busy:false,editing:false,onChange(){},onEdit(){}}));
  assert.match(html,/Navigation target/); assert.match(html,/Edit navigation/);
  assert.match(html,new RegExp(`<option value="${target}" selected=""`));
  assert.match(html,/Studio Drafts/); assert.match(html,/Test2/); assert.doesNotMatch(html,/Preview With/);
 }
 const busy=renderToStaticMarkup(createElement(NavigationEditControls,{target:'drafts',busy:true,editing:true,onChange(){},onEdit(){}}));
 assert.match(busy,/select[^>]*disabled/); assert.doesNotMatch(busy,/>Edit navigation</);
});
test('draft menu edits preserve legacy aliases, artwork, other records and global originals', () => {
 const {source,library}=fixture(); const original=JSON.stringify(library),before=structuredClone(source);
 assert.deepEqual(drafts.draftNavigationReference(source,library),{setId:'test-menu',partId:'test-part'});
 const next=projection.draftGlobalTemplates(source,library); next.sets.find(set=>set.id==='test-menu').navigation[0].label='Changed';
 const saved=drafts.retainDraftNavigation(source,next,library);
 assert.equal(saved.sets[0].navigation[0].label,'Changed'); assert.deepEqual(saved.sets[0].navigation[0].visualStyle,{fontSizeCustom:'24px'});
 assert.deepEqual({...saved.sets[0],navigation:before.sets[0].navigation},before.sets[0]);
 assert.deepEqual(saved.assignments,before.assignments); assert.deepEqual(saved.bin,before.bin); assert.equal(JSON.stringify(library),original);
});
test('missing retained Navigation materialises inherited links without changing recovery designs', () => {
 const {source,library}=fixture(); source.sets[0].id='unbound-recovery';
 const before=JSON.stringify(source.sets[0]), next=projection.draftGlobalTemplates(source,library);
 const saved=drafts.retainDraftNavigation(source,next,library);
 assert.equal(JSON.stringify(saved.sets[0]),before); assert.equal(saved.sets.length,2);
 assert.equal(saved.sets[1].id,'studio-global-navigation'); assert.equal(saved.sets[1].navigation[0].label,'Home');
});
test('draft menu transactions reject presentation, assignments, identity and unrelated set changes', () => {
 for(const change of [s=>s.sets[0].name='Other',s=>s.sets[0].identity.name='Other',s=>s.bin.push({}),s=>s.sets[0].navigation[0].visualStyle={fontSizeCustom:'30px'}]) {
  const {source,library}=fixture(), before=JSON.stringify(source),next=structuredClone(projection.draftGlobalTemplates(source,library)); change(next);
  assert.throws(()=>drafts.retainDraftNavigation(source,next,library)); assert.equal(JSON.stringify(source),before);
 }
});
test('production orchestration separates preview, target, owner history and save destinations', async () => {
 const source=await readFile(new URL('../app/studio/studio-prototype.tsx',import.meta.url),'utf8');
 const controller=await readFile(new URL('../app/studio/use-navigation-editing.tsx',import.meta.url),'utf8');
 assert.match(controller,/useState<NavigationEditTarget>\(site \?\? "drafts"\)/);
 assert.match(source,/editingSiteNavigation \? navigationEditing.templates : globalTemplates.session/);
 assert.match(controller,/await browserTemplates.flush\(\)/); assert.match(controller,/await fixture.flush\(\)/);
 assert.match(controller,/retainDraftNavigation\(source, update\(copyTemplateData\(draftGlobalTemplates/);
 assert.match(source,/"test2", studioSection === "templates"/); assert.match(source,/navigationEditTarget === "test2"/);
 const inspector=await readFile(new URL('../app/studio/page-link-inspector.tsx',import.meta.url),'utf8');
 assert.match(inspector,/if \(!props.contentOnly && editingViewport !== "desktop"\)/);
});
