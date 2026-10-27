import { expect, test } from '@playwright/test';

test('Image Resolution example changes real image bytes and supports history and replacement', async ({ page }) => {
  await page.goto('/studio/ui/blocks/image');
  await expect(page.locator('.ui-block-specimen')).toHaveAttribute('data-ready', 'true');
  const specimen = page.locator('.ui-block-specimen');
  const pane = specimen.getByRole('complementary', { name: 'Image settings', exact: true });
  await pane.getByRole('tab', { name: 'Settings', exact: true }).click();
  const resolution = pane.getByRole('combobox', { name: 'Resolution', exact: true });
  await expect(resolution).toBeVisible();
  await expect(resolution.locator('option')).toHaveText(['Full Size', 'Thumbnail', 'Medium']);
  const image = specimen.getByRole('img', { name: 'Illustrated green hill with a blue sky', exact: true });
  await expect.poll(() => image.evaluate((node: HTMLImageElement) => node.naturalWidth)).toBe(640);
  await resolution.selectOption({ label: 'Medium' });
  await expect.poll(() => image.evaluate((node: HTMLImageElement) => node.naturalWidth)).toBe(300);
  await specimen.getByRole('button', { name: 'Preview', exact: true }).click();
  await expect.poll(() => image.evaluate((node: HTMLImageElement) => node.naturalWidth)).toBe(300);
  await specimen.getByRole('button', { name: 'Undo specimen change' }).click();
  await expect.poll(() => image.evaluate((node: HTMLImageElement) => node.naturalWidth)).toBe(640);
  await specimen.getByRole('button', { name: 'Redo specimen change' }).click();
  await expect.poll(() => image.evaluate((node: HTMLImageElement) => node.naturalWidth)).toBe(300);
  await specimen.getByRole('button', { name: 'Edit', exact: true }).click();
  await specimen.getByRole('checkbox', { name: 'Read-only example' }).check();
  await expect(resolution).toBeDisabled();
  await specimen.getByRole('checkbox', { name: 'Read-only example' }).uncheck();
  await pane.getByRole('tab', { name: 'Content', exact: true }).click();
  await pane.getByRole('button', { name: 'Choose from files', exact: true }).click();
  const files = page.getByRole('dialog', { name: 'Files', exact: true });
  await files.locator('.media-file-card').filter({ hasText: 'Mont Blanc.jpg' }).click();
  await files.getByRole('button', { name: 'Insert into Image', exact: true }).click();
  const describe = page.getByRole('dialog', { name: 'Describe this image', exact: true });
  await describe.getByRole('textbox').fill('Mountain');
  await describe.getByRole('button', { name: 'Insert image', exact: true }).click();
  await pane.getByRole('tab', { name: 'Settings', exact: true }).click();
  await expect(pane.getByRole('combobox', { name: 'Resolution', exact: true })).toHaveValue('full');
  await expect.poll(() => specimen.getByRole('img', { name: 'Mountain', exact: true }).evaluate((node: HTMLImageElement) => node.naturalWidth)).toBe(500);
  await specimen.getByRole('button', { name: 'Undo specimen change' }).click();
  await expect.poll(() => image.evaluate((node: HTMLImageElement) => node.naturalWidth)).toBe(300);
  await specimen.getByRole('button', { name: 'Redo specimen change' }).click();
  await expect.poll(() => specimen.getByRole('img', { name: 'Mountain', exact: true }).evaluate((node: HTMLImageElement) => node.naturalWidth)).toBe(500);
  await specimen.getByRole('button', { name: 'Reset Example' }).click();
  await pane.getByRole('tab', { name: 'Settings', exact: true }).click();
  await expect(pane.getByRole('combobox', { name: 'Resolution', exact: true })).toHaveValue('full');
});

for (const width of [1440, 820, 390]) {
  test(`Image Resolution example remains usable at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/studio/ui/blocks/image');
    const specimen = page.locator('.ui-block-specimen');
    const pane = specimen.getByRole('complementary', { name: 'Image settings', exact: true });
    await pane.getByRole('tab', { name: 'Settings', exact: true }).click();
    const resolution = pane.getByRole('combobox', { name: 'Resolution', exact: true });
    await expect(resolution).toBeVisible();
    await resolution.focus();
    await expect(resolution).toBeFocused();
    await resolution.selectOption({ label: 'Thumbnail' });
    const image = specimen.getByRole('img', { name: 'Illustrated green hill with a blue sky', exact: true });
    await expect.poll(() => image.evaluate((node: HTMLImageElement) => node.naturalWidth)).toBe(150);
    await resolution.scrollIntoViewIfNeeded();
    await page.screenshot({ path: `/private/tmp/acm-image-resolution-library-${width}.png` });
  });
}
