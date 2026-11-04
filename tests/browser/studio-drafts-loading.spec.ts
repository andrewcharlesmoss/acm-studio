import { expect, test } from '@playwright/test';

test('Studio Drafts never renders starter content while restoring a saved document', async ({ page }) => {
  const savedDocument = { id: 'saved-draft', kind: 'page', title: 'Saved draft', subtitle: '', slug: 'saved-draft', excerpt: '', status: 'draft', updatedAt: '2026-10-31T00:00:00.000Z', documentShellVersion: 1, tags: [], seoTitle: '', seoDescription: '', blocks: [{ id: 'saved-paragraph', type: 'paragraph', text: 'Saved draft content' }] };
  await page.addInitScript(doc => {
    localStorage.setItem('acm-studio-workspace-v2', JSON.stringify({ version: 56, activeDocumentId: doc.id, documents: [doc], categories: [], bin: [] }));
    (window as any).starterSeen = false;
    (window as any).loadingLayoutSeen = false;
    new MutationObserver(() => {
      if (document.body?.textContent?.includes('Explore the projects')) (window as any).starterSeen = true;
      if (document.querySelector('.studio-library-track') && document.querySelector('.studio-inspector-track') && document.querySelector('.block-editor [role="status"]')?.textContent?.includes('Preparing local workspace')) (window as any).loadingLayoutSeen = true;
    }).observe(document, { childList: true, subtree: true, characterData: true });
  }, savedDocument);
  await page.goto('/studio');
  await expect(page.getByText('Saved draft content', { exact: true }).first()).toBeVisible();
  expect(await page.evaluate(() => (window as any).starterSeen)).toBe(false);
  expect(await page.evaluate(() => (window as any).loadingLayoutSeen)).toBe(true);
});

for (const width of [1440, 390]) {
  test(`loading keeps the panes visible and the status in the canvas at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.addInitScript(() => {
      const queue = window.queueMicrotask.bind(window);
      window.queueMicrotask = callback => {
        if (String(callback).includes('savedWorkspace') && String(callback).includes('reconcilePendingPeerSave')) {
          (window as any).releaseWorkspace = callback;
        } else queue(callback);
      };
    });
    await page.goto('/studio');
    const loading = page.locator('.block-editor [role="status"]', { hasText: 'Preparing local workspace' });
    const navigation = page.locator('.studio-library-track .pane');
    const inspector = page.locator('.studio-inspector-track .pane');
    await expect.poll(() => page.evaluate(() => typeof (window as any).releaseWorkspace)).toBe("function");
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
    await page.evaluate(() => (window as any).releaseWorkspace());
    await expect(loading).toHaveCount(0);
  });
}
