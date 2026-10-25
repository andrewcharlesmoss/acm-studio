import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement as h } from 'react';
import { renderToStaticMarkup as render } from 'react-dom/server';
import { loadProductionModule } from './production-module.mjs';
const variations = await loadProductionModule(new URL('../app/content/text-style-variations.ts', import.meta.url));
const { paragraphStyleToCss, visualStyleClassName } = await loadProductionModule(new URL('../app/content/paragraph-styles.ts', import.meta.url));
const { StyleVariationSetting } = await loadProductionModule(new URL('../app/studio/controls/style-variation-setting.tsx', import.meta.url));
const { blockStyleProfiles } = await loadProductionModule(new URL('../app/studio/site-editor/block-style-profiles.ts', import.meta.url));
const { projectWebsiteDesignBlocks } = await loadProductionModule(new URL('../app/studio/site-editor/website-design-surface.tsx', import.meta.url));
const { capabilityProfileFor } = await loadProductionModule(new URL('../app/studio/blocks/capability-profiles.ts', import.meta.url));

test('text variation changes preserve authored fields and unrelated CSS classes', () => {
  const original = { className: 'custom is-style-display is-style-unknown', textColor: '#123456', fontSizeCustom: '37px', responsive: { mobile: { fontSizeCustom: '18px' } } };
  const updated = variations.setTextStyleVariation(original, 'annotation');
  assert.equal(updated.className, 'custom is-style-unknown is-style-annotation');
  assert.equal(variations.textStyleVariation(updated), 'annotation');
  assert.equal(updated.textColor, original.textColor);
  assert.deepEqual(updated.responsive, original.responsive);
  assert.equal(variations.setTextStyleVariation(updated, 'default').className, 'custom is-style-unknown');
  assert.equal(original.className, 'custom is-style-display is-style-unknown');
  assert.equal(variations.setTextStyleVariation({ className: 'is-style-subtitle' }, 'default'), undefined);
});

test('the production CSS mapper paints variations without saving inherited fields', () => {
  const source = { className: 'is-style-display' };
  assert.match(paragraphStyleToCss(source).fontSize, /^clamp\(/);
  assert.ok(visualStyleClassName(source).includes('has-custom-font-size'));
  assert.ok(visualStyleClassName(source).includes('has-custom-line-height'));
  assert.deepEqual(source, { className: 'is-style-display' });
  assert.equal(paragraphStyleToCss({ className: 'is-style-annotation' }).borderRadius, '16px');
  assert.equal(paragraphStyleToCss({ className: 'is-style-display', fontSize: 'small' }).fontSize, '14px');
  assert.equal(paragraphStyleToCss({ className: 'is-style-display', fontSizeCustom: '37px', lineHeight: '2' }).fontSize, '37px');
  assert.equal(paragraphStyleToCss({ className: 'is-style-display', lineHeight: '2' }).lineHeight, '2');
});

test('editor, Site Editor and Library expose the same registered text variations', () => {
  for (const kind of ['paragraph', 'heading']) {
    assert.deepEqual(blockStyleProfiles[kind].variations, variations.TEXT_STYLE_VARIATIONS);
    assert.ok(capabilityProfileFor(kind).dependencies.some(item => item.id === 'style-variation'));
    const html = render(h(StyleVariationSetting, { kind, value: 'subtitle', disabled: true, onChange() {} }));
    for (const label of ['Default', 'Display', 'Subtitle', 'Annotation']) assert.ok(html.includes(`>${label}</span>`));
    assert.match(html, /aria-pressed="true" disabled=""><span>Subtitle/);
    assert.equal((html.match(/ disabled=""/g) ?? []).length, 4);
  }
});


test('registered variation defaults supersede website base defaults while authored fields win', () => {
  for (const type of ['paragraph', 'heading']) {
    const source = { id: 'text', type, text: 'Example', ...(type === 'heading' ? { level: 2, visualStyle: { className: 'is-style-display' } } : { style: { className: 'is-style-display' } }) };
    const selection = { blockStyles: { [type]: { fontSizeCustom: '20px' } } };
    const projected = projectWebsiteDesignBlocks([source], selection)[0];
    assert.match((type === 'paragraph' ? projected.style : projected.visualStyle).fontSizeCustom, /^clamp\(/);
    const authored = { ...source, ...(type === 'paragraph' ? { style: { ...source.style, fontSizeCustom: '37px' } } : { visualStyle: { ...source.visualStyle, fontSizeCustom: '37px' } }) };
    const overridden = projectWebsiteDesignBlocks([authored], selection)[0];
    assert.equal((type === 'paragraph' ? overridden.style : overridden.visualStyle).fontSizeCustom, '37px');
    assert.equal((type === 'paragraph' ? source.style : source.visualStyle).fontSizeCustom, undefined);
  }
});


test('website variation presets can override fallback sizes without false authored markers', () => {
  for (const variant of ['display', 'annotation']) {
    const source = { id: 'text', type: 'paragraph', text: 'Example', style: { className: `is-style-${variant}` } };
    const [projected] = projectWebsiteDesignBlocks([source], { blockStyles: { paragraph: { fontSizeCustom: '20px', variations: { [variant]: { websitePreset: 'large' } } } } });
    assert.ok(!projected.style.className.includes('site-block-authored-font-size'));
    const [authored] = projectWebsiteDesignBlocks([{ ...source, style: { ...source.style, fontSizeCustom: '37px' } }], { blockStyles: { paragraph: { variations: { [variant]: { websitePreset: 'large' } } } } });
    assert.ok(authored.style.className.includes('site-block-authored-font-size'));
    assert.equal(paragraphStyleToCss(authored.style).fontSize, '37px');
  }
});
