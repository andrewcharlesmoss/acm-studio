import { expect, test } from '@playwright/test';

test('Image comparison keeps both panes side by side and scrollable at narrow widths', async ({ page }) => {
  await page.goto('/studio/ui/blocks/image');
  const comparison = page.getByRole('region', { name: 'Image pane comparison' });
  await expect(comparison.getByRole('heading', { name: 'This image' })).toBeVisible();
  await expect(comparison.getByRole('heading', { name: 'Site-wide image styles' })).toBeAttached();

  for (const width of [1440, 820, 390]) {
    await page.setViewportSize({ width, height: 900 });
    const panes = await comparison.locator('.ui-image-comparison-pane').evaluateAll(nodes => nodes.map(node => {
      const rect = node.getBoundingClientRect();
      return { x: rect.x, y: rect.y, width: rect.width };
    }));
    expect(panes).toHaveLength(2);
    expect(Math.abs(panes[0].y - panes[1].y)).toBeLessThanOrEqual(1);
    expect(panes[1].x).toBeGreaterThan(panes[0].x);
    expect(Math.min(...panes.map(pane => pane.width))).toBeGreaterThanOrEqual(320);
  }

  expect(await comparison.evaluate(node => node.scrollWidth)).toBeGreaterThan(await comparison.evaluate(node => node.clientWidth));
  await comparison.focus();
  await page.keyboard.press('ArrowRight');
  await expect.poll(() => comparison.evaluate(node => node.scrollLeft)).toBeGreaterThan(0);
});
