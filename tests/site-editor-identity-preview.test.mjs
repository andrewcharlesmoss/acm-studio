import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createIdentityPreview, resolveIdentityPreview, identityPreviewReducer as reduce} from '../app/studio/site-editor/identity-preview-state.ts';
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
 const view=readFileSync(new URL('../app/studio/site-editor/site-editor-preview.tsx',import.meta.url),'utf8');
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
