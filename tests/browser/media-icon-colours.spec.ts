import { expect, test } from '@playwright/test';

test('media icon previews and downloads use the universal Accent colour', async ({ page }) => {
  await page.goto('/studio/ui/icons?icon=library.files');
  await page.waitForLoadState('networkidle');

  const inspector = page.getByRole('complementary', { name: 'Icon Inspector' });
  const media = page.getByLabel('Media Colours');
  await media.check();

  const search = page.getByRole('textbox', { name: 'Search Icons' });
  const downloads: Array<[string, string]> = [
    ['library.files', 'Files'],
    ['insert.image', 'Image'],
    ['insert.audio', 'Audio'],
    ['insert.video', 'Video'],
    ['media.gallery', 'Gallery'],
  ];

  for (const [name, label] of downloads) {
    await search.fill(name);
    await page.locator('.rl-icon-card').filter({ hasText: name }).click();
    await expect(inspector.getByRole('heading', { name: label })).toBeVisible();
    await expect(inspector.locator('.rl-enlarged svg')).toHaveAttribute('stroke', '#0088FF');
    const scaleSamples = inspector.locator('.rl-scale-samples > div > span:first-child > svg');
    await expect(scaleSamples).toHaveCount(3);
    for (let index = 0; index < 3; index += 1) {
      await expect(scaleSamples.nth(index)).toHaveAttribute('stroke', '#0088FF');
    }

    const downloadPromise = page.waitForEvent('download');
    await inspector.getByRole('button', { name: 'Download 24px SVG' }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain('-media-24px.svg');
    const stream = await download.createReadStream();
    let contents = '';
    for await (const chunk of stream!) contents += chunk.toString();
    expect(contents).toContain('stroke="#0088FF"');
    expect(contents).not.toContain('currentColor');
  }

  await search.fill('media.gallery');
  await page.locator('.rl-icon-card').filter({ hasText: 'media.gallery' }).click();
  const pngPromise = page.waitForEvent('download');
  await inspector.getByRole('button', { name: 'Download 24px PNG at 3×' }).click();
  const png = await pngPromise;
  expect(png.suggestedFilename()).toContain('-media-24px-3x.png');
  const pngStream = await png.createReadStream();
  let signature = '';
  for await (const chunk of pngStream!) {
    signature += chunk.toString('latin1');
    if (signature.length >= 8) break;
  }
  expect(signature.slice(0, 8)).toBe('\x89PNG\r\n\x1a\n');

  await media.uncheck();
  await expect(inspector.locator('.rl-enlarged svg')).toHaveAttribute('stroke', 'currentColor');
});

test('Media Colours remains reachable at desktop, tablet and mobile widths', async ({ page }) => {
  for (const [width, height] of [[1280, 800], [820, 1024], [390, 844]]) {
    await page.setViewportSize({ width, height });
    await page.goto('/studio/ui/icons?icon=library.files');
    const option = page.locator('.rl-sidebar .rl-check').filter({ hasText: 'Media Colours' });
    await expect(option).toBeVisible();
    const bounds = await option.evaluate(element => {
      const { left, right } = element.getBoundingClientRect();
      return { left, right };
    });
    expect(bounds.left).toBeGreaterThanOrEqual(0);
    expect(bounds.right).toBeLessThanOrEqual(width);
  }
});
