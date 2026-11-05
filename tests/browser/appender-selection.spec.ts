import { expect, test } from '@playwright/test';

for (const trailingEmpty of [false, true]) {
  test(`end inserter requires a selected block (${trailingEmpty ? 'empty' : 'filled'} last paragraph)`, async ({ page }) => {
    const doc = { id: 'appender-selection', kind: 'page', title: 'Appender selection', subtitle: '', slug: 'appender-selection', excerpt: '', status: 'draft', updatedAt: '2026-10-31T00:00:00.000Z', documentShellVersion: 1, tags: [], seoTitle: '', seoDescription: '', blocks: [
      { id: 'first', type: 'paragraph', text: 'First paragraph' },
      { id: 'last', type: 'paragraph', text: trailingEmpty ? '' : 'Last paragraph' },
    ] };
    await page.addInitScript(doc => localStorage.setItem('acm-studio-workspace-v2', JSON.stringify({ version: 56, activeDocumentId: doc.id, documents: [doc], categories: [], bin: [] })), doc);
    await page.goto('/studio');
    const block = page.locator('[data-studio-block-anchor-id="first"]');
    const plus = page.locator('.canvas-appender-button:visible');
    await expect(block).toBeVisible();
    await expect(plus).toHaveCount(0);
    await block.click();
    await expect(plus).toHaveCount(1);
    await plus.click();
    await expect(page.getByRole('dialog', { name: /block/i })).toBeVisible();
    await page.keyboard.press('Escape');
  });
}

test('keyboard selection exposes the inserter and clearing the selection hides it', async ({ page }) => {
  const doc = { id: 'keyboard-appender', kind: 'page', title: 'Keyboard', subtitle: '', slug: 'keyboard', excerpt: '', status: 'draft', updatedAt: '2026-10-31T00:00:00.000Z', documentShellVersion: 1, tags: [], seoTitle: '', seoDescription: '', blocks: [{ id: 'keyboard-paragraph', type: 'paragraph', text: 'Keyboard paragraph' }] };
  await page.addInitScript(doc => localStorage.setItem('acm-studio-workspace-v2', JSON.stringify({ version: 56, activeDocumentId: doc.id, documents: [doc], categories: [], bin: [] })), doc);
  await page.goto('/studio');
  const block = page.locator('[data-studio-block-anchor-id="keyboard-paragraph"]');
  const plus = page.locator('.canvas-appender-button:visible');
  await expect(block).toBeVisible();
  await block.focus();
  await expect(block).toHaveClass(/is-selected/);
  await expect(plus).toHaveCount(1);
  await plus.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog', { name: 'Choose a block' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Choose a block' })).toBeHidden();
  await page.locator('.block-canvas').click({ position: { x: 5, y: 5 } });
  await expect(block).not.toHaveClass(/is-selected/);
  await expect(plus).toHaveCount(0);
});

test('an empty document still creates its first paragraph', async ({ page }) => {
  const doc = { id: 'empty-appender', kind: 'page', title: 'Empty', subtitle: '', slug: 'empty', excerpt: '', status: 'draft', updatedAt: '2026-10-31T00:00:00.000Z', documentShellVersion: 1, tags: [], seoTitle: '', seoDescription: '', blocks: [] };
  await page.addInitScript(doc => localStorage.setItem('acm-studio-workspace-v2', JSON.stringify({ version: 56, activeDocumentId: doc.id, documents: [doc], categories: [], bin: [] })), doc);
  await page.goto('/studio');
  // The empty-document appender takes focus and creates the first paragraph.
  const paragraph = page.getByRole('textbox', { name: 'Paragraph text' });
  await expect(paragraph).toBeFocused();
  await paragraph.pressSequentially('First paragraph');
  await expect(paragraph).toHaveText('First paragraph');
  await expect(page.locator('[data-studio-block-anchor-id]')).toHaveCount(1);
});
