import { expect, test } from '@playwright/test';

test('Quote transforms retain body and citation through undo and redo', async ({ page }) => {
  await page.goto('/studio/ui/blocks/quote');
  await expect(page.locator('.ui-block-specimen')).toHaveAttribute('data-ready', 'true');
  const editor = page.locator('.ui-library-canvas');
  const quote = editor.locator('.quote-field').first();
  const body = await quote.locator('.paragraph-field').first().innerText();
  const citation = await quote.locator('.quote-citation').innerText();
  await editor.getByRole('button', { name: 'Transform Quote block' }).click();
  const menu = page.getByRole('menu', { name: 'Transform block' });
  await menu.getByRole('menuitemradio', { name: 'Plain' }).click();
  await editor.getByRole('button', { name: 'Transform Quote block' }).click();
  await expect(menu.getByRole('menuitemradio', { name: 'Plain' })).toHaveAttribute('aria-checked', 'true');
  await menu.getByRole('menuitem', { name: 'Paragraph', exact: true }).click();
  await expect(editor.locator('.quote-field')).toHaveCount(1);
  await expect(editor.locator('.paragraph-field').filter({ hasText: body })).toBeVisible();
  await expect(editor.locator('.paragraph-field').filter({ hasText: citation })).toBeVisible();
  await page.getByRole('button', { name: 'Undo specimen change' }).click();
  await expect(editor.locator('.quote-citation').filter({ hasText: citation })).toBeVisible();
  await page.getByRole('button', { name: 'Redo specimen change' }).click();
  await expect(editor.locator('.paragraph-field').filter({ hasText: citation })).toBeVisible();
});

test('Quote Group conversion preserves citation and respects locks', async ({ page }) => {
  await page.goto('/studio/ui/blocks/quote');
  await expect(page.locator('.ui-block-specimen')).toHaveAttribute('data-ready', 'true');
  const editor = page.locator('.ui-library-canvas');
  const citation = await editor.locator('.quote-citation').first().innerText();
  await page.getByRole('checkbox', { name: 'Lock move and remove' }).check();
  await editor.getByRole('button', { name: 'Transform Quote block' }).click();
  const menu = page.getByRole('menu', { name: 'Transform block' });
  await expect(menu.getByRole('menuitem', { name: 'Group', exact: true })).toHaveCount(0);
  await page.keyboard.press('Escape');
  await page.getByRole('checkbox', { name: 'Lock move and remove' }).uncheck();
  await editor.getByRole('button', { name: 'Transform Quote block' }).click();
  await menu.getByRole('menuitem', { name: 'Group', exact: true }).click();
  await expect(editor.getByRole('group', { name: 'Group block tools' })).toBeVisible();
  await expect(editor.locator('.quote-field')).toHaveCount(1);
  await expect(editor.locator('.paragraph-field').filter({ hasText: citation })).toBeVisible();
  await page.getByRole('button', { name: 'Undo specimen change' }).click();
  await expect(editor.locator('.quote-citation').filter({ hasText: citation })).toBeVisible();
});
