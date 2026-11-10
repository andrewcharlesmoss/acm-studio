import { expect, test } from '@playwright/test';

test('platform symbols switch the full keyboard by pointer and keyboard', async ({ page }) => {
  await page.goto('/studio/ui/icons?collection=keyboard');
  const group = page.getByRole('radiogroup', { name: 'Platform' });
  const mac = group.getByRole('radio', { name: 'Mac' });
  const windows = group.getByRole('radio', { name: 'Windows' });
  await expect(mac).toBeChecked();
  await expect(page.getByRole('img', { name: 'Illustrative full-size UK Mac keyboard' })).toBeVisible();
  await expect(async () => {
    await mac.click();
    await windows.click();
    await expect(page.getByRole('img', { name: 'Illustrative full-size UK Windows keyboard' })).toBeVisible({ timeout: 1000 });
  }).toPass({ timeout: 15000 });
  await expect(windows).toBeChecked();
  await windows.focus();
  await page.keyboard.press('ArrowLeft');
  await expect(mac).toBeChecked();
  await expect(page.getByRole('img', { name: 'Illustrative full-size UK Mac keyboard' })).toBeVisible();
});
