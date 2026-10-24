import { expect, test } from '@playwright/test';

test('Pane Library demonstrates the shared catalogue navigation with temporary selection and narrow layout', async ({ page }) => {
  await page.goto('/studio/ui/panes#catalogue-navigation');
  await expect(page.getByRole('button', { name: 'Catalogue Navigation', exact: true })).toHaveAttribute('aria-current', 'page');

  const example = page.getByRole('region', { name: 'Catalogue Navigation Example' });
  const navigation = example.getByRole('complementary', { name: 'Block Library menu' });
  await expect(navigation.getByRole('heading', { name: 'Block Library' })).toBeVisible();
  await expect(navigation.getByRole('button', { name: 'All Blocks', exact: true })).toHaveAttribute('aria-current', 'location');

  await navigation.getByRole('button', { name: 'Paragraph', exact: true }).click();
  await expect(navigation.getByRole('button', { name: 'Paragraph', exact: true })).toHaveAttribute('aria-current', 'location');
  await expect(example.getByRole('heading', { name: 'Paragraph', exact: true })).toBeVisible();
  await example.getByRole('button', { name: 'Reset Example', exact: true }).click();
  await expect(navigation.getByRole('button', { name: 'All Blocks', exact: true })).toHaveAttribute('aria-current', 'location');

  await page.setViewportSize({ width: 390, height: 844 });
  const preview = example.locator('.pl-catalogue-navigation-preview');
  const previewBounds = await preview.boundingBox();
  const navigationBounds = await navigation.boundingBox();
  expect(navigationBounds!.x).toBeGreaterThanOrEqual(previewBounds!.x);
  expect(navigationBounds!.x + navigationBounds!.width).toBeLessThanOrEqual(previewBounds!.x + previewBounds!.width + 1);
  expect(await navigation.evaluate(node => node.scrollWidth)).toBeGreaterThan(0);
});
