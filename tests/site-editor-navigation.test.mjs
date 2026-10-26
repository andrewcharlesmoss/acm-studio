import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { evaluateProductionModule, loadProductionModule } from './production-module.mjs';

const models = {};
for (const name of ['identity-preview-state', 'styles-preview-state', 'typography-preview-model', 'colours-preview-model']) models[`./${name}`] = await loadProductionModule(new URL(`../app/studio/site-editor/${name}.ts`, import.meta.url));

function fixture() {
  const slots = []; let index = 0; const listeners = {}; const effects = [];
  const react = {
    useState(initial) { const i = index++; if (!(i in slots)) slots[i] = typeof initial === 'function' ? initial() : initial; return [slots[i], value => { slots[i] = typeof value === 'function' ? value(slots[i]) : value; }]; },
    useRef(initial) { const i = index++; return slots[i] ??= { current: initial }; },
    useEffect(fn) { effects.push(fn); }, useLayoutEffect() {}, useCallback: fn => fn, useMemo: fn => fn(),
  };
  const calls = []; let designFlush = async () => {};
  const contexts = Object.fromEntries(['test', 'test2'].map(siteId => [siteId, {
    siteId, collection: { documents: [] }, siteNavigation: { setId: `${siteId}-menu` },
    templates: { ready: true, saveLabel: 'Saved locally' },
    session: { workspace: { documents: [] }, undo: () => calls.push(`${siteId}:undo`), redo: () => calls.push(`${siteId}:redo`), flush: async () => calls.push(`${siteId}:save`) },
    publicationFor: () => ({ status: 'draft' }),
  }]));
  const modules = { ...models,
    react, 'react/jsx-runtime': { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) },
    './use-site-editor-sessions': { useSiteEditorSessions: () => ({ test: contexts.test, test2: contexts.test2, globals: {}, browser: {} }) },
    '../test-site/use-test-site-context': { useTestSiteContext: context => context },
    '../test-site/sites': { localFixtureName: id => id },
    '../test-site/contract': { testDocumentHref: id => `#${id}` },
    '../studio-view-menu': { viewportWidthFor: () => 900 },
    '../project-local-links': { useProjectLocalVisit: () => ({}) },
    '../controls/use-blob-urls': { useBlobUrls: () => ({}) },
    '../ui/styles/canonical-style-guide': { UNIVERSAL_STYLE_PRESET: { layout: { spacing: 16 } } },
    '../studio-history-shortcuts.mjs': { handleStudioHistoryShortcut: (event, platform, undo, redo) => event.redo ? redo() : undo() },
    './use-website-design': { useWebsiteDesign: () => ({ history: models['./identity-preview-state'].createIdentityPreview(), stylesHistory: models['./styles-preview-state'].createStylesPreview(), ready: true, flush: async () => { calls.push('design:flush'); await designFlush(); }, dispatch: action => calls.push(`identity:${action.type}`), dispatchStyle: action => calls.push(`styles:${action.type}`) }) },
  };
  const exports = {};
  evaluateProductionModule(readFileSync(new URL('../app/studio/site-editor/site-editor-preview.tsx', import.meta.url), 'utf8'), {
    exports, require: id => modules[id] ?? new Proxy({}, { get: (_, key) => key }),
    document: { addEventListener: (event, fn) => { listeners[event] = fn; }, removeEventListener() {} }, navigator: { platform: 'MacIntel' }, requestAnimationFrame: fn => fn(),
  });
  const all = node => !node || typeof node !== 'object' ? [] : Array.isArray(node) ? node.flatMap(all) : [node, ...all(node.props?.children), ...all(node.props?.primary), ...all(node.props?.secondary), ...all(node.props?.targetControls)];
  function render() { index = 0; effects.length = 0; const tree = all(exports.SiteEditorPreview()); for (const effect of effects) effect(); return tree; }
  const find = type => render().find(node => node.type === type);
  const section = name => render().find(node => node.type === 'button' && node.props.children?.some?.(child => child?.type === 'strong' && child.props.children === name));
  const selectScope = value => find('SelectControl').props.onChange({ currentTarget: { value } });
  async function open() { section('Navigation').props.onClick(); await find('NavigationOverview').props.onOpen(); return find('SiteNavigationEditor'); }
  return { render, find, section, selectScope, open, calls, contexts, listeners, setDesignFlush: fn => { designFlush = fn; } };
}

test('Navigation opens the selected site’s canonical menu and session without another owner', async () => {
  const f = fixture();
  assert.equal(f.section('Navigation').props.disabled, false);
  let editor = await f.open();
  assert.equal(editor.props.templates, f.contexts.test.templates);
  assert.equal(editor.props.navigation, f.contexts.test.siteNavigation);
  await editor.props.onSave(); assert.deepEqual(f.calls, ['test:save']);
  let release; editor.props.prepareToLeaveRef.current = () => new Promise(resolve => { release = resolve; });
  f.selectScope('test2'); await new Promise(resolve => setImmediate(resolve));
  assert.equal(f.find('SiteNavigationEditor').props.siteId, 'test');
  release(false); await new Promise(resolve => setImmediate(resolve));
  assert.equal(f.find('SiteNavigationEditor').props.siteId, 'test', 'refused settlement keeps the old editor and owner');
  editor.props.prepareToLeaveRef.current = async () => true;
  f.selectScope('test2'); await new Promise(resolve => setImmediate(resolve));
  editor = f.find('SiteNavigationEditor');
  assert.equal(editor.props.siteId, 'test2'); assert.equal(editor.props.key, undefined);
  assert.equal(editor.props.templates, f.contexts.test2.templates);
  await editor.props.onSave(); assert.ok(f.calls.includes('test2:save'));
});

test('close waits for acknowledgement, blocks competing site transitions and preserves refusal', async () => {
  const f = fixture(); let editor = await f.open(); let release;
  editor.props.prepareToLeaveRef.current = () => new Promise(resolve => { release = resolve; });
  editor.props.onClose(); await Promise.resolve(); f.selectScope('test2');
  assert.ok(f.find('SiteNavigationEditor')); release(false); await new Promise(resolve => setImmediate(resolve));
  assert.equal(f.find('SiteNavigationEditor').props.siteId, 'test');
  editor = f.find('SiteNavigationEditor'); editor.props.prepareToLeaveRef.current = async () => true;
  editor.props.onClose(); await new Promise(resolve => setImmediate(resolve));
  assert.equal(f.find('SiteNavigationEditor'), undefined); assert.ok(f.find('NavigationOverview'));
});

test('Navigation history marks the active editor and uses fixture history rather than Identity', async () => {
  const f = fixture(); const editor = await f.open(); editor.props.historyChangeRef.current = () => f.calls.push('dirty');
  f.render(); f.listeners.keydown({}); f.listeners.keydown({ redo: true });
  assert.deepEqual(f.calls, ['dirty', 'test:undo', 'dirty', 'test:redo']);
});

test('Global Defaults has no invented authored menu and missing sources stay unavailable', async () => {
  const f = fixture(); f.selectScope('global'); await new Promise(resolve => setImmediate(resolve));
  assert.equal(f.section('Navigation').props.disabled, true);
  f.selectScope('test'); await new Promise(resolve => setImmediate(resolve));
  f.contexts.test.siteNavigation = undefined; f.section('Navigation').props.onClick();
  assert.equal(f.find('NavigationOverview').props.ready, false);
  await f.find('NavigationOverview').props.onOpen(); assert.equal(f.find('SiteNavigationEditor'), undefined);
});


test('site switching settles the latest menu only after other settings saves and blocks history meanwhile', async () => {
  const f = fixture(); const editor = await f.open(); let designSaved; let latestSettled = false;
  f.setDesignFlush(() => new Promise(resolve => { designSaved = resolve; }));
  editor.props.prepareToLeaveRef.current = async () => { assert.fail('menu must not settle before the unrelated save'); };
  f.selectScope('test2'); await Promise.resolve();
  f.render(); f.listeners.keydown({}); assert.ok(!f.calls.includes('test:undo'));
  editor.props.prepareToLeaveRef.current = async () => { latestSettled = true; return false; };
  designSaved(); await new Promise(resolve => setImmediate(resolve));
  assert.equal(latestSettled, true); assert.equal(f.find('SiteNavigationEditor').props.siteId, 'test');
});

test('Library menu history keeps immutable snapshots across queued commits and does not steal focus on mount', () => {
  const slots = []; let cursor = 0; const updates = []; const effects = []; let focused = 0;
  const react = {
    useState(initial) { const i = cursor++; if (!(i in slots)) slots[i] = typeof initial === 'function' ? initial() : initial; return [slots[i], update => updates.push(() => { slots[i] = typeof update === 'function' ? update(slots[i]) : update; })]; },
    useRef(initial) { const i = cursor++; return slots[i] ??= { current: initial }; }, useEffect: fn => effects.push(fn),
  };
  const exports = {}; const jsx = (type, props) => ({ type, props });
  evaluateProductionModule(readFileSync(new URL('../app/studio/ui/controls/navigation-section-specimen.tsx', import.meta.url), 'utf8'), {
    exports, require: id => id === 'react' ? react : id === 'react/jsx-runtime' ? { jsx, jsxs: jsx } : id === '../../template-model' ? { createTemplateSet: () => ({}), emptyTemplateStore: () => ({}) } : new Proxy({}, { get: (_, key) => key }),
  });
  const all = node => !node || typeof node !== 'object' ? [] : Array.isArray(node) ? node.flatMap(all) : [node, ...all(node.props?.children)];
  function render() { cursor = 0; const result = exports.NavigationSectionSpecimen(); result.props.ref.current = { querySelector: () => ({ focus: () => focused++ }) }; while (effects.length) effects.shift()(); return all(result); }
  function flush() { while (updates.length) updates.shift()(); }
  let tree = render(); assert.equal(focused, 0);
  tree.find(node => node.type === 'NavigationOverview').props.onOpen(); flush(); tree = render(); assert.equal(focused, 1);
  let session = tree.find(node => node.type === 'SiteNavigationEditor').props.templates;
  const original = session.store;
  const first = { ...original, example: 'first' }; const second = { ...original, example: 'second' };
  session.commit(() => first); session.commit(() => second); flush(); tree = render();
  session = tree.find(node => node.type === 'SiteNavigationEditor').props.templates; assert.equal(session.store, second);
  session.undo(); flush(); tree = render(); session = tree.find(node => node.type === 'SiteNavigationEditor').props.templates; assert.equal(session.store, first);
  session.undo(); flush(); tree = render(); assert.equal(tree.find(node => node.type === 'SiteNavigationEditor').props.templates.store, original);
});
