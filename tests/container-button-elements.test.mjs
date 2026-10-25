import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { loadProductionModule } from './production-module.mjs';

const model = await loadProductionModule(new URL('../app/studio/site-editor/blocks-preview-model.ts', import.meta.url));
const state = await loadProductionModule(new URL('../app/studio/site-editor/styles-preview-state.ts', import.meta.url));
const { validateWebsiteDesign } = await loadProductionModule(new URL('../app/studio/site-editor/website-design.ts', import.meta.url));
const { BlockPreviewRules } = await loadProductionModule(new URL('../app/studio/site-editor/block-preview-rules.tsx', import.meta.url));
const { BlockStyleSections } = await loadProductionModule(new URL('../app/studio/site-editor/block-style-sections.tsx', import.meta.url));
const { blockStyleProfiles } = await loadProductionModule(new URL('../app/studio/site-editor/block-style-profiles.ts', import.meta.url));
const { WebsiteDesignSurface } = await loadProductionModule(new URL('../app/studio/site-editor/website-design-surface.tsx', import.meta.url));
const { BlockRenderer } = await loadProductionModule(new URL('../app/components/content.tsx', import.meta.url));
const gradient = { type: 'linear', angle: 90, stops: [{ id: 'a', color: '#112233', position: 0 }, { id: 'b', color: '#abcdef', position: 100 }] };
const selection = state.resolvePreviewStyle(state.createStylesPreview().present, 'global');

// Use the same gradient contract as the existing colour and background owner.
const { editableBackgroundGradient } = await loadProductionModule(new URL('../app/content/background-gradient.ts', import.meta.url));
const validGradient = editableBackgroundGradient();

test('container Button fields round-trip through the shared portable website design validator', () => {
  const value = { identity: {}, styles: { blockStyles: { group: { buttonTextColor: 'var(--site-palette-theme-2)', buttonBackgroundGradient: validGradient, buttonGradientId: 'custom-example', previewResponsive: { mobile: { buttonBackgroundColor: '#112233' } } }, columns: { buttonBackgroundColor: 'transparent' }, column: { buttonTextColor: '#abcdef' } } } };
  assert.deepEqual(validateWebsiteDesign(value), value);
  for (const invalid of [{ buttonTextColor: 'url(https://invalid.test)' }, { buttonBackgroundColor: '<script>' }, { buttonBackgroundGradient: gradient }, { buttonGradientId: 'unsafe;value' }]) {
    assert.throws(() => validateWebsiteDesign({ identity: {}, styles: { blockStyles: { group: invalid } } }));
  }
  assert.deepEqual(validateWebsiteDesign({ identity: {}, styles: {} }), { identity: {}, styles: {} });
});

test('container Button inheritance switches background modes per site/device and Reset/Undo/Redo stay scoped', () => {
  let history = state.createStylesPreview();
  const change = action => { history = state.stylesPreviewReducer(history, action); };
  const patch = (scope, patch, viewport = 'desktop') => change({ type: 'block-style', scope, block: 'group', viewport, patch });
  const read = () => state.resolvePreviewStyle(history.present, 'test').blockStyles.group;
  patch('global', { buttonTextColor: '#123456', buttonBackgroundGradient: validGradient, buttonGradientId: 'custom' });
  patch('test', { buttonBackgroundColor: '#abcdef' });
  assert.equal(read().buttonTextColor, '#123456');
  assert.equal(read().buttonBackgroundGradient, undefined);
  assert.equal(read().buttonGradientId, undefined);
  patch('test', { buttonBackgroundGradient: validGradient, buttonBackgroundColor: undefined }, 'mobile');
  assert.equal(model.effectivePreviewBlockStyle(read(), 'mobile').buttonBackgroundColor, undefined);
  assert.deepEqual(model.effectivePreviewBlockStyle(read(), 'mobile').buttonBackgroundGradient, validGradient);
  assert.equal(model.effectivePreviewBlockStyle(read(), 'tablet').buttonBackgroundColor, '#abcdef');
  patch('test', { buttonBackgroundColor: undefined });
  assert.deepEqual(read().buttonBackgroundGradient, validGradient);
  change({ type: 'undo' }); assert.equal(read().buttonBackgroundColor, '#abcdef');
  change({ type: 'redo' }); assert.equal(read().buttonBackgroundColor, undefined);
  const resolved = model.resolvePreviewBlockDefaults({ group: read() });
  for (const id of ['row', 'stack', 'grid']) assert.equal(resolved[id].buttonTextColor, '#123456');
});

test('production and Library panels expose the same Button colour row only for supported containers', () => {
  for (const id of ['group','row','stack','grid','columns','column']) {
    assert.ok(blockStyleProfiles[id].elements.includes('button'));
    const html = renderToStaticMarkup(createElement(BlockStyleSections, { id, value: {}, authored: {}, fontSelectionValue: '', viewport: 'desktop', selection, onChange() {} }));
    assert.match(html, /aria-label="Choose Button colour"/);
  }
  assert.ok(!blockStyleProfiles.section.elements.includes('button'), 'unrequested Section profile stays unchanged');
});

test('CSS uses nearest inherited container variables and excludes authored/global interaction states', () => {
  const html = renderToStaticMarkup(createElement(BlockPreviewRules, { scopeId: 'container-test', referenceDefaults: false, selection: { ...selection, blockStyles: { group: { buttonTextColor: '#123456', buttonBackgroundGradient: validGradient }, column: { buttonBackgroundColor: '#abcdef' }, button: { textColor: '#ff0000', interactionStates: { hover: { textColor: '#987654', backgroundColor: '#fefefe' } } } } } }));
  assert.match(html, /--site-container-button-color:#123456/);
  assert.match(html, /--site-container-button-background-color:#abcdef/);
  assert.match(html, /--site-container-button-background-image:none/);
  assert.match(html, /color:var\(--site-container-button-color,#ff0000\)/);
  assert.match(html, /:hover\{color:#987654!important\}/);
  assert.match(html, /site-block-authored---studio-rs-mobile-background-image/);
  assert.match(html, /has-button-hover-color/);
  assert.match(html, /:hover\{background-image:none!important\}/);
  assert.match(html, /:not\(:hover\):not\(.is-button-state-preview-hover\)/);
});

test('Buttons carry base/device authored guards without any global Button default', () => {
  const source = [{ id: 'button', type: 'button', label: 'Action', url: '/', style: 'primary', visualStyle: { backgroundColor: '#112233', responsive: { mobile: { backgroundColor: '#abcdef', textColor: '#223344' } } } }];
  const projected = model.applyPreviewBlockStyles(source, {}, 'default', false);
  for (const marker of ['site-block-style-button','site-block-authored-background-color','site-block-authored-background-image','site-block-authored---studio-rs-mobile-background-color','site-block-authored---studio-rs-mobile-background-image','site-block-authored---studio-rs-mobile-color']) assert.ok(projected[0].visualStyle.className.includes(marker), marker);
  assert.equal(source[0].visualStyle.className, undefined);
});

test('static website output uses the same nested container rules without changing authored records', () => {
  const blocks = [{ id: 'group', type: 'group', layout: 'flow', children: [{ id: 'cols', type: 'columns', children: [{ id: 'col', type: 'column', children: [{ id: 'btn', type: 'button', label: 'Action', url: '/', style: 'primary' }] }] }] }];
  const before = structuredClone(blocks);
  const styles = { ...selection, blockStyles: { group: { buttonTextColor: '#123456' }, column: { buttonBackgroundColor: '#abcdef' } } };
  const html = renderToStaticMarkup(createElement(WebsiteDesignSurface, { scopeId: 'static-container', design: { identity: {}, styles } }, createElement(BlockRenderer, { blocks, variant: 'studio' })));
  assert.match(html, /--site-container-button-color:#123456/);
  assert.match(html, /--site-container-button-background-color:#abcdef/);
  assert.match(html, /site-block-style-button/);
  assert.deepEqual(blocks, before);
});
