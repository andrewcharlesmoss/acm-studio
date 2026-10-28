import { expect, test } from '@playwright/test';

test('Columns toolbar changes vertical alignment and records it in specimen history', async ({ page }) => {
  await page.goto('/studio/ui/blocks/columns');
  await expect(page.locator('.ui-block-specimen')).toHaveAttribute('data-ready', 'true');

  const columns = page.locator('.ui-block-canvas .content-columns').first();
  const box = await columns.boundingBox();
  await columns.click({ position: { x: box!.width - 1, y: 2 } });
  const toolbar = page.getByRole('group', { name: 'Columns block tools', exact: true });
  const alignment = toolbar.getByRole('button', { name: 'Vertical alignment', exact: true });
  await expect(alignment).toBeVisible();
  await alignment.focus();
  await alignment.press('Enter');
  await expect(page.getByRole('menu', { name: 'Vertical alignment', exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(alignment).toBeFocused();
  await alignment.click();
  await page.getByRole('menuitemradio', { name: 'Align middle', exact: true }).click();
  await expect(columns).toHaveCSS('align-items', 'center');

  const undo = page.getByRole('button', { name: 'Undo specimen change', exact: true });
  await expect(undo).toBeEnabled();
  await undo.click();
  await expect(columns).toHaveCSS('align-items', 'stretch');
  await page.getByRole('button', { name: 'Reset Example', exact: true }).click();
});
