import { expect, test } from '@playwright/test';

test('Pages Library example exercises shared layouts and memory-only page actions, then resets', async ({ page }) => {
  await page.goto('/studio/ui/controls#site-pages-catalogue');
  await expect(page.getByRole('heading', { name: 'Pages catalogue' })).toBeVisible();
  const example = page.locator('.ui-pages-catalogue-specimen');
  await expect(example).toBeVisible();

  await expect(example.getByRole('button', { name: 'All Pages' })).toBeVisible();
  await example.getByRole('button', { name: 'Grid', exact: true }).click();
  await expect(example.getByRole('button', { name: 'Grid', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await example.getByRole('button', { name: 'Table', exact: true }).click();
  await expect(example.locator('.site-pages-table')).toBeVisible();
  await example.getByRole('button', { name: 'List', exact: true }).click();

  await example.getByRole('button', { name: 'Add Page', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Add Page' });
  await dialog.getByLabel('Page title').fill('Added from the library example');
  await dialog.getByRole('button', { name: 'Add Page', exact: true }).click();
  await expect(example.getByRole('status').filter({ hasText: 'Temporary page added to the example.' })).toBeVisible();

  await example.getByRole('searchbox', { name: 'Search pages' }).fill('Added from the library example');
  const actions = example.getByRole('button', { name: 'Actions for Added from the library example' });
  await actions.click();
  const menu = page.getByRole('menu', { name: 'Actions for Added from the library example' });
  await menu.getByRole('menuitem', { name: 'Order' }).click();
  const orderDialog = page.getByRole('dialog', { name: 'Order page' });
  await orderDialog.getByLabel('Order').fill('-3');
  await orderDialog.getByRole('button', { name: 'Save', exact: true }).click();

  await actions.click();
  await page.getByRole('menu', { name: 'Actions for Added from the library example' }).getByRole('menuitem', { name: 'Move to Bin' }).click();
  await expect(example.getByText('No pages match these filters.')).toBeVisible();
  await example.getByRole('button', { name: 'Bin', exact: true }).click();
  await example.getByRole('button', { name: 'Actions for Added from the library example' }).click();
  await page.getByRole('menu', { name: 'Actions for Added from the library example' }).getByRole('menuitem', { name: 'Restore' }).click();
  await expect(example.getByText('The Bin is empty.')).toBeVisible();

  await page.getByRole('button', { name: 'Reset example', exact: true }).click();
  await expect(example.getByRole('button', { name: 'Actions for Added from the library example' })).toHaveCount(0);
  await example.getByRole('checkbox', { name: 'Read-only example' }).check();
  await expect(example.getByRole('button', { name: 'Add Page', exact: true })).toBeDisabled();
});

test('Pages catalogue only shows pagination when results span multiple pages', async ({ page }) => {
  await page.goto('/studio/ui/controls#site-pages-catalogue');
  const example = page.locator('.ui-pages-catalogue-specimen');
  await expect(example).toBeVisible();
  const pagination = example.locator('.site-pages-pagination');
  await expect(pagination).toBeVisible();

  await example.getByRole('button', { name: 'View options' }).click();
  const viewOptions = page.getByRole('menu', { name: 'Pages view options' });
  const pageSize = viewOptions.getByRole('radiogroup', { name: 'Items per page' });
  await pageSize.getByRole('radio', { name: '50' }).check();
  await expect(pagination).toHaveCount(0);

  await pageSize.getByRole('radio', { name: '20' }).check();
  await expect(pagination).toBeVisible();
});

test('Pages view options use the Appearance layout and reset the shared controls', async ({ page }) => {
  await page.goto('/studio/ui/controls#site-pages-catalogue');
  const example = page.locator('.ui-pages-catalogue-specimen');
  await expect(example).toBeVisible();
  await example.getByRole('button', { name: 'View options' }).click();
  const menu = page.getByRole('menu', { name: 'Pages view options' });

  await expect(menu.getByRole('heading', { name: 'Appearance' })).toBeVisible();
  await expect(menu.getByRole('button', { name: 'Reset view' })).toBeVisible();
  const order = menu.getByRole('radiogroup', { name: 'Order' });
  const density = menu.getByRole('radiogroup', { name: 'Density' });
  const pageSize = menu.getByRole('radiogroup', { name: 'Items per page' });
  await order.getByRole('radio', { name: 'Ascending' }).check();
  await density.getByRole('radio', { name: 'Compact' }).check();
  await pageSize.getByRole('radio', { name: '50' }).check();
  await expect(menu.getByRole('checkbox', { name: 'Title' })).toBeDisabled();
  const featuredImage = menu.getByRole('checkbox', { name: 'Featured Image' });
  await expect(featuredImage).toBeChecked();
  await featuredImage.uncheck();
  await expect(featuredImage).not.toBeChecked();
  await featuredImage.check();

  await menu.getByRole('button', { name: 'Move Status up' }).click();
  await expect(menu.locator('.site-pages-properties .site-pages-property-option .site-pages-property-toggle')).toHaveText([
    'Title', 'Status', 'Author', 'Date', 'Slug', 'Parent', 'Template', 'Featured Image',
  ]);

  await menu.getByRole('button', { name: 'Reset view' }).click();
  await expect(order.getByRole('radio', { name: 'Ascending' })).toBeChecked();
  await expect(density.getByRole('radio', { name: 'Balanced' })).toBeChecked();
  await expect(pageSize.getByRole('radio', { name: '20' })).toBeChecked();
  await expect(menu.getByRole('checkbox', { name: 'Featured Image' })).toBeChecked();
  await expect(menu.locator('.site-pages-properties .site-pages-property-option .site-pages-property-toggle')).toHaveText([
    'Title', 'Featured Image', 'Author', 'Status', 'Date', 'Slug', 'Parent', 'Template',
  ]);
});

test('Pages Appearance segmented labels remain readable in a narrow viewport', async ({ page }) => {
  await page.setViewportSize({ width: 280, height: 800 });
  await page.goto('/studio/ui/controls#site-pages-catalogue');
  const example = page.locator('.ui-pages-catalogue-specimen');
  await expect(example).toBeVisible();
  await example.getByRole('button', { name: 'View options' }).click();
  const menu = page.getByRole('menu', { name: 'Pages view options' });
  await expect(menu.getByRole('heading', { name: 'Appearance' })).toBeVisible();

  for (const groupName of ['Order', 'Density', 'Items per page']) {
    const group = menu.getByRole('radiogroup', { name: groupName });
    await expect(group).toBeVisible();
    const segments = group.locator('label.studio-choice-control');
    for (let index = 0; index < await segments.count(); index += 1) {
      await expect(segments.nth(index)).toBeVisible();
      const label = segments.nth(index).locator('span');
      const dimensions = await label.evaluate(element => ({ client: element.clientWidth, scroll: element.scrollWidth }));
      expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.client + 1);
    }
  }
});
