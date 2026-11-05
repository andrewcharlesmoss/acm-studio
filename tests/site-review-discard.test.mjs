import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHostModuleEvaluator } from './production-module.mjs';

test('navigation discard permits only navigation-owned differences', () => {
  const source = readFileSync(new URL('../app/studio/test-site/use-test-site.ts', import.meta.url), 'utf8');
  const require = name => name === './contract' ? { testSiteCollection: value => value } : new Proxy({}, { get: (_, key) => key });
  const { canDiscardNavigationOnly } = createHostModuleEvaluator(['require', 'exports'], `${source}\nreturn exports;`)(require, {});
  const saved = { navigationMenus: [{ id: 'a', links: ['one'] }], defaultNavigationMenuId: 'a', navigationAssignments: [], siteNavigation: { setId: 'header' }, templates: { sets: [{ id: 'header', navigation: ['one'], parts: [] }] }, documents: [{ id: 'home', title: 'Home' }] };
  const draft = structuredClone(saved);
  draft.navigationMenus[0].links.push('two'); draft.templates.sets[0].navigation.push('two');
  assert.equal(canDiscardNavigationOnly(saved, draft), true);
  draft.documents[0].title = 'Unsaved';
  assert.equal(canDiscardNavigationOnly(saved, draft), false);
  draft.documents[0].title = 'Home'; draft.templates.sets[0].parts.push({ id: 'changed' });
  assert.equal(canDiscardNavigationOnly(saved, draft), false);
});
