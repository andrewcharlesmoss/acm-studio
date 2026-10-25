import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createDepartureLinkHandler } from '../app/studio/departure-link.ts';
const link = { href: '/studio/ui', target: '', hasAttribute: () => false };
const event = (extra = {}) => ({ defaultPrevented: false, button: 0, metaKey: false, ctrlKey: false, shiftKey: false, altKey: false, preventDefault() { this.defaultPrevented = true; }, stopPropagation() {}, ...extra });
const settle = () => new Promise(resolve => setImmediate(resolve));
test('production departure awaits content and both template owners and rejects template save failure', async () => {
 const source = readFileSync(new URL('../app/studio/studio-prototype.tsx', import.meta.url), 'utf8');
 const prepareSource = source.match(/async function prepareChromeDeparture\(\) \{([\s\S]*?)\n {2}\}/)[1];
 const calls = [];
 let fail = false;
 const prepare = new Function('flushSitesDisclosureSaves', 'prepareNavigationLeave', 'confirmCodeEditorDiscard', 'selectedSite', 'testSite', 'currentWorkspaceSession', 'globalTemplates', 'browserTemplateSession', `return async () => {${prepareSource}};`)(
  async () => { calls.push('disclosure'); return true; }, async () => { calls.push('navigation'); return true; }, () => true, 'test',
  { pauseEditing: value => calls.push(value ? 'pause' : 'resume'), failure: null },
  { writable: true, flush: async () => calls.push('content') },
  { session: { ready: true, flush: async () => { calls.push('global'); if (fail) throw Error('save failed'); } } },
  { ready: true, flush: async () => calls.push('browser templates') },
 );
 assert.equal(await prepare(), true);
 assert.deepEqual(calls, ['disclosure', 'navigation', 'pause', 'content', 'global', 'browser templates', 'resume']);
 fail = true; calls.length = 0;
 await assert.rejects(prepare(), /save failed/);
 assert.equal(calls.at(-1), 'resume');
 assert.equal(calls.includes('browser templates'), false);
});

test('a replacement handler shares the pending departure across rerenders', async () => {
 const pending = { current: false }; let release; let saves = 0;
 const prepare = () => { saves++; return new Promise(resolve => { release = resolve; }); };
 createDepartureLinkHandler(prepare, () => {}, undefined, pending)(event(), link);
 await settle();
 createDepartureLinkHandler(prepare, () => {}, undefined, pending)(event(), link);
 await settle(); assert.equal(saves, 1); release(false); await settle();
 assert.equal(pending.current, false);
});
test('same-tab departures await preparation and suppress duplicate activation', async () => {
 let release; let saves = 0; const visits = [];
 const handler = createDepartureLinkHandler(() => { saves++; return new Promise(resolve => { release = resolve; }); }, href => visits.push(href));
 handler(event(), link); handler(event(), link); await settle();
 assert.equal(saves, 1); assert.deepEqual(visits, []); release(true); await settle(); assert.deepEqual(visits, ['/studio/ui']);
});
test('refusal and failed saves retain the current view and allow retry', async () => {
 let allowed = false; let visits = 0; let failures = 0;
 const handler = createDepartureLinkHandler(async () => { if (allowed === 'error') throw Error(); return allowed; }, () => visits++, () => failures++);
 handler(event(), link); await settle(); assert.equal(visits, 0);
 allowed = 'error'; handler(event(), link); await settle(); assert.equal(failures, 1);
 allowed = true; handler(event(), link); await settle(); assert.equal(visits, 1);
});
test('modified clicks and new-tab links remain native', async () => {
 let saves = 0; const handler = createDepartureLinkHandler(async () => { saves++; return true; }, () => {});
 for (const extra of [{ metaKey: true }, { ctrlKey: true }, { shiftKey: true }, { altKey: true }, { button: 1 }]) { const e = event(extra); handler(e, link); assert.equal(e.defaultPrevented, false); }
 const e = event(); handler(e, { ...link, target: '_blank' }); assert.equal(e.defaultPrevented, false); await settle(); assert.equal(saves, 0);
});

test('Site Editor departures flush current settings and the current embedded frame only after activation', async () => {
 const source = readFileSync(new URL('../app/studio/site-editor/site-editor-preview.tsx', import.meta.url), 'utf8');
 const body = source.match(/function departureHandler\([^\n]+\) \{([\s\S]*?)\n {2}\}/)?.[1];
 assert.ok(body, 'exercise the production Site Editor event adapter');
 const calls = []; const visits = []; const pending = { current: false };
 let release; let allowed = true; let settingsFail = false;
 const frame = { current: { prepareLeave: async () => { calls.push('frame'); return allowed; } } };
 const activate = new Function('createDepartureLinkHandler', 'flushSitesDisclosureSaves', 'designSettings', 'homeEditing', 'homeFrame', 'window', 'departurePending', 'event', 'link', body);
 const click = () => activate(createDepartureLinkHandler, async () => { calls.push('disclosure'); return true; }, { flush: async () => { calls.push('settings'); if (settingsFail) throw Error('save failed'); await new Promise(resolve => { release = resolve; }); } }, true, frame, { location: { assign: href => visits.push(href) } }, pending, event(), link);
 assert.deepEqual(calls, []);
 click(); await settle();
 click(); await settle(); assert.deepEqual(calls, ['disclosure', 'settings'], 'recreated event adapters share the pending guard');
 frame.current = { prepareLeave: async () => { calls.push('latest frame'); return allowed; } };
 release(); await settle(); assert.deepEqual(calls, ['disclosure', 'settings', 'latest frame']); assert.deepEqual(visits, ['/studio/ui']);
 allowed = false; click(); await settle(); release(); await settle(); assert.equal(visits.length, 1, 'refusal retains the editor');
 settingsFail = true; click(); await settle(); assert.equal(visits.length, 1, 'failed settings save retains the editor'); assert.equal(pending.current, false);
});
