import { expect, test } from '@playwright/test';

test('Group variations update the preview and Grid controls remain undoable', async ({ page }) => {
  await page.goto('/studio/ui/blocks/group');
  const row = page.getByRole('group', { name: 'Select an example block' }).getByRole('button', { name: 'Row', exact: true });
  await expect(page.getByRole('heading', { name: 'Styles', exact: true }).first()).toBeVisible();
  await expect(async () => { await row.click(); await expect(row).toHaveAttribute('aria-pressed', 'true', { timeout: 1000 }); }).toPass({ timeout: 15000 });
  const layouts = page.getByRole('group', { name: 'Group layout', exact: true });
  await layouts.getByRole('button', { name: 'Stack', exact: true }).click();
  await expect(page.locator('[aria-label="Stack block"] .studio-nested-group')).toHaveCSS('flex-direction', 'column');
  await layouts.getByRole('button', { name: 'Grid', exact: true }).click();
  const grid = page.locator('[aria-label="Grid block"] .studio-nested-group');
  await expect(grid).toHaveCSS('display', 'grid');
  await expect(grid).toHaveCSS('--block-layout-grid-repeat', 'auto-fill');
  await page.getByRole('button', { name: 'Layout options', exact: true }).click();
  await page.getByRole('button', { name: 'Fill available space', exact: true }).click();
  await page.keyboard.press('Escape');
  const fill = page.getByRole('checkbox', { name: 'Fill available space' });
  await fill.focus();
  await fill.press('Space');
  await expect(fill).toBeChecked();
  await expect(grid).toHaveCSS('--block-layout-grid-repeat', 'auto-fit');
  await page.getByRole('button', { name: 'Undo specimen change' }).click();
  await expect(grid).toHaveCSS('--block-layout-grid-repeat', 'auto-fill');
});
