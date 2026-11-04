import { expect, test } from '@playwright/test';

test('social icon brand colours can be selected and downloaded while defaults remain available', async ({ page }) => {
  await page.goto('/studio/ui/icons?icon=social.service.flickr');
  await page.waitForLoadState('networkidle');
  const appearance = page.getByLabel('Icon Colours');
  const preview = page.locator('.rl-inspector .rl-enlarged svg');
  await expect(appearance).not.toBeChecked();
  await expect(preview.locator('path')).toHaveCount(1);
  await appearance.check();
  await expect(preview.locator('path')).toHaveCount(2);
  await expect(preview.locator('path').first()).toHaveAttribute('fill', '#0063DC');
  await expect(preview.locator('path').last()).toHaveAttribute('fill', '#FF0084');
  const event = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download 24px SVG' }).click();
  const download = await event;
  expect(download.suggestedFilename()).toContain('-brand-');
  const content = Buffer.concat(await (await download.createReadStream()).toArray()).toString();
  expect(content).toContain('#0063DC'); expect(content).toContain('#FF0084');
  await appearance.uncheck();
  await expect(preview.locator('path')).toHaveCount(1);
  await expect(preview.locator('path').first()).toHaveAttribute('fill', 'currentColor');
});
