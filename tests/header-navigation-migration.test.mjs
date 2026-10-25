import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { loadViteModule as runnerImport } from './production-module.mjs';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('..', import.meta.url));
const loadProductionModule = async url => (await runnerImport(fileURLToPath(url), { root, resolve: { dedupe: ['react', 'react-dom'] }, environments: { inline: { resolve: { noExternal: [/^@acm\//] } } } })).module;
import { mkdtemp, readFile, writeFile, mkdir, rm, realpath } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createGlobalTemplateStore } from '../scripts/global-template-store.mjs';
import { revisionOf } from '../scripts/test-site-store.mjs';
const globals = await loadProductionModule(new URL('../app/studio/global-template-contract.ts', import.meta.url));
const model = await loadProductionModule(new URL('../app/studio/template-model.ts', import.meta.url));
const { TestSiteNavigation } = await loadProductionModule(new URL('../app/studio/test-site/navigation.tsx', import.meta.url));
const { TemplateDocument } = await loadProductionModule(new URL('../app/studio/template-renderer.tsx', import.meta.url));
const { assertGlobalTemplateRemoval } = await loadProductionModule(new URL('../app/studio/global-template-deletion.ts', import.meta.url));
const { collectGlobalTemplateDependencies } = await loadProductionModule(new URL('../app/studio/template-dependencies.ts', import.meta.url));
const { retainFixtureTemplateContent } = await loadProductionModule(new URL('../app/studio/test-site/template-content.ts', import.meta.url));
const { renderTestSite } = await loadProductionModule(new URL('../app/studio/test-site/render.tsx', import.meta.url));
function fixture() {
  const design = model.createTemplateSet();
  const navigation = { ...structuredClone(design), id: 'studio-global-navigation', templates: [], parts: [{ id: 'studio-global-navigation-part', kind: 'header', name: 'Navigation', nodes: [{ id: 'old-menu', type: 'element', element: 'navigation' }] }], navigation: [] };
  const library = { format: 'acm-global-templates', version: 2, templates: { ...model.emptyTemplateStore(), sets: [design, navigation] }, migrations: { test: { bindings: [], bases: [] }, test2: { bindings: [], bases: [] } } };
  const sites = Object.fromEntries(['test', 'test2'].map(siteId => {
    const menu = { ...structuredClone(navigation), id: `${siteId}-menu`, navigation: [{ id: `${siteId}-home`, label: `${siteId} home`, url: '/#document=home' }, { id: `${siteId}-external`, label: 'External', url: 'https://example.com/', opensInNewTab: true, children: [{ id: `${siteId}-child`, label: 'Child', url: '/child' }] }] };
    library.migrations[siteId] = { bindings: [{ setId: menu.id, globalSetId: navigation.id, ids: { [navigation.id]: menu.id }, overrides: [] }], bases: [menu] };
    const document = { id: 'home', kind: 'page', title: 'Home', slug: '', excerpt: '', status: 'draft', updatedAt: '2026-01-01T00:00:00.000Z', blocks: [], tags: [], seoTitle: '', seoDescription: '' };
    return [siteId, { format: 'acm-test-site', version: 4, siteId, documents: [document], categories: [], bin: [], activeDocumentId: 'home', homeDocumentId: 'home', browserImportComplete: true, templates: { ...model.emptyTemplateStore(), sets: [structuredClone(design), menu] }, siteNavigation: { setId: menu.id, partId: navigation.parts[0].id } }];
  }));
  return { library, sites };
}
test('v2 migration retains all assignments, complete recovery navigation and independent canonical menus', () => {
  const { library, sites } = fixture(), before = JSON.stringify({ library, sites });
  const migrated = globals.validateGlobalTemplateLibrary(library);
  assert.equal(migrated.version, 3);
  assert.deepEqual(migrated.navigationRecovery, library.templates.sets[1]);
  assert.deepEqual(migrated.templates.sets[1].parts, []);
  assert.deepEqual(globals.validateGlobalTemplateLibrary(migrated), migrated, 'migration is idempotent');
  for (const siteId of ['test', 'test2']) {
    const source = sites[siteId];
    const bindings = globals.migrateGlobalTemplateBindings(source.templates, migrated, siteId);
    const effective = globals.effectiveGlobalTemplates(source.templates, migrated, bindings);
    assert.ok(effective.sets.every(set => set.navigation[0].label === `${siteId} home`));
    assert.deepEqual(effective.assignments, source.templates.assignments);
    assert.deepEqual(effective.sets[1].navigation, source.templates.sets[1].navigation);
    assert.ok(globals.sharedHeaderReference(effective, migrated, bindings));
  }
  assert.equal(JSON.stringify({ library, sites }), before);
});
test('generated Existing Presentation and assigned templates render one shared Header and no standalone menu', () => {
  const { library, sites } = fixture(), migrated = globals.validateGlobalTemplateLibrary(library);
  for (const siteId of ['test', 'test2']) {
    const source = sites[siteId];
    for (const assigned of [false, true, "custom-without-header", "hidden-header"]) {
      const site = structuredClone(source);
      if (assigned) site.templates.assignments.push({ documentId: 'home', kind: 'page', setId: site.templates.sets[0].id, templateId: site.templates.sets[0].templates.find(t => t.kind === 'page').id });
      let design = migrated;
      if (typeof assigned === 'string') {
        design = structuredClone(migrated);
        const template = design.templates.sets[0].templates.find(t => t.kind === 'page');
        if (assigned === 'custom-without-header') template.nodes = template.nodes.filter(node => node.type !== 'part' || node.partId !== design.header.partId);
        else template.nodes.find(node => node.type === 'part' && node.partId === design.header.partId).editorial = { hidden: true };
      }
      const html = renderTestSite(site, 'revision', 'home', design);
      assert.equal((html.match(/data-template-element="navigation"/g) ?? []).length, 1);
      assert.equal((html.match(/data-template-part=/g) ?? []).length, assigned ? 2 : 1);
      assert.match(html, new RegExp(`${siteId} home`));
      assert.doesNotMatch(html, new RegExp(`${siteId === 'test' ? 'test2' : 'test'} home`));
    }
  }
});
test('assigned inherited Header navigation has no destinations in Edit, including non-writable Edit', () => {
  const { library, sites } = fixture(), migrated = globals.validateGlobalTemplateLibrary(library), source = sites.test;
  const effective = globals.effectiveGlobalTemplates(source.templates, migrated, globals.migrateGlobalTemplateBindings(source.templates, migrated, 'test'));
  const set = effective.sets[0], templateId = set.templates[0].id;
  for (const editingDocument of [false, true]) {
    const html = renderToStaticMarkup(createElement(TemplateDocument, { snapshot: { version: model.TEMPLATE_VERSION, set, templateId }, document: source.documents[0], editorCanvas: true, editingDocument }));
    assert.doesNotMatch(html, /href="https:\/\/example.com/);
    assert.doesNotMatch(html, /href="\/#document=home/);
  }
  const preview = renderToStaticMarkup(createElement(TemplateDocument, { snapshot: { version: model.TEMPLATE_VERSION, set, templateId }, document: source.documents[0] }));
  assert.match(preview, /href="https:\/\/example.com/);
  const fallback = renderToStaticMarkup(createElement(TestSiteNavigation, { site: { ...source, templates: effective }, headerReference: globals.sharedHeaderReference(effective, migrated, []), document: source.documents[0], editing: true }));
  assert.doesNotMatch(fallback, /href="https:\/\/example.com/);
});
test('owned gateway migration preserves exact raw v2 source and verifies persisted v3', async () => {
  const directory = await realpath(await mkdtemp(path.join(os.tmpdir(), 'header-migration-')));
  const { library, sites } = fixture(), raw = JSON.stringify(library, null, 2) + '\n';
  await mkdir(path.join(directory, 'work')); await writeFile(path.join(directory, 'work/global-template-library.json'), raw);
  const store = createGlobalTemplateStore({ root: directory, loadContracts: async () => globals, readSites: async () => sites });
  try {
    const read = await store.load(); assert.equal(read.library.version, 3); assert.equal(read.initialised, false);
    await assert.rejects(store.save(read.revision, read.library.templates, async () => {}), /initialise/); assert.equal(await readFile(path.join(directory, 'work/global-template-library.json'), 'utf8'), raw);
    let checked = false;
    const saved = await store.load(true, async () => { checked = true; });
    assert.equal(checked, true); assert.equal(saved.migrated, true);
    assert.equal(JSON.parse(await readFile(path.join(directory, 'work/global-template-library.json'), 'utf8')).version, 3);
    assert.equal(await readFile(path.join(directory, '.studio/global-template-history', `${revisionOf(library)}.json`), 'utf8'), raw);
    assert.equal((await store.load(true, async () => {})).migrated, false);
  } finally { await store.close(); await rm(directory, { recursive: true, force: true }); }
});

test('site saves write only the canonical menu and preserve raw recovery menus', () => {
  const { library, sites } = fixture(), migrated = globals.validateGlobalTemplateLibrary(library), source = sites.test;
  source.templates.sets[0].navigation = [{ id: 'recovery', label: 'Retained recovery', url: '/recovery' }];
  const effective = globals.effectiveGlobalTemplates(source.templates, migrated, globals.migrateGlobalTemplateBindings(source.templates, migrated, 'test'));
  const next = structuredClone(effective); next.sets[1].navigation[0].label = 'Changed menu';
  const saved = retainFixtureTemplateContent(source.templates, effective, next, source.siteNavigation.setId);
  assert.deepEqual(saved[0].navigation, source.templates.sets[0].navigation);
  assert.equal(saved[1].navigation[0].label, 'Changed menu');
  assert.deepEqual(sites.test2.templates.sets[1].navigation[0].label, 'test2 home');
  const projected = globals.effectiveGlobalTemplates({ ...source.templates, sets: saved }, migrated, globals.migrateGlobalTemplateBindings(source.templates, migrated, 'test'));
  assert.ok(projected.sets.every(set => set.navigation[0].label === 'Changed menu'));
  const invalid = structuredClone(effective); invalid.sets[0].navigation[0].label = 'Wrong owner';
  assert.throws(() => retainFixtureTemplateContent(source.templates, effective, invalid, source.siteNavigation.setId), /canonical menu/);
});

test('the shared Header role remains protected without ordinary document references', () => {
  const { library } = fixture(), migrated = globals.validateGlobalTemplateLibrary(library);
  const target = { setId: migrated.header.setId, entryId: migrated.header.partId };
  assert.ok(collectGlobalTemplateDependencies(migrated, target, []).some(item => item.kind === 'navigation' && item.blocking && !item.manageable));
  const next = structuredClone(migrated.templates);
  next.sets[0].templates = []; next.sets[0].parts = [];
  assert.throws(() => assertGlobalTemplateRemoval(migrated, next, {}, []), /shared Header/);
});
