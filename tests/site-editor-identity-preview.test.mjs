import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {canResetIdentity, canResetIdentityField, originalIdentityText, createIdentityPreview, resolveIdentityPreview, identityPreviewReducer as reduce} from '../app/studio/site-editor/identity-preview-state.ts';
import {websiteHeaderTitle, sampleBrowserTabTitle} from '../app/studio/site-editor/identity-preview-presentation.ts';
test('empty identity titles disappear from the website header and sample tab',()=>{
 for(const title of ['', '   ']) {
  assert.equal(websiteHeaderTitle(title),null);
  assert.equal(sampleBrowserTabTitle(title),null);
 }
 assert.equal(websiteHeaderTitle('Test site'),'Test site');
 assert.equal(sampleBrowserTabTitle('Test site'),'Test site');
});
test('sample website header and tab reserve identity space when the title is empty',()=>{
 const css=readFileSync(new URL('../app/studio/site-editor/site-editor-preview.css',import.meta.url),'utf8');
 assert.match(css,/\.site-identity-page-header > div\s*\{[^}]*min-height:\s*calc\(1\.75rem \* 1\.2 \+ 4px \+ 1em \* 1\.5\)/);
 assert.match(css,/\.site-identity-page-header > div\s*\{[^}]*display:\s*flex;[^}]*flex-direction:\s*column;[^}]*justify-content:\s*center;/);
 assert.match(css,/\.site-identity-page-header h2\s*\{[^}]*line-height:\s*1\.2;/);
 assert.match(css,/\.site-identity-page-header p\s*\{\s*margin:\s*0;\s*\}/);
 assert.match(css,/\.site-identity-page-header h2 \+ p\s*\{\s*margin-top:\s*4px;\s*\}/);
 assert.match(css,/\.site-identity-browser-tab\s*\{[^}]*min-height:\s*calc\(1\.5em \+ 13px\)/);
});
test('identity settings keep image selection inside WordPress-style preview rows',()=>{
 const css=readFileSync(new URL('../app/studio/site-editor/site-editor-preview.css',import.meta.url),'utf8');
 const view=readFileSync(new URL('../app/studio/site-editor/identity-controls.tsx',import.meta.url),'utf8');
 assert.match(css,/\.site-identity-image-choose\s*\{[^}]*width:\s*100%;[^}]*border:\s*1px dashed/);
 assert.match(css,/\.site-identity-image-choose > img\s*\{[^}]*max-height:\s*64px;[^}]*max-width:\s*100%;/);
 assert.match(css,/\.site-identity-image-remove\s*\{[^}]*position:\s*absolute;[^}]*width:\s*32px;[^}]*height:\s*32px/);
 assert.match(css,/\.site-editor-preview \.site-identity-image-remove\.studio-text-action\s*\{[^}]*--acm-action-hover-background:\s*transparent/);
 assert.match(css,/button:hover[^\n]*\.site-identity-image-remove\)/);
 assert.match(css,/\.site-identity-image-choose\.has-image\s*\{[^}]*padding-right:\s*44px/);
 assert.match(view,/site-identity-image-choose.*type="button"[^>]*aria-label=/);
 assert.match(view,/className="site-identity-image-remove" aria-label=/);
 assert.doesNotMatch(view,/className="site-identity-context"/);
});
test('identity and UI Library image choosers share a padded, bounded dialog',()=>{
 const css=readFileSync(new URL('../app/studio/studio.css',import.meta.url),'utf8');
 const identity=readFileSync(new URL('../app/studio/site-editor/identity-image-picker.tsx',import.meta.url),'utf8');
 const library=readFileSync(new URL('../app/studio/ui/controls/overlay-specimen.tsx',import.meta.url),'utf8');
 assert.match(css,/\.studio-dialog\.image-choice-dialog\s*\{[^}]*padding:\s*20px;[^}]*width:\s*min\(560px, calc\(100vw - 32px\)\)/);
 assert.match(identity,/<StudioDialog className="image-choice-dialog"/);
 assert.match(library,/<StudioDialog className="image-choice-dialog"/);
 assert.doesNotMatch(css,/ui-overlay-image-dialog/);
});
test('identity edits stay site-local and Undo/Redo retain image bytes',()=>{
 let state=createIdentityPreview();
 const original=state.present.test2;
 state=reduce(state,{type:'change',site:'test',patch:{title:'New title',tagline:''}});
 assert.equal(state.present.test.title,'New title');
 assert.equal(state.present.test.tagline,undefined);
 assert.equal(state.present.test2,original);
 const image={id:'logo',name:'Logo',altText:'Example',blob:new Blob(['image'],{type:'image/png'})};
 state=reduce(state,{type:'change',site:'test',patch:{logo:image,icon:image}});
 state=reduce(state,{type:'change',site:'test',patch:{logo:undefined}});
 assert.equal(state.present.test.logo,undefined);
 assert.equal(state.present.test.icon,image);
 state=reduce(state,{type:'undo'});
 assert.equal(state.present.test.logo.blob,image.blob);
 state=reduce(state,{type:'redo'});
 assert.equal(state.present.test.logo,undefined);
 assert.equal(createIdentityPreview().present.test.title,'Test');
});
test('same values do not add history; a new edit clears redo',()=>{
 const initial=createIdentityPreview();
 assert.equal(reduce(initial,{type:'change',site:'test',patch:{title:'Test'}}),initial);
 let state=reduce(initial,{type:'change',site:'test',patch:{title:'Changed'}});
 state=reduce(state,{type:'undo'});
 state=reduce(state,{type:'change',site:'test2',patch:{tagline:'Different'}});
 assert.equal(state.future.length,0);
 assert.equal(state.present.test.title,'Test');
});
test('authored site records remain independent of Global Defaults edits',()=>{
 const initial=createIdentityPreview();
 assert.equal(initial.present.global.title,'Site Title');
 assert.equal(initial.present.global.logo,undefined);
 assert.equal(initial.present.global.icon,undefined);
 const image={id:'generic',name:'Generic',altText:'',blob:new Blob(['image'],{type:'image/png'})};
 let state=reduce(initial,{type:'change',site:'global',patch:{title:'Generic brand',tagline:'Example',logo:image,icon:image}});
 assert.equal(state.present.test,initial.present.test);
 assert.equal(state.present.test2,initial.present.test2);
 assert.equal(state.present.global.logo,image);
 state=reduce(state,{type:'change',site:'test',patch:{title:'Independent site'}});
 assert.equal(state.present.global.title,'Generic brand');
 state=reduce(state,{type:'undo'});
 state=reduce(state,{type:'undo'});
 assert.equal(state.present.global.title,'Site Title');
 assert.equal(state.present.global.logo,undefined);
 assert.equal(state.present.test.title,'Test');
});


test('unset identity fields inherit live Global Defaults',()=>{
 let state=createIdentityPreview();
 state=reduce(state,{type:'change',site:'test',patch:{title:'',tagline:'   '}});
 assert.equal(state.present.test.title,undefined);
 assert.equal(resolveIdentityPreview(state.present,'test').title,'Site Title');
 assert.equal(resolveIdentityPreview(state.present,'test').tagline,'A short description of your site.');
 const image={id:'global',name:'Global',altText:'',blob:new Blob(['image'])};
 state=reduce(state,{type:'change',site:'global',patch:{title:'Shared title',tagline:'Shared tagline',logo:image,icon:image}});
 const resolved=resolveIdentityPreview(state.present,'test');
 assert.equal(resolved.title,'Shared title');assert.equal(resolved.tagline,'Shared tagline');
 assert.equal(resolved.logo,image);assert.equal(resolved.icon,image);
 assert.equal(resolveIdentityPreview(state.present,'test2').title,'Test 2');
 assert.equal(sampleBrowserTabTitle(resolved.title),'Shared title');
});

test('Hide suppresses defaults and Reset restores inheritance independently per field',()=>{
 let state=createIdentityPreview();
 state=reduce(state,{type:'change',site:'test',patch:{title:null,tagline:null}});
 state=reduce(state,{type:'change',site:'global',patch:{title:'New global',tagline:'New description'}});
 assert.equal(resolveIdentityPreview(state.present,'test').title,'');
 assert.equal(resolveIdentityPreview(state.present,'test').tagline,'');
 assert.equal(websiteHeaderTitle(resolveIdentityPreview(state.present,'test').title),null);
 state=reduce(state,{type:'change',site:'test',patch:{title:undefined}});
 assert.equal(resolveIdentityPreview(state.present,'test').title,'New global');
 assert.equal(resolveIdentityPreview(state.present,'test').tagline,'');
 state=reduce(state,{type:'undo'});assert.equal(state.present.test.title,null);
 state=reduce(state,{type:'redo'});assert.equal(resolveIdentityPreview(state.present,'test').title,'New global');
 state=reduce(state,{type:'change',site:'test',patch:{tagline:undefined}});
 assert.equal(resolveIdentityPreview(state.present,'test').tagline,'New description');
});

test('custom text, Hide and inheritance are separate undoable states',()=>{
 let state=createIdentityPreview();
 state=reduce(state,{type:'change',site:'test',patch:{title:'Custom'}});
 state=reduce(state,{type:'change',site:'test',patch:{title:null}});
 state=reduce(state,{type:'change',site:'test',patch:{title:undefined}});
 assert.equal(resolveIdentityPreview(state.present,'test').title,'Site Title');
 state=reduce(state,{type:'undo'});assert.equal(state.present.test.title,null);
 state=reduce(state,{type:'undo'});assert.equal(state.present.test.title,'Custom');
 state=reduce(state,{type:'redo'});assert.equal(state.present.test.title,null);
 const unchanged=reduce(state,{type:'change',site:'test',patch:{title:null}});assert.equal(unchanged,state);
 state=reduce(state,{type:'change',site:'global',patch:{title:'',tagline:'  '}});
 assert.equal(resolveIdentityPreview(state.present,'global').title,'');
 assert.equal(resolveIdentityPreview(state.present,'global').tagline,'');
});


test('image inheritance, overrides, Hide and Reset resolve independently per scope and field',()=>{
 const first={id:'first',name:'First',altText:'First',blob:new Blob(['first'],{type:'image/png'})};
 const second={id:'second',name:'Second',altText:'Second',blob:new Blob(['second'],{type:'image/png'})};
 let state=createIdentityPreview();
 state=reduce(state,{type:'change',site:'global',patch:{logo:first,icon:second}});
 assert.equal(resolveIdentityPreview(state.present,'test').logo,first);
 assert.equal(resolveIdentityPreview(state.present,'test').icon,second);
 assert.equal(resolveIdentityPreview(state.present,'test2').logo,first);
 state=reduce(state,{type:'change',site:'test',patch:{logo:second,icon:null}});
 assert.equal(resolveIdentityPreview(state.present,'test').logo,second);
 assert.equal(resolveIdentityPreview(state.present,'test').icon,undefined);
 state=reduce(state,{type:'change',site:'global',patch:{logo:second,icon:first}});
 assert.equal(resolveIdentityPreview(state.present,'test').icon,undefined);
 assert.equal(resolveIdentityPreview(state.present,'test2').icon,first);
 state=reduce(state,{type:'change',site:'test',patch:{logo:undefined,icon:undefined}});
 assert.equal(resolveIdentityPreview(state.present,'test').logo,second);
 assert.equal(resolveIdentityPreview(state.present,'test').icon,first);
 state=reduce(state,{type:'undo'});
 assert.equal(state.present.test.icon,null);
 assert.equal(state.present.test.logo.blob,second.blob);
 state=reduce(state,{type:'redo'});
 assert.equal(resolveIdentityPreview(state.present,'test').icon.blob,first.blob);
 state=reduce(state,{type:'change',site:'global',patch:{logo:undefined,icon:undefined}});
 assert.equal(resolveIdentityPreview(state.present,'test').logo,undefined);
 assert.equal(resolveIdentityPreview(state.present,'test2').icon,undefined);
 assert.equal(resolveIdentityPreview(state.present,'global').logo,undefined);
});

test('clearing Hide resumes the latest image default and repeated states do not add history',()=>{
 const image={id:'asset',name:'Asset',altText:'',blob:new Blob(['bytes'])};
 let state=createIdentityPreview();
 state=reduce(state,{type:'change',site:'test',patch:{logo:null,icon:null}});
 assert.equal(reduce(state,{type:'change',site:'test',patch:{logo:null,icon:null}}),state);
 state=reduce(state,{type:'change',site:'global',patch:{logo:image,icon:image}});
 state=reduce(state,{type:'change',site:'test',patch:{logo:undefined,icon:undefined}});
 assert.equal(resolveIdentityPreview(state.present,'test').logo,image);
 assert.equal(resolveIdentityPreview(state.present,'test').icon,image);
 assert.equal(createIdentityPreview().present.global.logo,undefined);
});

test('Hide retains all four authored values and toggling off restores them',()=>{
 const image={id:'retained',name:'Retained',altText:'',blob:new Blob(['retained'])};
 let state=createIdentityPreview();
 state=reduce(state,{type:'change',site:'test',patch:{title:'Keep this title',tagline:'Keep this tagline',logo:image,icon:image}});
 for(const field of ['title','tagline','logo','icon']){
  const before=state.present.test[field];
  state=reduce(state,{type:'set-hidden',site:'test',field,hidden:true});
  assert.equal(resolveIdentityPreview(state.present,'test')[field],field==='title'||field==='tagline'?'':undefined);
  assert.equal(state.present.test[field],before);
  state=reduce(state,{type:'set-hidden',site:'test',field,hidden:false});
  assert.equal(resolveIdentityPreview(state.present,'test')[field],before);
 }
});

test('Reset clears retained values and visibility while history preserves both',()=>{
 let state=createIdentityPreview();
 const image={id:'retained-reset',name:'Image',altText:'',blob:new Blob(['image'])};
 state=reduce(state,{type:'change',site:'test',patch:{title:'Custom',logo:image}});
 state=reduce(state,{type:'set-hidden',site:'test',field:'title',hidden:true});
 state=reduce(state,{type:'set-hidden',site:'test',field:'logo',hidden:true});
 assert.equal(reduce(state,{type:'set-hidden',site:'test',field:'logo',hidden:true}),state);
 state=reduce(state,{type:'change',site:'test',patch:{title:undefined}});
 assert.equal(resolveIdentityPreview(state.present,'test').title,'Site Title');
 assert.equal(state.present.test.hidden.logo,true);
 state=reduce(state,{type:'undo'});assert.equal(state.present.test.title,'Custom');assert.equal(state.present.test.hidden.title,true);
 state=reduce(state,{type:'redo'});assert.equal(state.present.test.hidden.title,undefined);
 state=reduce(state,{type:'set-hidden',site:'test',field:'logo',hidden:false});
 assert.equal(resolveIdentityPreview(state.present,'test').logo,image);
});

test('hiding an inherited field resumes the latest Global Defaults on reveal',()=>{
 let state=createIdentityPreview();
 state=reduce(state,{type:'change',site:'test',patch:{title:undefined}});
 state=reduce(state,{type:'set-hidden',site:'test',field:'title',hidden:true});
 state=reduce(state,{type:'change',site:'global',patch:{title:'Latest default'}});
 state=reduce(state,{type:'set-hidden',site:'test',field:'title',hidden:false});
 assert.equal(resolveIdentityPreview(state.present,'test').title,'Latest default');
 assert.equal(state.present.test.title,undefined);
});

test('Library uses canonical identity controls and preserves hidden input values in markup',async()=>{
 const {loadProductionModule}=await import('./production-module.mjs');
 const {createElement}=await import('react');
 const {renderToStaticMarkup}=await import('react-dom/server');
 const {IdentityControls}=await loadProductionModule(new URL('../app/studio/site-editor/identity-controls.tsx',import.meta.url));
 const {IdentityControlsExample}=await loadProductionModule(new URL('../app/studio/ui/controls/identity-controls-specimen.tsx',import.meta.url));
 let history=createIdentityPreview();
 history=reduce(history,{type:'change',site:'test',patch:{title:'Still present'}});
 history=reduce(history,{type:'change',site:'test',patch:{logo:{id:'logo',name:'Logo',altText:'',blob:new Blob(['logo'])},icon:{id:'icon',name:'Icon',altText:'',blob:new Blob(['icon'])}}});
 history=reduce(history,{type:'set-hidden',site:'test',field:'title',hidden:true});
 history=reduce(history,{type:'set-hidden',site:'test',field:'logo',hidden:true});
 history=reduce(history,{type:'set-hidden',site:'test',field:'icon',hidden:true});
 const html=renderToStaticMarkup(createElement(IdentityControls,{values:history.present,scope:'test',onChange(){},onHide(){},onReset(){},onResetAll(){},onRemoveImage(){},onChooseImage(){}}));
 assert.match(html,/value="Still present"/);
 assert.match(html,/<input[^>]*data-hidden="true"/);
 assert.doesNotMatch(html,/<input[^>]*disabled/);
 assert.match(html,/Reset Site Title/);
 assert.match(html,/Hide Site Icon/);
 assert.match(html,/aria-label="Replace logo"/);
 assert.match(html,/aria-label="Replace icon"/);
 assert.equal((html.match(/aria-label="Replace (?:logo|icon)"[^>]*disabled/g)||[]).length,0);
 const fixture={id:'example',name:'Example',altText:'',blob:new Blob(['example'])};
 const library=renderToStaticMarkup(createElement(IdentityControlsExample,{choices:[fixture,fixture]}));
 assert.match(library,/Using Global Defaults/);
 assert.match(library,/Identity example preview/);
 for(const field of ['Title','Tagline','Logo','Icon'])assert.match(library,new RegExp(`Reset Site ${field}`));
 const product=readFileSync(new URL('../app/studio/site-editor/site-editor-preview.tsx',import.meta.url),'utf8');
 assert.match(product,/<IdentityControls /);
 assert.doesNotMatch(product,/site-identity-image-choose/);
});


test('removing either image clears only its override and preserves Hide and history',()=>{
 for(const field of ['logo','icon']) for(const hidden of [false,true]) {
  const globalImage={id:'global',name:'Global',altText:'',blob:new Blob(['global'])};
  const ownImage={id:'own',name:'Own',altText:'',blob:new Blob(['own'])};
  let state=createIdentityPreview();
  state.present.global[field]=globalImage;
  state.present.test[field]=ownImage;
  state=reduce(state,{type:'set-hidden',site:'test',field,hidden});
  const before=state.present;
  state=reduce(state,{type:'remove-image',site:'test',field});
  assert.equal(state.present.test[field],undefined);
  assert.equal(Boolean(state.present.test.hidden?.[field]),hidden);
  assert.equal(resolveIdentityPreview(state.present,'test')[field],hidden?undefined:globalImage);
  const removed=state;
  state=reduce(state,{type:'undo'});
  assert.deepEqual(state.present,before);
  assert.equal(reduce(state,{type:'redo'}).present,removed.present);
  state=reduce(removed,{type:'set-hidden',site:'test',field,hidden:false});
  assert.equal(resolveIdentityPreview(state.present,'test')[field],globalImage);
  assert.equal(reduce(removed,{type:'remove-image',site:'test',field}),removed);
 }
});


test('editing hidden identity text preserves Hide, including clearing to inheritance',()=>{
 for(const field of ['title','tagline']) {
  let state=reduce(createIdentityPreview(),{type:'set-hidden',site:'test',field,hidden:true});
  for(const value of ['Updated while hidden','']) {
   state=reduce(state,{type:'change',site:'test',patch:{[field]:value}});
   assert.equal(state.present.test.hidden[field],true);
   assert.equal(resolveIdentityPreview(state.present,'test')[field],'');
   assert.equal(state.present.test[field],value||undefined);
  }
  state=reduce(state,{type:'set-hidden',site:'test',field,hidden:false});
  assert.equal(resolveIdentityPreview(state.present,'test')[field],state.present.global[field]);
 }
});


test('Global text Reset restores fixed originals after deletion or editing and preserves history',()=>{
 for(const field of ['title','tagline'])for(const value of ['', '  ', 'Edited default', null]){
  let state=reduce(createIdentityPreview(),{type:'change',site:'global',patch:{[field]:value}});
  const before=state.present;
  const other=field==='title'?'tagline':'title';
  assert.equal(canResetIdentityField(state.present,'global',field),true);
  state=reduce(state,{type:'reset-field',site:'global',field});
  assert.equal(state.present.global[field],originalIdentityText[field]);
  assert.equal(state.present.global[other],before.global[other]);
  assert.equal(state.present.test,before.test);
  assert.equal(canResetIdentityField(state.present,'global',field),false);
  assert.equal(reduce(state,{type:'reset-field',site:'global',field}),state);
  state=reduce(state,{type:'undo'});assert.equal(state.present,before);
  state=reduce(state,{type:'redo'});assert.equal(state.present.global[field],originalIdentityText[field]);
 }
});

test('Reset clears hidden text while retaining unrelated fields and latest site inheritance',()=>{
 let state=createIdentityPreview();
 state=reduce(state,{type:'set-hidden',site:'global',field:'title',hidden:true});
 state=reduce(state,{type:'reset-field',site:'global',field:'title'});
 assert.equal(resolveIdentityPreview(state.present,'global').title,originalIdentityText.title);
 for(const site of ['test','test2'])for(const field of ['title','tagline']){
  state=reduce(state,{type:'change',site:'global',patch:{[field]:'Latest shared text'}});
  state=reduce(state,{type:'set-hidden',site,field,hidden:true});
  state=reduce(state,{type:'reset-field',site,field});
  assert.equal(state.present[site][field],undefined);
  assert.equal(resolveIdentityPreview(state.present,site)[field],'Latest shared text');
  assert.equal(canResetIdentityField(state.present,site,field),false);
  assert.equal(reduce(state,{type:'reset-field',site,field}),state);
  state=reduce(state,{type:'undo'});assert.equal(state.present[site].hidden[field],true);
  state=reduce(state,{type:'redo'});assert.equal(resolveIdentityPreview(state.present,site)[field],'Latest shared text');
 }
});

test('shared field Reset retains image inheritance, visibility and undo semantics',()=>{
 const globalImage={id:'global-reset',name:'Global',altText:'',blob:new Blob(['global'])};
 const ownImage={id:'own-reset',name:'Own',altText:'',blob:new Blob(['own'])};
 for(const field of ['logo','icon']){
  let state=reduce(createIdentityPreview(),{type:'change',site:'global',patch:{[field]:globalImage}});
  state=reduce(state,{type:'change',site:'test',patch:{[field]:ownImage}});
  state=reduce(state,{type:'set-hidden',site:'test',field,hidden:true});
  state=reduce(state,{type:'reset-field',site:'test',field});
  assert.equal(resolveIdentityPreview(state.present,'test')[field],globalImage);
  state=reduce(state,{type:'undo'});
  assert.equal(state.present.test[field],ownImage);assert.equal(state.present.test.hidden[field],true);
 }
});

test('Global identity text controls expose state-accurate Reset actions without Hide or image changes',async()=>{
 const {loadProductionModule}=await import('./production-module.mjs');
 const {createElement}=await import('react');
 const {renderToStaticMarkup}=await import('react-dom/server');
 const {IdentityControls}=await loadProductionModule(new URL('../app/studio/site-editor/identity-controls.tsx',import.meta.url));
 const render=values=>renderToStaticMarkup(createElement(IdentityControls,{values,scope:'global',onChange(){},onHide(){},onReset(){},onResetAll(){},onRemoveImage(){},onChooseImage(){}}));
 let state=createIdentityPreview();
 const initial=render(state.present);
 for(const field of ['Title','Tagline'])assert.match(initial,new RegExp('<button[^>]*aria-label="Reset Site '+field+'"[^>]*disabled=""'));
 assert.doesNotMatch(initial,/Hide Site|Reset Site Logo|Reset Site Icon/);
 state=reduce(state,{type:'change',site:'global',patch:{title:'',tagline:'Changed'}});
 const edited=render(state.present);
 for(const field of ['Title','Tagline']){
  const button=edited.match(new RegExp('<button[^>]*aria-label="Reset Site '+field+'"[^>]*>'))?.[0];
  assert.ok(button);assert.doesNotMatch(button,/disabled/);
 }
 assert.equal((edited.match(/disabled=""/g)||[]).length,0);
 assert.match(edited,/Restore original default/);
});


test('Library Reset callbacks restore originals through its production history reducer',async()=>{
 const ts=(await import('typescript')).default;
 const stateModule=await import('../app/studio/site-editor/identity-preview-state.ts');
 const source=readFileSync(new URL('../app/studio/ui/controls/identity-controls-specimen.tsx',import.meta.url),'utf8');
 const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
 const slots=[];let cursor=0;
 const react={useReducer(reducer,value,init){const id=cursor++;slots[id]??=init(value);return[slots[id],action=>{slots[id]=reducer(slots[id],action);}];},useState(initial){const id=cursor++;if(!(id in slots))slots[id]=initial;return[slots[id],value=>{slots[id]=value;}];},useId:()=> 'test',useMemo:fn=>fn()};
 const jsx=(type,props)=>({type,props});
 const require=name=>name==='react'?react:name==='react/jsx-runtime'?{jsx,jsxs:jsx}:name.endsWith('identity-preview-state')?stateModule:name.endsWith('use-blob-urls')?{useBlobUrls:()=>({})}:new Proxy({},{get:(_,key)=>key});
 const {IdentityControlsExample}=new Function('require','exports',code+'\nreturn exports;')(require,{});
 const all=node=>!node||typeof node!=='object'?[]:Array.isArray(node)?node.flatMap(all):[node,...all(node.props?.children)];
 const fixture={id:'fixture',name:'Fixture',altText:'',blob:new Blob(['image'])};
 const render=()=>{cursor=0;return IdentityControlsExample({choices:[fixture,fixture]});};
 let tree=render();
 all(tree).find(node=>node.type==='SelectControl').props.onChange({target:{value:'global'}});tree=render();
 let controls=all(tree).find(node=>node.type==='IdentityControls').props;
 controls.onChange({title:'',tagline:''});tree=render();
 controls=all(tree).find(node=>node.type==='IdentityControls').props;
 controls.onReset('title');controls.onReset('tagline');tree=render();
 controls=all(tree).find(node=>node.type==='IdentityControls').props;
 assert.equal(controls.values.global.title,'Site Title');
 assert.equal(controls.values.global.tagline,'A short description of your site.');
 all(tree).find(node=>node.type==='HistoryActions').props.onUndo();tree=render();
 assert.equal(all(tree).find(node=>node.type==='IdentityControls').props.values.global.tagline,undefined);
 controls=all(tree).find(node=>node.type==='IdentityControls').props;
 controls.onChange({title:'Reset both',tagline:'Together'});tree=render();
 const beforeAll=all(tree).find(node=>node.type==='IdentityControls').props.values;
 all(tree).find(node=>node.type==='IdentityControls').props.onResetAll();tree=render();
 assert.deepEqual(all(tree).find(node=>node.type==='IdentityControls').props.values.global,originalIdentityText);
 all(tree).find(node=>node.type==='HistoryActions').props.onUndo();tree=render();
 assert.equal(all(tree).find(node=>node.type==='IdentityControls').props.values,beforeAll);
});


test('Reset All restores each scope atomically, retaining other scopes and image history',()=>{
 const image={id:'all',name:'All',altText:'',blob:new Blob(['all'])};
 for(const site of ['global','test','test2']){
  let state=reduce(createIdentityPreview(),{type:'change',site:'global',patch:{title:'Latest shared',tagline:'Shared description',logo:image,icon:image}});
  state=reduce(state,{type:'change',site,patch:{title:'Custom',tagline:'Custom description',logo:image,icon:image,hidden:{title:true,tagline:true,logo:true,icon:true}}});
  const before=state;
  assert.equal(canResetIdentity(state.present,site),true);
  state=reduce(state,{type:'reset-all',site});
  assert.equal(state.past.length,before.past.length+1);
  assert.deepEqual(state.present[site],site==='global'?originalIdentityText:{});
  for(const other of ['global','test','test2'].filter(other=>other!==site))assert.equal(state.present[other],before.present[other]);
  assert.deepEqual(resolveIdentityPreview(state.present,site),site==='global'?{...originalIdentityText,logo:undefined,icon:undefined}:resolveIdentityPreview(state.present,'global'));
  assert.equal(canResetIdentity(state.present,site),false);
  assert.equal(reduce(state,{type:'reset-all',site}),state);
  const reset=state;
  state=reduce(state,{type:'undo'});assert.equal(state.present,before.present);assert.equal(state.present[site].logo.blob,image.blob);
  assert.equal(reduce(state,{type:'redo'}).present,reset.present);
  assert.equal(reduce(state,{type:'reset-all',site}).future.length,0);
 }
});

test('Reset All availability follows every identity property and Hide choice',async()=>{
 const {loadProductionModule}=await import('./production-module.mjs');
 const {createElement}=await import('react');
 const {renderToStaticMarkup}=await import('react-dom/server');
 const {IdentityControls}=await loadProductionModule(new URL('../app/studio/site-editor/identity-controls.tsx',import.meta.url));
 const render=(values,scope)=>renderToStaticMarkup(createElement(IdentityControls,{values,scope,onChange(){},onHide(){},onReset(){},onResetAll(){},onRemoveImage(){},onChooseImage(){}})).match(/<button[^>]*aria-label="Reset All Identity"[^>]*>/)?.[0];
 let state=createIdentityPreview();
 assert.match(render(state.present,'global'),/disabled=""/);
 for(const site of ['global','test','test2']){
  state=reduce(state,{type:'reset-all',site});
  for(const field of ['title','tagline','logo','icon']){
   const hidden=reduce(state,{type:'set-hidden',site,field,hidden:true});
   assert.equal(canResetIdentity(hidden.present,site),true);
   assert.doesNotMatch(render(hidden.present,site),/disabled/);
  }
  assert.match(render(state.present,site),/disabled=""/);
 }
});

test('shared Reset All button invokes the owning host callback',async()=>{
 const ts=(await import('typescript')).default;
 const stateModule=await import('../app/studio/site-editor/identity-preview-state.ts');
 const source=readFileSync(new URL('../app/studio/site-editor/identity-controls.tsx',import.meta.url),'utf8');
 const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
 const jsx=(type,props)=>({type,props});
 const require=name=>name==='react'?{useMemo:fn=>fn()}:name==='react/jsx-runtime'?{jsx,jsxs:jsx}:name.endsWith('identity-preview-state')?stateModule:name.endsWith('use-blob-urls')?{useBlobUrls:()=>({})}:new Proxy({},{get:(_,key)=>key});
 const {IdentityControls}=new Function('require','exports',code+'\nreturn exports;')(require,{});
 const all=node=>!node||typeof node!=='object'?[]:Array.isArray(node)?node.flatMap(all):[node,...all(node.props?.children)];
 let called=0;
 const tree=IdentityControls({values:createIdentityPreview().present,scope:'test',onChange(){},onHide(){},onReset(){},onResetAll(){called++;},onRemoveImage(){},onChooseImage(){}});
 const action=all(tree).find(node=>node.props?.['aria-label']==='Reset All Identity');
 assert.equal(action.type,'StudioButton');assert.equal(action.props.variant,'text');assert.equal(action.props.disabled,false);
 action.props.onClick();assert.equal(called,1);
});
