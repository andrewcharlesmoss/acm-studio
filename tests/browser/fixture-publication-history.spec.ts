import { expect, test, type Page } from '@playwright/test';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { revisionOf } from '../../scripts/test-site-store.mjs';
import { createStudioHttpFixture } from '../helpers/studio-http-fixture.mjs';
import type { CurrentTestSiteCollection } from '../../app/studio/test-site/contract';

for (const site of ['test', 'test2'] as const) for (const kind of ['post', 'page'] as const) {
  test(`editor history keeps a withdrawn ${site} ${kind} out of the saved local reader`, async ({ page, browser, baseURL }) => {
    test.setTimeout(60000);
    const fixture = await createStudioHttpFixture({ frontendURL: baseURL });
    try {
      const sourcePath = path.join(fixture.fixtureRoots[site], 'content/site.json');
      const outputPath = path.join(fixture.fixtureRoots[site], 'dist/index.html');
      const readSource = async (): Promise<CurrentTestSiteCollection> => JSON.parse(await readFile(sourcePath, 'utf8'));
      const source = await readSource();
      const id = `${site}-history-${kind}`;
      const original = 'history-original', middle = 'history-middle', edited = 'history-edited';
      source.documents.push({ ...source.documents[0], id, kind, title: 'History check', slug: original, status: 'draft', blocks: [] });
      source.activeDocumentId = id;
      await writeFile(sourcePath, JSON.stringify(source));
      await writeFile(outputPath, `<meta name="acm-test-revision" content="${revisionOf(source)}">`);

      const url = `${fixture.origin}/studio?site=${site}&library=${kind}&documentId=${id}`;
      const ready = page.waitForResponse(async response =>
        response.url().endsWith('/__studio/test-site') && response.ok()
        && response.request().postDataJSON()?.action === 'global-read'
        && response.request().postDataJSON()?.initialise === false
        && (await response.json()).initialised === true);
      await Promise.all([ready, page.goto(url)]);
      const button = (name: string) => page.getByRole('button', { name, exact: true });
      const status = (value: string) => page.locator('.document-properties').getByRole('button', { name: value, exact: true });
      await expect(page.locator('.block-editor')).toHaveAttribute('data-studio-document-id', id);
      await expect(button('Slug ' + original)).toBeEnabled();
      await status('Draft').click();
      await page.getByRole('radio', { name: /^Published\b/ }).click();
      const publishedMarker = `data-test-document="${id}"`;
      await expect.poll(async () => (await readFile(outputPath, 'utf8')).includes(publishedMarker)).toBe(true);

      // Keep a Published entry on either side of the current edit before withdrawal.
      async function changeSlug(from: string, to: string) {
        await button('Slug ' + from).click();
        await page.getByRole('textbox', { name: 'Slug', exact: true }).fill(to);
        await button('Close slug').click();
      }
      await changeSlug(original, middle);
      await changeSlug(middle, edited);
      await button('Undo').click();
      await expect(button('Slug ' + middle)).toBeVisible();
      await status('Published').click();
      await page.getByRole('radio', { name: /^Pending\b/ }).click();

      async function expectWithdrawn(editor: Page, slug: string) {
        await expect(editor.locator('.document-properties').getByRole('button', { name: 'Pending', exact: true })).toBeVisible();
        await expect(editor.getByRole('button', { name: 'Slug ' + slug, exact: true })).toBeVisible();
        await expect.poll(async () => {
          const saved = await readSource();
          const document = saved.documents.find(item => item.id === id);
          return [document?.status, document?.slug, saved.publications.some(item => item.document.id === id)];
        }).toEqual(['pending', slug, false]);
        await expect.poll(async () => {
          const html = await readFile(outputPath, 'utf8');
          return [html.includes(`data-test-document="${source.homeDocumentId}"`), html.includes(publishedMarker)];
        }).toEqual([true, false]);
      }

      async function applyHistory(action: 'Undo' | 'Redo', slug: string) {
        await button(action).click();
        await expect(status('Pending')).toBeVisible();
        await button('Save Draft').click();
        await expectWithdrawn(page, slug);
      }
      await expectWithdrawn(page, middle);
      await applyHistory('Undo', original);
      await applyHistory('Redo', middle);
      await applyHistory('Redo', edited);

      await page.close();
      const reopened = await browser.newPage();
      try {
        await reopened.goto(url);
        await expectWithdrawn(reopened, edited);
      } finally {
        await reopened.close();
      }
    } finally {
      await fixture.close();
    }
  });
}
