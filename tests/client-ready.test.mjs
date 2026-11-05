import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { evaluateProductionModule, loadProductionModule } from './production-module.mjs';

test('client readiness preserves an empty server render and supplies a stable hydrated snapshot', async () => {
  const { useClientReady } = await loadProductionModule(new URL('../app/studio/use-client-ready.ts', import.meta.url));
  function Fixture() { return createElement('span', null, String(useClientReady())); }
  assert.equal(renderToStaticMarkup(createElement(Fixture)), '<span>false</span>');
  const snapshots = [];
  const exports = {};
  evaluateProductionModule(readFileSync(new URL('../app/studio/use-client-ready.ts', import.meta.url), 'utf8'), {
    exports, require: () => ({ useSyncExternalStore: (subscribe, client, server) => {
      snapshots.push({ subscribe, client, server }); return client();
    } }),
  });
  assert.equal(exports.useClientReady(), true);
  assert.equal(exports.useClientReady(), true);
  assert.equal(snapshots[0].server(), false);
  assert.equal(snapshots[0].subscribe, snapshots[1].subscribe);
  assert.equal(snapshots[0].client, snapshots[1].client);
  assert.doesNotThrow(() => snapshots[0].subscribe(() => {})());
});
