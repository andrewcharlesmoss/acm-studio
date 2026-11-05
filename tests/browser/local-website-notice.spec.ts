import { expect, test } from '@playwright/test';

test('a dismissed local website notice does not reappear during a route switch', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('acm-studio-local-website-notice-dismissed-v1', 'true');
    const state = window as unknown as { __localWebsiteNoticeWasInserted: boolean };
    state.__localWebsiteNoticeWasInserted = false;
    new MutationObserver(records => {
      for (const record of records) {
        for (const node of record.addedNodes) {
          if (node instanceof Element && (node.matches('.studio-local-website-notice') || node.querySelector('.studio-local-website-notice'))) {
            state.__localWebsiteNoticeWasInserted = true;
          }
        }
      }
    }).observe(document, { childList: true, subtree: true });
  });

  await page.goto('/studio?site=test&library=page');
  await page.getByRole('link', { name: /Site Editor/ }).click();
  await expect(page).toHaveURL(/\/studio\/site-editor/);
  await expect(page.locator('.site-editor-app-header')).toBeVisible();
  await expect(page.locator('.studio-local-website-notice')).toHaveCount(0);
  expect(await page.evaluate(() => (window as unknown as { __localWebsiteNoticeWasInserted: boolean }).__localWebsiteNoticeWasInserted)).toBe(false);
});
