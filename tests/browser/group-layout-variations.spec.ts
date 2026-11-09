import { expect, test } from '@playwright/test';

test('responsive Grid spans collapse at narrow widths and recover without rewriting the saved span', async ({ page }) => {
  await page.setViewportSize({ width: 2400, height: 1000 });
  await page.goto('/studio/ui/blocks/grid');
  await expect(page.locator('.ui-block-specimen')).toHaveAttribute('data-ready', 'true');
  const examples = page.getByRole('group', { name: 'Select an example block', exact: true });
  await examples.getByRole('button', { name: 'Grid', exact: true }).click();
  await page.getByRole('spinbutton', { name: 'Min. column width', exact: true }).fill('8');
  await examples.getByRole('button', { name: 'Selectable child heading', exact: true }).click();
  const editor = page.locator('.ui-library-canvas');
  const child = editor.locator('[data-studio-nested-block-id="grid-child-heading"]').first();
  const handle = editor.getByRole('button', { name: 'Resize Grid column span', exact: true });
  await handle.focus();
  await handle.press('ArrowRight');
  await expect(child).toHaveCSS('grid-column-start', 'span 2');
  await page.setViewportSize({ width: 390, height: 1000 });
  await expect(child).toHaveCSS('grid-column-start', '1');
  await expect(child).toHaveCSS('grid-column-end', '-1');
  await page.setViewportSize({ width: 2400, height: 1000 });
  await expect(child).toHaveCSS('grid-column-start', 'span 2');
});

test('Group variations update the preview and Grid controls remain undoable', async ({ page }) => {
  await page.goto('/studio/ui/blocks/group');
  const row = page.getByRole('group', { name: 'Select an example block' }).getByRole('button', { name: 'Group', exact: true });
  await expect(page.getByRole('heading', { name: 'Styles', exact: true }).first()).toBeVisible();
  await expect(async () => { await row.click(); await expect(row).toHaveAttribute('aria-pressed', 'true', { timeout: 1000 }); }).toPass({ timeout: 15000 });
  const layouts = page.getByRole('radiogroup', { name: 'Group layout', exact: true });
  await layouts.getByRole('radio', { name: 'Stack', exact: true }).click();
  await expect(page.locator('[aria-label="Stack block"] .studio-nested-group')).toHaveCSS('flex-direction', 'column');
  await layouts.getByRole('radio', { name: 'Grid', exact: true }).click();
  const grid = page.locator('[aria-label="Grid block"] .studio-nested-group');
  await expect(grid).toHaveCSS('display', 'grid');
  await expect(grid).toHaveCSS('--block-layout-grid-repeat', 'auto-fill');
  const guides = grid.locator(':scope > .group-empty-grid-guides');
  await expect(guides).toHaveCount(1);
  const tracksMatch = async () => {
    const tracks = await grid.evaluate(element => getComputedStyle(element).gridTemplateColumns.split(/\s+/).map(Number.parseFloat).filter(width => width > 0));
    const outlines = await guides.locator(':scope > span').evaluateAll(elements => elements.map(element => element.getBoundingClientRect().width));
    const rows = await grid.evaluate(element => getComputedStyle(element).gridTemplateRows.split(/\s+/).map(Number.parseFloat).filter(height => height > 0));
    expect(outlines).toHaveLength(tracks.length * rows.length);
    for (const [index, width] of outlines.entries()) expect(Math.abs(width - tracks[index % tracks.length])).toBeLessThan(1);
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
  const example = page.getByRole('group', { name: 'Select an example block' }).getByRole('button', { name: 'Group', exact: true });
  await expect(async () => { await example.click(); await expect(example).toHaveAttribute('aria-pressed', 'true', { timeout: 1000 }); }).toPass({ timeout: 15000 });
  const layouts = page.getByRole('radiogroup', { name: 'Group layout', exact: true });
  await layouts.getByRole('radio', { name: 'Stack', exact: true }).click();
  await page.getByRole('button', { name: 'Layout options', exact: true }).click();
  const wrappingOption = page.getByRole('button', { name: 'Wrapping', exact: true });
  await expect(wrappingOption).toBeVisible();
  await wrappingOption.click();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('checkbox', { name: 'Allow to wrap to multiple lines', exact: true })).toBeVisible();
  await expect(page.getByRole('checkbox', { name: 'Allow sizing on children', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Link block spacing', exact: true })).toHaveCount(0);
  await expect(page.getByRole('slider', { name: 'Block spacing Top amount', exact: true })).toBeVisible();
});

test('Layout optional fields and Position follow authored Undo and Redo without remounting the selected Group', async ({ page }) => {
  await page.goto('/studio/ui/blocks/group');
  const example = page.getByRole('group', { name: 'Select an example block' }).getByRole('button', { name: 'Group', exact: true });
  await expect(async () => { await example.click(); await expect(example).toHaveAttribute('aria-pressed', 'true', { timeout: 1000 }); }).toPass({ timeout: 15000 });
  const layouts = page.getByRole('radiogroup', { name: 'Group layout', exact: true });
  await layouts.getByRole('radio', { name: 'Group', exact: true }).click();
  const option = async (section: string, name: string) => {
    await page.getByRole('button', { name: `${section} options`, exact: true }).click();
    await page.getByRole('button', { name, exact: true }).click();
    await page.keyboard.press('Escape');
  };
  await option('Layout', 'Content width');
  const width = page.getByRole('spinbutton', { name: 'Content width', exact: true });
  await width.fill('400');
  await width.press('Tab');
  await option('Layout', 'Content width');
  await expect(width).toHaveCount(0);
  await page.getByRole('button', { name: 'Undo specimen change', exact: true }).click();
  await expect(width).toHaveValue('400');
  await page.getByRole('button', { name: 'Redo specimen change', exact: true }).click();
  await expect(width).toHaveCount(0);
  await option('Position', 'Position');
  const position = page.getByRole('combobox', { name: 'Position', exact: true });
  await position.selectOption('sticky');
  await option('Position', 'Reset Position');
  await expect(position).toHaveCount(0);
  await page.getByRole('button', { name: 'Undo specimen change', exact: true }).click();
  await expect(position).toHaveValue('sticky');
  await page.getByRole('button', { name: 'Redo specimen change', exact: true }).click();
  await expect(position).toHaveCount(0);
});
