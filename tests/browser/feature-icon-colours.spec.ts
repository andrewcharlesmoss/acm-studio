import { expect, test } from '@playwright/test';

test('Designs and Shapes share the Icon Colours setting and exports', async ({ page }) => {
  await page.goto('/studio/ui/icons?icon=library.designs');
  await page.waitForLoadState('networkidle');
  const toggle = page.getByLabel('Icon Colours');
  await toggle.check();
  const search = page.getByRole('textbox', { name: 'Search Icons' });
  const inspector = page.getByRole('complementary', { name: 'Icon Inspector' });
  for (const name of ['library.designs', 'insert.shapes']) {
    await search.fill(name);
    await page.locator('.rl-icon-card').filter({ hasText: name }).click();
    await expect(inspector.locator('.rl-enlarged svg path[fill="#0088FF"]').first()).toBeAttached();
    await expect(inspector.locator('.rl-scale-samples > div > span:first-child > svg')).toHaveCount(3);
    const pending = page.waitForEvent('download');
    await inspector.getByRole('button', { name: 'Download 24px SVG' }).click();
    const file = await pending;
    expect(file.suggestedFilename()).toContain('-illustration-');
    const svg = Buffer.concat(await (await file.createReadStream()).toArray()).toString();
    expect(svg).toContain('#0088FF');
  }
  const pendingPng = page.waitForEvent('download');
  await inspector.getByRole('button', { name: 'Download 24px PNG at 3×' }).click();
  const png = await pendingPng;
  expect(Buffer.concat(await (await png.createReadStream()).toArray()).subarray(0, 8)).toEqual(Buffer.from([137,80,78,71,13,10,26,10]));
  await toggle.uncheck();
  await expect(inspector.locator('.rl-enlarged svg')).toHaveAttribute('stroke', 'currentColor');
});
