import { expect, test } from '@playwright/test';
test('illustrations use palette colours in previews and downloads', async ({ page }) => {
  await page.goto('/studio/ui/icons?icon=library.files');
  await page.waitForLoadState('networkidle');
  await page.getByLabel('Icon Colours').check();
  const search = page.getByRole('textbox', { name: 'Search Icons' });
  const inspector = page.getByRole('complementary', { name: 'Icon Inspector' });
  for (const [name, colour] of [['library.files','#FFCC00'], ['insert.image','#34C759'], ['insert.audio','#0088FF'], ['insert.video','#0088FF'], ['media.gallery','#FFCC00'], ['library.designs','#34C759'], ['insert.shapes','#FFCC00']]) {
    await search.fill(name); await page.locator('.rl-icon-card').filter({ hasText: name }).click();
    await expect(inspector.locator(`.rl-enlarged svg path[stroke="${colour}"], .rl-enlarged svg path[fill="${colour}"]`).first()).toBeAttached();
    for (const size of [24]) {
      const pending = page.waitForEvent('download'); await inspector.getByRole('button', { name: `Download ${size}px SVG` }).click();
      const file = await pending; expect(file.suggestedFilename()).toContain('-illustration-');
      expect(Buffer.concat(await (await file.createReadStream()).toArray()).toString()).toContain(colour);
    }
  }
  const png = page.waitForEvent('download'); await inspector.getByRole('button', { name: 'Download 24px PNG at 3×' }).click();
  expect(Buffer.concat(await (await (await png).createReadStream()).toArray()).subarray(0, 8)).toEqual(Buffer.from([137,80,78,71,13,10,26,10]));
});
