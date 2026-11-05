import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { evaluateProductionModule } from './production-module.mjs';

function actions(overrides = {}) {
  const calls = [];
  const options = {
    selectedSite: 'test', previewWindow: false, writable: true, switchingSite: false,
    activeDocument: { id: 'page', status: 'draft' }, siteName: 'Test', codeEditorDirtyRef: { current: false },
    testSite: { writable: true, acknowledgeExplicitSave: () => true, saveExplicitly: async () => calls.push('save') },
    testContext: { publishDocument: async id => calls.push(['publish', id]), changePublicationStatus: async (...args) => calls.push(['status', ...args]) },
    publishing: { publish: () => calls.push('browser publish'), setPublishFeedback: value => calls.push(value) },
    studioSession: { requestSave: () => calls.push('browser save') }, setSiteFeedback: value => calls.push(value),
    ...overrides,
  };
  const exports = {};
  let state = false;
  evaluateProductionModule(readFileSync(new URL('../app/studio/use-studio-publication-actions.ts', import.meta.url), 'utf8'), {
    exports, Error, require: () => ({ useState: () => [state, value => { state = value; }] }),
  });
  return { calls, options, render: () => exports.useStudioPublicationActions(options) };
}

test('fixture publication waits for acknowledgement and reports a changed connection without discarding the draft', async () => {
  const fixture = actions();
  let complete;
  fixture.options.testContext.publishDocument = () => new Promise(resolve => { complete = resolve; });
  const pending = fixture.render().publishLocalDocument();
  assert.equal(fixture.render().publishingLocalSite, true);
  await fixture.render().publishLocalDocument();
  fixture.options.testSite.acknowledgeExplicitSave = () => false;
  complete(); await pending;
  assert.match(fixture.calls.at(-1), /connection changed.*draft was kept/);
  assert.equal(fixture.render().publishingLocalSite, false);
});

test('publication refuses read-only and preview contexts and protects dirty code', async () => {
  for (const overrides of [{ previewWindow: true }, { testSite: { writable: false } }]) {
    const fixture = actions(overrides); await fixture.render().publishLocalDocument(); assert.deepEqual(fixture.calls, []);
  }
  const fixture = actions({ codeEditorDirtyRef: { current: true } });
  await fixture.render().publishLocalDocument();
  assert.deepEqual(fixture.calls, ['Apply or discard code edits before publishing.']);
});

test('browser draft saving and publication retain their distinct owners', () => {
  const fixture = actions({ selectedSite: null });
  fixture.render().saveCurrentDocument(); assert.deepEqual(fixture.calls, ['browser save']);
  fixture.options.activeDocument.status = 'published';
  fixture.render().saveCurrentDocument(); assert.deepEqual(fixture.calls, ['browser save', 'browser publish']);
});

test('fixture status changes validate their target and preserve dirty or refused saves', async () => {
  const fixture = actions();
  await fixture.render().changeSitePublicationStatus('invalid'); assert.deepEqual(fixture.calls, []);
  await fixture.render().changeSitePublicationStatus('scheduled');
  assert.deepEqual(fixture.calls[0], ['status', 'page', 'scheduled', false]);
  await fixture.render().changeSitePublicationStatus('published');
  assert.deepEqual(fixture.calls[2], ['status', 'page', 'published', true]);
  fixture.options.codeEditorDirtyRef.current = true;
  await fixture.render().changeSitePublicationStatus('draft');
  assert.match(fixture.calls.at(-1), /Apply or discard code edits/);
  fixture.options.codeEditorDirtyRef.current = false;
  fixture.options.testSite.writable = false;
  const count = fixture.calls.length; await fixture.render().changeSitePublicationStatus('draft'); assert.equal(fixture.calls.length, count);
  fixture.options.testSite.writable = true;
  fixture.options.testContext.changePublicationStatus = async () => { throw Error('status save failed'); };
  await fixture.render().changeSitePublicationStatus('draft'); assert.equal(fixture.calls.at(-1), 'status save failed');
  assert.equal(fixture.render().publishingLocalSite, false);
});

test('fixture draft save respects switching and write permission and reports failures', async () => {
  const fixture = actions({ switchingSite: true });
  fixture.render().saveCurrentDocument(); assert.deepEqual(fixture.calls, []);
  fixture.options.switchingSite = false; fixture.options.testSite.writable = false;
  fixture.render().saveCurrentDocument(); assert.deepEqual(fixture.calls, []);
  fixture.options.testSite.writable = true;
  fixture.render().saveCurrentDocument(); await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(fixture.calls, ['save', null]);
  fixture.options.testSite.saveExplicitly = async () => { throw Error('draft save failed'); };
  fixture.render().saveCurrentDocument(); await new Promise(resolve => setImmediate(resolve));
  assert.equal(fixture.calls.at(-1), 'draft save failed');
});
