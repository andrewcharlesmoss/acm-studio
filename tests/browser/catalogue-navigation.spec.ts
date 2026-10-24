import { expect, test } from '@playwright/test';

test('Pane Library demonstrates the shared catalogue navigation with temporary selection and narrow layout', async ({ page }) => {
  await page.goto('/studio/ui/panes#catalogue-navigation');
  await expect(page.getByRole('button', { name: 'Catalogue Navigation', exact: true })).toHaveAttribute('aria-current', 'page');

  const example = page.getByRole('region', { name: 'Catalogue Navigation Example' });
  const blockExample = example.getByRole('region', { name: 'Block Library navigation example', exact: true });
  const controlExample = example.getByRole('region', { name: 'Controls navigation example', exact: true });
  const navigation = blockExample.getByRole('complementary', { name: 'Block Library menu' });
  const controlNavigation = controlExample.getByRole('complementary', { name: 'Controls menu' });
  await expect(navigation.getByRole('heading', { name: 'Block Library' })).toBeVisible();
  await expect(navigation.getByRole('button', { name: 'All Blocks', exact: true })).toHaveAttribute('aria-current', 'location');

  await navigation.getByRole('button', { name: 'Paragraph', exact: true }).click();
  await expect(navigation.getByRole('button', { name: 'Paragraph', exact: true })).toHaveAttribute('aria-current', 'location');
  await expect(blockExample.getByRole('heading', { name: 'Paragraph', exact: true })).toBeVisible();

  await expect(controlNavigation.getByRole('heading', { name: 'Jump to' })).toBeVisible();
  await controlNavigation.getByRole('link', { name: 'Text area', exact: true }).click();
  await expect(controlNavigation.getByRole('link', { name: 'Text area', exact: true })).toHaveAttribute('aria-current', 'location');
  await expect(controlExample.getByRole('heading', { name: 'Text area', exact: true })).toBeVisible();
  await expect(navigation.getByRole('button', { name: 'Paragraph', exact: true })).toHaveAttribute('aria-current', 'location');
  await expect(page).toHaveURL(/#catalogue-navigation$/);

  const textInput = controlNavigation.getByRole('link', { name: 'Text input', exact: true });
  await textInput.focus();
  await page.keyboard.press('Enter');
  await expect(textInput).toHaveAttribute('aria-current', 'location');
  await expect(textInput).toBeFocused();
  await controlNavigation.getByRole('link', { name: 'Colour', exact: true }).click();
  await expect(controlExample.getByRole('heading', { name: 'Colour picker', exact: true })).toBeVisible();
  await controlExample.getByRole('button', { name: 'Reset Example', exact: true }).click();
  await expect(textInput).toHaveAttribute('aria-current', 'location');
  await expect(navigation.getByRole('button', { name: 'Paragraph', exact: true })).toHaveAttribute('aria-current', 'location');
  await blockExample.getByRole('button', { name: 'Reset Example', exact: true }).click();
  await expect(navigation.getByRole('button', { name: 'All Blocks', exact: true })).toHaveAttribute('aria-current', 'location');

  await page.setViewportSize({ width: 390, height: 844 });
  for (const [specimen, menu] of [[blockExample, navigation], [controlExample, controlNavigation]]) {
    const preview = specimen.locator('.pl-catalogue-navigation-preview');
    const previewBounds = await preview.boundingBox();
    const navigationBounds = await menu.boundingBox();
    expect(navigationBounds!.x).toBeGreaterThanOrEqual(previewBounds!.x);
    expect(navigationBounds!.x + navigationBounds!.width).toBeLessThanOrEqual(previewBounds!.x + previewBounds!.width + 1);
    expect(await preview.evaluate(node => node.scrollWidth - node.clientWidth)).toBeLessThanOrEqual(1);
  }
  const lastControl = controlNavigation.getByRole('link').last();
  await lastControl.focus();
  await page.keyboard.press('Enter');
  await expect(lastControl).toHaveAttribute('aria-current', 'location');
  await expect(page).toHaveURL(/#catalogue-navigation$/);
});
