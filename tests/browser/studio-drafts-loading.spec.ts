declare global { interface Window { starterSeen: boolean; loadingLayoutSeen: boolean; releaseWorkspace?: () => void; } }
import { expect, test } from '@playwright/test';

test('Studio Drafts never renders starter content while restoring a saved document', async ({ page }) => {
  const savedDocument = { id: 'saved-draft', kind: 'page', title: 'Saved draft', subtitle: '', slug: 'saved-draft', excerpt: '', status: 'draft', updatedAt: '2026-10-31T00:00:00.000Z', documentShellVersion: 1, tags: [], seoTitle: '', seoDescription: '', blocks: [{ id: 'saved-paragraph', type: 'paragraph', text: 'Saved draft content' }] };
  await page.addInitScript(doc => {
    localStorage.setItem('acm-studio-workspace-v2', JSON.stringify({ version: 56, activeDocumentId: doc.id, documents: [doc], categories: [], bin: [] }));
    window.starterSeen = false;
    window.loadingLayoutSeen = false;
    new MutationObserver(() => {
      if (document.body?.textContent?.includes('Explore the projects')) window.starterSeen = true;
      if (document.querySelector('.studio-library-track') && document.querySelector('.studio-inspector-track') && document.querySelector('.block-editor [role="status"]')?.textContent?.includes('Preparing local workspace')) window.loadingLayoutSeen = true;
    }).observe(document, { childList: true, subtree: true, characterData: true });
  }, savedDocument);
  await page.goto('/studio');
  await expect(page.getByText('Saved draft content', { exact: true }).first()).toBeVisible();
  expect(await page.evaluate(() => window.starterSeen)).toBe(false);
  expect(await page.evaluate(() => window.loadingLayoutSeen)).toBe(true);
});

for (const width of [1440, 390]) {
  test(`loading keeps the panes visible and the status in the canvas at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.addInitScript(() => {
      const queue = window.queueMicrotask.bind(window);
      window.queueMicrotask = callback => {
        if (String(callback).includes('savedWorkspace') && String(callback).includes('reconcilePendingPeerSave')) {
          window.releaseWorkspace = callback;
        } else queue(callback);
      };
    });
    await page.goto('/studio');
    const loading = page.locator('.block-editor [role="status"]', { hasText: 'Preparing local workspace' });
    const navigation = page.locator('.studio-library-track .pane');
    const inspector = page.locator('.studio-inspector-track .pane');
    await expect.poll(() => page.evaluate(() => typeof window.releaseWorkspace)).toBe("function");
    await expect(loading).toBeVisible();
    await expect(navigation).toBeVisible();
    await expect(inspector).toBeVisible();
    await expect(navigation).toHaveAttribute('inert', '');
    await expect(inspector).toHaveAttribute('inert', '');
    await expect(page.getByText('Empty workspace', { exact: true })).toHaveCount(0);
    const [canvasBounds, loadingBounds, navigationBounds, inspectorBounds] = await Promise.all([
      page.locator('.block-editor').boundingBox(), loading.boundingBox(), navigation.boundingBox(), inspector.boundingBox(),
    ]);
    expect(canvasBounds && loadingBounds && navigationBounds && inspectorBounds).toBeTruthy();
    expect(loadingBounds!.x).toBeGreaterThanOrEqual(canvasBounds!.x);
    expect(loadingBounds!.x + loadingBounds!.width).toBeLessThanOrEqual(canvasBounds!.x + canvasBounds!.width);
    expect(navigationBounds!.width).toBeGreaterThan(0);
    expect(inspectorBounds!.width).toBeGreaterThan(0);
    await page.evaluate(() => { if (!window.releaseWorkspace) throw new Error("Workspace release callback was not installed."); window.releaseWorkspace(); });
    await expect(loading).toHaveCount(0);
  });
}

test('the saved draft waits for its shared template before showing the canvas', async ({ page }) => {
  const savedDocument = { id: 'pending-template', kind: 'page', title: 'Pending template', subtitle: '', slug: 'pending-template', excerpt: '', status: 'draft', updatedAt: '2026-10-31T00:00:00.000Z', documentShellVersion: 1, tags: [], seoTitle: '', seoDescription: '', blocks: [{ id: 'pending-content', type: 'paragraph', text: 'Content awaiting its template' }] };
  await page.addInitScript(doc => localStorage.setItem('acm-studio-workspace-v2', JSON.stringify({ version: 57, activeDocumentId: doc.id, documents: [doc], categories: [], bin: [] })), savedDocument);
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  let globalReadSeen = false;
  await page.route('**/__studio/test-site', async route => {
    const body = route.request().postDataJSON();
    if (body.action === 'global-read') { globalReadSeen = true; await gate; }
    await route.continue();
  });
  try {
    await page.goto('/studio?library=page');
    await expect.poll(() => globalReadSeen).toBe(true);
    await expect(page.locator('.block-editor [role="status"]', { hasText: 'Preparing local workspace' })).toBeVisible();
    await expect(page.locator('.studio-library-track .pane')).toBeVisible();
    await expect(page.locator('.studio-inspector-track .pane')).toBeVisible();
    await expect(page.getByText('Content awaiting its template', { exact: true })).toHaveCount(0);
    release();
    await expect(page.getByText('Content awaiting its template', { exact: true }).first()).toBeVisible();
  } finally { release(); }
});

test('a missing image settles into its recovery state', async ({ page }) => {
  const doc = { id: 'missing-image-draft', kind: 'page', title: 'Missing image draft', subtitle: '', slug: 'missing-image-draft', excerpt: '', status: 'draft', updatedAt: '2026-10-31T00:00:00.000Z', documentShellVersion: 1, tags: [], seoTitle: '', seoDescription: '', blocks: [{ id: 'missing-image', type: 'image', src: '', mediaId: 'missing-media-for-test', alt: 'Missing image' }] };
  await page.addInitScript(value => localStorage.setItem('acm-studio-workspace-v2', JSON.stringify({ version: 57, activeDocumentId: value.id, documents: [value], categories: [], bin: [] })), doc);
  await page.goto('/studio?library=page');
  await expect(page.locator('.block-editor [role="status"]', { hasText: 'Preparing local workspace' })).toHaveCount(0);
  await expect(page.getByText('The selected image is unavailable.', { exact: true })).toBeVisible();
});
