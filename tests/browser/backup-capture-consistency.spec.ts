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
    return { bytes: atob(backup.media.assets[0].dataBase64), unavailable, afterFirstRead, databases: await indexedDB.databases(), writable: studioWriteOwnership.canWrite() };
  });
  expect(result).toMatchObject({ bytes: 'L', unavailable: expect.stringMatching(/not available for read-only access/), afterFirstRead: [], databases: [{ name: 'acm-studio-media', version: 2 }], writable: false });
});
