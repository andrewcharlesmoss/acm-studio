import { chromium, type BrowserContext, type Page } from "@playwright/test";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

export async function isolatedNativeZoom(zoom: number) {
  const directory = await mkdtemp(path.join(tmpdir(), 'acm-studio-native-zoom-'));
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

export async function zoomMetrics(page: Page) {
  return page.evaluate(() => ({
    pixelRatio: window.devicePixelRatio,
    innerWidth: window.innerWidth,
    outerWidth: window.outerWidth,
    visualScale: window.visualViewport?.scale,
    cssZoom: getComputedStyle(document.documentElement).zoom,
  }));
}
