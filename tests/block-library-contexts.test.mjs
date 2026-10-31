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

test('main canvas resolves website device/variation/state styles while authored block values retain precedence',async()=>{
  const {projectWebsiteDesignBlocks}=await load('../app/studio/site-editor/website-design-surface.tsx');
  const {rebaseWebsiteDesignEdit}=await load('../app/studio/site-editor/website-design-edit.ts');
  const selection={paletteId:'default',typographyId:'default',blockStyles:{image:{borderRadius:'12px',responsive:{mobile:{borderRadius:'24px'}}},button:{textColor:'#112233',interactionStates:{hover:{textColor:'#445566'}}}}};
  const saved=JSON.stringify(selection);
  const mobile=contexts.blockContextCanvasStyles(selection,'image',undefined,'mobile');
  const ordinary={id:'image',type:'image',src:'/image.png',alt:'Original'};
  assert.equal(projectWebsiteDesignBlocks([ordinary],mobile)[0].visualStyle.borderRadius,'24px');
  const authored={...ordinary,visualStyle:{borderRadius:'8px'}};
  assert.equal(projectWebsiteDesignBlocks([authored],mobile)[0].visualStyle.borderRadius,'8px');
  const projected=projectWebsiteDesignBlocks([ordinary],mobile)[0];
  const edited=rebaseWebsiteDesignEdit(ordinary,projected,{...projected,alt:'Changed'});
  assert.equal(edited.alt,'Changed');assert.equal(edited.visualStyle,undefined);
  const rounded=contexts.blockContextCanvasStyles({paletteId:'default',typographyId:'default'},'image','rounded','desktop');
  assert.equal(projectWebsiteDesignBlocks([ordinary],rounded)[0].visualStyle.borderRadius,'9999px');
  const hover=contexts.blockContextCanvasStyles(selection,'button',undefined,'desktop','hover');
  assert.equal(hover.blockStyles.button.textColor,'#445566');
  assert.equal(JSON.stringify(selection),saved);assert.equal(ordinary.visualStyle,undefined);
});

test('Navigation Edit projects website defaults and rebases node edits without persisting inherited styles',async()=>{
  const templates=await load('../app/studio/template-model.ts');
  const {rebaseWebsiteDesignEdit}=await load('../app/studio/site-editor/website-design-edit.ts');
  const canonical=templates.templateEditorBlocks([{id:'navigation',type:'element',element:'navigation',overlayMenu:'mobile',gap:16}])[0];
  const before=JSON.stringify(canonical);
  const projected=contexts.projectLibraryNavigationBlock(canonical,{paletteId:'default',typographyId:'default',blockStyles:{navigation:{textColor:'#123456',fontSizeCustom:'30px'}}});
  assert.match(projected.visualStyle.className,/site-block-style-navigation/);assert.equal(projected.visualStyle.fontSizeCustom,'30px');
  const node=templates.templateNodesFromBlocks([projected])[0];
  const edited=templates.templateEditorBlocks([{...node,overlayMenu:'always'}])[0];
  const rebased=rebaseWebsiteDesignEdit(canonical,projected,edited);
  assert.equal(rebased.data.overlayMenu,'always');assert.equal(rebased.visualStyle,undefined);assert.equal(JSON.stringify(canonical),before);
});
