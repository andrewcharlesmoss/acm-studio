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
  assert.equal(inherited['Font size'],true);assert.equal(inherited.Padding,true);assert.equal(inherited.Font,true);
  assert.equal(labels.inheritedSettingLabels(effective,{fontSize:'small'},model.contentSettingFields)['Font size'],false);
  const child={id:'child',type:'button',label:'Button',visualStyle:{},interactionStyles:{hover:{borderWidth:'3px'}}};
  const parent={id:'group',type:'buttons',children:[child],visualStyle:{buttonTextColor:'#123456'}};
  const state=model.effectiveContentSettingStyle(child,styles,'desktop','hover',[parent]);
  assert.equal(state.textColor,'#123456');assert.equal(state.borderWidth,'3px');
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
