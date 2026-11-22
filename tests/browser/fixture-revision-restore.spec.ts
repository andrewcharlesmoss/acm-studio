import { expect, test } from '@playwright/test';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createStudioHttpFixture } from '../helpers/studio-http-fixture.mjs';

test('Revisions restores an earlier fixture page and preserves its source when history is invalid', async ({ page }, testInfo) => {
  test.setTimeout(60000);
  page.setDefaultTimeout(10000);
  await page.setViewportSize({ width: 1440, height: 1000 });
  const fixture = await createStudioHttpFixture({ frontendURL: testInfo.project.use.baseURL });
  let releaseTemplates = () => {};
  try {
    const gateway = fixture.origin + '/__studio/test-site';
    const headers: Record<string, string> = { Origin: fixture.origin, 'X-Studio-Client': 'codex-history' };
    const request = async (action: string, payload = {}) => {
      const response = await page.request.post(gateway, { headers, data: { siteId: 'test', action, ...payload } });
      expect(response.ok(), await response.text()).toBe(true);
      return response.json();
    };
    const connected = await request('connect');
    headers['X-Studio-Test-Token'] = connected.token;
    await request('claim');
    const previous = connected.document.documents[0];
    const blocks = [{ id: 'grid', type: 'group', layout: 'grid', columns: 8, children: [{ id: 'caption', type: 'paragraph', text: 'Current eight-column layout' }] }];
    const saved = await request('save', { baseRevision: connected.revision, document: { ...connected.document, documents: [{ ...previous, blocks }] } });
    await request('release');

    const templatesReady = new Promise<void>(resolve => { releaseTemplates = resolve; });
    await page.route(gateway, async route => {
      const body = route.request().postDataJSON();
      if (body?.action === 'global-read' && body.initialise) await templatesReady;
      await route.continue();
    });
    await page.goto(fixture.origin + '/studio?site=test&library=page&documentId=test-home');
    await expect(page.getByText('Current eight-column layout', { exact: true })).toBeVisible();
    await page.getByRole('tab', { name: 'Page', exact: true }).click();
    const revisions = page.getByRole('button', { name: /^Revisions:/ });
    await revisions.click();
    const dialog = page.getByRole('dialog', { name: /Compare revisions/ });
    const restore = dialog.getByRole('button', { name: 'Restore This Revision' });
    await expect(restore).toBeDisabled();
    await dialog.getByRole('button', { name: 'Previous' }).click();
    await expect(restore).toBeDisabled();
    releaseTemplates();
    await expect(restore).toBeEnabled({ timeout: 20000 });
    const acknowledgement = page.waitForResponse(response => response.url() === gateway && response.request().postDataJSON()?.action === 'save');
    await restore.click();
    const result = await (await acknowledgement).json();
    expect(result.document.documents[0].blocks).toEqual(previous.blocks);
    expect(result.revision).toBe(result.previewRevision);
    await expect(dialog).toHaveCount(0);
    await expect(page.getByText(previous.blocks[0].text, { exact: true })).toBeVisible();
    const sourcePath = path.join(fixture.fixtureRoots.test, 'content/site.json');
    const restoredBytes = await readFile(sourcePath, 'utf8');
    expect(JSON.parse(restoredBytes).documents[0].blocks).toEqual(previous.blocks);
    await page.reload();
    await expect(page.getByText(previous.blocks[0].text, { exact: true })).toBeVisible();

    // The real gateway rejects a damaged saved-version marker on the next browse.
    const marker = path.join(fixture.fixtureRoots.test, '.studio/history', saved.revision + '.saved.json');
    await page.getByRole('tab', { name: 'Page', exact: true }).click();
    await writeFile(marker, JSON.stringify({ version: 1, revision: saved.revision, savedAt: 'invalid' }));
    await revisions.click();
    await expect(dialog.getByRole('alert')).toContainText('Saved revision metadata is invalid');
    await expect(restore).toHaveCount(0);
    await dialog.getByRole('button', { name: 'Go to Editor' }).click();
    await expect(page.getByText(previous.blocks[0].text, { exact: true })).toBeVisible();
    expect(await readFile(sourcePath, 'utf8')).toBe(restoredBytes);
    expect(await readFile(path.join(fixture.fixtureRoots.test2, 'content/site.json'), 'utf8')).toBe(fixture.initialSources[1]);
  } finally {
    releaseTemplates();
    await fixture.close();
  }
});
