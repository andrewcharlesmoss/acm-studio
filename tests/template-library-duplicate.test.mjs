import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadProductionModule } from './production-module.mjs';

const { duplicateTemplateLibraryEntry } = await loadProductionModule(new URL('../app/studio/template-library.ts', import.meta.url));
const { createReferenceTemplateParts } = await loadProductionModule(new URL('../app/studio/reference-template-parts.ts', import.meta.url));
const { TEMPLATE_VERSION, validateTemplateSet, visitTemplateNodes } = await loadProductionModule(new URL('../app/studio/template-model.ts', import.meta.url));

test('duplicating a template part retains the original and gives the copy fresh IDs', () => {
  const set = createReferenceTemplateParts();
  const source = set.parts.find(part => part.id === 'tt5-header');
  let navigation;
  visitTemplateNodes(source.nodes, node => { if (node.type === 'element' && node.element === 'navigation') navigation = node; });
  navigation.pageListBlock = { id: 'source-page-list', type: 'navigation-page-list' };
  const store = { version: TEMPLATE_VERSION, sets: [set], bin: [] };
  const result = duplicateTemplateLibraryEntry(store, set.id, source.id);
  assert.ok(result);
  const parts = result.store.sets.find(item => item.id === set.id).parts;
  const copy = parts.find(item => item.id === result.copyId);
  assert.equal(copy.name, 'Header Copy');
  assert.notEqual(copy.id, source.id);
  assert.notEqual(copy.nodes[0].id, source.nodes[0].id);
  let copiedNavigation;
  visitTemplateNodes(copy.nodes, node => { if (node.type === 'element' && node.element === 'navigation') copiedNavigation = node; });
  assert.notEqual(copiedNavigation.pageListBlock.id, navigation.pageListBlock.id);
  assert.equal(validateTemplateSet(result.store.sets[0]).id, set.id);
  assert.deepEqual(parts.find(item => item.id === source.id), source);
  assert.equal(duplicateTemplateLibraryEntry(store, set.id, 'missing'), null);
});
