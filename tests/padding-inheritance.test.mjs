import test from 'node:test';
import assert from 'node:assert/strict';
import { loadProductionModule } from './production-module.mjs';
const lengths = await loadProductionModule(new URL('../app/content/box-lengths.ts', import.meta.url));
const responsive = await loadProductionModule(new URL('../app/content/responsive-styles.ts', import.meta.url));
const css = await loadProductionModule(new URL('../app/content/paragraph-styles.ts', import.meta.url));
const validation = await loadProductionModule(new URL('../app/studio/workspace-validation.ts', import.meta.url));
const editor = await loadProductionModule(new URL('../app/studio/editor-model.ts', import.meta.url));
const preview = await loadProductionModule(new URL('../app/studio/site-editor/blocks-preview-model.ts', import.meta.url));

test('individual padding sides keep other website sides live and CSS reflects the effective values', () => {
 const authored = { paddingSides: { top: '8px' } };
 const first = preview.projectedStyle({ padding: '10px 20px' }, authored);
 const changedParent = preview.projectedStyle({ padding: '30px 40px' }, authored);
 assert.deepEqual([css.paragraphStyleToCss(first).paddingRight, css.paragraphStyleToCss(first).paddingTop], ['20px', '8px']);
 assert.deepEqual([css.paragraphStyleToCss(changedParent).paddingRight, css.paragraphStyleToCss(changedParent).paddingTop], ['40px', '8px']);
 assert.deepEqual(authored, { paddingSides: { top: '8px' } });
});

test('responsive padding overrides merge per side and return to desktop inheritance when removed', () => {
 const style = { paddingSides: { top: '8px', left: '16px' }, responsive: { tablet: { paddingSides: { top: '0px' } } } };
 assert.deepEqual(responsive.styleForViewport(style, 'tablet').paddingSides, { top: '0px', left: '16px' });
 const mapped = css.paragraphStyleToCss(style);
 assert.equal(mapped['--studio-rs-tablet-padding-top'], '0px');
 assert.equal(mapped.paddingLeft, '16px');
 assert.deepEqual(responsive.styleForViewport(responsive.replaceViewportStyle(style, 'tablet', {}), 'tablet').paddingSides, style.paddingSides);
});

test('padding side data is validated and gated in workspace versions', () => {
 assert.equal(validation.validParagraphStyle({ paddingSides: { top: '0px', right: '16px' } }), true);
 for (const paddingSides of [{}, { diagonal: '8px' }, { top: '8px 16px' }, { top: 'clamp(1px,2cqw,3px)' }, { top: '-1px' }]) assert.equal(validation.validParagraphStyle({ paddingSides }), false);
 const doc = structuredClone(editor.initialStudioWorkspace.documents[0]);
 doc.blocks = [{ id: 'padding-example', type: 'paragraph', text: 'Test', style: { paddingSides: { top: '8px' } } }];
 const workspace = { version: 58, documents: [doc], activeDocumentId: doc.id, categories: [], bin: [] };
 assert.equal(validation.validateStudioWorkspace(workspace).documents[0].blocks[0].style.paddingSides.top, '8px');
 assert.throws(() => validation.validateStudioWorkspace({ ...workspace, version: 57 }));
});

 test('editing or clearing one side preserves the ownership of every other side', () => {
  assert.deepEqual(lengths.updatePaddingSides({}, [0], '8px'), { paddingSides: { top: '8px' } });
  assert.deepEqual(lengths.updatePaddingSides({ paddingSides: { top: '8px' } }, [1], '0px'), { paddingSides: { top: '8px', right: '0px' } });
  assert.deepEqual(lengths.updatePaddingSides({ paddingSides: { top: '8px', right: '0px' } }, [1], undefined), { paddingSides: { top: '8px' } });
  assert.deepEqual(lengths.updatePaddingSides({ padding: '10px 20px' }, [0], '8px'), { paddingSides: { top: '8px', right: '20px', bottom: '10px', left: '20px' } });
 });

test('template, publication, backup and fixture reject side data in older envelopes', async () => {
 const template = await loadProductionModule(new URL('../app/studio/template-model.ts', import.meta.url));
 const backup = await loadProductionModule(new URL('../app/studio/backup-store.ts', import.meta.url));
 const fixture = await loadProductionModule(new URL('../app/studio/test-site/contract.ts', import.meta.url));
 const publishing = await loadProductionModule(new URL('../app/content/local-publishing.ts', import.meta.url));
 const block = { id: 'p', type: 'paragraph', text: 'Test', style: { paddingSides: { top: '8px' } } };
 const doc = { ...structuredClone(editor.initialStudioWorkspace.documents.find(item => item.kind === 'post')), blocks: [block] };
 const ws = { ...editor.initialStudioWorkspace, documents: [doc], activeDocumentId: doc.id, bin: [] };
 const set = template.createTemplateSet('Example');
 set.parts[0].nodes = [block];
 const store = { ...template.emptyTemplateStore(), sets: [set] };
 assert.doesNotThrow(() => template.validateTemplateStore(store));
 assert.throws(() => template.validateTemplateStore({ ...store, version: '0.68.0' }));
 const legacySet = structuredClone(set); legacySet.parts[0].nodes = [{ id: 'q', type: 'pullquote', text: 'Quote' }];
 assert.doesNotThrow(() => template.validateTemplateStore({ ...store, version: '0.68.0', sets: [legacySet] }));
 const publication = { version: 49, posts: [publishing.toLocallyPublishedArticle(doc)] };
 assert.doesNotThrow(() => validation.validatePublicationSnapshot(publication));
 assert.throws(() => validation.validatePublicationSnapshot({ ...publication, version: 48 }));
 const data = { format: 'acm-studio-backup', version: 35, exportedAt: '2026-10-31T12:00:00Z', workspace: ws, publications: JSON.stringify(publication), media: { folders: [], assets: [] } };
 assert.doesNotThrow(() => backup.validateStudioBackup(data));
 assert.throws(() => backup.validateStudioBackup({ ...data, version: 34 }));
 assert.equal(fixture.validTestSiteDocument({ format: 'acm-test-site', version: 46, siteId: 'test', documents: [doc] }), false);
});

test('HTML round trip retains the side ownership without freezing inherited values', async () => {
 const html = await loadProductionModule(new URL('../app/studio/studio-html-editor.ts', import.meta.url));
 const { withHtmlDom } = await import('./html-dom-fixture.mjs');
 const block = { id: 'padding-example', type: 'paragraph', text: 'Test', style: { paddingSides: { top: '8px' } } };
 await withHtmlDom(async () => {
  const encoded = html.blocksToHtml([block]);
  assert.match(encoded, /data-padding-sides/);
  const parsed = html.parseHtmlToBlocks(encoded, []);
  assert.deepEqual(parsed.blocks[0].style.paddingSides, { top: '8px' });
 });
});

test('fixture and global template envelopes preserve side ownership and gate old versions', async () => {
 const template = await loadProductionModule(new URL('../app/studio/template-model.ts', import.meta.url));
 const fixtureApi = await loadProductionModule(new URL('../app/studio/test-site/contract.ts', import.meta.url));
 const globalApi = await loadProductionModule(new URL('../app/studio/global-template-contract.ts', import.meta.url));
 const page = { id: 'home', kind: 'page', title: 'Home', slug: '', excerpt: '', status: 'published', updatedAt: '2026-10-31T12:00:00Z', tags: [], seoTitle: '', seoDescription: '', blocks: [] };
 const set = template.createTemplateSet('Original');
 const nav = { ...structuredClone(set), id: 'navigation', templates: [], parts: [{ id: 'nav', kind: 'header', name: 'Navigation', nodes: [{ id: 'menu', type: 'element', element: 'navigation' }] }] };
 const legacy = { format: 'acm-test-site', version: 9, siteId: 'test', documents: [page], categories: [], bin: [], activeDocumentId: 'home', homeDocumentId: 'home', templates: { ...template.emptyTemplateStore(), sets: [set, nav] }, siteNavigation: { setId: 'navigation', partId: 'nav' }, browserImportComplete: true, globalTemplates: [], publications: [{ document: page }] };
 const fixture = fixtureApi.testSiteCollection(structuredClone(legacy));
 fixture.documents[0].blocks = [{ id: 'p', type: 'paragraph', text: 'Test', style: { paddingSides: { top: '8px' } } }];
 assert.equal(fixture.version, 54);
 assert.equal(fixtureApi.validTestSiteDocument(fixture), true);
 assert.equal(fixtureApi.validTestSiteDocument({ ...fixture, version: 46 }), false);
 const initial = fixtureApi.testSiteCollection(structuredClone(legacy));
 const library = globalApi.createGlobalTemplateLibrary({ test: initial, test2: { ...initial, siteId: 'test2' } });
 library.migrations.test.bases[0].parts[0].nodes = fixture.documents[0].blocks;
 assert.equal(library.version, 46);
 assert.doesNotThrow(() => globalApi.validateGlobalTemplateLibrary(library));
 assert.throws(() => globalApi.validateGlobalTemplateLibrary({ ...library, version: 38 }));
});

test('clipboard preserves side ownership and rejects the previous envelope', async () => {
 const clipboard = await loadProductionModule(new URL('../app/studio/block-clipboard.ts', import.meta.url));
 const { withHtmlDom } = await import('./html-dom-fixture.mjs');
 const block = { id: 'p', type: 'paragraph', text: 'Test', style: { paddingSides: { top: '8px' } } };
 await withHtmlDom(() => {
  const encoded = clipboard.blockClipboardHtml([block]);
  assert.deepEqual(clipboard.readBlockClipboardPayload(encoded).blocks[0].style.paddingSides, { top: '8px' });
  const legacy = encoded.replace(/&quot;version&quot;:\d+/, '&quot;version&quot;:34');
  assert.notEqual(legacy, encoded);
  assert.equal(clipboard.readBlockClipboardPayload(legacy), null);
 });
});

test('editing a shorthand with existing side overrides retains every untouched override', () => {
 const initial = { padding: '10px', paddingSides: { right: '20px' } };
 const changed = lengths.updatePaddingSides(initial, [0], '8px');
 assert.deepEqual(changed.paddingSides, { top: '8px', right: '20px', bottom: '10px', left: '10px' });
 const cleared = lengths.updatePaddingSides(initial, [0], undefined);
 assert.deepEqual(cleared.paddingSides, { right: '20px', bottom: '10px', left: '10px' });
 const tablet = { padding: '12px', paddingSides: { right: '24px' } };
 const style = { paddingSides: { bottom: '4px' }, responsive: { tablet: lengths.updatePaddingSides(tablet, [0], '6px') } };
 assert.deepEqual(responsive.styleForViewport(style, 'tablet').paddingSides, { top: '6px', right: '24px', bottom: '12px', left: '12px' });
});

test('padding inheritance indicator follows ownership per side and device', async () => {
 const inheritance = await loadProductionModule(new URL('../app/studio/blocks/style-inheritance.tsx', import.meta.url));
 const selection = { paletteId: 'default', typographyId: 'default', blockStyles: { paragraph: { padding: '10px' } } };
 const block = { id: 'p', type: 'paragraph', text: 'Test' };
 const label = (style, owned, viewport = 'desktop') => inheritance.contentSettingInheritance({ ...block, style }, owned, selection, viewport).Padding;
 assert.equal(label({}, {}), true);
 assert.equal(label({ paddingSides: { top: '8px' } }, { paddingSides: { top: '8px' } }), true);
 const all = { top: '8px', right: '8px', bottom: '8px', left: '8px' };
 assert.equal(label({ paddingSides: all }, { paddingSides: all }), false);
 assert.equal(label({ paddingSides: { top: '8px' } }, {}, 'tablet'), true);
 assert.equal(label({ paddingSides: all, responsive: { tablet: { paddingSides: { top: '4px' } } } }, { paddingSides: { top: '4px' } }, 'tablet'), true);
 const blank = { paletteId: 'default', typographyId: 'default' };
 assert.equal(inheritance.contentSettingInheritance({ ...block, style: { paddingSides: { top: '8px' } } }, { paddingSides: { top: '8px' } }, blank, 'desktop').Padding, false);
 assert.equal(inheritance.contentSettingInheritance({ ...block, style: { paddingSides: { top: '8px' } } }, {}, blank, 'tablet').Padding, true);
 assert.equal(inheritance.contentSettingInheritance({ ...block, style: { paddingSides: { top: '8px' }, responsive: { tablet: { paddingSides: { top: '4px' } } } } }, { paddingSides: { top: '4px' } }, blank, 'tablet').Padding, false);
});
