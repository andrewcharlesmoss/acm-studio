import { expect, test } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
import { isolatedNativeZoom, zoomMetrics } from './helpers/native-zoom';

test('native Chrome 200% retains Code geometry, toolbar dismissal and Preview', async ({}, testInfo) => {
  const baseURL = String(testInfo.project.use.baseURL ?? 'http://localhost:3010');
  const baseline = await isolatedNativeZoom(1);
  let before: Awaited<ReturnType<typeof zoomMetrics>>;
  try {
    const page = baseline.context.pages()[0]; await page.goto(`${baseURL}/studio/ui/blocks/code`);
    await expect(page.locator('.ui-block-specimen')).toHaveAttribute('data-ready', 'true'); before = await zoomMetrics(page);
  } finally { await baseline.close(); }
  const enlarged = await isolatedNativeZoom(2);
  try {
    const page = enlarged.context.pages()[0]; await page.goto(`${baseURL}/studio/ui/blocks/code`);
    await expect(page.locator('.ui-block-specimen')).toHaveAttribute('data-ready', 'true');
    const after = await zoomMetrics(page);
    expect(after.pixelRatio / before!.pixelRatio).toBeCloseTo(2, 1);
    expect(after.outerWidth / before!.outerWidth).toBeCloseTo(1, 1);
    expect(after.cssZoom).toBe('1');
    const input = page.getByRole('textbox', { name: 'Code', exact: true }).first();
    await input.click(); await input.fill('\tconst value = "<code>";\n' + 'long value '.repeat(40) + '\n\n');
    const pre = input.locator('..').locator('.studio-code-preview');
    const source = await input.inputValue();
    for (const property of ['font-size', 'line-height', 'padding-top', 'padding-left']) expect(await input.evaluate((node, p) => getComputedStyle(node).getPropertyValue(p), property)).toBe(await pre.evaluate((node, p) => getComputedStyle(node).getPropertyValue(p), property));
    expect((await input.boundingBox())!.height).toBeCloseTo((await pre.boundingBox())!.height, 1);
    const trigger = page.getByRole('button', { name: 'Transform Code block', exact: true });
    await trigger.click(); await expect(page.getByRole('menuitem', { name: 'Group', exact: true })).toBeVisible();
    await page.keyboard.press('Escape'); await expect(trigger).toBeFocused();
    await pre.scrollIntoViewIfNeeded();
    const session = await enlarged.context.newCDPSession(page);
    const capture = async (filename: string) => { await page.bringToFront(); await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))); const { data } = await session.send('Page.captureScreenshot', { format: 'png', fromSurface: true, captureBeyondViewport: false }); await writeFile(filename, Buffer.from(data, 'base64')); };
    await capture('/private/tmp/acm-code-native200-edit.png');
    await page.getByRole('button', { name: 'Preview', exact: true }).click();
    const preview = page.locator('.ui-block-specimen .studio-code-preview').first();
    await expect(preview.locator('code')).toHaveText(source);
    await preview.scrollIntoViewIfNeeded(); await capture('/private/tmp/acm-code-native200-preview.png');
    await writeFile('/private/tmp/acm-code-native200-metrics.json', JSON.stringify({ before, after, layout: await session.send('Page.getLayoutMetrics') }, null, 2));
    await session.detach();
  } finally { await enlarged.close(); }
});
