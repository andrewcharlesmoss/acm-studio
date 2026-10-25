import { expect, test, type Locator } from '@playwright/test';

for (const layout of ['list', 'table', 'grid'] as const) {
  test(`Pages ${layout} opens from row padding, metadata and image while keeping secondary controls independent`, async ({ page }) => {
    await page.goto('/studio/ui/controls#site-pages-catalogue');
    const entry = page.locator('#site-pages-catalogue');
    const example = entry.locator('.ui-pages-catalogue-specimen');
    const preview = example.locator('.ui-pages-catalogue-specimen-preview h2');
    if (layout !== 'list') {
      await example.getByRole('button', { name: 'Change layout, list' }).click();
      await page.getByRole('menuitemradio', { name: layout === 'table' ? 'Table' : 'Grid', exact: true }).click();
    }
    const title = example.getByRole('button', { name: /^(?:No featured image )?Example page 02$/ });
    const otherTitle = example.getByRole('button', { name: /^(?:No featured image )?Example page 03$/ });
    const rows = example.locator(layout === 'table' ? '.site-pages-table tbody > tr' : layout === 'grid' ? '.site-pages-grid > article' : '.site-pages-list > article');
    const row = rows.filter({ has: page.getByRole('button', { name: /^(?:No featured image )?Example page 02$/ }) });
    async function pointerClick(target: Locator, padding = false) {
      await target.scrollIntoViewIfNeeded();
      const box = await target.boundingBox();
      if (!box) throw new Error('The page row is unavailable.');
      await page.mouse.click(box.x + box.width / 2, box.y + (padding ? box.height - 3 : box.height / 2));
    }

    await pointerClick(layout === 'table' ? row.locator('td').nth(1) : row, true);
    await expect(preview).toHaveText('Example page 02');
    await otherTitle.click();
    const metadata = layout === 'table' ? row.locator('td').nth(3) : layout === 'grid' ? row.locator(':scope > span').first() : row.locator('.site-pages-meta');
    await pointerClick(metadata);
    await expect(preview).toHaveText('Example page 02');
    await otherTitle.click();
    await pointerClick(row.locator('.site-pages-thumbnail'));
    await expect(preview).toHaveText('Example page 02');

    await otherTitle.click();
    await row.hover();
    await row.getByRole('checkbox', { name: 'Select Example page 02', exact: true }).check();
    await expect(preview).toHaveText('Example page 03');
    const actions = row.getByRole('button', { name: 'Actions for Example page 02', exact: true });
    await actions.click();
    await expect(page.getByRole('menu', { name: 'Actions for Example page 02' })).toBeVisible();
    await expect(preview).toHaveText('Example page 03');
    await page.keyboard.press('Escape');
    await expect(actions).toBeFocused();
    await title.focus();
    await page.keyboard.press('Enter');
    await expect(preview).toHaveText('Example page 02');
    await otherTitle.click();
    await title.focus();
    await page.keyboard.press('Space');
    await expect(preview).toHaveText('Example page 02');
    await entry.getByRole('button', { name: 'Reset example', exact: true }).click();
    await expect(preview).toHaveText('Home');
  });
}
