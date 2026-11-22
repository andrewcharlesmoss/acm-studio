import { expect, test } from '@playwright/test';
import { buildMediaAdapter } from './helpers/media-adapter';

declare global { interface Window { StudioMediaAdapter: typeof import('./fixtures/media-store-adapter') } }

for (const version of [6, 37] as const) test(`backup v${version} recovery survives real IndexedDB restore and re-export`, async ({ page }) => {
  const source = await buildMediaAdapter();
  await page.route('**/*', route => route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>Backup restore</title>' }));
  await page.goto('http://localhost:3011/');
  await page.addScriptTag({ content: source });
  const result = await page.evaluate(async (version) => {
    const { studioWriteOwnership: owner, mediaStore: store, backupStore: backups, createDocument } = window.StudioMediaAdapter;
    const release = owner.acquire(token => owner.loaded(token, true));
    for (let pass = 0; pass < 100 && !owner.canWrite(); pass++) await new Promise(resolve => setTimeout(resolve, 0));
    if (!owner.canWrite()) throw new Error('The live owner is unavailable.');
    await store.ensureMediaGeneration();
    const document = createDocument('page', 'recovery-page');
    const input = { format: 'acm-studio-backup', version, exportedAt: '2026-11-05T00:00:00Z',
      workspace: { version: 59, documents: [document], categories: [], bin: [], activeDocumentId: document.id }, publications: null,
      media: { folders: [], assets: [{ id: 'legacy-file', name: 'Legacy.txt', type: 'text/plain', size: 1, dataBase64: 'eA==', folderId: null, altText: '', caption: '', createdAt: '2026-11-05T00:00:00Z', updatedAt: '2026-11-05T00:00:00Z',
        sourceRevision: version === 6 ? { foreign: [null, false, 42] } : 'valid-old-revision', backupRecovery: { version: 1, previousValue: ['foreign existing field'] } }] } };
    const unchanged = JSON.stringify(input);
    const validated = backups.validateStudioBackup(input);
    await backups.restoreStudioBackup(validated);
    const restored = await store.getMediaAsset('legacy-file');
    if (!restored) throw new Error('The restored file is missing.');
    const exported = await backups.createStudioBackup(validated.workspace);
    const reimported = await backups.readStudioBackup(new File([JSON.stringify(exported)], 'roundtrip.json', { type: 'application/json' }));
    const preparedAgain = await backups.prepareStudioBackupRestore(reimported);
    const read = await store.listMediaLibrary();
    const paused = owner.getState() === 'blocked';
    release();
    return { paused, version: exported.version, bytes: await restored.blob.text(), recovery: restored.backupRecovery,
      exportedRecovery: exported.media.assets[0].backupRecovery, repeatedRecovery: preparedAgain.assets[0].backupRecovery,
      activeRevision: restored.sourceRevision, repeatedRevision: preparedAgain.assets[0].sourceRevision, unchanged: JSON.stringify(input) === unchanged,
      storedCount: read.assets.length };
  }, version);
  expect(result).toMatchObject({ paused: true, version: 47, bytes: 'x', unchanged: true, storedCount: 1 });
  const expected = { version: 1, ...(version === 6 ? { sourceRevision: { foreign: [null, false, 42] } } : {}), previousValue: { version: 1, previousValue: ['foreign existing field'] } };
  expect(result.recovery).toEqual(expected);
  expect(result.exportedRecovery).toEqual(expected);
  expect(result.repeatedRecovery).toEqual(expected);
  expect(result.repeatedRevision).toBe(result.activeRevision);
  expect(result.activeRevision).toMatch(version === 6 ? /^[a-f0-9-]{36}$/ : /^valid-old-revision$/);
});

test('live media edits preserve recovery metadata and export wraps an unowned stored field', async ({ page }) => {
  const source = await buildMediaAdapter();
  await page.route('**/*', route => route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>Backup metadata</title>' }));
  await page.goto('http://localhost:3011/');
  await page.addScriptTag({ content: source });
  const result = await page.evaluate(async () => {
    const { studioWriteOwnership: owner, mediaStore: store, backupStore: backups, createDocument } = window.StudioMediaAdapter;
    const release = owner.acquire(token => owner.loaded(token, true));
    for (let pass = 0; pass < 100 && !owner.canWrite(); pass++) await new Promise(resolve => setTimeout(resolve, 0));
    if (!owner.canWrite()) throw new Error('The live owner is unavailable.');
    const timestamp = '2026-11-05T00:00:00Z';
    const asset = { id: 'file', name: 'File', folderId: null, type: 'text/plain', size: 1, blob: new Blob(['x'], { type: 'text/plain' }), createdAt: timestamp, updatedAt: timestamp, altText: '', caption: '', backupRecovery: { version: 1 as const, sourceRevision: { foreign: true } } };
    await store.replaceMediaLibrary([asset], []);
    await store.updateMediaAsset('file', { name: 'Renamed' });
    await store.replaceMediaAssetContent('file', new Blob(['z'], { type: 'text/plain' }));
    const edited = await store.getMediaAsset('file');
    if (!edited) throw new Error('The edited file is missing.');
    const document = createDocument('page', 'metadata-page');
    const workspace: import('../../app/studio/editor-model').StudioWorkspace = { version: 59, documents: [document], categories: [], bin: [], activeDocumentId: document.id };
    const first = await backups.createStudioBackup(workspace);
    // Legacy IDB records could already contain this formerly unowned field.
    const foreign = { ...edited, backupRecovery: { unrelated: ['preserve', false] } };
    // @ts-expect-error Deliberately seed a pre-contract record through the real storage boundary.
    await store.replaceMediaLibrary([foreign], []);
    const exported = await backups.createStudioBackup(workspace);
    release();
    return { edited: edited.backupRecovery, first: first.media.assets[0].backupRecovery, wrapped: exported.media.assets[0].backupRecovery, bytes: await edited.blob.text(), name: edited.name };
  });
  expect(result).toEqual({ edited: { version: 1, sourceRevision: { foreign: true } }, first: { version: 1, sourceRevision: { foreign: true } }, wrapped: { version: 1, previousValue: { unrelated: ['preserve', false] } }, bytes: 'z', name: 'Renamed' });
});

test('complete backup downloads and restores large Files libraries, metadata, and image sizes through the recovery screen', async ({ page }) => {
  test.setTimeout(120_000);
  const source = await buildMediaAdapter();
  await page.route('**/*', route => route.fulfill({ contentType: 'text/html', body: '<!doctype html><main id="app"></main>' }));
  await page.goto('http://localhost:3011/');
  await page.addScriptTag({ content: source });
  const expected = await page.evaluate(async () => {
    const { studioWriteOwnership: owner, mediaStore: store, createDocument, generateImageRenditions, imageContentDigest, createElement, createRoot, BackupManager } = window.StudioMediaAdapter;
    owner.acquire(token => owner.loaded(token, true));
    for (let pass = 0; !owner.canWrite() && pass < 100; pass++) await new Promise(resolve => setTimeout(resolve, 0));
    const now = '2026-11-22T00:00:00Z';
    const folder = { id: 'originals', name: 'Originals', parentId: null, createdAt: now };
    const metadata = { name: 'My original', folderId: folder.id, caption: 'Caption', altText: 'Alternative text', updatedAt: now, createdAt: now, sourceRevision: 'original-revision' };
    const canvas = new OffscreenCanvas(1000, 600);
    const context = canvas.getContext('2d')!;
    context.fillStyle = '#a73e26';
    context.fillRect(0, 0, 1000, 600);
    const photo = await canvas.convertToBlob({ type: 'image/png' });
    const bundle = await generateImageRenditions(photo);
    if (!bundle || !bundle.variants.length) throw new Error('Expected image sizes.');
    const chunk = new Blob([new Uint8Array(1024 * 1024).fill(73)]);
    const assets = [80, 24].map(size => {
      const blob = new Blob(Array(size).fill(chunk), { type: 'application/octet-stream' });
      return { ...metadata, id: 'file-' + size, size: blob.size, type: blob.type, blob };
    });
    const all = [...assets, { ...metadata, id: 'photo', size: photo.size, type: photo.type, blob: photo, imageRenditions: { version: 1 as const, bundles: [bundle] } }];
    await store.replaceMediaLibrary(all, [folder]);
    const doc = createDocument('page', 'large-library');
    doc.blocks = [{ id: 'photo-block', type: 'image', src: '', mediaId: 'photo', alt: 'Original' }];
    const workspace = { version: 66 as const, documents: [doc], categories: [], bin: [], activeDocumentId: doc.id };
    createRoot(document.getElementById('app')!).render(createElement(BackupManager, { workspace }));
    return { bytes: await Promise.all(all.map(file => imageContentDigest(file.blob))), rendition: bundle.variants[0].digest };
  });
  const file = page.locator('input[type=file]');
  const incomplete = await page.evaluate(async () => {
    const { createDocument } = window.StudioMediaAdapter;
    const doc = createDocument('page', 'missing-original');
    doc.blocks = [{ id: 'image', type: 'image', src: '', mediaId: 'photo', alt: 'Current photo' }];
    return JSON.stringify({ format: 'acm-studio-backup', version: 46, exportedAt: new Date().toISOString(),
      workspace: { version: 66, documents: [doc], categories: [], bin: [], activeDocumentId: doc.id }, publications: null, media: { folders: [], assets: [] } });
  });
  await file.setInputFiles({ name: 'incomplete.json', mimeType: 'application/json', buffer: Buffer.from(incomplete) });
  await expect(page.getByText('The backup is missing file "photo"', { exact: false })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Restore checked backup' })).toHaveCount(0);
  expect(await page.evaluate(async () => Boolean(await window.StudioMediaAdapter.mediaStore.getMediaAsset('photo')))).toBe(true);
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download complete backup' }).click();
  const archive = await download;
  expect(archive.suggestedFilename()).toMatch(/\.acmbackup$/);
  const path = await archive.path();
  if (!path) throw new Error('Backup download unavailable.');
  await file.setInputFiles(path);
  await expect(page.getByText('Backup checked successfully.', { exact: false })).toBeVisible();
  await page.evaluate(() => window.StudioMediaAdapter.mediaStore.replaceMediaLibrary([], []));
  await page.getByRole('checkbox').check();
  page.once('dialog', dialog => dialog.accept());
  await Promise.all([
    page.waitForEvent('load'),
    page.getByRole('button', { name: 'Restore checked backup' }).click(),
  ]);
  await page.addScriptTag({ content: source });
  const actual = await page.evaluate(async () => {
    const { mediaStore: store, imageContentDigest } = window.StudioMediaAdapter;
    const library = await store.listMediaLibrary();
    const ordered = ['file-80', 'file-24', 'photo'].map(id => library.assets.find(file => file.id === id)!);
    const photo = ordered[2] as typeof ordered[number] & { imageRenditions: import("../../app/content/image-resolution").ImageRenditions };
    const variant = photo.imageRenditions.bundles[0].variants[0];
    return {
      bytes: await Promise.all(ordered.map(file => imageContentDigest(file.blob))),
      rendition: await imageContentDigest(variant.blob),
      metadata: ordered.map(file => [file.sourceRevision, file.caption, file.altText, file.folderId]),
      folders: library.folders.map(folder => folder.name),
    };
  });
  expect(actual).toEqual({ ...expected, metadata: Array(3).fill(['original-revision', 'Caption', 'Alternative text', 'originals']), folders: ['Originals'] });
});
