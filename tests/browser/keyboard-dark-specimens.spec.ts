import { expect, test } from '@playwright/test';

test('dark specimens invert keycaps on light surfaces and export the displayed colours', async ({ page }) => {
  await page.goto('/studio/ui/icons?collection=keyboard');
  const checkbox = page.getByRole('checkbox', { name: 'Dark Specimens' });
  const keyboard = page.getByRole('img', { name: /Illustrative full-size UK Mac keyboard/ });
  const inspector = page.getByLabel('Keyboard Asset Inspector');
  await expect(async () => {
    await checkbox.uncheck();
    await checkbox.check();
    await expect(inspector.getByRole('textbox', { name: 'Symbol Colour', exact: true })).toHaveValue('#F2F2F7', { timeout: 1000 });
  }).toPass({ timeout: 15000 });
  await expect(inspector.getByRole('textbox', { name: 'Fill Colour', exact: true })).toHaveValue('#1C1C1E');
  await expect(page.locator('.kb-full-art')).toHaveCSS('background-color', 'rgb(242, 242, 247)');
  await expect(page.locator('.kb-grid')).toHaveCSS('background-color', 'rgb(239, 239, 237)');
  expect(decodeURIComponent((await keyboard.getAttribute('src')) ?? '')).toContain('fill="#1C1C1E"');
  await expect(inspector.locator('.kb-large svg > path').first()).toHaveAttribute('fill', '#1C1C1E');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('region', { name: 'Full-size keyboards' }).getByRole('button', { name: 'Download SVG' }).click();
  const download = await downloadPromise;
  const svg = Buffer.concat(await (await download.createReadStream()).toArray()).toString();
  expect(svg).toContain('fill="#1C1C1E"');
  expect(svg).toContain('stroke="#F2F2F7"');
  await checkbox.uncheck();
  await expect(inspector.getByRole('textbox', { name: 'Symbol Colour', exact: true })).toHaveValue('#1C1C1E');
  await expect(inspector.getByRole('textbox', { name: 'Fill Colour', exact: true })).toHaveValue('#F2F2F7');
  await inspector.getByLabel('Preset').selectOption('outline');
  await expect(inspector.getByRole('checkbox', { name: 'Transparent Fill' })).toBeChecked();
  await checkbox.check();
  await expect(inspector.getByRole('checkbox', { name: 'Transparent Fill' })).not.toBeChecked();
  await expect(inspector.locator('.kb-large svg > path').first()).toHaveAttribute('fill', '#1C1C1E');
  await checkbox.uncheck();
  await expect(inspector.getByRole('checkbox', { name: 'Transparent Fill' })).toBeChecked();
});
