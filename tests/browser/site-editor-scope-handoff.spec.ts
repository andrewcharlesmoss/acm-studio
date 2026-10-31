import { expect, test } from '@playwright/test';

test('site selection follows navigation into and out of Site Editor', async ({ page }) => {
  await page.goto('/studio?site=test2&library=page');
  const siteEditor = page.getByRole('link', { name: 'Site Editor Preview site design' });
  await expect(siteEditor).toHaveAttribute('href', '/studio/site-editor?site=test2');
  await siteEditor.click();
  await expect(page).toHaveURL(/\/studio\/site-editor\?site=test2$/);
  await expect(page.getByLabel('Current design scope')).toHaveText('Test 2');
  await expect(page.getByLabel('Design Scope')).toHaveValue('test2');
  const headerBack = page.locator('.site-editor-app-header').getByRole('link', { name: 'Back to Studio' });
  const paneBack = page.locator('.site-editor-design-heading').getByRole('link', { name: 'Back to Studio' });
  await expect(headerBack).toHaveAttribute('href', '/studio?site=test2&library=page');
  await expect(paneBack).toHaveAttribute('href', '/studio?site=test2&library=page');
  await page.getByLabel('Design Scope').selectOption('test');
  await expect(page.getByLabel('Current design scope')).toHaveText('Test');
  await expect(page).toHaveURL(/\/studio\/site-editor\?site=test$/);
  await expect(headerBack).toHaveAttribute('href', '/studio?site=test&library=page');
  await expect(paneBack).toHaveAttribute('href', '/studio?site=test&library=page');
  await headerBack.click();
  await expect(page).toHaveURL(/\/studio\?site=test&library=page$/);
});

test('direct Site Editor addresses validate and retain their scope', async ({ page }) => {
  for (const [query, expected] of [['', 'test'], ['?site=unknown', 'test'], ['?site=global', 'global'], ['?site=test2', 'test2']]) {
    await page.goto(`/studio/site-editor${query}`);
    await expect(page.getByLabel('Design Scope')).toHaveValue(expected);
    await page.reload();
    await expect(page.getByLabel('Design Scope')).toHaveValue(expected);
  }
});
