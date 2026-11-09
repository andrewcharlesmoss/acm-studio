import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { loadProductionModule } from './production-module.mjs';
const load = path => loadProductionModule(new URL(path, import.meta.url));
const { layoutStyleProperties, flexItemSizingStyle } = await load('../app/content/layout.ts');
const { groupGridResponsiveCss, groupGridContainerName } = await load('../app/content/grid-child-sizing.ts');
const { GroupGridResponsiveStyles } = await load('../app/components/blocks/group-grid-responsive-styles.tsx');
const { createReferenceTemplateParts } = await load('../app/studio/reference-template-parts.ts');
const { TemplateNodes } = await load('../app/studio/template-renderer.tsx');
const { BlockRenderer } = await load('../app/components/blocks/block-renderer.tsx');

test('Grow retains its intrinsic basis and Group owner variables do not inherit another block configuration', () => {
  assert.equal(flexItemSizingStyle({ mode: 'grow' }).flexBasis, 'auto');
  const child = layoutStyleProperties({ id: 'child', type: 'group', layout: 'row' });
  for (const key of ['gap', 'column-gap', 'row-gap', 'padding-x', 'padding-y']) assert.equal(child[`--block-layout-${key}`], 'initial');
  assert.equal(layoutStyleProperties({ type: 'group', layout: 'row', gap: 0, paddingX: 0 })['--block-layout-gap'], '0px');
  assert.equal(layoutStyleProperties({ type: 'group', layout: 'row', gap: 0, paddingX: 0 })['--block-layout-padding-x'], '0px');
  assert.equal(layoutStyleProperties({ type: 'section', layout: 'row' })['--block-layout-gap'], undefined);
});

test('one custom constrained width supplies both default and wide children, preserving non-Group legacy mappings', () => {
  for (const [field, value] of [['contentSize', '400px'], ['wideSize', '900px']]) {
    const css = layoutStyleProperties({ type: 'group', layout: 'flow', inheritLayout: false, [field]: value });
    assert.equal(css['--block-content-size'], value);
    assert.equal(css['--block-wide-size'], value);
  }
  assert.equal(layoutStyleProperties({ type: 'section', layout: 'flow', inheritLayout: false, contentSize: '400px' })['--block-wide-size'], undefined);
});

test('responsive span rules preserve pixels, relative and legacy viewport units; Manual Grid keeps exact spans', () => {
  const styles = [{ gridItemSizing: { columnSpan: 3, rowSpan: 2 } }];
  for (const [unit, minimum, threshold] of [['px', 100, '348px'], ['rem', 12, '39rem'], ['em', 10, '33em'], ['vw', 10, 'max(calc(30vw + 48px),calc(20vw + 23px))']]) {
    const parent = { id: 'grid', type: 'group', layout: 'grid', gridMode: 'auto', minColumnWidth: minimum, minColumnWidthUnit: unit };
    const css = groupGridResponsiveCss(parent, styles);
    assert.ok(css.includes(`max-width:${threshold}`), css);
    assert.ok(css.includes('grid-column:1/-1!important;grid-row:auto!important;'));
    assert.equal(groupGridResponsiveCss({ ...parent, gridMode: 'manual' }, styles), '');
  }
  assert.ok(groupGridResponsiveCss({ id: 'grid', type: 'group', layout: 'grid', minColumnWidth: 100 }, styles).includes('348px'));
});

test('the production Template, content and shared editable Grid paths emit the same responsive owner and span class', () => {
  const grid = { id: 'responsive-grid', type: 'group', layout: 'grid', gridMode: 'auto', inheritLayout: true, minColumnWidth: 12, minColumnWidthUnit: 'rem', children: [{ id: 'span', type: 'paragraph', text: 'Spanning child', style: { gridItemSizing: { columnSpan: 3, rowSpan: 2 } } }] };
  const expected = `${groupGridContainerName(grid)}-span-3`;
  const set = createReferenceTemplateParts();
  const template = renderToStaticMarkup(createElement(TemplateNodes, { set, nodes: [grid], document: { blocks: [] } }));
  const content = renderToStaticMarkup(createElement(BlockRenderer, { blocks: [grid], variant: 'studio', document: { blocks: [grid] } }));
  for (const html of [template, content]) {
    assert.ok(html.includes(expected));
    assert.ok(html.includes('container-type:inline-size'));
    assert.ok(html.includes('grid-column:1/-1!important'));
  }
  assert.ok(renderToStaticMarkup(createElement(GroupGridResponsiveStyles, { parent: grid })).includes(expected));
});
