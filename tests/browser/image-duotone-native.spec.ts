import { expect, test } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
import { isolatedNativeZoom, zoomMetrics } from './helpers/native-zoom';

test('native Chrome 200% keeps Image Duotone toolbar placement, keyboard dismissal, pixels and Preview', async ({ browserName }, testInfo) => {
  expect(browserName).toBe("chromium");
  test.setTimeout(90_000);
  const baseURL = String(testInfo.project.use.baseURL ?? 'http://localhost:3010');
  const baseline = await isolatedNativeZoom(1); let before: Awaited<ReturnType<typeof zoomMetrics>>;
  try {
    const page = baseline.context.pages()[0]; await page.goto(`${baseURL}/studio/ui/blocks/image`);
    await expect(page.locator('.ui-block-specimen')).toHaveAttribute('data-ready', 'true'); before = await zoomMetrics(page);
  } finally { await baseline.close(); }
  const enlarged = await isolatedNativeZoom(2);
  try {
    const page = enlarged.context.pages()[0]; await page.goto(`${baseURL}/studio/ui/blocks/image`);
    await expect(page.locator('.ui-block-specimen')).toHaveAttribute('data-ready', 'true'); const after = await zoomMetrics(page);
    expect(after.pixelRatio / before!.pixelRatio).toBeCloseTo(2, 1); expect(after.innerWidth / before!.innerWidth).toBeCloseTo(.5, 1); expect(after.outerWidth).toBe(before!.outerWidth); expect(after.cssZoom).toBe('1'); expect(after.visualScale).toBe(1);
    const image = page.locator('.ui-library-canvas .image-field img').first(); await image.click();
    const trigger = page.getByRole('group', { name: 'Image block tools', exact: true }).getByRole('button', { name: 'Duotone', exact: true });
    await trigger.focus(); await trigger.press('Enter');
    const popup = page.getByRole('dialog', { name: 'Duotone', exact: true }); await expect(popup).toBeVisible();
    const box = (await popup.boundingBox())!; expect(box.x).toBeGreaterThanOrEqual(0); expect(box.x + box.width).toBeLessThanOrEqual(after.innerWidth + 1);
    await page.getByRole('button', { name: 'Duotone preset 2', exact: true }).click(); await page.keyboard.press('Escape');
    await writeFile('/private/tmp/acm-image-duotone-native-focus.json', JSON.stringify(await page.evaluate(() => ({ active: document.activeElement?.outerHTML, overlays: [...document.querySelectorAll('[role=dialog]')].map(node => node.getAttribute('aria-label')), triggers: [...document.querySelectorAll('button[aria-label=Duotone]')].map(node => ({ connected: node.isConnected, disabled: (node as HTMLButtonElement).disabled, rect: node.getBoundingClientRect().toJSON() })) })), null, 2));
    await expect(trigger).toBeFocused();
    await expect(image).toHaveAttribute('data-image-duotone-authored', 'true');
    const session = await enlarged.context.newCDPSession(page);
    const capture = async (name: string) => {
      await page.locator('.image-field').first().evaluate(node => node.scrollIntoView({ block: 'center', inline: 'nearest' }));
      await page.bringToFront(); await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
      const { data } = await session.send('Page.captureScreenshot', { format: 'png', fromSurface: true, captureBeyondViewport: false }); await writeFile(`/private/tmp/acm-image-duotone-native200-${name}.png`, Buffer.from(data, 'base64'));
    };
    await page.getByRole('button', { name: 'Image link settings', exact: true }).click();
    await page.getByRole('dialog', { name: 'Image link settings', exact: true }).getByLabel('Link destination').selectOption('lightbox'); await page.keyboard.press('Escape');
    await capture('edit'); await page.getByRole('button', { name: 'Preview', exact: true }).click();
    await expect(page.locator('.ui-block-specimen .image-field img').first()).toHaveAttribute('data-image-duotone-authored', 'true'); await capture('preview');
    const opener=page.getByRole('button',{name:/^Enlarge image:/}); await opener.click();
    const lightbox=page.locator('.image-lightbox-dialog[open] img'); await lightbox.evaluate(node=>(node as HTMLImageElement).decode());
    const bounds=(await lightbox.boundingBox())!; expect(bounds.width).toBeGreaterThan(100); expect(bounds.height).toBeGreaterThan(50); expect(bounds.width/bounds.height).toBeCloseTo(640/360,2); expect(bounds.x).toBeGreaterThanOrEqual(0); expect(bounds.x+bounds.width).toBeLessThanOrEqual(after.innerWidth);
    await expect(lightbox).toHaveAttribute('data-image-duotone-authored','true');
    const raw=await session.send('Page.captureScreenshot',{format:'png',fromSurface:true,captureBeyondViewport:false});await writeFile('/private/tmp/acm-image-duotone-native200-lightbox.png',Buffer.from(raw.data,'base64'));
    await page.keyboard.press('Escape');await expect(opener).toBeFocused();
    await writeFile('/private/tmp/acm-image-duotone-native200-metrics.json', JSON.stringify({ before, after, layout: await session.send('Page.getLayoutMetrics') }, null, 2)); await session.detach();
  } finally { await enlarged.close(); }
});
