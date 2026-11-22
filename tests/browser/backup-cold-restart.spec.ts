import { chromium, expect, test, type BrowserContext, type Page } from '@playwright/test';
import { mkdtemp, realpath, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { buildMediaAdapter } from './helpers/media-adapter';

async function openOwner(profile: string, source: string) {
  const context = await chromium.launchPersistentContext(profile, { channel: process.env.STUDIO_BROWSER_CHANNEL, args: ['--enable-automation'] });
  try {
    await context.route('**/*', route => route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>Disposable restore profile</title>' }));
    const page = await context.newPage();
    await page.goto('http://localhost:31984/');
    await page.addScriptTag({ content: source });
    await page.evaluate(() => {
      const owner = window.StudioMediaAdapter.studioWriteOwnership;
      owner.acquire(token => owner.loaded(token, true));
    });
    await expect.poll(() => page.evaluate(() => window.StudioMediaAdapter.studioWriteOwnership.getState())).toBe('writable');
    return { context, page };
  } catch (error) {
    await context.close();
    throw error;
  }
}

function linkedContent(page: Page) {
  return page.evaluate(async () => {
    const { LOCAL_WORKSPACE_KEY, mediaStore } = window.StudioMediaAdapter;
    const workspace = JSON.parse(localStorage.getItem(LOCAL_WORKSPACE_KEY) ?? 'null');
    const document = workspace?.documents[0];
    const id = document?.blocks[0]?.mediaId;
    const file = id && await mediaStore.getMediaAsset(id);
    return { document: document?.id, file: file?.name, bytes: await file?.blob.text() };
  });
}

async function terminateOwnBrowser(context: BrowserContext, profile: string) {
  const browser = context.browser()!;
  const session = await browser.newBrowserCDPSession();
  const command = await session.send('Browser.getBrowserCommandLine');
  const userDataDir = command.arguments.find(arg => arg.startsWith('--user-data-dir='))?.slice('--user-data-dir='.length);
  expect(userDataDir).toBeTruthy();
  expect(await realpath(userDataDir!)).toBe(await realpath(profile));
  const { processInfo } = await session.send('SystemInfo.getProcessInfo');
  const pid = processInfo.find(info => info.type === 'browser')?.id;
  expect(pid).toBeGreaterThan(1);
  const closed = new Promise<void>(resolve => browser.once('disconnected', () => resolve()));
  process.kill(pid!, 'SIGKILL');
  await closed;
}

test('cold browser restart reopens the committed Files and corresponding document together', async () => {
  test.setTimeout(90_000);
  const source = await buildMediaAdapter();
  const profile = await mkdtemp(path.join(tmpdir(), 'acm-full-restore-chrome-'));
  let active: Awaited<ReturnType<typeof openOwner>> | undefined;
  try {
    active = await openOwner(profile, source);
    await active.page.evaluate(async () => {
      const { createDocument, LOCAL_WORKSPACE_KEY, mediaStore } = window.StudioMediaAdapter;
      const [file] = await mediaStore.addMediaFiles([new File(['old bytes'], 'Old.txt')], null);
      const doc = createDocument('page', 'original-document');
      doc.blocks = [{ type: 'image', id: 'original', src: '', mediaId: file.id, alt: '' }];
      localStorage.setItem(LOCAL_WORKSPACE_KEY, JSON.stringify({ version: 67, documents: [doc], activeDocumentId: doc.id, categories: [], bin: [] }));
    });
    await active.context.close();
    active = await openOwner(profile, source);
    expect(await linkedContent(active.page)).toEqual({ document: 'original-document', file: 'Old.txt', bytes: 'old bytes' });

    const session = await active.context.newCDPSession(active.page);
    await session.send('Debugger.enable');
    await active.page.evaluate(() => {
      const nativePut = IDBObjectStore.prototype.put;
      IDBObjectStore.prototype.put = function (data, key) {
        // Observe the real replacement transaction, independent of localStorage's flush schedule.
        if (key === 'generation' && this.transaction.objectStoreNames.contains('assets-v3')) {
          // eslint-disable-next-line no-debugger -- CDP stops only the disposable browser at the commit boundary.
          this.transaction.addEventListener('complete', () => { debugger; }, { once: true });
        }
        return nativePut.call(this, data, key);
      };
    });
    const committed = new Promise<void>(resolve => session.once('Debugger.paused', () => resolve()));
    await active.page.evaluate(() => {
      const { createDocument, backupStore } = window.StudioMediaAdapter;
      const document = createDocument('page', 'restored-document');
      document.blocks = [{ type: 'image', id: 'restored', src: '', mediaId: 'restored-file', alt: '' }];
      const now = new Date().toISOString();
      void backupStore.restoreStudioBackup(backupStore.validateStudioBackup({
        format: 'acm-studio-backup', version: 47, exportedAt: now, publications: null,
        workspace: { version: 67, documents: [document], activeDocumentId: document.id, categories: [], bin: [] },
        media: { folders: [], assets: [{ id: 'restored-file', name: 'Restored.txt', size: 1, type: 'text/plain', dataBase64: 'Yg==', folderId: null, createdAt: now, updatedAt: now, altText: '', caption: '' }] },
      }));
    });
    await committed;
    await terminateOwnBrowser(active.context, profile);
    active = await openOwner(profile, source);
    expect(await linkedContent(active.page)).toEqual({ document: 'restored-document', file: 'Restored.txt', bytes: 'b' });
  } finally {
    await active?.context.close().catch(() => {});
    await rm(profile, { recursive: true, force: true });
  }
});
