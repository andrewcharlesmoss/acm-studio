import { expect, test } from '@playwright/test';

test('Navigation switches at Gutenberg’s small-screen breakpoint in the available header width', async ({ page }) => {
  await page.goto('/studio?site=test&library=page');

  const header = page.locator('.test-document-navigation .template-header').first();
  const navigation = header.locator('.template-navigation[data-navigation-overlay="mobile"]');
  await expect(header).toBeVisible();
  await expect(navigation).toHaveAttribute('data-navigation-collapsed', 'false');

  const widths = await page.locator('.test-document-navigation').first().evaluate(element => ({
    navigation: element.getBoundingClientRect().width,
    article: element.closest('.studio-responsive-container')?.querySelector('.test-site-page')?.getBoundingClientRect().width ?? 0,
  }));
  expect(widths.navigation).toBeGreaterThan(widths.article);

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(navigation).toHaveAttribute('data-navigation-collapsed', 'true');

  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(navigation).toHaveAttribute('data-navigation-collapsed', 'false');
});
