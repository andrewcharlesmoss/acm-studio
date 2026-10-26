import assert from 'node:assert/strict';
import test from 'node:test';
import { loadProductionModule } from './production-module.mjs';

const { navigationVisualPresentation: resolve } = await loadProductionModule(new URL('../app/studio/navigation-visual-presentation.ts', import.meta.url));
test('visual menu uses the effective Header design rather than the private recovery menu', () => {
  const node = { id: 'live-nav', type: 'element', element: 'navigation', layout: 'stack', gap: 24, visualStyle: { textColor: '#123456' } };
  const set = { id: 'shared', parts: [{ id: 'header', nodes: [{ id: 'row', type: 'group', children: [{ id: 'ref', type: 'part', partId: 'nested' }] }] }, { id: 'nested', nodes: [node] }] };
  const recovery = { id: 'site-menu', parts: [{ id: 'retired', nodes: [{ ...node, id: 'retired-nav' }] }] };
  const store = { sets: [recovery, set] }; const original = JSON.stringify(store);
  const visual = resolve(store, { setId: 'shared', partId: 'header' });
  assert.equal(visual.set, set); assert.equal(visual.node, node); assert.equal(JSON.stringify(store), original);
});
test('missing Header and cyclic references do not invent or persist navigation artwork', () => {
  const store = { sets: [{ id: 'shared', parts: [{ id: 'header', nodes: [{ id: 'ref', type: 'part', partId: 'header' }] }] }] };
  assert.equal(resolve(store, undefined), undefined);
  assert.equal(resolve(store, { setId: 'shared', partId: 'missing' }), undefined);
  assert.equal(resolve(store, { setId: 'shared', partId: 'header' }), undefined);
});
