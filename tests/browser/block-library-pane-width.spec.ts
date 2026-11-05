import { expect, test } from '@playwright/test';

for (const viewportWidth of [1440, 820, 390]) test(`tabbed Styles pane retains its width at ${viewportWidth}px`, async ({ page }) => {
  await page.setViewportSize({ width: viewportWidth, height: 900 });
  await page.goto('/studio/ui/blocks/paragraph');
  await expect(page.locator('.ui-block-specimen')).toHaveAttribute('data-ready', 'true');
  const pane = page.getByRole('complementary', { name: 'Paragraph inspector', exact: true });
  await expect(pane.locator(':scope > .pane-header').getByRole('heading', { name: 'Styles', exact: true })).toBeVisible();
  const tabs = pane.getByRole('tablist', { name: 'Block context', exact: true });
  await expect(tabs.getByRole('tab')).toHaveText(['Universal', 'Global', 'Local']);
  const resize = page.getByRole('separator', { name: 'Resize Paragraph inspector', exact: true });
  for (const source of ['Universal', 'Global', 'Local']) {
    await tabs.getByRole('tab', { name: source, exact: true }).click();
    await resize.focus(); await page.keyboard.press('ArrowLeft');
    const expected = (await pane.boundingBox())!.width;
    for (const target of ['Universal', 'Global', 'Local']) {
      await tabs.getByRole('tab', { name: target, exact: true }).click();
      await expect.poll(async () => (await pane.boundingBox())!.width).toBeCloseTo(expected, 1);
      const bounds = (await pane.boundingBox())!;
      expect(bounds.x).toBeGreaterThanOrEqual(-1);
      expect(bounds.x + bounds.width).toBeLessThanOrEqual(viewportWidth + 1);
    }
  }
  const width = (await pane.boundingBox())!.width;
  await page.getByRole('button', { name: 'Hide Paragraph inspector' }).click();
  await page.getByRole('button', { name: 'Show Paragraph inspector' }).click();
  await expect.poll(async () => (await pane.boundingBox())!.width).toBeCloseTo(width, 1);
});

test('wide comparison panes retain independent widths', async ({ page }) => {
  await page.setViewportSize({ width: 2200, height: 1000 });
  await page.goto('/studio/ui/blocks/paragraph');
  const universal = page.getByRole('complementary', { name: 'Paragraph Universal Styles', exact: true });
  const global = page.getByRole('complementary', { name: 'Paragraph Global Styles', exact: true });
  await expect(universal).toBeVisible(); await expect(global).toBeVisible();
  const beforeUniversal = (await universal.boundingBox())!.width;
  const beforeGlobal = (await global.boundingBox())!.width;
  await page.getByRole('separator', { name: 'Resize Paragraph Universal Styles', exact: true }).press('ArrowLeft');
  await expect.poll(async () => (await universal.boundingBox())!.width).toBeGreaterThan(beforeUniversal);
  expect(Math.abs((await global.boundingBox())!.width - beforeGlobal)).toBeLessThanOrEqual(1);
});
