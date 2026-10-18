import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import * as size from '../app/studio/site-editor/preview-frame-size.ts';
import * as drag from '../app/studio/resize-drag.ts';

test('centred preview resizing respects both edges, keyboard direction and narrow available space', () => {
  const bounds = size.previewFrameBounds(1000);
  assert.deepEqual(bounds, { min: 320, max: 952 });
  assert.equal(size.dragPreviewWidth(800, 100, bounds), 600);
  assert.equal(size.dragPreviewWidth(800, -100, bounds), 952);
  assert.equal(size.dragPreviewWidth(800, 1000, bounds), 320);
  assert.equal(size.previewWidthFromKey(600, 'ArrowLeft', false, bounds), 610);
  assert.equal(size.previewWidthFromKey(600, 'ArrowRight', true, bounds), 580);
  assert.equal(size.previewWidthFromKey(600, 'Home', false, bounds), 320);
  assert.equal(size.previewWidthFromKey(600, 'End', false, bounds), 952);
  assert.equal(size.previewWidthFromKey(600, 'Enter', false, bounds), 952);
  assert.equal(size.previewWidthFromKey(600, 'Tab', false, bounds), null);
  assert.deepEqual(size.previewFrameBounds(260), { min: 212, max: 212 });
  assert.equal(size.clampPreviewWidth(600, size.previewFrameBounds(260)), 212);
});

test('production preview handle commits, cancels capture and adapts to available space without content changes', () => {
  const source = readFileSync(new URL('../app/studio/site-editor/resizable-preview-frame.tsx', import.meta.url), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const slots = []; let index = 0; const effects = [];
  const react = {
    useId: () => 'preview',
    useRef(initial) { const id = index++; return slots[id] ??= { current: initial }; },
    useState(initial) { const id = index++; if (!(id in slots)) slots[id] = initial; return [slots[id], value => { slots[id] = typeof value === 'function' ? value(slots[id]) : value; }]; },
    useLayoutEffect(fn) { effects.push(fn); },
  };
  const jsx = (type, props) => ({ type, props });
  const require = name => name === 'react' ? react : name === 'react/jsx-runtime' ? { jsx, jsxs: jsx } : name.endsWith('resize-drag') ? drag : name.endsWith('preview-frame-size') ? size : {};
  const Component = new Function('require', 'exports', `${code}\nreturn exports.ResizablePreviewFrame;`)(require, {});
  const children = { text: 'Unchanged content' };
  const render = () => { index = 0; return Component({ children }); };
  let tree = render();
  const element = { clientWidth: 1000 };
  tree.props.ref.current = element;
  let notify, disconnected = false;
  const original = globalThis.ResizeObserver;
  globalThis.ResizeObserver = class { constructor(fn) { notify = fn; } observe() {} disconnect() { disconnected = true; } };
  try {
    const cleanup = effects[0]();
    const handle = () => render().props.children.props.children[1].props;
    const target = { captured: false, focus() {}, setPointerCapture() { this.captured = true; }, hasPointerCapture() { return this.captured; }, releasePointerCapture() { this.captured = false; } };
    const event = x => ({ button: 0, clientX: x, pointerId: 1, currentTarget: target, preventDefault() {}, stopPropagation() {} });
    assert.equal(handle()['aria-valuenow'], 952);
    handle().onPointerDown(event(100)); handle().onPointerMove(event(100)); handle().onPointerUp(event(100));
    element.clientWidth = 1100; notify();
    assert.equal(handle()['aria-valuenow'], 1052, 'clicking without dragging retains fluid width');
    element.clientWidth = 1000; notify();
    handle().onPointerDown(event(100)); handle().onPointerMove(event(250));
    assert.equal(handle()['aria-valuenow'], 652);
    handle().onPointerDown({ ...event(300), pointerId: 2 });
    handle().onPointerMove({ ...event(600), pointerId: 2 });
    handle().onPointerUp({ ...event(600), pointerId: 2 });
    handle().onPointerCancel({ ...event(600), pointerId: 2 });
    assert.equal(handle()['aria-valuenow'], 652);
    assert.equal(target.captured, true);
    handle().onKeyDown({ ...event(), key: 'Escape' });
    assert.equal(handle()['aria-valuenow'], 952);
    assert.equal(target.captured, false);
    handle().onPointerDown(event(100)); handle().onPointerMove(event(250)); handle().onPointerUp(event(250));
    assert.equal(handle()['aria-valuenow'], 652);
    element.clientWidth = 500; notify();
    assert.equal(handle()['aria-valuenow'], 452);
    element.clientWidth = 1000; notify();
    assert.equal(handle()['aria-valuenow'], 652);
    for (const cancel of ['onPointerCancel', 'onLostPointerCapture', 'onBlur']) {
      handle().onPointerDown(event(100)); handle().onPointerMove(event(150)); handle()[cancel](event(150));
      assert.equal(handle()['aria-valuenow'], 652);
      assert.equal(target.captured, false);
    }
    handle().onKeyDown({ ...event(), key: 'Home' }); assert.equal(handle()['aria-valuenow'], 320);
    handle().onDoubleClick(); assert.equal(handle()['aria-valuenow'], 952);
    assert.equal(render().props.children.props.children[0].props.children, children);
    cleanup(); assert.equal(disconnected, true);
  } finally { globalThis.ResizeObserver = original; }
});
