import test from 'node:test';
import assert from 'node:assert/strict';
import { loadProductionModule } from './production-module.mjs';
import { withHtmlDom } from './html-dom-fixture.mjs';
const load = path => loadProductionModule(new URL(path, import.meta.url));
const model = await load('../app/content/model.ts');
const editor = await load('../app/studio/editor-model.ts');
const workspace = await load('../app/studio/workspace-validation.ts');
const templates = await load('../app/studio/template-model.ts');
const clipboard = await load('../app/studio/block-clipboard.ts');
const fixture = await load('../app/studio/test-site/contract.ts');

const legacyGroup = { id: 'legacy-group', type: 'group', layout: 'flow', allowedBlocks: ['divider', 'separator', 'post-author'], children: [{ id: 'legacy-divider', type: 'divider' }] };

test('legacy block allowlists migrate without mutating stored data or accepting duplicate and invalid entries', () => {
  const before = structuredClone(legacyGroup);
  const migrated = model.migrateLegacyBlockTypeNames(legacyGroup);
  assert.deepEqual(JSON.parse(JSON.stringify(migrated.allowedBlocks)), ['separator', 'author-name']);
  assert.equal(migrated.children[0].type, 'separator');
  assert.deepEqual(legacyGroup, before);
  const duplicate = model.migrateLegacyBlockTypeNames({ ...legacyGroup, allowedBlocks: ['divider', 'divider'] });
  assert.equal(workspace.validContentBlocks([duplicate]), false);
  const invalid = model.migrateLegacyBlockTypeNames({ ...legacyGroup, allowedBlocks: ['divider', 'not-a-block'] });
  assert.equal(workspace.validContentBlocks([invalid]), false);
});

test('workspace, template and clipboard readers migrate legacy allowlists', () => {
  const saved = structuredClone(editor.initialStudioWorkspace);
  saved.documents[0].blocks = [legacyGroup];
  const restored = workspace.migrateStudioWorkspace(saved);
  assert.deepEqual(JSON.parse(JSON.stringify(restored.documents[0].blocks[0].allowedBlocks)), ['separator', 'author-name']);
  const set = templates.createTemplateSet('Legacy');
  set.parts[0].nodes = [legacyGroup];
  const store = templates.validateTemplateStore({ ...templates.emptyTemplateStore(), sets: [set] });
  assert.deepEqual(JSON.parse(JSON.stringify(store.sets[0].parts[0].nodes[0].allowedBlocks)), ['separator', 'author-name']);
  const copied = clipboard.blockClipboardHtml([legacyGroup]);
  withHtmlDom(() => assert.deepEqual(JSON.parse(JSON.stringify(clipboard.readBlockClipboardPayload(copied).blocks[0].allowedBlocks)), ['separator', 'author-name']));
});

test('local fixture readers migrate legacy Group and Column allowlists', () => {
  const source = fixture.testSiteCollection({ format: 'acm-test-site', version: 2, siteId: 'test', document: { id: 'home', kind: 'page', title: 'Home', slug: '', excerpt: '', status: 'draft', updatedAt: '2026-10-22T00:00:00.000Z', tags: [], seoTitle: '', seoDescription: '', blocks: [] } });
  source.documents[0].blocks = [legacyGroup];
  const restored = fixture.testSiteCollection(source);
  assert.deepEqual(JSON.parse(JSON.stringify(restored.documents[0].blocks[0].allowedBlocks)), ['separator', 'author-name']);
  const column = model.migrateLegacyBlockTypeNames({ id: 'column', type: 'column', allowedBlocks: ['document-title', 'reading-time'], children: [] });
  assert.deepEqual(JSON.parse(JSON.stringify(column.allowedBlocks)), ['title', 'time-to-read']);
});
