import { expect, test } from '@playwright/test';

test('Image caption toggle preserves the caption through Undo', async ({ page }) => {
  await page.goto('/studio/ui/blocks/image');
  await expect(page.locator('.ui-block-specimen')).toHaveAttribute('data-ready', 'true');
  const editor = page.locator('.ui-library-canvas');
  const caption = editor.getByRole('textbox', { name: 'Image caption' });
  const original = await caption.innerText();
  await editor.getByRole('button', { name: 'Remove caption' }).click();
  await expect(caption).toHaveCount(0);
  await page.getByRole('button', { name: 'Undo specimen change' }).click();
  await expect(caption).toHaveText(original);
  await editor.getByRole('button', { name: 'Remove caption' }).click();
  await editor.getByRole('button', { name: 'Add caption' }).click();
  await expect(caption).toBeFocused();
  await caption.fill('A new caption');
  await expect(caption).toHaveText('A new caption');
});

test('Image Group transform retains the image and caption through Undo', async ({ page }) => {
  await page.goto('/studio/ui/blocks/image');
  await expect(page.locator('.ui-block-specimen')).toHaveAttribute('data-ready', 'true');
  const editor = page.locator('.ui-library-canvas');
  const original = await editor.getByRole('textbox', { name: 'Image caption' }).innerText();
  await editor.getByRole('button', { name: 'Transform Image block' }).click();
  await page.getByRole('menu', { name: 'Transform block' }).getByRole('menuitem', { name: 'Group', exact: true }).click();
  await expect(editor.getByRole('group', { name: 'Group block tools' })).toBeVisible();
  await expect(editor.getByRole('textbox', { name: 'Image caption' })).toHaveText(original);
  await page.getByRole('button', { name: 'Undo specimen change' }).click();
  await expect(editor.getByRole('button', { name: 'Transform Image block' })).toBeVisible();
  await expect(editor.getByRole('textbox', { name: 'Image caption' })).toHaveText(original);
});

test('Image Group transform is withheld for locked blocks and caption controls are disabled in read-only mode', async ({ page }) => {
  await page.goto('/studio/ui/blocks/image');
  await expect(page.locator('.ui-block-specimen')).toHaveAttribute('data-ready', 'true');
  const editor = page.locator('.ui-library-canvas');
  await page.getByRole('checkbox', { name: 'Lock move and remove' }).check();
  await expect(editor.getByRole('button', { name: 'Transform Image block' })).toHaveCount(0);
  await page.getByRole('checkbox', { name: 'Read-only example' }).check();
  await expect(editor.getByRole('button', { name: /(?:Add|Remove) caption/ })).toBeDisabled();
  await expect(editor.getByRole('button', { name: 'Image link settings' })).toBeDisabled();
});

test('Image link settings update the image and the inspector using the same destination fields', async ({ page }) => {
  await page.goto('/studio/ui/blocks/image');
  await expect(page.locator('.ui-block-specimen')).toHaveAttribute('data-ready', 'true');
  const editor = page.locator('.ui-library-canvas');
  const pane = page.getByRole('complementary', { name: 'Image settings', exact: true });
  await editor.getByRole('button', { name: 'Image link settings' }).click();
  const dialog = page.getByRole('dialog', { name: 'Image link settings' });
  await dialog.getByLabel('Link destination').selectOption('custom');
  await dialog.getByLabel('Link URL').fill('https://example.com/image');
  await dialog.getByLabel('Open in new tab').check();
  await expect(pane.getByLabel('Link destination')).toHaveValue('custom');
  await expect(pane.getByLabel('Link URL')).toHaveValue('https://example.com/image');
  await expect(editor.locator('figure.image-field > a')).toHaveAttribute('href', 'https://example.com/image');
  await expect(editor.locator('figure.image-field > a')).toHaveAttribute('target', '_blank');
  await page.keyboard.press('Escape');
  await expect(editor.getByRole('button', { name: 'Image link settings' })).toBeFocused();
  await page.getByRole('button', { name: 'Undo specimen change' }).click();
  await expect(editor.locator('figure.image-field > a')).not.toHaveAttribute('target', '_blank');
});

test('Image Group undo and redo keep a valid selection in the production Template editor', async ({ page }) => {
  await page.goto('/studio/ui/selection/template');
  const image = page.locator('[data-studio-block-anchor-id="template-image"]');
  await image.click();
  await page.getByRole('button', { name: 'Transform Image block' }).click();
  await page.getByRole('menu', { name: 'Transform block' }).getByRole('menuitem', { name: 'Group', exact: true }).click();
  const group = page.getByRole('group', { name: 'Group block tools' });
  await expect(group).toBeVisible();
  await page.keyboard.press('Meta+z');
  await expect(page.getByRole('button', { name: 'Transform Image block' })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Image caption' })).toHaveText('Template image caption');
  await page.keyboard.press('Meta+Shift+z');
  await expect(page.getByRole('textbox', { name: 'Image caption' })).toHaveText('Template image caption');
  await expect(page.locator('div[data-studio-nested-block-id="template-image"]')).toHaveAttribute('data-studio-selected', 'true');
});

for (const width of [1440, 820, 390]) {
  test(`Image toolbar remains reachable at ${width}px viewport width`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/studio/ui/blocks/image');
    await expect(page.locator('.ui-block-specimen')).toHaveAttribute('data-ready', 'true');
    const canvas = page.locator('.ui-block-canvas');
    const toolbar = canvas.getByRole('group', { name: 'Image block tools' });
    const transform = toolbar.getByRole('button', { name: 'Transform Image block' });
    await page.screenshot({ path: testInfo.outputPath(`before-image-toolbar-${width}.png`) });
    try { await transform.click({ timeout: 5000 }); } catch (error) {
      await page.screenshot({ path: testInfo.outputPath(`failed-image-toolbar-${width}.png`) });
      throw error;
    }
    const menu = page.getByRole('menu', { name: 'Transform block' });
    await expect(menu.getByRole('menuitem', { name: 'Group', exact: true })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(transform).toBeFocused();
    await expect(transform).toHaveCSS('outline-style', 'solid');
    const canvasBox = await canvas.boundingBox();
    const toolbarBox = await toolbar.boundingBox();
    expect(canvasBox).not.toBeNull();
    expect(toolbarBox).not.toBeNull();
    expect(toolbarBox!.x).toBeGreaterThanOrEqual(canvasBox!.x - 1);
    expect(toolbarBox!.x + toolbarBox!.width).toBeLessThanOrEqual(canvasBox!.x + canvasBox!.width + 1);
    for (const name of ['Image link settings', 'Remove caption']) await expect(toolbar.getByRole('button', { name })).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath(`image-toolbar-${width}.png`) });
  });
}

test('Image toolbar remains reachable with 200% document scaling', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/studio/ui/blocks/image');
  await expect(page.locator('.ui-block-specimen')).toHaveAttribute('data-ready', 'true');
  // CSS scaling exercises the 200% layout; real browser zoom remains a separate check.
  await page.addStyleTag({ content: 'html { zoom: 2 !important; }' });
  const toolbar = page.locator('.ui-block-canvas').getByRole('group', { name: 'Image block tools' });
  const transform = toolbar.getByRole('button', { name: 'Transform Image block' });
  await transform.click();
  await expect(page.getByRole('menu', { name: 'Transform block' }).getByRole('menuitem', { name: 'Group', exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(transform).toBeFocused();
  await expect(transform).toHaveCSS('outline-style', 'solid');
  await expect(toolbar.getByRole('button', { name: 'Image link settings' })).toBeVisible();
  await expect(toolbar.getByRole('button', { name: 'Remove caption' })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('image-toolbar-200-percent.png') });
});
