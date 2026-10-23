import { expect, test } from '@playwright/test';

for (const width of [1440, 820, 390]) {
  test(`shared Block Styles at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('/studio/ui/controls#block-style-panels');
    const specimen = page.getByRole('group', { name: 'Block Styles panes example', exact: true });
    await expect(specimen).toBeVisible();
    await expect(specimen).toHaveAttribute("data-ready", "true");
    await expect(specimen.locator('[data-block-target="search"]')).toContainText('Reference only');
    await expect(specimen.locator('[data-block-target="pullquote"]')).toContainText('Reference only');
    await specimen.getByRole('button', { name: 'Show Group inheritance', exact: true }).click();
    await expect(specimen.getByRole('spinbutton', { name: 'Custom font size', exact: true })).toHaveValue('24');
    await specimen.getByText('Compare Style Book', { exact: true }).click();
    const inline = specimen.locator('.site-block-inline-specimen .site-block-style-row').first();
    const book = specimen.locator('details .site-block-style-row').first();
    await expect(inline).toHaveCSS('color', 'rgb(18, 52, 86)');
    await expect(book).toHaveCSS('color', 'rgb(18, 52, 86)');
    await expect(inline).toHaveCSS('padding', '16px');
    await expect(book).toHaveCSS('padding', '16px');
    await expect(inline).toHaveCSS('font-size', '24px');
    await expect(book).toHaveCSS('font-size', '24px');
    await specimen.getByRole('button', { name: 'Reset example', exact: true }).click();
    await expect(specimen.locator('[data-block-target="row"]')).toBeVisible();
  });
}
