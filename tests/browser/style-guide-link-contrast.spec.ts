import { expect, test } from '@playwright/test';

for (const width of [1440, 782, 390]) {
  test(`website link shares the outline text colour at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('/studio/ui/styles');
    await expect(page.getByRole('status').filter({ hasText: 'Source loaded' })).toBeVisible();
    if (width === 390) await page.getByRole('button', { name: 'Preview', exact: true }).click();

    const preview = page.getByRole('region', { name: 'Scrollable style specimen preview' });
    const outline = preview.getByRole('button', { name: 'Outline button' });
    const link = preview.getByRole('link', { name: 'Example Link' });
    await expect(link).toBeVisible();
    const textColour = await outline.evaluate(button => getComputedStyle(button).color);
    await expect(link).toHaveCSS('color', textColour);
    await expect(link).toHaveCSS('text-decoration-line', 'underline');
  });
}
