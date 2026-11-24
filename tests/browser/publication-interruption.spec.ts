import { expect, test, type Page } from '@playwright/test';
import { createStudioHttpFixture } from '../helpers/studio-http-fixture.mjs';
import { LOCAL_PUBLICATIONS_KEY, LOCAL_WORKSPACE_KEY } from '../../app/content/local-storage-keys';

test.setTimeout(60000);

const body = 'A page for checking interrupted publication.';

async function openDraft(page: Page, origin: string, kind: 'page' | 'post' = 'page') {
  await page.addInitScript(({ key, body, kind }) => {
    if (localStorage.getItem(key) !== null) return;
    const doc = { id: 'interruption-page', slug: 'interruption-page', kind, title: 'Recovery example',
      status: 'draft', excerpt: body, updatedAt: '2026-10-01T00:00:00Z', tags: [], seoTitle: '', seoDescription: '',
      blocks: [{ id: 'paragraph', type: 'paragraph', text: body }] };
    localStorage.setItem(key, JSON.stringify({ version: 67, documents: [doc], activeDocumentId: doc.id, categories: [], bin: [] }));
  }, { key: LOCAL_WORKSPACE_KEY, body, kind });
  await page.goto(origin + `/studio?library=${kind}`);
}

for (const action of ['publish', 'unpublish'] as const) for (const failingStore of ['workspace', 'publication', 'recovery space'] as const) {
  test(`failed ${failingStore} save during ${action} preserves editor and reader state on reload`, async ({ page }, testInfo) => {
    const fixture = await createStudioHttpFixture({ frontendURL: String(testInfo.project.use.baseURL) });
    try {
      await openDraft(page, fixture.origin);
      const publish = page.getByRole('button', { name: 'Publish', exact: true });
      await expect(publish).toBeEnabled();
      if (action === 'unpublish') {
        await publish.click();
        await expect.poll(() => page.evaluate(key => JSON.parse(localStorage.getItem(key)!).documents[0].status, LOCAL_WORKSPACE_KEY)).toBe('published');
      }
      const previous = await page.evaluate(key => localStorage.getItem(key), LOCAL_PUBLICATIONS_KEY);
      await page.evaluate(key => {
        const nativeSet = Storage.prototype.setItem;
        Storage.prototype.setItem = function (name, value) {
          if (this === localStorage && name === key) {
            document.documentElement.dataset.writeFailed = 'true';
            throw new DOMException('Injected storage failure', 'QuotaExceededError');
          }
          nativeSet.call(this, name, value);
        };
      }, failingStore === 'workspace' ? LOCAL_WORKSPACE_KEY : failingStore === 'publication' ? LOCAL_PUBLICATIONS_KEY : 'acm-studio-publication-commit-v1');
      if (action === 'publish') await publish.click();
      else {
        await page.getByRole('button', { name: 'Published', exact: true }).click();
        await page.getByRole('radio', { name: /^Draft/ }).click();
      }
      await expect(page.locator('html')).toHaveAttribute('data-write-failed', 'true');
      await page.reload();
      await expect(page.getByRole('button', { name: action === 'publish' ? 'Draft' : 'Published', exact: true })).toBeVisible();
      expect(await page.evaluate(key => localStorage.getItem(key), LOCAL_PUBLICATIONS_KEY)).toBe(previous);
      await page.goto(fixture.origin + '/pages/interruption-page');
      await expect(page.getByText(action === 'publish' ? 'This page is not published in this browser.' : body, { exact: true }).first()).toBeVisible();
    } finally {
      await fixture.close();
    }
  });
}

for (const interruptedAfter of ['workspace', 'publication'] as const) {
  test(`crashing the writer after its ${interruptedAfter} write recovers a coherent publication on reopen`, async ({ page, context }, testInfo) => {
    const fixture = await createStudioHttpFixture({ frontendURL: String(testInfo.project.use.baseURL) });
    try {
      await openDraft(page, fixture.origin);
      const publish = page.getByRole('button', { name: 'Publish', exact: true });
      await expect(publish).toBeEnabled();
      const id = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).activeDocumentId, LOCAL_WORKSPACE_KEY);
      const protocol = await context.newCDPSession(page);
      await protocol.send('Debugger.enable');
      await page.evaluate(key => {
        const nativeSet = Storage.prototype.setItem;
        Storage.prototype.setItem = function (name, value) {
          nativeSet.call(this, name, value);
          // eslint-disable-next-line no-debugger -- Playwright crashes the isolated renderer at this storage boundary.
          if (this === localStorage && name === key) debugger; // Stop the renderer precisely between the two commits or before cleanup.
        };
      }, interruptedAfter === 'workspace' ? LOCAL_WORKSPACE_KEY : LOCAL_PUBLICATIONS_KEY);
      const paused = new Promise<void>(resolve => protocol.once('Debugger.paused', () => resolve()));
      // The click cannot return from its handler because the renderer closes at the breakpoint.
      const click = publish.click().catch(() => {});
      await paused;
      const crashed = page.waitForEvent('crash');
      void protocol.send('Page.crash').catch(() => {});
      await crashed;
      await page.close();
      await click;
      const reopened = await context.newPage();
      await reopened.goto(fixture.origin + '/studio?library=page');
      const published = interruptedAfter === 'publication';
      await expect(reopened.getByRole('button', { name: published ? 'Published' : 'Draft', exact: true })).toBeVisible();
      const state = await reopened.evaluate(({ id, workspaceKey, publicationKey }) => {
        const workspace = JSON.parse(localStorage.getItem(workspaceKey)!);
        const publication = JSON.parse(localStorage.getItem(publicationKey) ?? '{"posts":[]}');
        return { status: workspace.documents.find((doc: {id: string}) => doc.id === id)?.status,
          visible: publication.posts.some((post: {localDocumentId: string}) => post.localDocumentId === id),
          journal: localStorage.getItem('acm-studio-publication-commit-v1') };
      }, { id, workspaceKey: LOCAL_WORKSPACE_KEY, publicationKey: LOCAL_PUBLICATIONS_KEY });
      expect(state).toEqual({ status: published ? 'published' : 'draft', visible: published, journal: null });
    } finally {
      await fixture.close();
    }
  });
}

test('failed journal cleanup keeps a committed publication visible and finishes on reload', async ({ page }, testInfo) => {
  const fixture = await createStudioHttpFixture({ frontendURL: String(testInfo.project.use.baseURL) });
  try {
    await openDraft(page, fixture.origin);
    const publish = page.getByRole('button', { name: 'Publish', exact: true });
    await expect(publish).toBeEnabled();
    await page.evaluate(() => {
      const remove = Storage.prototype.removeItem;
      Storage.prototype.removeItem = function (key) {
        if (this === localStorage && key === 'acm-studio-publication-commit-v1') throw new Error('Injected cleanup failure');
        remove.call(this, key);
      };
    });
    await publish.click();
    await expect(page.getByText('Publication saved. Reload Studio to finish clearing the recovery record.', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Published', exact: true })).toBeVisible();
    await page.reload();
    await expect(page.getByRole('button', { name: 'Published', exact: true })).toBeVisible();
    expect(await page.evaluate(() => localStorage.getItem('acm-studio-publication-commit-v1'))).toBe(null);
    await page.goto(fixture.origin + '/pages/interruption-page');
    await expect(page.getByText(body, { exact: true }).first()).toBeVisible();
  } finally {
    await fixture.close();
  }
});

for (const kind of ['page', 'post'] as const) test(`open ${kind} readers withhold local captures during a full restore`, async ({ page, context, baseURL }) => {
  const fixture = await createStudioHttpFixture({ frontendURL: baseURL });
  try {
    await openDraft(page, fixture.origin, kind);
    await page.getByRole('button', { name: 'Publish', exact: true }).click();
    await expect.poll(() => page.evaluate(key => JSON.parse(localStorage.getItem(key)!).documents[0].status, LOCAL_WORKSPACE_KEY)).toBe('published');
    const reader = await context.newPage();
    await reader.goto(`${fixture.origin}/${kind === 'page' ? 'pages' : 'writing'}/interruption-page`);
    await expect(reader.getByText(body, { exact: true }).first()).toBeVisible();
    const archive = kind === 'post' ? await context.newPage() : null;
    if (archive) {
      await archive.goto(fixture.origin + '/writing');
      await expect(archive.getByRole('link', { name: 'Recovery example', exact: true })).toBeVisible();
    }
    const original = await page.evaluate(key => localStorage.getItem(key), LOCAL_PUBLICATIONS_KEY);
    await page.evaluate(() => { localStorage.setItem('acm-studio-pending-restore-v1', `preparing:${crypto.randomUUID()}`); });
    await expect(reader.getByText(body, { exact: true })).toHaveCount(0);
    if (archive) await expect(archive.getByRole('link', { name: 'Recovery example', exact: true })).toHaveCount(0);
    expect(await page.evaluate(key => localStorage.getItem(key), LOCAL_PUBLICATIONS_KEY)).toBe(original);
    await page.evaluate(() => { localStorage.removeItem('acm-studio-pending-restore-v1'); });
    await expect(reader.getByText(body, { exact: true }).first()).toBeVisible();
    if (archive) await expect(archive.getByRole('link', { name: 'Recovery example', exact: true })).toBeVisible();
    await reader.close(); await archive?.close();
  } finally { await fixture.close(); }
});
