import { expect, test } from '@playwright/test';

test('List View preserves a collapsed parent for the same item and opens it for a new selection', async ({ page }) => {
  await page.addInitScript(() => {
    const document = { id: 'list-view', kind: 'page', title: 'List selection', subtitle: '', slug: 'list-view', excerpt: '', status: 'draft', updatedAt: '2026-11-05T00:00:00Z', documentShellVersion: 1, tags: [], template: 'default', seoTitle: '', seoDescription: '', blocks: [{ id: 'list', type: 'list', style: 'unordered', items: ['First item', 'Second item'] }] };
    localStorage.setItem('acm-studio-workspace-v2', JSON.stringify({ version: 59, activeDocumentId: document.id, documents: [document], categories: [], bin: [] }));
  });
  await page.goto('/studio');
  const items = page.locator('.list-item-editor');
  await items.nth(0).click();
  await page.getByRole('button', { name: 'List View', exact: true }).click();
  const view = page.getByRole('complementary', { name: 'List View', exact: true });
  await view.getByRole('button', { name: 'Collapse List', exact: true }).click();
  await expect(view.getByRole('button', { name: 'Expand List', exact: true })).toBeVisible();
  await items.nth(0).click();
  await expect(view.getByRole('button', { name: 'Expand List', exact: true })).toBeVisible();
  await items.nth(1).click();
  await expect(view.getByRole('button', { name: 'Collapse List', exact: true })).toBeVisible();
});
