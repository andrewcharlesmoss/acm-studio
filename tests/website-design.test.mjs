import test from 'node:test';
import assert from 'node:assert/strict';
import { loadProductionModule } from './production-module.mjs';
const design = await loadProductionModule(new URL('../app/studio/site-editor/website-design.ts',import.meta.url));
const identity = await loadProductionModule(new URL('../app/studio/site-editor/identity-preview-state.ts',import.meta.url));
const style = await loadProductionModule(new URL('../app/studio/site-editor/styles-preview-state.ts',import.meta.url));
const edit = await loadProductionModule(new URL('../app/studio/site-editor/website-design-edit.ts',import.meta.url));
const css = await loadProductionModule(new URL('../app/studio/site-editor/additional-css.ts',import.meta.url));
const contract = await loadProductionModule(new URL('../app/studio/test-site/contract.ts',import.meta.url));
const templates = await loadProductionModule(new URL('../app/studio/template-model.ts',import.meta.url));
const { projectWebsiteDesignBlocks } = await loadProductionModule(new URL('../app/studio/site-editor/website-design-surface.tsx',import.meta.url));

test('saved settings round trip with per-property inheritance, isolated sites, and Reset restoring defaults', async()=>{
 const global={identity:{title:'Original',tagline:'Description'},styles:{paletteId:'default',typographyId:'default',typography:{elements:{text:{size:'21px',weight:400}}}}};
 const own={identity:{title:'Test own',hidden:{title:true}},styles:{typography:{elements:{text:{weight:700}}}}};
 const stored=design.validateWebsiteDesign(JSON.parse(JSON.stringify(own)));
 const effective=design.effectiveWebsiteDesign(global,stored);
 assert.equal(effective.identity.title,'Test own');assert.equal(effective.identity.hidden.title,true);
 assert.deepEqual(effective.styles.typography.elements.text,{size:'21px',weight:700});
 assert.equal(design.effectiveWebsiteDesign(global,design.emptyWebsiteDesign()).identity.title,'Original');
 let history=identity.createIdentityPreview();history=identity.identityPreviewReducer(history,{type:'hydrate',values:{global:global.identity,test:own.identity,test2:{}}});
 history=identity.identityPreviewReducer(history,{type:'reset-field',site:'test',field:'title'});
 assert.equal(identity.resolveIdentityPreview(history.present,'test').title,'Original');assert.equal(history.present.test.hidden,undefined);assert.equal(history.present.test2.title,undefined);
 let styles=style.createStylesPreview();styles=style.stylesPreviewReducer(styles,{type:'hydrate',values:{global:global.styles,test:own.styles,test2:{}}});styles=style.stylesPreviewReducer(styles,{type:'reset-element-fields',scope:'test',role:'text',fields:['weight']});
 assert.equal(style.resolvePreviewStyle(styles.present,'test').typography.elements.text.weight,400);
});

test('invalid nested settings and CSS injection fail at the shared browser/server boundary',()=>{
 for(const styles of [
  {typography:{presets:{bad:'oops'}}},{background:{image:{}}},{layout:'invalid'},
  {colours:{theme:{0:'red;}body{display:none}/*'}}},{typography:{elements:{text:{weight:'bold'}}}},
  {blockStyles:{paragraph:{unknown:'value'}}},{blockStyles:{paragraph:{websiteWeight:100000}}},
  {additionalCss:'body{background:url(https://example.test/a)}'},
 ]) assert.throws(()=>design.validateWebsiteDesign({identity:{},styles}));
 assert.throws(()=>design.validateWebsiteDesign({identity:{hidden:{title:"false"}},styles:{}}));
 assert.ok(css.compileSavedWebsiteCss('p { color: red; }').css.startsWith('@scope'));
 assert.ok(css.compileSavedWebsiteCss('p { color: red; }}').error);
 assert.ok(css.compileSavedWebsiteCss('p { width: expression(alert(1)); }').error);
});

test('website Table cell padding is a supported, validated block setting including responsive overrides',()=>{
 const valid=design.validateWebsiteDesign({identity:{},styles:{blockStyles:{table:{padding:'8px',cellPadding:'11px',previewResponsive:{mobile:{cellPadding:'7px'}}}}}});
 assert.equal(valid.styles.blockStyles.table.padding,'8px');
 assert.equal(valid.styles.blockStyles.table.cellPadding,'11px');
 assert.equal(valid.styles.blockStyles.table.previewResponsive.mobile.cellPadding,'7px');
 assert.throws(()=>design.validateWebsiteDesign({identity:{},styles:{blockStyles:{table:{cellPadding:'url(https://example.test)'}}}}));
});

test('reference spacing presets survive website design saving, hydration and scope reset', async () => {
 const presets=['clamp(30px,5cqw,50px)','clamp(30px,7cqw,70px)','clamp(50px,7cqw,90px)','clamp(70px,10cqw,140px)'];
 for(const value of presets) {
  const margin=`${value} 0`;
  let history=style.createStylesPreview();
  history=style.stylesPreviewReducer(history,{type:'block-style',scope:'global',block:'image',patch:{margin}});
  const saved=await design.serialiseWebsiteDesign({},history.present.global);
  assert.equal(saved.styles.blockStyles.image.margin,margin);
  assert.equal((await design.hydrateWebsiteDesign(saved,src=>src)).styles.blockStyles.image.margin,margin);
  history=style.stylesPreviewReducer(history,{type:'reset',scope:'global'});
  assert.equal(history.present.global.blockStyles,undefined);
  history=style.stylesPreviewReducer(history,{type:'undo'});
  assert.equal(history.present.global.blockStyles.image.margin,margin);
 }
 const styleValues={blockStyles:{table:{padding:'clamp(30px,7cqw,70px) 0',cellPadding:'clamp(50px,7cqw,90px)',responsive:{tablet:{margin:'clamp(30px,5cqw,50px) 0'}},previewResponsive:{mobile:{padding:'10px clamp(70px,10cqw,140px)'}},variations:{example:{margin:'clamp(30px,7cqw,70px)'}}}}};
 assert.deepEqual((await design.serialiseWebsiteDesign({},styleValues)).styles,styleValues);
 for(const invalid of ['clamp(1px,2cqw,3px)','clamp(30px,7cqw,70px);color:red','clamp(30px,7cqw,url(https://example.test))','-clamp(30px,7cqw,70px)','clamp(30px,7cqw,70px) 0 0 0 0'])
  assert.throws(()=>design.validateWebsiteDesign({identity:{},styles:{blockStyles:{image:{margin:invalid}}}}));
});

test('Heading backgrounds round trip through portable settings and reject unsafe or unknown fields',async()=>{
 const gradient={type:'linear',angle:90,stops:[{colour:'#000000',position:0},{colour:'#FFFFFF',position:100}]};
 const styles={blockStyles:{group:{headingBackground:{background:'var(--site-palette-theme-2)'},headingBackgrounds:{2:{gradient,gradientId:'example'}},previewResponsive:{mobile:{headingBackgrounds:{2:{background:'#123456'}}}}}}};
 const saved=await design.serialiseWebsiteDesign({},styles);
 assert.deepEqual(saved.styles,styles);
 assert.deepEqual((await design.hydrateWebsiteDesign(saved,src=>src)).styles,styles);
 assert.deepEqual(design.validateWebsiteDesign({identity:{},styles:{blockStyles:{group:{headingColor:'#123456',headingColors:{2:'#654321'}}}}}).styles.blockStyles.group.headingColors,{2:'#654321'});
 for(const patch of [{headingBackground:{background:'url(https://example.test/image)'}},{headingBackground:{image:'not-supported'}},{headingBackgrounds:{7:{background:'red'}}},{headingBackgrounds:{2:{gradient:{type:'unknown'}}}}]) assert.throws(()=>design.validateWebsiteDesign({identity:{},styles:{blockStyles:{group:patch}}}));
});

test('editing content does not store inherited theme defaults, including nested groups',()=>{
 const source={id:'g',type:'group',layout:'stack',children:[{id:'p',type:'paragraph',text:'Before'}]};
 const projected=projectWebsiteDesignBlocks([source],{paletteId:'default',typographyId:'default',blockStyles:{paragraph:{textColor:'red',padding:'12px'}}})[0];
 const changed=structuredClone(projected);changed.children[0].text='After';
 const saved=edit.rebaseWebsiteDesignEdit(source,projected,changed);
 assert.equal(saved.children[0].text,'After');assert.equal(saved.children[0].style,undefined);
 assert.equal(source.children[0].text,'Before');
 const noOp=edit.rebaseWebsiteDesignEdit(source,projected,projected);assert.deepEqual(noOp,source);
});

test('fixture v9 settings preserve content and publication snapshots and reject missing settings',()=>{
 const page={id:'home',kind:'page',title:'Home',slug:'',excerpt:'',status:'published',updatedAt:'2026-10-22T00:00:00.000Z',tags:[],seoTitle:'',seoDescription:'',blocks:[]};
 const set=templates.createTemplateSet('Original');const nav={...structuredClone(set),id:'navigation',templates:[],parts:[{id:'nav',kind:'header',name:'Navigation',nodes:[{id:'menu',type:'element',element:'navigation'}]}]};
 const source={format:'acm-test-site',version:9,siteId:'test',documents:[page],categories:[],bin:[],activeDocumentId:'home',homeDocumentId:'home',templates:{...templates.emptyTemplateStore(),sets:[set,nav]},siteNavigation:{setId:'navigation',partId:'nav'},browserImportComplete:true,globalTemplates:[],publications:[{document:structuredClone(page)}],websiteDesign:design.emptyWebsiteDesign()};
 assert.equal(contract.validTestSiteDocument(source),true);
 const before=JSON.stringify(source.publications);const changed={...source,websiteDesign:{identity:{title:'Changed'},styles:{}}};
 assert.equal(contract.validTestSiteDocument(changed),true);assert.equal(JSON.stringify(changed.publications),before);
 const missing={...source};delete missing.websiteDesign;assert.equal(contract.validTestSiteDocument(missing),false);
 assert.equal(contract.validTestSiteDocument({...source,version:8,websiteDesign:undefined}),false,'v8 cannot silently carry new settings');
});

test('fixture settings accept Heading background maps without changing editorial records',()=>{
 const page={id:'home',kind:'page',title:'Home',slug:'',excerpt:'',status:'published',updatedAt:'2026-10-22T00:00:00.000Z',tags:[],seoTitle:'',seoDescription:'',blocks:[]};
 const set=templates.createTemplateSet('Original');const nav={...structuredClone(set),id:'navigation',templates:[],parts:[{id:'nav',kind:'header',name:'Navigation',nodes:[{id:'menu',type:'element',element:'navigation'}]}]};
 const source={format:'acm-test-site',version:9,siteId:'test',documents:[page],categories:[],bin:[],activeDocumentId:'home',homeDocumentId:'home',templates:{...templates.emptyTemplateStore(),sets:[set,nav]},siteNavigation:{setId:'navigation',partId:'nav'},browserImportComplete:true,globalTemplates:[],publications:[{document:structuredClone(page)}],websiteDesign:{identity:{},styles:{blockStyles:{group:{headingBackground:{background:'#123456'},headingBackgrounds:{2:{background:'#654321'}}}}}}};
 const original=JSON.stringify(source);
 assert.equal(contract.validTestSiteDocument(source),true);
 assert.equal(JSON.stringify(source),original);
 const invalid=structuredClone(source);invalid.websiteDesign.styles.blockStyles.group.headingBackgrounds[7]={background:'red'};
 assert.equal(contract.validTestSiteDocument(invalid),false);
});

test('an explicit Show choice overrides inherited Hide and Reset restores inherited visibility',()=>{
 let state=identity.createIdentityPreview();
 state=identity.identityPreviewReducer(state,{type:'hydrate',values:{global:{title:'Default',hidden:{title:true}},test:{},test2:{}}});
 assert.equal(identity.resolveIdentityPreview(state.present,'test').title,'');
 state=identity.identityPreviewReducer(state,{type:'set-hidden',site:'test',field:'title',hidden:false});
 assert.equal(state.present.test.hidden.title,false);assert.equal(identity.resolveIdentityPreview(state.present,'test').title,'Default');
 const serialised=design.validateWebsiteDesign({identity:state.present.test,styles:{}});assert.equal(serialised.identity.hidden.title,false);
 state=identity.identityPreviewReducer(state,{type:'reset-field',site:'test',field:'title'});assert.equal(identity.resolveIdentityPreview(state.present,'test').title,'');
});

test('the current canonical guide migrates into validated website defaults without changing its metrics',async()=>{
 const {UNIVERSAL_STYLE_PRESET}=await loadProductionModule(new URL('../app/studio/ui/styles/canonical-style-guide.ts',import.meta.url));
 const migrated=design.legacyWebsiteDefaults(UNIVERSAL_STYLE_PRESET);
 assert.deepEqual(migrated.styles,{},'migration preserves the actual website baseline rather than materialising reference styles');
 assert.equal(design.effectiveWebsiteDesign(migrated,design.emptyWebsiteDesign()).legacy,true);
});
