import { expect, test } from '@playwright/test';

for (const width of [1440, 390]) {
  test(`block inspector scroll chains to the page at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/studio/ui/blocks/heading');

    const inspector = page.locator('.ui-block-inspector');
    const paneBody = inspector.locator('.pane-body');
    await expect(inspector).toBeVisible();
    const scrollOver = async () => {
      const box = await paneBody.boundingBox();
      if (!box) throw new Error('The inspector pane body is not visible.');
      const point = { x: box.x + box.width / 2, y: Math.max(1, Math.min(box.y + 160, 890)) };
      await page.mouse.move(point.x, point.y);
      await page.mouse.wheel(0, 500);
    };

    for (const context of ['Block editor', 'Site editor styles']) {
      await page.getByRole('tab', { name: context, exact: true }).click();
      await page.evaluate(() => window.scrollTo(0, 0));
      await paneBody.scrollIntoViewIfNeeded();
      const pageScrollBefore = await page.evaluate(() => window.scrollY);
      await scrollOver();
      await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(pageScrollBefore);
    }
  });
}
