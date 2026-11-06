import { test } from 'node:test';
import assert from 'node:assert/strict';
import { initialTemplateTarget } from '../app/studio/initial-template-target.mjs';

test('template URLs retain their requested target on initial render', () => {
  assert.deepEqual(initialTemplateTarget('templates', 'reference', 'footer', 'global'), { setId: 'reference', targetId: 'footer', scope: 'global' });
  assert.deepEqual(initialTemplateTarget(['templates', 'content'], ['one', 'two'], ['part', 'other'], ['site', 'global']), { setId: 'one', targetId: 'part', scope: 'site' });
  assert.deepEqual(initialTemplateTarget('templates', undefined, undefined, undefined), { setId: null, targetId: null, scope: 'global' });
  assert.equal(initialTemplateTarget('content', 'reference', 'footer', 'global'), undefined);
});
