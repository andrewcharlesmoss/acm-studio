import { expect, test } from '@playwright/test';

test('shows and updates artwork modification dates with icon selection', async ({ page }) => {
  await page.goto('/studio/ui/icons?icon=state.inherited');
  const inspector = page.getByRole('complementary', { name: 'Icon Inspector' });
  await expect(inspector.getByText('Modified', { exact: true })).toBeVisible();
  await expect(inspector.locator('time').nth(1)).toHaveAttribute('datetime', '2026-11-02T16:20:39+00:00');
  await page.getByRole('textbox', { name: 'Search Icons' }).fill('rotate free');
  await page.locator('.rl-icon-card').filter({ hasText: 'arrange.rotate-free' }).click();
  await expect(inspector.locator('time').nth(0)).toHaveAttribute('datetime', '2026-10-15T10:24:51+00:00');
  await expect(inspector.locator('time').nth(1)).toHaveAttribute('datetime', '2026-10-15T11:28:46+01:00');
  await expect(inspector.locator('time').nth(1)).toHaveText('15 October 2026 at 10:28:46 UTC');
});
