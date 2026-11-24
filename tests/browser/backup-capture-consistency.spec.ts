import { expect, test } from '@playwright/test';
import { buildMediaAdapter } from './helpers/media-adapter';
import type { StudioBackup } from '../../app/studio/backup-store';

declare global {
  interface Window {
    backupCaptureStarted: boolean;
    finishBackupReplacement: () => void;
    backupReplacementDone: Promise<void>;
  }
}

for (const binary of [false, true]) test(`read-only backup captures linked document and file changes together (binary=${binary})`, async ({ context, page }) => {
  const adapter = await buildMediaAdapter();
  const peer = await context.newPage();
  await context.route('**/*', route => route.fulfill({ contentType: 'text/html', body: '<title>Disposable backup capture</title>' }));
  for (const tab of [page, peer]) {
    await tab.goto('http://localhost:3011/');
    await tab.addScriptTag({ content: adapter });
  }
  const before = await page.evaluate(async () => {
    const { studioWriteOwnership: owner, mediaStore, createDocument, browserWorkspaceRepository } = window.StudioMediaAdapter;
    owner.acquire(token => owner.loaded(token, true));
    while (!owner.canWrite()) await new Promise(resolve => setTimeout(resolve, 5));
    const now = new Date().toISOString();
    const file = { id: 'linked', name: 'file.txt', type: 'text/plain', size: 1, folderId: null, altText: '', caption: '', createdAt: now, updatedAt: now, blob: new Blob(['A']) };
    await mediaStore.replaceMediaLibrary([file], []);
    const doc = createDocument('page', 'linked');
    doc.title = 'Generation A';
    doc.slug = 'linked';
    doc.blocks = [{ id: 'image', type: 'image', src: '', alt: '', mediaId: file.id }];
    const workspace = { version: 67 as const, documents: [doc], activeDocumentId: doc.id, bin: [], categories: [] };
    browserWorkspaceRepository.save(workspace);
    window.StudioMediaAdapter.publishDocumentLocally(doc);
    return workspace;
  });
  // Hold a real write transaction so the exporting peer has requested its
  // read but cannot see the old files once the linked update commits.
  await page.evaluate(async before => {

    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('acm-studio-media');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const storeName = Array.from(db.objectStoreNames).find(name => name.startsWith('assets'))!;
    const transaction = db.transaction(storeName, 'readwrite');
    const assets = transaction.objectStore(storeName);
    let release = false;
    window.finishBackupReplacement = () => { release = true; };
    const step = () => {
      const request = assets.get('linked');
      request.onsuccess = () => {
        if (!release) { step(); return; }
        const next = structuredClone(before);
        next.documents[0].title = 'Generation B';
        window.StudioMediaAdapter.browserWorkspaceRepository.save(next);
        window.StudioMediaAdapter.publishDocumentLocally(next.documents[0]);
        assets.put({ ...request.result, blob: new Blob(['B']), sourceRevision: crypto.randomUUID() });
      };
    };
    step();
    window.backupReplacementDone = new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => { db.close(); resolve(); };
      transaction.onabort = () => { db.close(); reject(transaction.error); };
    });
  }, before);
  const download = peer.evaluate(async ({ before, binary }) => {

    window.backupCaptureStarted = false;
    const getAll = IDBObjectStore.prototype.getAll;
    IDBObjectStore.prototype.getAll = function (...args) {
      window.backupCaptureStarted = true;
      return getAll.apply(this, args);
    };
    const { backupStore, decodeBackupArchive, studioWriteOwnership } = window.StudioMediaAdapter;
    if (studioWriteOwnership.canWrite()) throw new Error('Expected a read-only exporting peer');
    try {
      const values = (snapshot: StudioBackup, file: string) => ({
        title: snapshot.workspace.documents[0].title, file, publication: JSON.parse(snapshot.publications!).posts[0].title,
        revisions: snapshot.workspace.documentRevisions?.map(item => item.document.title),
      });
      if (binary) {
        const { file } = await backupStore.createCompleteBackupFile(before);
        const archive = await decodeBackupArchive(file);
        return values(archive.content as StudioBackup, await archive.blobs[0].text());
      }
      const snapshot = await backupStore.createStudioBackup(before);
      return values(snapshot, atob(snapshot.media.assets[0].dataBase64));
    } finally { IDBObjectStore.prototype.getAll = getAll; }
  }, { before, binary });
  try {
    await expect.poll(() => peer.evaluate(() => window.backupCaptureStarted)).toBe(true);
  } finally {
    await page.evaluate(async () => { window.finishBackupReplacement(); await window.backupReplacementDone; });
  }
  expect(await download).toMatchObject({ title: 'Generation B', file: 'B', publication: 'Generation B', revisions: expect.arrayContaining(['Generation A', 'Generation B']) });
  await page.evaluate(() => localStorage.setItem(window.StudioMediaAdapter.RESTORE_PENDING_KEY, 'interrupted restore'));
  await expect(peer.evaluate(before => window.StudioMediaAdapter.backupStore.createStudioBackup(before), before)).rejects.toThrow(/restore is pending/);
});

test('the workspace owner can back up its unsaved draft, and conflicting or restoring states refuse export', async ({ page }) => {
  const adapter = await buildMediaAdapter();
  await page.route('**/*', route => route.fulfill({ contentType: 'text/html', body: '<div id="app"></div>' }));
  await page.goto('http://localhost:3011/');
  await page.addScriptTag({ content: adapter });
  const result = await page.evaluate(async () => {
    const { useStudioWorkspace, createRoot, createElement, BackupManager, createDocument, browserWorkspaceRepository, mediaStore, backupStore, LOCAL_WORKSPACE_KEY, RESTORE_PENDING_KEY } = window.StudioMediaAdapter;
    const doc = createDocument('page', 'dirty-document');
    doc.title = 'Saved base';
    const initial = { version: 67 as const, documents: [doc], activeDocumentId: doc.id, bin: [], categories: [] };
    localStorage.setItem(LOCAL_WORKSPACE_KEY, JSON.stringify(initial));
    const repository = { ...browserWorkspaceRepository, save() { throw new Error('Disposable storage unavailable'); } };
    let session!: ReturnType<typeof useStudioWorkspace>;
    function Harness() {
      session = useStudioWorkspace(repository);
      return createElement(BackupManager, { workspace: session.workspace, getBackupDraft: session.getBackupDraft });
    }
    const root = createRoot(document.getElementById('app')!);
    try {
      root.render(createElement(Harness));
      const deadline = Date.now() + 5000;
      while (!session?.writable && Date.now() < deadline) await new Promise(resolve => setTimeout(resolve, 10));
      if (!session?.writable) throw new Error('Workspace owner unavailable');
      await mediaStore.ensureMediaGeneration();
      session.updateActiveDocument(current => ({ ...current, title: 'An unsaved local draft' }));
      const exportDraft = () => backupStore.createStudioBackup(session.getBackupDraft);
      const draft = await exportDraft();
      const unchanged = browserWorkspaceRepository.load()!.documents[0].title;
      // A different committed version of the same page must not be silently
      // overlaid with the pending draft from an older base.
      browserWorkspaceRepository.save({ ...initial, documents: [{ ...doc, title: 'New saved version' }] });
      const refusal = async (operation: () => Promise<unknown>) => {
        try { await operation(); return ''; } catch (error) { return String(error); }
      };
      const conflict = await refusal(exportDraft);
      const latest = localStorage.getItem(LOCAL_WORKSPACE_KEY);
      localStorage.setItem(RESTORE_PENDING_KEY, 'interrupted restore');
      const interrupted = await refusal(() => backupStore.createCompleteBackupFile(initial));
      return { captured: draft.workspace.documents[0].title, unchanged, conflict, interrupted, kept: latest === localStorage.getItem(LOCAL_WORKSPACE_KEY), pending: session.getBackupDraft().workspace.documents[0].title };
    } finally { root.unmount(); }
  });
  expect(result).toMatchObject({ captured: 'An unsaved local draft', unchanged: 'Saved base', conflict: expect.stringMatching(/unsaved changes.*retry/i), interrupted: expect.stringMatching(/restore is pending/i), kept: true, pending: 'An unsaved local draft' });
});

test('backup freezes the first workspace draft inside the Files snapshot', async ({ page }) => {
  await page.route('**/*', route => route.fulfill({ contentType: 'text/html', body: '<title>Disposable draft capture</title>' }));
  await page.goto('http://localhost:3011/');
  await page.addScriptTag({ content: await buildMediaAdapter() });
  const result = await page.evaluate(async () => {
    const { createDocument, backupStore, studioWriteOwnership: owner, mediaStore } = window.StudioMediaAdapter;
    await new Promise<void>((resolve, reject) => {
      owner.acquire(token => { owner.loaded(token, true); resolve(); }, navigator.locks, reject);
    });
    await mediaStore.ensureMediaGeneration();
    const doc = createDocument('page', 'first-draft');
    doc.title = 'At capture';
    const workspace = { version: 67 as const, documents: [doc], activeDocumentId: doc.id, bin: [], categories: [] };
    const backup = await backupStore.createStudioBackup(() => {
      queueMicrotask(() => { doc.title = 'After capture'; });
      return { workspace, pending: null, conflicted: false };
    });
    return { captured: backup.workspace.documents[0].title, live: doc.title };
  });
  expect(result).toEqual({ captured: 'At capture', live: 'After capture' });
});

test('an exporting peer preserves a legacy database and clearly refuses an unavailable library', async ({ page }) => {
  await page.route('**/*', route => route.fulfill({ contentType: 'text/html', body: '<title>Read-only legacy backup</title>' }));
  await page.goto('http://localhost:3011/');
  await page.addScriptTag({ content: await buildMediaAdapter() });
  const result = await page.evaluate(async () => {
    const { createDocument, backupStore, studioWriteOwnership } = window.StudioMediaAdapter;
    const doc = createDocument('page', 'legacy');
    const workspace = { version: 67 as const, documents: [doc], activeDocumentId: doc.id, categories: [], bin: [] };
    let unavailable = '';
    try { await backupStore.createStudioBackup(workspace); } catch (error) { unavailable = String(error); }
    const afterFirstRead = await indexedDB.databases();
    const now = new Date().toISOString();
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open('acm-studio-media', 2);
      request.onupgradeneeded = () => {
        const db = request.result;
        const files = db.createObjectStore('assets', { keyPath: 'id' });
        files.createIndex('folderId', 'folderId');
        files.createIndex('createdAt', 'createdAt');
        files.add({ id: 'legacy', name: 'legacy.txt', type: 'text/plain', size: 1, blob: new Blob(['L']), createdAt: now, updatedAt: now, folderId: null, altText: '', caption: '' });
        db.createObjectStore('folders', { keyPath: 'id' }).createIndex('parentId', 'parentId');
        db.createObjectStore('metadata');
        db.createObjectStore('commandReceipts', { keyPath: 'id' });
      };
      request.onsuccess = () => { request.result.close(); resolve(); };
      request.onerror = () => reject(request.error);
    });
    const backup = await backupStore.createStudioBackup(workspace);
    localStorage.setItem('acm-studio-restore-receipt-v1', 'committed:' + crypto.randomUUID());
    let missingDecision = '';
    try { await backupStore.createStudioBackup(workspace); } catch (error) { missingDecision = String(error); }
    return { bytes: atob(backup.media.assets[0].dataBase64), unavailable, missingDecision, afterFirstRead, databases: await indexedDB.databases(), writable: studioWriteOwnership.canWrite() };
  });
  expect(result).toMatchObject({ bytes: 'L', unavailable: expect.stringMatching(/not available for read-only access/), missingDecision: expect.stringMatching(/restore/i), afterFirstRead: [], databases: [{ name: 'acm-studio-media', version: 2 }], writable: false });
});

test('a peer requires the durable restore receipt even if a stopped browser lost its localStorage intent', async ({ context, page }) => {
  const adapter = await buildMediaAdapter();
  const peer = await context.newPage();
  await context.route('**/*', route => route.fulfill({ contentType: 'text/html', body: '<title>Restore receipt recovery</title>' }));
  for (const tab of [page, peer]) {
    await tab.goto('http://localhost:3011/');
    await tab.addScriptTag({ content: adapter });
  }
  const { original, restored, id } = await page.evaluate(async () => {
    const { studioWriteOwnership: owner, mediaStore, createDocument, LOCAL_WORKSPACE_KEY } = window.StudioMediaAdapter;
    owner.acquire(token => owner.loaded(token, true));
    const deadline = Date.now() + 5000;
    while (!owner.canWrite() && Date.now() < deadline) await new Promise(resolve => setTimeout(resolve, 10));
    if (!owner.canWrite()) throw new Error('Workspace owner unavailable');
    const doc = createDocument('page', 'receipt');
    doc.title = 'Original workspace A';
    doc.blocks = [{ id: 'file', type: 'image', src: '', alt: '', mediaId: 'same-file' }];
    const original = { version: 67 as const, documents: [doc], activeDocumentId: doc.id, categories: [], bin: [] };
    const restored = structuredClone(original);
    restored.documents[0].title = 'Restored workspace B';
    // Recreate the cold-start state: localStorage retained A, but
    // IndexedDB committed B's Files and recovery decision atomically.
    localStorage.setItem(LOCAL_WORKSPACE_KEY, JSON.stringify(original));
    await mediaStore.ensureMediaGeneration();
    const id = crypto.randomUUID();
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open('acm-studio-media');
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction(['metadata', 'assets-v3'], 'readwrite');
        const now = new Date().toISOString();
        tx.objectStore('assets-v3').put({ id: 'same-file', name: 'file.txt', folderId: null, type: 'text/plain', size: 1, blob: new Blob(['B']), altText: '', caption: '', createdAt: now, updatedAt: now });
        const meta = tx.objectStore('metadata');
        meta.put(id, 'generation');
        meta.put({ version: 1, id, phase: 'committed', generation: id, values: [JSON.stringify(restored), null, null, null] }, 'fullRestore');
        tx.oncomplete = () => { db.close(); resolve(); };
        tx.onabort = () => { db.close(); reject(tx.error); };
      };
    });
    return { original, restored, id };
  });
  const exportFromPeer = () => peer.evaluate(async workspace => {
    const { backupStore, studioWriteOwnership } = window.StudioMediaAdapter;
    if (studioWriteOwnership.canWrite()) throw new Error('The exporting peer unexpectedly owns recovery');
    const snapshot = await backupStore.createStudioBackup(workspace);
    return { title: snapshot.workspace.documents[0].title, bytes: atob(snapshot.media.assets[0].dataBase64) };
  }, original);
  await expect(exportFromPeer()).rejects.toThrow(/restore|recovery/i);
  await page.evaluate(() => localStorage.setItem('acm-studio-restore-receipt-v1', 'original:' + crypto.randomUUID()));
  await expect(peer.evaluate(source => window.StudioMediaAdapter.backupStore.createCompleteBackupFile(source), original)).rejects.toThrow(/restore|recovery/i);
  await page.evaluate(({ restored, id }) => {
    localStorage.setItem(window.StudioMediaAdapter.LOCAL_WORKSPACE_KEY, JSON.stringify(restored));
    localStorage.setItem('acm-studio-restore-receipt-v1', 'committed:' + id);
  }, { restored, id });
  expect(await exportFromPeer()).toEqual({ title: 'Restored workspace B', bytes: 'B' });
  await page.evaluate(async (restored) => {
    const { browserWorkspaceRepository, mediaStore } = window.StudioMediaAdapter;
    const next = structuredClone(restored);
    next.documents[0].title = 'Later legitimate edit';
    browserWorkspaceRepository.save(next);
    await mediaStore.replaceMediaAssetContent('same-file', new File(['C'], 'file.txt', { type: 'text/plain' }));
  }, restored);
  expect(await exportFromPeer()).toEqual({ title: 'Later legitimate edit', bytes: 'C' });
});

for (const binary of [false, true]) test(`backup rejects publication recovery records without changing them (binary=${binary})`, async ({ page, context }) => {
  const adapter = await buildMediaAdapter();
  await context.route('**/*', route => route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>Publication recovery capture</title>' }));
  const peer = await context.newPage();
  for (const tab of [page, peer]) {
    await tab.goto('http://localhost:3011/');
    await tab.addScriptTag({ content: adapter });
  }
  const workspace = await page.evaluate(async () => {
    const { studioWriteOwnership: owner, mediaStore, createDocument, browserWorkspaceRepository } = window.StudioMediaAdapter;
    owner.acquire(token => owner.loaded(token, true));
    while (!owner.canWrite()) await new Promise(resolve => setTimeout(resolve, 5));
    await mediaStore.replaceMediaLibrary([], []);
    const document = createDocument('page', 'publication-capture');
    const workspace = { version: 67 as const, documents: [document], activeDocumentId: document.id, bin: [], categories: [] };
    browserWorkspaceRepository.save(workspace);
    return workspace;
  });
  for (const committed of [false, true]) {
    await page.evaluate(committed => {
      const id = crypto.randomUUID();
      localStorage.setItem('acm-studio-publication-commit-v1', JSON.stringify({ version: 1, operationId: id, previousWorkspace: localStorage.getItem('acm-studio-workspace-v2') }));
      localStorage.setItem('acm-studio-publications-v1', JSON.stringify({ version: 59, posts: [], ...(committed ? { publicationCommitId: id } : {}) }));
    }, committed);
    for (const tab of [page, peer]) {
      const result = await tab.evaluate(async ({ workspace, binary }) => {
        const before = JSON.stringify({ ...localStorage });
        let error = '';
        try {
          if (binary) await window.StudioMediaAdapter.backupStore.createCompleteBackupFile(workspace);
          else await window.StudioMediaAdapter.backupStore.createStudioBackup(workspace);
        } catch (failure) { error = (failure as Error).message; }
        return { error, unchanged: before === JSON.stringify({ ...localStorage }) };
      }, { workspace, binary });
      expect(result.error).toMatch(/publication needs recovery/);
      expect(result.unchanged).toBe(true);
    }
    await page.evaluate(() => { localStorage.removeItem('acm-studio-publication-commit-v1'); });
  }
  const race = await peer.evaluate(async ({ workspace, binary }) => {
    const source = () => {
      localStorage.setItem('acm-studio-publication-commit-v1', JSON.stringify({ version: 1, operationId: crypto.randomUUID(), previousWorkspace: localStorage.getItem('acm-studio-workspace-v2') }));
      return { workspace, pending: null, conflicted: false };
    };
    try {
      if (binary) await window.StudioMediaAdapter.backupStore.createCompleteBackupFile(source);
      else await window.StudioMediaAdapter.backupStore.createStudioBackup(source);
      return '';
    } catch (error) { return (error as Error).message; }
  }, { workspace, binary });
  expect(race).toMatch(/Studio changed during backup|publication needs recovery/);
  await page.evaluate(() => { localStorage.removeItem('acm-studio-publication-commit-v1'); });
  await expect(peer.evaluate(async ({ workspace, binary }) => {
    if (binary) await window.StudioMediaAdapter.backupStore.createCompleteBackupFile(workspace);
    else await window.StudioMediaAdapter.backupStore.createStudioBackup(workspace);
    return true;
  }, { workspace, binary })).resolves.toBe(true);
  await peer.close();
});

for (const failure of ['restore write', 'journal cleanup']) test(`full restore settles publication recovery before capturing originals: ${failure}`, async ({ page, context }) => {
  const adapter = await buildMediaAdapter();
  await context.route('**/*', route => route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>Publication and restore recovery</title>' }));
  await page.goto('http://localhost:3011/');
  await page.addScriptTag({ content: adapter });
  const result = await page.evaluate(async failure => {
    const { studioWriteOwnership: owner, mediaStore, createDocument, browserWorkspaceRepository, backupStore } = window.StudioMediaAdapter;
    owner.acquire(token => owner.loaded(token, true));
    while (!owner.canWrite()) await new Promise(resolve => setTimeout(resolve, 5));
    await mediaStore.replaceMediaLibrary([], []);
    const document = createDocument('page', 'original');
    document.title = 'Original document';
    const workspace = { version: 67 as const, documents: [document], activeDocumentId: document.id, bin: [], categories: [] };
    browserWorkspaceRepository.save(workspace);
    const backup = await backupStore.createStudioBackup(workspace);
    backup.workspace.documents[0].title = 'Restore target';
    const key = 'acm-studio-workspace-v2';
    const original = localStorage.getItem(key);
    const pending = 'acm-studio-publication-commit-v1';
    localStorage.setItem(pending, JSON.stringify({ version: 1, operationId: crypto.randomUUID(), previousWorkspace: original }));
    localStorage.setItem(key, JSON.stringify({ ...workspace, documents: [{ ...document, title: 'Interrupted publication' }] }));
    const set = Storage.prototype.setItem, remove = Storage.prototype.removeItem;
    Storage.prototype.setItem = function (name, value) {
      if (failure === 'restore write' && name === key && value.includes('Restore target')) throw new Error('Injected restore failure');
      set.call(this, name, value);
    };
    Storage.prototype.removeItem = function (name) {
      if (failure === 'journal cleanup' && name === pending) throw new Error('Injected journal cleanup failure');
      remove.call(this, name);
    };
    let error = '';
    try { await backupStore.restoreStudioBackup(backup); }
    catch (caught) { error = (caught as Error).message; }
    finally { Storage.prototype.setItem = set; Storage.prototype.removeItem = remove; }
    return { error, originalKept: localStorage.getItem(key) === original, journalKept: localStorage.getItem(pending) !== null,
      restorePending: localStorage.getItem('acm-studio-pending-restore-v1') };
  }, failure);
  expect(result.error).toMatch(/Injected/);
  expect(result.originalKept).toBe(true);
  expect(result.journalKept).toBe(failure === 'journal cleanup');
  expect(result.restorePending).toBe(null);
});
