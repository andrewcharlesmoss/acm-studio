import assert from 'node:assert/strict';
import test from 'node:test';
import { loadProductionModule } from './production-module.mjs';
const { fixtureDocumentRevisions } = await loadProductionModule(new URL('../app/studio/document-revisions.ts', import.meta.url));
const expected = { id: 'page', kind: 'page' };
const revision = () => ({ id: 'a'.repeat(64), savedAt: '2026-10-27T00:00:00Z', confirmed: true, document: { ...expected, title: 'Saved page', slug: 'saved-page', excerpt: '', seoTitle: '', seoDescription: '', tags: [], updatedAt: '2026-10-27T00:00:00Z', blocks: [{ id: 'body', type: 'paragraph', text: 'Saved content' }] } });
test('fixture revision validation projects editorial content without mutating the response', () => {
  const input = revision();
  input.document.status = 'published';
  const [result] = fixtureDocumentRevisions([input], expected);
  assert.equal(result.document.status, 'draft');
  assert.equal(result.document.title, 'Saved page');
  assert.equal(input.document.status, 'published');
});
test('fixture revision validation rejects malformed, foreign and excessive histories', () => {
  for (const value of [null, {}, Array(202).fill(revision()), [{ ...revision(), id: 'bad' }], [{ ...revision(), savedAt: 'invalid' }], [{ ...revision(), confirmed: undefined }], [{ ...revision(), document: { ...revision().document, id: 'other' } }], [{ ...revision(), document: { ...revision().document, kind: 'post' } }], [{ ...revision(), document: { ...revision().document, blocks: [{ id: 'bad', type: 'unknown' }] } }]]) {
    assert.throws(() => fixtureDocumentRevisions(value, expected));
  }
  assert.deepEqual(fixtureDocumentRevisions([], expected), []);
});

test('restoring a current revision preserves publication and document ownership fields', async () => {
  const { restoreCurrentDocumentRevision } = await loadProductionModule(new URL('../app/studio/document-revisions.ts', import.meta.url));
  const document = { ...revision().document, status: 'published', publishedAt: '2026-10-26T00:00:00Z', categoryIds: ['category'], pageOrder: 4, templateOverrides: { author: false, category: true } };
  const current = { version: 29, activeDocumentId: document.id, documents: [document], categories: [{ id: 'category', name: 'Current category' }], bin: [] };
  const before = structuredClone(current);
  const saved = { ...revision().document, title: 'Earlier title', categoryIds: [], status: 'draft', pageOrder: 1 };
  const result = restoreCurrentDocumentRevision(current, saved, document);
  assert.equal(result.documents[0].title, 'Earlier title');
  for (const field of ['status', 'publishedAt', 'categoryIds', 'pageOrder', 'templateOverrides']) assert.deepEqual(result.documents[0][field], document[field]);
  assert.deepEqual(current, before);
  for (const workspace of [
    { ...current, documents: [{ ...document, title: 'Concurrent edit' }] },
    { ...current, documents: [] },
    { ...current, activeDocumentId: 'another' },
  ]) {
    const unchanged = structuredClone(workspace);
    assert.throws(() => restoreCurrentDocumentRevision(workspace, saved, document), /document changed/);
    assert.deepEqual(workspace, unchanged);
  }
  assert.throws(() => restoreCurrentDocumentRevision(current, { ...saved, id: 'foreign' }, document), /another document/);
});
