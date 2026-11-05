import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHostModuleEvaluator } from './production-module.mjs';

test('review only saves owners still shown after a partial failure', () => {
  const source = readFileSync(new URL('../app/studio/site-editor/site-review-dialog.tsx', import.meta.url), 'utf8');
  const slots = []; let index = 0;
  const react = { useState(initial) { const i = index++; if (!(i in slots)) slots[i] = typeof initial === 'function' ? initial() : initial; return [slots[i], value => { slots[i] = typeof value === 'function' ? value(slots[i]) : value; }]; } };
  const jsx = (type, props) => ({ type, props });
  const require = name => name === 'react' ? react : name === 'react/jsx-runtime' ? { jsx, jsxs: jsx, Fragment: 'Fragment' } : new Proxy({}, { get: (_, key) => key });
  const { SiteReviewDialog } = createHostModuleEvaluator(['require', 'exports'], `${source}\nreturn exports;`)(require, {});
  const all = node => !node || typeof node !== 'object' ? [] : Array.isArray(node) ? node.flatMap(all) : [node, ...all(node.props?.children)];
  let items = [{ scope: 'global', label: 'Universal Defaults', details: ['Styles'] }, { scope: 'test', label: 'Test', details: ['Identity'] }];
  const render = () => { index = 0; return all(SiteReviewDialog({ items, opener: null, onClose() {}, onSave() {} })); };
  assert.equal(render().find(node => node.type === 'StudioButton' && node.props.children === 'Save').props.disabled, false);
  items = items.slice(1);
  render().find(node => node.type === 'CheckboxControl' && node.props.label === 'Test').props.onChange(false);
  const tree = render();
  assert.equal(tree.find(node => node.type === 'StudioButton' && node.props.children === 'Save').props.disabled, true);
  assert.ok(tree.some(node => node.type === 'p' && node.props.children === 'Select the items you want to save.'));
});

test('discard sends only selected scopes and closes after success', async () => {
  const source = readFileSync(new URL('../app/studio/site-editor/site-review-dialog.tsx', import.meta.url), 'utf8');
  const slots = []; let index = 0;
  const react = { useState(initial) { const i = index++; if (!(i in slots)) slots[i] = typeof initial === 'function' ? initial() : initial; return [slots[i], value => { slots[i] = typeof value === 'function' ? value(slots[i]) : value; }]; } };
  const jsx = (type, props) => ({ type, props });
  const require = name => name === 'react' ? react : name === 'react/jsx-runtime' ? { jsx, jsxs: jsx, Fragment: 'Fragment' } : new Proxy({}, { get: (_, key) => key });
  const { SiteReviewDialog } = createHostModuleEvaluator(['require', 'exports'], `${source}\nreturn exports;`)(require, {});
  const all = node => !node || typeof node !== 'object' ? [] : Array.isArray(node) ? node.flatMap(all) : [node, ...all(node.props?.children)];
  let discarded, closed = false;
  const items = [{ scope: 'global', label: 'Universal Defaults', details: [] }, { scope: 'test2', label: 'Test 2', details: [] }];
  const render = () => { index = 0; return all(SiteReviewDialog({ items, opener: null, onClose() { closed = true; }, onSave() {}, async onDiscard(scopes) { discarded = scopes; } })); };
  render().find(node => node.type === 'CheckboxControl' && node.props.label === 'Universal Defaults').props.onChange(false);
  render().find(node => node.type === 'StudioButton' && node.props.children === 'Don’t Save').props.onClick();
  await Promise.resolve(); await Promise.resolve();
  assert.deepEqual(discarded, ['test2']); assert.equal(closed, true);
});
