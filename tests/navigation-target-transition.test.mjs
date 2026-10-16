import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
function controller(target='drafts',editing=false) {
 const slots=[];let cursor=0;const changes=[];
 const react={useState(v){const i=cursor++;if(!(i in slots))slots[i]=v;return[slots[i],next=>slots[i]=next];},useRef(v){const i=cursor++;return slots[i]??={current:v};}};
 const jsx=(type,props)=>({type,props});const store={sets:[{id:'menu',navigation:[]}],assignments:[],bin:[]};
 const browserTemplates={store,ready:true,writable:true,undo:()=>changes.push('draft undo'),redo(){},flush:async()=>{}};
 const fixture={siteId:target,context:{siteNavigation:{setId:'menu'},session:{workspace:{documents:[]}},templates:{store,undo:()=>changes.push('fixture undo'),redo(){}}}};
 const deps={'react':react,'react/jsx-runtime':{jsx,jsxs:jsx},'./template-model':{copyTemplateData:v=>structuredClone(v)},'./draft-global-templates':{draftGlobalTemplates:s=>s},'./draft-navigation':{draftNavigationReference:()=>({setId:'menu'}),retainDraftNavigation:(_,s)=>s},'./navigation-edit-target':{navigationTargetName:t=>t,NavigationEditControls:'controls'},'./site-navigation-editor':{SiteNavigationEditor:'editor'},'./test-site/use-test-site-context':{useTestSiteContext:f=>f.context}};
 const exports={};const source=ts.transpileModule(readFileSync(new URL('../app/studio/use-navigation-editing.tsx',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
 vm.runInNewContext(source,{exports,require:id=>deps[id],structuredClone,requestAnimationFrame:fn=>fn(),document:{getElementById:()=>null}});
 const render=()=>{cursor=0;return exports.useNavigationEditing({target,editing,onEditingChange:next=>editing=next,browserTemplates,globals:{library:{},initialised:true},fixture,browserSession:{workspace:{documents:[]}}});};
 return {render,changes, selection(site){cursor=0;return exports.useNavigationEditSelection(site);}};
}
test('sidebar selection derives the menu owner on every render and retains no independent target',()=>{
 const f=controller();
 for(const site of [null,'test','test2',null]) {
  const selection=f.selection(site);
  assert.equal(selection.navigationEditTarget,site??'drafts');
  assert.equal(selection.setNavigationEditTarget,undefined);
 }
});
test('same sidebar context keeps its menu owner across preview-only rerenders',()=>{
 const f=controller();let selection=f.selection('test');
 selection.setEditingSiteNavigation(true);
 selection=f.selection('test');
 assert.equal(selection.navigationEditTarget,'test');assert.equal(selection.editingSiteNavigation,true);
 assert.equal(f.selection('test').navigationEditTarget,'test');
});
test('screen actions wait for the current menu and refusal retains it',async()=>{
 const f=controller('test',true);let settle;let ui=f.render();ui.editor.props.prepareToLeaveRef.current=()=>new Promise(resolve=>settle=resolve);
 const pending=ui.afterNavigation(()=>f.changes.push('screen'));await Promise.resolve();assert.deepEqual(f.changes,[]);settle(false);assert.equal(await pending,false);assert.deepEqual(f.changes,[]);
 ui=f.render();assert.ok(ui.editor);ui.editor.props.prepareToLeaveRef.current=async()=>true;assert.equal(await ui.afterNavigation(()=>f.changes.push('screen')),true);assert.deepEqual(f.changes,['screen']);
});
test('history shortcuts mark the active menu dirty and delegate to its own owner',()=>{
 for(const target of ['drafts','test','test2']) {const f=controller(target,true),ui=f.render();ui.editor.props.historyChangeRef.current=()=>f.changes.push('dirty');ui.templates.undo();assert.deepEqual(f.changes,['dirty',target==='drafts'?'draft undo':'fixture undo']);}
});
