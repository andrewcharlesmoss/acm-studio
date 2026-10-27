import { expect, test } from '@playwright/test';

for (const host of ['library', 'content', 'template']) test(`Button child and parent controls preserve ${host} ownership and history`, async ({ page }) => {
  await page.goto(host === 'library' ? '/studio/ui/blocks/button' : host === 'content' ? '/studio/ui/selection' : '/studio/ui/selection/template');
  if (host === 'library') await expect(page.locator('.ui-block-specimen')).toHaveAttribute('data-ready', 'true');
  const id = host === 'library' ? 'specimen-button' : host === 'content' ? 'button-two' : 'template-button-one';
  const owner = page.locator(`[data-studio-nested-block-id="${id}"]`);
  // Library catalogue IDs are stable but include the canonical type prefix.
  const selected = host === 'library' ? page.locator('.ui-block-canvas .content-button-item').first() : owner;
  await selected.locator('.content-button').click();
  const toolbar = selected.getByRole('group', { name: 'Button block tools', exact: true });
  const surface = selected.locator('.content-button');
  const initialStyle = await surface.getAttribute('class');
  const transform = toolbar.getByRole('button', { name: 'Transform Button block', exact: true });
  if (host === 'library') {
    await transform.click(); await page.getByRole('menuitemradio', { name: 'Fill', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Undo specimen change' })).toBeDisabled();
    await toolbar.getByRole('button', { name: 'Justification', exact: true }).click();
    await page.getByRole('menuitemradio', { name: 'Justify items left', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Undo specimen change' })).toBeDisabled();
  }
  const label = await surface.innerText();
  await transform.click(); await page.getByRole('menuitemradio', { name: initialStyle!.includes('is-primary') ? 'Outline' : 'Fill', exact: true }).click();
  await expect(surface).toHaveClass(initialStyle!.includes('is-primary') ? /is-secondary/ : /is-primary/);
  await expect(transform).toBeFocused();
  await page.keyboard.press('Meta+z'); await expect(surface).toHaveAttribute('class', initialStyle!);
  await page.keyboard.press('Meta+Shift+z');
  const textAlignment = toolbar.getByRole('button', { name: 'Text alignment', exact: true });
  await textAlignment.click(); await page.getByRole('menuitemradio', { name: 'Align text right', exact: true }).click();
  await expect(surface).toHaveCSS('text-align', 'right');
  const parent = selected.locator('xpath=..');
  await toolbar.getByRole('button', { name: 'Justification', exact: true }).click();
  await page.getByRole('menuitemradio', { name: 'Justify items center', exact: true }).click();
  await expect(parent).toHaveCSS('justify-content', 'center');
  const vertical = toolbar.getByRole('button', { name: 'Vertical alignment', exact: true });
  await vertical.click(); await page.keyboard.press('Escape'); await expect(vertical).toBeFocused();
  await vertical.click(); await page.getByRole('menuitemradio', { name: 'Align bottom', exact: true }).click();
  await expect(parent).toHaveCSS('align-items', 'flex-end');
  await expect(surface).toHaveCSS('text-align', 'right');
  await expect(surface).toHaveText(label);
  await page.keyboard.press('Meta+z'); await expect(parent).toHaveCSS('align-items', 'center');
  await page.keyboard.press('Meta+Shift+z'); await expect(parent).toHaveCSS('align-items', 'flex-end');
  if (host === 'library') {
    await vertical.click(); await page.getByRole('menuitemradio', { name: 'Stretch to fill', exact: true }).click();
    const heights = await parent.locator('.content-button').evaluateAll(elements => elements.map(element => element.getBoundingClientRect().height));
    expect(Math.abs(heights[0] - heights[1])).toBeLessThan(1);
    await page.getByRole('group', { name: 'Specimen view' }).getByRole('button', { name: 'Preview', exact: true }).click();
    await expect(page.locator('.ui-block-canvas .content-buttons').first()).toHaveCSS('align-items', 'stretch');
    const previewHeights = await page.locator('.ui-block-canvas .content-buttons').first().locator('.content-button').evaluateAll(elements => elements.map(element => element.getBoundingClientRect().height));
    expect(Math.abs(previewHeights[0] - previewHeights[1])).toBeLessThan(1);
  }
  await page.screenshot({ path: `/private/tmp/acm-button-toolbar-${host}.png` });
});

for (const width of [1440, 820, 390]) test(`Button menus remain keyboard reachable at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 1000 });
  await page.goto('/studio/ui/blocks/button');
  await expect(page.locator('.ui-block-specimen')).toHaveAttribute('data-ready', 'true');
  const toolbar = page.getByRole('group', { name: 'Button block tools', exact: true });
  for (const name of ['Transform Button block','Text alignment','Justification','Vertical alignment','More block options']) {
    const trigger = toolbar.getByRole('button', { name, exact: true });
    await trigger.focus(); await page.keyboard.press('Enter'); await page.keyboard.press('Escape'); await expect(trigger).toBeFocused();
  }
  const canvas = await page.locator('.ui-block-canvas').boundingBox(); const box = await toolbar.boundingBox();
  expect(box!.x).toBeGreaterThanOrEqual(canvas!.x - 1); expect(box!.x + box!.width).toBeLessThanOrEqual(canvas!.x + canvas!.width + 1);
  await page.getByRole('checkbox', { name: 'Read-only example' }).check();
  for (const name of ['Text alignment','Justification','Vertical alignment']) await expect(toolbar.getByRole('button', { name, exact: true })).toBeDisabled();
});

test('legacy vertical Buttons retain their vertical axis through inspector and child toolbar horizontal edits', async ({ page }) => {
  await page.goto('/studio/ui/blocks/button');
  await expect(page.locator('.ui-block-specimen')).toHaveAttribute('data-ready', 'true');
  const selection = page.locator('.ui-specimen-selection');
  await selection.getByRole('button', { name: /^Buttons/ }).click();
  const inspector = page.locator('.ui-block-inspector');
  await inspector.getByRole('combobox', { name: 'Justification', exact: true }).selectOption('centre');
  await inspector.getByRole('combobox', { name: 'Orientation', exact: true }).selectOption('vertical');
  const group = page.locator('.ui-block-canvas .content-buttons').first();
  await expect(group).toHaveCSS('justify-content', 'center');
  await inspector.getByRole('combobox', { name: 'Justification', exact: true }).selectOption('right');
  await expect(group).toHaveCSS('align-items', 'flex-end');
  await expect(group).toHaveCSS('justify-content', 'center');
  await page.getByRole('button', { name: 'Undo specimen change' }).click();
  await expect(group).toHaveCSS('align-items', 'center');
  await selection.getByRole('button', { name: /^Read the guide/ }).click();
  const toolbar = page.getByRole('group', { name: 'Button block tools', exact: true });
  await toolbar.getByRole('button', { name: 'Horizontal alignment', exact: true }).click();
  await page.getByRole('menuitemradio', { name: 'Justify items right', exact: true }).click();
  await expect(group).toHaveCSS('align-items', 'flex-end');
  await expect(group).toHaveCSS('justify-content', 'center');
  await page.keyboard.press('Meta+z');
  await expect(group).toHaveCSS('align-items', 'center');
  await expect(group).toHaveCSS('justify-content', 'center');
  await page.keyboard.press('Meta+Shift+z');
  await expect(group).toHaveCSS('align-items', 'flex-end');
  await expect(group).toHaveCSS('justify-content', 'center');
});
