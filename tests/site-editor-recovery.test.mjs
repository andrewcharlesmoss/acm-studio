import assert from 'node:assert/strict';
import test from 'node:test';
import { createIsolatedModuleLoader, loadProductionModule } from './production-module.mjs';
const contract = await loadProductionModule(new URL('../app/studio/site-editor/hosted-home-contract.ts', import.meta.url));

test('Site Editor uses peer adapters and grants exclusive actions only to its ready browser owner', () => {
  const browser = { ready: false, exclusiveWritable: false };
  const calls = [];
  const load = createIsolatedModuleLoader({ overrides: {
    '../use-studio-workspace': { useStudioWorkspace: () => browser },
    '../test-site/use-test-site': { useTestSite: (...args) => { calls.push(args); return { siteId: args[2] }; } },
    '../use-global-templates': { useGlobalTemplates: (...args) => { calls.push(['global', args[1], args[2], args[3], args[4]]); return {}; } },
  } });
  const { useSiteEditorSessions: sessions } = load('app/studio/site-editor/use-site-editor-sessions.ts');
  for (const [ready, owner] of [[false, false], [false, true], [true, true], [true, false]]) {
    Object.assign(browser, { ready, exclusiveWritable: owner }); calls.length = 0;
    sessions();
    assert.deepEqual(calls, [[true, false, 'test'], [true, false, 'test2'], ['global', true, false, false, ready && owner]]);
  }
  let pathname = '/studio/site-editor';
  const runtime = createIsolatedModuleLoader({ overrides: {
    react: {}, 'next/navigation': { usePathname: () => pathname },
    '../write-ownership': {}, './use-test-site': {}, '../use-global-templates': {},
    'react/jsx-runtime': { jsx: (type, props) => ({ type, props }) },
  } })('app/studio/test-site/broker-runtime.tsx');
  for (pathname of ['/studio', '/studio/', '/studio/site-editor', '/studio/site-editor/']) assert.ok(runtime.LocalSiteBrokerRuntime(), 'every shell retains the same persistent broker runtime');
  pathname = '/studio/ui'; assert.ok(runtime.LocalSiteBrokerRuntime(), 'other sections keep their lazy brokers');
});

test('hosted recovery retains a fallback, relays status and accepts recovery only from its exact parent and target', async () => {
  const parent = { postMessage: message => messages.push(message) }; const messages = []; const events = new Map();
  const slots = []; const effects = []; let cursor = 0;
  const react = {
    useState(initial) { const index = cursor++; if (!(index in slots)) slots[index] = initial; return [slots[index], update => { slots[index] = typeof update === 'function' ? update(slots[index]) : update; }]; },
    useRef(initial) { const index = cursor++; return slots[index] ??= { current: initial }; },
    useEffect(effect, deps) { const index = cursor++; const old = slots[index]; if (!old || deps.some((item, i) => !Object.is(item, old.deps[i]))) { slots[index] = { deps }; effects.push(() => { old?.cleanup?.(); slots[index].cleanup = effect(); }); } },
    useEffectEvent(callback) { const ref = react.useRef(callback); ref.current = callback; return (...args) => ref.current(...args); },
  };
  const window = { parent, location: { origin: 'http://localhost:3010' }, addEventListener: (name, listener) => events.set(name, listener), removeEventListener: name => events.delete(name) };
  const { useHostedHome: hostedHome } = createIsolatedModuleLoader({ globals: { window }, overrides: { react, './hosted-home-contract': contract } })('app/studio/site-editor/use-hosted-home.ts');
  let reconnects = 0; let exports = 0; let status = { label: 'Saving paused', warning: 'Saving tab unavailable. Your draft remains here.', reconnecting: false };
  const render = () => { cursor = 0; const result = hostedHome('test', { flush: async () => {} }, () => {}, 'page-one', false, status, { reconnect: () => reconnects++, exportDraft: () => exports++ }); while (effects.length) effects.shift()(); return result; };
  assert.equal(render().recoveryHosted, false, 'older or unavailable hosts retain the inner warning');
  assert.deepEqual(messages.find(message => message.action === 'save-status').status, status);
  const send = (action, patch = {}) => events.get('message')({ source: parent, origin: window.location.origin, data: { protocol: contract.hostedHomeProtocol, site: 'test', documentId: 'page-one', action }, ...patch });
  for (const patch of [{ source: {} }, { origin: 'https://example.test' }, { data: { protocol: contract.hostedHomeProtocol, site: 'test2', documentId: 'page-one', action: 'reconnect' } }, { data: { protocol: contract.hostedHomeProtocol, site: 'test', documentId: 'other-page', action: 'reconnect' } }]) await send('reconnect', patch);
  assert.equal(reconnects, 0);
  await send('host-recovery', { data: { protocol: contract.hostedHomeProtocol, site: 'test', documentId: 'page-one', action: 'host-recovery', status } }); assert.equal(render().recoveryHosted, true);
  await send('reconnect'); await send('export-draft'); assert.equal(reconnects, 1); assert.equal(exports, 1);
  status = { label: 'Saved locally', warning: null, reconnecting: false };
  assert.equal(render().recoveryHosted,false,'a changed status needs fresh host acknowledgement');
  await send('host-recovery', { data: { protocol: contract.hostedHomeProtocol, site: 'test', documentId: 'page-one', action: 'host-recovery', status: { ...status, label: 'Saving paused', warning: 'Older warning' } } });
  assert.equal(render().recoveryHosted,false,'a delayed acknowledgement cannot suppress the current fallback');
  assert.deepEqual(messages.filter(message => message.action === 'save-status').at(-1).status, status, 'successful recovery clears the host warning without replacing draft content');
});

test('host save status rejects malformed or unbounded payloads', () => {
  const valid = { label: 'Unsaved changes', warning: null, reconnecting: false };
  assert.equal(contract.validHostedSaveStatus(valid), true);
  const bounded = contract.boundedHostedSaveStatus({ ...valid, label: 'x'.repeat(300), warning: 'y'.repeat(3000) });
  assert.equal(contract.validHostedSaveStatus(bounded),true);
  assert.equal(bounded.warning.length,2000);
  for (const value of [null, {}, { ...valid, label: '' }, { ...valid, label: 'x'.repeat(201) }, { ...valid, warning: 'x'.repeat(2001) }, { ...valid, reconnecting: 'false' }]) assert.equal(contract.validHostedSaveStatus(value), false);
});
