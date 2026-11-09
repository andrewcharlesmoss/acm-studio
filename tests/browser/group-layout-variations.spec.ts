import { expect, test } from '@playwright/test';

test('Group variations update the preview and Grid controls remain undoable', async ({ page }) => {
  await page.goto('/studio/ui/blocks/group');
  const row = page.getByRole('group', { name: 'Select an example block' }).getByRole('button', { name: 'Row', exact: true });
  await expect(page.getByRole('heading', { name: 'Styles', exact: true }).first()).toBeVisible();
  await expect(async () => { await row.click(); await expect(row).toHaveAttribute('aria-pressed', 'true', { timeout: 1000 }); }).toPass({ timeout: 15000 });
  const layouts = page.getByRole('group', { name: 'Group layout', exact: true });
  await layouts.getByRole('button', { name: 'Stack', exact: true }).click();
  await expect(page.locator('[aria-label="Stack block"] .studio-nested-group')).toHaveCSS('flex-direction', 'column');
  await layouts.getByRole('button', { name: 'Grid', exact: true }).click();
  const grid = page.locator('[aria-label="Grid block"] .studio-nested-group');
  await expect(grid).toHaveCSS('display', 'grid');
  await expect(grid).toHaveCSS('--block-layout-grid-repeat', 'auto-fill');
  const guides = grid.locator(':scope > .group-empty-grid-guides');
  await expect(guides).toHaveCount(1);
  const tracksMatch = async () => {
    const tracks = await grid.evaluate(element => getComputedStyle(element).gridTemplateColumns.split(/\s+/).map(Number.parseFloat).filter(width => width > 0));
    const outlines = await guides.locator(':scope > span').evaluateAll(elements => elements.map(element => element.getBoundingClientRect().width));
    expect(outlines).toHaveLength(tracks.length);
    for (const [index, width] of tracks.entries()) expect(Math.abs(outlines[index] - width)).toBeLessThan(1);
  };
  await expect(tracksMatch).toPass();
  for (const width of [1440, 820, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(tracksMatch).toPass();
  }
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.getByRole('button', { name: 'Layout options', exact: true }).click();
  await page.getByRole('button', { name: 'Fill available space', exact: true }).click();
  await page.keyboard.press('Escape');
  const fill = page.getByRole('checkbox', { name: 'Fill available space' });
  await fill.focus();
  await fill.press('Space');
  await expect(fill).toBeChecked();
  await expect(grid).toHaveCSS('--block-layout-grid-repeat', 'auto-fit');
  await expect(tracksMatch).toPass();
  await page.getByRole('button', { name: 'Undo specimen change' }).click();
  await expect(grid).toHaveCSS('--block-layout-grid-repeat', 'auto-fill');
});

test('Stack wrapping is optional and the inspector omits the Studio-only child sizing switch', async ({ page }) => {
  await page.goto('/studio/ui/blocks/group');
  const example = page.getByRole('group', { name: 'Select an example block' }).getByRole('button', { name: 'Row', exact: true });
  await expect(async () => { await example.click(); await expect(example).toHaveAttribute('aria-pressed', 'true', { timeout: 1000 }); }).toPass({ timeout: 15000 });
  const layouts = page.getByRole('group', { name: 'Group layout', exact: true });
  await layouts.getByRole('button', { name: 'Stack', exact: true }).click();
  await page.getByRole('button', { name: 'Layout options', exact: true }).click();
  const wrappingOption = page.getByRole('button', { name: 'Wrapping', exact: true });
  await expect(wrappingOption).toBeVisible();
  await wrappingOption.click();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('checkbox', { name: 'Allow to wrap to multiple lines', exact: true })).toBeVisible();
  await expect(page.getByRole('checkbox', { name: 'Allow sizing on children', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Link block spacing', exact: true })).toHaveCount(0);
  await expect(page.getByRole('slider', { name: 'Block spacing', exact: true })).toBeVisible();
});
