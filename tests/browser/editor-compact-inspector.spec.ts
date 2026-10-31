import { expect, test } from '@playwright/test';

for (const width of [200, 440]) {
  test(`inspector stays reachable at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/studio', { waitUntil: 'networkidle' });
    const inspector = page.locator('.studio-inspector-track');
    const hide = page.getByRole('button', { name: 'Hide Editor Inspector' });
    await expect(hide).toBeVisible();
    const bounds = await inspector.boundingBox();
    expect(bounds).not.toBeNull();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width);
    await hide.click();
    const show = page.getByRole('button', { name: 'Show Editor Inspector' });
    await expect(show).toBeVisible();
    await show.click();
    await expect(hide).toBeVisible();
  });
}
