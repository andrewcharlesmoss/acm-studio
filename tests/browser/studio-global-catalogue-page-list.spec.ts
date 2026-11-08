import { expect, test } from '@playwright/test';

test('the Studio UI Library catalogue finds Page List and opens its selectable block specimen', async ({ page }) => {
  await page.goto('/studio/ui');
  await expect(page.getByRole('heading', { name: 'Browse the whole library.', exact: true })).toBeVisible();

  await page.getByRole('textbox', { name: 'Search the Studio UI Library', exact: true }).fill('page list');
  const pageListEntry = page.getByRole('link', { name: 'Page List', exact: true });
  await expect(pageListEntry).toBeVisible();
  await expect(page.getByRole('status')).toContainText('1 entry');
  await pageListEntry.click();

  await expect(page).toHaveURL(/\/studio\/ui\/blocks\/navigation-page-list$/);
  await expect(page.getByRole('heading', { name: 'Page List', exact: true })).toBeVisible();
  const pageListBlock = page.getByRole('group', { name: 'Page List block', exact: true });
  await expect(pageListBlock).toBeVisible();
  await expect(pageListBlock).toHaveClass(/is-selected/);
  await expect(page.getByRole('heading', { name: 'Styles', exact: true })).toBeVisible();
});
