import { expect, test } from '@playwright/test';

test('the add-block button follows selection and inserts at that block', async ({ page }) => {
  const doc = { id: 'selected-inserter', kind: 'page', title: 'Selected inserter', subtitle: '', slug: 'selected-inserter', excerpt: '', status: 'draft', updatedAt: '2026-10-31T00:00:00.000Z', documentShellVersion: 1, tags: [], seoTitle: '', seoDescription: '', blocks: [{ id: 'first', type: 'paragraph', text: 'First paragraph' }, { id: 'middle', type: 'paragraph', text: '' }, { id: 'last', type: 'paragraph', text: 'Last paragraph' }] };
  await page.addInitScript(value => localStorage.setItem('acm-studio-workspace-v2', JSON.stringify({ version: 56, activeDocumentId: value.id, documents: [value], categories: [], bin: [] })), doc);
  await page.goto('/studio');
  const first = page.locator('[data-studio-block-anchor-id="first"]');
  const middle = page.locator('[data-studio-block-anchor-id="middle"]');
  const last = page.locator('[data-studio-block-anchor-id="last"]');
  await expect(first).toBeVisible();
  await expect(page.locator('.canvas-appender-button:visible')).toHaveCount(0);
  await first.click();
  await expect(first.locator('.canvas-appender-button')).toBeVisible();
  await middle.click();
  await expect(first.locator('.canvas-appender-button')).toHaveCount(0);
  await expect(middle.locator('.canvas-appender-button')).toBeVisible();
  await middle.locator('.canvas-appender-button').click();
  await page.getByRole('dialog', { name: 'Choose a block' }).getByRole('button', { name: 'Heading', exact: true }).click();
  await expect(middle).toHaveCount(0);
  await expect(page.locator('.canvas-blocks > .block-position').nth(1)).toContainText('');
  await expect(page.locator('.canvas-blocks > .block-position').nth(1).locator('.canvas-block')).toHaveClass(/is-heading/);
  await expect(last).toBeVisible();
});

test('adding beside a filled block inserts after it rather than at the document end', async ({ page }) => {
  const doc = { id: 'filled-selected', kind: 'page', title: 'Filled', subtitle: '', slug: 'filled', excerpt: '', status: 'draft', updatedAt: '2026-10-31T00:00:00.000Z', documentShellVersion: 1, tags: [], seoTitle: '', seoDescription: '', blocks: [{ id: 'first-filled', type: 'paragraph', text: 'First' }, { id: 'last-filled', type: 'paragraph', text: 'Last' }] };
  await page.addInitScript(value => localStorage.setItem('acm-studio-workspace-v2', JSON.stringify({ version: 56, activeDocumentId: value.id, documents: [value], categories: [], bin: [] })), doc);
  await page.goto('/studio');
  const first = page.locator('[data-studio-block-anchor-id="first-filled"]');
  await first.click();
  await first.locator('.canvas-appender-button').click();
  await page.getByRole('dialog', { name: 'Choose a block' }).getByRole('button', { name: 'Heading', exact: true }).click();
  const blocks = page.locator('.canvas-blocks > .block-position > .canvas-block');
  await expect(blocks).toHaveCount(3);
  await expect(blocks.nth(0)).toHaveAttribute('data-studio-block-anchor-id', 'first-filled');
  await expect(blocks.nth(1)).toHaveClass(/is-heading/);
  await expect(blocks.nth(2)).toHaveAttribute('data-studio-block-anchor-id', 'last-filled');
});

test('the add-block button follows a nested paragraph and inserts within its group', async ({ page }) => {
  const doc = { id: 'nested-selected', kind: 'page', title: 'Nested', subtitle: '', slug: 'nested', excerpt: '', status: 'draft', updatedAt: '2026-10-31T00:00:00.000Z', documentShellVersion: 1, tags: [], seoTitle: '', seoDescription: '', blocks: [{ id: 'group', type: 'group', layout: 'flow', children: [{ id: 'nested-first', type: 'paragraph', text: 'Nested first' }, { id: 'nested-last', type: 'paragraph', text: 'Nested last' }] }] };
  await page.addInitScript(value => localStorage.setItem('acm-studio-workspace-v2', JSON.stringify({ version: 56, activeDocumentId: value.id, documents: [value], categories: [], bin: [] })), doc);
  await page.goto('/studio');
  const first = page.locator('[data-studio-nested-block-id="nested-first"]');
  await first.click();
  await expect(first.locator(':scope > .canvas-appender-button')).toBeVisible();
  await first.locator(':scope > .canvas-appender-button').click();
  await page.getByRole('dialog', { name: 'Choose a block' }).getByRole('button', { name: 'Heading', exact: true }).click();
  const children = page.locator('[data-studio-block-anchor-id="group"] .studio-nested-group > .studio-nested-block');
  await expect(children).toHaveCount(3);
  await expect(children.nth(0)).toHaveAttribute('data-studio-nested-block-id', 'nested-first');
  await expect(children.nth(1).locator('.heading-field')).toBeVisible();
  await expect(children.nth(2)).toHaveAttribute('data-studio-nested-block-id', 'nested-last');
});

test('a selected image offers the inserter and keeps its place', async ({ page }) => {
  const doc = { id: 'image-selected', kind: 'page', title: 'Image', subtitle: '', slug: 'image', excerpt: '', status: 'draft', updatedAt: '2026-10-31T00:00:00.000Z', documentShellVersion: 1, tags: [], seoTitle: '', seoDescription: '', blocks: [{ id: 'image', type: 'image', src: '/specimens/landscape.svg', alt: 'Landscape', displayWidth: 160, displayHeight: 90 }, { id: 'after-image', type: 'paragraph', text: 'After image' }] };
  await page.addInitScript(value => localStorage.setItem('acm-studio-workspace-v2', JSON.stringify({ version: 56, activeDocumentId: value.id, documents: [value], categories: [], bin: [] })), doc);
  await page.setViewportSize({ width: 820, height: 900 });
  await page.goto('/studio');
  const image = page.locator('[data-studio-block-anchor-id="image"]');
  await image.click();
  const plus = image.locator(':scope > .canvas-appender-button');
  await expect(plus).toBeVisible();
  await plus.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog', { name: 'Choose a block' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(plus).toBeFocused();
});

test('a locked empty paragraph is kept when inserting beside it', async ({ page }) => {
  const doc = { id: 'locked-selected', kind: 'page', title: 'Locked', subtitle: '', slug: 'locked', excerpt: '', status: 'draft', updatedAt: '2026-10-31T00:00:00.000Z', documentShellVersion: 1, tags: [], seoTitle: '', seoDescription: '', blocks: [{ id: 'locked', type: 'paragraph', text: '', editorial: { lock: { remove: true } } }, { id: 'after-locked', type: 'paragraph', text: 'After' }] };
  await page.addInitScript(value => localStorage.setItem('acm-studio-workspace-v2', JSON.stringify({ version: 57, activeDocumentId: value.id, documents: [value], categories: [], bin: [] })), doc);
  await page.goto('/studio');
  const locked = page.locator('[data-studio-block-anchor-id="locked"]');
  await locked.click();
  await locked.locator('.canvas-appender-button').click();
  await page.getByRole('dialog', { name: 'Choose a block' }).getByRole('button', { name: 'Heading', exact: true }).click();
  await expect(locked).toBeVisible();
  const blocks = page.locator('.canvas-blocks > .block-position > .canvas-block');
  await expect(blocks).toHaveCount(3);
  await expect(blocks.nth(1)).toHaveClass(/is-heading/);
  await expect(blocks.nth(2)).toHaveAttribute('data-studio-block-anchor-id', 'after-locked');
});
