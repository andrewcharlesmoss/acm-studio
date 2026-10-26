import { expect, test } from '@playwright/test';

test('Reset styles is unavailable while website settings cannot load', async ({ page }) => {
  // Isolate this check from every local gateway so it cannot save website data.
  await page.route('**/__studio/**', route => route.abort());
  await page.goto('/studio/site-editor');
  await expect.poll(async () => {
    await page.locator('.site-editor-preview-scope select').selectOption('global');
    return page.getByRole('group', { name: 'Current design scope' }).innerText();
  }).toBe('Global Defaults');
  await page.getByRole('button', { name: 'Styles Browse Styles' }).click();
  await page.getByRole('button', { name: 'More Styles actions' }).click();
  await expect(page.getByRole('menuitem', { name: 'Reset styles' })).toBeDisabled();
});
