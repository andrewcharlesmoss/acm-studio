import { expect, test } from '@playwright/test';

for (const width of [1440, 820, 390]) test(`Library describes Image crop availability at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 });
  await page.goto('/studio/ui/blocks/image');
  const inventory = page.locator('#control-inventory');
  await inventory.locator('summary').click();
  const row = inventory.locator('li').filter({ hasText: 'Crop bounds and aspect ratio' });
  await expect(row).toContainText('Toolbar editor with zoom, rotation, straightening and flips.');
  await expect(row).toContainText('Conditional');
  await expect(row).toContainText('When the image source resolves.');
  expect((await row.innerText()).split('When the image source resolves.')).toHaveLength(2);
});
