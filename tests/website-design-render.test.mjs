import test from 'node:test';
import assert from 'node:assert/strict';
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
  assert.equal(websiteDesignRules(selection, 'baseline', true), '');
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
