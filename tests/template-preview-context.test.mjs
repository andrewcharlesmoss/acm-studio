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
test('active sites expose only their own preview label, even with a conflicting preview request', () => {
  for (const siteId of ['test', 'test2']) {
    const changes = [];
    const h = harness('template-preview-controls.tsx', { './test-site/sites': { localFixtureName: id => id === 'test2' ? 'Test2' : 'Test' } });
    for (const previewSite of ['neutral', 'test', 'test2']) {
      const tree = children(h.render('TemplatePreviewControls', { siteId, previewSite, onChange: site => changes.push(site) }));
      assert.equal(tree.length, 1, 'active context has no chooser, comparison, or return action');
      assert.equal(tree[0].type, 'span');
      assert.equal(tree[0].props.children[1].props.children, siteId === 'test2' ? 'Test2' : 'Test');
    }
    assert.deepEqual(changes, []);
  }
});
test('unscoped preview offers the shared site selector directly with Neutral first', () => {
  const changes = [];
  const h = harness('template-preview-controls.tsx', { './test-site/sites': { isLocalFixtureSiteId: id => ['test', 'test2'].includes(id) } });
  let previewSite = 'neutral';
  for (const choice of ['test', 'test2', 'neutral', 'invalid']) {
    const tree = children(h.render('TemplatePreviewControls', { previewSite, onChange: site => changes.push(site), status: 'Loading preview…' }));
    assert.equal(tree.length, 2);
    assert.equal(tree[0].type, 'label');
    assert.equal(tree[0].props.children[0], 'Preview Site');
    const select = tree[0].props.children[1];
    assert.equal(select.props.value, previewSite);
    assert.deepEqual(Array.from(select.props.children, option => option.props.value), ['neutral', 'test', 'test2']);
    select.props.onChange({ target: { value: choice } });
    previewSite = changes.at(-1);
    assert.equal(previewSite, choice === 'invalid' ? 'neutral' : choice);
    assert.equal(tree[1].props.role, 'status');
    assert.equal(tree[1].props.children, 'Loading preview…');
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
  assert.match(workspace, /const effectivePreviewSite = siteId \?\? previewSite/);
  assert.match(workspace, /previewSources\?\.\[effectivePreviewSite\]/);
  assert.match(workspace, /previewSourceKey=.*effectivePreviewSite.*preview\?\.availability/s);
  assert.match(workspace, /resolveGlobalTemplatePreview\(set, effectivePreviewSite, globalLibrary, previewSource, siteId\)/);
  assert.match(workspace, /previewCanvasUnavailable=\{siteId \? previewContentUnavailable : undefined\}/);
  assert.match(editor, /if \(previewCanvasUnavailable\) return <p role="status">\{previewCanvasUnavailable\}<\/p>/);
  assert.match(editor, /disabled=\{Boolean\(previewContentUnavailable\) \|\| !candidates.length\}/);
});
