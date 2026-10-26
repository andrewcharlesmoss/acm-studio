import assert from 'node:assert/strict';
import test from 'node:test';
import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createIsolatedModuleLoader, loadProductionModule } from './production-module.mjs';

const model = await loadProductionModule(new URL('../app/studio/site-editor/blocks-preview-model.ts', import.meta.url));
const { projectWebsiteDesignBlocks } = await loadProductionModule(new URL('../app/studio/site-editor/website-design-surface.tsx', import.meta.url));
const { BlockStyleSpecimen } = await loadProductionModule(new URL('../app/studio/site-editor/block-style-specimen.tsx', import.meta.url));
const { createStylesPreview, resolvePreviewStyle, stylesPreviewReducer } = await loadProductionModule(new URL('../app/studio/site-editor/styles-preview-state.ts', import.meta.url));
const selection = resolvePreviewStyle(createStylesPreview().present, 'global');
const nodes = node => !node || typeof node !== 'object' ? [] : Array.isArray(node) ? node.flatMap(nodes) : [node, ...nodes(node.props?.children)];

test('Social Icons variation defaults reach specimens and authored variants without altering content', () => {
  for (const socialStyle of ['logos-only', 'pill-shape']) {
    const blockStyles = { 'social-icons': { padding: '5px', variations: { [socialStyle]: { margin: '7px' } } } };
    const source = [{ id: 'social', type: 'social-icons', socialStyle, children: [{ id: 'linkedin', type: 'social-linkedin', url: '#example' }, { id: 'tiktok', type: 'social-tiktok', url: '#example' }] }];
    const original = JSON.stringify(source);
    const [result] = projectWebsiteDesignBlocks(source, { ...selection, blockStyles });
    assert.equal(result.socialStyle, socialStyle);
    assert.equal(result.visualStyle.padding, '5px');
    assert.equal(result.visualStyle.margin, '7px');
    assert.match(result.visualStyle.className, new RegExp(`site-block-variation-${socialStyle}`));
    assert.equal(JSON.stringify(source), original);
    const html = renderToStaticMarkup(React.createElement(BlockStyleSpecimen, { id: 'social-icons', selection: { ...selection, blockStyles }, variation: socialStyle, viewport: 'desktop' }));
    assert.match(html, new RegExp(`is-style-${socialStyle}`));
    assert.match(html, /aria-label="LinkedIn"/);
    assert.match(html, /aria-label="TikTok"/);
    const [defaultSocial] = projectWebsiteDesignBlocks([{ ...source[0], socialStyle: undefined }], { ...selection, blockStyles });
    assert.equal(defaultSocial.visualStyle.margin, undefined);
  }
});

test('all five section styles apply only to recognised existing container variations', () => {
  const expected = [[6,1], [3,1], [2,1], [4,3], [1,0]];
  for (const type of ['group', 'row', 'stack', 'grid', 'columns', 'column']) for (let index = 0; index < expected.length; index++) {
    const variant = `section-${index + 1}`;
    const base = { id: type, type: ['row','stack','grid'].includes(type) ? 'group' : type, ...(type === 'group' ? { layout: 'flow' } : ['row','stack','grid'].includes(type) ? { layout: type } : {}), children: [] };
    const source = { ...base, [type === 'column' || type === 'columns' ? 'style' : 'visualStyle']: { className: `custom is-style-${variant}`, padding: '11px' } };
    const original = JSON.stringify(source);
    const [result] = projectWebsiteDesignBlocks([source], selection);
    const style = result.style ?? result.visualStyle;
    assert.equal(style.backgroundColor, `var(--site-palette-theme-${expected[index][0]})`);
    assert.equal(style.textColor, `var(--site-palette-theme-${expected[index][1]})`);
    assert.equal(style.padding, '11px');
    assert.match(style.className, new RegExp(`site-block-variation-${variant}`));
    assert.equal(JSON.stringify(source), original);
    assert.equal(model.previewBlockVariation({ ...source, [type === 'column' || type === 'columns' ? 'style' : 'visualStyle']: { className: variant } }), undefined);
  }
});

test('container variation overrides inherit, reset and undo independently of the reference palette', () => {
  let history = createStylesPreview();
  const dispatch = action => { history = stylesPreviewReducer(history, action); };
  const read = () => model.resolvePreviewBlockVariant(model.resolvePreviewBlockDefaults(resolvePreviewStyle(history.present, 'test').blockStyles).row, 'section-4');
  dispatch({ type: 'block-style', scope: 'global', block: 'group', variation: 'section-4', patch: { headingColors: { 2: '#123456' } } });
  dispatch({ type: 'block-style', scope: 'test', block: 'row', variation: 'section-4', viewport: 'mobile', patch: { headingColors: { 3: '#654321' } } });
  assert.equal(read().backgroundColor, 'var(--site-palette-theme-4)');
  assert.deepEqual(model.effectivePreviewBlockStyle(read(), 'mobile').headingColors, { 2: '#123456', 3: '#654321' });
  dispatch({ type: 'reset-block-style', scope: 'test', block: 'row', variation: 'section-4', viewport: 'mobile' });
  assert.deepEqual(model.effectivePreviewBlockStyle(read(), 'mobile').headingColors, { 2: '#123456' });
  dispatch({ type: 'undo' });
  assert.equal(model.effectivePreviewBlockStyle(read(), 'mobile').headingColors[3], '#654321');
});

test('section descendant markers are scoped to sections and retain authored device colours', () => {
  const children = [{ id: 'date', type: 'post-date' }, { id: 'divider', type: 'divider', style: 'wide', visualStyle: { backgroundColor: '#246813' } }, { id: 'quote', type: 'quote', text: 'Quote', visualStyle: { textColor: '#123456', responsive: { mobile: { textColor: '#654321' } } } }];
  const [group] = projectWebsiteDesignBlocks([{ id: 'section', type: 'group', layout: 'flow', visualStyle: { className: 'is-style-section-4' }, children }], selection);
  for (const child of group.children) assert.match(child.visualStyle.className, new RegExp(`site-block-style-${child.type}`));
  assert.equal(group.children[2].visualStyle.textColor, '#123456');
  assert.equal(group.children[1].visualStyle.backgroundColor,'#246813');
  assert.match(group.children[1].visualStyle.className,/site-block-authored-background-color/);
  assert.equal(group.children[2].visualStyle.responsive.mobile.textColor, '#654321');
  assert.match(group.children[2].visualStyle.className, /site-block-authored---studio-rs-mobile-color/);
  const [ordinaryDate] = projectWebsiteDesignBlocks([children[0]], selection);
  assert.equal(ordinaryDate.visualStyle, undefined);
  assert.equal(children[0].visualStyle, undefined);
});

test('container Elements menus expose H1–H6 and reset only the selected authored colour', () => {
  const loader = createIsolatedModuleLoader({ overrides: { react: { ...React, useState: initial => [initial, () => {}] } } });
  const { BlockStyleSections } = loader(new URL('../app/studio/site-editor/block-style-sections.tsx', import.meta.url));
  for (const id of ['quote','group','row','stack','grid','section','columns','column']) {
    const authored = { headingColor: '#000000', headingBackground: { background: '#FFFFFF' }, headingColors: { 2: '#123456', 3: '#654321' }, headingBackgrounds: { 2: { background: '#ff0000' }, 3: { background: '#00ff00' } }, buttonTextColor: '#FFFFFF', textColor: '#112233' };
    const changes = [];
    const tree = BlockStyleSections({ id, value: authored, authored, fontSelectionValue: '', selection, viewport: 'desktop', onChange: patch => changes.push(patch) });
    const elements = nodes(tree).find(node => node.props?.title === 'Elements');
    assert.ok(elements, id);
    assert.deepEqual(Array.from(elements.props.options.filter(option => /^h[1-6]$/.test(option.id)), option => option.id), ['h1','h2','h3','h4','h5','h6']);
    assert.equal(elements.props.options.find(option => option.id === 'h2').accessibleName, 'Hide and reset H2');
    elements.props.onToggle('h2');
    const hiddenLevel = model.patchPreviewBlockStyle(authored,changes.pop());
    assert.equal(hiddenLevel.headingColors[2],undefined);
    assert.equal(hiddenLevel.headingBackgrounds[2],undefined);
    elements.props.onResetOption('h2');
    const resetLevel = model.patchPreviewBlockStyle(authored, changes.pop());
    assert.deepEqual(resetLevel.headingColors, { 3: '#654321' });
    assert.deepEqual(resetLevel.headingBackgrounds, { 3: { background: '#00ff00' } });
    elements.props.onResetOption('heading');
    const resetHeading = model.patchPreviewBlockStyle(authored, changes.pop());
    assert.equal(resetHeading.headingColor, undefined);
    assert.equal(resetHeading.headingBackground, undefined);
    assert.deepEqual(resetHeading.headingColors, authored.headingColors);
    elements.props.onReset();
    const resetAll = model.patchPreviewBlockStyle(authored, changes.pop());
    assert.equal(resetAll.headingColors, undefined);
    assert.equal(resetAll.headingBackgrounds, undefined);
    assert.equal(resetAll.textColor, '#112233');
  }
});

test('heading backgrounds merge per scope, level and device while solid and gradient choices replace each other', () => {
  const gradient = { type: 'linear', angle: 90, stops: [{ colour: '#000000', position: 0 }, { colour: '#FFFFFF', position: 100 }] };
  let history = createStylesPreview();
  const dispatch = action => { history = stylesPreviewReducer(history, action); };
  dispatch({ type: 'block-style', scope: 'global', block: 'group', patch: { headingBackground: { background: '#123456' }, headingBackgrounds: { 2: { gradient, gradientId: 'example' }, 3: { background: '#654321' } } } });
  dispatch({ type: 'block-style', scope: 'test', block: 'group', patch: { headingBackgrounds: { 2: { background: '#ff0000' } } } });
  dispatch({ type: 'block-style', scope: 'test', block: 'group', viewport: 'mobile', patch: { headingBackground: { gradient }, headingBackgrounds: { 2: { gradient } } } });
  const read = () => resolvePreviewStyle(history.present, 'test').blockStyles.group;
  assert.deepEqual(read().headingBackgrounds[2], { background: '#ff0000' });
  assert.deepEqual(read().headingBackgrounds[3], { background: '#654321' });
  assert.equal(model.effectivePreviewBlockStyle(read(), 'mobile').headingBackground.background, undefined);
  assert.deepEqual(model.effectivePreviewBlockStyle(read(), 'mobile').headingBackgrounds[2], { gradient });
  dispatch({ type: 'block-style', scope: 'test', block: 'group', patch: { headingBackgrounds: { 2: undefined } } });
  assert.deepEqual(read().headingBackgrounds[2], { gradient, gradientId: 'example' });
  assert.deepEqual(model.effectivePreviewBlockStyle(read(), 'mobile').headingBackgrounds[2], { gradient });
  dispatch({ type: 'undo' });
  assert.deepEqual(read().headingBackgrounds[2], { background: '#ff0000' });
});
