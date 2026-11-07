import assert from 'node:assert/strict';
import test from 'node:test';
import { loadProductionModule } from './production-module.mjs';

const model = await loadProductionModule(new URL('../app/studio/site-editor/styles-preview-state.ts', import.meta.url));
const design = await loadProductionModule(new URL('../app/studio/site-editor/website-design.ts', import.meta.url));
const fixture = await loadProductionModule(new URL('../app/studio/test-site/contract.ts', import.meta.url));
const editor = await loadProductionModule(new URL('../app/studio/editor-model.ts', import.meta.url));
const templates = await loadProductionModule(new URL('../app/studio/template-model.ts', import.meta.url));
const globals = await loadProductionModule(new URL('../app/studio/global-template-contract.ts', import.meta.url));
const backups = await loadProductionModule(new URL('../app/studio/backup-store.ts', import.meta.url));
const { DEFAULT_GRADIENTS } = await loadProductionModule(new URL('../app/content/background-gradient.ts', import.meta.url));
const copy = value => JSON.parse(JSON.stringify(value));
const unset = { id: 'one', name: 'Colour 1', gradient: null };
const filled = { id: 'two', name: 'Colour 2', gradient: DEFAULT_GRADIENTS[0].value };
const website = { identity: {}, styles: { colours: { gradients: { one: unset, two: filled } } } };

test('unset gradients survive portable validation, inheritance, removal and undo', () => {
  assert.deepEqual(design.validateWebsiteDesign(website), website);
  let state = model.createStylesPreview();
  const apply = action => { state = model.stylesPreviewReducer(state, action); };
  apply({ type: 'colours', scope: 'global', patch: website.styles.colours });
  assert.equal(model.resolvePreviewStyle(state.present, 'test').colours.gradients.one.gradient, null);
  apply({ type: 'remove-custom-gradients', scope: 'test' });
  const removed = model.resolvePreviewStyle(state.present, 'test').colours;
  assert.equal(removed.gradients.one, null);
  assert.equal(removed.retiredGradients.one, undefined);
  assert.deepEqual(removed.retiredGradients.two, filled.gradient);
  apply({ type: 'undo' });
  assert.equal(model.resolvePreviewStyle(state.present, 'test').colours.gradients.one.gradient, null);
});

test('fixture and global library versions preserve unset entries and reject them in old envelopes', () => {
  const page = copy(editor.initialStudioWorkspace.documents.find(item => item.kind === 'page'));
  const base = fixture.testSiteCollection({ format: 'acm-test-site', version: 2, siteId: 'test', document: page });
  const site = { ...base, websiteDesign: website };
  assert.equal(fixture.validTestSiteDocument(site), true);
  assert.equal(fixture.validTestSiteDocument({ ...site, version: 48 }), false);
  assert.throws(() => fixture.testSiteCollection({ ...site, version: 48 }), /Unset custom gradients/);
  assert.equal(fixture.testSiteCollection(site).websiteDesign.styles.colours.gradients.one.gradient, null);
  assert.equal(fixture.testSiteCollection({ ...base, version: 48 }).version, 52);
  const set = templates.createTemplateSet('Shared');
  const store = { ...templates.emptyTemplateStore(), sets: [set] };
  const sites = {};
  for (const siteId of ['test', 'test2']) {
    const navigation = { ...copy(set), id: `${siteId}-navigation`, templates: [], parts: [{ id: `${siteId}-part`, name: 'Navigation', kind: 'header', nodes: [{ id: `${siteId}-nav`, type: 'element', element: 'navigation' }] }], navigation: [] };
    sites[siteId] = { templates: { ...copy(store), sets: [copy(set), navigation] }, siteNavigation: { setId: navigation.id, partId: navigation.parts[0].id } };
  }
  const library = { ...globals.createGlobalTemplateLibrary(sites), websiteDesignDefaults: website };
  assert.equal(globals.validateGlobalTemplateLibrary(library).websiteDesignDefaults.styles.colours.gradients.one.gradient, null);
  assert.throws(() => globals.validateGlobalTemplateLibrary({ ...library, version: 40 }), /Unset custom gradients/);
  const archive = { format: 'acm-studio-backup', version: 37, exportedAt: '2026-11-04T00:00:00Z', workspace: copy(editor.initialStudioWorkspace), publications: null, media: { folders: [], assets: [] }, globalTemplates: library };
  assert.equal(backups.validateStudioBackup(archive).globalTemplates.websiteDesignDefaults.styles.colours.gradients.one.gradient, null);
  assert.throws(() => backups.validateStudioBackup({ ...archive, version: 36 }), /Unset custom gradients/);
});

test('current backups retain image renditions and old backup versions reject them', () => {
  const asset = { id: 'media-1', name: 'Image.png', type: 'image/png', size: 1, createdAt: '2026-10-27T00:00:00.000Z', updatedAt: '2026-10-27T00:00:00.000Z', folderId: null, altText: '', caption: '', dataBase64: 'AA==', imageRenditions: { version: 1, bundles: [{ sourceDigest: 'a'.repeat(64), width: 1200, height: 800, variants: [{ key: 'medium', width: 300, height: 200, type: 'image/png', size: 1, digest: 'b'.repeat(64), dataBase64: 'AA==' }] }] } };
  const archive = { format: 'acm-studio-backup', version: 37, exportedAt: '2026-11-04T00:00:00Z', workspace: copy(editor.initialStudioWorkspace), publications: null, media: { folders: [], assets: [asset] } };
  assert.deepEqual(backups.validateStudioBackup(archive).media.assets[0].imageRenditions, asset.imageRenditions);
  assert.throws(() => backups.validateStudioBackup({ ...archive, version: 6 }), /Image sizes require backup v7/);
});
