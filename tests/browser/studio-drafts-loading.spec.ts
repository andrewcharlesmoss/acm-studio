import { expect, test } from '@playwright/test';

test('Studio Drafts never renders starter content while restoring a saved document', async ({ page }) => {
  const document = { id: 'saved-draft', kind: 'page', title: 'Saved draft', subtitle: '', slug: 'saved-draft', excerpt: '', status: 'draft', updatedAt: '2026-10-31T00:00:00.000Z', documentShellVersion: 1, tags: [], seoTitle: '', seoDescription: '', blocks: [{ id: 'saved-paragraph', type: 'paragraph', text: 'Saved draft content' }] };
  await page.addInitScript(doc => {
    localStorage.setItem('acm-studio-workspace-v2', JSON.stringify({ version: 56, activeDocumentId: doc.id, documents: [doc], categories: [], bin: [] }));
    (window as any).starterSeen = false;
    new MutationObserver(() => {
      if (document.body?.textContent?.includes('Explore the projects')) (window as any).starterSeen = true;
    }).observe(document, { childList: true, subtree: true, characterData: true });
  }, document);
  await page.goto('/studio');
  await expect(page.getByText('Saved draft content', { exact: true }).first()).toBeVisible();
  expect(await page.evaluate(() => (window as any).starterSeen)).toBe(false);
});
