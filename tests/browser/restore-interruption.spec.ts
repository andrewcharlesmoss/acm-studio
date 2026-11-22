import { test, expect, type BrowserContext, type Page } from '@playwright/test';
import { buildMediaAdapter } from './helpers/media-adapter';

const origin = 'http://localhost:31983';

async function openStudio(context: BrowserContext, source: string, url = origin) {
  const page = await context.newPage();
  await page.goto(url);
  await page.addScriptTag({ content: source });
  return page;
}

async function own(page: Page) {
  await page.evaluate(() => {
    const owner = window.StudioMediaAdapter.studioWriteOwnership;
    owner.acquire(token => owner.loaded(token, true));
  });
  await expect.poll(() => page.evaluate(() => window.StudioMediaAdapter.studioWriteOwnership.getState())).toBe('writable');
}

async function interruptAtWorkspaceWrite(page: Page, operation: 'restore' | 'recover', committed = false) {
  const client = await page.context().newCDPSession(page);
  await client.send('Debugger.enable');
  await page.evaluate(committed => {
    if (committed) {
      const nativeRemove = Storage.prototype.removeItem;
      Storage.prototype.removeItem = function (key) {
        // eslint-disable-next-line no-debugger -- CDP terminates this disposable renderer at this instruction.
        if (key === 'acm-studio-pending-restore-v1') debugger;
        nativeRemove.call(this, key);
      };
      return;
    }
    const native = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === window.StudioMediaAdapter.LOCAL_WORKSPACE_KEY) {
        // eslint-disable-next-line no-debugger -- CDP terminates this disposable renderer at this instruction.
        debugger;
      }
      native.call(this, key, value);
    };
  }, committed);
  const paused = new Promise<void>(resolve => client.once('Debugger.paused', () => resolve()));
  await page.evaluate(operation => {
    const { backupStore, createDocument, studioWriteOwnership } = window.StudioMediaAdapter;
    if (operation === 'recover') {
      studioWriteOwnership.acquire(token => studioWriteOwnership.loaded(token, true));
      return;
    }
    const doc = createDocument('page', 'restored-document');
    doc.blocks = [{ type: 'image', id: 'image', mediaId: 'restored-file', src: '', alt: '' }];
    const now = '2026-11-22T00:00:00Z';
    const input = { version: 47, format: 'acm-studio-backup', exportedAt: now,
      workspace: { version: 67, activeDocumentId: doc.id, documents: [doc], categories: [], bin: [] }, publications: null,
      media: { folders: [], assets: [{ id: 'restored-file', name: 'New.txt', size: 1, type: 'text/plain', folderId: null, createdAt: now, updatedAt: now, caption: '', altText: '', dataBase64: 'Yg==' }] } };
    void backupStore.restoreStudioBackup(backupStore.validateStudioBackup(input));
  }, operation);
  await paused;
  const crashed = page.waitForEvent('crash');
  void client.send('Page.crash').catch(() => {});
  await crashed;
  await page.close();
}

for (const committed of [false, true]) test(`renderer termination ${committed ? 'after' : 'before'} the Files commit recovers a coherent workspace`, async ({ context }) => {
  const source = await buildMediaAdapter();
  await context.route('**/*', route => route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>Disposable recovery test</title>' }));
  const original = await openStudio(context, source);
  await own(original);
  await original.evaluate(async () => {
    const { mediaStore, createDocument, LOCAL_WORKSPACE_KEY } = window.StudioMediaAdapter;
    const [oldFile] = await mediaStore.addMediaFiles([new File(['old'], 'Old.txt')], null);
    const doc = createDocument('page', 'original-document');
    doc.blocks = [{ type: 'image', id: 'original', src: '', mediaId: oldFile.id, alt: '' }];
    localStorage.setItem('acm-studio-publications-v1', '');
    localStorage.setItem('acm-studio-templates-v1', '{old malformed value');
    localStorage.setItem(LOCAL_WORKSPACE_KEY, JSON.stringify({ version: 67, activeDocumentId: doc.id, documents: [doc], categories: [], bin: [] }));
  });
  await interruptAtWorkspaceWrite(original, 'restore', committed);
  if (!committed) {
    const second = await openStudio(context, source);
    await interruptAtWorkspaceWrite(second, 'recover');
  }
  const next = await openStudio(context, source);
  await own(next);
  const after = await next.evaluate(async () => {
    const { mediaStore, LOCAL_WORKSPACE_KEY } = window.StudioMediaAdapter;
    const doc = JSON.parse(localStorage.getItem(LOCAL_WORKSPACE_KEY)!).documents[0];
    return {
      document: doc.id,
      bytes: await (await mediaStore.getMediaAsset(doc.blocks[0].mediaId))?.blob.text(),
      files: (await mediaStore.listMediaLibrary()).assets.map(asset => asset.name),
      publications: localStorage.getItem('acm-studio-publications-v1'),
      templates: localStorage.getItem('acm-studio-templates-v1'),
      pending: localStorage.getItem('acm-studio-pending-restore-v1'),
    };
  });
  expect(after).toEqual(committed
    ? { document: 'restored-document', bytes: 'b', files: ['New.txt'], publications: null, templates: null, pending: null }
    : { document: 'original-document', bytes: 'old', files: ['Old.txt'], publications: '', templates: '{old malformed value', pending: null });
});

test('native quota failure preserves original aggregates, media bytes and generation', async ({ context }) => {
  await context.route('**/*', route => route.fulfill({ contentType: 'text/html', body: '<!doctype html>' }));
  const page = await openStudio(context, await buildMediaAdapter());
  await own(page);
  const result = await page.evaluate(async () => {
    const { mediaStore, backupStore, createDocument, LOCAL_WORKSPACE_KEY, studioWriteOwnership } = window.StudioMediaAdapter;
    const [file] = await mediaStore.addMediaFiles([new File(['old bytes'], 'Original.txt')], null);
    const original = '{recoverable unreadable original';
    localStorage.setItem(LOCAL_WORKSPACE_KEY, original);
    localStorage.setItem('acm-studio-publications-v1', '');
    const generation = await mediaStore.ensureMediaGeneration();
    let padding = '';
    while (true) {
      try { localStorage.setItem('unrelated-example', padding + 'x'.repeat(32768)); }
      catch (error) { if (!(error instanceof DOMException) || error.name !== 'QuotaExceededError') throw error; break; }
      padding += 'x'.repeat(32768);
    }
    // Keep enough room for the small restore receipt, but not for this document.
    if (padding.length > 32768) localStorage.setItem('unrelated-example', padding.slice(32768));
    const doc = createDocument('page', 'large-document');
    doc.blocks = Array.from({ length: 100 }, (_, index) => ({ id: 'text-' + index, type: 'paragraph' as const, text: 'large draft '.repeat(1000) }));
    const backup = backupStore.validateStudioBackup({
      version: 47, format: 'acm-studio-backup', exportedAt: '2026-11-22T00:00:00Z',
      workspace: { version: 67, documents: [doc], activeDocumentId: doc.id, categories: [], bin: [] }, publications: null, media: { assets: [], folders: [] },
    });
    let failure = '';
    try { await backupStore.restoreStudioBackup(backup); } catch (error) { failure = error instanceof Error ? error.name : 'unexpected'; }
    return { failure, oldBytes: await (await mediaStore.getMediaAsset(file.id))?.blob.text(), workspace: localStorage.getItem(LOCAL_WORKSPACE_KEY),
      publications: localStorage.getItem('acm-studio-publications-v1'), pending: localStorage.getItem('acm-studio-pending-restore-v1'),
      generationPreserved: await mediaStore.ensureMediaGeneration() === generation, status: studioWriteOwnership.getState() };
  });
  expect(result).toEqual({ failure: 'QuotaExceededError', oldBytes: 'old bytes', workspace: '{recoverable unreadable original',
    publications: '', pending: null, generationPreserved: true, status: 'writable' });
});

test('unrecognised recovery evidence is preserved and a temporary owner can release its lock', async ({ context }) => {
  await context.route('**/*', route => route.fulfill({ contentType: 'text/html', body: '<!doctype html>' }));
  const page = await openStudio(context, await buildMediaAdapter());
  const result = await page.evaluate(async () => {
    const { StudioWriteOwnership, studioWriteOwnership, LOCAL_WORKSPACE_KEY } = window.StudioMediaAdapter;
    localStorage.setItem('acm-studio-pending-restore-v1', 'unrecognised');
    localStorage.setItem(LOCAL_WORKSPACE_KEY, 'recoverable original');
    const temporary = new StudioWriteOwnership();
    let loaded = false;
    await new Promise<void>((resolve, reject) => {
      const release = temporary.acquire(() => reject(new Error('Loaded an unverified restore')), navigator.locks, () => { release(); resolve(); });
    });
    // The temporary owner releases its lifetime lock after its recovery promise drains.
    await navigator.locks.request("acm-studio-writer-v1", () => {});
    await new Promise<void>((resolve, reject) => {
      studioWriteOwnership.acquire(() => { loaded = true; reject(new Error('Unexpected writer')); }, navigator.locks, () => resolve());
    });
    return { loaded, state: studioWriteOwnership.getState(), original: localStorage.getItem(LOCAL_WORKSPACE_KEY),
      marker: localStorage.getItem('acm-studio-pending-restore-v1') };
  });
  expect(result).toEqual({ loaded: false, state: 'blocked', original: 'recoverable original', marker: 'unrecognised' });
});

test('standalone Design explains blocked restore recovery and preserves the original profile', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('acm-studio-pending-restore-v1', 'invalid-receipt');
    localStorage.setItem('acm-studio-designs-v1', '{retain me');
  });
  await page.goto('/studio/designs');
  await expect(page.getByRole('alert').filter({ hasText: /keep this browser profile intact/i })).toBeVisible();
  await expect(page.getByText('Loading the design canvas…')).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem('acm-studio-designs-v1'))).toBe('{retain me');
});

for (const readable of [true, false]) test(`standalone Design starts with the recovered ${readable ? 'saved design' : 'unreadable original'}`, async ({ context, baseURL }) => {
  const url = new URL('/disposable-restore-entry', baseURL).href;
  await context.route(url, route => route.fulfill({ contentType: 'text/html', body: '<!doctype html>' }));
  const page = await openStudio(context, await buildMediaAdapter(), url);
  await own(page);
  const original = await page.evaluate(async readable => {
    const date = '2026-11-22T00:00:00Z';
    const value = readable ? JSON.stringify([{ id: 'original-design', name: 'Recovered drawing', format: 'acm-studio-design', version: 1, createdAt: date, updatedAt: date, activePageId: 'a', assets: [], pages: [{ id: 'a', name: 'Cover', width: 300, height: 200, background: { kind: 'solid', colour: '#ffffff' }, objects: [] }] }]) : '{unreadable saved design';
    localStorage.setItem('acm-studio-designs-v1', value);
    return value;
  }, readable);
  await interruptAtWorkspaceWrite(page, 'restore');
  const design = await context.newPage();
  await design.goto('/studio/designs');
  if (readable) {
    await expect(design.getByRole('textbox', { name: 'Design name' })).toHaveValue('Recovered drawing');
    await expect(design.getByRole('button', { name: 'Add page', exact: true }).first()).toBeEnabled();
  } else {
    await expect(design.getByRole('alert').filter({ hasText: /keep this browser profile intact/i })).toBeVisible();
    await expect(design.getByText('Loading the design canvas…')).toHaveCount(0);
  }
  expect(await design.evaluate(() => localStorage.getItem('acm-studio-designs-v1'))).toBe(original);
});

test('a lost localStorage flush replays the committed Files decision and later deliberate reverts survive', async ({ context }) => {
  const source = await buildMediaAdapter();
  await context.route('**/*', route => route.fulfill({ contentType: 'text/html', body: '<!doctype html>' }));
  const original = await openStudio(context, source);
  await own(original);
  const before = await original.evaluate(async () => {
    const { createDocument, backupStore, LOCAL_WORKSPACE_KEY } = window.StudioMediaAdapter;
    const doc = createDocument('page', 'stored-page');
    const now = '2026-11-22T00:00:00Z';
    const workspace = { version: 67, documents: [doc], activeDocumentId: doc.id, categories: [], bin: [] };
    const raw = JSON.stringify(workspace);
    localStorage.setItem(LOCAL_WORKSPACE_KEY, raw);
    doc.title = 'Committed restore';
    const backup = backupStore.validateStudioBackup({ version: 47, format: 'acm-studio-backup', exportedAt: now,
      workspace, publications: null, media: { folders: [], assets: [{ id: 'new', name: 'Target.txt', size: 1, dataBase64: 'Yg==', type: 'text/plain', folderId: null, createdAt: now, updatedAt: now, altText: '', caption: '' }] } });
    await backupStore.restoreStudioBackup(backup);
    // Simulate exactly the process-loss observation: IDB committed but all
    // localStorage records returned to the last durable pre-restore checkpoint.
    localStorage.setItem(LOCAL_WORKSPACE_KEY, raw);
    localStorage.removeItem('acm-studio-pending-restore-v1');
    localStorage.removeItem('acm-studio-restore-receipt-v1');
    return raw;
  });
  await original.close();
  const recovered = await openStudio(context, source);
  await own(recovered);
  expect(await recovered.evaluate(async () => {
    const { mediaStore, LOCAL_WORKSPACE_KEY } = window.StudioMediaAdapter;
    return [JSON.parse(localStorage.getItem(LOCAL_WORKSPACE_KEY)!).documents[0].title, await (await mediaStore.getMediaAsset('new'))?.blob.text()];
  })).toEqual(['Committed restore', 'b']);
  await recovered.evaluate(async raw => {
    const { mediaStore, LOCAL_WORKSPACE_KEY } = window.StudioMediaAdapter;
    localStorage.setItem(LOCAL_WORKSPACE_KEY, raw);
    const { assets, folders } = await mediaStore.listMediaLibrary();
    await mediaStore.replaceMediaLibrary(assets, folders);
  }, before);
  await recovered.close();
  const reopened = await openStudio(context, source);
  await own(reopened);
  expect(await reopened.evaluate(() => localStorage.getItem(window.StudioMediaAdapter.LOCAL_WORKSPACE_KEY))).toBe(before);
});

test('an interrupted first restore can initialise Files and still reload its original generation', async ({ context }) => {
  const source = await buildMediaAdapter();
  await context.route('**/*', route => route.fulfill({ contentType: 'text/html', body: '<!doctype html>' }));
  const first = await openStudio(context, source);
  await own(first);
  await first.evaluate(() => localStorage.setItem(window.StudioMediaAdapter.LOCAL_WORKSPACE_KEY, 'original'));
  await interruptAtWorkspaceWrite(first, 'restore');
  const next = await openStudio(context, source);
  await next.evaluate(() => localStorage.removeItem('acm-studio-pending-restore-v1'));
  await own(next);
  expect(await next.evaluate(() => localStorage.getItem(window.StudioMediaAdapter.LOCAL_WORKSPACE_KEY))).toBe('original');
  const generation = await next.evaluate(() => window.StudioMediaAdapter.mediaStore.ensureMediaGeneration());
  await next.close();
  const reopened = await openStudio(context, source);
  await own(reopened);
  expect(await reopened.evaluate(() => window.StudioMediaAdapter.mediaStore.ensureMediaGeneration())).toBe(generation);
});

for (const version of [0, 1, 2]) test(`startup verification preserves a Files database at original version ${version}`, async ({ context }) => {
  await context.route('**/*', route => route.fulfill({ contentType: 'text/html', body: '<!doctype html>' }));
  const page = await openStudio(context, await buildMediaAdapter());
  await page.evaluate(async version => {
    if (version === 0) return;
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open('acm-studio-media', version);
      request.onupgradeneeded = () => {
        request.result.createObjectStore('assets', { keyPath: 'id' }).put({ id: 'retained', blob: new Blob(['legacy']) });
        request.result.createObjectStore('folders', { keyPath: 'id' });
        if (version >= 2) {
          request.result.createObjectStore('metadata');
          request.result.createObjectStore('commandReceipts', { keyPath: 'id' });
        }
      };
      request.onsuccess = () => { request.result.close(); resolve(); };
      request.onerror = () => reject(request.error);
    });
  }, version);
  await own(page);
  const info = await page.evaluate(async version => {
    const db = (await indexedDB.databases()).find(item => item.name === 'acm-studio-media');
    const file = version ? await window.StudioMediaAdapter.mediaStore.getMediaAsset('retained') : null;
    return [db?.version ?? 0, file ? await file.blob.text() : null];
  }, version);
  expect(info).toEqual([version, version ? 'legacy' : null]);
});

test('a corrupt durable journal blocks writing even when localStorage has no restore marker', async ({ context }) => {
  await context.route('**/*', route => route.fulfill({ contentType: 'text/html', body: '<!doctype html>' }));
  const source = await buildMediaAdapter();
  const original = await openStudio(context, source);
  await own(original);
  await original.evaluate(async () => {
    await window.StudioMediaAdapter.mediaStore.ensureMediaGeneration();
    await new Promise<void>((resolve, reject) => {
      const req = indexedDB.open('acm-studio-media');
      req.onsuccess = () => {
        const db = req.result;
        const tx = db.transaction('metadata', 'readwrite');
        tx.objectStore('metadata').put({ version: 2, values: [] }, 'fullRestore');
        tx.oncomplete = () => { db.close(); resolve(); };
        tx.onabort = () => { db.close(); reject(tx.error); };
      };
      req.onerror = () => reject(req.error);
    });
    localStorage.setItem(window.StudioMediaAdapter.LOCAL_WORKSPACE_KEY, 'retained original');
  });
  await original.close();
  const reopened = await openStudio(context, source);
  const state = await reopened.evaluate(async () => {
    const { studioWriteOwnership: owner, LOCAL_WORKSPACE_KEY } = window.StudioMediaAdapter;
    await new Promise<void>((resolve, reject) => { owner.acquire(() => reject(new Error('Unexpected load')), navigator.locks, () => resolve()); });
    return [owner.getState(), owner.canWrite(), localStorage.getItem(LOCAL_WORKSPACE_KEY)];
  });
  expect(state).toEqual(['blocked', false, 'retained original']);
});
