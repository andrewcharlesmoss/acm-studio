import { createHostModuleEvaluator } from "./production-module.mjs";
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

import * as size from '../app/studio/controls/preview-frame-size.ts';
import * as drag from '../app/studio/resize-drag.ts';
import { createElement, Fragment } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { loadProductionModule } from './production-module.mjs';

test('Library specimens render the production frame with independent accessible controls', async () => {
  const { PreviewFrameSpecimen } = await loadProductionModule(new URL('../app/studio/ui/controls/preview-frame-specimen.tsx', import.meta.url));
  const html = renderToStaticMarkup(createElement(Fragment, null, createElement(PreviewFrameSpecimen), createElement(PreviewFrameSpecimen)));
  const controls = [...html.matchAll(/aria-controls="([^"]+)"/g)].map(match => match[1]);
  assert.equal(controls.length, 2);
  assert.equal(new Set(controls).size, 2);
  for (const id of controls) assert.ok(html.includes(`id="${id}"`));
  assert.equal([...html.matchAll(/aria-label="Resize preview"/g)].length, 2);
  assert.equal([...html.matchAll(/class="studio-preview-frame-content"/g)].length, 2);
  assert.match(html, /A place for ideas/);
});

test('preview resize focus uses the accent bar without a surrounding outline and retains forced-colour focus', () => {
  const css = readFileSync(new URL('../app/studio/focus-outline.css', import.meta.url), 'utf8');
  assert.match(css, /html\[data-studio-focus-visible="true"\] body \.studio-preview-stage \.studio-preview-resize-handle:focus\s*\{\s*color:\s*var\(--acm-color-accent\);\s*outline:\s*none\s*!important;/);
  assert.match(css, /html\[data-studio-focus-visible="true"\] body \.studio-preview-stage \.studio-preview-resize-handle:focus::before\s*\{\s*opacity:\s*1;\s*transform:\s*scaleY\(1\.3\);/);
  assert.match(css, /@media\s*\(forced-colors:\s*active\)[\s\S]*?html\[data-studio-focus-mode\] body \.studio-preview-stage \.studio-preview-resize-handle:focus\s*\{\s*outline:\s*2px solid Highlight\s*!important;/);
  const handleCss = readFileSync(new URL('../app/studio/controls/resizable-preview-frame.css', import.meta.url), 'utf8');
  assert.match(handleCss, /\.studio-preview-resize-handle:focus-visible[^}]*::before\s*\{[^}]*opacity:\s*1;[^}]*transform:\s*scaleY\(1\.3\)/);
});

test('the Two Left Panes Library specimen renders the canonical resize frame beside pane controls', async () => {
  const { TwoLeftPaneSpecimen } = await loadProductionModule(new URL('../app/studio/panes/two-left-pane-specimen.tsx', import.meta.url));
  const html = renderToStaticMarkup(createElement(TwoLeftPaneSpecimen));
  assert.match(html, /aria-label="Two Left Panes Example"/);
  assert.match(html, /aria-label="Resize preview"/);
  assert.match(html, /class="studio-preview-frame-content"/);
  assert.match(html, /Reset Demo/);
});

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

test('preview height follows Gutenberg aspect interpolation and stays within its stage', () => {
  assert.equal(size.previewFrameHeight(1000, 1000, 900), 900);
  assert.ok(Math.abs(size.previewFrameHeight(320, 1000, 900) - 320 * 19.5 / 9) < .001);
  const middleRatio = (1000 / 900) + ((9 / 19.5) - (1000 / 900)) * (1 - (450 - 320) / (1000 - 320));
  assert.ok(Math.abs(size.previewFrameHeight(450, 1000, 900) - 450 / middleRatio) < .001);
  assert.equal(size.previewFrameHeight(320, 1000, 500), 500);
  assert.equal(size.previewFrameHeight(0, 0, 0), 0);
});

test('fit height joins smoothly when a tall narrow preview first shrinks', () => {
  for (const [width, height] of [[321, 900], [322, 1200], [340, 1800], [400, 1200], [600, 1800], [900, 2200]]) {
    const fit = size.previewFrameHeight(width, width, height);
    const narrower = size.previewFrameHeight(width - 1, width, height);
    assert.equal(fit, height);
    assert.ok(Math.abs(fit - narrower) < 20, `${width}×${height} must not snap on the first pixel`);
  }
});

test('production preview handle commits, cancels capture and adapts to available space without content changes', () => {
  const source = readFileSync(new URL('../app/studio/controls/resizable-preview-frame.tsx', import.meta.url), 'utf8');
  const code = (source);
  const slots = []; let index = 0; const effects = [];
  const react = {
    useId: () => 'preview',
    useRef(initial) { const id = index++; return slots[id] ??= { current: initial }; },
    useState(initial) { const id = index++; if (!(id in slots)) slots[id] = initial; return [slots[id], value => { slots[id] = typeof value === 'function' ? value(slots[id]) : value; }]; },
    useLayoutEffect(fn) { effects.push(fn); },
  };
  const jsx = (type, props) => ({ type, props });
  const require = name => name === 'react' ? react : name === 'react/jsx-runtime' ? { jsx, jsxs: jsx } : name.endsWith('resize-drag') ? drag : name.endsWith('preview-frame-size') ? size : {};
  const Component = createHostModuleEvaluator(['require', 'exports'], `${code}\nreturn exports.ResizablePreviewFrame;`)(require, {});
  const children = { text: 'Unchanged content' };
  let preferredWidth;
  const render = () => { index = 0; return Component({ children, preferredWidth }); };
  let tree = render();
  const element = { clientWidth: 1000, clientHeight: 900 };
  tree.props.ref.current = element;
  let notify, disconnected = false;
  const original = globalThis.ResizeObserver;
  globalThis.ResizeObserver = class { constructor(fn) { notify = fn; } observe() {} disconnect() { disconnected = true; } };
  try {
    const cleanup = effects[0]();
    const handle = () => render().props.children.props.children[1].props;
    preferredWidth = 768; render(); effects.at(-1)();
    assert.equal(handle()['aria-valuenow'], 768);
    preferredWidth = 390; render(); effects.at(-1)();
    assert.equal(handle()['aria-valuenow'], 390);
    preferredWidth = null; render(); effects.at(-1)();
    assert.equal(handle()['aria-valuenow'], 952);
    preferredWidth = undefined;

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
    for (const cancel of ['onPointerCancel', 'onBlur']) {
      handle().onPointerDown(event(100)); handle().onPointerMove(event(150)); handle()[cancel](event(150));
      assert.equal(handle()['aria-valuenow'], 652);
      assert.equal(target.captured, false);
    }
    // Embedded browsers may lose capture before pointerup after crossing their boundary.
    handle().onPointerDown(event(100)); handle().onPointerMove(event(150));
    handle().onLostPointerCapture({ ...event(150), pointerId: 2 });
    assert.equal(render().props['data-resizing'], true, 'another pointer cannot finish the active drag');
    target.captured = false;
    handle().onLostPointerCapture(event(150));
    assert.equal(handle()['aria-valuenow'], 552, 'capture loss keeps the last displayed width');
    assert.equal(render().props['data-resizing'], undefined, 'capture loss clears the dragging state');
    handle().onBlur(event()); handle().onPointerUp(event(500)); handle().onDoubleClick();
    assert.equal(handle()['aria-valuenow'], 552, 'late release, blur and generated double-click cannot reset the completed drag');
    handle().onPointerDown(event(200)); handle().onPointerMove(event(190)); handle().onPointerUp(event(190));
    assert.equal(handle()['aria-valuenow'], 572, 'a new drag continues from the retained width');
    handle().onKeyDown({ ...event(), key: 'Home' }); assert.equal(handle()['aria-valuenow'], 320);
    assert.ok(render().props.children.props.style.height < element.clientHeight, 'narrow frame must also become shorter');
    assert.ok(Math.abs(render().props.children.props.style.height - 320 * 19.5 / 9) < .001);
    element.clientHeight = 500; notify();
    assert.equal(render().props.children.props.style.height, 500, 'short viewports cap the adaptive height');
    element.clientHeight = 900; notify();
    // Drag-generated double-clicks must not erase the requested size.
    handle().onKeyDown({ ...event(), key: 'End' });
    handle().onPointerDown(event(100)); handle().onPointerMove(event(150)); handle().onPointerUp(event(150));
    handle().onDoubleClick(); assert.equal(handle()['aria-valuenow'], 852);
    handle().onPointerDown(event(150)); handle().onPointerMove(event(200)); handle().onPointerUp(event(200));
    handle().onDoubleClick(); assert.equal(handle()['aria-valuenow'], 752);
    // The two stationary clicks of an intentional double-click still fit.
    handle().onPointerDown(event(200)); handle().onPointerUp(event(200));
    handle().onPointerDown(event(200)); handle().onPointerUp(event(200));
    handle().onDoubleClick(); assert.equal(handle()['aria-valuenow'], 952);
    assert.equal(render().props.children.props.style.height, element.clientHeight, 'fit restores full stage height');
    handle().onPointerDown(event(200)); target.captured = false; handle().onLostPointerCapture(event(200));
    element.clientWidth = 1100; notify();
    assert.equal(handle()['aria-valuenow'], 1052, 'stationary capture loss preserves fluid fit');
    assert.equal(render().props.children.props.children[0].props.children, children);
    cleanup(); assert.equal(disconnected, true);
  } finally { globalThis.ResizeObserver = original; }
});
