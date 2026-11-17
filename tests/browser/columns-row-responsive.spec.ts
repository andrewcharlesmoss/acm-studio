import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { loadProductionModule } from '../production-module.mjs';

test('Columns converted to Row retain widths and stack with natural heights across renderers', async ({ page }) => {
  const load = (path: string) => loadProductionModule(new URL(path, import.meta.url));
  const { availableBlockTransformsInDocument, transformBlock } = await load('../../app/studio/block-transforms.ts');
  const { BlockRenderer } = await load('../../app/components/content.tsx');
  const { BlockField } = await load('../../app/studio/studio-canvas.tsx');
  const { TemplateNodes } = await load('../../app/studio/template-renderer.tsx');
  const { createTemplateSet } = await load('../../app/studio/template-model.ts');
  const columns = { id: 'columns', type: 'columns', stackAt: 'tablet', children: [
    { id: 'first', type: 'column', width: 35, children: [{ id: 'first-text', type: 'paragraph', text: 'First' }] },
    { id: 'second', type: 'column', width: 320, widthUnit: 'px', children: [{ id: 'second-text', type: 'paragraph', text: 'Second' }] },
    { id: 'third', type: 'column', children: [{ id: 'third-text', type: 'paragraph', text: 'Third' }] },
  ] };
  const choice = availableBlockTransformsInDocument(columns, [columns]).find((item: { id: string }) => item.id === 'columns-to-row');
  const row = transformBlock(columns, choice, () => 'new-id');
  const ordinary = { ...row, id: 'ordinary', allowSizingOnChildren: true };
  const mobile = { ...row, id: 'mobile', stackAt: 'mobile' };
  const never = { ...row, id: 'never', stackAt: 'never' };
  const grid = { ...row, id: 'grid', layout: 'grid', gridMode: 'manual', columns: 3 };
  const custom = { ...row, id: 'custom', children: [{ id: 'custom-child', type: 'group', layout: 'stack', visualStyle: { additionalCss: 'flex-direction: column; flex-grow: 2;' }, children: [{ id: 'custom-text', type: 'paragraph', text: 'Custom' }] }] };
  const sized = { flexItemSizing: { mode: 'fixed', size: '320px' } };
  const special = { ...row, id: 'special', children: [
    { id: 'quote', type: 'quote', text: '', visualStyle: sized, children: [{ id: 'quote-text', type: 'paragraph', text: 'Quote' }] },
    { id: 'pullquote', type: 'pullquote', text: '', visualStyle: sized, children: [{ id: 'pullquote-text', type: 'paragraph', text: 'Pullquote' }] },
    { id: 'code', type: 'code', code: 'Example', visualStyle: sized },
  ] };
  const set = createTemplateSet('Responsive test');
  const document = { id: 'document', kind: 'page', title: 'Test', blocks: [] };
  const css = ['globals.css', 'studio/studio.css', 'studio/templates.css'].map(file => readFileSync(new URL(`../../app/${file}`, import.meta.url), 'utf8')).join('\n');
  const surface = (id: string, block: typeof row, mode: string) => createElement('section', { id, key: id }, mode === 'editor'
    ? createElement(BlockField, { block, rootBlocks: [block], writable: true, onChange() {} })
    : mode === 'template'
      ? createElement('div', { className: 'template-surface', style: { padding: 0 } }, createElement(TemplateNodes, { nodes: [block], set, document, renderOrdinary: (node: { text?: string }) => createElement('p', null, node.text) }))
      : createElement(BlockRenderer, { blocks: [block], variant: 'article' }));
  const markup = renderToStaticMarkup(createElement('main', null, ...['editor', 'public', 'template'].map(mode => surface(mode, row, mode)), surface('ordinary', ordinary, 'public'), surface('mobile', mobile, 'public'), surface('never', never, 'public'), surface('grid', grid, 'public'), surface('custom', custom, 'public'), surface('special', special, 'public')));
  for (const width of [1200, 800, 780, 620, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.setContent(`<style>${css}</style>${markup}`);
    for (const mode of ['editor', 'public', 'template', 'ordinary', 'mobile', 'never']) {
      const group = page.locator(`#${mode} .layout-row`).first();
      const fixed = group.locator(':scope > [style*="flex-basis:320px"]');
      const grow = group.locator(':scope > [style*="flex-grow:1"]');
      await expect(fixed, `${mode} has a fixed-width child`).toHaveCount(1);
      await expect(grow, `${mode} has a growing child`).toHaveCount(1);
      const stacked = mode === 'never' ? false : mode === 'mobile' ? width <= 620 : width <= 780;
      if (stacked) {
        await expect(group).toHaveCSS('flex-direction', 'column');
        await expect(fixed).toHaveCSS('flex-basis', 'auto');
        await expect(grow).toHaveCSS('flex-grow', '0');
        expect((await fixed.boundingBox())!.height).toBeLessThan(150);
      } else {
        await expect(group).toHaveCSS('flex-direction', 'row');
        await expect(fixed).toHaveCSS('flex-basis', '320px');
        await expect(grow).toHaveCSS('flex-grow', '1');
      }
    }
    await expect(page.locator('#grid .layout-grid').first()).toHaveCSS('display', 'grid');
    await expect(page.locator('#grid .layout-grid').first().locator(':scope > [style*="flex-basis:320px"]')).toHaveCSS('flex-basis', '320px');
    await expect(page.locator('#custom .layout-row').first().locator(':scope > [style*="flex-grow:2"]')).toHaveCSS('flex-grow', '2');
    const specialChildren = page.locator('#special .layout-row').first().locator(':scope > [data-row-child-sizing]');
    await expect(specialChildren).toHaveCount(3);
    for (const child of await specialChildren.all()) await expect(child).toHaveCSS('flex-basis', width <= 780 ? 'auto' : '320px');
  }
  await page.setViewportSize({ width: 1200, height: 1000 });
  await page.setContent(`<style>${css}</style>${markup}`);
  await page.locator('#template .template-surface').evaluate(element => { (element as HTMLElement).style.width = '500px'; });
  const narrowTemplate = page.locator('#template .layout-row').first();
  await expect(narrowTemplate).toHaveCSS('flex-direction', 'column');
  await expect(narrowTemplate.locator(':scope > [style*="flex-basis:320px"]')).toHaveCSS('flex-basis', 'auto');
});

test('Columns can be converted and edited in the local Block Library specimen', async ({ page }) => {
  await page.setViewportSize({ width: 1200, height: 900 });
  await page.goto('/studio/ui/blocks/columns');
  await expect(page.locator('.ui-block-specimen').first()).toHaveAttribute('data-ready', 'true');
  await page.getByRole('button', { name: 'Transform Columns block', exact: true }).first().click();
  await page.getByRole('menuitem', { name: 'Row', exact: true }).click();
  const row = page.locator('.ui-block-specimen .studio-nested-group.layout-row').first();
  await expect(row).toBeVisible();
  await expect(row.locator(':scope > [data-row-child-sizing]')).toHaveCount(2);
  const text = row.getByRole('textbox', { name: 'Paragraph text' }).first();
  await expect(text).toHaveText('Editable content in Column 1.');
  await text.fill('Edited after conversion');
  await expect(text).toHaveText('Edited after conversion');
  await page.getByRole('button', { name: 'Undo specimen change', exact: true }).click();
  await expect(text).toHaveText('Editable content in Column 1.');
  await page.setViewportSize({ width: 390, height: 900 });
  await expect(row).toHaveCSS('flex-direction', 'column');
  for (const child of await row.locator(':scope > [data-row-child-sizing]').all()) await expect(child).toHaveCSS('flex-basis', 'auto');
});
