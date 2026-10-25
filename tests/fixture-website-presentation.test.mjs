import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import postcss from 'postcss';
import { loadProductionModule } from './production-module.mjs';

const { WebsiteDesignSurface, projectWebsiteDesignBlocks, websiteDesignRules } = await loadProductionModule(new URL('../app/studio/site-editor/website-design-surface.tsx', import.meta.url));
const { effectiveWebsiteDesign } = await loadProductionModule(new URL('../app/studio/site-editor/website-design.ts', import.meta.url));
const { referencePreviewBlockStyles } = await loadProductionModule(new URL('../app/studio/site-editor/blocks-preview-model.ts', import.meta.url));
const { BlockRenderer } = await loadProductionModule(new URL('../app/components/blocks/block-renderer.tsx', import.meta.url));
const empty = { identity: {}, styles: {} };
const render = (design, referenceDefaults, blocks = []) => renderToStaticMarkup(createElement(WebsiteDesignSurface, { design, legacy: design.legacy, referenceDefaults, scopeId: 'fixture' }, createElement('main', { className: 'test-site-page' }, createElement(BlockRenderer, { blocks, variant: 'studio' }))));

test('empty fixture designs opt into canonical reference presentation without authoring settings', () => {
  const design = effectiveWebsiteDesign(empty, empty);
  const original = structuredClone(design);
  assert.equal(design.typographySelected, false);
  const html = render(design, true, [{ id: 'heading', type: 'heading', level: 1, text: 'Heading' }, { id: 'quote', type: 'quote', text: 'Quote' }, { id: 'button', type: 'button', style: 'primary', label: 'Button', url: '#' }]);
  assert.match(html, /TT5 Manrope/);
  assert.match(html, /font-weight:300/);
  assert.match(html, /calc\(645px \+ 2 \* var\(--acm-layout-spacing, 24px\)\)/);
  assert.match(html, /font-style:normal\}/);
  assert.equal(referencePreviewBlockStyles().button.borderRadius, '999px');
  assert.match(html, /\.image-field img\{width:100%;height:auto\}/);
  assert.deepEqual(design, original, 'reference defaults exist only in the rendering projection');
  assert.deepEqual(empty.styles, {});
});

test('legacy consumers retain their former baseline unless the host opts in', () => {
  const html = render(effectiveWebsiteDesign(empty, empty), false);
  assert.doesNotMatch(html, /TT5 Manrope|645px|width:100%;height:auto/);
});

test('explicit website settings replace the reference layout and role fields', () => {
  const design = effectiveWebsiteDesign({ identity: {}, styles: { typography: { elements: { text: { size: '24px', family: 'serif', weight: 500 } } }, layout: { contentWidth: '880px', padding: '32px', blockSpacing: '18px' } } }, empty);
  const html = render(design, true);
  assert.match(html, /font-size:24px/);
  assert.match(html, /font-family:serif/);
  assert.match(html, /max-width:880px/);
  assert.match(html, /padding:32px/);
  assert.doesNotMatch(html, /calc\(645px/);
});

test('canonical reference projection preserves authored properties and outline surfaces', () => {
  const blocks = [{ id: 'heading', type: 'heading', level: 1, text: 'Heading', visualStyle: { fontSizeCustom: '37px', textColor: '#135724', responsive: { mobile: { fontSizeCustom: '29px' } } } }, { id: 'outline', type: 'button', style: 'secondary', label: 'Outline', url: '#', visualStyle: { borderRadius: '12px', backgroundColor: '#eeeeee' }, interactionStyles: { hover: { borderRadius: '18px' } } }];
  const original = structuredClone(blocks);
  const result = projectWebsiteDesignBlocks(blocks, { paletteId: 'default', typographyId: 'default', blockStyles: referencePreviewBlockStyles() });
  assert.equal(result[0].visualStyle.fontSizeCustom, '37px');
  assert.equal(result[0].visualStyle.responsive.mobile.fontSizeCustom, '29px');
  assert.match(result[0].visualStyle.className, /site-block-authored-font-size/);
  assert.equal(result[1].visualStyle.borderRadius, '12px');
  assert.equal(result[1].visualStyle.backgroundColor, '#eeeeee');
  assert.equal(result[1].visualStyle.borderWidth, '1px');
  assert.equal(result[1].interactionStyles.hover.borderRadius, '18px');
  assert.deepEqual(blocks, original);
});

test('reference Navigation retains its own decoration while explicit Links settings stay authoritative', () => {
  const selection = effectiveWebsiteDesign(empty, empty).styles;
  const css = websiteDesignRules(selection, 'navigation', true, { referenceDefaults: true, typographySelected: true, paletteSelected: true });
  assert.match(css, /\.template-navigation a:not\(\.site-block-authored-text-decoration \*\):not\(\.site-block-authored-text-decoration\)\{text-decoration:none\}/);
  assert.match(css, /\.template-navigation a:hover[^{}]+\{text-decoration:underline\}/);
  assert.match(css, /\.template-navigation:not\(\.site-block-authored-font-size\)\{font-size:clamp\(1rem/);
  const authored = websiteDesignRules({ ...selection, typography: { elements: { links: { decoration: 'line-through' } } } }, 'navigation', true, { referenceDefaults: true, typographySelected: true });
  assert.match(authored, /\.template-navigation a\)[^{}]+\{text-decoration:line-through\}/);
  assert.doesNotMatch(authored, /\.template-navigation a[^{}]+\{text-decoration:none\}/);
  const savedSize = websiteDesignRules({ ...selection, typography: { elements: { links: { size: '24px' } } } }, 'navigation', true, { referenceDefaults: true, typographySelected: true });
  assert.match(savedSize, /\.template-navigation a\)[^{}]+\{font-size:24px\}/);
  assert.doesNotMatch(savedSize, /\.template-navigation:not\(\.site-block-authored-font-size\)\{font-size:/);
});

test('saved Button role typography is not reclassified as a reference block size', () => {
  for (const buttons of [{ size: '24px' }, { preset: 'large' }]) {
    const design = effectiveWebsiteDesign({ identity: {}, styles: { typography: { elements: { buttons } } } }, empty);
    const html = render(design, true);
    const styles = [...html.matchAll(/<style>([\s\S]*?)<\/style>/g)].map(match => match[1]).join('\n');
    const buttonBlockSizeRules = [];
    postcss.parse(styles).walkRules(rule => {
      if (rule.selector.includes('.site-block-style-button') && rule.nodes.some(node => node.type === 'decl' && node.prop === 'font-size')) buttonBlockSizeRules.push(rule.selector);
    });
    assert.deepEqual(buttonBlockSizeRules, [], 'the default medium preset must yield to the saved Buttons role');
    assert.match(styles, buttons.size ? /font-size:var\(--button-group-font-size,24px\)/ : /font-size:var\(--button-group-font-size,clamp\(1\.125rem/);
  }
});

test('reference content width includes the selected gutters when no width is authored', () => {
  for (const padding of ['10px', '40px']) {
    const design = effectiveWebsiteDesign({ identity: {}, styles: { layout: { padding } } }, empty);
    const html = render(design, true);
    assert.ok(html.includes(`max-width:calc(645px + ${padding} + ${padding})`));
  }
});

test('reference Quote inherits saved Text appearance unless its own block style overrides it', () => {
  const design = effectiveWebsiteDesign({ identity: {}, styles: { typography: { elements: { text: { fontStyle: 'italic' } } } } }, empty);
  const html = render(design, true);
  assert.match(html, /\.paragraph-field[^{}]+\{font-style:italic\}/);
  assert.doesNotMatch(html, /\.site-block-style-quote[^{}]+\{font-style:normal!important\}/);
  assert.equal(referencePreviewBlockStyles().quote.websiteItalic, undefined);
  assert.equal(referencePreviewBlockStyles({ quote: { websiteItalic: false } }).quote.websiteItalic, false);
});
