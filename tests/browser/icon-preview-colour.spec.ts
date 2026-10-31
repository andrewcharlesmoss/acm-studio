import { expect, test } from '@playwright/test';

test('icon preview colour changes the catalogue and inspector without changing downloads', async ({ page }) => {
  await page.goto('/studio/ui/icons?icon=social.service.snapchat');
  const cardIcon = page.getByRole('button', { name: /Snapchat social icon/ }).locator('.rl-icon-scales svg').first();
  const inspectorIcon = page.locator('.rl-inspector .rl-enlarged svg');
  await expect(async () => {
    await page.getByRole('button', { name: 'Choose Preview colour' }).click();
    await expect(page.getByRole('button', { name: 'Alert, #FF383C' })).toBeVisible({ timeout: 1000 });
  }).toPass({ timeout: 10000 });
  await page.getByRole('button', { name: 'Alert, #FF383C' }).click();
  await expect(cardIcon).toHaveCSS('color', 'rgb(255, 56, 60)');
  await expect(inspectorIcon).toHaveCSS('color', 'rgb(255, 56, 60)');
  await expect(page.locator('.rl-scale-samples > div svg').first()).toHaveCSS('color', 'rgb(255, 56, 60)');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download 24px SVG' }).click();
  const download = await downloadPromise;
  const contents = await (await download.createReadStream()).toArray();
  expect(Buffer.concat(contents).toString()).toContain('stroke="#1C1C1E"');
  expect(Buffer.concat(contents).toString()).toContain('fill="#1C1C1E"');
  await page.getByLabel('Dark Specimens').check();
  await page.getByRole('button', { name: 'Reset colour' }).click();
  await expect(inspectorIcon).not.toHaveCSS('color', 'rgb(255, 56, 60)');
  await expect(cardIcon).toHaveCSS('color', 'rgb(242, 242, 247)');
});
