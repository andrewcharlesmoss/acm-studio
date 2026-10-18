import test from 'node:test';
import assert from 'node:assert/strict';
import {createIdentityPreview, identityPreviewReducer as reduce} from '../app/studio/site-editor/identity-preview-state.ts';
import {websiteHeaderTitle, sampleBrowserTabTitle} from '../app/studio/site-editor/identity-preview-presentation.ts';
test('empty identity titles disappear from the website header while the sample tab stays labelled',()=>{
 for(const title of ['', '   ']) {
  assert.equal(websiteHeaderTitle(title),null);
  assert.equal(sampleBrowserTabTitle(title),'Untitled site');
 }
 assert.equal(websiteHeaderTitle('Test site'),'Test site');
 assert.equal(sampleBrowserTabTitle('Test site'),'Test site');
});
test('identity edits stay site-local and Undo/Redo retain image bytes',()=>{
 let state=createIdentityPreview();
 const original=state.present.test2;
 state=reduce(state,{type:'change',site:'test',patch:{title:'New title',tagline:''}});
 assert.equal(state.present.test.title,'New title');
 assert.equal(state.present.test.tagline,'');
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
test('generic global identity edits and images never inherit into sites',()=>{
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
