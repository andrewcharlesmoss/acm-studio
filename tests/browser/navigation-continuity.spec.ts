import { expect, test } from '@playwright/test';

test('same-site editor switches retain navigation state and its populated list', async ({ page }) => {
  await page.goto('/studio?site=test&library=page');
  const sites = page.locator('.studio-local-sites');
  const sitesToggle = sites.getByRole('button', { name: 'Sites' });
  await expect(sitesToggle).toHaveAttribute('aria-expanded', 'true');
  await sitesToggle.click();
  await expect(sitesToggle).toHaveAttribute('aria-expanded', 'false');

  await page.getByRole('tab', { name: /Posts/ }).click();
  await expect(page.getByRole('tab', { name: /Posts/ })).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('.document-list .document-item').first()).toBeVisible();

  await page.getByRole('link', { name: 'Site Editor Preview site design' }).click();
  await expect(page).toHaveURL(/\/studio\/site-editor\?site=test/);
  await expect(page.locator('.studio-local-sites').getByRole('button', { name: 'Sites' })).toHaveAttribute('aria-expanded', 'false');
  await expect(page.getByRole('tab', { name: /Posts/ })).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('.site-editor-studio-document-list .document-item').first()).toBeVisible();
  await expect(page.getByText('Loading Test pages…')).toHaveCount(0);
  await expect(page.getByText('Loading Test posts…')).toHaveCount(0);

  const contentEditor = page.getByRole('link', { name: 'Content Editor Edit pages and posts' });
  await expect(contentEditor).toHaveAttribute('href', '/studio?site=test&library=post');
  await contentEditor.click();
  await expect(page).toHaveURL(/\/studio\?site=test&library=post/);
  await expect(page.locator('.studio-local-sites').getByRole('button', { name: 'Sites' })).toHaveAttribute('aria-expanded', 'false');
  await expect(page.getByRole('tab', { name: /Posts/ })).toHaveAttribute('aria-selected', 'true');
});
