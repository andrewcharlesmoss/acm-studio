import { expect, test } from '@playwright/test';

test('Image comparison uses the editable specimen beside the site-wide styles pane', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/studio/ui/blocks/image');
  const comparison = page.getByRole('region', { name: 'Image pane comparison' });
  const specimen = comparison.getByRole('region', { name: 'Editable specimen' });
  await expect(specimen).toHaveAttribute('data-ready', 'true');
  const inspector = specimen.getByRole('complementary', { name: 'Image settings' });
  const siteStyles = comparison.locator('.ui-image-comparison-site-pane');
  await expect(siteStyles.getByRole('heading', { name: 'Site-wide image styles' })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Alternative text' })).toHaveCount(1);

  const alt = inspector.getByRole('textbox', { name: 'Alternative text' });
  await alt.fill('Changed example image');
  await expect(specimen.getByRole('img', { name: 'Changed example image' })).toBeVisible();
  const enlarge = siteStyles.getByRole('checkbox', { name: 'Enlarge on click' });
  await enlarge.focus();
  await page.keyboard.press('Space');
  await expect(enlarge).toBeChecked();
  await siteStyles.getByRole('button', { name: 'Reset styles' }).focus();
  const modifier = await page.evaluate(() => /Mac/i.test(navigator.platform) ? 'Meta' : 'Control');
  await page.keyboard.press(`${modifier}+z`);
  await expect(enlarge).not.toBeChecked();
  await expect(alt).toHaveValue('Changed example image');
  await page.keyboard.press(`${modifier}+Shift+z`);
  await expect(enlarge).toBeChecked();
  await specimen.getByRole('button', { name: 'Reset Example' }).click();
  await expect(alt).toHaveValue('Illustrated green hill with a blue sky');
  await expect(enlarge).not.toBeChecked();

  for (const width of [1440, 820, 390]) {
    await page.setViewportSize({ width, height: 900 });
    const panes = await comparison.locator('.ui-block-inspector, .ui-image-comparison-site-pane').evaluateAll(nodes => nodes.map(node => {
      const rect = node.getBoundingClientRect();
      return { x: rect.x, y: rect.y, right: rect.right, bottom: rect.bottom, width: rect.width };
    }));
    expect(panes).toHaveLength(2);
    expect(panes[1].x).toBeGreaterThanOrEqual(panes[0].right);
    expect(panes[0].y).toBeLessThan(panes[1].bottom);
    expect(panes[1].y).toBeLessThan(panes[0].bottom);
    expect(Math.min(...panes.map(pane => pane.width))).toBeGreaterThanOrEqual(300);
  }

  const toolbarFits = await specimen.locator('.ui-block-canvas').evaluate(canvas => {
    const bounds = canvas.getBoundingClientRect();
    const toolbar = canvas.querySelector('.canvas-block-toolbar')?.getBoundingClientRect();
    return Boolean(toolbar && toolbar.left >= bounds.left && toolbar.right <= bounds.right);
  });
  expect(toolbarFits).toBe(true);
  expect(await comparison.evaluate(node => node.scrollWidth)).toBeGreaterThan(await comparison.evaluate(node => node.clientWidth));
  await comparison.focus();
  await page.keyboard.press('ArrowRight');
  await expect.poll(() => comparison.evaluate(node => node.scrollLeft)).toBeGreaterThan(0);
});
