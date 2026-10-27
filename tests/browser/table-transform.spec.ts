import { expect, test } from '@playwright/test';

test('Table toolbar changes styles and wraps the original table with undo and redo', async ({ page }) => {
  await page.goto('/studio/ui/blocks/table');
  await expect(page.locator('.ui-block-specimen')).toHaveAttribute('data-ready', 'true');
  const editor = page.locator('.ui-library-canvas');
  const table = editor.locator('.table-field').first();
  const open = async () => {
    await editor.getByRole('button', { name: 'Transform Table block', exact: true }).click();
    return page.getByRole('menu', { name: 'Transform block' });
  };
  let menu = await open();
  await expect(menu.getByRole('menuitemradio', { name: 'Stripes' })).toHaveAttribute('aria-checked', 'true');
  await menu.getByRole('menuitemradio', { name: 'Default' }).click();
  await expect(table).not.toHaveClass(/is-striped/);
  await page.getByRole('button', { name: 'Undo specimen change' }).click();
  await expect(table).toHaveClass(/is-striped/);
  await page.getByRole('button', { name: 'Redo specimen change' }).click();
  await expect(table).not.toHaveClass(/is-striped/);

  menu = await open();
  await menu.getByRole('menuitem', { name: 'Group', exact: true }).click();
  await expect(editor.getByRole('group', { name: 'Group block tools' })).toBeVisible();
  await expect(table).not.toHaveClass(/is-striped/);
  await expect(table.getByText('Library profiles')).toBeVisible();
  await expect(editor.getByRole('textbox', { name: 'Table caption' }).first()).toHaveText('Example settings inventory');
  await page.getByRole('button', { name: 'Undo specimen change' }).click();
  await expect(editor.getByRole('group', { name: 'Group block tools' })).toHaveCount(0);
  await expect(table).toBeVisible();
  await expect(table).not.toHaveClass(/is-striped/);
  await page.getByRole('button', { name: 'Redo specimen change' }).click();
  await expect(editor.getByRole('group', { name: 'Group block tools' })).toBeVisible();
});

test('Table transform respects read-only and move/remove locks', async ({ page }) => {
  await page.goto('/studio/ui/blocks/table');
  await expect(page.locator('.ui-block-specimen')).toHaveAttribute('data-ready', 'true');
  const editor = page.locator('.ui-library-canvas');
  const trigger = editor.getByRole('button', { name: 'Transform Table block', exact: true });
  await page.getByRole('checkbox', { name: 'Lock move and remove' }).check();
  await trigger.click();
  const menu = page.getByRole('menu', { name: 'Transform block' });
  await expect(menu.getByRole('menuitem', { name: 'Group', exact: true })).toHaveCount(0);
  await expect(menu.getByRole('menuitemradio', { name: 'Stripes', exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await page.getByRole('checkbox', { name: 'Read-only example' }).check();
  await expect(trigger).toBeDisabled();
});

test('Table Group transform supports keyboard history at a narrow viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await page.goto('/studio/ui/blocks/table');
  await expect(page.locator('.ui-block-specimen')).toHaveAttribute('data-ready', 'true');
  const editor = page.locator('.ui-library-canvas');
  const trigger = editor.getByRole('button', { name: 'Transform Table block', exact: true });
  await trigger.focus();
  await trigger.press('Enter');
  const group = page.getByRole('menuitem', { name: 'Group', exact: true });
  await expect(group).toBeFocused();
  await group.press('Enter');
  await expect(editor.getByRole('group', { name: 'Group block tools' })).toBeVisible();
  const modifier = process.platform === 'darwin' ? 'Meta' : 'Control';
  await page.keyboard.press(`${modifier}+z`);
  await expect(editor.locator('.table-field').first()).toBeVisible();
  await page.keyboard.press(`${modifier}+Shift+z`);
  await expect(editor.getByRole('group', { name: 'Group block tools' })).toBeVisible();
});
