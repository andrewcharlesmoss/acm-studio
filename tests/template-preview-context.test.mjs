import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
const require = createRequire(import.meta.url);
function harness(file, dependencies = {}) {
  const slots = []; let cursor = 0;
  const react = { useId: () => 'comparison', useCallback: callback => callback, useState(initial) { const i = cursor++; if (!(i in slots)) slots[i] = initial; return [slots[i], value => { slots[i] = value; }]; } };
  const exports = {};
  vm.runInNewContext(ts.transpileModule(readFileSync(new URL(`../app/studio/${file}`, import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText, { exports, requestAnimationFrame: callback => callback(), document: { getElementById: () => ({ focus() {} }) }, require(name) { if (name === 'react') return react; if (name === 'react/jsx-runtime') return require(name); return dependencies[name] ?? {}; } });
  return { render(fn, ...args) { cursor = 0; return exports[fn](...args); } };
}
function children(tree) { return tree.props.children.filter(Boolean); }
test('contextual preview exposes comparison deliberately and returns to selected default', () => {
  for (const siteId of [undefined, 'test', 'test2']) {
    const changes = [];
    const h = harness('template-preview-controls.tsx', { './test-site/sites': { localFixtureName: id => id === 'test2' ? 'Test2' : 'Test', isLocalFixtureSiteId: id => ['test', 'test2'].includes(id) } });
    let props = { siteId, previewSite: siteId ?? 'neutral', onChange: site => changes.push(site) };
    let tree = children(h.render('TemplatePreviewControls', props));
    assert.equal(tree.length, 2);
    assert.equal(tree[1].props.children, 'Preview Another Site…');
    tree[1].props.onClick();
    assert.deepEqual(changes, [], 'revealing comparison cannot change the source');
    tree = children(h.render('TemplatePreviewControls', props));
    assert.equal(tree[1].props.children[1].props.value, siteId ?? 'neutral');
    let focused = false;
    tree[1].props.children[1].props.ref({ focus() { focused = true; } });
    assert.equal(focused, true);
    tree[1].props.children[1].props.onChange({ target: { value: siteId === 'test' ? 'test2' : 'test' } });
    props = { ...props, previewSite: changes.at(-1) };
    tree = children(h.render('TemplatePreviewControls', props));
    assert.equal(tree[3].props.role, 'status');
    tree[2].props.onClick();
    assert.equal(changes.at(-1), siteId ?? 'neutral');
    assert.equal(children(h.render('TemplatePreviewControls', { ...props, previewSite: changes.at(-1) })).length, 2);
  }
});
test('preview document selection resets across sources even with overlapping IDs, and retains same-source edits', () => {
  const h = harness('use-template-preview-document.ts', { './editor-model': { createWorkspacePreviewDocument: kind => ({ id: 'fallback', kind }) } });
  const docs = [{ id: 'first', kind: 'page' }, { id: 'shared', kind: 'page' }, { id: 'post', kind: 'post' }];
  const render = (source, records = docs, kind = 'header') => h.render('useTemplatePreviewDocument', records, kind, source);
  let state = render('test2'); state.selectSample('shared');
  assert.equal(render('test2').sample.id, 'shared');
  assert.equal(render('test2', docs.map(doc => ({ ...doc, title: 'Updated' }))).sample.title, 'Updated');
  assert.equal(render('test').sample.id, 'first');
  assert.equal(render('test2').sample.id, 'first', 'return cannot resurrect selection from a different source');
  assert.equal(render('neutral', [], 'post').sample.kind, 'post');
  assert.equal(render('test2', docs, 'post').sample.id, 'post');
});
test('production wiring defaults to selected site and explicitly labels unavailable content', () => {
  const prototype = readFileSync(new URL('../app/studio/studio-prototype.tsx', import.meta.url), 'utf8');
  const workspace = readFileSync(new URL('../app/studio/template-workspace.tsx', import.meta.url), 'utf8');
  const editor = readFileSync(new URL('../app/studio/template-editor.tsx', import.meta.url), 'utf8');
  assert.match(prototype, /useState<GlobalTemplatePreviewSite>\(selectedSite \?\? "neutral"\)/);
  assert.match(workspace, /previewSourceKey=.*previewSite.*preview\?\.availability/s);
  assert.match(workspace, /resolveGlobalTemplatePreview\(set, previewSite, globalLibrary, previewSource\)/);
  assert.match(editor, /disabled=\{Boolean\(previewContentUnavailable\) \|\| !candidates.length\}/);
});
