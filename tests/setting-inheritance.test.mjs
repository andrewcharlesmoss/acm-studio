import assert from 'node:assert/strict';
import test from 'node:test';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {loadProductionModule} from './production-module.mjs';

const labels = await loadProductionModule(new URL('../app/studio/controls/setting-inheritance.tsx', import.meta.url));
const model = await loadProductionModule(new URL('../app/studio/blocks/style-inheritance.tsx', import.meta.url));

test('font size alternatives remain inherited until explicitly authored, even with equal values',()=>{
  const effective={websitePreset:'xx-large',fontSizeCustom:'48px'};
  assert.equal(labels.inheritedSettingLabels(effective,{},model.contentSettingFields)['Font size'],true);
  assert.equal(labels.inheritedSettingLabels(effective,{fontSizeCustom:'48px'},model.contentSettingFields)['Font size'],false);
  assert.equal(labels.inheritedSettingLabels(effective,{fontSize:'xx-large'},model.contentSettingFields)['Font size'],false);
  assert.equal(labels.inheritedSettingLabels(effective,{},model.contentSettingFields)['Font size'],true);
});

test('independent border and appearance values retain partial inheritance; background alternatives do not',()=>{
  const effective={borderColor:'#111111',borderWidth:'2px',websiteWeight:700,websiteItalic:true,backgroundGradient:{type:'linear'}};
  const inherited=labels.inheritedSettingLabels(effective,{borderWidth:'2px',websiteWeight:700,backgroundColor:'#ffffff'},model.contentSettingFields);
  assert.equal(inherited.Border,true);assert.equal(inherited.Appearance,true);assert.equal(inherited.Gradient,false);
  assert.equal(inherited['Border width'],false);assert.equal(inherited['Border colour'],true);
});

test('canonical website, responsive, interaction and ancestor values supply inheritance metadata',()=>{
  const block={id:'p',type:'paragraph',text:'Hello',style:{fontSize:'small'}};
  const styles={paletteId:'default',typographyId:'default',blockStyles:{paragraph:{websitePreset:'xx-large',padding:'20px'}}};
  const effective=model.effectiveContentSettingStyle(block,styles,'mobile');
  const inherited=labels.inheritedSettingLabels(effective,{},model.contentSettingFields);
  assert.equal(inherited['Font size'],true);assert.equal(inherited.Padding,true);assert.equal(inherited.Font,false);
  assert.equal(labels.inheritedSettingLabels(effective,{fontSize:'small'},model.contentSettingFields)['Font size'],false);
  const child={id:'child',type:'button',label:'Button',visualStyle:{},interactionStyles:{hover:{borderWidth:'3px'}}};
  const parent={id:'group',type:'buttons',children:[child],visualStyle:{buttonTextColor:'#123456'}};
  const state=model.effectiveContentSettingStyle(child,styles,'desktop','hover',[parent]);
  assert.equal(state.textColor,'#123456');assert.equal(state.borderWidth,'3px');
});

test('pristine, reset and reference variation settings stay unmarked while explicit equal baseline values count',async()=>{
  const block={id:'p',type:'paragraph',text:'Hello',style:{}};
  const blank={paletteId:'default',typographyId:'default'};
  assert.ok(Object.values(model.contentSettingInheritance(block,{},blank,'desktop')).every(value=>!value));
  const explicit={...blank,typography:{elements:{text:{size:'1.38rem'}}}};
  const inherited=model.contentSettingInheritance(block,{},explicit,'desktop');
  assert.equal(inherited['Font size'],true);assert.equal(inherited.Font,false);assert.equal(inherited.Appearance,false);assert.equal(inherited['Line height'],false);
  assert.equal(model.contentSettingInheritance({...block,style:{fontSizeCustom:'1.38rem'}},{fontSizeCustom:'1.38rem'},explicit,'desktop')['Font size'],false);
  assert.equal(model.contentSettingInheritance(block,{},blank,'desktop')['Font size'],false);
  const variation={...block,style:{className:'is-style-display'}};
  assert.ok(Object.values(model.contentSettingInheritance(variation,variation.style,blank,'desktop')).every(value=>!value));
  const {PaletteColourSetting}=await loadProductionModule(new URL('../app/studio/controls/palette-colour-setting.tsx',import.meta.url));
  const html=renderToStaticMarkup(createElement(PaletteColourSetting,{label:'Colour',row:true,inheritedValue:'#000000',defaultWarning:true,onChange(){}}));
  assert.doesNotMatch(html,/studio-inherited-indicator/);assert.match(html,/paragraph-palette-warning-icon/);assert.match(html,/#000000/);
});

test('palette and preset provenance is property specific and never based on value inequality',async()=>{
  const {explicitTypographyFields,explicitPaletteColour}=await loadProductionModule(new URL('../app/studio/site-editor/style-provenance.ts',import.meta.url));
  const blank={paletteId:'default',typographyId:'default'};
  assert.equal(explicitPaletteColour({...blank,colours:{theme:{'3':'#ffee58'}}},'text'),false);
  assert.equal(explicitPaletteColour({...blank,colours:{theme:{'1':'#111111'}}},'text'),true);
  const explicit={...blank,typography:{presets:{large:{id:'large',name:'Large',size:'1.38rem',fluid:false,min:'1.38rem',max:'1.38rem'}}}};
  assert.equal(explicitTypographyFields(explicit,'text').preset,'large');
  assert.equal(explicitTypographyFields(explicit,'buttons').preset,undefined);
  assert.equal(explicitTypographyFields(blank,'text').preset,undefined);
  const themes=await loadProductionModule(new URL('../app/studio/site-editor/style-reference-data.ts',import.meta.url));
  const selected={...blank,typographyId:themes.styleTypography.find(theme=>theme.id!=='default').id};
  const fields=explicitTypographyFields(selected,'text');
  assert.ok(fields.family);assert.equal(fields.align,undefined);assert.equal(fields.decoration,undefined);assert.equal(fields.transform,undefined);assert.equal(fields.fontStyle,undefined);
});

test('untouched website owners and reference block controls render without inherited symbols',async()=>{
  const blank={paletteId:'default',typographyId:'default'};
  const {previewStyleDetails}=await loadProductionModule(new URL('../app/studio/site-editor/styles-preview-state.ts',import.meta.url));
  const {referencePreviewBlockStyles}=await loadProductionModule(new URL('../app/studio/site-editor/blocks-preview-model.ts',import.meta.url));
  const details=previewStyleDetails(blank);
  for(const [file,exported,extra] of [
    ['layout-preview','LayoutPreview',{}],['background-preview','BackgroundPreview',{}],['colours-preview','ColoursPreview',{}],['shadows-preview','ShadowsPreview',{}],
    ['typography-element-settings','TypographyElementSettings',{role:'text',typography:details.typography,palette:details.palette,settings:{},onChange(){},onReset(){}}],
    ['block-style-sections','BlockStyleSections',{id:'code',value:referencePreviewBlockStyles().code,fontSelectionValue:'',viewport:'desktop',onChange(){}}],
  ]){
    const module=await loadProductionModule(new URL(`../app/studio/site-editor/${file}.tsx`,import.meta.url));
    const html=renderToStaticMarkup(createElement(module[exported],{selection:blank,authored:{},scope:'global',dispatch(){},onBack(){},...extra}));
    assert.doesNotMatch(html,/class="studio-inherited-indicator"/,file);
  }
});

test('reference paint masks role sources, while only consumed explicit palette and preset changes count',async()=>{
  const {referencePreviewBlockStyles}=await loadProductionModule(new URL('../app/studio/site-editor/blocks-preview-model.ts',import.meta.url));
  const block={id:'code',type:'code',code:'Hello'};
  const selection={paletteId:'default',typographyId:'default',typography:{elements:{text:{size:'99px'}}}};
  const painted={...selection,blockStyles:referencePreviewBlockStyles()};
  assert.equal(model.contentSettingInheritance(block,{},selection,'desktop','default',[],undefined,painted)['Font size'],false);
  const explicit={...selection,typography:{...selection.typography,presets:{medium:{id:'medium',name:'Medium',size:'1rem',min:'1rem',max:'1rem',fluid:false}}},colours:{theme:{'1':'#111111'}}};
  const inherited=model.contentSettingInheritance(block,{},explicit,'desktop','default',[],undefined,painted);
  assert.equal(inherited['Font size'],true);assert.equal(inherited.Colour,true);
  assert.equal(model.blockSettingProvenance({websiteWeight:700,websiteItalic:true},{},{appearance:'regular'},selection).websiteItalic,undefined);
  assert.equal(model.blockSettingProvenance({websiteWeight:700,websiteItalic:true},{},{websiteWeight:400},selection).websiteItalic,true);
});

test('Link provenance follows explicit Typography Links colour and Colours Links hover independently',()=>{
  const block={id:'p',type:'paragraph',text:'Linked text'};
  const blank={paletteId:'default',typographyId:'default'};
  assert.equal(model.contentSettingInheritance(block,{},blank,'desktop').Link,false);
  const selection={...blank,typography:{elements:{links:{colour:'#111111'}}}};
  assert.equal(model.contentSettingInheritance(block,{},selection,'desktop').Link,true);
  const local={...block,style:{linkColor:'#111111'}};
  assert.equal(model.contentSettingInheritance(local,local.style,selection,'desktop').Link,false);
  const hover={...selection,colours:{elements:{links:{hover:'#222222'}}}};
  assert.equal(model.contentSettingInheritance(local,local.style,hover,'desktop').Link,true);
});

test('shared label renders the established symbol and accessible inheritance state without a tooltip',()=>{
  const html=renderToStaticMarkup(createElement(labels.SettingInheritanceProvider,{values:{'Font size':true}},createElement(labels.SettingLabel,null,'Font size')));
  assert.match(html,/data-inherited="true"/);assert.match(html,/studio-inherited-indicator/);assert.match(html,/Inherited/);assert.doesNotMatch(html,/title=/);
  const local=renderToStaticMarkup(createElement(labels.SettingLabel,null,'Font size'));
  assert.doesNotMatch(local,/studio-inherited-indicator/);
});

test('appearance keeps independently inherited weight/style, while local content appearance replaces website appearance',()=>{
  const definition={Appearance:{fields:['weight','fontStyle'],independent:true}};
  assert.equal(labels.inheritedSettingLabels({weight:700,fontStyle:'italic'},{weight:700},definition).Appearance,true);
  assert.equal(labels.inheritedSettingLabels({weight:700,fontStyle:'italic'},{fontStyle:'italic'},definition).Appearance,true);
  const block={id:'p',type:'paragraph',text:'Hello',style:{appearance:'bold'}};
  const style=model.effectiveContentSettingStyle(block,{paletteId:'default',typographyId:'default',blockStyles:{paragraph:{websiteWeight:400,websiteItalic:false}}},'desktop');
  assert.equal(style.websiteWeight,undefined);assert.equal(style.websiteItalic,undefined);
  assert.equal(labels.inheritedSettingLabels(style,block.style,model.contentSettingFields).Appearance,false);
});

test('synthetic List Item uses explicit List ownership and inherits its styles rather than Paragraph defaults',()=>{
  const item={id:'list-item-0',type:'paragraph',text:'Item',style:{}};
  const list={id:'list',type:'list',style:'unordered',items:['Item'],visualStyle:{fontSize:'large',linkColor:'#abcdef'}};
  const selection={paletteId:'default',typographyId:'default',blockStyles:{paragraph:{fontSizeCustom:'99px'}}};
  const effective=model.effectiveContentSettingStyle(item,selection,'desktop','default',[list],'list');
  assert.equal(effective.fontSize,'large');assert.equal(effective.fontSizeCustom,undefined);assert.equal(effective.linkColor,'#abcdef');
});

test('semantic lookup labels retain inheritance for controls with rich visible labels',async()=>{
  const {ToggleSetting}=await loadProductionModule(new URL('../app/studio/controls/toggle-setting.tsx',import.meta.url));
  const html=renderToStaticMarkup(createElement(labels.SettingInheritanceProvider,{values:{'Drop cap':true}},createElement(ToggleSetting,{label:createElement('span',null,'Drop cap'),inheritanceLabel:'Drop cap',checked:false,onChange(){}})));
  assert.match(html,/studio-inherited-indicator/);
});

test('native Button width ownership suppresses inherited site width, including equal values and interaction states',()=>{
  const selection={paletteId:'default',typographyId:'default',blockStyles:{button:{buttonWidth:'50%'}}};
  const block={id:'button',type:'button',label:'Button',visualStyle:{}};
  assert.equal(model.contentSettingInheritance(block,{},selection,'desktop').Width,true);
  const local={...block,width:50};
  assert.equal(model.effectiveContentSettingStyle(local,selection,'desktop').buttonWidth,'50%');
  assert.equal(model.contentSettingInheritance(local,{},selection,'desktop').Width,false);
  assert.equal(model.contentSettingInheritance(local,{},selection,'desktop','hover').Width,true);
  assert.equal(model.contentSettingInheritance(local,{},undefined,'desktop','hover').Width,true);
  const hover={...local,interactionStyles:{hover:{width:50}}};
  assert.equal(model.contentSettingInheritance(hover,{},selection,'desktop','hover').Width,false);
});
