import { expect, test } from '@playwright/test';

test('Block Library filters and inspects the selected icon style', async ({ page }) => {
  await page.goto('/studio/ui/icons?collection=blocks');
  await page.waitForLoadState('networkidle');
  const filters = page.getByRole('complementary', { name: 'Block Symbol Filters' });
  const catalogue = page.getByRole('region', { name: 'Block Library Icon Catalogue' });
  const inspector = page.getByRole('complementary', { name: 'Block Symbol Inspector' });
  const search = filters.getByRole('textbox', { name: 'Search Block Symbols' });
  await expect(filters.getByRole('radio', { name: 'Outline' })).toBeChecked();
  await expect(inspector.getByRole('heading', { name: 'Paragraph' })).toBeVisible();
  await filters.getByRole('radio', { name: 'Filled' }).check();
  await expect(inspector.getByRole('heading', { name: 'Table' })).toBeVisible();
  await expect(catalogue.getByRole('button', { name: /Paragraph ACM Icons/ })).toHaveCount(0);
  await search.fill('image');
  await expect(catalogue.getByRole('button', { name: /Image ACM Icons/ }).first()).toBeVisible();
  await catalogue.getByRole('button', { name: /^Image ACM Icons/ }).click();
  await expect(inspector.getByRole('heading', { name: 'Image', exact: true })).toBeVisible();
  await filters.getByRole('radio', { name: 'Outline' }).check();
  await expect(inspector.getByRole('heading', { name: 'Image', exact: true })).toBeVisible();
  await search.fill('paragraph');
  await expect(catalogue.getByRole('button', { name: /Paragraph ACM Icons/ })).toBeVisible();
});

test('style controls remain usable at a narrow viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/studio/ui/icons?collection=blocks');
  await page.waitForLoadState('networkidle');
  const filled = page.getByRole('radio', { name: 'Filled' });
  await filled.check();
  await expect(filled).toBeChecked();
  await expect(page.getByRole('complementary', { name: 'Block Symbol Inspector' }).getByRole('heading', { name: 'Table' })).toBeVisible();
});
