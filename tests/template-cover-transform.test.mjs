import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { loadProductionModule } from './production-module.mjs';
const { validatePublicationSnapshot, validateStudioWorkspace } = await loadProductionModule(new URL('../app/studio/workspace-validation.ts', import.meta.url));
const { createReferenceTemplateParts } = await loadProductionModule(new URL('../app/studio/reference-template-parts.ts', import.meta.url));
const { templateEditorBlocks, templateNodesFromBlocks, validateTemplateSet, validateTemplateStore, validateWorkspacePublicationTemplates, createTemplateSet, emptyTemplateStore, TEMPLATE_VERSION } = await loadProductionModule(new URL('../app/studio/template-model.ts', import.meta.url));
const { TemplateNodes } = await loadProductionModule(new URL('../app/studio/template-renderer.tsx', import.meta.url));
const { toLocallyPublishedArticle } = await loadProductionModule(new URL('../app/content/local-publishing.ts', import.meta.url));
const { withSavedDocumentRevisions } = await loadProductionModule(new URL('../app/studio/workspace-repository.ts', import.meta.url));
const { validateTemplatePackage } = await loadProductionModule(new URL('../app/studio/template-package.ts', import.meta.url));
const { validateStudioBackup } = await loadProductionModule(new URL('../app/studio/backup-store.ts', import.meta.url));
const { testSiteCollection, validTestSiteDocument } = await loadProductionModule(new URL('../app/studio/test-site/contract.ts', import.meta.url));
const { initialStudioWorkspace, createDocument } = await loadProductionModule(new URL('../app/studio/editor-model.ts', import.meta.url));
const { availableBlockTransformsInDocument, transformBlock } = await loadProductionModule(new URL('../app/studio/block-transforms.ts', import.meta.url));
test('Header Cover transform retains dynamic nodes through validation and reload', () => {
  const set = createReferenceTemplateParts();
  const header = set.parts.find(part => part.id === 'tt5-header');
  const [group] = templateEditorBlocks(header.nodes, set);
  const transform = availableBlockTransformsInDocument(group, [group]).find(item => item.id === 'group-to-cover');
  assert.ok(transform);
  const cover = transformBlock(group, transform, () => 'cover-test-id');
  const nodes = templateNodesFromBlocks([cover], header.nodes);
  header.nodes = nodes;
  assert.doesNotThrow(() => validateTemplateSet(set));
  const html = renderToStaticMarkup(createElement(TemplateNodes, { set, document: createDocument('page', 'test-page'), nodes, previewSiteTitle: 'Cover Site' }));
  assert.match(html, /Cover Site/);
  assert.match(html, /content-cover-inner/);
  assert.match(html, /Site navigation/);
  const store = { ...emptyTemplateStore(), sets: [set] };
  const restored = validateTemplateStore(JSON.parse(JSON.stringify(store)));
  assert.equal(restored.version, TEMPLATE_VERSION);
  assert.deepEqual(restored.sets[0].parts.find(part => part.id === 'tt5-header').nodes, JSON.parse(JSON.stringify(nodes)));
  assert.deepEqual(templateEditorBlocks(nodes, set)[0].children[0], group);
  assert.throws(() => validateTemplateStore({ ...store, version: '0.77.0' }), /inside Cover require template v0.78.0/);
  const legacy = { ...emptyTemplateStore(), version: '0.77.0' };
  assert.equal(validateTemplateStore(legacy).version, '0.78.0');
});

test('Cover template payload is version-gated in packages, backups, and site sources', () => {
  const set = createReferenceTemplateParts();
  const header = set.parts.find(part => part.id === 'tt5-header');
  header.nodes = [{ id: 'cover-gate-test', type: 'cover', src: '', alt: '', dimRatio: 50, children: header.nodes }];
  const store = { ...emptyTemplateStore(), sets: [set] };
  const pkg = { format: 'acm-studio-template-set', version: '0.78.0', set, media: [] };
  assert.equal(validateTemplatePackage(pkg).version, '0.78.0');
  assert.throws(() => validateTemplatePackage({ ...pkg, version: '0.77.0' }), /package v0.78.0/);
  const backup = { format: 'acm-studio-backup', version: 46, exportedAt: '2026-11-09T00:00:00.000Z', workspace: initialStudioWorkspace, templates: store, publications: null, media: { folders: [], assets: [] } };
  assert.equal(validateStudioBackup(backup).version, 46);
  assert.throws(() => validateStudioBackup({ ...backup, version: 45 }), /backup v46/);
  const doc = initialStudioWorkspace.documents[0];
  const base = testSiteCollection({ format: 'acm-test-site', version: 3, siteId: 'test', documents: [doc], activeDocumentId: doc.id, homeDocumentId: doc.id, bin: [], categories: [], templates: emptyTemplateStore(), browserImportComplete: true });
  const site = { ...base, templates: { ...base.templates, sets: [...base.templates.sets, set] }, version: 57 };
  assert.equal(validTestSiteDocument(site), true);
  assert.equal(validTestSiteDocument({ ...site, version: 56 }), false);
  assert.throws(() => testSiteCollection({ ...site, version: 56 }), /site source v57/);
  assert.equal(testSiteCollection({ ...base, version: 56 }).version, 57);
});

test('publication envelope v57 protects nested template Covers', () => {
 const set = createReferenceTemplateParts();
 const header = set.parts.find(part => part.id === 'tt5-header');
 header.nodes = [{ id: 'cover-published', type: 'cover', src: '', alt: '', dimRatio: 50, children: header.nodes }];
 const post = { localDocumentId: 'published-page', slug: 'published-page', title: 'Page', summary: '', displayDate: '', readingTime: '', publishedAt: '2026-11-09T00:00:00.000Z', section: '', blocks: [], mediaIds: [], templateSnapshot: { version: '0.78.0', set, templateId: 'template-test' } };
 assert.throws(() => validatePublicationSnapshot({ version: 56, posts: [post] }), /published-post snapshot v57/);
 assert.equal(validatePublicationSnapshot({ version: 57, posts: [post] }).version, 57);
 assert.equal(validatePublicationSnapshot({ version: 56, posts: [] }).version, 57);
});

test('workspace v66 gates retained Cover template revisions', () => {
 const set = createReferenceTemplateParts();
 const header = set.parts.find(part => part.id === 'tt5-header');
 header.nodes = [{ id: 'cover-revision', type: 'cover', src: '', alt: '', dimRatio: 50, children: header.nodes }];
 const document = initialStudioWorkspace.documents[0];
 const revision = { id: 'revision-test', savedAt: '2026-11-09T00:00:00.000Z', document, publication: { templateSnapshot: { version: '0.78.0', set, templateId: 'template-test' } } };
 const workspace = { ...initialStudioWorkspace, version: 66, documentRevisions: [revision] };
 assert.doesNotThrow(() => validateStudioWorkspace(workspace));
 assert.throws(() => validateStudioWorkspace({ ...workspace, version: 65 }));
 assert.doesNotThrow(() => validateStudioWorkspace({ ...initialStudioWorkspace, version: 65 }));
});

test('workspace repository retains binned publication with nested Cover template', () => {
 const set = createTemplateSet('Cover publication');
 const header = set.parts.find(part => part.kind === 'header');
 header.nodes = [{ id: 'published-cover', type: 'cover', src: '', alt: '', dimRatio: 50, children: [{ id: 'published-site-title', type: 'element', element: 'site-title' }] }];
 const doc = { ...initialStudioWorkspace.documents[0], id: 'binned-cover-page', kind: 'page', slug: 'cover-page' };
 const publication = toLocallyPublishedArticle(doc, { version: '0.78.0', set, templateId: set.templates.find(item => item.kind === 'page').id });
 const workspace = { ...initialStudioWorkspace, version: 66, bin: [{ id: 'cover-bin', deletedAt: '2026-11-09T00:00:00.000Z', document: doc, publication }], documentRevisions: [] };
 const oldWindow = globalThis.window; globalThis.window = { localStorage: { getItem: () => null } };
 try {
   const saved = withSavedDocumentRevisions(workspace);
   assert.equal(saved.version, 66);
   assert.equal(validateWorkspacePublicationTemplates(saved).bin[0].publication.templateSnapshot.set.parts.find(item => item.kind === 'header').nodes[0].type, 'cover');
   assert.throws(() => validateStudioWorkspace({ ...workspace, version: 65 }));
 } finally { globalThis.window = oldWindow; }
});
