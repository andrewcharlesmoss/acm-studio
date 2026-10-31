import { expect, test } from '@playwright/test';

test('Site Editor Navigation and Pages catalogue show the same manual page order', async ({ page }) => {
  await page.goto('/studio/site-editor?site=test&documentId=test-site');
  const navigationRows = page.locator('.site-editor-studio-document-list [data-library-entry-id]');
  await expect(navigationRows.first()).toBeVisible();
  const navigationTitles = await navigationRows.locator('strong').allTextContents();

  const catalogueRows = page.locator('.site-pages-row-main strong');
  await expect(catalogueRows).toHaveCount(navigationTitles.length);
  await expect.poll(() => catalogueRows.allTextContents()).toEqual(navigationTitles);
});
