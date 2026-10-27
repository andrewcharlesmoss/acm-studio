import { expect, test } from '@playwright/test';

test('Featured Image can be wrapped in Group without losing its dynamic preview and undo restores it', async ({ page }) => {
  await page.goto('/studio/ui/blocks/cover-image');
  await expect(page.locator('.ui-block-specimen')).toHaveAttribute('data-ready', 'true');
  const editor = page.locator('.ui-library-canvas');
  await expect(editor.locator('.document-featured-placeholder, .document-featured-image')).toHaveCount(1);
  await editor.getByRole('button', { name: 'Transform Featured Image block' }).click();
  await page.getByRole('menu', { name: 'Transform block' }).getByRole('menuitem', { name: 'Group', exact: true }).click();
  await expect(editor.getByRole('group', { name: 'Group block tools' })).toBeVisible();
  await expect(editor.locator('.document-featured-placeholder, .document-featured-image')).toHaveCount(1);
  await page.getByRole('button', { name: 'Undo specimen change' }).click();
  await editor.locator('.document-featured-placeholder, .document-featured-image').click();
  await expect(editor.getByRole('button', { name: 'Transform Featured Image block' })).toBeVisible();
  await expect(editor.locator('.document-featured-placeholder, .document-featured-image')).toHaveCount(1);
});

test('Featured Image wrapper transforms are hidden for locked blocks', async ({ page }) => {
  await page.goto('/studio/ui/blocks/cover-image');
  await expect(page.locator('.ui-block-specimen')).toHaveAttribute('data-ready', 'true');
  const editor = page.locator('.ui-library-canvas');
  await page.getByRole('checkbox', { name: 'Lock move and remove' }).check();
  await expect(editor.getByRole('button', { name: 'Transform Featured Image block' })).toHaveCount(0);
});
