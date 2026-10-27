import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

test('blocked media upgrades abort if ownership or the request is lost', async ({ page }) => {
  const compile = async (path: string) => ts.transpileModule(await readFile(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const [migrationSource, openSource, ownershipSource] = await Promise.all([
    compile('app/studio/media-database-migration.ts'), compile('app/studio/media-database-open.ts'), compile('app/studio/write-ownership.ts'),
  ]);
  await page.route('**/*', route => route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>Ownership test</title>' }));
  await page.goto('http://localhost:3011/');
  const result = await page.evaluate(async ({ migrationSource, openSource, ownershipSource }) => {
    const migration = { exports: {} };
    new Function('exports', 'module', migrationSource)(migration.exports, migration);
    const opening = { exports: {} };
    new Function('exports', 'module', 'require', openSource)(opening.exports, opening, () => migration.exports);
    const coordinatorModule = { exports: {} };
    new Function('exports', 'module', ownershipSource)(coordinatorModule.exports, coordinatorModule);
    const api = opening.exports as { openMediaDatabase: (factory: IDBFactory, name: string, options: { mode: 'owned'; authorised: () => boolean; subscribeOwnership: (listener: () => void) => () => void; onBlocked?: () => void; signal?: AbortSignal } | { mode: 'read'; signal?: AbortSignal }) => Promise<IDBDatabase> };
    const noSubscription = (_listener: () => void) => () => {};
    const base = `acm-owner-test-${crypto.randomUUID()}`;
    function oldLibrary(name: string): Promise<IDBDatabase> {
      return new Promise((resolve, reject) => {
        const request = indexedDB.open(name, 2);
        request.onupgradeneeded = () => {
          const assets = request.result.createObjectStore('assets', { keyPath: 'id' });
          assets.createIndex('folderId', 'folderId'); assets.createIndex('createdAt', 'createdAt');
          request.result.createObjectStore('metadata'); request.result.createObjectStore('commandReceipts', { keyPath: 'id' }); request.result.createObjectStore('folders', { keyPath: 'id' });
        };
        request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);
      });
    }
    function deleteLibrary(name: string): Promise<void> {
      return new Promise((resolve, reject) => { const request = indexedDB.deleteDatabase(name); request.onsuccess = () => resolve(); request.onerror = () => reject(request.error); request.onblocked = () => reject(new Error('Cleanup blocked.')); });
    }
    const deniedName = `${base}-denied`;
    let owned = true;
    const held = await oldLibrary(deniedName);
    await new Promise<void>((resolve, reject) => { const tx = held.transaction('assets', 'readwrite'); tx.objectStore('assets').put({ id: 'one', blob: new Blob(['safe']) }); tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); });
    held.onversionchange = () => {}; // Simulate a legacy tab holding its connection.
    let notifyBlocked!: () => void;
    const blocked = new Promise<void>(resolve => { notifyBlocked = resolve; });
    const pending = api.openMediaDatabase(indexedDB, deniedName, { mode: 'owned', authorised: () => owned, subscribeOwnership: noSubscription, onBlocked: notifyBlocked });
    await blocked; owned = false; held.close();
    let ownerLossRejected = false; try { (await pending).close(); } catch { ownerLossRejected = true; }
    const preserved = await oldLibrary(deniedName);
    const preservedVersion = preserved.version;
    const stored = await new Promise<{ blob: Blob }>((resolve, reject) => { const request = preserved.transaction('assets').objectStore('assets').get('one'); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); });
    preserved.close();

    const cancelledName = `${base}-cancelled`;
    const heldForCancel = await oldLibrary(cancelledName); heldForCancel.onversionchange = () => {};
    const controller = new AbortController();
    let notifyCancelledBlocked!: () => void;
    const cancelledBlocked = new Promise<void>(resolve => { notifyCancelledBlocked = resolve; });
    const cancelled = api.openMediaDatabase(indexedDB, cancelledName, { mode: 'owned', authorised: () => true, subscribeOwnership: noSubscription, onBlocked: notifyCancelledBlocked, signal: controller.signal });
    await cancelledBlocked; controller.abort();
    let cancelledRejected = false; try { (await cancelled).close(); } catch (error) { cancelledRejected = error instanceof DOMException && error.name === 'AbortError'; }
    heldForCancel.close();
    const afterCancel = await oldLibrary(cancelledName); const cancelledVersion = afterCancel.version; afterCancel.close();

    const activeName = `${base}-active`;
    const beforeActive = await oldLibrary(activeName); beforeActive.close();
    const activeController = new AbortController();
    const originalGet = IDBObjectStore.prototype.get;
    let lockHeld = true; let lockHeldDuringAbort = false; let guardSeen = false;
    IDBObjectStore.prototype.get = function (key: IDBValidKey | IDBKeyRange) {
      const request = originalGet.call(this, key);
      if (this.name === 'metadata' && key === 'generation') {
        guardSeen = true;
        request.transaction!.addEventListener('abort', () => { lockHeldDuringAbort = lockHeld; });
        request.addEventListener('success', () => queueMicrotask(() => activeController.abort()));
      }
      return request;
    };
    let activeAbortRejected = false;
    try {
      const active = api.openMediaDatabase(indexedDB, activeName, { mode: 'owned', authorised: () => true, subscribeOwnership: noSubscription, signal: activeController.signal });
      await active.then(db => { lockHeld = false; db.close(); }, error => { activeAbortRejected = error instanceof DOMException && error.name === 'AbortError'; lockHeld = false; });
    } finally { IDBObjectStore.prototype.get = originalGet; }
    const afterActiveAbort = await oldLibrary(activeName); const activeVersion = afterActiveAbort.version; afterActiveAbort.close();

    // Exercise the actual coordinator: a release after the final guard must
    // abort before its pending write releases the underlying exclusive lock.
    type Owner = { acquire: (onLoad: (token: symbol) => void, locks: unknown) => () => void; loaded: (token: symbol, readable: boolean) => void; canWrite: (token?: symbol) => boolean; captureWriteToken: () => symbol; subscribe: (listener: () => void) => () => void; write: <T>(operation: () => Promise<T>) => Promise<T> };
    const Coordinator = (coordinatorModule.exports as { StudioWriteOwnership: new () => Owner }).StudioWriteOwnership;
    const coordinator = new Coordinator(); const nextCoordinator = new Coordinator();
    let physicalLock = false;
    const locks = { request: async (_name: string, _options: unknown, callback: (lock: object | null) => Promise<unknown>) => {
      if (physicalLock) return callback(null);
      physicalLock = true;
      try { return await callback({}); } finally { physicalLock = false; }
    } };
    const releaseCoordinator = coordinator.acquire(token => coordinator.loaded(token, true), locks);
    for (let pass = 0; pass < 30 && !coordinator.canWrite(); pass++) await new Promise(resolve => setTimeout(resolve, 0));
    if (!coordinator.canWrite()) throw new Error('Coordinator did not acquire its test lock.');
    const coordinatorName = `${base}-coordinator`;
    const beforeCoordinator = await oldLibrary(coordinatorName); beforeCoordinator.close();
    const originalGetAgain = IDBObjectStore.prototype.get;
    let physicalLockDuringAbort = false; let earlyAcquisition = false; let lateAcquisition = false;
    let cancelEarly = () => {};
    IDBObjectStore.prototype.get = function (key: IDBValidKey | IDBKeyRange) {
      const request = originalGetAgain.call(this, key);
      if (this.name === 'metadata' && key === 'generation') {
        request.transaction!.addEventListener('abort', () => { physicalLockDuringAbort = physicalLock; });
        request.addEventListener('success', () => queueMicrotask(() => {
          releaseCoordinator();
          cancelEarly = nextCoordinator.acquire(token => { nextCoordinator.loaded(token, true); earlyAcquisition = true; }, locks);
        }));
      }
      return request;
    };
    let coordinatorRejected = false;
    try {
      const token = coordinator.captureWriteToken();
      const pendingWrite = coordinator.write(() => api.openMediaDatabase(indexedDB, coordinatorName, { mode: 'owned', authorised: () => coordinator.canWrite(token), subscribeOwnership: coordinator.subscribe }));
      try { (await pendingWrite).close(); } catch { coordinatorRejected = true; }
    } finally { IDBObjectStore.prototype.get = originalGetAgain; }
    cancelEarly();
    for (let pass = 0; pass < 30 && physicalLock; pass++) await new Promise(resolve => setTimeout(resolve, 0));
    const releaseNext = nextCoordinator.acquire(token => { nextCoordinator.loaded(token, true); lateAcquisition = true; }, locks);
    for (let pass = 0; pass < 30 && !lateAcquisition; pass++) await new Promise(resolve => setTimeout(resolve, 0));
    releaseNext();
    const afterCoordinator = await oldLibrary(coordinatorName); const coordinatorVersion = afterCoordinator.version; afterCoordinator.close();

    const read = await api.openMediaDatabase(indexedDB, deniedName, { mode: 'read' }); const readVersion = read.version; read.close();
    const upgraded = await api.openMediaDatabase(indexedDB, deniedName, { mode: 'owned', authorised: () => true, subscribeOwnership: noSubscription }); const upgradedVersion = upgraded.version; const hasNewStore = upgraded.objectStoreNames.contains('assets-v3'); upgraded.close();
    let authorisationChecks = 0; let throwingGuardRejected = false;
    try { (await api.openMediaDatabase(indexedDB, deniedName, { mode: 'owned', authorised: () => { if (++authorisationChecks > 2) throw new Error('Guard unavailable'); return true; }, subscribeOwnership: noSubscription })).close(); }
    catch { throwingGuardRejected = true; }
    let attemptedOpen = false; let initialThrowRejected = false;
    const deniedFactory = { open() { attemptedOpen = true; throw new Error('Must not open'); } } as unknown as IDBFactory;
    try { await api.openMediaDatabase(deniedFactory, deniedName, { mode: 'owned', authorised: () => { throw new Error('Guard unavailable'); }, subscribeOwnership: noSubscription }); }
    catch { initialThrowRejected = !attemptedOpen; }
    const absentName = `${base}-absent`; let absentReadRejected = false;
    try { (await api.openMediaDatabase(indexedDB, absentName, { mode: 'read' })).close(); } catch { absentReadRejected = true; }
    await Promise.all([deleteLibrary(deniedName), deleteLibrary(cancelledName), deleteLibrary(activeName), deleteLibrary(coordinatorName), deleteLibrary(absentName)]);
    return { ownerLossRejected, preservedVersion, preservedBytes: await stored.blob.text(), cancelledRejected, cancelledVersion, guardSeen, activeAbortRejected, lockHeldDuringAbort, activeVersion, coordinatorRejected, physicalLockDuringAbort, earlyAcquisition, lateAcquisition, coordinatorVersion, readVersion, upgradedVersion, hasNewStore, throwingGuardRejected, initialThrowRejected, absentReadRejected };
  }, { migrationSource, openSource, ownershipSource });
  expect(result).toEqual({ ownerLossRejected: true, preservedVersion: 2, preservedBytes: 'safe', cancelledRejected: true, cancelledVersion: 2, guardSeen: true, activeAbortRejected: true, lockHeldDuringAbort: true, activeVersion: 2, coordinatorRejected: true, physicalLockDuringAbort: true, earlyAcquisition: false, lateAcquisition: true, coordinatorVersion: 2, readVersion: 2, upgradedVersion: 3, hasNewStore: true, throwingGuardRejected: true, initialThrowRejected: true, absentReadRejected: true });
});
