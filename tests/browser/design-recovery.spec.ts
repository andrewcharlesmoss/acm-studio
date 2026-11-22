import { expect, test } from '@playwright/test';

test('copied and new pages do not inherit media, and Delete page preserves the export selection', async ({ page }) => {
  const date = '2026-11-22T00:00:00.000Z';
  const pageA = { id: 'a', name: 'Cover', width: 300, height: 200, background: { kind: 'solid', colour: '#ffffff' }, objects: [], renderedMediaId: 'cover-render' };
  const design = { id: 'design-test', name: 'Recovery', format: 'acm-studio-design', version: 1, createdAt: date, updatedAt: date, activePageId: 'a', assets: [], pages: [pageA] };
  await page.addInitScript(value => {
    if (!localStorage.getItem('acm-studio-designs-v1')) localStorage.setItem('acm-studio-designs-v1', JSON.stringify([value]));
  }, design);
  await page.goto('/studio/designs');
  const duplicate = page.getByRole('button', { name: 'Duplicate Cover', exact: true });
  await expect(duplicate).toBeEnabled();
  await duplicate.click();
  const savedPages = () => page.evaluate(() => JSON.parse(localStorage.getItem('acm-studio-designs-v1')!)[0].pages as {name: string; renderedMediaId?: string}[]);
  await expect.poll(async () => (await savedPages()).map(p => [p.name, p.renderedMediaId ?? null])).toEqual([['Cover', 'cover-render'], ['Cover copy', null]]);
  await page.getByRole('button', { name: 'Open Cover', exact: true }).click();
  await page.getByRole('button', { name: 'Add page', exact: true }).first().click();
  await expect.poll(async () => (await savedPages()).length).toBe(3);
  expect((await savedPages())[2].renderedMediaId).toBeUndefined();
  await page.getByRole('checkbox', { name: 'Select Cover for export or deletion', exact: true }).check();
  await page.getByRole('button', { name: 'Delete page', exact: true }).click();
  await expect.poll(async () => (await savedPages()).map(p => p.name)).toEqual(['Cover', 'Cover copy']);
  await page.getByRole('button', { name: 'Open Cover copy', exact: true }).click();
  await page.getByRole('checkbox', { name: 'Select Cover copy for export or deletion', exact: true }).check();
  await page.getByRole('button', { name: 'Delete 1 selected page (keep active page)', exact: true }).click();
  await expect.poll(async () => (await savedPages()).map(p => p.name)).toEqual(['Cover copy']);
});

test('an already-exported 101-page design reopens, drops external render links and exports an editable round trip', async ({ page }) => {
  const date = '2026-11-22T00:00:00.000Z';
  const pages = Array.from({ length: 101 }, (_, i) => ({ id: 'page-' + i, name: 'Page ' + (i + 1), width: 20, height: 20, background: { kind: 'solid', colour: '#ffffff' }, objects: [], renderedMediaId: 'old-local-file' }));
  const design = { id: 'legacy-design', name: 'Recovered', format: 'acm-studio-design', version: 1, createdAt: date, updatedAt: date, activePageId: 'page-0', assets: [], pages };
  await page.goto('/studio/designs');
  await page.getByLabel('Import design').setInputFiles({ name: 'legacy.acm-design.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(design, null, 2)) });
  await expect(page.getByRole('button', { name: 'Open Page 101', exact: true })).toBeAttached();
  await page.getByRole('tab', { name: 'Export', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Update linked media' })).toHaveCount(0);
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Editable backup', exact: true }).click();
  const stream = await (await download).createReadStream();
  const chunks = [];
  for await (const chunk of stream!) chunks.push(chunk);
  const restored = JSON.parse(Buffer.concat(chunks).toString());
  expect(restored.pages.map((p: { id: string }) => p.id)).toEqual(pages.map(p => p.id));
  expect(restored.pages.every((p: { renderedMediaId?: string }) => !p.renderedMediaId)).toBe(true);
});

test('saving a render while another page is added preserves the edit and links just the rendered page', async ({ page }) => {
  await page.goto('/studio/designs');
  const add = page.getByRole('button', { name: 'Add page', exact: true }).first();
  await expect(add).toBeEnabled();
  await page.getByRole('tab', { name: 'Home', exact: true }).click();
  await page.evaluate(() => {
    const original = HTMLCanvasElement.prototype.toBlob;
    HTMLCanvasElement.prototype.toBlob = function (callback, type, quality) {
      HTMLCanvasElement.prototype.toBlob = original;
      original.call(this, blob => {
        document.body.setAttribute('data-render-paused', 'true');
        document.addEventListener('finish-test-render', () => callback(blob), { once: true });
      }, type, quality);
    };
  });
  await page.getByRole('button', { name: 'Save to Studio media', exact: true }).click();
  await expect(page.locator('body')).toHaveAttribute('data-render-paused', 'true');
  await add.click();
  await page.evaluate(() => document.dispatchEvent(new Event('finish-test-render')));
  const stored = () => page.evaluate(() => JSON.parse(localStorage.getItem('acm-studio-designs-v1')!)[0].pages);
  await expect.poll(async () => (await stored()).map((p: {renderedMediaId?: string}) => Boolean(p.renderedMediaId))).toEqual([true, false]);
  await page.getByRole('tab', { name: 'Export', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Update linked media', exact: true })).toHaveCount(0);
});

test('retrying a failed source-link save reuses the image already committed to Files', async ({ page }) => {
  await page.goto('/studio/designs');
  const save = page.getByRole('button', { name: 'Save to Studio media', exact: true });
  await expect(save).toBeEnabled();
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === 'acm-studio-designs-v1' && value.includes('"renderedMediaId"')) {
        Storage.prototype.setItem = original;
        throw new DOMException('Simulated quota error', 'QuotaExceededError');
      }
      original.call(this, key, value);
    };
  });
  await save.click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Use Other Change' }).click();
  await expect(page.getByText('The rendered image is in Files.', { exact: false }).first()).toBeVisible();
  const retry = page.getByRole('button', { name: 'Retry source link', exact: true });
  await expect(retry).toBeEnabled();
  const imageIds = () => page.evaluate(() => new Promise<IDBValidKey[]>((resolve, reject) => {
    const open = indexedDB.open('acm-studio-media');
    open.onsuccess = () => {
      const db = open.result;
      const tx = db.transaction('assets-v3', 'readonly');
      const request = tx.objectStore('assets-v3').getAllKeys();
      tx.oncomplete = () => { db.close(); resolve(request.result); };
      tx.onabort = () => { db.close(); reject(tx.error); };
    };
    open.onerror = () => reject(open.error);
  }));
  const ids = await imageIds();
  expect(ids).toHaveLength(1);
  await retry.click();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('acm-studio-designs-v1')!)[0].pages[0].renderedMediaId)).toBe(ids[0]);
  expect(await imageIds()).toEqual(ids);
});

test('oversized image collections export a complete source and independently importable sections', async ({ page }) => {
  await page.addInitScript(() => {
    if (localStorage.getItem('acm-studio-designs-v1')) return;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 4096;
    const dataUrl = canvas.toDataURL('image/png');
    const assets = Array.from({ length: 3 }, (_, i) => ({ id: 'asset' + i, type: 'image/png', dataUrl, width: 4096, height: 4096, name: 'image' + i }));
    const pages = assets.map((asset, i) => ({ id: 'page' + i, name: 'Page ' + (i + 1), width: 200, height: 100, background: { kind: 'solid', colour: '#ffffff' }, objects: [{ id: 'image' + i, type: 'image', assetId: asset.id, x: 0, y: 0, width: 100, height: 100, rotation: 0, opacity: 1 }] }));
    const date = new Date().toISOString();
    const design = { id: 'big-design', format: 'acm-studio-design', version: 1, activePageId: pages[0].id, name: 'Large design', createdAt: date, updatedAt: date, pages, assets };
    localStorage.setItem('acm-studio-designs-v1', JSON.stringify([design]));
  });
  await page.goto('/studio/designs');
  await page.getByRole('tab', { name: 'Export', exact: true }).click();
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Editable backup', exact: true }).click();
  const download = await pending;
  expect(download.suggestedFilename()).toBe('large-design-recovery.zip');
  const chunks = [];
  for await (const chunk of (await download.createReadStream())!) chunks.push(chunk);
  const bytes = Buffer.concat(chunks);
  const sections = new Map<string, Buffer>();
  for (let at = 0; bytes.readUInt32LE(at) === 0x04034b50;) {
    const size = bytes.readUInt32LE(at + 18);
    const length = bytes.readUInt16LE(at + 26);
    const start = at + 30 + length + bytes.readUInt16LE(at + 28);
    sections.set(bytes.toString('utf8', at + 30, at + 30 + length), bytes.subarray(start, start + size));
    at = start + size;
  }
  const original = JSON.parse(sections.get('complete-source.json')!.toString());
  expect(original.assets).toHaveLength(3);
  const importedPages: string[] = [];
  for (const [name, buffer] of sections) {
    if (!name.endsWith('.acm-design.json')) continue;
    await page.getByLabel('Import design').setInputFiles({ name, mimeType: 'application/json', buffer });
    const expected = JSON.parse(buffer.toString());
    importedPages.push(...expected.pages.map((p: { id: string }) => p.id));
    await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('acm-studio-designs-v1')!).at(-1)?.pages.map((p: { id: string }) => p.id))).toEqual(expected.pages.map((p: { id: string }) => p.id));
  }
  expect(importedPages).toEqual(original.pages.map((p: { id: string }) => p.id));
});
