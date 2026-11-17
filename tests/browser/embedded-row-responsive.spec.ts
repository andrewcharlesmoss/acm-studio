import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { loadProductionModule } from '../production-module.mjs';

test('embedded editor and public Rows use their document width, with viewport fallback', async ({ page }) => {
  const load = (path: string) => loadProductionModule(new URL(path, import.meta.url));
  const { BlockRenderer } = await load('../../app/components/content.tsx');
  const { BlockField } = await load('../../app/studio/studio-canvas.tsx');
  const { responsiveBlockCss } = await load('../../app/content/responsive-styles.ts');
  const css = ['globals.css', 'studio/studio.css', 'studio/templates.css'].map(file => readFileSync(new URL(`../../app/${file}`, import.meta.url), 'utf8')).join('\n') + responsiveBlockCss;
  const row = (stackAt: string) => ({ id: `row-${stackAt}`, type: 'group', layout: 'row', stackAt, allowSizingOnChildren: true, children: [
    { id: `child-${stackAt}`, type: 'group', layout: 'stack', visualStyle: { flexItemSizing: { mode: 'fixed', size: '320px' } }, children: [{ id: `text-${stackAt}`, type: 'paragraph', text: 'Pane content' }] },
  ] });
  const blocks = ['tablet', 'mobile', 'never'].map(row);
  const editor = blocks.map(block => createElement(BlockField, { key: block.id, block, rootBlocks: blocks, writable: true, onChange() {} }));
  const markup = renderToStaticMarkup(createElement('main', null,
    createElement('section', { id: 'editor', className: 'studio-responsive-container' }, ...editor),
    createElement('section', { id: 'public', className: 'studio-responsive-container' }, createElement(BlockRenderer, { blocks })),
    createElement('section', { id: 'nested', className: 'studio-responsive-container' }, createElement('div', { className: 'template-surface', style: { padding: 0, maxWidth: 'none' } }, createElement(BlockRenderer, { blocks }))),
    createElement('section', { id: 'standalone-template' }, createElement('div', { className: 'template-surface', style: { padding: 0, maxWidth: 'none' } }, createElement(BlockRenderer, { blocks }))),
    createElement('section', { id: 'fallback' }, createElement(BlockRenderer, { blocks })),
  ));
  await page.setViewportSize({ width: 1200, height: 1000 });
  await page.setContent(`<style>${css}</style>${markup}`);
  for (const width of [1000, 781, 780, 621, 620, 390]) {
    for (const mode of ['editor', 'public']) await page.locator(`#${mode}`).evaluate((element, value) => { (element as HTMLElement).style.width = `${value}px`; }, width);
    for (const mode of ['editor', 'public']) for (const breakpoint of ['tablet', 'mobile', 'never']) {
      const group = page.locator(`#${mode} .layout-row[data-layout-stack-at="${breakpoint}"]`).first();
      const child = group.locator(':scope > [data-row-child-sizing]');
      const stacked = breakpoint === 'tablet' ? width <= 780 : breakpoint === 'mobile' ? width <= 620 : false;
      await expect(group).toHaveCSS('flex-direction', stacked ? 'column' : 'row');
      await expect(child).toHaveCSS('flex-basis', stacked ? 'auto' : '320px');
    }
  }
  await page.setViewportSize({ width: 390, height: 1000 });
  for (const mode of ['editor', 'public']) {
    await page.locator(`#${mode}`).evaluate(element => { (element as HTMLElement).style.width = '1000px'; });
    const group = page.locator(`#${mode} .layout-row[data-layout-stack-at="tablet"]`).first();
    await expect(group).toHaveCSS('flex-direction', 'row');
    await expect(group.locator(':scope > [data-row-child-sizing]')).toHaveCSS('flex-basis', '320px');
  }
  const fallback = page.locator('#fallback .layout-row[data-layout-stack-at="tablet"]').first();
  await page.locator('#fallback').evaluate(element => { (element as HTMLElement).style.width = '100%'; });
  await expect(fallback).toHaveCSS('flex-direction', 'column');
  await expect(fallback.locator(':scope > [data-row-child-sizing]')).toHaveCSS('flex-basis', 'auto');
  await page.setViewportSize({ width: 1200, height: 1000 });
  for (const [outerWidth, templateWidth, stacked] of [[1000, 500, true], [500, 1000, false]] as const) {
    await page.locator('#nested').evaluate((element, width) => { (element as HTMLElement).style.width = `${width}px`; }, outerWidth);
    await page.locator('#nested .template-surface').evaluate((element, width) => { (element as HTMLElement).style.width = `${width}px`; }, templateWidth);
    const group = page.locator('#nested .layout-row[data-layout-stack-at="tablet"]').first();
    await expect(group).toHaveCSS('flex-direction', stacked ? 'column' : 'row');
    await expect(group.locator(':scope > [data-row-child-sizing]')).toHaveCSS('flex-basis', stacked ? 'auto' : '320px');
  }
  for (const [viewportWidth, templateWidth, stacked] of [[1200, 500, true], [390, 1000, false]] as const) {
    await page.setViewportSize({ width: viewportWidth, height: 1000 });
    await page.locator('#standalone-template .template-surface').evaluate((element, width) => { (element as HTMLElement).style.width = `${width}px`; }, templateWidth);
    const group = page.locator('#standalone-template .layout-row[data-layout-stack-at="tablet"]').first();
    await expect(group).toHaveCSS('flex-direction', stacked ? 'column' : 'row');
    await expect(group.locator(':scope > [data-row-child-sizing]')).toHaveCSS('flex-basis', stacked ? 'auto' : '320px');
  }
});

test('template Rows retain the intrinsic width of their rendered content', async ({ page }) => {
  const load = (path: string) => loadProductionModule(new URL(path, import.meta.url));
  const { BlockRenderer } = await load('../../app/components/content.tsx');
  const { TemplateNodes } = await load('../../app/studio/template-renderer.tsx');
  const { createTemplateSet } = await load('../../app/studio/template-model.ts');
  const css = ['globals.css', 'studio/studio.css', 'studio/templates.css'].map(file => readFileSync(new URL(`../../app/${file}`, import.meta.url), 'utf8')).join('\n');
  const node = { id: 'template-row', type: 'group', layout: 'row', horizontalAlign: 'centre', children: [
    { id: 'first', type: 'paragraph', text: 'The first substantial label' },
    { id: 'second', type: 'paragraph', text: 'Another substantial label' },
  ] };
  const markup = renderToStaticMarkup(createElement('div', { className: 'template-surface', style: { width: '1000px', padding: 0 } }, createElement(TemplateNodes, {
    nodes: [node], set: createTemplateSet('Test'), document: { id: 'document', kind: 'page', title: 'Test', blocks: [] },
    renderOrdinary: (block: typeof node.children[number]) => createElement('div', { className: 'template-node' }, createElement(BlockRenderer, { blocks: [block], variant: 'studio' })),
  })));
  await page.setViewportSize({ width: 1200, height: 900 });
  await page.setContent(`<style>${css}</style>${markup}`);
  const children = page.locator('.template-group.layout-row').first().locator(':scope > div');
  await expect(children).toHaveCount(2);
  for (const child of await children.all()) expect((await child.boundingBox())!.width).toBeGreaterThan(100);
});

test('the Block Library Row responds to its resized preview while the window stays wide', async ({ page }) => {
  await page.setViewportSize({ width: 1900, height: 1000 });
  await page.goto('/studio/ui/blocks/columns');
  await expect(page.locator('.ui-block-specimen').first()).toHaveAttribute('data-ready', 'true');
  await page.getByRole('button', { name: 'Transform Columns block', exact: true }).first().click();
  await page.getByRole('menuitem', { name: 'Row', exact: true }).click();
  const row = page.locator('.ui-block-specimen .studio-nested-group.layout-row').first();
  const resize = page.getByRole('separator', { name: 'Resize preview', exact: true });
  await resize.press('Home');
  await expect(row).toHaveCSS('flex-direction', 'column');
  await expect(row.locator(':scope > [data-row-child-sizing]').first()).toHaveCSS('flex-basis', 'auto');
  await resize.press('End');
  await expect(row).toHaveCSS('flex-direction', 'row');
  await expect(row.locator(':scope > [data-row-child-sizing]').first()).not.toHaveCSS('flex-basis', 'auto');
});
