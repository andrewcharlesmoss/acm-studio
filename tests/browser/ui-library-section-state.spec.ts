import { expect, test } from '@playwright/test';

for (const width of [1440, 390]) test(`Controls restores its draft and scroll position at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 });
  await page.goto('/studio/ui#tooltip');
  await page.waitForLoadState('networkidle');
  await page.getByRole('tab', { name: 'Controls', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Controls', exact: true })).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  await expect(page).not.toHaveURL(/#tooltip$/);
  const input = page.getByRole('textbox', { name: 'Text input example', exact: true });
  await input.fill('Retained example');
  await page.getByRole('navigation', { name: 'Control specimens', exact: true }).getByRole('link', { name: 'Tooltip', exact: true }).click();
  await expect(page).toHaveURL(/#tooltip$/);
  await page.getByRole('tab', { name: 'Controls', exact: true }).click();
  await page.mouse.move(width - 10, 120);
  await page.mouse.wheel(0, -1000000);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  await page.getByRole('tab', { name: 'Blocks', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Blocks', exact: true })).toBeVisible();
  await page.getByRole('tab', { name: 'Controls', exact: true }).click();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  await expect(input).toHaveValue('Retained example');
  await expect(page.getByRole('navigation', { name: 'Control specimens', exact: true }).getByRole('link', { name: 'Text input', exact: true })).toHaveAttribute('aria-current', 'location');
  await expect(page).toHaveURL(/#tooltip$/);
  await page.getByRole('tab', { name: 'Controls', exact: true }).click();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
});

test('Controls direct links still identify the requested specimen', async ({ page }) => {
  await page.goto('/studio/ui/controls#tooltip');
  await expect(page.getByRole('navigation', { name: 'Control specimens', exact: true }).getByRole('link', { name: 'Tooltip', exact: true })).toHaveAttribute('aria-current', 'location');
});

test('keyboard tab switching restores a scrolled Controls view', async ({ page }) => {
  await page.goto('/studio/ui/controls');
  await page.waitForLoadState('networkidle');
  await page.getByRole('tab', { name: 'Controls', exact: true }).click();
  await page.mouse.move(1000, 600);
  await page.mouse.wheel(0, 1000);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(500);
  const previous = await page.evaluate(() => window.scrollY);
  await page.keyboard.press('ArrowLeft');
  await expect(page.getByRole('tab', { name: 'Blocks', exact: true })).toHaveAttribute('aria-selected', 'true');
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('tab', { name: 'Controls', exact: true })).toHaveAttribute('aria-selected', 'true');
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(previous);
});
