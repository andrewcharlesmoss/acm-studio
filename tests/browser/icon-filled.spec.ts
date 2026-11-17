import { expect, test } from '@playwright/test';
import { iconNames } from '@acm/icons';
import { hasFilledIcon } from '@acm/icons/filled';

test('filled icon selection previews and downloads the matching artwork', async ({ page }) => {
  const filledNames = iconNames.filter(name => !name.startsWith('keyboard.') && hasFilledIcon(name)).sort();
  const outlineNames = iconNames.filter(name => !name.startsWith('keyboard.')).sort();
  const cards = page.getByRole('region', { name: 'ACM Icon Catalogue' }).locator('.rl-icon-card');
  await page.goto('/studio/ui/icons');
  await expect(async () => {
    await page.getByRole('radio', { name: 'Filled' }).check();
    expect((await cards.locator('small').allTextContents()).sort()).toEqual(filledNames);
  }).toPass({ timeout: 15000 });
  await expect(page.getByLabel('Icon Colours')).toBeDisabled();
  await page.getByText('Provenance and source').click();
  await expect(page.locator('.rl-inspector code').last()).toHaveText('acm-studio/packages/acm-icons/filled-masters/navigation.home.svg');
  for (const name of ['navigation.home', 'library.files', 'action.search', 'action.copy', 'action.duplicate', 'action.archive', 'action.delete', 'communication.bell', 'communication.envelope', 'time.calendar', 'taxonomy.tag']) {
    await cards.filter({ has: page.getByText(name, { exact: true }) }).click();
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
  await expect(page.locator('.rl-inspector code').last()).toContainText('acm-studio/packages/acm-icons/masters/');
  await expect(page.getByLabel('Icon Colours')).toBeEnabled();
  await expect.poll(async () => (await cards.locator('small').allTextContents()).sort()).toEqual(outlineNames);
});
