import { expect, test } from '@playwright/test';

test('Quote parent toolbar follows Gutenberg controls and keeps inline formatting on its Paragraph', async ({ page }) => {
  await page.goto('/studio?site=test');
  const quote = page.locator('.quote-field').filter({ hasText: 'The best ideas leave room for a new perspective.' }).first();
  await expect(quote).toBeVisible();
  await expect(quote.locator('.quote-citation-editor')).toBeVisible();
  await quote.click({ position: { x: 2, y: 2 } });

  const toolbar = quote.locator('xpath=..').locator('.canvas-block-toolbar');
  await expect(toolbar).toBeVisible();
  const labels = await toolbar.locator('button[aria-label]').evaluateAll(buttons => buttons.map(button => button.getAttribute('aria-label')));
  expect(labels).toEqual([
    'Transform Quote block',
    'Drag to reorder Quote block',
    'Move block up',
    'Move block down',
    'Align block',
    'Text alignment',
    'Remove citation',
    'More block options',
  ]);
  await expect(toolbar.getByRole('button', { name: 'Remove citation' })).toHaveAttribute('aria-pressed', 'true');
});
