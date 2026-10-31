import { expect, test } from '@playwright/test';

test('site editor canvas uses the selected viewport width in Edit and Preview', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/studio?site=test2&library=page');
  const canvas = page.locator('.test-site-editor-surface article.studio-responsive-container');
  await expect(canvas).toBeVisible();

  for (const mode of ['Edit', 'Preview']) {
    await page.getByRole('checkbox', { name: mode, exact: true }).click();
    for (const [label, width] of [['Desktop', 1200], ['Tablet', 768], ['Mobile', 390]] as const) {
      await page.getByRole('button', { name: 'View', exact: true }).click();
      await page.getByRole('menuitemradio', { name: new RegExp(`^${label}`) }).click();
      await expect.poll(async () => (await canvas.boundingBox())?.width).toBe(width);
    }
  }
});
