import { expect, test } from '@playwright/test';

async function selectParentList(page: import('@playwright/test').Page, item: import('@playwright/test').Locator) {
  await item.click();
  const parent = page.getByRole('button', { name: 'Select parent block: List', exact: true });
  await expect(parent).toBeVisible();
  await parent.click();
  await expect(page.getByRole('button', { name: 'Transform List block', exact: true })).toBeVisible();
}

for (const host of ['library', 'content', 'template']) {
  test(`Parent List expands into sibling Paragraphs with actual ${host} history`, async ({ page }) => {
    await page.goto(host === 'library' ? '/studio/ui/blocks/list' : host === 'content' ? '/studio/ui/selection' : '/studio/ui/selection/template');
    const list = host === 'library' ? page.locator('.ui-library-canvas .list-item-editor').filter({ hasText: 'Plain first item' })
      : page.locator(`.list-item-editor[data-studio-block-id="${host === 'content' ? 'list-text-example' : 'template-list'}"]`).first();
    await expect(list).toContainText(host === 'library' ? 'Plain first item' : host === 'content' ? 'First item' : 'Template first item');
    const text = await list.innerText();
    await selectParentList(page, list);
    await page.getByRole('button', { name: 'Transform List block', exact: true }).click();
    await page.getByRole('menuitem', { name: 'Paragraph', exact: true }).click();
    await expect(page.locator('.paragraph-field').filter({ hasText: text }).first()).toBeVisible();
    await page.getByRole('button', { name: 'More block options' }).focus();
    await page.keyboard.press('Meta+z');
    await expect(list).toHaveText(text);
    await page.keyboard.press('Meta+Shift+z');
    await expect(page.locator('.paragraph-field').filter({ hasText: text }).first()).toBeVisible();
  });
}

for (const width of [1440, 820, 390]) {
  test(`List parent toolbar is reachable at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/studio/ui/blocks/list');
    await expect(page.locator('.ui-block-specimen')).toHaveAttribute('data-ready', 'true');
    await selectParentList(page, page.locator('.ui-library-canvas .list-item-editor').first());
    for (const name of ['Transform List block', 'More block options']) {
      const button = page.getByRole('button', { name, exact: true });
      await button.click(); await page.keyboard.press('Escape'); await expect(button).toBeFocused();
    }
    const canvas = await page.locator('.ui-block-canvas').boundingBox();
    const toolbar = await page.getByRole('group', { name: 'List block tools' }).boundingBox();
    expect(toolbar!.x).toBeGreaterThanOrEqual(canvas!.x);
    expect(toolbar!.x + toolbar!.width).toBeLessThanOrEqual(canvas!.x + canvas!.width);
    await page.screenshot({ path: `/private/tmp/acm-list-${width}.png` });
  });
}

test('List Styles typography reaches painted item text and markers', async ({ page }) => {
  await page.goto('/studio/ui/controls/block-style-panels');
  await page.getByRole('group', { name: 'Block Styles panes example' }).getByRole('button', { name: 'List', exact: true }).click();
  const initialText = page.getByLabel('List style preview', { exact: true }).locator('.list-item-text').first();
  const baseline = await initialText.evaluate(node => ({ size: getComputedStyle(node).fontSize, height: getComputedStyle(node).lineHeight, transform: getComputedStyle(node).textTransform }));
  await page.getByRole('group', { name: 'Block Styles panes example' }).getByRole('button', { name: 'Small', exact: true }).click();
  await page.getByRole('group', { name: 'Block Styles panes example' }).getByRole('spinbutton', { name: 'Line height', exact: true }).fill('1.8');
  await page.getByRole('group', { name: 'Block Styles panes example' }).getByRole('radio', { name: 'Upper case', exact: true }).click();
  const preview = page.getByLabel('List style preview', { exact: true });
  for (const selector of ['.list-item-text', '.list-field-marker']) {
    const painted = preview.locator(selector).first();
    await expect(painted).toHaveCSS('font-size', '14px');
    await expect(painted).toHaveCSS('line-height', '25.2px');
    await expect(painted).toHaveCSS('text-transform', 'uppercase');
  }
  const controls = page.getByRole('group', { name: 'Block Styles panes example' });
  await controls.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(preview.locator('.list-item-text').first()).not.toHaveCSS('text-transform', 'uppercase');
  await controls.getByRole('button', { name: 'Redo', exact: true }).click();
  await expect(preview.locator('.list-item-text').first()).toHaveCSS('text-transform', 'uppercase');
  await controls.getByRole('button', { name: 'States', exact: true }).click();
  await page.getByRole('menuitemradio', { name: 'Mobile', exact: true }).click();
  await controls.getByRole('button', { name: 'Large', exact: true }).click();
  const mobileSize = await preview.locator('.list-item-text').first().evaluate(node => getComputedStyle(node).fontSize);
  expect(mobileSize).not.toBe('14px');
  await controls.getByRole('button', { name: 'States', exact: true }).click();
  await page.getByRole('menuitemradio', { name: 'Default', exact: true }).click();
  await expect(preview.locator('.list-item-text').first()).toHaveCSS('font-size', '14px');
  await controls.getByRole('button', { name: 'States', exact: true }).click();
  await page.getByRole('menuitemradio', { name: 'Mobile', exact: true }).click();
  await expect(preview.locator('.list-item-text').first()).toHaveCSS('font-size', mobileSize);
  await preview.scrollIntoViewIfNeeded();
  await preview.screenshot({ path: '/private/tmp/acm-list-styles-painted.png' });
  await controls.getByRole('button', { name: 'Reset example', exact: true }).click();
  await controls.getByRole('button', { name: 'List', exact: true }).click();
  await expect(preview.locator('.list-item-text').first()).toHaveCSS('font-size', baseline.size);
  await expect(preview.locator('.list-item-text').first()).toHaveCSS('line-height', baseline.height);
  await expect(preview.locator('.list-item-text').first()).toHaveCSS('text-transform', baseline.transform);
  await controls.getByRole('button', { name: 'States', exact: true }).click();
  await page.getByRole('menuitemradio', { name: 'Mobile', exact: true }).click();
  await expect(preview.locator('.list-item-text').first()).toHaveCSS('font-size', baseline.size);
});

for (const target of ['Group', 'Columns']) {
  test(`List ${target} wrapper retains nested content and keyboard history`, async ({ page }) => {
    await page.goto('/studio/ui/blocks/list');
    await expect(page.locator('.ui-block-specimen')).toHaveAttribute('data-ready', 'true');
    const item = page.locator('.ui-library-canvas .list-item-editor').filter({ hasText: 'A first item' });
    await selectParentList(page, item);
    await page.getByRole('button', { name: 'Transform List block', exact: true }).click();
    await page.getByRole('menuitem', { name: target, exact: true }).click();
    await expect(item).toHaveText('A first item');
    await page.getByRole('button', { name: 'More block options' }).focus();
    await page.keyboard.press('Meta+z');
    await expect(page.getByRole('button', { name: 'Transform List block', exact: true })).toBeVisible();
    await page.keyboard.press('Meta+Shift+z');
    await expect(item).toHaveText('A first item');
    await page.getByRole('button', { name: 'Preview', exact: true }).click();
    await expect(page.locator('.ui-block-canvas .list-item-text').filter({ hasText: 'A nested item' })).toBeVisible();
  });
}

test('Canonical List surfaces preserve authored item and nested typography at device widths', async ({ page }) => {
  const { loadProductionModule } = await import('../production-module.mjs');
  const { createElement } = await import('react');
  const { renderToStaticMarkup } = await import('react-dom/server');
  const { readFileSync } = await import('node:fs');
  const { BlockRenderer } = await loadProductionModule(new URL('../../app/components/content.tsx', import.meta.url));
  const { BlockPreviewRules } = await loadProductionModule(new URL('../../app/studio/site-editor/block-preview-rules.tsx', import.meta.url));
  const { projectWebsiteDesignBlocks } = await loadProductionModule(new URL('../../app/studio/site-editor/website-design-surface.tsx', import.meta.url));
  const selection = { paletteId: 'default', typographyId: 'default', blockStyles: { list: { fontSizeCustom: '14px', lineHeight: '1.8', textTransform: 'uppercase' } } };
  const blocks = [{ id: 'list', type: 'list', style: 'unordered', items: ['Default text', { text: 'Authored item', style: { fontSizeCustom: '30px', lineHeight: '2', textTransform: 'lowercase' }, children: [{ id: 'nested', type: 'list', style: 'unordered', visualStyle: { fontSizeCustom: '24px', textColor: '#123456' }, items: ['Nested text'] }] }] }];
  const html = renderToStaticMarkup(createElement('div', { 'data-block-preview-scope': 'authored-list', className: 'site-style-book', style: { containerType: 'inline-size', containerName: 'studio-document' } },
    createElement(BlockPreviewRules, { selection, scopeId: 'authored-list', referenceDefaults: false }),
    createElement(BlockRenderer, { blocks: projectWebsiteDesignBlocks(blocks, selection), variant: 'studio' })));
  const css = readFileSync(new URL('../../app/studio/site-editor/style-book.css', import.meta.url), 'utf8');
  for (const width of [1000, 600, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.setContent(`<style>${css}</style>${html}`);
    await expect(page.locator('.list-item-text').filter({ hasText: 'Default text' })).toHaveCSS('font-size', '14px');
    const item = page.locator('.list-item-text').filter({ hasText: 'Authored item' });
    await expect(item).toHaveCSS('font-size', '30px');
    await expect(item).toHaveCSS('line-height', '60px');
    await expect(item).toHaveCSS('text-transform', 'lowercase');
    const nested = page.locator('.list-item-text').filter({ hasText: 'Nested text' });
    await expect(nested).toHaveCSS('font-size', '24px');
    await expect(nested).toHaveCSS('color', 'rgb(18, 52, 86)');
  }
});

test('Actual List editor and Preview preserve authored nested font size', async ({ page }) => {
  await page.goto('/studio/ui/blocks/list');
  await expect(page.locator('.ui-block-specimen')).toHaveAttribute('data-ready', 'true');
  const nested = page.locator('.list-item-editor[data-list-context-id="list-library-specimen-nested"]').first();
  await nested.click();
  await page.getByRole('button', { name: 'Select parent block: List', exact: true }).click();
  await page.getByRole('tablist', { name: 'List inspector', exact: true }).getByRole('tab', { name: 'Styles', exact: true }).click();
  await page.getByRole('button', { name: 'Use custom font size', exact: true }).click();
  await page.getByRole('spinbutton', { name: 'Custom font size', exact: true }).fill('24');
  await page.getByRole('spinbutton', { name: 'Custom font size', exact: true }).press('Enter');
  await expect(nested).toHaveCSS('font-size', '24px');
  await page.getByRole('button', { name: 'Preview', exact: true }).click();
  await expect(page.locator('.list-item-text').filter({ hasText: 'A nested item' })).toHaveCSS('font-size', '24px');
});

test('List toolbar remains reachable at 200% document scaling', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/studio/ui/blocks/list');
  await expect(page.locator('.ui-block-specimen')).toHaveAttribute('data-ready', 'true');
  await page.addStyleTag({ content: 'html { zoom: 2 !important; }' });
  await selectParentList(page, page.locator('.ui-library-canvas .list-item-editor').first());
  const trigger = page.getByRole('button', { name: 'Transform List block', exact: true });
  await trigger.click();
  await expect(page.getByRole('menuitem', { name: 'Group', exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(trigger).toBeFocused();
});
