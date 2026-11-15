import { expect, test } from '@playwright/test';

test('filled icon selection previews and downloads the matching artwork', async ({ page }) => {
  await page.goto('/studio/ui/icons');
  await expect(async () => {
    await page.getByRole('radio', { name: 'Filled' }).check();
    await expect(page.getByRole('region', { name: 'ACM Icon Catalogue' }).locator('.rl-icon-card')).toHaveCount(293, { timeout: 1000 });
    await expect(page.getByLabel('Icon Colours')).toBeDisabled({ timeout: 1000 });
  }).toPass({ timeout: 15000 });
  await page.getByText('Provenance and source').click();
  await expect(page.locator('.rl-inspector code').last()).toHaveText('acm-icons/filled-masters/action.undo.svg');
  for (const name of ['Home', 'Files', 'Search', 'Copy', 'Duplicate', 'Undo', 'Grid Layout', 'Locked', 'YouTube']) {
    await page.getByRole('button', { name: new RegExp(`^${name} `) }).click();
    const paths = await page.locator('.rl-scale-samples > div').nth(1).locator('span:first-child svg path').evaluateAll(elements => elements.map(element => element.getAttribute('d')));
    const pending = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download 24px SVG' }).click();
    const download = await pending;
    expect(download.suggestedFilename()).toContain('-filled-24px.svg');
    const svg = Buffer.concat(await (await download.createReadStream()).toArray()).toString();
    expect(svg).toContain('<title>');
    expect(svg).toContain('<desc>');
    for (const path of paths) expect(svg).toContain(`d="${path}"`);
  }
  const pngPending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download 16px PNG at 3×' }).click();
  expect((await pngPending).suggestedFilename()).toContain('-filled-16px-3x.png');
  await page.getByRole('radio', { name: 'Outline' }).check();
  await expect(page.locator('.rl-inspector code').last()).toContainText('acm-icons/masters/');
  await expect(page.getByLabel('Icon Colours')).toBeEnabled();
  await expect(page.getByRole('region', { name: 'ACM Icon Catalogue' }).locator('.rl-icon-card')).toHaveCount(293);
});
