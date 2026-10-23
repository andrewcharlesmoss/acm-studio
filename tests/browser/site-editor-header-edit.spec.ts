import { expect, test } from '@playwright/test';

test('Edit Header opens the canonical shared template from the Test2 home editor', async ({ page }) => {
  await page.goto('/studio?site=test2&siteEditorHome=1');
  await page.getByRole('button', { name: 'Edit Header' }).click();

  await expect(page.locator('.template-workspace')).toBeVisible();
  await expect(page.getByText('Global template — layout and style changes apply to every site.')).toBeVisible();
  await expect(page.getByRole('group', { name: 'Template node: Site Identity' })).toBeVisible();
  await expect(page.getByRole('group', { name: 'Template node: Navigation' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Return to Site Editor Preview' })).toBeVisible();
});
