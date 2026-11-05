import { expect, test } from '@playwright/test';
test('security colours use gold and neutral in previews and downloads', async ({ page }) => {
  await page.goto('/studio/ui/icons?icon=security.lock');
  await page.waitForLoadState('networkidle');
  const toggle = page.getByLabel('Icon Colours');
  await toggle.check();
  const search = page.getByRole('textbox', { name: 'Search Icons' });
  const inspector = page.getByRole('complementary', { name: 'Icon Inspector' });
  for (const name of ['security.lock', 'security.unlock', 'security.key', 'security.shield']) {
    await search.fill(name);
    await page.locator('.rl-icon-card').filter({ hasText: name }).click();
    await expect(inspector.locator('.rl-enlarged svg path[fill="#FFCC00"], .rl-enlarged svg path[stroke="#FFCC00"]').first()).toBeAttached();
    const pending = page.waitForEvent('download');
    await inspector.getByRole('button', { name: 'Download 24px SVG' }).click();
    const file = await pending;
    expect(file.suggestedFilename()).toContain('-security-');
    expect(Buffer.concat(await (await file.createReadStream()).toArray()).toString()).toContain('#FFCC00');
  }
  const pngPromise = page.waitForEvent('download');
  await inspector.getByRole('button', { name: 'Download 24px PNG at 3×' }).click();
  const png = await pngPromise;
  expect(Buffer.concat(await (await png.createReadStream()).toArray()).subarray(0, 8)).toEqual(Buffer.from([137,80,78,71,13,10,26,10]));
  await toggle.uncheck();
  await expect(inspector.locator('.rl-enlarged svg')).toHaveAttribute('stroke', 'currentColor');
});
