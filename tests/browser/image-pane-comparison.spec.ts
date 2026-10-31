import { expect, test } from '@playwright/test';

test('Image block library uses the standard single-specimen layout', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/studio/ui/blocks/image');

  const detail = page.locator('.ui-block-detail-page');
  const specimen = page.getByRole('region', { name: 'Editable specimen' });
  await expect(specimen).toHaveAttribute('data-ready', 'true');
  await expect(detail.locator(':scope > .ui-block-specimen')).toHaveCount(1);
  await expect(detail.getByRole('heading', { name: 'Site-wide image styles' })).toHaveCount(0);
  await expect(page.locator('.ui-image-pane-comparison')).toHaveCount(0);
  await expect(specimen.getByRole('complementary', { name: 'Image settings' })).toBeVisible();

  const layout = specimen.locator('.ui-block-editor-layout');
  for (const [width, expectedColumns] of [[1440, 2], [820, 1], [390, 1]] as const) {
    await page.setViewportSize({ width, height: 900 });
    await expect.poll(() => layout.evaluate(node => getComputedStyle(node).gridTemplateColumns.split(' ').length)).toBe(expectedColumns);
  }
});
