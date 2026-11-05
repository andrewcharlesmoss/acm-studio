import { expect, test } from '@playwright/test';

test('shared border control specimen shows separate inherited markers', async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 900 });
  await page.goto('/studio/ui/controls/border-settings');
  const specimen = page.locator('.ui-control-live').filter({ has: page.locator('.border-settings-control') }).first();
  const inherited = specimen.locator('.border-settings-control').nth(1);
  await expect(inherited.locator('.studio-border-label .studio-inherited-indicator')).toBeVisible();
  const colour = inherited.getByRole('button', { name: 'Choose border colour for all sides (All control)' });
  await expect(colour.locator('.studio-inherited-indicator')).toBeVisible();
  const width = inherited.getByRole('spinbutton', { name: 'Border All width' });
  await width.fill('4'); await width.blur();
  await expect(inherited.locator('.studio-border-label .studio-inherited-indicator')).toHaveCount(0);
  await expect(colour.locator('.studio-inherited-indicator')).toBeVisible();
  await colour.click();
  await expect(page.getByRole('dialog', { name: 'Border colour palette' }).locator('.studio-border-style .studio-inherited-indicator')).toBeVisible();
});
