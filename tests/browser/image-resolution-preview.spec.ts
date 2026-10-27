import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { loadProductionModule } from '../production-module.mjs';

test('canonical Image preview renders the selected size or its unavailable state', async ({ page }) => {
  const { BlockRenderer } = await loadProductionModule(new URL('../../app/components/blocks/block-renderer.tsx', import.meta.url));
  const { imageRenditionResourceKey } = await loadProductionModule(new URL('../../app/content/image-resolution.ts', import.meta.url));
  const pin = { key: 'medium', sourceDigest: 'a'.repeat(64), renditionDigest: 'b'.repeat(64) };
  const block = { id: 'image', type: 'image', src: '', mediaId: 'media', alt: 'Landscape', caption: 'Caption', imageResolution: pin };
  const originals = { media: 'https://example.test/original.png' };
  const renditions = { [imageRenditionResourceKey('media', pin)]: 'https://example.test/medium.png' };
  const selected = renderToStaticMarkup(createElement(BlockRenderer, { blocks: [block], mediaUrls: originals, imageRenditionUrls: renditions, variant: 'studio' }));
  const missing = renderToStaticMarkup(createElement(BlockRenderer, { blocks: [block], mediaUrls: originals, variant: 'studio' }));
  const css = await readFile('app/studio/studio.css', 'utf8');
  const fixture = await readFile('public/specimens/landscape.png');
  await page.route('https://example.test/**', route => route.fulfill({ contentType: 'image/png', body: fixture }));
  for (const width of [1440, 820, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.setContent(`<style>${css}</style><main class="studio-block-preview">${selected}${missing}</main>`);
    const image = page.getByRole('img', { name: 'Landscape' });
    await expect(image).toHaveAttribute('src', 'https://example.test/medium.png');
    await expect(image).toBeVisible();
    await expect(page.getByText('The selected image size is unavailable.')).toBeVisible();
    await expect(page.locator('img[src="https://example.test/original.png"]')).toHaveCount(0);
    await page.screenshot({ path: `/private/tmp/acm-image-size-preview-${width}.png` });
  }
});
