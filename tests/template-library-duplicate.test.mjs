import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadProductionModule } from './production-module.mjs';

const { duplicateTemplateLibraryEntry } = await loadProductionModule(new URL('../app/studio/template-library.ts', import.meta.url));
const { createReferenceTemplateParts } = await loadProductionModule(new URL('../app/studio/reference-template-parts.ts', import.meta.url));

test('duplicating a template part retains the original and gives the copy fresh IDs', () => {
  const set = createReferenceTemplateParts();
  const source = set.parts.find(part => part.id === 'tt5-header');
  const store = { version: '0.72.0', sets: [set], bin: [] };
  const result = duplicateTemplateLibraryEntry(store, set.id, source.id);
  assert.ok(result);
  const parts = result.store.sets.find(item => item.id === set.id).parts;
  const copy = parts.find(item => item.id === result.copyId);
  assert.equal(copy.name, 'Header Copy');
  assert.notEqual(copy.id, source.id);
  assert.notEqual(copy.nodes[0].id, source.nodes[0].id);
  assert.deepEqual(parts.find(item => item.id === source.id), source);
  assert.equal(duplicateTemplateLibraryEntry(store, set.id, 'missing'), null);
});
