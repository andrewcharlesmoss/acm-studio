import { expect, test } from '@playwright/test';

test('Edit Header opens the canonical shared template in the full Studio workspace after saving the home draft', async ({ page }) => {
  await page.goto('/studio/site-editor');
  const home = page.frameLocator('iframe[title="Test authored home page"]');
  await home.getByRole('button', { name: 'Edit Home Page' }).click();
  await home.getByRole('button', { name: 'Edit Header' }).click();

  await expect(page.locator('.template-workspace')).toBeVisible();
  await expect(page).toHaveURL(/\/studio\?site=test&mode=templates&scope=global&set=/);
  await expect(page.getByText('Global template — layout and style changes apply to every site.')).toBeVisible();
  await expect(page.getByText('Template node: Site Identity')).toBeVisible();
  await expect(page.getByText('Template node: Navigation')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Content', exact: true })).toBeVisible();
  await expect(page.locator('.site-editor-preview')).toHaveCount(0);
});
