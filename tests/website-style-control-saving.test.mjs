import test from 'node:test';
import assert from 'node:assert/strict';
import * as React from 'react';
import { createIsolatedModuleLoader } from './production-module.mjs';

// Exercise the production compositions and callbacks without owning a browser store.
let slots = [], cursor = 0;
const load = createIsolatedModuleLoader({ globals: { Blob, crypto, fetch: (...args) => globalThis.fetch(...args) }, overrides: { react: {
 ...React, useState(initial) { const index = cursor++; if (!(index in slots)) slots[index] = typeof initial === 'function' ? initial() : initial; return [slots[index], value => { slots[index] = typeof value === 'function' ? value(slots[index]) : value; }]; },
 useRef: value => ({ current: value }), useMemo: fn => fn(), useEffect() {}, useLayoutEffect() {}, useId: () => ':save-check:',
} } });
const { BlockStyleSections, BlockStyleLength } = load('./app/studio/site-editor/block-style-sections.tsx');
const { blockStyleProfiles } = load('./app/studio/site-editor/block-style-profiles.ts');
const { createStylesPreview, stylesPreviewReducer, previewStyleDetails } = load('./app/studio/site-editor/styles-preview-state.ts');
const { serialiseWebsiteDesign, hydrateWebsiteDesign } = load('./app/studio/site-editor/website-design.ts');
const { TypographyElementSettings } = load('./app/studio/site-editor/typography-element-settings.tsx');
const { ColoursPreview } = load('./app/studio/site-editor/colours-preview.tsx');
const { ParagraphLengthSetting } = load('./app/studio/controls/paragraph-length-setting.tsx');
const { CustomFontSizeSetting } = load('./app/studio/controls/custom-font-size-setting.tsx');
const { CustomPaletteEditor } = load('./app/studio/controls/custom-palette-editor.tsx');
const { newShadowLayer } = load('./app/studio/site-editor/shadows-preview-model.ts');
const { resolveFontSizePresets } = load('./app/studio/site-editor/typography-preview-model.ts');
const { editableBackgroundGradient } = load('./app/content/background-gradient.ts');
const { referenceSpacing } = load('./app/studio/site-editor/reference-spacing.ts');
const { normaliseCustomFontSize } = load('./app/content/font-size.ts');
const { validParagraphStyle } = load('./app/studio/workspace-validation.ts');
const { canAddWebsiteStyleEntry } = load('./app/studio/site-editor/website-style-limits.ts');
const units = ['px', '%', 'em', 'rem', 'vw', 'vh'];
function nodes(value) { return !value || typeof value !== 'object' ? [] : Array.isArray(value) ? value.flatMap(nodes) : [value, ...nodes(value.props?.children), ...nodes(value.props?.imageControl)]; }
function render(component, props) { cursor = 0; return component(props); }
async function roundTrip(styles) { const saved = await serialiseWebsiteDesign({}, styles); assert.deepEqual((await hydrateWebsiteDesign(saved, value => value)).styles, saved.styles); return saved.styles; }

test('all block style compositions emit saveable presets, units, choices, clears and resets in every device/state container', async () => {
 const outputs = []; let origin;
 for (const id of Object.keys(blockStyleProfiles)) {
  slots = []; const authored = { headingColors: Object.fromEntries([1,2,3,4,5,6].map(level => [level, 'red'])) };
  const tree = render(BlockStyleSections, { id, value: authored, authored, fontSelectionValue: '', selection: createStylesPreview().present.global, viewport: 'desktop', onChange: patch => outputs.push({ id, origin, patch }) });
  for (const node of nodes(tree)) {
   const type = node.type?.name, p = node.props; if (!type || !p) continue; origin = `${id}/${type}/${p.label ?? p.title ?? ''}`;
   if (type === 'PaletteColourSetting') { for (const value of [undefined, '#12345680']) p.onChange(value); for (const entry of p.palette ?? []) { p.onSelectPalette?.(entry, 'default'); if (p.onHoverChange) p.onSelectPalette?.(entry, 'hover'); } p.onHoverChange?.(undefined); }
   else if (type === 'FontFamilySelect' || type === 'FontAppearanceSelect') for (const option of p.options) p.onChange(option.value);
   else if (type === 'FontSizeAppearanceSetting') { for (const option of p.presetChoices) p.onSizeChange(option.value); p.onSizeChange(undefined); for (const unit of ['px','em','rem','vw','vh']) for (const amount of [0.1,25,400]) p.onCustomSizeChange(normaliseCustomFontSize(amount, unit)); p.onCustomSizeChange(undefined); }
   else if (type === 'LineHeightSetting') for (const value of [undefined, ...(p.label === 'Columns' ? ['1','4','5','6'] : ['0.1','1.5','10'])]) p.onChange(value);
   else if (type === 'BlockStyleLength' || type === 'ParagraphLengthSetting') for (const unit of p.units ?? units) for (const amount of [p.min ?? 0, 0, 0.1, p.max ?? 10000]) p.onChange(`${amount}${unit}`);
   else if (type === 'RadioGroup') for (const option of p.options) p.onChange(option.value);
   else if (type === 'ToggleSetting') for (const value of [true,false]) p.onChange(value);
   else if (type === 'BoxLengthSetting') { p.onChange(undefined); for (const preset of p.presetValues ?? []) p.onChange(preset.value); for (const unit of p.unitOptions ?? units) for (const amount of [p.min,0.1,p.max]) p.onChange(`${amount}${unit}`); p.onChange('1px 2em 3rem 4%'); if (['Padding','Margin','Cell padding'].includes(p.label)) p.onChange(`${referenceSpacing[4].value} 0px`); }
   else if (type === 'BackgroundSelection') { p.onColourChange(undefined); p.onColourChange('#12345680'); for (const entry of p.palette ?? []) p.onSelectPalette?.(entry); if (p.allowGradient) { p.onGradientChange(editableBackgroundGradient()); p.onGradientChange(undefined); } }
   else if (type === 'BorderSettings') { for (const borderStyle of ['none','solid','dashed','dotted']) p.onChange({ borderStyle }); for (const entry of p.palette ?? []) p.onSelectPalette?.(entry); for (const unit of p.unitOptions) p.onChange({ borderWidth: `1${unit}`, borderStyle: 'solid' }); }
   else if (type === 'ShadowPresetSelect') for (const option of p.choices) p.onChange(option.id);
   else if (type === 'ElementColourSetting') { for (const value of [undefined,'#12345680']) { p.onForeground(value); p.onBackground(value); p.onHover?.(value); } p.onGradient(editableBackgroundGradient(),'sample-gradient'); p.onGradient(undefined,undefined); }
   else if (type === 'DuotoneControl') for (const value of [undefined,null,{ dark: '#123456', light: '#ffffff' }]) p.onChange(value);
   else if (type === 'AdvancedFieldsControl') for (const value of ['', 'color: red;', '&:hover { color: red; }']) p.onChange('additionalCss',value);
   else if (type === 'InspectorToolsSection') { p.onReset?.(); for (const option of p.resettableOptions ?? []) p.onResetOption?.(option); }
   else if (type === 'BlockBackgroundImage') p.onChange({backgroundImage:null,imageSize:'tile',imageRepeat:false,imageFocalX:0,imageFocalY:100});
   else if (typeof p.onChange === 'function') assert.fail(`Add save cases for the new production control: ${origin}`);
  }
 }
 assert.equal(Object.keys(blockStyleProfiles).length,32);
 assert.ok(outputs.length > 5000);
 for (const { id, origin: label, patch } of outputs) for (const context of [{ viewport:'desktop' }, { viewport:'tablet' }, { viewport:'mobile' }, { viewport:'mobile',pseudoState:'hover' }, { viewport:'desktop',variation:blockStyleProfiles[id].variations[0]?.id }]) {
  const state = stylesPreviewReducer(createStylesPreview(), { type:'block-style',scope:'test',block:id,...context,patch });
  try { await roundTrip(state.present.test); } catch (error) { throw new Error(`${label} ${JSON.stringify(context)} ${JSON.stringify(patch)}`, { cause:error }); }
 }
 assert.equal(validParagraphStyle({ responsive:{ mobile:{ textColumns:6 } } }),false,'document limits remain separate');
});

test('background images remain portable through style serialisation and hydration',async()=>{
 const bytes=new Uint8Array(24);bytes.set([137,80,78,71,13,10,26,10]);bytes.set([73,72,68,82],12);
 const image={id:'11111111-1111-4111-8111-111111111111',name:'Example',altText:'Example',blob:new Blob([bytes],{type:'image/png'})};
 const saved=await serialiseWebsiteDesign({},{background:{image,size:'tile',width:100,widthUnit:'%'},blockStyles:{group:{backgroundImage:image}}});
 assert.match(saved.styles.background.image.src,/^\/media\//);assert.equal(saved.styles.background.image.blob,undefined);
 const previous=globalThis.fetch;globalThis.fetch=async()=>new Response(bytes,{headers:{'Content-Type':'image/png'}});
 try{const loaded=await hydrateWebsiteDesign(saved,s=>s);assert.equal(loaded.styles.background.image.blob.size,24);assert.equal(loaded.styles.blockStyles.group.backgroundImage.blob.size,24);}finally{globalThis.fetch=previous;}
});

test('actual element colour Clear callbacks preserve explicit clearing through saving and inheritance', async () => {
 const selection = createStylesPreview().present.global, details = previewStyleDetails(selection);
 slots = []; let state = createStylesPreview();
 const tree = render(TypographyElementSettings, { role:'text',typography:details.typography,palette:details.palette,settings:{},onChange:patch => { state=stylesPreviewReducer(state,{type:'element',scope:'test',role:'text',patch}); },onReset(){} });
 nodes(tree).find(node => node.type?.name === 'PaletteColourSetting').props.onChange(undefined);
 assert.equal((await roundTrip(state.present.test)).typography.elements.text.colour,'');
 for (const field of ['onForeground','onBackground','onHover']) {
  slots=[];state=createStylesPreview();
  const panel=render(ColoursPreview,{selection,authored:{},scope:'test',dispatch:action=>{state=stylesPreviewReducer(state,action);},onBack(){}});
  const row=nodes(panel).find(node=>node.type?.name==='ElementColour'&&node.props.role===(field==='onHover'?'links':'headings'));
  render(row.type,row.props).props[field](undefined);
  const saved=await roundTrip(state.present.test);
  assert.ok(JSON.stringify(saved).includes('""'));
 }
});

test('measurement inputs emit portable decimal lengths for small values',async()=>{
 for(const [component,props,field] of [[BlockStyleLength,{label:'Letter spacing',min:-100},'letterSpacing'],[ParagraphLengthSetting,{label:'Line indent',min:-100,max:200,presentation:'input-first'},'textIndent'],[ParagraphLengthSetting,{label:'Minimum height',min:0,max:1000,presentation:'input-first'},'minHeight'],[CustomFontSizeSetting,{},'fontSizeCustom']]){
  slots=[];let patch;const p={...props,onChange:value=>{patch={[field]:value};}};let tree=render(component,p);
  const input=()=>nodes(tree).find(node=>node.type?.name==='NumberUnitField');
  input().props.inputProps.onChange({target:{value:'0.0000001'}});tree=render(component,p);input().props.inputProps.onBlur();
  assert.equal(patch[field],'0.0000001px');await roundTrip({blockStyles:{paragraph:patch}});
 }
});

test('plain custom names are saveable without allowing resource CSS',async()=>{
 for(const name of ['Header; {wide} \\ <label>','https://example.test/name','Normal & light'])await roundTrip({shadows:{custom:{name,layers:[newShadowLayer('one')]}},colours:{custom:{colour:{id:'colour',name,colour:'#123456'}},gradients:{gradient:{id:'gradient',name,gradient:editableBackgroundGradient()}}},typography:{presets:{custom:{...resolveFontSizePresets()[0],id:'custom',name}}}});
 await assert.rejects(serialiseWebsiteDesign({},{blockStyles:{paragraph:{backgroundColor:'url(https://example.test/image)'}}}));
});

test('creation limits retain saveable drafts and retired references after repeated add/remove',async()=>{
 let state=createStylesPreview();
 for(let index=0;index<200;index++){
  const id=`custom-${index}`;state=stylesPreviewReducer(state,{type:'colours',scope:'test',patch:{custom:{[id]:{id,name:id,colour:'#000000'}}}});
  state=stylesPreviewReducer(state,{type:'remove-colour',scope:'test',id});
 }
 assert.equal(canAddWebsiteStyleEntry(state.present.test.colours.custom,state.present.test.colours.retired),false);
 const before=state;state=stylesPreviewReducer(state,{type:'colours',scope:'test',patch:{custom:{extra:{id:'extra',name:'Extra',colour:'#000000'}}}});assert.equal(state.present,before.present);assert.match(state.notice,/style limit/);await roundTrip(state.present.test);
 for(const kind of ['shadow','font-preset']){
  let next=createStylesPreview();for(let index=0;index<201;index++)next=stylesPreviewReducer(next,kind==='shadow'?{type:kind,scope:'test',id:`s${index}`,patch:{name:'Shadow',layers:[newShadowLayer('one')]}}:{type:kind,scope:'test',id:`s${index}`,preset:{...resolveFontSizePresets()[0],id:`s${index}`}});
  assert.equal(Object.keys(kind==='shadow'?next.present.test.shadows:next.present.test.typography.presets).length,200);await roundTrip(next.present.test);
 }
 state=stylesPreviewReducer(createStylesPreview(),{type:'shadow',scope:'test',id:'custom',patch:{layers:Array.from({length:20},(_,n)=>newShadowLayer(`x${n}`))}});
 const full=state;state=stylesPreviewReducer(state,{type:'shadow',scope:'test',id:'custom',patch:{layers:Array.from({length:21},(_,n)=>newShadowLayer(`x${n}`))}});assert.equal(state.present,full.present);assert.match(state.notice,/style limit/);await roundTrip(state.present.test);
 slots=[];let added=false;const tree=render(CustomPaletteEditor,{colours:[],entries:[],canAdd:false,onAdd(){added=true;},onChange(){},onRemove(){},onRemoveAll(){}});const button=nodes(tree).find(node=>node.props?.['aria-label']==='Add Colour');assert.equal(button.props.disabled,true);button.props.onClick();assert.equal(added,false);
});

test('removing inherited choices at the creation limit retains saveable recovery tombstones',async()=>{
 const colours=Object.fromEntries(Array.from({length:200},(_,n)=>[`own-${n}`,{id:`own-${n}`,name:'Own',colour:'#000000'}]));
 let state=createStylesPreview();state=stylesPreviewReducer(state,{type:'hydrate',values:{global:{colours:{custom:{inherited:{id:'inherited',name:'Inherited',colour:'#123456'}}}},test:{colours:{custom:colours}},test2:{}}});
 state=stylesPreviewReducer(state,{type:'remove-colour',scope:'test',id:'inherited'});assert.equal(state.present.test.colours.custom.inherited,null);await roundTrip(state.present.test);
 state=stylesPreviewReducer(state,{type:'remove-custom-colours',scope:'test'});assert.equal(Object.values(state.present.test.colours.custom).filter(Boolean).length,0);await roundTrip(state.present.test);
 const shadows=Object.fromEntries(Array.from({length:200},(_,n)=>[`own-${n}`,{name:'Own',layers:[newShadowLayer('one')]}]));
 state=stylesPreviewReducer(createStylesPreview(),{type:'hydrate',values:{global:{shadows:{inherited:{name:'Inherited',layers:[newShadowLayer('one')]}}},test:{shadows},test2:{}}});
 state=stylesPreviewReducer(state,{type:'delete-shadow',scope:'test',id:'inherited'});assert.equal(state.present.test.shadows.inherited,null);await roundTrip(state.present.test);
 const gradient=editableBackgroundGradient();const gradients=Object.fromEntries(Array.from({length:200},(_,n)=>[`own-${n}`,{id:`own-${n}`,name:'Own',gradient}]));
 state=stylesPreviewReducer(createStylesPreview(),{type:'hydrate',values:{global:{colours:{gradients:{inherited:{id:'inherited',name:'Inherited',gradient}}}},test:{colours:{gradients}},test2:{}}});
 state=stylesPreviewReducer(state,{type:'remove-gradient',scope:'test',id:'inherited'});assert.equal(state.present.test.colours.gradients.inherited,null);await roundTrip(state.present.test);
});

test('website device allowances retain the existing invalid-data boundaries',async()=>{
 for(const responsive of [{mobile:{}},{phone:{textColumns:2}},{mobile:{textColumns:7}},{mobile:{textColumns:1.5}},{mobile:{backgroundImageMediaId:'example'}},{mobile:{responsive:{tablet:{padding:'1px'}}}},{mobile:{textColor:'var(--colour);color:red'}},{mobile:{padding:'-1px'}}])await assert.rejects(serialiseWebsiteDesign({},{blockStyles:{paragraph:{responsive}}}));
 await roundTrip({blockStyles:{paragraph:{responsive:{mobile:{textColumns:6,margin:'-1px',textColor:'var(--site-palette-theme-1)'}}}}});
});

test('exhausted recovery capacity reports the rejected action and Reset restores editing',async()=>{
 const custom=Object.fromEntries(Array.from({length:400},(_,n)=>[`retired-${n}`,null]));
 let state=stylesPreviewReducer(createStylesPreview(),{type:'hydrate',values:{global:{colours:{custom:{inherited:{id:'inherited',name:'Inherited',colour:'#123456'}}}},test:{colours:{custom}},test2:{}}});
 const before=state.present;state=stylesPreviewReducer(state,{type:'remove-colour',scope:'test',id:'inherited'});
 assert.equal(state.present,before);assert.match(state.notice,/Reset styles/);await roundTrip(state.present.test);
 state=stylesPreviewReducer(state,{type:'reset',scope:'test'});assert.equal(state.notice,undefined);await roundTrip(state.present.test);
});
