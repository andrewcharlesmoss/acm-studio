import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

test('image sizes and receipts commit atomically under the existing writer', async ({ page }) => {
  test.setTimeout(60000);
  const paths = [
    'app/content/image-resolution.ts', 'app/content/raster-dimensions.ts',
    'app/studio/image-rendition-generation.ts', 'app/studio/image-rendition-validation.ts',
    'app/studio/image-rendition-preparation.ts', 'app/studio/media-database-migration.ts',
    'app/studio/media-database-open.ts', 'app/studio/media-command.ts',
    'app/studio/write-ownership.ts', 'app/studio/image-rendition-transaction.ts',
  ];
  const sources = await Promise.all(paths.map(async path => ts.transpileModule(await readFile(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText));
  const fixture = await readFile('public/specimens/landscape.png');
  await page.route('**/*', route => route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>Image transaction test</title>' }));
  await page.goto('http://localhost:3011/');
  const result = await page.evaluate(async ({ sources, fixture }) => {
    const modules: Record<string, any> = {};
    const ids = ['image-resolution', 'raster-dimensions', 'image-rendition-generation', 'image-rendition-validation', 'image-rendition-preparation', 'media-database-migration', 'media-database-open', 'media-command', 'write-ownership', 'image-rendition-transaction'];
    for (let index = 0; index < ids.length; index++) {
      const module = { exports: {} };
      new Function('exports', 'module', 'require', sources[index])(module.exports, module, (name: string) => {
        const id = name.split('/').at(-1)!;
        if (!(id in modules)) throw new Error(`Unexpected module: ${name}`);
        return modules[id];
      });
      modules[ids[index]] = module.exports;
    }
    const name = `acm-rendition-transaction-${crypto.randomUUID()}`;
    const open = (version?: number) => new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(name, version);
      request.onupgradeneeded = event => modules['media-database-migration'].upgradeMediaDatabase(request.result, request.transaction, event.oldVersion);
      request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);
    });
    const db = await open(3);
    const bytes = Uint8Array.from(atob(fixture), character => character.charCodeAt(0));
    const blob = new Blob([bytes], { type: 'image/png' });
    const digest = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', await blob.arrayBuffer())), byte => byte.toString(16).padStart(2, '0')).join('');
    const seed = (id: string) => ({ id, name: id, type: 'image/png', blob, size: blob.size, sourceRevision: 'source-one', updatedAt: '2026-01-01T00:00:00Z' });
    async function write(stores: string[], apply: (tx: IDBTransaction) => void) {
      await new Promise<void>((resolve, reject) => { const tx = db.transaction(stores, 'readwrite'); apply(tx); tx.oncomplete = () => resolve(); tx.onabort = tx.onerror = () => reject(tx.error ?? new Error('Write failed')); });
    }
    await write(['assets-v3', 'metadata'], tx => { for (const id of ['image', 'fault', 'async-fault', 'stale', 'loss', 'late-generation', 'late-bundles', 'metadata', 'expired-late', 'late-owner']) tx.objectStore('assets-v3').put(seed(id)); tx.objectStore('metadata').put('generation-one', 'generation'); });
    async function get(store: string, key: string) {
      return new Promise<any>((resolve, reject) => { const request = db.transaction(store).objectStore(store).get(key); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); });
    }
    const Coordinator = modules['write-ownership'].StudioWriteOwnership;
    const owner = new Coordinator();
    let lockHeld = false;
    const locks = { request: async (_name: string, _options: unknown, callback: (lock: object) => Promise<unknown>) => { lockHeld = true; try { return await callback({}); } finally { lockHeld = false; } } };
    let release = owner.acquire((token: symbol) => owner.loaded(token, true), locks);
    for (let pass = 0; pass < 30 && !owner.canWrite(); pass++) await new Promise(resolve => setTimeout(resolve, 0));
    if (!owner.canWrite()) throw new Error('Owner unavailable.');
    let queue = Promise.resolve();
    const options = {
      ownership: owner,
      runOwnedMediaWrite: <T>(operation: () => Promise<T>) => owner.write(() => { const next = queue.then(operation); queue = next.then(() => undefined, () => undefined); return next; }),
      openOwnedDatabase: (token: symbol, signal: AbortSignal) => modules['media-database-open'].openMediaDatabase(indexedDB, name, { mode: 'owned', authorised: () => owner.canWrite(token), subscribeOwnership: owner.subscribe, signal }),
    };
    const action = (id: string, requestId: string, sourceDigest = digest, generation = 'generation-one') => ({ id: requestId, generation, submittedAt: new Date().toISOString(), command: { kind: 'generate-image-renditions', id, sourceDigest } });
    const apply = modules['image-rendition-transaction'].applyImageRenditionRequest as (request: any, config: typeof options) => Promise<string>;
    const first = await apply(action('image', 'first'), options);
    const afterFirst = await get('assets-v3', 'image'); const firstReceipt = await get('commandReceipts', 'first');
    const { sourceRevision: _legacyRevision, ...legacyAsset } = seed('legacy');
    await write(['assets-v3'], tx => tx.objectStore('assets-v3').put(legacyAsset));
    await apply(action('legacy', 'legacy-request'), options);
    const updatedLegacy = await get('assets-v3', 'legacy');
    const legacyRevisionInstalled = typeof updatedLegacy.sourceRevision === 'string' && !!updatedLegacy.sourceRevision && updatedLegacy.blob.size === blob.size && !!updatedLegacy.imageRenditions;
    let replayDecoded = false; const originalBitmap = globalThis.createImageBitmap;
    Reflect.set(globalThis, 'createImageBitmap', (...args: Parameters<typeof createImageBitmap>) => { replayDecoded = true; return Reflect.apply(originalBitmap, globalThis, args); });
    let replay;
    try { replay = await apply(action('image', 'first'), options); } finally { Reflect.set(globalThis, 'createImageBitmap', originalBitmap); }
    let otherAssetRejected = false; let otherDigestRejected = false; let foreignReceiptRejected = false;
    try { await apply(action('fault', 'first'), options); } catch (error) { otherAssetRejected = (error as { code?: string }).code === 'conflict'; }
    try { await apply(action('image', 'first', 'f'.repeat(64)), options); } catch (error) { otherDigestRejected = (error as { code?: string }).code === 'conflict'; }
    await write(['commandReceipts'], tx => tx.objectStore('commandReceipts').put({ id: 'ordinary-receipt', completedAt: Date.now() }));
    try { await apply(action('image', 'ordinary-receipt'), options); } catch (error) { foreignReceiptRejected = (error as { code?: string }).code === 'conflict'; }
    const existing = await apply(action('image', 'second'), options); const afterExisting = await get('assets-v3', 'image');
    let staleDigestRejected = false; try { await apply(action('image', 'bad-digest', '0'.repeat(64)), options); } catch (error) { staleDigestRejected = (error as { code?: string }).code === 'conflict'; }
    let replacedRejected = false; try { await apply(action('image', 'bad-generation', digest, 'old-generation'), options); } catch (error) { replacedRejected = (error as { code?: string }).code === 'replaced'; }
    let expiredRejected = false;
    try { await apply({ ...action('image', 'expired'), submittedAt: '2020-01-01T00:00:00.000Z' }, options); } catch { expiredRejected = true; }
    const smallCanvas = document.createElement('canvas'); smallCanvas.width = 40; smallCanvas.height = 40;
    const smallBlob = await new Promise<Blob>((resolve, reject) => smallCanvas.toBlob(value => value ? resolve(value) : reject(new Error('PNG encoding failed')), 'image/png'));
    await write(['assets-v3'], tx => tx.objectStore('assets-v3').put({ ...seed('small'), blob: smallBlob, size: smallBlob.size }));
    const smallDigest = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', await smallBlob.arrayBuffer())), byte => byte.toString(16).padStart(2, '0')).join('');
    let unsupportedRejected = false; try { await apply(action('small', 'unsupported', smallDigest), options); } catch (error) { unsupportedRejected = (error as { code?: string }).code === 'unavailable'; }
    const unsupportedReceipt = await get('commandReceipts', 'unsupported'); const unsupportedAsset = await get('assets-v3', 'small');

    const originalPut = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (...args: Parameters<IDBObjectStore['put']>) { if (this.name === 'commandReceipts') throw new Error('Injected receipt failure'); return Reflect.apply(originalPut, this, args); };
    let faultRejected = false;
    try { await apply(action('fault', 'fault-request'), options); } catch { faultRejected = true; }
    finally { IDBObjectStore.prototype.put = originalPut; }
    const afterFault = await get('assets-v3', 'fault'); const faultReceipt = await get('commandReceipts', 'fault-request');

    let settled = false; let lockHeldAtAbort = false; let abortedBeforeSettlement = false; let injected = false; let duplicateFailed = false;
    IDBObjectStore.prototype.put = function (...args: Parameters<IDBObjectStore['put']>) {
      const request = Reflect.apply(originalPut, this, args);
      if (this.name === 'commandReceipts' && (args[0] as { id?: string }).id === 'async-fault-request') {
        injected = true;
        const duplicate = this.add(args[0]);
        duplicate.addEventListener('error', () => { duplicateFailed = true; release(); });
        this.transaction.db.addEventListener('abort', () => { lockHeldAtAbort = lockHeld; abortedBeforeSettlement = !settled; }, { capture: true, once: true });
      }
      return request;
    };
    let asynchronousFaultRejected = false; let asynchronousFaultMessage = '';
    try { await apply(action('async-fault', 'async-fault-request'), options).finally(() => { settled = true; }); }
    catch (error) { asynchronousFaultRejected = true; asynchronousFaultMessage = String(error); }
    finally { IDBObjectStore.prototype.put = originalPut; }
    const asynchronousFaultAsset = await get('assets-v3', 'async-fault');
    const asynchronousFaultReceipt = await get('commandReceipts', 'async-fault-request');
    if (!lockHeldAtAbort || !abortedBeforeSettlement) throw new Error(`Async rollback observation failed: ${asynchronousFaultMessage}; injected=${injected}; duplicateFailed=${duplicateFailed}; held=${lockHeldAtAbort}; before=${abortedBeforeSettlement}`);
    release = owner.acquire((token: symbol) => owner.loaded(token, true), locks);
    for (let pass = 0; pass < 30 && !owner.canWrite(); pass++) await new Promise(resolve => setTimeout(resolve, 0));
    if (!owner.canWrite()) throw new Error('Owner did not reconnect after rollback.');

    let resume!: () => void; let started!: () => void;
    const paused = new Promise<void>(resolve => { resume = resolve; }); const decoding = new Promise<void>(resolve => { started = resolve; });
    Reflect.set(globalThis, 'createImageBitmap', async (...args: Parameters<typeof createImageBitmap>) => { started(); await paused; return Reflect.apply(originalBitmap, globalThis, args); });
    let staleRevisionRejected = false;
    try {
      const pending = apply(action('stale', 'stale-request'), options);
      await decoding;
      await write(['assets-v3'], tx => tx.objectStore('assets-v3').put({ ...seed('stale'), sourceRevision: 'source-two' }));
      resume(); try { await pending; } catch (error) { staleRevisionRejected = (error as { code?: string }).code === 'conflict'; }
    } finally { Reflect.set(globalThis, 'createImageBitmap', originalBitmap); }
    const afterStale = await get('assets-v3', 'stale'); const staleReceipt = await get('commandReceipts', 'stale-request');

    async function changeWhilePreparing(id: string, requestId: string, change: () => Promise<void>) {
      let continueDecode!: () => void; let beginDecode!: () => void;
      const waiting = new Promise<void>(resolve => { continueDecode = resolve; });
      const entered = new Promise<void>(resolve => { beginDecode = resolve; });
      Reflect.set(globalThis, 'createImageBitmap', async (...args: Parameters<typeof createImageBitmap>) => { beginDecode(); await waiting; return Reflect.apply(originalBitmap, globalThis, args); });
      try {
        const pending = apply(action(id, requestId), options);
        await entered; await change(); continueDecode();
        try { await pending; return 'saved'; } catch (error) { return (error as { code?: string }).code ?? 'error'; }
      } finally { continueDecode(); Reflect.set(globalThis, 'createImageBitmap', originalBitmap); }
    }
    const changedGeneration = await changeWhilePreparing('late-generation', 'late-generation-request', () => write(['metadata'], tx => tx.objectStore('metadata').put('generation-two', 'generation')));
    const generationReceipt = await get('commandReceipts', 'late-generation-request'); const generationAsset = await get('assets-v3', 'late-generation');
    await write(['metadata'], tx => tx.objectStore('metadata').put('generation-one', 'generation'));
    const changedBundles = await changeWhilePreparing('late-bundles', 'late-bundles-request', () => write(['assets-v3'], tx => tx.objectStore('assets-v3').put({ ...seed('late-bundles'), imageRenditions: afterFirst.imageRenditions })));
    const bundlesReceipt = await get('commandReceipts', 'late-bundles-request'); const bundlesAsset = await get('assets-v3', 'late-bundles');
    const changedMetadata = await changeWhilePreparing('metadata', 'metadata-request', () => write(['assets-v3'], tx => tx.objectStore('assets-v3').put({ ...seed('metadata'), name: 'Edited while preparing', updatedAt: '2026-02-01T00:00:00Z' })));
    const metadataAsset = await get('assets-v3', 'metadata');
    const originalNow = Date.now;
    let expiredLate: string;
    try { expiredLate = await changeWhilePreparing('expired-late', 'expired-late-request', async () => { Date.now = () => originalNow() + 6 * 60_000; }); }
    finally { Date.now = originalNow; }
    const expiredReceipt = await get('commandReceipts', 'expired-late-request'); const expiredAsset = await get('assets-v3', 'expired-late');

    const beforeOwnerPut = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (...args: Parameters<IDBObjectStore['put']>) {
      const request = Reflect.apply(beforeOwnerPut, this, args);
      if (this.name === 'assets-v3' && (args[0] as { id?: string }).id === 'late-owner') queueMicrotask(release);
      return request;
    };
    let lateOwnerRejected = false;
    try { await apply(action('late-owner', 'late-owner-request'), options); } catch { lateOwnerRejected = true; }
    finally { IDBObjectStore.prototype.put = beforeOwnerPut; }
    const lateOwnerAsset = await get('assets-v3', 'late-owner'); const lateOwnerReceipt = await get('commandReceipts', 'late-owner-request');
    const releaseAgain = owner.acquire((token: symbol) => owner.loaded(token, true), locks);
    for (let pass = 0; pass < 30 && !owner.canWrite(); pass++) await new Promise(resolve => setTimeout(resolve, 0));
    if (!owner.canWrite()) throw new Error('Owner did not reconnect.');

    let releaseDecode!: () => void; let enteredDecode!: () => void;
    const waiting = new Promise<void>(resolve => { releaseDecode = resolve; }); const entered = new Promise<void>(resolve => { enteredDecode = resolve; });
    Reflect.set(globalThis, 'createImageBitmap', async (...args: Parameters<typeof createImageBitmap>) => { enteredDecode(); await waiting; return Reflect.apply(originalBitmap, globalThis, args); });
    let lossRejected = false;
    try { const pending = apply(action('loss', 'loss-request'), options); await entered; releaseAgain(); releaseDecode(); try { await pending; } catch { lossRejected = true; } }
    finally { Reflect.set(globalThis, 'createImageBitmap', originalBitmap); }
    const afterLoss = await get('assets-v3', 'loss'); const lossReceipt = await get('commandReceipts', 'loss-request');
    const result = { first, firstSizes: afterFirst.imageRenditions.bundles[0].variants.map((item: { width: number }) => item.width), firstReceipt: firstReceipt.id, original: await afterFirst.blob.arrayBuffer().then((value: ArrayBuffer) => value.byteLength), replay, replayDecoded, otherAssetRejected, otherDigestRejected, foreignReceiptRejected, existing, unchangedUpdatedAt: afterExisting.updatedAt === afterFirst.updatedAt, staleDigestRejected, replacedRejected, expiredRejected, unsupportedRejected, unsupportedUnchanged: !unsupportedAsset.imageRenditions && !unsupportedReceipt, faultRejected, faultUnchanged: !afterFault.imageRenditions && !faultReceipt, staleRevisionRejected, staleUnchanged: !afterStale.imageRenditions && !staleReceipt && afterStale.sourceRevision === 'source-two', changedGeneration, generationUnchanged: !generationReceipt && !generationAsset.imageRenditions, changedBundles, bundlesPreserved: !bundlesReceipt && !!bundlesAsset.imageRenditions, changedMetadata, metadataPreserved: metadataAsset.name === 'Edited while preparing' && metadataAsset.updatedAt === '2026-02-01T00:00:00Z' && !!metadataAsset.imageRenditions, expiredLate, expiredUnchanged: !expiredReceipt && !expiredAsset.imageRenditions, lateOwnerRejected, lateOwnerUnchanged: !lateOwnerAsset.imageRenditions && !lateOwnerReceipt, lossRejected, lossUnchanged: !afterLoss.imageRenditions && !lossReceipt };
    Object.assign(result, { legacyRevisionInstalled, asynchronousFaultRejected, lockHeldAtAbort, abortedBeforeSettlement, asynchronousFaultUnchanged: !asynchronousFaultAsset.imageRenditions && !asynchronousFaultReceipt });
    db.close(); await new Promise<void>((resolve, reject) => { const request = indexedDB.deleteDatabase(name); request.onsuccess = () => resolve(); request.onerror = () => reject(request.error); request.onblocked = () => reject(new Error('Cleanup blocked')); });
    return result;
  }, { sources, fixture: fixture.toString('base64') });
  expect(result).toEqual({ first: 'prepared', firstSizes: [150, 300], firstReceipt: 'first', original: fixture.length, legacyRevisionInstalled: true, replay: 'replayed', replayDecoded: false, otherAssetRejected: true, otherDigestRejected: true, foreignReceiptRejected: true, existing: 'existing', unchangedUpdatedAt: true, staleDigestRejected: true, replacedRejected: true, expiredRejected: true, unsupportedRejected: true, unsupportedUnchanged: true, faultRejected: true, faultUnchanged: true, asynchronousFaultRejected: true, lockHeldAtAbort: true, abortedBeforeSettlement: true, asynchronousFaultUnchanged: true, staleRevisionRejected: true, staleUnchanged: true, changedGeneration: 'replaced', generationUnchanged: true, changedBundles: 'conflict', bundlesPreserved: true, changedMetadata: 'saved', metadataPreserved: true, expiredLate: 'invalid', expiredUnchanged: true, lateOwnerRejected: true, lateOwnerUnchanged: true, lossRejected: true, lossUnchanged: true });
});
