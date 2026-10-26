import { expect, test } from '@playwright/test';

test('shared saving recovery stays below the application header and wraps its actions without clipping', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 950 });
  await page.goto('/studio/ui/workspace#application-header');
  const example = page.locator('.ui-application-header-example');
  await expect(example).toHaveAttribute('data-ready', 'true');
  await example.getByLabel('Header example section').selectOption('siteEditor');
  await example.getByLabel('Header example scenario').selectOption('paused');
  const notice = example.getByRole('alert').filter({ hasText: 'Your draft remains in this tab.' });
  await expect(notice).toContainText('Your draft remains in this tab.');
  await expect(example.locator('.studio-app-header')).toContainText('Saving paused');
  for (const width of ['full', '390']) {
    await example.getByLabel('Header example width').selectOption(width);
    const bounds = await notice.evaluate(element => {
      const rect = element.getBoundingClientRect();
      const header = element.parentElement!.querySelector('.studio-app-header')!.getBoundingClientRect();
      return { left: rect.left, right: rect.right, top: rect.top, headerLeft: header.left, headerRight: header.right, headerBottom: header.bottom, overflow: element.scrollWidth > element.clientWidth };
    });
    expect(bounds.left).toBe(bounds.headerLeft);
    expect(bounds.right).toBe(bounds.headerRight);
    expect(bounds.top).toBeGreaterThanOrEqual(bounds.headerBottom);
    expect(bounds.overflow).toBe(false);
    await expect(notice.getByRole('button', { name: 'Export Draft' })).toBeVisible();
    await expect(notice.getByRole('button', { name: 'Reconnect', exact: true })).toBeVisible();
  }
  await notice.getByRole('button', { name: 'Export Draft' }).click();
  await expect(example.locator('p[role="status"]')).toContainText('Export Draft completed in this example only.');
  await notice.getByRole('button', { name: 'Reconnect', exact: true }).focus();
  await notice.getByRole('button', { name: 'Reconnect', exact: true }).press('Enter');
  await expect(notice).toHaveCount(0);
  await expect(example.locator('.studio-app-header')).toContainText('Saved locally');
});
