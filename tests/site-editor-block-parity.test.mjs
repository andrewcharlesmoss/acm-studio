import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { loadProductionModule } from './production-module.mjs';
const model = await loadProductionModule(new URL('../app/studio/site-editor/blocks-preview-model.ts', import.meta.url));
const { projectWebsiteDesignBlocks } = await loadProductionModule(new URL('../app/studio/site-editor/website-design-surface.tsx', import.meta.url));
const { BlockStyleSpecimen } = await loadProductionModule(new URL('../app/studio/site-editor/block-style-specimen.tsx', import.meta.url));
const { BlockPreviewRules } = await loadProductionModule(new URL('../app/studio/site-editor/block-preview-rules.tsx', import.meta.url));
const { validateWebsiteStyles } = await loadProductionModule(new URL('../app/studio/site-editor/website-style-validation.ts', import.meta.url));
const { createStylesPreview, resolvePreviewStyle } = await loadProductionModule(new URL('../app/studio/site-editor/styles-preview-state.ts', import.meta.url));
const selection = resolvePreviewStyle(createStylesPreview().present, 'test');

test('plain Quote receives Quote variation defaults without borrowing Pullquote', () => {
 const source = [{id:'q',type:'quote',quoteStyle:'plain',text:'Quote'}];
 const styles = {quote:{textColor:'red',variations:{plain:{textColor:'blue',padding:'7px'}}},pullquote:{textColor:'green'}};
 const output = projectWebsiteDesignBlocks(source,{...selection,blockStyles:styles})[0];
 assert.equal(output.visualStyle.textColor,'blue');
 assert.equal(output.visualStyle.padding,'7px');
 assert.match(output.visualStyle.className,/site-block-style-quote/);
 assert.doesNotMatch(output.visualStyle.className,/site-block-style-pullquote/);
 assert.equal(model.applyPreviewBlockStyles([{...source[0],visualStyle:{className:'is-pullquote'}}],styles)[0].visualStyle.textColor,'green');
 assert.equal(source[0].visualStyle,undefined);
});

test('Button widths preserve each unit, legacy percentages and zero', () => {
 assert.equal(model.previewButtonWidth('50'),'50%');
 for (const unit of ['px','%','em','rem','vw','vh']) {
  const value=`20${unit}`;
  assert.equal(model.previewButtonWidth(value),value);
  assert.ok(model.previewButtonItemWidth(value).includes(value));
 }
 assert.equal(model.previewButtonWidth('0px'),'0px');
 assert.equal(model.previewButtonWidth('0'),'0%');
 assert.equal(model.previewButtonWidth('5px; color:red'),undefined);
 const html=renderToStaticMarkup(createElement(BlockPreviewRules,{selection:{...selection,blockStyles:{button:{buttonWidth:'80px'}}},scopeId:'width'}));
 assert.match(html,/--button-item-width:80px/);
 assert.doesNotMatch(html,/80px%|NaN/);
});

test('state values resolve after device inheritance and non-Button panes use Default', () => {
 const value={websiteWeight:300,websiteItalic:false,responsive:{mobile:{textColor:'red'}},interactionStates:{hover:{websiteWeight:700,websiteItalic:true,responsive:{mobile:{textColor:'blue'}}}}};
 const hover=model.previewBlockInspectorStyle(value,'mobile','hover');
 assert.equal(hover.textColor,'blue');
 assert.equal(hover.websiteWeight,700);
 assert.equal(hover.websiteItalic,true);
 assert.equal(model.previewBlockInspectorStyle(value,'mobile').textColor,'red');
 assert.equal(hover.responsive,undefined);
});

test('every catalogue target validates and renders a canonical specimen', () => {
 for(const {id} of model.previewBlockTargets) {
  assert.doesNotThrow(()=>validateWebsiteStyles({blockStyles:{[id]:{margin:'2px'}}},()=>false),id);
  const html=renderToStaticMarkup(createElement(BlockStyleSpecimen,{id,selection,viewport:'desktop'}));
  assert.ok(html.includes('style preview'),id);
  assert.ok(html.includes('data-preview-block-id'),`${id} renders a canonical block`);
 }
});

test('column and nested container defaults preserve authored content properties', () => {
 const source=[{id:'g',type:'group',layout:'row',children:[{id:'c',type:'column',style:{padding:'3px'},children:[{id:'p',type:'paragraph',text:'Nested',style:{textColor:'blue',fontFamily:'serif'}}]}]}];
 const output=projectWebsiteDesignBlocks(source,{...selection,blockStyles:{group:{margin:'8px'},row:{padding:'10px'},column:{padding:'9px',margin:'4px'}}})[0];
 assert.equal(output.visualStyle.margin,'8px');
 assert.equal(output.visualStyle.padding,'10px');
 assert.equal(output.children[0].style.padding,'3px');
 assert.equal(output.children[0].style.margin,'4px');
 assert.equal(output.children[0].children[0].style.textColor,'blue');
 const html=renderToStaticMarkup(createElement(BlockPreviewRules,{selection:{...selection,blockStyles:{group:{textColor:'red',websiteFont:'sans-serif'}}},scopeId:'nested'}));
 assert.match(html,/:not\(\.site-block-authored-color\):not\(\.site-block-authored-color \*\)/);
 assert.match(html,/:not\(\.site-block-authored-font-family\):not\(\.site-block-authored-font-family \*\)/);
});

test('image and Featured image have independent duotone filter IDs', () => {
 const duotone={dark:'#000000',light:'#ffffff'};
 const html=renderToStaticMarkup(createElement(BlockPreviewRules,{selection:{...selection,blockStyles:{image:{duotone},'cover-image':{duotone:{dark:'#ff0000',light:'#00ff00'}}}},scopeId:'filters'}));
 const ids=[...html.matchAll(/<filter id="([^"]+)"/g)].map(match=>match[1]);
 assert.equal(ids.length,6);
 assert.equal(new Set(ids).size,6);
});


test('Group extras reach layout variants and device child guards', () => {
 const html=renderToStaticMarkup(createElement(BlockPreviewRules,{selection:{...selection,blockStyles:{group:{websiteWeight:800,blockGap:'12px',responsive:{mobile:{textColor:'red'}}}}},scopeId:'groups'}));
 for(const id of ['group','row','stack','grid']) assert.ok(html.includes(`.site-block-style-${id}`));
 assert.match(html,/--block-layout-gap:12px/);
 assert.match(html,/:not\(\.site-block-authored---studio-rs-mobile-color\):not\(\.site-block-authored---studio-rs-mobile-color \*\)/);
});

test('Embed specimen renders a canonical network-free provider placeholder', () => {
 const html=renderToStaticMarkup(createElement(BlockStyleSpecimen,{id:'embed',selection,viewport:'desktop'}));
 assert.match(html,/content-embed-placeholder/);
 assert.doesNotMatch(html,/<iframe|cannot be embedded/);
});


test('nested Embed specimens keep external content disabled through every container', async () => {
 const { BlockRenderer } = await loadProductionModule(new URL('../app/components/content.tsx', import.meta.url));
 const embed={id:'embed',type:'embed',url:'https://www.youtube.com/watch?v=jNQXAC9IVRw',title:'Example'};
 const containers=[{id:'g',type:'group',layout:'flow',children:[embed]},{id:'s',type:'section',layout:'stack',children:[embed]},{id:'cs',type:'columns',children:[{id:'c',type:'column',children:[embed]}]},{id:'q',type:'quote',text:'',children:[embed]}];
 const html=renderToStaticMarkup(createElement(BlockRenderer,{blocks:containers,variant:'studio',externalEmbedPlaceholder:true}));
 assert.equal((html.match(/content-embed-placeholder/g)??[]).length,4);
 assert.doesNotMatch(html,/<iframe/);
});


test('authored Button widths stay protected from inherited base and state widths', () => {
 const block={id:'b',type:'button',label:'Action',url:'#',style:'primary',width:25,interactionStyles:{hover:{width:75}}};
 const output=projectWebsiteDesignBlocks([block],{...selection,blockStyles:{button:{buttonWidth:'80px',interactionStates:{hover:{buttonWidth:'90px'}}}}})[0];
 assert.match(output.visualStyle.className,/site-block-authored-button-width/);
 assert.match(output.visualStyle.className,/site-block-authored-button-hover-width/);
 const html=renderToStaticMarkup(createElement(BlockPreviewRules,{selection:{...selection,blockStyles:{button:{buttonWidth:'80px',interactionStates:{hover:{buttonWidth:'90px'}}}}},scopeId:'width'}));
 assert.match(html,/:not\(\.site-block-authored-button-width\)/);
 assert.match(html,/:not\(\.site-block-authored-button-hover-width\)/);
});

test('image enlargement defaults preserve explicit and legacy destinations', () => {
 for (const enlargeOnClick of [true, false]) {
  for (const linkDestination of ['none', 'lightbox', 'custom', 'media']) for (const linkUrl of [undefined, '/destination']) {
   const source = { id: 'image', type: 'image', src: '/image.png', alt: '', linkDestination, linkUrl };
   assert.deepEqual(model.applyPreviewBlockStyles([source], { image: { enlargeOnClick } })[0].linkDestination, linkDestination);
   assert.equal(source.linkDestination, linkDestination);
  }
  const legacy = { id:'legacy',type:'image',src:'/image.png',alt:'',linkUrl:'/legacy' };
  assert.equal(model.applyPreviewBlockStyles([legacy], {image:{enlargeOnClick}})[0].linkDestination,undefined);
  assert.equal(model.applyPreviewBlockStyles([{...legacy,linkUrl:undefined}], {image:{enlargeOnClick}})[0].linkDestination,enlargeOnClick?'lightbox':'none');
 }
});

test('website device indentation round-trips with consecutive paragraph ownership', () => {
 const desktop = {textIndent:'8px'};
 const mobile = model.replacePreviewBlockStyle(desktop,'mobile',{textIndent:'24px',indentAll:false});
 assert.equal(mobile.textIndent,'8px');
 assert.equal(mobile.previewResponsive.mobile.textIndent,'24px');
 assert.doesNotThrow(()=>validateWebsiteStyles({blockStyles:{paragraph:mobile}}));
 assert.equal(model.previewBlockInspectorStyle(mobile,'mobile','default').textIndent,'24px');
 const source = [{id:'a',type:'paragraph',text:'First'}, {id:'b',type:'paragraph',text:'Second'}];
 const projected = projectWebsiteDesignBlocks(source,{...selection,blockStyles:{paragraph:mobile}});
 assert.doesNotMatch(projected[0].style.className,/site-block-follows-paragraph/);
 assert.match(projected[1].style.className,/site-block-follows-paragraph/);
 assert.doesNotMatch(projected[1].style.className,/site-block-authored-text-indent/);
 const owned = projectWebsiteDesignBlocks([{...source[0],style:{textIndent:'10px'}},source[1]],{...selection,blockStyles:{paragraph:mobile}});
 assert.match(owned[1].style.className,/site-block-authored-text-indent/);
 const zero = model.replacePreviewBlockStyle(mobile,'mobile',{textIndent:'0px',indentAll:true});
 assert.equal(zero.previewResponsive.mobile.textIndent,'0px');
 assert.doesNotThrow(()=>validateWebsiteStyles({blockStyles:{paragraph:zero}}));
 const zeroRules = renderToStaticMarkup(createElement(BlockPreviewRules,{scopeId:'zero',selection:{...selection,blockStyles:{paragraph:zero}}}));
 assert.match(zeroRules,/text-indent:0px!important/);
 const reset = model.replacePreviewBlockStyle(mobile,'mobile',{});
 assert.equal(reset.previewResponsive,undefined);
 assert.equal(reset.textIndent,'8px');
});
