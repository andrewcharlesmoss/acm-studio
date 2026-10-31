import { expect, test } from '@playwright/test';

test('icon filters stay available while browsing and social brand colours keep a default option', async ({ page }) => {
  await page.setViewportSize({ width: 1180, height: 820 });
  await page.goto('/studio/ui/icons');

  const filters = page.getByRole('complementary', { name: 'Icon Filters' });
  const appearance = filters.getByLabel('Social icon appearance');
  await expect(appearance).toHaveValue('default');
  await expect(filters.getByText('Preview colour · Default')).toBeVisible();

  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight / 2));
  await expect.poll(async () => (await filters.boundingBox())?.y).toBeCloseTo(16, 0);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight / 2));
  await expect.poll(async () => (await filters.boundingBox())?.y).toBeCloseTo(0, 0);

  await appearance.selectOption('brand');
  await filters.getByRole('textbox', { name: 'Search Icons' }).fill('social.service.mastodon');
  const card = page.locator('.rl-icon-card').filter({ hasText: 'Mastodon social icon' });
  await card.click();
  await expect(card.locator('svg path').first()).toHaveAttribute('fill', '#6364FF');

  await appearance.selectOption('default');
  await expect(card.locator('svg path').first()).not.toHaveAttribute('fill', '#6364FF');
});
