import test from 'node:test';
import assert from 'node:assert/strict';
import {createSiteEditorPreview, resolveParagraphSize, siteEditorPreviewReducer as reduce} from '../app/studio/site-editor/preview-state.ts';
test('sites inherit, explicit equal overrides stay independent, and reset resumes inheritance', () => {
 let state = createSiteEditorPreview();
 state = reduce(state, {type:'change', scope:'test2', value:18});
 state = reduce(state, {type:'change', scope:'global', value:24});
 assert.equal(resolveParagraphSize(state.present, 'test'),24);
 assert.equal(resolveParagraphSize(state.present, 'test2'),18);
 state = reduce(state,{type:'change',scope:'test2'});
 assert.equal(resolveParagraphSize(state.present,'test2'),24);
 assert.equal(Object.hasOwn(state.present,'test2'),false);
 state = reduce(state,{type:'undo'});
 assert.equal(resolveParagraphSize(state.present,'test2'),18);
 state = reduce(state,{type:'redo'});
 assert.equal(resolveParagraphSize(state.present,'test2'),24);
 assert.deepEqual(createSiteEditorPreview().present,{global:18});
});
test('invalid values and redundant changes do not enter history',()=>{
 const initial=createSiteEditorPreview();
 for (const value of [0,7,97,Infinity,NaN,undefined]) assert.equal(reduce(initial,{type:'change',scope:'global',value}),initial);
 assert.equal(reduce(initial,{type:'change',scope:'global',value:18}),initial);
});
