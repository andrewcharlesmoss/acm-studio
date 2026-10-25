import { expect, test } from '@playwright/test';

test('Styles keeps source actions in the app header and exposes a keyboard-safe View menu', async ({ page }) => {
  await page.goto('/studio/ui/styles');
  const headerActions = page.locator('.ui-library-header-actions');
  const view = headerActions.getByRole('button', { name: 'View', exact: true });
  const save = headerActions.getByRole('button', { name: 'Save Website Styles', exact: true });

  await expect(headerActions.getByText('Local', { exact: true })).toBeVisible();
  await expect(headerActions.getByRole('status')).toContainText('Source loaded');
  await expect(save).toBeDisabled();
  await expect(headerActions.getByRole('button', { name: 'Export', exact: true })).toHaveCount(0);
  await expect(headerActions.getByRole('button', { name: 'Publish', exact: true })).toHaveCount(0);

  await view.click();
  const menu = page.getByRole('menu', { name: 'View options' });
  await expect(menu.getByRole('menuitemradio', { name: /Desktop/ })).toHaveAttribute('aria-checked', 'true');
  await menu.getByRole('menuitemradio', { name: /Tablet/ }).click();
  await expect(page.locator('.sg-preview-frame')).toHaveAttribute('data-viewport', 'tablet');
  await expect(view).toBeFocused();

  await view.click();
  await page.keyboard.press('Escape');
  await expect(menu).toBeHidden();
  await expect(view).toBeFocused();

  await page.setViewportSize({ width: 390, height: 844 });
  const local = headerActions.getByText('Local', { exact: true });
  const status = headerActions.getByRole('status');
  await expect(local).toBeVisible();
  await expect(status).toBeVisible();
  await expect(view).toBeVisible();
  await expect(save).toBeVisible();
  for (const control of [local, view, status, save]) {
    const bounds = await control.boundingBox();
    expect(bounds).not.toBeNull();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(390);
  }
});
