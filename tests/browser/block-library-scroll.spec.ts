import { expect, test } from '@playwright/test';

test('block library preview scrolls its content before chaining to the page in both directions', async ({ page }) => {
  await page.setViewportSize({ width: 1900, height: 800 });
  await page.goto('/studio/ui/blocks/paragraph');
  const frame = page.locator('.ui-block-canvas .studio-preview-frame-content');
  await expect(frame).toBeVisible();
  // Add content to the actual preview surface to exercise its scroll boundaries.
  await expect(async () => {
    await frame.scrollIntoViewIfNeeded();
    await frame.hover({ position: { x: 40, y: 100 } });
    await frame.evaluate(el => { const filler = document.createElement('div'); filler.style.height = '1600px'; filler.setAttribute('data-scroll-test', ''); el.appendChild(filler); });
    await expect(frame.locator('[data-scroll-test]')).toHaveCount(1);
  }).toPass();
  const before = await page.evaluate(() => window.scrollY);
  await page.mouse.wheel(0, 250);
  await expect.poll(() => frame.evaluate(el => el.scrollTop)).toBeGreaterThan(0);
  expect(await page.evaluate(() => window.scrollY)).toBe(before);
  await frame.evaluate(el => { el.scrollTop = el.scrollHeight; });
  await page.mouse.wheel(0, 250);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(before);
  await frame.evaluate(el => { el.scrollTop = 0; });
  const lower = await page.evaluate(() => window.scrollY);
  await page.mouse.wheel(0, -200);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeLessThan(lower);
  await frame.evaluate(el => el.querySelector('[data-scroll-test]')?.remove());
  await frame.evaluate(el => { el.scrollTop = 0; });
  const fitted = await page.evaluate(() => window.scrollY);
  await page.mouse.wheel(0, 200);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(fitted);
});

test('block library navigation chains to the page at its scroll edges', async ({ page }) => {
  await page.setViewportSize({ width: 800, height: 600 });
  await page.goto('/studio/ui/blocks/paragraph');
  const menu = page.getByRole('complementary', { name: 'Block Library menu' });
  await expect(menu).toBeVisible();
  await menu.scrollIntoViewIfNeeded();
  await menu.hover({ position: { x: 30, y: 20 } });
  expect(await menu.evaluate(el => el.scrollHeight > el.clientHeight)).toBe(true);
  await page.mouse.wheel(0, 150);
  await expect.poll(() => menu.evaluate(el => el.scrollTop)).toBeGreaterThan(0);
  await menu.evaluate(el => { el.scrollTop = el.scrollHeight; });
  const before = await page.evaluate(() => window.scrollY);
  await page.mouse.wheel(0, 200);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(before);
  await menu.evaluate(el => { el.scrollTop = 0; });
  const lower = await page.evaluate(() => window.scrollY);
  await page.mouse.wheel(0, -200);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeLessThan(lower);
});
