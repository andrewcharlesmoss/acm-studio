import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { loadProductionModule } from './production-module.mjs';
const { ImageResolutionSetting } = await loadProductionModule(new URL('../app/studio/controls/image-resolution-setting.tsx', import.meta.url));
const pin = { key: 'medium', sourceDigest: 'a'.repeat(64), renditionDigest: 'b'.repeat(64) };
const reordered = { renditionDigest: pin.renditionDigest, key: pin.key, sourceDigest: pin.sourceDigest };

test('Resolution recognises an identical selection regardless of property order', () => {
  const html = renderToStaticMarkup(createElement(ImageResolutionSetting, { value: reordered, choices: [{ label: 'Medium', resolution: pin }], onChange() {} }));
  assert.doesNotMatch(html, /Selected size unavailable/);
  assert.match(html, /selected=""[^>]*>Medium<\/option>/);
  const missing = renderToStaticMarkup(createElement(ImageResolutionSetting, { value: { ...pin, renditionDigest: 'c'.repeat(64) }, choices: [{ label: 'Medium', resolution: pin }], onChange() {}, disabled: true }));
  assert.match(missing, /Selected size unavailable/);
  assert.match(missing, /<select[^>]*disabled/);
  const malformed = renderToStaticMarkup(createElement(ImageResolutionSetting, { value: null, choices: [], onChange() {} }));
  assert.match(malformed, /Selected size unavailable/);
  assert.match(malformed, /selected=""[^>]*>Selected size unavailable<\/option>/);
});
