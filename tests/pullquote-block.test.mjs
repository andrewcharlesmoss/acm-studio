import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { loadProductionModule } from './production-module.mjs';
import { withHtmlDom } from './html-dom-fixture.mjs';
const load = name => loadProductionModule(new URL(name, import.meta.url));
const model = await load('../app/studio/editor-model.ts');
const workspace = await load('../app/studio/workspace-validation.ts');
const templates = await load('../app/studio/template-model.ts');
const { validateTemplatePackage } = await load('../app/studio/template-package.ts');
const { validateStudioBackup } = await load('../app/studio/backup-store.ts');
const fixtureApi = await load('../app/studio/test-site/contract.ts');
const globalApi = await load('../app/studio/global-template-contract.ts');
const clipboard = await load('../app/studio/block-clipboard.ts');
const htmlApi = await load('../app/studio/studio-html-editor.ts');
const { BlockRenderer } = await load('../app/components/content.tsx');
const { toLocallyPublishedArticle } = await load('../app/content/local-publishing.ts');
const { blockLibraryEntryByType } = await load('../app/studio/blocks/library-catalogue.ts');
const { capabilityProfileFor } = await load('../app/studio/blocks/capability-profiles.ts');
const { blockToolbarDefinitionFor } = await load('../app/studio/blocks/toolbar-registry.ts');
const { groupAllowsChild } = await load('../app/studio/block-inserter-options.ts');
const transforms = await load('../app/studio/block-transforms.ts');
const plain = value => JSON.parse(JSON.stringify(value));
const block = { id: 'pullquote', type: 'pullquote', text: 'A useful quotation', runs: [{ text: 'A useful quotation', marks: ['bold'] }], attribution: 'Source', attributionRuns: [{ text: 'Source', marks: ['italic'] }], align: 'centre', quoteStyle: 'plain' };
const page = { id: 'home', kind: 'page', title: 'Home', slug: '', excerpt: '', status: 'published', updatedAt: '2026-10-31T12:00:00Z', tags: [], seoTitle: '', seoDescription: '', blocks: [] };
const set = templates.createTemplateSet('Original');
const nav = { ...structuredClone(set), id: 'navigation', templates: [], parts: [{ id: 'nav', kind: 'header', name: 'Navigation', nodes: [{ id: 'menu', type: 'element', element: 'navigation' }] }] };
const legacyFixture = { format: 'acm-test-site', version: 9, siteId: 'test', documents: [page], categories: [], bin: [], activeDocumentId: 'home', homeDocumentId: 'home', templates: { ...templates.emptyTemplateStore(), sets: [set, nav] }, siteNavigation: { setId: 'navigation', partId: 'nav' }, browserImportComplete: true, globalTemplates: [], publications: [{ document: page }] };
const doc = blocks => ({ ...model.initialStudioWorkspace.documents.find(item => item.kind === 'post'), blocks });
const state = blocks => { const document = doc(blocks); return { ...model.initialStudioWorkspace, documents: [document], activeDocumentId: document.id, bin: [] }; };

test('Pullquote is separately insertable, inspectable and selectable without changing Quote', () => {
  assert.equal(model.createBlock('pullquote', 'new-pullquote').type, 'pullquote');
  assert.equal(model.createBlock('quote', 'new-quote').type, 'quote');
  for (const type of ['quote', 'pullquote']) assert.ok(model.contentEditorBlockCatalogue.some(entry => entry.type === type));
  assert.equal(blockLibraryEntryByType.pullquote.href, '/studio/ui/blocks/pullquote');
  assert.equal(blockLibraryEntryByType.pullquote.profile.type, 'pullquote');
  assert.equal(capabilityProfileFor('pullquote').label, 'Pullquote');
  assert.ok(blockToolbarDefinitionFor('pullquote').actions.some(action => action.id === 'quote-citation'));
  assert.equal(groupAllowsChild({ id:'group',type:'group',layout:'flow',children:[],allowedBlocks:['pullquote'] },'pullquote'),true);
  assert.equal(groupAllowsChild({ id:'group',type:'group',layout:'flow',children:[],allowedBlocks:['quote'] },'pullquote'),false);
});

test('current workspace/publication preserve Pullquote while previous envelopes reject new blocks and allowlists', () => {
  for (const value of [block, { id:'group',type:'group',layout:'flow',allowedBlocks:['pullquote'],children:[] }]) {
    const current=state([value]); assert.equal(current.version,59);
    assert.equal(workspace.validateStudioWorkspace(current).documents[0].blocks[0].type,value.type);
    for (const read of [workspace.validateStudioWorkspace,workspace.migrateStudioWorkspace]) assert.throws(()=>read({...current,version:56}));
    const post=toLocallyPublishedArticle(doc([value]));
    assert.equal(workspace.validatePublicationSnapshot({version:48,posts:[post]}).posts[0].blocks[0].type,value.type);
    assert.throws(()=>workspace.validatePublicationSnapshot({version:47,posts:[post]}));
  }
  const original=state([{...block,type:'quote'}]); original.version=56;
  const before=JSON.stringify(original); assert.equal(workspace.migrateStudioWorkspace(original).documents[0].blocks[0].type,'quote');assert.equal(JSON.stringify(original),before);
});

test('templates, package, snapshot, backup, fixture and global library retain Pullquote and enforce its version gates', () => {
  for (const value of [block,{id:'group',type:'group',layout:'flow',allowedBlocks:['pullquote'],children:[]}]) {
    const template=structuredClone(set);template.parts[0].nodes=[value];
    const store={...templates.emptyTemplateStore(),sets:[template]};
    assert.doesNotThrow(()=>templates.validateTemplateStore(store));assert.throws(()=>templates.validateTemplateStore({...store,version:'0.67.0'}));
    const snapshot={version:'0.68.0',set:template,templateId:template.templates[0].id};
    assert.doesNotThrow(()=>templates.validateTemplateSnapshot(snapshot));assert.throws(()=>templates.validateTemplateSnapshot({...snapshot,version:'0.67.0'}));
    const pkg={format:'acm-studio-template-set',version:'0.68.0',set:template,media:[]};
    assert.doesNotThrow(()=>validateTemplatePackage(pkg));assert.throws(()=>validateTemplatePackage({...pkg,version:'0.67.0'}));
    const backup={format:'acm-studio-backup',version:35,exportedAt:'2026-10-31T12:00:00Z',workspace:state([value]),publications:null,media:{folders:[],assets:[]}};
    assert.doesNotThrow(()=>validateStudioBackup(backup));assert.doesNotThrow(()=>validateStudioBackup({...backup,version:34}));assert.doesNotThrow(()=>validateStudioBackup({...backup,version:37}));assert.throws(()=>validateStudioBackup({...backup,version:33}));
    const fixture=fixtureApi.testSiteCollection(structuredClone(legacyFixture));fixture.documents[0].blocks=[value];
    assert.equal(fixture.version,49);assert.equal(fixtureApi.validTestSiteDocument(fixture),true);assert.equal(fixtureApi.validTestSiteDocument({...fixture,version:45}),false);
    const library=globalApi.createGlobalTemplateLibrary({test:fixtureApi.testSiteCollection(structuredClone(legacyFixture)),test2:{...fixtureApi.testSiteCollection(structuredClone(legacyFixture)),siteId:'test2'}});
    library.migrations.test.bases[0].parts[0].nodes=[value];assert.equal(library.version,41);assert.doesNotThrow(()=>globalApi.validateGlobalTemplateLibrary(library));assert.throws(()=>globalApi.validateGlobalTemplateLibrary({...library,version:37}));
  }
});

test('old backup rejects Pullquote even when present only in encoded publications',()=>{
  const publication=JSON.stringify({version:48,posts:[toLocallyPublishedArticle(doc([block]))]});
  const backup={format:'acm-studio-backup',version:35,exportedAt:'2026-10-31T12:00:00Z',workspace:state([]),publications:publication,media:{folders:[],assets:[]}};
  assert.doesNotThrow(()=>validateStudioBackup(backup));assert.throws(()=>validateStudioBackup({...backup,version:33}));
});

test('HTML inspection and clipboard retain the distinct type, rich citation and alignment',()=>{
  withHtmlDom(()=>{const parsed=htmlApi.parseHtmlToBlock(htmlApi.blockToHtml(block),block);assert.equal(parsed.block.type,'pullquote');assert.equal(parsed.block.align,'centre');assert.deepEqual(plain(parsed.block.attributionRuns),block.attributionRuns);});
  const html=clipboard.blockClipboardHtml([block]);const encoded=html.match(/data-acm-studio-blocks="([^"]*)"/)[1].replaceAll('&quot;','"').replaceAll('&lt;','<').replaceAll('&gt;','>').replaceAll('&amp;','&');
  const previous=globalThis.DOMParser;let payload=encoded;
  try{globalThis.DOMParser=class{parseFromString(){return{querySelector:()=>({getAttribute:()=>payload})};}};assert.equal(JSON.parse(encoded).version,36);assert.deepEqual(plain(clipboard.readBlockClipboardPayload(html).blocks[0]),block);payload=JSON.stringify({...JSON.parse(encoded),version:33});assert.equal(clipboard.readBlockClipboardPayload(html),null);}finally{globalThis.DOMParser=previous;}
});

test('text and Quote transforms produce real Pullquotes and return to Quote without losing content',()=>{
  const paragraph={id:'paragraph',type:'paragraph',text:'Text',runs:[{text:'Text',marks:['bold']}]};
  const choice=transforms.availableBlockTransformsInDocument(paragraph,[paragraph]).find(item=>item.id==='pullquote');assert.equal(choice.target,'pullquote');const result=transforms.transformBlock(paragraph,choice);assert.equal(result.type,'pullquote');assert.deepEqual(plain(result.runs),paragraph.runs);
  const quote={...block,type:'quote'};const toPullquote=transforms.availableBlockTransformsInDocument(quote,[quote]).find(item=>item.id==='quote-to-pullquote');assert.ok(toPullquote);const converted=transforms.transformQuoteBlocks(quote,toPullquote)[0];assert.equal(converted.type,'pullquote');assert.deepEqual(plain(converted.attributionRuns),block.attributionRuns);
  const toQuote=transforms.availableBlockTransformsInDocument(converted,[converted]).find(item=>item.id==='quote-to-quote');assert.ok(toQuote);assert.equal(transforms.transformQuoteBlocks(converted,toQuote)[0].type,'quote');
});

test('editor and public renderers paint Pullquote text, citation and authored typography on the shared surface',()=>{
  for(const variant of ['studio','article']){const markup=renderToStaticMarkup(createElement(BlockRenderer,{blocks:[{...block,visualStyle:{fontSizeCustom:'20px',appearance:'regular',lineHeight:'1.6'}}],variant}));assert.match(markup,/is-pullquote/);assert.match(markup,/A useful quotation/);assert.match(markup,/Source/);assert.match(markup,/20px/);}
});

test('generated fixture HTML includes the actual Pullquote and canonical shared CSS',async()=>{
  const {renderTestSite}=await load('../app/studio/test-site/render.tsx');const fixture=fixtureApi.testSiteCollection(structuredClone(legacyFixture));fixture.documents[0].blocks=[block];fixture.publications=[{document:fixture.documents[0]}];const html=renderTestSite(fixture,'pullquote-static');assert.match(html,/is-pullquote > blockquote/);assert.match(html,/A useful quotation/);assert.match(html,/class="[^"]*is-pullquote/);
});

test('large legacy content without Pullquote is not rejected by the feature detector', async()=>{
  const {containsPullquote}=await load('../app/content/pullquote-block.ts');
  const blocks=Array.from({length:100},(_,index)=>({id:`large-${index}`,type:'paragraph',text:'x'.repeat(1000),runs:Array.from({length:1000},()=>({text:'x',marks:['bold','italic']}))}));
  const legacy={...state(blocks),version:56};
  assert.equal(containsPullquote(legacy),false);
  assert.doesNotThrow(()=>workspace.validateStudioWorkspace(legacy));
  assert.doesNotThrow(()=>workspace.validatePublicationSnapshot({version:47,posts:[toLocallyPublishedArticle(doc(blocks))]}));
  const cyclic={children:[]};cyclic.children.push(cyclic);assert.equal(containsPullquote(cyclic),false);
  cyclic.children.push({type:'pullquote'});assert.equal(containsPullquote(cyclic),true);
});

test('retained template property overrides require the new fixture envelope',()=>{
  for(const patch of [{path:['parts','@part','nodes','@node','type'],value:'pullquote'},{path:['parts','@part','nodes','@node','allowedBlocks'],value:['pullquote']}]){
    const fixture=fixtureApi.testSiteCollection(structuredClone(legacyFixture));
    fixture.globalTemplates=[{setId:fixture.templates.sets[0].id,globalSetId:'retained-original',ids:{},overrides:[patch]}];
    assert.equal(fixtureApi.validTestSiteDocument(fixture),true);
    assert.equal(fixtureApi.validTestSiteDocument({...fixture,version:45}),false);
    assert.throws(()=>fixtureApi.testSiteCollection({...fixture,version:45}));
  }
});

test('fixture Undo restores drafts while retaining current publication and status in v44–v46',()=>{
  for(const version of [44,45,46]){
    const current=fixtureApi.testSiteCollection(structuredClone(legacyFixture));current.version=version;
    current.documents[0].status='published';current.documents[0].publishedAt='2026-10-31T12:00:00Z';
    current.publications=[{document:{...structuredClone(current.documents[0]),blocks:[{...block,type:'quote',text:'Latest published content'}]}}];
    const next=structuredClone(current);next.documents[0].status='draft';next.documents[0].publishedAt=undefined;next.documents[0].title='Earlier draft';next.publications=[];
    const retained=fixtureApi.retainLocalPublications(next,current);
    assert.equal(retained.version,49);assert.equal(retained.documents[0].title,'Earlier draft');assert.equal(retained.documents[0].status,'published');assert.equal(retained.documents[0].publishedAt,current.documents[0].publishedAt);assert.deepEqual(plain(retained.publications),plain(current.publications));
    assert.equal(fixtureApi.validTestSiteDocument(retained),true);
  }
});
