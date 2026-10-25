import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement as h } from 'react';
import { renderToStaticMarkup as render } from 'react-dom/server';
import { loadProductionModule } from './production-module.mjs';
const selection = { paletteId: 'default', typographyId: 'default' };
const { BlockPreviewRules } = await loadProductionModule(new URL('../app/studio/site-editor/block-preview-rules.tsx', import.meta.url));
const { WebsiteDesignSurface } = await loadProductionModule(new URL('../app/studio/site-editor/website-design-surface.tsx', import.meta.url));
const { resolvePreviewBlockVariant } = await loadProductionModule(new URL('../app/studio/site-editor/blocks-preview-model.ts', import.meta.url));

test('a registered variation emits only its own block rules and no repeated website reference sheet', () => {
  const base = render(h(BlockPreviewRules, { selection, scopeId: 'site', referenceDefaults: true }));
  for (const id of ['paragraph', 'heading']) for (const variant of ['display', 'subtitle', 'annotation']) {
    const output = render(h(BlockPreviewRules, { selection: { ...selection, blockStyles: { [id]: resolvePreviewBlockVariant({}, variant) } }, scopeId: 'site', referenceDefaults: true, selectorSuffix: `.site-block-variation-${variant}`, onlyBlock: id }));
    assert.ok(output.includes(`.site-block-style-${id}.site-block-variation-${variant}`));
    assert.ok(!output.includes('.site-block-style-image'));
    assert.ok(!output.includes('.site-block-style-button'));
    assert.ok(!output.includes('.site-block-style-group'));
    assert.ok(Buffer.byteLength(output) < Buffer.byteLength(base) / 2, 'variation output must stay proportional to its one block');
  }
});

test('website surface keeps every text variation available within one bounded stylesheet', () => {
  const output = render(h(WebsiteDesignSurface, { design: { identity: {}, styles: selection }, scopeId: 'site', referenceDefaults: true }));
  const base = render(h(BlockPreviewRules, { selection, scopeId: 'site', referenceDefaults: true }));
  for (const id of ['paragraph', 'heading']) for (const variant of ['display', 'subtitle', 'annotation']) assert.ok(output.includes(`.site-block-style-${id}.site-block-variation-${variant}`));
  assert.ok(Buffer.byteLength(output) < Buffer.byteLength(base) * 3, 'adding six text variations must not reproduce six complete default stylesheets');
});
