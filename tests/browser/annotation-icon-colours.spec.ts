import { expect, test } from '@playwright/test';

test('Highlight and Redaction use annotation colours in preview and exports', async ({ page }) => {
  await page.goto('/studio/ui/icons?icon=insert.highlight');
  await page.waitForLoadState('networkidle');
  const toggle = page.getByLabel('Icon Colours');
  await toggle.check();
  const search = page.getByRole('textbox', { name: 'Search Icons' });
  const inspector = page.getByRole('complementary', { name: 'Icon Inspector' });
  for (const [name, colour] of [['insert.highlight', '#FFCC00'], ['insert.redaction', '#1C1C1E']]) {
    await search.fill(name);
    await page.locator('.rl-icon-card').filter({ hasText: name }).click();
    await expect(inspector.locator(`.rl-enlarged svg path[stroke="${colour}"], .rl-enlarged svg path[fill="${colour}"]`).first()).toBeAttached();
    for (const size of [16, 24, 32]) {
      const download = page.waitForEvent('download');
      await inspector.getByRole('button', { name: `Download ${size}px SVG` }).click();
      const file = await download;
      expect(file.suggestedFilename()).toContain('-annotation-');
      const contents = Buffer.concat(await (await file.createReadStream()).toArray()).toString();
      expect(contents).toContain(colour);
      expect(contents).toContain('#FFFFFF');
    }
  }
  const pngPromise = page.waitForEvent('download');
  await inspector.getByRole('button', { name: 'Download 24px PNG at 3×' }).click();
  const png = await pngPromise;
  expect(png.suggestedFilename()).toContain('-annotation-24px-3x.png');
  const bytes = Buffer.concat(await (await png.createReadStream()).toArray());
  expect(bytes.subarray(0, 8)).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  await toggle.uncheck();
  await expect(inspector.locator('.rl-enlarged svg')).toHaveAttribute('stroke', 'currentColor');
});
