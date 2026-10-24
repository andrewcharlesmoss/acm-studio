import { expect, test } from '@playwright/test';

test('Pane Library demonstrates the generic shared catalogue navigation with temporary selection and compact layout', async ({ page }) => {
  await page.goto('/studio/ui/panes#catalogue-navigation');
  await expect(page.getByRole('button', { name: 'Catalogue Navigation', exact: true })).toHaveAttribute('aria-current', 'page');

  const example = page.getByRole('region', { name: 'Catalogue Navigation Example' });
  const navigation = example.getByRole('complementary', { name: 'Example navigation pane' });
  await expect(navigation.getByRole('heading', { name: 'Example navigation' })).toBeVisible();
  await expect(navigation.getByRole('button', { name: 'All destinations', exact: true })).toHaveAttribute('aria-current', 'location');
  await expect(navigation.getByRole('heading', { name: 'Content' })).toBeVisible();
  await expect(navigation.getByRole('heading', { name: 'Design' })).toBeVisible();
  await expect(navigation.getByRole('heading', { name: 'Settings' })).toBeVisible();

  await navigation.getByRole('button', { name: 'Patterns', exact: true }).click();
  await expect(navigation.getByRole('button', { name: 'Patterns', exact: true })).toHaveAttribute('aria-current', 'location');
  await expect(example.getByRole('heading', { name: 'Patterns', exact: true })).toBeVisible();

  const pages = navigation.getByRole('button', { name: 'Pages', exact: true });
  await pages.focus();
  await page.keyboard.press('Enter');
  await expect(pages).toHaveAttribute('aria-current', 'location');
  await expect(pages).toBeFocused();
  await expect(example.getByRole('heading', { name: 'Pages', exact: true })).toBeVisible();

  await example.getByRole('button', { name: 'Reset Example', exact: true }).click();
  await expect(navigation.getByRole('button', { name: 'All destinations', exact: true })).toHaveAttribute('aria-current', 'location');
  await expect(example.getByRole('heading', { name: 'All destinations', exact: true })).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  const preview = example.locator('.pl-catalogue-navigation-preview');
  const previewBounds = await preview.boundingBox();
  const navigationBounds = await navigation.boundingBox();
  expect(navigationBounds!.x).toBeGreaterThanOrEqual(previewBounds!.x);
  expect(navigationBounds!.x + navigationBounds!.width).toBeLessThanOrEqual(previewBounds!.x + previewBounds!.width + 1);
  expect(await preview.evaluate(node => node.scrollWidth - node.clientWidth)).toBeLessThanOrEqual(1);
  const itemHeights = await navigation.locator('.ui-catalogue-navigation-list > li').evaluateAll(items => items.map(item => item.getBoundingClientRect().height));
  expect(Math.max(...itemHeights)).toBeLessThanOrEqual(36);
});
