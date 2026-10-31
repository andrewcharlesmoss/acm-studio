import assert from 'node:assert/strict';
import test from 'node:test';
import {loadProductionModule} from './production-module.mjs';
const load=path=>loadProductionModule(new URL(path,import.meta.url));
const contexts=await load('../app/studio/ui/blocks/block-contexts.ts');
const styles=await load('../app/studio/site-editor/styles-preview-state.ts');

test('Block Library context mapping preserves canonical aliases and distinct blocks',()=>{
  const aliases={title:'document-title',subtitle:'document-subtitle','author-name':'post-author','time-to-read':'reading-time',separator:'divider','template-content':'content',navigation:'navigation',button:'button',buttons:'buttons',quote:'quote',pullquote:'pullquote'};
  for(const [type,target] of Object.entries(aliases))assert.equal(contexts.siteStyleTarget(type),target,type);
  assert.equal(contexts.siteStyleTarget('video'),undefined);
  assert.equal(contexts.siteStyleTarget('page-link'),undefined);
  assert.equal(new Set(contexts.blockContextEntries.map(entry=>entry.type)).size,contexts.blockContextEntries.length);
  for(const alias of ['document-title','post-author','document-subtitle','reading-time','content','divider'])assert.equal(contexts.blockContextEntries.some(entry=>entry.type===alias),false);
});

test('supported contexts include style-only targets and editor-only blocks',()=>{
  assert.deepEqual([...contexts.blockContexts(contexts.blockContextEntryByType.image)],['block-editor','site-editor-styles']);
  assert.deepEqual([...contexts.blockContexts(contexts.blockContextEntryByType.search)],['site-editor-styles']);
  assert.equal(contexts.blockContextEntryByType.search.editorType,undefined);
  assert.deepEqual([...contexts.blockContexts(contexts.blockContextEntryByType.video)],['block-editor']);
});

test('context selection retains visited specimens and rejects unsupported contexts',()=>{
  const supported=['block-editor','site-editor-styles'];
  let state=contexts.initialBlockContext(supported);
  assert.equal(state.active,'block-editor');
  state=contexts.activateBlockContext(state,'site-editor-styles',supported);
  state=contexts.activateBlockContext(state,'block-editor',supported);
  assert.deepEqual([...state.visited],supported);
  assert.equal(contexts.activateBlockContext(state,'site-editor-styles',['block-editor']),state);
});

test('site-style history and reset are isolated from the editor and context selection',()=>{
  let context=contexts.initialBlockContext(['block-editor','site-editor-styles']);
  let history=styles.stylesPreviewReducer(styles.createStylesPreview(),{type:'block-style',scope:'global',block:'image',patch:{borderRadius:'12px'}});
  const saved=history;
  context=contexts.activateBlockContext(context,'site-editor-styles',['block-editor','site-editor-styles']);
  context=contexts.activateBlockContext(context,'block-editor',['block-editor','site-editor-styles']);
  assert.equal(history,saved);assert.equal(history.past.length,1);
  history=styles.stylesPreviewReducer(history,{type:'undo'});assert.equal(history.future.length,1);
  history=styles.stylesPreviewReducer(history,{type:'redo'});assert.equal(history.present.global.blockStyles.image.borderRadius,'12px');
  history=styles.stylesPreviewReducer(history,{type:'hydrate',values:styles.createStylesPreview().present});
  assert.equal(history.past.length,0);assert.equal(history.future.length,0);assert.equal(history.present.global.blockStyles,undefined);
  assert.equal(context.active,'block-editor');
});
