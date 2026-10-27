import { chromium, expect, test, type BrowserContext, type Page } from '@playwright/test';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

async function isolatedNativeZoom(zoom: number) {
  const directory = await mkdtemp(path.join(tmpdir(), 'acm-quote-native-zoom-'));
  await mkdir(path.join(directory, 'Default'));
  // Chromium registers partition.default_zoom_level as a dictionary. Its
  // default partition key is x, and zoom levels use powers of 1.2.
  // chrome/common/pref_names.h and chrome/browser/ui/zoom/chrome_zoom_level_prefs.cc
  const level = Math.log(zoom) / Math.log(1.2);
  await writeFile(path.join(directory, 'Default', 'Preferences'), JSON.stringify({ partition: { default_zoom_level: { x: level } } }));
  let context: BrowserContext | undefined;
  try {
    context = await chromium.launchPersistentContext(directory, { channel: 'chrome', headless: true, viewport: null, args: ['--window-size=1440,1000'] });
    return { context, close: async () => { await context!.close(); await rm(directory, { recursive: true, force: true }); } };
  } catch (error) {
    await context?.close();
    await rm(directory, { recursive: true, force: true });
    throw error;
  }
}

async function zoomMetrics(page: Page) {
  return page.evaluate(() => ({
    pixelRatio: window.devicePixelRatio,
    innerWidth: window.innerWidth,
    outerWidth: window.outerWidth,
    visualScale: window.visualViewport?.scale,
    cssZoom: getComputedStyle(document.documentElement).zoom,
  }));
}

async function captureNativeViewport(context: BrowserContext, page: Page, filename: string) {
  await page.bringToFront();
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  const session = await context.newCDPSession(page);
  try {
    // Do not supply a clip or a device/scale override: capture Chrome's actual
    // visible surface with the already verified native zoom still applied.
    const { data } = await session.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false, fromSurface: true });
    await writeFile(filename, Buffer.from(data, 'base64'));
    const geometry = await page.evaluate(() => {
      const heading = [...document.querySelectorAll('.ui-block-canvas .heading-field')].find(node => node.textContent?.includes('An inherited Quote heading'));
      const box = heading?.getBoundingClientRect();
      return { visibility: document.visibilityState, scrollX, scrollY, innerWidth, innerHeight, heading: box?.toJSON(), colour: heading && getComputedStyle(heading).color, atHeading: box && document.elementFromPoint(box.x + 5, box.y + 5)?.getAttribute('class') };
    });
    await writeFile(filename.replace(/\.png$/, '-geometry.json'), JSON.stringify({ geometry, layout: await session.send('Page.getLayoutMetrics') }, null, 2));
  } finally { await session.detach(); }
}

test('native Chrome 200% zoom preserves Quote editing, preview, spacing and colour', async ({ browserName }, testInfo) => {
  expect(browserName).toBe('chromium');
  test.setTimeout(90_000);
  const baseURL = String(testInfo.project.use.baseURL ?? 'http://localhost:3010');
  const baseline = await isolatedNativeZoom(1);
  let before: Awaited<ReturnType<typeof zoomMetrics>>;
  try {
    const page = baseline.context.pages()[0] ?? await baseline.context.newPage();
    await page.goto(`${baseURL}/studio/ui/blocks/quote`);
    await expect(page.locator('.ui-block-specimen')).toHaveAttribute('data-ready', 'true');
    before = await zoomMetrics(page);
  } finally { await baseline.close(); }

  const enlarged = await isolatedNativeZoom(2);
  try {
    const page = enlarged.context.pages()[0] ?? await enlarged.context.newPage();
    await page.goto(`${baseURL}/studio/ui/blocks/quote`);
    await expect(page.locator('.ui-block-specimen')).toHaveAttribute('data-ready', 'true');
    const after = await zoomMetrics(page);
    // These checks prove that Chrome applied native browser zoom. CSS zoom or
    // a simulated narrow viewport cannot satisfy the pixel-ratio comparison.
    expect(after.pixelRatio / before!.pixelRatio).toBeCloseTo(2, 1);
    expect(after.outerWidth / before!.outerWidth).toBeCloseTo(1, 1);
    expect(after.innerWidth / before!.innerWidth).toBeCloseTo(0.5, 1);
    expect(after.visualScale).toBeCloseTo(1, 1);
    expect(['1', 'normal']).toContain(after.cssZoom);
    const metrics = JSON.stringify({ before, after }, null, 2);
    const metricsPath = testInfo.outputPath('native-zoom-metrics.json');
    await mkdir(path.dirname(metricsPath), { recursive: true });
    await writeFile(metricsPath, metrics);
    await writeFile('/private/tmp/acm-quote-native200-metrics.json', metrics);
    await testInfo.attach('native-zoom-metrics', { path: metricsPath, contentType: 'application/json' });

    await page.getByRole('group', { name: 'Select an example block', exact: true }).getByRole('button', { name: 'Quote', exact: true }).nth(2).click();
    await page.getByRole('button', { name: 'Dimensions options', exact: true }).click();
    await page.getByRole('group', { name: 'Dimensions controls', exact: true }).getByRole('button', { name: 'Block spacing', exact: true }).click();
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Block spacing Top custom value', exact: true }).click();
    const spacing = page.getByRole('spinbutton', { name: 'Block spacing Top value', exact: true });
    await spacing.fill('24'); await spacing.press('Enter');
    await page.getByRole('button', { name: 'Elements options', exact: true }).click();
    await page.getByRole('group', { name: 'Elements controls', exact: true }).getByRole('button', { name: 'Heading', exact: true }).click();
    await page.keyboard.press('Escape');
    const colourTrigger = page.getByRole('button', { name: 'Choose Heading colour', exact: true });
    await colourTrigger.click();
    await page.getByRole('button', { name: 'Custom heading colour picker', exact: true }).click();
    const colour = page.getByRole('textbox', { name: 'Hex colour', exact: true });
    await colour.fill('123456'); await colour.press('Enter');
    await page.getByRole('button', { name: 'Close custom colour picker', exact: true }).click();
    await page.keyboard.press('Escape');
    await expect(colourTrigger).toBeFocused();

    const quote = () => page.locator('.ui-block-canvas .quote-field').filter({ hasText: 'Quote presentation body.' }).first();
    const heading = () => quote().locator('.heading-field').filter({ hasText: 'An inherited Quote heading' });
    const gap = async () => {
      const children = quote().locator(':scope > blockquote > .quote-body-block');
      const first = await children.nth(0).boundingBox(), second = await children.nth(1).boundingBox();
      return Math.round(second!.y - first!.y - first!.height);
    };
    await expect(heading()).toHaveCSS('color', 'rgb(18, 52, 86)');
    expect(await gap()).toBe(24);
    // Element clipping returned blank crops at native zoom in this harness.
    // Capture the visible browser surface without a clip instead.
    await heading().evaluate(node => node.scrollIntoView({ block: 'center', inline: 'nearest' }));
    await expect(heading()).toBeInViewport({ ratio: 0.5 });
    await page.screenshot({ path: '/private/tmp/acm-quote-native200-edit-playwright.png' });
    await captureNativeViewport(enlarged.context, page, '/private/tmp/acm-quote-native200-edit.png');
    await page.getByRole('button', { name: 'Preview', exact: true }).click();
    await expect(heading()).toHaveCSS('color', 'rgb(18, 52, 86)');
    expect(await gap()).toBe(24);
    await heading().evaluate(node => node.scrollIntoView({ block: 'center', inline: 'nearest' }));
    await expect(heading()).toBeInViewport({ ratio: 0.5 });
    await page.screenshot({ path: '/private/tmp/acm-quote-native200-preview-playwright.png' });
    await captureNativeViewport(enlarged.context, page, '/private/tmp/acm-quote-native200-preview.png');
    expect((await zoomMetrics(page)).pixelRatio / before!.pixelRatio).toBeCloseTo(2, 1);
  } finally { await enlarged.close(); }
});
