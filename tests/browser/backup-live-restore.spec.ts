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
  expect(result).toMatchObject({ paused: true, version: 38, bytes: 'x', unchanged: true, storedCount: 1 });
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
