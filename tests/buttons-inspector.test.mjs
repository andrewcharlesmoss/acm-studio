import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { loadProductionModule } from './production-module.mjs';
const load = path => loadProductionModule(new URL(path, import.meta.url));
const { capabilityProfileFor } = await load('../app/studio/blocks/capability-profiles.ts');
const { ParagraphInspector } = await load('../app/studio/blocks/inspectors/paragraph-inspector.tsx');
const { buttonsPresentationStyle } = await load('../app/content/buttons-presentation.ts');
const block = { id: 'buttons', type: 'buttons', children: [{ id: 'button', type: 'button', label: 'Guide', url: '', style: 'primary' }], visualStyle: { fontFamily: 'arial', lineHeight: '1.8', letterSpacing: '0.1em', textDecoration: 'underline', textTransform: 'uppercase' } };

test('Buttons capability exposes existing canonical typography controls and fields', () => {
  const profile = capabilityProfileFor('buttons');
  for (const [id, field] of [['family','fontFamily'],['line-height','lineHeight'],['letter-spacing','letterSpacing'],['decoration','textDecoration'],['letter-case','textTransform']]) {
    const control = profile.controls.find(control => control.id === id && control.section === 'typography');
    assert.ok(control, id); assert.ok(control.fields.some(value => value.endsWith(field)), field);
  }
  const html = renderToStaticMarkup(createElement(ParagraphInspector, { block, onChange() {}, fontSizeViewMode: 'presets', onFontSizeViewModeChange() {} }));
  for (const label of ['Font family','Line height','Letter spacing','Decoration','Letter case']) assert.ok(html.includes(label), label);
});

test('all exposed Buttons typography flows through the existing inherited resource variables without mutating content', () => {
  const before = structuredClone(block);
  const css = buttonsPresentationStyle(block);
  assert.match(css['--button-group-font-family'], /Arial/);
  assert.equal(css['--button-group-line-height'], '1.8');
  assert.equal(css['--button-group-letter-spacing'], '0.1em');
  assert.equal(css['--button-group-text-decoration'], 'underline');
  assert.equal(css['--button-group-text-transform'], 'uppercase');
  const responsive = buttonsPresentationStyle({ ...block, visualStyle: { ...block.visualStyle, responsive: { mobile: { lineHeight: '2', letterSpacing: '0.2em', textTransform: 'lowercase' } } } });
  assert.equal(responsive['--studio-rs-mobile-button-group-line-height'], '2');
  assert.equal(responsive['--studio-rs-mobile-button-group-letter-spacing'], '0.2em');
  assert.equal(responsive['--studio-rs-mobile-button-group-text-transform'], 'lowercase');
  assert.deepEqual(block, before);
});
