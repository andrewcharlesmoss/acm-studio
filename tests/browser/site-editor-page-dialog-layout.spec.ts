import { expect, test } from '@playwright/test';

test('Pages dialogs retain the shared box treatment and fit narrow viewports', async ({ page }) => {
  for (const width of [1440, 390, 280]) {
    await page.setViewportSize({ width, height: 800 });
    await page.goto('/studio/ui/controls#site-pages-catalogue');
    const specimen = page.locator('.ui-pages-catalogue-specimen');
    await specimen.getByRole('button', { name: 'Add Page', exact: true }).click();
    const dialog = page.locator('dialog.site-pages-dialog');
    await expect(dialog).toBeVisible();
    const box = await dialog.evaluate(element => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return {
        width: rect.width,
        left: rect.left,
        right: rect.right,
        radius: style.borderRadius,
        padding: style.padding,
        background: style.backgroundColor,
        borderStyle: style.borderStyle,
        contentFits: element.scrollWidth <= element.clientWidth,
      };
    });
    expect(box.width).toBeCloseTo(Math.min(480, width - 32), 0);
    expect(box.left).toBeGreaterThanOrEqual(16);
    expect(box.right).toBeLessThanOrEqual(width - 16);
    expect(box.radius).toBe('8px');
    expect(box.padding).toBe('24px');
    expect(box.background).toBe('rgb(255, 255, 255)');
    expect(box.borderStyle).toBe('solid');
    expect(box.contentFits).toBe(true);
    await dialog.getByRole('button', { name: 'Close add page' }).click();
  }
});
