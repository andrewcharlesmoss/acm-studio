import test from 'node:test';
import assert from 'node:assert/strict';
import postcss from 'postcss';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { loadProductionModule } from './production-module.mjs';

const { projectWebsiteDesignBlocks, WebsiteDesignIdentity, websiteDesignRules, WebsiteDesignSurface } = await loadProductionModule(new URL('../app/studio/site-editor/website-design-surface.tsx', import.meta.url));
const selection = { paletteId: 'default', typographyId: 'default' };

test('website rendering projects nested defaults without changing authored source or injecting specimen defaults', () => {
  const source = [{ id: 'group', type: 'group', layout: 'stack', children: [{ id: 'p', type: 'paragraph', text: 'Original', style: { textColor: 'red' } }, { id: 'cols', type: 'columns', children: [{ id: 'column', type: 'column', children: [{ id: 'button', type: 'button', label: 'Action', url: '/', style: 'primary' }] }] }] }];
  const original = structuredClone(source);
  const output = projectWebsiteDesignBlocks(source, { ...selection, blockStyles: { paragraph: { textColor: 'blue', padding: '12px' } } });
  assert.deepEqual(source, original);
  assert.equal(output[0].children[0].style.textColor, 'red', 'authored content wins over theme');
  assert.equal(output[0].children[0].style.padding, '12px');
  assert.match(output[0].children[0].style.className, /site-block-authored-color/);
  assert.ok(!output[0].children[0].style.className.includes('site-block-authored-padding'), 'a theme default never becomes authored formatting');
  const button = output[0].children[1].children[0].children[0];
  assert.equal(button.visualStyle?.padding, undefined, 'the real website does not acquire TT5 specimen padding');
  assert.notEqual(output[0].children, source[0].children);
});

test('resolved identity respects blank text, independent visibility, and portable image URLs', () => {
  const image = { id: 'logo', name: 'Logo', altText: 'Saved logo', src: '/media/example.png' };
  const design = { styles: selection, identity: { title: 'Retained title', tagline: 'Site description', logo: image, hidden: { title: true } } };
  const hidden = renderToStaticMarkup(createElement(WebsiteDesignIdentity, { design, homeUrl: '/', imageUrl: src => '/fixture' + src }));
  assert.ok(!hidden.includes('Retained title'));
  assert.ok(hidden.includes('Site description'));
  assert.ok(hidden.includes('/fixture/media/example.png'));
  assert.equal(design.identity.title, 'Retained title');
  const blank = renderToStaticMarkup(createElement(WebsiteDesignIdentity, { design: { styles: selection, identity: { title: '', tagline: '', hidden: { logo: true } } }, homeUrl: '/' }));
  assert.equal(blank, '');
});

test('website role rules and surface share saved typography, layout, and scoped background', () => {
  const styles = { ...selection, typography: { elements: { text: { size: '21px' } } }, layout: { contentWidth: '750px', blockSpacing: '24px' }, background: { colour: 'rgb(20, 30, 40)' } };
  const css = websiteDesignRules(styles, 'site');
  assert.match(css, /font-size:21px/);
  assert.match(css, /max-width:750px/);
  assert.match(css, /site-block-authored-font-size/);
  const html = renderToStaticMarkup(createElement(WebsiteDesignSurface, { design: { identity: {}, styles }, scopeId: 'site' }, createElement('main', { className: 'test-site-page' }, 'Actual page')));
  assert.ok(html.includes('data-website-design="site"'));
  assert.ok(html.includes('background-color:rgb(20, 30, 40)'));
  assert.ok(html.includes('Actual page'));
  assert.ok(!html.includes('class="site-style-book"'), 'specimen framing is not a production dependency');
});

test('website Link colour and hover settings reach the painted rich-text anchor', () => {
  const css = websiteDesignRules({ ...selection, typography: { elements: { links: { colour: '#111111' } } }, colours: { elements: { links: { hover: '#3858e9' } } } }, 'links');
  assert.ok(css.includes(':is(.paragraph-field a,.preview-rich-text a,.list-item-text a,.template-navigation a)'));
  assert.ok(css.includes('{color:#111111}'));
  assert.ok(css.includes('[data-website-design="links"] .preview-rich-text a:hover'));
  assert.ok(css.includes('.template-navigation a:hover{color:#3858e9}'));
});

test('website heading typography targets the canonical heading level classes', () => {
  const css = websiteDesignRules({ ...selection, typography: { elements: {
    headings: { family: 'Manrope, sans-serif', weight: 400, lineHeight: '1.125' },
    h1: { size: '48px' }, h2: { size: '32px' }, h3: { size: '22px' },
    h4: { size: '18px' }, h5: { size: '14px' }, h6: { size: '14px', transform: 'uppercase' },
  } } }, 'heading-targets');
  for (const level of ['h1', 'h2', 'h3', 'h4', 'h5', 'h6']) {
    assert.ok(css.includes(`.heading-field.is-${level}`), `${level} typography must reach Studio's canonical heading field`);
  }
  assert.match(css, /:is\(\.heading-field\.is-h1,\.preview-title,\.content-heading\.is-h1\)[^{}]*\{[^}]*font-size:48px/);
  assert.match(css, /:is\(\.heading-field\.is-h6,\.preview-title\.is-h6,\.content-heading\.is-h6\)[^{}]*\{[^}]*text-transform:uppercase/);
});

test('site-wide Text alignment preserves semantic table header and cell alignment', () => {
  const css = websiteDesignRules({ ...selection, typography: { elements: { text: { align: 'left' } } } }, 'table-alignment');
  const alignmentRules = [];
  postcss.parse(css).walkRules(rule => {
    if (rule.nodes.some(node => node.type === 'decl' && node.prop === 'text-align')) alignmentRules.push(rule.selector);
  });
  assert.ok(alignmentRules.length > 0, 'ordinary content still receives its selected Text alignment');
  assert.ok(alignmentRules.every(selector => !/content-table|table-field-grid/.test(selector)), 'Table styles retain their semantic heading and cell alignment');
  assert.ok(css.includes('.test-site-page{text-align:left}'), 'ordinary page text still inherits the selected Text alignment');
});

test('site-wide Text typography reaches table cells while preserving header weight and semantic alignment', () => {
  const css = websiteDesignRules({ ...selection, typography: { elements: { text: { size: '22px', family: 'Manrope, sans-serif', lineHeight: '1.4', weight: 300 } } } }, 'table-text');
  assert.match(css, /\.content-table[^{}]*\{[^}]*font-size:22px/);
  assert.match(css, /\.table-field-grid[^{}]*\{[^}]*font-size:22px/);
  assert.doesNotMatch(css, /\.content-table-cell|\.table-cell-editor/);
  assert.doesNotMatch(css, /\.content-table[^{}]*\{[^}]*text-align:/);
  assert.doesNotMatch(css, /\.content-table-cell[^{}]*\{[^}]*font-weight:/);
  assert.doesNotMatch(css, /\.table-field-grid \.table-cell-editor[^{}]*\{[^}]*font-weight:/);
  assert.match(css, /\.content-table[^{}]*\{[^}]*font-weight:300/);
});

test('saved variation settings target their actual variant and preserve authored properties', () => {
  const styles = { ...selection, blockStyles: { image: { borderWidth: '1px', variations: { rounded: { borderWidth: '7px', textColor: 'blue' } } } } };
  const sources = [{ id: 'round', type: 'image', src: '/media/example.png', alt: '', imageStyle: 'rounded', visualStyle: { textColor: 'red' } }, { id: 'plain', type: 'image', src: '/media/example.png', alt: '' }];
  const projected = projectWebsiteDesignBlocks(sources, styles);
  assert.equal(projected[0].visualStyle.borderWidth, '7px');
  assert.equal(projected[0].visualStyle.textColor, 'red');
  assert.equal(projected[1].visualStyle.borderWidth, '1px');
  assert.match(projected[0].visualStyle.className, /site-block-variation-rounded/);
  const html = renderToStaticMarkup(createElement(WebsiteDesignSurface, { design: { identity: {}, styles }, scopeId: 'variation' }));
  assert.match(html, /\.site-block-style-image\.site-block-variation-rounded/);
});

const { BlockRenderer } = await loadProductionModule(new URL('../app/components/blocks/block-renderer.tsx', import.meta.url));
test('recursive production renderer does not reclassify inherited nested formatting as authored', () => {
  const styles = { ...selection, blockStyles: { paragraph: { padding: '13px', textColor: 'blue' } } };
  const blocks = [{ id: 'quote', type: 'quote', text: '', children: [{ id: 'p', type: 'paragraph', text: 'Nested text' }] }];
  const projected = projectWebsiteDesignBlocks(blocks, styles);
  assert.equal(projectWebsiteDesignBlocks(projected, styles)[0], projected[0]);
  assert.deepEqual(JSON.parse(JSON.stringify(blocks)), blocks);
  const html = renderToStaticMarkup(createElement(WebsiteDesignSurface, { design: { identity: {}, styles }, scopeId: 'nested' }, createElement(BlockRenderer, { blocks, variant: 'studio' })));
  assert.ok(html.includes('Nested text'));
  const paragraph = html.match(/<p[^>]*>/)?.[0] ?? '';
  assert.ok(paragraph.includes('site-block-style-paragraph'));
  assert.ok(!paragraph.includes('site-block-authored-padding'));
  assert.ok(!paragraph.includes('site-block-authored-color'));
});

test('unselected theme families preserve the legacy page while independent choices apply only their own defaults', () => {
  const baseline = websiteDesignRules(selection, 'baseline', true);
  assert.ok(!baseline.includes('font-size:'));
  assert.ok(!baseline.includes('color:'));
  assert.ok(baseline.includes('padding-inline:var(--acm-layout-spacing, 24px)'));
  const paletteOnly = websiteDesignRules(selection, 'palette', true, { paletteSelected: true, typographySelected: false });
  assert.ok(paletteOnly.includes('color:'));
  assert.ok(!paletteOnly.includes('font-size:'));
  assert.ok(!paletteOnly.includes('text-align:'));
  const typeOnly = websiteDesignRules(selection, 'type', true, { paletteSelected: false, typographySelected: true });
  assert.ok(typeOnly.includes('font-size:'));
  assert.ok(!typeOnly.includes('color:'));
});

test('canonical block alignment remains authored when website typography supplies alignment', () => {
  const [block] = projectWebsiteDesignBlocks([{ id: 'aligned', type: 'paragraph', text: 'Centred', align: 'centre' }], selection);
  assert.match(block.style.className, /site-block-authored-text-align/);
  assert.equal(block.align, 'centre');
});


test('actual website gutters inherit guide spacing and explicit padding replaces the fallback', () => {
  const fallback = websiteDesignRules(selection, 'gutter', true);
  assert.match(fallback, /\.test-site-page\{padding-inline:var\(--acm-layout-spacing, 24px\)\}/);
  assert.match(fallback, /--studio-canvas-inline-padding:var\(--acm-layout-spacing, 24px\)/);
  assert.ok(!fallback.includes(':has(main)'), 'legacy main pages use the same root gutter as bare pages');
  assert.ok(fallback.includes('.test-site-page main{padding-inline:0px}'));
  assert.ok(!fallback.includes('.test-document-navigation{padding'), 'the inherited header retains its own inset');
  for (const padding of ['0', '0px', '12px 32px']) {
    const rules = websiteDesignRules({ ...selection, layout: { padding } }, 'gutter', true);
    assert.ok(rules.includes(`.test-site-page{padding:${padding}}`));
    assert.ok(rules.includes(`--studio-canvas-inline-padding:${padding === '12px 32px' ? '32px' : padding}`));
    assert.ok(!rules.includes('padding-inline:var(--acm-layout-spacing'), 'an explicit zero or value replaces the default gutter');
    assert.ok(rules.includes('.test-site-page main{padding-inline:0px}'), 'legacy stylesheet main gutters do not double the explicit root padding');
  }
  const source = [{ id: 'main', type: 'group', tagName: 'main', layout: 'flow', visualStyle: { padding: '48px 16px' }, children: [{ id: 'wide', type: 'heading', level: 2, text: 'Wide', blockAlign: 'wide' }] }];
  const projected = projectWebsiteDesignBlocks(source, selection);
  assert.equal(projected[0].visualStyle.padding, '48px 16px');
  assert.equal(projected[0].children[0].blockAlign, 'wide');
});

test('document navigation uses the website wide width while article content keeps its content width', () => {
  const css = websiteDesignRules({ ...selection, layout: { contentWidth: '645px', wideWidth: '1340px' } }, 'navigation-width');
  assert.ok(css.includes('[data-website-design="navigation-width"] .test-site-page{max-width:645px}'));
  assert.ok(css.includes('[data-website-design="navigation-width"] .test-site-page{margin-inline:auto}'));
  assert.ok(css.includes('[data-website-design="navigation-width"] .test-document-navigation,[data-website-design="navigation-width"] [data-block-align="wide"],[data-website-design="navigation-width"] .block-align-wide{max-width:1340px}'));
  assert.ok(css.includes('[data-website-design="navigation-width"] .test-document-navigation,[data-website-design="navigation-width"] [data-block-align="wide"],[data-website-design="navigation-width"] .block-align-wide{margin-inline:auto}'));
  assert.doesNotMatch(css, /\[data-website-design="navigation-width"\] \.test-document-navigation\{max-width:645px/);
});
