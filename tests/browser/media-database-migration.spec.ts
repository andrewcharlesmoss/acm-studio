import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

test('media-store migration preserves data and rejects legacy asset-store reads', async ({ page }) => {
  const source = ts.transpileModule(await readFile('app/studio/media-database-migration.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  await page.route('**/*', route => route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>Migration test</title>' }));
  await page.goto('http://localhost:3011/');
  const result = await page.evaluate(async source => {
    const module = { exports: {} };
    new Function('exports', 'module', source)(module.exports, module);
    const migration = module.exports as { upgradeMediaDatabase: (db: IDBDatabase, tx: IDBTransaction, oldVersion: number, onFailure?: (error: Error) => void) => void; mediaAssetStoreName: (db: IDBDatabase) => string };
    const name = `acm-migration-test-${crypto.randomUUID()}`;
    function open(version?: number, upgrade?: (db: IDBDatabase, tx: IDBTransaction, oldVersion: number) => void, databaseName = name): Promise<IDBDatabase> {
      return new Promise((resolve, reject) => {
        const request = indexedDB.open(databaseName, version);
        request.onupgradeneeded = event => upgrade?.(request.result, request.transaction!, event.oldVersion);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    }
    function removeDatabase(databaseName: string): Promise<void> {
      return new Promise((resolve, reject) => {
        const request = indexedDB.deleteDatabase(databaseName);
        request.onsuccess = () => resolve(); request.onerror = () => reject(request.error);
        request.onblocked = () => reject(new Error('Temporary database cleanup was blocked.'));
      });
    }
    let db = await open(2, database => {
      const assets = database.createObjectStore('assets', { keyPath: 'id' }); assets.createIndex('folderId', 'folderId'); assets.createIndex('createdAt', 'createdAt');
      database.createObjectStore('folders', { keyPath: 'id' }).createIndex('parentId', 'parentId');
      database.createObjectStore('metadata'); database.createObjectStore('commandReceipts', { keyPath: 'id' });
    });
    const oldName = migration.mediaAssetStoreName(db);
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(['assets', 'metadata', 'commandReceipts'], 'readwrite');
      tx.objectStore('assets').put({ id: 'one', blob: new Blob(['preserved original']), folderId: null, sourceRevision: 'source-one' });
      tx.objectStore('metadata').put('generation-one', 'generation'); tx.objectStore('commandReceipts').put({ id: 'receipt-one' });
      tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error);
    });
    db.close();
    let aborted = false;
    try { await open(3, (database, tx, oldVersion) => { migration.upgradeMediaDatabase(database, tx, oldVersion); tx.abort(); }); }
    catch { aborted = true; }
    db = await open(2);
    const rollbackName = migration.mediaAssetStoreName(db);
    const rollbackIndexes = [...db.transaction('assets').objectStore('assets').indexNames];
    let versionChangeClosed = false;
    db.onversionchange = () => { versionChangeClosed = true; db.close(); };
    const upgraded = await open(3, migration.upgradeMediaDatabase);
    const newName = migration.mediaAssetStoreName(upgraded);
    const transaction = upgraded.transaction(['assets-v3', 'metadata', 'commandReceipts']);
    function get(store: string, id: string): Promise<any> {
      return new Promise((resolve, reject) => { const request = transaction.objectStore(store).get(id); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); });
    }
    const [asset, generation, receipt] = await Promise.all([get('assets-v3', 'one'), get('metadata', 'generation'), get('commandReceipts', 'receipt-one')]);
    const indexes = [...transaction.objectStore('assets-v3').indexNames];
    upgraded.close();
    const oldReader = await open();
    let oldReadRejected = false;
    try { oldReader.transaction('assets'); } catch { oldReadRejected = true; }
    oldReader.close();
    let oldWriteRejected = false;
    try { const old = await open(2); old.close(); } catch { oldWriteRejected = true; }
    const freshName = `${name}-fresh`;
    const fresh = await open(3, migration.upgradeMediaDatabase, freshName);
    const freshStores = [...fresh.objectStoreNames];
    const freshAssetIndexes = [...fresh.transaction('assets-v3').objectStore('assets-v3').indexNames];
    fresh.close();
    const legacyName = `${name}-v1`;
    const legacy = await open(1, database => database.createObjectStore('assets', { keyPath: 'id' }), legacyName);
    legacy.close();
    const migratedLegacy = await open(3, migration.upgradeMediaDatabase, legacyName);
    const legacyStores = [...migratedLegacy.objectStoreNames]; migratedLegacy.close();
    async function rejectsCorrupt(includeBoth: boolean) {
      const corruptName = `${name}-${includeBoth ? 'conflict' : 'missing'}`;
      const corrupt = await open(2, database => {
        if (includeBoth) { database.createObjectStore('assets'); database.createObjectStore('assets-v3'); }
        database.createObjectStore('metadata');
      }, corruptName);
      corrupt.close();
      let rejected = false;
      try { await open(3, (database, tx, oldVersion) => { try { migration.upgradeMediaDatabase(database, tx, oldVersion); } catch { tx.abort(); } }, corruptName); }
      catch { rejected = true; }
      const unchanged = await open(2, undefined, corruptName);
      const version = unchanged.version; unchanged.close(); await removeDatabase(corruptName);
      return rejected && version === 2;
    }
    const corruptRejected = await rejectsCorrupt(true) && await rejectsCorrupt(false);
    async function rejectsReserved(field: object, suffix: string) {
      const legacyName = `${name}-${suffix}`;
      let old = await open(2, database => database.createObjectStore('assets', { keyPath: 'id' }), legacyName);
      await new Promise<void>((resolve, reject) => { const tx = old.transaction('assets', 'readwrite'); tx.objectStore('assets').put({ id: 'kept', blob: new Blob(['original']), ...field }); tx.oncomplete = () => resolve(); tx.onabort = () => reject(tx.error); });
      old.close();
      let reason = ''; let rejected = false;
      try { await open(3, (database, tx, version) => migration.upgradeMediaDatabase(database, tx, version, error => { reason = error.message; }), legacyName); }
      catch { rejected = true; }
      old = await open(2, undefined, legacyName);
      const saved = await new Promise<any>((resolve, reject) => { const request = old.transaction('assets').objectStore('assets').get('kept'); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); });
      const preserved = old.version === 2 && await saved.blob.text() === 'original' && JSON.stringify(Object.fromEntries(Object.keys(field).map(key => [key, saved[key]]))) === JSON.stringify(field);
      old.close(); await removeDatabase(legacyName);
      return rejected && preserved && reason.includes('kept unchanged');
    }
    const reservedRejected = await rejectsReserved({ imageRenditions: { unexpected: true } }, 'reserved') && await rejectsReserved({ imageRenditions: null }, 'null') && await rejectsReserved({ sourceRevision: '' }, 'revision') && await rejectsReserved({ sourceRevision: 42 }, 'number') && await rejectsReserved({ sourceRevision: 'x'.repeat(181) }, 'long');
    const futureRejected = (() => { try { migration.mediaAssetStoreName({ version: 4, objectStoreNames: { contains: (value: string) => value === 'assets-v3' } } as unknown as IDBDatabase); return false; } catch { return true; } })();
    await Promise.all([removeDatabase(name), removeDatabase(freshName), removeDatabase(legacyName)]);
    return { oldName, aborted, rollbackName, rollbackIndexes, versionChangeClosed, newName, indexes, oldReadRejected, oldWriteRejected, freshStores, freshAssetIndexes, legacyStores, corruptRejected, reservedRejected, futureRejected, bytes: await asset.blob.text(), sourceRevision: asset.sourceRevision, generation, receipt: receipt.id };
  }, source);
  expect(result).toEqual({ oldName: 'assets', aborted: true, rollbackName: 'assets', rollbackIndexes: ['createdAt', 'folderId'], versionChangeClosed: true, newName: 'assets-v3', indexes: ['createdAt', 'folderId'], oldReadRejected: true, oldWriteRejected: true, freshStores: ['assets-v3', 'commandReceipts', 'folders', 'metadata'], freshAssetIndexes: ['createdAt', 'folderId'], legacyStores: ['assets-v3', 'commandReceipts', 'folders', 'metadata'], corruptRejected: true, reservedRejected: true, futureRejected: true, bytes: 'preserved original', sourceRevision: 'source-one', generation: 'generation-one', receipt: 'receipt-one' });
});
