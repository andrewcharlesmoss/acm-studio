import { expect, test } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
import { isolatedNativeZoom, zoomMetrics } from './helpers/native-zoom';

test('native Chrome 200% preserves Table Columns wrapping, focus and Preview', async ({ browserName }, testInfo) => {
  expect(browserName).toBe('chromium');
  const baseURL = String(testInfo.project.use.baseURL ?? 'http://localhost:3010');
  const baseline = await isolatedNativeZoom(1);
  let before: Awaited<ReturnType<typeof zoomMetrics>>;
  try {
    const page = baseline.context.pages()[0]; await page.goto(`${baseURL}/studio/ui/blocks/table`);
    await expect(page.locator('.ui-block-specimen')).toHaveAttribute('data-ready', 'true'); before = await zoomMetrics(page);
  } finally { await baseline.close(); }
  const enlarged = await isolatedNativeZoom(2);
  try {
    const page = enlarged.context.pages()[0]; await page.goto(`${baseURL}/studio/ui/blocks/table`);
    await expect(page.locator('.ui-block-specimen')).toHaveAttribute('data-ready', 'true');
    const after = await zoomMetrics(page);
    expect(after.pixelRatio / before!.pixelRatio).toBeCloseTo(2, 1);
    expect(after.innerWidth / before!.innerWidth).toBeCloseTo(0.5, 1);
    expect(after.outerWidth / before!.outerWidth).toBeCloseTo(1, 1);
    expect(after.cssZoom).toBe('1'); expect(after.visualScale).toBeCloseTo(1, 1);
    const cell = page.locator('[data-studio-block-id="table-populated"][data-table-cell-row="1"][data-table-cell-column="0"]');
    await cell.click();
    const trigger = page.getByRole('button', { name: 'Transform Table block', exact: true });
    await trigger.focus(); await trigger.press('Enter');
    await expect(page.getByRole('menuitem', { name: 'Columns', exact: true })).toBeVisible();
    await page.keyboard.press('Escape'); await expect(trigger).toBeFocused();
    await trigger.press('Enter'); await page.getByRole('menuitem', { name: 'Columns', exact: true }).focus(); await page.keyboard.press('Enter');
    await expect(page.getByRole('group', { name: 'Columns block', exact: true }).filter({ has: cell })).toBeVisible();
    await expect(cell.locator('strong,b')).toHaveText('Library profiles');
    const table = cell.locator('xpath=ancestor::figure[1]');
    const session = await enlarged.context.newCDPSession(page);
    const capture = async (filename: string) => { await page.bringToFront(); await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))); const { data } = await session.send('Page.captureScreenshot', { format: 'png', fromSurface: true, captureBeyondViewport: false }); await writeFile(filename, Buffer.from(data, 'base64')); };
    await table.scrollIntoViewIfNeeded(); await capture('/private/tmp/acm-table-native200-edit.png');
    await page.getByRole('button', { name: 'Preview', exact: true }).click();
    const preview = page.locator('.ui-block-specimen .content-table').first();
    await expect(preview).toContainText('Library profiles');
    const figure = preview.locator('xpath=ancestor::figure[1]');
    await figure.evaluate(node => node.scrollIntoView({ block: 'center', inline: 'nearest' }));
    await expect(figure.locator('figcaption')).toBeInViewport();
    await capture('/private/tmp/acm-table-native200-preview.png');
    await writeFile('/private/tmp/acm-table-native200-metrics.json', JSON.stringify({ before, after, layout: await session.send('Page.getLayoutMetrics') }, null, 2));
    await session.detach();
  } finally { await enlarged.close(); }
});
