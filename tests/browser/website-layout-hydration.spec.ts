import { test, expect } from '@playwright/test';

test('Styles hydrates and the temporary layout editor remains usable', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto('/studio/ui/styles');
  await expect(page.getByRole('group', { name: 'Website block editor preview', includeHidden: true })).toBeAttached({ timeout: 30000 });
  await page.getByRole('button', { name: 'Layout Preview' }).click();
  await expect(page.getByRole('group', { name: 'Website block editor preview' })).toBeVisible();
  await page.getByRole('button', { name: 'Reset Preview' }).click();
  await expect(page.getByRole('group', { name: 'Website block editor preview' })).toBeVisible();
  expect(errors.filter(error => /hydrat/i.test(error))).toEqual([]);
});
