import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { evaluateProductionModule } from './production-module.mjs';

function fixture() {
  const calls = [], tasks = [], effects = [], attempt = { current: false }, exports = {};
  const options = { hostedHome: false, previewWindow: false, selectedSite: 'test', siteName: 'Test',
    testSite: { writable: true, draft: { version: 49, browserImportComplete: false }, installDraft: value => { calls.push(['install', value]); return true; }, flush: async () => calls.push('flush') },
    studioSession: { ready: true, workspace: { original: true } }, browserTemplateSession: { ready: true, store: { original: true } }, setSiteFeedback: message => calls.push(message) };
  evaluateProductionModule(readFileSync(new URL('../app/studio/use-browser-fixture-import.ts', import.meta.url), 'utf8'), {
    exports, queueMicrotask: task => tasks.push(task), require: name => name === 'react'
      ? { useRef: () => attempt, useEffect: effect => effects.push(effect) }
      : { importBrowserTestContent: (...args) => { calls.push(['import', ...args]); return { imported: true }; } },
  });
  return { calls, tasks, options, run: () => { exports.useBrowserFixtureImport(options); return effects.pop()(); } };
}

test('fixture import waits for readiness, can cancel before mutation, and imports only once across rerenders', async () => {
  const f = fixture();
  f.options.studioSession.ready = false; f.run(); assert.equal(f.tasks.length, 0);
  f.options.studioSession.ready = true;
  const cancel = f.run(); cancel(); f.tasks.pop()(); assert.deepEqual(f.calls, []);
  f.run(); f.tasks.pop()();
  assert.equal(f.calls[0][0], 'import');
  assert.equal(f.calls[0][2], f.options.studioSession.workspace);
  assert.equal(f.calls[1][0], 'install'); assert.equal(f.calls[2], 'flush');
  f.run(); assert.equal(f.tasks.length, 0);
  assert.deepEqual(f.options.studioSession.workspace, { original: true });
});

test('completed, preview and read-only contexts never import, and rejected installation retains recovery feedback', () => {
  for (const version of [10, 11, 49]) {
    const f = fixture(); f.options.testSite.draft = { version, browserImportComplete: true };
    f.run(); assert.equal(f.tasks.length, 0); assert.deepEqual(f.calls, []);
  }
  for (const condition of ['preview', 'readOnly']) {
    const f = fixture();
    if (condition === 'preview') f.options.previewWindow = true;
    if (condition === 'readOnly') f.options.testSite.writable = false;
    f.run(); assert.equal(f.tasks.length, 0);
  }
  const f = fixture(); f.options.testSite.installDraft = () => false;
  f.run(); f.tasks.pop()();
  assert.match(f.calls.at(-1), /browser originals were kept/);
  assert.ok(!f.calls.includes('flush'));
});
