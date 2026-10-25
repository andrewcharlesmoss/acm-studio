import { expect, test } from '@playwright/test';

test('hosted loading spinner has no iframe or document backdrop', async ({ page }) => {
  // Hold fixture connections without opening a gateway session or writing site content.
  await page.route('**/__studio/test-site', async () => { await new Promise<void>(() => {}); });
  await page.goto('/studio/site-editor');
  const frameElement = page.locator('.site-editor-home-host iframe');
  // Mount the real hosted entry without needing saved page selection.
  await page.locator('body').evaluate(body => {
    const book = document.createElement('section'); book.className = 'site-editor-preview-book';
    const host = document.createElement('div'); host.className = 'site-editor-home-host';
    const frame = document.createElement('iframe'); frame.title = 'Temporary loading preview';
    frame.src = '/studio?site=test&siteEditorHome=1'; host.append(frame); book.append(host); body.prepend(book);
  });
  const frame = page.frameLocator('iframe[title="Temporary loading preview"]');
  await expect(frame.locator('.studio-hosted-home-state.is-loading')).toBeVisible();
  await expect(frame.locator('.studio-hosted-home-spinner')).toBeVisible();
  await expect(frame.locator('html')).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
  await expect(frame.locator('body')).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
  await expect(frame.locator('body')).toHaveCSS('background-image', 'none');
  await expect(frameElement).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
  await page.screenshot({ path: '/tmp/studio-loading-transparent.png' });
});
