import { expect, test } from '@playwright/test';

test('Featured Image can be wrapped in Group without losing its dynamic preview and undo restores it', async ({ page }) => {
  await page.goto('/studio/ui/blocks/cover-image');
  await expect(page.locator('.ui-block-specimen')).toHaveAttribute('data-ready', 'true');
  const editor = page.locator('.ui-library-canvas');
  const image = editor.locator('.document-featured-placeholder, .document-featured-image');
  await expect(image).toHaveCount(1);
  await editor.getByRole('button', { name: 'Transform Featured Image block' }).click();
  await page.getByRole('menu', { name: 'Transform block' }).getByRole('menuitem', { name: 'Group', exact: true }).click();
  await expect(editor.getByRole('group', { name: 'Group block tools' })).toBeVisible();
  await expect(image).toHaveCount(1);
  await page.getByRole('button', { name: 'Undo specimen change' }).click();
  const wrap = editor.locator('.canvas-cover-wrap').filter({ has: page.locator('.document-featured-placeholder, .document-featured-image') });
  const actions = wrap.locator('.canvas-cover-actions');
  await wrap.hover();
  await expect(actions).toHaveCSS('opacity', '1');
  await image.click();
  await expect(editor.getByRole('button', { name: 'Transform Featured Image block' })).toBeVisible();
  await expect(image).toHaveCount(1);

  const change = actions.getByRole('button', { name: 'Change featured image' });
  const remove = actions.getByRole('button', { name: 'Remove featured image' });
  await change.click({ trial: true });
  await remove.click({ trial: true });
  await page.mouse.move(0, 0);
  await change.focus();
  await expect(actions).toHaveCSS('opacity', '1');
  await page.keyboard.press('Tab');
  await expect(remove).toBeFocused();
});

test('Featured Image wrapper transforms are hidden for locked blocks', async ({ page }) => {
  await page.goto('/studio/ui/blocks/cover-image');
  await expect(page.locator('.ui-block-specimen')).toHaveAttribute('data-ready', 'true');
  const editor = page.locator('.ui-library-canvas');
  await page.getByRole('checkbox', { name: 'Lock move and remove' }).check();
  await expect(editor.getByRole('button', { name: 'Transform Featured Image block' })).toHaveCount(0);
});
