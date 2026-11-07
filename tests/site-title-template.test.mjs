import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { loadProductionModule } from './production-module.mjs';
const load = path => loadProductionModule(new URL(path, import.meta.url));
const { createTemplateSet, emptyTemplateStore, validateTemplateStore, validateTemplateSnapshot, templateEditorBlocks, templateNodesFromBlocks, TEMPLATE_VERSION } = await load('../app/studio/template-model.ts');
const { containsSiteTitle, permitsSiteTitlePaste } = await load('../app/studio/site-title-contract.ts');
const { templatePreviewSiteTitle } = await load('../app/studio/global-template-preview.ts');
const { validateStudioBackup } = await load('../app/studio/backup-store.ts');
const { createDocument } = await load('../app/studio/editor-model.ts');
const { toLocallyPublishedArticle } = await load('../app/content/local-publishing.ts');
const { validatePublicationSnapshot, validateStudioWorkspace } = await load('../app/studio/workspace-validation.ts');
const { replaceParagraphWithTemplateElement } = await load('../app/studio/template-content-insertion.ts');
const { validateTemplatePackage } = await load('../app/studio/template-package.ts');
const { blockLibraryEntryByType } = await load('../app/studio/blocks/library-catalogue.ts');
const { WebsiteDesignContext } = await load('../app/studio/site-editor/website-design-surface.tsx');
const { TemplateNodes } = await load('../app/studio/template-renderer.tsx');
const node = { id: 'site-title-node', type: 'element', element: 'site-title', tagName: 'h2', linkToHome: true, opensInNewTab: true, visualStyle: { textColor: '#123456' } };
const set = createTemplateSet('Site');
set.parts[0].nodes = [node];
const store = { ...emptyTemplateStore(), sets: [set] };
const doc = { id: 'doc', kind: 'page', title: '', slug: '', excerpt: '', status: 'draft', updatedAt: '', tags: [], seoTitle: '', seoDescription: '', blocks: [] };

test('Site Title validates and round-trips its settings without changing existing identity', () => {
  assert.equal(TEMPLATE_VERSION, '0.73.0');
  const result = validateTemplateStore(store);
  assert.equal(result.sets[0].parts[0].nodes[0].element, 'site-title');
  const projected = templateEditorBlocks([node]);
  const restored = templateNodesFromBlocks(projected, [node])[0];
  assert.equal(restored.id, node.id);
  assert.equal(restored.tagName, 'h2');
  assert.equal(restored.linkToHome, true);
  assert.equal(restored.opensInNewTab, true);
  assert.equal(restored.visualStyle.textColor, '#123456');
  assert.throws(() => validateTemplateStore({ ...store, version: '0.70.0' }), /Site Title/);
  assert.throws(() => validateTemplateSnapshot({ version: '0.70.0', set, templateId: set.templates[0].id }), /Site Title/);
  assert.throws(() => validateTemplatePackage({ format: 'acm-studio-template-set', version: '0.70.0', set, media: [] }), /Site Title/);
  assert.doesNotThrow(() => validateTemplatePackage({ format: 'acm-studio-template-set', version: TEMPLATE_VERSION, set, media: [] }));
  assert.throws(() => validateTemplateStore({ ...store, sets: [{ ...set, parts: [{ ...set.parts[0], nodes: [{ ...node, tagName: 'script' }] }, ...set.parts.slice(1)] }] }), /Site Title/);
});

test('Site Title renders the owning site name and safe home link', () => {
  const html = renderToStaticMarkup(createElement(TemplateNodes, { set: { ...set, identity: { ...set.identity, name: 'A Test Site', homeUrl: '/' } }, document: doc, nodes: [node] }));
  assert.match(html, /<h2/);
  assert.match(html, />A Test Site<\/a>/);
  assert.match(html, /target="_blank"/);
  assert.match(html, /rel="noopener noreferrer"/);
  const noLink = renderToStaticMarkup(createElement(TemplateNodes, { set, document: doc, nodes: [{ ...node, linkToHome: false }] }));
  assert.doesNotMatch(noLink, /<a /);
});


test('Site Title resolves the selected site identity and honours hidden title', () => {
  const render = identity => renderToStaticMarkup(createElement(WebsiteDesignContext.Provider, { value: { design: { identity, styles: {} }, imageUrl: value => value } }, createElement(TemplateNodes, { set, document: doc, nodes: [node] })));
  assert.match(render({ title: 'Selected site', hidden: {} }), /Selected site/);
  assert.doesNotMatch(render({ title: 'Hidden site', hidden: { title: true } }), /Hidden site/);
});


test('template slash insertion creates a Site Title at the selected paragraph', () => {
  const paragraph = { id: 'query', type: 'paragraph', text: '/site' };
  const part = { ...set.parts[0], nodes: [paragraph] };
  const owner = { ...set, parts: [part, ...set.parts.slice(1)] };
  const result = replaceParagraphWithTemplateElement(owner, part, part.nodes, paragraph.id, 'site', 'site-title', 'inserted');
  assert.equal(result.nodes[0].element, 'site-title');
  assert.equal(result.nodes[0].id, 'inserted');
  assert.equal(replaceParagraphWithTemplateElement(owner, part, part.nodes, paragraph.id, 'stale', 'site-title', 'inserted'), null);
});


test('Site Title is discoverable in the Block Library', () => {
  assert.equal(blockLibraryEntryByType['site-title'].label, 'Site Title');
  assert.equal(blockLibraryEntryByType['site-title'].href, '/studio/ui/blocks/site-title');
});


test('nested Site Title projections can only be pasted in templates', () => {
  const projection = templateEditorBlocks([node])[0];
  const nested = [{ id: 'outer', type: 'group', layout: 'stack', children: [projection] }];
  assert.equal(permitsSiteTitlePaste(nested, false), false);
  assert.equal(permitsSiteTitlePaste(nested, true), true);
  assert.equal(permitsSiteTitlePaste([{ id: 'p', type: 'paragraph', text: 'OK' }], false), true);
});

test('hidden or blank site titles produce no focusable link or empty heading', () => {
  const render = identity => renderToStaticMarkup(createElement(WebsiteDesignContext.Provider, { value: { design: { identity, styles: {} }, imageUrl: value => value } }, createElement(TemplateNodes, { set, document: doc, nodes: [node] })));
  for (const identity of [{ title: '', hidden: {} }, { title: 'Hidden', hidden: { title: true } }]) {
    const html = render(identity);
    assert.doesNotMatch(html, /<h[1-6]|<a /);
  }
});


test('encoded publication and workspace envelopes reject under-versioned Site Title', () => {
  const document = { ...createDocument('page', 'site-title-document'), status: 'published', publishedAt: '2026-11-05T12:00:00.000Z', updatedAt: '2026-11-05T12:00:00.000Z' };
  const article = toLocallyPublishedArticle(document, { version: TEMPLATE_VERSION, set, templateId: set.templates[0].id });
  const snapshot = { version: 51, posts: [article] };
  assert.doesNotThrow(() => validatePublicationSnapshot(snapshot));
  assert.throws(() => validatePublicationSnapshot({ ...snapshot, version: 50 }), /Site Title/);
  const workspace = { version: 60, documents: [document], activeDocumentId: document.id, categories: [], bin: [] };
  const backup = { format: 'acm-studio-backup', version: 39, exportedAt: '2026-11-05T12:00:00Z', workspace, publications: JSON.stringify(snapshot), media: { folders: [], assets: [] } };
  assert.doesNotThrow(() => validateStudioBackup(backup));
  assert.throws(() => validateStudioBackup({ ...backup, version: 38 }), /published-post snapshot is invalid/);
  const leaked = { ...workspace, documents: [{ ...document, blocks: [{ id: 'parent', type: 'group', layout: 'stack', children: templateEditorBlocks([node]) }] }] };
  assert.throws(() => validateStudioWorkspace(leaked), /invalid/);
});

test('editor preview title uses selected site projection and hidden values', async () => {
  const render = title => renderToStaticMarkup(createElement(TemplateNodes, { set, document: doc, nodes: [node], previewSiteTitle: title }));
  const { testSiteCollection } = await load('../app/studio/test-site/contract.ts');
  const page = { ...createDocument('page', 'preview-site-home'), slug: '' };
  const fixture = testSiteCollection({ format: 'acm-test-site', version: 2, siteId: 'test', document: page });
  const global = { identity: { title: 'Global site' }, styles: {} };
  const own = { identity: { title: 'Selected preview site' }, styles: {} };
  assert.match(render(templatePreviewSiteTitle('test', true, global, { ...fixture, websiteDesign: own })), /Selected preview site/);
  assert.doesNotMatch(render(templatePreviewSiteTitle('test', true, global, { ...fixture, websiteDesign: { ...own, identity: { ...own.identity, hidden: { title: true } } } })), /<h[1-6]|<a /);
  const legacyName = fixture.templates.sets.find(item => item.id === fixture.siteNavigation.setId).identity.name;
  assert.equal(templatePreviewSiteTitle('test', true, global, fixture), legacyName);
  assert.equal(templatePreviewSiteTitle('test', true, undefined, fixture), undefined);
  assert.equal(templatePreviewSiteTitle('neutral', true, global, fixture), undefined);
});


test('Site Title detection handles large imported arrays without overflowing', () => {
  assert.equal(containsSiteTitle(Array(150000).fill('x')), false);
  assert.equal(containsSiteTitle([...Array(150000).fill('x'), node]), true);
});
