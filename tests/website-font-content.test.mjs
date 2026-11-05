import assert from 'node:assert/strict';
import test from 'node:test';
import { loadProductionModule } from './production-module.mjs';

const font = await loadProductionModule(new URL('../app/content/website-fonts.ts', import.meta.url));
const styling = await loadProductionModule(new URL('../app/content/paragraph-styles.ts', import.meta.url));
const validation = await loadProductionModule(new URL('../app/studio/workspace-validation.ts', import.meta.url));
const editor = await loadProductionModule(new URL('../app/studio/editor-model.ts', import.meta.url));
const publication = await loadProductionModule(new URL('../app/content/local-publishing.ts', import.meta.url));
const templates = await loadProductionModule(new URL('../app/studio/template-model.ts', import.meta.url));
const packages = await loadProductionModule(new URL('../app/studio/template-package.ts', import.meta.url));
const backup = await loadProductionModule(new URL('../app/studio/backup-store.ts', import.meta.url));
const copy = value => JSON.parse(JSON.stringify(value));

function fixture() {
  const workspace = copy(editor.initialStudioWorkspace);
  const doc = workspace.documents.find(item => item.kind === 'post');
  doc.blocks = [{ id:'font-test', type:'paragraph', text:'Sample', style:{ fontFamily:'site-manrope', responsive:{ mobile:{fontFamily:'site-fira-code'} } } }];
  return { workspace, doc, block:doc.blocks[0] };
}

test('Site Editor font IDs are bounded and keep existing font IDs readable', () => {
  assert.equal(font.referenceFonts.length, 9);
  for (const family of ['inter','helvetica-neue','helvetica','arial','site-manrope','site-fira-code']) assert.equal(validation.validParagraphStyle({fontFamily:family}),true,family);
  assert.equal(validation.validParagraphStyle({fontFamily:'site-injected; color:red'}),false);
  assert.match(styling.paragraphStyleToCss({fontFamily:'site-manrope'}).fontFamily,/TT5 Manrope/);
  assert.match(styling.paragraphStyleToCss({fontFamily:'inter'}).fontFamily,/Inter/);
  assert.equal(font.containsWebsiteFont({path:['nodes','fontFamily'],value:'site-manrope'}),true);
});

test('workspace, publication, templates and backups enforce and round-trip the new font contract', () => {
  const {workspace,doc,block}=fixture();
  assert.equal(validation.validateStudioWorkspace(workspace).documents.find(item=>item.id===doc.id).blocks[0].style.responsive.mobile.fontFamily,'site-fira-code');
  assert.throws(()=>validation.validateStudioWorkspace({...workspace,version:58}));
  const article=publication.toLocallyPublishedArticle(doc);
  assert.equal(validation.validatePublicationSnapshot({version:50,posts:[article]}).posts[0].blocks[0].style.fontFamily,'site-manrope');
  assert.throws(()=>validation.validatePublicationSnapshot({version:49,posts:[article]}),/Website fonts/);
  const set=templates.createTemplateSet();set.parts[0].nodes=[block];
  const store={...templates.emptyTemplateStore(),sets:[set]};
  assert.equal(templates.validateTemplateStore(store).sets[0].parts[0].nodes[0].style.fontFamily,'site-manrope');
  assert.throws(()=>templates.validateTemplateStore({...store,version:'0.69.0'}),/Website fonts/);
  const pkg={format:'acm-studio-template-set',version:'0.70.0',set,media:[]};
  assert.equal(packages.validateTemplatePackage(pkg).set.parts[0].nodes[0].style.fontFamily,'site-manrope');
  assert.throws(()=>packages.validateTemplatePackage({...pkg,version:'0.69.0'}),/Website fonts/);
  const archive={format:'acm-studio-backup',version:36,exportedAt:'2026-11-04T00:00:00Z',workspace,publications:null,templates:store,media:{folders:[],assets:[]}};
  assert.equal(backup.validateStudioBackup(archive).workspace.documents.find(item=>item.id===doc.id).blocks[0].style.fontFamily,'site-manrope');
  assert.throws(()=>backup.validateStudioBackup({...archive,version:35}),/Website fonts/);
});

test('fixture sources and clipboard retain website fonts and reject older envelopes', async () => {
  const contract=await loadProductionModule(new URL('../app/studio/test-site/contract.ts', import.meta.url));
  const clipboard=await loadProductionModule(new URL('../app/studio/block-clipboard.ts', import.meta.url));
  const {doc,block}=fixture();
  const seed=copy(doc);seed.kind='page';seed.blocks=[];
  const site=contract.testSiteCollection({format:'acm-test-site',version:2,siteId:'test',document:seed});
  site.documents[0].blocks=[block];
  for(const siteId of ['test','test2']) {
    const candidate={...site,siteId};
    assert.equal(contract.validTestSiteDocument(candidate),true,siteId);
    assert.equal(contract.validTestSiteDocument({...candidate,version:47}),false,siteId);
    assert.equal(contract.testSiteCollection(candidate).documents[0].blocks[0].style.fontFamily,'site-manrope');
  }
  const oldParser=globalThis.DOMParser;
  try {
    const read=version=>{ const payload=JSON.stringify({format:'acm-studio-blocks',version,blocks:[block],footnotes:[]}); globalThis.DOMParser=class {parseFromString(){return {querySelector:()=>({getAttribute:()=>payload})};}};return clipboard.readBlockClipboardPayload('<div data-acm-studio-blocks></div>'); };
    assert.equal(read(36).blocks[0].style.fontFamily,'site-manrope');
    assert.equal(read(35),null);
  } finally {globalThis.DOMParser=oldParser;}
});

test('global template library preserves new font IDs only in its new version', async () => {
  const global=await loadProductionModule(new URL('../app/studio/global-template-contract.ts', import.meta.url));
  const set=templates.createTemplateSet('Shared');
  const store={...templates.emptyTemplateStore(),sets:[set]};
  const sites={};
  for(const siteId of ['test','test2']) {
    const navigation={...copy(set),id:`${siteId}-navigation`,templates:[],parts:[{id:`${siteId}-part`,name:'Navigation',kind:'header',nodes:[{id:`${siteId}-nav`,type:'element',element:'navigation'}]}],navigation:[]};
    sites[siteId]={templates:{...copy(store),sets:[copy(set),navigation]},siteNavigation:{setId:navigation.id,partId:navigation.parts[0].id}};
  }
  const library=global.createGlobalTemplateLibrary(sites);
  library.templates.sets[0].parts[0].nodes=[fixture().block];
  assert.equal(global.validateGlobalTemplateLibrary(library).templates.sets[0].parts[0].nodes[0].style.fontFamily,'site-manrope');
  assert.throws(()=>global.validateGlobalTemplateLibrary({...library,version:39}),/Website fonts/);
});

test('disabled site fonts retain saved IDs and use their fallback in website presentation', async () => {
  const { createElement }=await import('react');
  const { renderToStaticMarkup }=await import('react-dom/server');
  const { WebsiteDesignSurface }=await loadProductionModule(new URL('../app/studio/site-editor/website-design-surface.tsx', import.meta.url));
  const design=await loadProductionModule(new URL('../app/studio/site-editor/website-design.ts', import.meta.url));
  const effective=design.effectiveWebsiteDesign(undefined,undefined);
  effective.styles.typography={disabledFonts:['"TT5 Manrope", sans-serif']};
  const html=renderToStaticMarkup(createElement(WebsiteDesignSurface,{design:effective},createElement('p',{style:styling.paragraphStyleToCss({fontFamily:'site-manrope'})},'Text')));
  assert.match(html,/--site-manrope:sans-serif/);
  assert.match(html,/font-family:var\(--site-manrope/);
  assert.equal(validation.validParagraphStyle({fontFamily:'site-manrope'}),true);
});

test('font selector preserves legacy selections and never stores unknown inherited CSS as a font ID', async () => {
  const {createElement}=await import('react'); const {renderToStaticMarkup}=await import('react-dom/server');
  const {FontFamilySetting}=await loadProductionModule(new URL('../app/studio/controls/font-family-setting.tsx', import.meta.url));
  const families=['"TT5 Manrope", sans-serif'];
  const legacy=renderToStaticMarkup(createElement(FontFamilySetting,{value:'arial',websiteFamilies:families,onChange(){}}));
  assert.match(legacy,/>Arial</);
  const unknown=renderToStaticMarkup(createElement(FontFamilySetting,{displayValue:'Unlisted, sans-serif',websiteFamilies:families,onChange(){}}));
  assert.match(unknown,/>Default</);assert.doesNotMatch(unknown,/Unlisted/);
});
