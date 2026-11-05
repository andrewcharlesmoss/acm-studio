import { expect, test } from '@playwright/test';
import { buildMediaAdapter } from './helpers/media-adapter';
import { readFile } from 'node:fs/promises';

type TestAsset = import('../../app/studio/media-store').MediaAsset & { imageRenditions?: import('../../app/content/image-resolution').ImageRenditions };
type RestorePermit = import('../../app/studio/write-ownership').RestorePermit;
declare global { interface Window { StudioMediaAdapter: typeof import('./fixtures/media-store-adapter') } }

let source: string;
test.beforeAll(async () => { source = await buildMediaAdapter(); });

test('live media store migrates to v3 and retains image sizes through the broker', async ({ page }) => {
  test.setTimeout(60000);
  await page.route('**/*', route => route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>Isolated media adapter</title>' }));
  await page.goto('http://localhost:3011/');
  await page.addScriptTag({ content: source });
  const bytes = await readFile('public/specimens/landscape.png');
  const result = await page.evaluate(async base64 => {
    const api = window.StudioMediaAdapter;
    const owner = api.studioWriteOwnership;
    const release = owner.acquire((token: symbol) => owner.loaded(token, true));
    await new Promise<void>(resolve => { if (owner.canWrite()) { resolve(); return; } const off = owner.subscribe(() => { if (owner.canWrite()) { off(); resolve(); } }); });
    const blob = new Blob([Uint8Array.from(atob(base64), character => character.charCodeAt(0))], { type: 'image/png' });
    const name = `acm-isolated-media-${crypto.randomUUID()}`;
    const options = { databaseName: name, factory: () => indexedDB, ownership: owner };
    const store = api.mediaStore.createIsolatedV3MediaStore(options);
    options.databaseName = 'acm-studio-media'; options.factory = () => { throw new Error('A changed adapter must not run'); }; options.ownership = new api.StudioWriteOwnership();
    let rejectedLive = false;
    try { api.mediaStore.createIsolatedV3MediaStore({ databaseName: 'acm-studio-media', factory: () => indexedDB, ownership: owner }); } catch { rejectedLive = true; }
    await api.mediaStore.ensureMediaGeneration();
    const legacy = await new Promise<IDBDatabase>((resolve, reject) => { const request = indexedDB.open('acm-studio-media'); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); });
    const legacyVersion = legacy.version; legacy.close();
    const liveSupports = api.mediaStore.supportsImageRenditions();
    const liveHostGeneration = await api.mediaStore.ensureMediaGeneration();
    const stopLiveHost = api.mediaSync.createMediaHost(liveHostGeneration);
    const stopLiveClient = api.mediaSync.startMediaClient();
    const liveFile = new File([blob], 'Live landscape.png', { type: 'image/png' });
    const [liveAsset] = await api.mediaStore.addMediaFiles([liveFile], null);
    const liveDigest = await api.imageContentDigest(blob);
    let liveCommandSaved = false;
    for (let attempt = 0; attempt < 100; attempt++) {
      try { await api.mediaSync.submitMediaCommand({ kind: 'generate-image-renditions', id: liveAsset.id, sourceDigest: liveDigest }); liveCommandSaved = true; break; }
      catch (error) { if (!(error as Error).message.includes('reconnect')) throw error; await new Promise(resolve => setTimeout(resolve, 20)); }
    }
    if (!liveCommandSaved) throw new Error('The live media owner did not accept image-size generation.');
    const liveSaved = await api.mediaStore.getMediaAsset(liveAsset.id) as TestAsset | undefined;
    if (!liveSaved?.imageRenditions) throw new Error('Expected live image sizes.');
    const liveWidths = liveSaved.imageRenditions.bundles[0].variants.map((variant) => variant.width);
    stopLiveClient(); stopLiveHost();
    await api.mediaStore.replaceMediaLibrary([], []);
    await new Promise<void>((resolve, reject) => { const request = indexedDB.deleteDatabase('acm-studio-media'); request.onsuccess = () => resolve(); request.onerror = () => reject(request.error); });
    const beforeReady = store.supportsImageRenditions();
    const generation = await store.ensureMediaGeneration();
    const hostOptions = { ownership: owner, applyMediaRequest: store.applyMediaRequest, supportsImageRenditions: store.supportsImageRenditions };
    const stopHost = api.mediaSync.createMediaHost(generation, hostOptions);
    hostOptions.applyMediaRequest = () => { throw new Error('A changed host adapter must not run'); }; hostOptions.supportsImageRenditions = () => false; hostOptions.ownership = new api.StudioWriteOwnership();
    const stopClient = api.mediaSync.startMediaClient();
    // The actual client waits for the capability-bearing owner announcement.
    let uploaded = false;
    for (let attempt = 0; attempt < 100; attempt++) {
      try { await api.mediaSync.submitMediaCommand({ kind: 'upload', folderId: null, createdAt: new Date().toISOString(), files: [{ id: 'image', name: 'Landscape.png', type: 'image/png', blob }] }); uploaded = true; break; }
      catch (error) { if (!(error as Error).message.includes('reconnect')) throw error; await new Promise(resolve => setTimeout(resolve, 20)); }
    }
    if (!uploaded) throw new Error('The real media broker did not connect.');
    const digest = await api.imageContentDigest(blob);
    await api.mediaSync.submitMediaCommand({ kind: 'generate-image-renditions', id: 'image', sourceDigest: digest });
    const first = await store.getMediaAsset('image') as TestAsset | undefined;
    if (!first?.imageRenditions) throw new Error('Expected stored image sizes.');
    const originalBytes = await first.blob.arrayBuffer();
    const widths = first.imageRenditions.bundles[0].variants.map((variant) => variant.width);
    const snapshot = async () => {
      const database = await new Promise<IDBDatabase>((resolve, reject) => { const request = indexedDB.open(name); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); });
      const values = await new Promise<[TestAsset[], unknown, unknown[]]>((resolve, reject) => { const transaction = database.transaction(['assets-v3', 'metadata', 'commandReceipts']); const reads = [transaction.objectStore('assets-v3').getAll(), transaction.objectStore('metadata').get('generation'), transaction.objectStore('commandReceipts').getAll()]; transaction.oncomplete = () => resolve([reads[0].result, reads[1].result, reads[2].result]); transaction.onerror = () => reject(transaction.error); }); database.close();
      const assets = await Promise.all(values[0].map(async (asset) => { if (!asset.imageRenditions) throw new Error('Expected snapshot image sizes.'); return ({ ...asset, originalBytes: await api.imageContentDigest(asset.blob), sizes: await Promise.all(asset.imageRenditions.bundles.flatMap((bundle) => bundle.variants.map((variant) => api.imageContentDigest(variant.blob)))) }); }));
      return JSON.stringify([values[1], values[2], assets]);
    };
    const beforeInvalid = await snapshot(); let invalidRejected = 0;
    for (const imageRenditions of [null, false, 0, '', {}]) { const invalid = { ...first, imageRenditions }; try { await store.replaceMediaLibrary([invalid], []); } catch { invalidRejected++; } }
    for (const sourceRevision of [null, false, 42, '', 'x'.repeat(181)]) { try {
      // @ts-expect-error Deliberately malformed source revisions must be rejected by the runtime boundary.
      await store.replaceMediaLibrary([{ ...first, sourceRevision }], []); } catch { invalidRejected++; } }
    const invalidPreserved = beforeInvalid === await snapshot();
    await store.updateMediaAsset('image', { altText: 'Retained metadata' });
    await store.replaceMediaAssetContent('image', blob);
    const changed = await store.getMediaAsset('image') as TestAsset | undefined;
    if (!changed) throw new Error('The updated image is missing.');
    stopClient(); stopHost(); release();
    await new Promise(resolve => setTimeout(resolve, 0));
    await new Promise<void>((resolve, reject) => { const request = indexedDB.deleteDatabase(name); request.onsuccess = () => resolve(); request.onerror = () => reject(request.error); });
    return { invalidRejected, invalidPreserved, rejectedLive, legacyVersion, liveSupports, liveCommandSaved, liveWidths, beforeReady, afterReady: Boolean(first.imageRenditions), widths, originalBytes: Array.from(new Uint8Array(originalBytes)), changedAlt: changed.altText, retained: changed.imageRenditions?.bundles.length ?? 0, sourceChanged: changed.sourceRevision !== first.sourceRevision };
  }, bytes.toString('base64'));
  expect(result.invalidRejected).toBe(10); expect(result.invalidPreserved).toBe(true);
  expect(result.rejectedLive).toBe(true); expect(result.legacyVersion).toBe(3); expect(result.liveSupports).toBe(true); expect(result.liveCommandSaved).toBe(true); expect(result.liveWidths).toEqual([150, 300]); expect(result.beforeReady).toBe(false); expect(result.afterReady).toBe(true);
  expect(result.widths).toEqual([150, 300]); expect(Buffer.from(result.originalBytes)).toEqual(bytes);
  expect(result.changedAlt).toBe('Retained metadata'); expect(result.retained).toBe(0); expect(result.sourceChanged).toBe(true);
});

test('scoped restore migrates an unreadable owner and drains an aborted native upgrade on owner loss', async ({ page }) => {
  await page.route('**/*', route => route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>Restore authority</title>' }));
  await page.goto('http://localhost:3011/'); await page.addScriptTag({ content: source });
  const result = await page.evaluate(async () => {
    const api = window.StudioMediaAdapter;
    const makeOld = (name: string) => new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(name, 2);
      request.onupgradeneeded = () => {
        const assets = request.result.createObjectStore('assets', { keyPath: 'id' }); assets.createIndex('folderId', 'folderId'); assets.createIndex('createdAt', 'createdAt');
        assets.put({ id: 'old', name: 'Original.txt', folderId: null, type: 'text/plain', blob: new Blob(['original']), size: 8, altText: '', caption: '', createdAt: '2026-10-27T00:00:00Z', updatedAt: '2026-10-27T00:00:00Z' });
        request.result.createObjectStore('folders', { keyPath: 'id' }); request.result.createObjectStore('metadata'); request.result.createObjectStore('commandReceipts', { keyPath: 'id' });
      }; request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);
    });
    const ready = (owner: import('../../app/studio/write-ownership').StudioWriteOwnership, readable: boolean, locks?: Pick<LockManager, 'request'>) => new Promise<() => void>(resolve => {
      const release = owner.acquire((token: symbol) => { owner.loaded(token, readable); resolve(release); }, locks);
    });
    const firstName = `acm-restore-adapter-${crypto.randomUUID()}`;
    (await makeOld(firstName)).close();
    const owner = new api.StudioWriteOwnership(); const release = await ready(owner, false);
    const store = api.mediaStore.createIsolatedV3MediaStore({ databaseName: firstName, factory: () => indexedDB, ownership: owner });
    const original = await store.getMediaAsset('old'); if (!original) throw new Error('The restore fixture is missing.'); let escaped: RestorePermit | undefined;
    await owner.restore(async (permit) => { escaped = permit; await store.replaceMediaLibrary([{ ...original, altText: 'Restored' }], [], permit); });
    const restored = await store.getMediaAsset('old');
    if (!restored) throw new Error('Restored media is missing.');
    const blockedState = owner.getState(); let staleDenied = false;
    if (!escaped) throw new Error('Expected a captured restore permit.');
    try { await store.replaceMediaLibrary([], [], escaped); } catch { staleDenied = true; }
    release(); await navigator.locks.request('acm-studio-writer-v1', () => {});

    const secondName = `acm-restore-abort-${crypto.randomUUID()}`;
    (await makeOld(secondName)).close();
    const secondOwner = new api.StudioWriteOwnership(); let held = false;
    const observedLocks = { async request<T>(name: string, optionsOrCallback: LockOptions | LockGrantedCallback<T>, callback?: LockGrantedCallback<T>): Promise<T> { const grant = typeof optionsOrCallback === 'function' ? optionsOrCallback : callback; if (!grant) throw new Error('Missing lock callback'); const options = typeof optionsOrCallback === 'function' ? {} : optionsOrCallback; return navigator.locks.request(name, options, async lock => { if (lock) held = true; try { return await grant(lock); } finally { if (lock) held = false; } }); } };
    const releaseSecond = await ready(secondOwner, true, observedLocks);
    const secondStore = api.mediaStore.createIsolatedV3MediaStore({ databaseName: secondName, factory: () => indexedDB, ownership: secondOwner });
    const originalGet = IDBObjectStore.prototype.get; let invalidated = false; let heldAtAbort = false; let settledAtAbort = true; let settled = false;
    IDBObjectStore.prototype.get = function (key: IDBValidKey | IDBKeyRange) {
      const request = originalGet.call(this, key);
      if (!invalidated && this.name === 'metadata' && this.transaction.mode === 'versionchange' && key === 'generation') {
        request.transaction!.addEventListener('abort', () => { heldAtAbort = held; settledAtAbort = settled; });
        request.addEventListener('success', () => { invalidated = true; releaseSecond(); });
      }
      return request;
    };
    let rejected = false;
    try { await secondOwner.restore((permit) => secondStore.replaceMediaLibrary([], [], permit)); } catch { rejected = true; } finally { settled = true; IDBObjectStore.prototype.get = originalGet; }
    await navigator.locks.request('acm-studio-writer-v1', () => {});
    const after = await new Promise<IDBDatabase>((resolve, reject) => { const request = indexedDB.open(secondName); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); });
    const version = after.version; const oldStore = after.objectStoreNames.contains('assets'); after.close();
    const thirdName = `acm-put-abort-${crypto.randomUUID()}`;
    const thirdOwner = new api.StudioWriteOwnership(); const releaseThird = await ready(thirdOwner, true, observedLocks);
    const thirdStore = api.mediaStore.createIsolatedV3MediaStore({ databaseName: thirdName, factory: () => indexedDB, ownership: thirdOwner });
    await thirdStore.ensureMediaGeneration();
    const [faultAsset] = await thirdStore.addMediaFiles([new File(['original'], 'Original.txt', { type: 'text/plain' })], null);
    const nativePut = IDBObjectStore.prototype.put; let faultHeldAtAbort = false; let faultSettledAtAbort = true; let faultSettled = false; let putRejected = false; let faultErrorName = "";
    IDBObjectStore.prototype.put = function (...args: Parameters<IDBObjectStore['put']>) {
      if (this.name === 'assets-v3') {
        this.transaction.db.addEventListener('abort', () => { faultHeldAtAbort = held; faultSettledAtAbort = faultSettled; }, { capture: true, once: true });
        // The native key-path check throws synchronously before any record is saved.
        try { return Reflect.apply(nativePut, this, [{ ...args[0], id: undefined }]); }
        catch (error) { releaseThird(); throw error; }
      }
      return Reflect.apply(nativePut, this, args);
    };
    try { await thirdStore.updateMediaAsset(faultAsset.id, { altText: 'Must not save' }); } catch (error) { faultErrorName = (error as Error).name; putRejected = true; } finally { faultSettled = true; IDBObjectStore.prototype.put = nativePut; }
    await navigator.locks.request('acm-studio-writer-v1', () => {});
    const faultSaved = await thirdStore.getMediaAsset(faultAsset.id);
    if (!faultSaved) throw new Error('The original fault-test media is missing.');
    const faultPreserved = faultSaved.altText === '';
    for (const name of [firstName, secondName, thirdName]) await new Promise<void>((resolve, reject) => { const request = indexedDB.deleteDatabase(name); request.onsuccess = () => resolve(); request.onerror = () => reject(request.error); });
    return { faultErrorName, putRejected, faultHeldAtAbort, faultSettledAtAbort, faultPreserved, restoredAlt: restored.altText, originalBytes: await restored.blob.text(), blockedState, staleDenied, rejected, heldAtAbort, settledAtAbort, version, oldStore };
  });
  expect(result).toEqual({ faultErrorName: "DataError", putRejected: true, faultHeldAtAbort: true, faultSettledAtAbort: false, faultPreserved: true, restoredAlt: 'Restored', originalBytes: 'original', blockedState: 'blocked', staleDenied: true, rejected: true, heldAtAbort: true, settledAtAbort: false, version: 2, oldStore: true });
});
