import { expect, test } from '@playwright/test';

test('Pane Library switches between shared catalogue navigation versions with independent selections and compact layout', async ({ page }) => {
  await page.goto('/studio/ui/panes#catalogue-navigation');
  await expect(page.getByRole('button', { name: 'Catalogue Navigation', exact: true })).toHaveAttribute('aria-current', 'page');

  const example = page.getByRole('region', { name: 'Catalogue Navigation Example' });
  const version = example.getByLabel('Version');
  await expect(version).toHaveValue('blocks');
  const blockExample = example.getByRole('region', { name: 'Block Library navigation example', exact: true });
  const navigation = blockExample.getByRole('complementary', { name: 'Block Library menu' });
  await expect(navigation.getByRole('heading', { name: 'Block Library' })).toBeVisible();
  await expect(navigation.getByRole('button', { name: 'All Blocks', exact: true })).toHaveAttribute('aria-current', 'location');

  await navigation.getByRole('button', { name: 'Paragraph', exact: true }).click();
  await expect(navigation.getByRole('button', { name: 'Paragraph', exact: true })).toHaveAttribute('aria-current', 'location');
  await expect(blockExample.getByRole('heading', { name: 'Paragraph', exact: true })).toBeVisible();

  await version.selectOption('controls');
  const controlExample = example.getByRole('region', { name: 'Controls navigation example', exact: true });
  const controlNavigation = controlExample.getByRole('complementary', { name: 'Controls menu' });
  await expect(controlNavigation.getByRole('heading', { name: 'Jump to' })).toBeVisible();
  await controlNavigation.getByRole('link', { name: 'Text area', exact: true }).click();
  await expect(controlNavigation.getByRole('link', { name: 'Text area', exact: true })).toHaveAttribute('aria-current', 'location');
  await expect(controlExample.getByRole('heading', { name: 'Text area', exact: true })).toBeVisible();
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

  await version.selectOption('blocks');
  await expect(navigation.getByRole('button', { name: 'Paragraph', exact: true })).toHaveAttribute('aria-current', 'location');
  await blockExample.getByRole('button', { name: 'Reset Example', exact: true }).click();
  await expect(navigation.getByRole('button', { name: 'All Blocks', exact: true })).toHaveAttribute('aria-current', 'location');
  await version.selectOption('controls');
  await expect(controlNavigation.getByRole('link', { name: 'Text input', exact: true })).toHaveAttribute('aria-current', 'location');

  await page.setViewportSize({ width: 390, height: 844 });
  const preview = controlExample.locator('.pl-catalogue-navigation-preview');
  const previewBounds = await preview.boundingBox();
  const navigationBounds = await controlNavigation.boundingBox();
  expect(navigationBounds!.x).toBeGreaterThanOrEqual(previewBounds!.x);
  expect(navigationBounds!.x + navigationBounds!.width).toBeLessThanOrEqual(previewBounds!.x + previewBounds!.width + 1);
  expect(await preview.evaluate(node => node.scrollWidth - node.clientWidth)).toBeLessThanOrEqual(1);
  const controlItemStyle = await controlNavigation.getByRole('link', { name: 'Text input', exact: true }).evaluate(item => {
    const style = window.getComputedStyle(item);
    return { paddingBlock: style.paddingBlock, font: style.font, lineHeight: style.lineHeight };
  });
  const lastControl = controlNavigation.getByRole('link').last();
  await lastControl.focus();
  await page.keyboard.press('Enter');
  await expect(lastControl).toHaveAttribute('aria-current', 'location');
  await expect(page).toHaveURL(/#catalogue-navigation$/);

  await version.selectOption('blocks');
  const blockItemStyle = await navigation.getByRole('button', { name: 'Paragraph', exact: true }).evaluate(item => {
    const style = window.getComputedStyle(item);
    return { paddingBlock: style.paddingBlock, font: style.font, lineHeight: style.lineHeight };
  });
  expect(blockItemStyle).toEqual(controlItemStyle);
  const blockPreview = blockExample.locator('.pl-catalogue-navigation-preview');
  const blockPreviewBounds = await blockPreview.boundingBox();
  const blockNavigationBounds = await navigation.boundingBox();
  expect(blockNavigationBounds!.x).toBeGreaterThanOrEqual(blockPreviewBounds!.x);
  expect(blockNavigationBounds!.x + blockNavigationBounds!.width).toBeLessThanOrEqual(blockPreviewBounds!.x + blockPreviewBounds!.width + 1);
  expect(await blockPreview.evaluate(node => node.scrollWidth - node.clientWidth)).toBeLessThanOrEqual(1);
  const compactItems = await navigation.locator('.ui-catalogue-navigation-list > li').evaluateAll(items => items.map(item => item.getBoundingClientRect().height));
  expect(Math.max(...compactItems)).toBeLessThanOrEqual(36);
});
