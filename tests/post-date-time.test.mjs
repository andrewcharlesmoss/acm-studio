import assert from 'node:assert/strict';
import test from 'node:test';
import { loadProductionModule } from './production-module.mjs';
import { withHtmlDom } from './html-dom-fixture.mjs';

const load = path => loadProductionModule(new URL(path, import.meta.url));
const metadata = await load('../app/content/document-metadata.ts');
const dateToolbar = await load('../app/studio/blocks/date-toolbar.tsx');
const html = await load('../app/studio/studio-html-editor.ts');
const validation = await load('../app/studio/workspace-validation.ts');
const editor = await load('../app/studio/editor-model.ts');
const templates = await load('../app/studio/template-model.ts');
const publications = await load('../app/content/local-publishing.ts');

const timestamp = '2026-10-28T09:30:00.000Z';

test('Date picker input round-trips canonical UTC timestamps and rejects invalid local values', () => {
  assert.equal(dateToolbar.dateTimeToUtcInput(timestamp), '2026-10-28T09:30:00');
  assert.equal(dateToolbar.utcInputToDateTime('2026-10-28T09:30:00'), timestamp);
  assert.equal(dateToolbar.utcInputToDateTime('2026-02-30T09:30:00'), null);
  assert.equal(dateToolbar.utcInputToDateTime('2026-10-28T09:30'), timestamp);
  assert.equal(dateToolbar.utcInputToDateTime('2026-10-28T09:30:15'), '2026-10-28T09:30:15.000Z');
  assert.equal(metadata.validPostDateTime(timestamp), true);
  assert.equal(metadata.validPostDateTime('2026-10-28T09:30:00Z'), false);
});

test('Post Date override wins over document metadata and is validated in stored blocks', () => {
  const document = { kind: 'post', publishedAt: '2025-01-02T00:00:00.000Z' };
  assert.equal(metadata.formatDocumentDate(document, 'iso', { datetime: timestamp }), '2026-10-28');
  assert.equal(metadata.formatDocumentDate(document, 'iso'), '2025-01-02');
  const modifiedDocument = { ...document, updatedAt: '2025-03-04T00:00:00.000Z' };
  assert.equal(metadata.formatDocumentDate(modifiedDocument, 'iso', { dateSource: 'modified', datetime: timestamp }), '2025-03-04');
  assert.equal(metadata.documentDateTime(modifiedDocument, { dateSource: 'modified', datetime: timestamp }), modifiedDocument.updatedAt);
  const modified = dateToolbar.postDateWithSource({ id: 'date', type: 'post-date', datetime: timestamp }, 'modified');
  assert.equal(modified.dateSource, 'modified');
  assert.equal(modified.datetime, undefined);
  assert.equal(validation.validContentBlocks([{ id: 'date', type: 'post-date', datetime: timestamp }]), true);
  assert.equal(validation.validContentBlocks([{ id: 'date', type: 'post-date', datetime: 'not a date' }]), false);
});

test('Date override survives versioned document boundaries and HTML inspection serialisation', () => {
  const workspace = structuredClone(editor.initialStudioWorkspace);
  const post = workspace.documents.find(document => document.kind === 'post');
  const block = { id: 'date-override', type: 'post-date', datetime: timestamp };
  post.blocks = [block];
  assert.throws(() => validation.validateStudioWorkspace({ ...workspace, version: 38 }), /invalid|unsupported/i);
  assert.equal(validation.validateStudioWorkspace(workspace).documents.find(document => document.id === post.id).blocks[0].datetime, timestamp);

  const article = publications.toLocallyPublishedArticle(post);
  assert.throws(() => validation.validatePublicationSnapshot({ version: 30, posts: [article] }), /Post Date overrides require published-post snapshot v31/);
  assert.equal(validation.validatePublicationSnapshot({ version: 31, posts: [article] }).posts[0].blocks[0].datetime, timestamp);

  const set = templates.createTemplateSet('Post Date override');
  set.parts[0].nodes = [block];
  assert.throws(() => templates.validateTemplateStore({ ...templates.emptyTemplateStore(), version: '0.44.0', sets: [set] }), /Post Date overrides require template v0\.45\.0/);
  assert.match(html.blockToHtml(block), /data-date-time="2026-10-28T09:30:00\.000Z"/);
  assert.match(html.blockToHtml({ id: 'date-override', type: 'post-date' }), /data-date-time=""/);
  withHtmlDom(() => {
    const cleared = html.parseHtmlToBlock(html.blockToHtml({ id: 'date-override', type: 'post-date' }), block);
    assert.equal('error' in cleared, false);
    assert.equal(cleared.block.datetime, undefined, 'clearing an override must not resurrect it from the source block');
  });
});

test('template v0.44.0 keeps its library ordering while migrating to the current version', () => {
  const set = templates.createTemplateSet('Ordered template');
  const entry = set.parts[0];
  const store = {
    ...templates.emptyTemplateStore(),
    version: '0.44.0',
    sets: [set],
    libraryOrder: [{ id: `${set.id}/${entry.id}`, setId: set.id, entryId: entry.id }],
  };
  assert.equal(templates.validateTemplateStore(store).version, templates.TEMPLATE_VERSION);
});
