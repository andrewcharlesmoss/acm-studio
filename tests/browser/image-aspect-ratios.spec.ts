import { expect, test } from '@playwright/test';

test('Image ratios frame the specimen in Edit and Preview', async ({ page }) => {
  await page.goto('/studio/ui/blocks/image');
  await expect(page.locator('.ui-block-specimen')).toHaveAttribute('data-ready', 'true');
  const pane = page.getByRole('complementary', { name: 'Image settings', exact: true });
  await pane.getByRole('tab', { name: 'Styles' }).click();
  const ratio = pane.getByLabel('Aspect ratio');
  const image = page.locator('.ui-block-specimen img').first();
  for (const [value, expected] of [['classic', 3 / 2], ['classic-portrait', 2 / 3], ['tall', 9 / 16]] as const) {
    await ratio.selectOption(value);
    await expect(pane.getByLabel('Height (px)')).toHaveValue('');
    const box = await image.boundingBox();
    expect(box).not.toBeNull();
    expect(Math.abs(box!.width / box!.height - expected)).toBeLessThan(0.03);
    await page.getByRole('button', { name: 'Preview', exact: true }).click();
    const preview = await page.locator('.ui-block-specimen img').first().boundingBox();
    expect(preview).not.toBeNull();
    expect(Math.abs(preview!.width / preview!.height - expected)).toBeLessThan(0.03);
    await page.getByRole('button', { name: 'Edit', exact: true }).click();
    await pane.getByRole('tab', { name: 'Styles' }).click();
  }
});
