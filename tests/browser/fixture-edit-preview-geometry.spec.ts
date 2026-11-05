import { expect, test } from '@playwright/test';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createStudioHttpFixture } from '../helpers/studio-http-fixture.mjs';
import { revisionOf } from '../../scripts/test-site-store.mjs';

test('fixture sites keep block and image geometry between Edit and Preview', async ({ browser }, testInfo) => {
  test.setTimeout(90000);
  const fixture = await createStudioHttpFixture({ frontendURL: String(testInfo.project.use.baseURL ?? 'http://localhost:3010') });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  try {
    for (const site of ['test', 'test2'] as const) {
      const sourcePath = path.join(fixture.fixtureRoots[site], 'content/site.json');
      const source = JSON.parse(await readFile(sourcePath, 'utf8'));
      source.documents[0].blocks = [
        { id: `${site}-heading`, type: 'heading', level: 2, text: 'A heading' },
        { id: `${site}-paragraph`, type: 'paragraph', text: 'A paragraph that follows the heading.' },
        { id: `${site}-image`, type: 'image', src: '/specimens/landscape.png', alt: 'Fixture landscape' },
        { id: `${site}-fixed`, type: 'image', src: '/specimens/landscape.png', alt: 'Fixed landscape', displayWidth: 320, linkDestination: 'custom', linkUrl: 'https://example.com' },
        { id: `${site}-crop`, type: 'image', src: '/specimens/landscape.png', alt: 'Cropped landscape', imageEdit: { crop: { x: .1, y: .15, width: .6, height: .5 }, sourceWidth: 1200, sourceHeight: 800, zoom: 1.4, rotation: 0, straighten: 12, flipHorizontal: true, flipVertical: false } },
        { id: `${site}-after`, type: 'paragraph', text: 'A paragraph after the image.' },
        { id: `${site}-outer-quote`, type: 'quote', text: '', attribution: 'Outer citation', children: [
          { id: `${site}-inner-quote`, type: 'quote', text: 'A nested quotation.' },
        ] },
        { id: `${site}-cover`, type: 'cover', src: '/specimens/landscape.png', alt: 'Cover', dimRatio: 50, children: [
          { id: `${site}-cover-quote`, type: 'quote', text: 'A quotation inside a cover.' },
        ] },
      ];
      await writeFile(sourcePath, JSON.stringify(source));
      await writeFile(path.join(fixture.fixtureRoots[site], "dist/index.html"), `<meta name="acm-test-revision" content="${revisionOf(source)}">`);
      const page = await context.newPage(); await page.goto(`${fixture.origin}/studio?site=${site}&library=page`);
      await expect(page.getByText('A paragraph after the image.', { exact: true })).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      const measure = (mode: 'edit' | 'preview') => page.evaluate(mode => {
        const frame = document.querySelector(mode === 'edit' ? '.block-canvas' : '.document-preview')!;
        const origin = frame.getBoundingClientRect();
        const selector = mode === 'edit' ? '.canvas-blocks > .block-position > .canvas-block' : '.studio-block-preview > .content-block';
        return [...frame.querySelectorAll(selector)].map(element => {
          const bounds = element.getBoundingClientRect(); const image = element.querySelector('img, svg[role=img]'); const imageBounds = image?.getBoundingClientRect();
          return { x: bounds.x - origin.x, y: bounds.y - origin.y, width: bounds.width, height: bounds.height, imageWidth: imageBounds?.width ?? null, imageHeight: imageBounds?.height ?? null };
        });
      }, mode);
      // The fixture has no reference-image width rule: removing the crop marker
      // reproduces the intrinsic-width editor surface that caused the shift.
      const cropWidths = await page.locator(`[data-studio-block-anchor-id="${site}-crop"] .image-resize-surface`).evaluate(surface => {
        const corrected = surface.getBoundingClientRect().width;
        surface.removeAttribute('data-image-cropped');
        const intrinsic = surface.getBoundingClientRect().width;
        surface.setAttribute('data-image-cropped', 'true');
        return { corrected, intrinsic };
      });
      expect(cropWidths.corrected).toBeGreaterThan(cropWidths.intrinsic);
      const edit = await measure('edit');
      await page.getByRole('group', { name: 'Page view' }).getByRole('button', { name: 'Preview', exact: true }).click();
      const preview = await measure('preview'); expect(edit).toHaveLength(8); expect(preview).toHaveLength(edit.length);
      for (let index = 0; index < edit.length; index++) for (const key of ['x', 'y', 'width', 'height', 'imageWidth', 'imageHeight'] as const) {
        const before = edit[index][key], after = preview[index][key];
        if (before === null || after === null) expect(after, `${site} block ${index} ${key}`).toBe(before);
        else expect(after, `${site} block ${index} ${key}`).toBeCloseTo(before, 1);
      }
      await page.getByRole('group', { name: 'Page view' }).getByRole('button', { name: 'Edit', exact: true }).click();
      const coverQuote = page.locator(`.cover-child-block[data-studio-nested-block-id="${site}-cover-quote"]`);
      await coverQuote.click({ position: { x: 2, y: 2 } });
      const toolbar = page.getByRole('group', { name: 'Quote block tools', exact: true });
      await toolbar.getByRole('button', { name: 'Add citation', exact: true }).click();
      await expect(coverQuote.locator('.quote-citation-editor')).toBeVisible();
      await toolbar.getByRole('button', { name: 'Remove citation', exact: true }).click();
      await expect(coverQuote.locator('.quote-citation-editor')).toHaveCount(0);
      await page.close();
    }
  } finally { await context.close(); await fixture.close(); }
});
