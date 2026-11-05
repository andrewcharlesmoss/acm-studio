import test from 'node:test';
import assert from 'node:assert/strict';
import { addDocumentToWorkspace } from '../app/studio/studio-command-operations.mjs';
import { loadProductionModule } from './production-module.mjs';

const { orderedLibraryDocuments } = await loadProductionModule(new URL('../app/studio/library-reordering.ts', import.meta.url));

test('new pages follow existing page order without changing posts or existing ranks', () => {
  for (const pages of [
    [],
    [{ id: 'one', kind: 'page', pageOrder: 0 }, { id: 'two', kind: 'page', pageOrder: 1 }],
    [{ id: 'one', kind: 'page', pageOrder: -5 }, { id: 'two', kind: 'page', pageOrder: -2 }],
    [{ id: 'one', kind: 'page' }, { id: 'two', kind: 'page', pageOrder: 30 }],
    [{ id: 'one', kind: 'page', pageOrder: 2147483647 }],
  ]) {
    const post = { id: 'post', kind: 'post' };
    const input = { activeDocumentId: 'post', documents: [post, ...pages] };
    const result = addDocumentToWorkspace(input, { id: 'new', kind: 'page' });
    assert.deepEqual(result.documents.slice(0, -1), input.documents);
    assert.equal(result.activeDocumentId, 'new');
    assert.equal(orderedLibraryDocuments(result.documents, 'page').at(-1).id, 'new');
    assert.ok(result.documents.at(-1).pageOrder <= 2147483647);
  }
});

test('adding posts does not assign a page order', () => {
  const document = { id: 'post', kind: 'post' };
  assert.equal(addDocumentToWorkspace({ documents: [] }, document).documents[0], document);
});
