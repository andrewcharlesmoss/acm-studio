import { expect, test } from '@playwright/test';

test('Heading toolbar styles preserve content and support Undo, Redo and read-only', async ({ page }) => {
  await page.goto('/studio/ui/blocks/heading');
  await expect(page.locator('.ui-block-specimen')).toHaveAttribute('data-ready', 'true');
  const editor = page.locator('.ui-library-canvas');
  const heading = editor.locator('.heading-field').first();
  const text = await heading.innerText();
  const trigger = editor.getByRole('button', { name: /Transform Heading/ });
  await trigger.click();
  const menu = page.getByRole('menu', { name: 'Transform block' });
  await menu.getByRole('menuitemradio', { name: 'Subtitle', exact: true }).click();
  await expect(heading).toContainText(text);
  await trigger.click();
  await expect(menu.getByRole('menuitemradio', { name: 'Subtitle', exact: true })).toHaveAttribute('aria-checked', 'true');
  await page.keyboard.press('Escape');
  await expect(trigger).toBeFocused();
  await page.getByRole('button', { name: 'Undo specimen change' }).click();
  await trigger.click();
  await expect(menu.getByRole('menuitemradio', { name: 'Default', exact: true })).toHaveAttribute('aria-checked', 'true');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Redo specimen change' }).click();
  await trigger.click();
  await expect(menu.getByRole('menuitemradio', { name: 'Subtitle', exact: true })).toHaveAttribute('aria-checked', 'true');
  await page.keyboard.press('Escape');
  await page.getByRole('checkbox', { name: 'Read-only example' }).check();
  await expect(trigger).toBeDisabled();
});

for (const wrapper of ['Group', 'Columns']) {
  test(`Heading ${wrapper} retains content and keyboard history in the Library`, async ({ page }) => {
    await page.goto('/studio/ui/blocks/heading');
    await expect(page.locator('.ui-block-specimen')).toHaveAttribute('data-ready', 'true');
    const editor = page.locator('.ui-library-canvas');
    const text = await editor.locator('.heading-field').first().innerText();
    const trigger = editor.getByRole('button', { name: /Transform Heading/ });
    await trigger.click();
    await page.getByRole('menu', { name: 'Transform block' }).getByRole('menuitem', { name: wrapper, exact: true }).click();
    const toolbar = editor.getByRole('group', { name: `${wrapper} block tools` });
    await expect(editor.locator('.heading-field').first()).toContainText(text);
    await toolbar.getByRole('button', { name: 'More block options' }).focus();
    await page.keyboard.press('Meta+z');
    await expect(trigger).toBeVisible();
    await expect(editor.locator('.editor-canvas-scroll')).toBeFocused();
    await page.keyboard.press('Meta+Shift+z');
    await expect(editor.getByRole('group', { name: `${wrapper} block`, exact: true }).filter({ has: page.locator('.heading-field') })).toBeVisible();
  });

  test(`Heading ${wrapper} uses actual Template Editor history`, async ({ page }) => {
    await page.goto('/studio/ui/selection/template');
    await page.locator('[data-studio-block-id="template-drag-source"]').click();
    await page.getByRole('button', { name: 'Transform Paragraph block' }).click();
    await page.getByRole('menu', { name: 'Transform block' }).getByRole('menuitem', { name: 'Heading 2', exact: true }).click();
    const trigger = page.getByRole('button', { name: /Transform Heading/ });
    await trigger.click();
    await page.getByRole('menu', { name: 'Transform block' }).getByRole('menuitem', { name: wrapper, exact: true }).click();
    await page.getByRole('group', { name: `${wrapper} block tools` }).getByRole('button', { name: 'More block options' }).focus();
    await page.keyboard.press('Meta+z');
    await expect(trigger).toBeVisible();
    await expect(page.locator('.editor-canvas-scroll')).toBeFocused();
    await page.keyboard.press('Meta+Shift+z');
    await expect(page.getByRole('group', { name: `${wrapper} block`, exact: true }).filter({ has: page.locator('[data-studio-block-id="template-drag-source"]') })).toBeVisible();
  });
}

test('Heading changes level and converts in the actual content canvas', async ({ page }) => {
  await page.goto('/studio/ui/selection');
  const block = page.locator('[data-studio-block-id="heading"]');
  await block.click();
  await page.getByRole('button', { name: /Transform Heading/ }).click();
  await page.getByRole('menu', { name: 'Transform block' }).getByRole('menuitem', { name: 'Heading 3', exact: true }).click();
  await expect(block).toHaveClass(/is-h3/);
  await expect(block).toContainText('A heading between different blocks');
  await page.getByRole('button', { name: /Transform Heading/ }).click();
  await page.getByRole('menu', { name: 'Transform block' }).getByRole('menuitem', { name: 'Paragraph', exact: true }).click();
  await expect(block).toHaveClass(/paragraph-field/);
  await expect(block).toContainText('A heading between different blocks');
});

test('Heading level renders semantic output in Preview', async ({ page }) => {
  await page.goto('/studio/ui/blocks/heading');
  await expect(page.locator('.ui-block-specimen')).toHaveAttribute('data-ready', 'true');
  const text = await page.locator('.ui-library-canvas .heading-field').first().innerText();
  await page.getByRole('button', { name: /Transform Heading/ }).click();
  await page.getByRole('menu', { name: 'Transform block' }).getByRole('menuitem', { name: 'Heading 3', exact: true }).click();
  await page.getByRole('button', { name: 'Preview', exact: true }).click();
  await expect(page.locator('.ui-block-specimen h3').filter({ hasText: text })).toBeVisible();
});

for (const width of [1440, 820, 390]) {
  test(`Heading menu is reachable at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/studio/ui/blocks/heading');
    await expect(page.locator('.ui-block-specimen')).toHaveAttribute('data-ready', 'true');
    const trigger = page.getByRole('button', { name: /Transform Heading/ });
    await trigger.click();
    const menu = page.getByRole('menu', { name: 'Transform block' });
    await expect(menu.getByRole('menuitem', { name: 'Columns', exact: true })).toBeVisible();
    await expect(menu.getByRole('menuitemradio', { name: 'Annotation', exact: true })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(trigger).toBeFocused();
    const toolbar = page.getByRole('group', { name: 'Heading block tools' });
    await toolbar.getByRole('button', { name: 'More block options' }).click();
    await page.keyboard.press('Escape');
    await expect(toolbar.getByRole('button', { name: 'More block options' })).toBeFocused();
    const canvasBox = await page.locator('.ui-block-canvas').boundingBox();
    const toolbarBox = await toolbar.boundingBox();
    expect(toolbarBox!.x).toBeGreaterThanOrEqual(canvasBox!.x);
    expect(toolbarBox!.x + toolbarBox!.width).toBeLessThanOrEqual(canvasBox!.x + canvasBox!.width);
    await page.screenshot({ path: `/private/tmp/acm-heading-${width}.png` });
  });
}

test('Heading toolbar remains reachable at 200% CSS document scaling', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/studio/ui/blocks/heading');
  await expect(page.locator('.ui-block-specimen')).toHaveAttribute('data-ready', 'true');
  // Browser-native zoom is verified separately; this exercises scaled layout.
  await page.addStyleTag({ content: 'html { zoom: 2 !important; }' });
  const toolbar = page.getByRole('group', { name: 'Heading block tools' });
  const trigger = toolbar.getByRole('button', { name: /Transform Heading/ });
  await trigger.click();
  await expect(page.getByRole('menu', { name: 'Transform block' }).getByRole('menuitemradio', { name: 'Annotation' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(trigger).toBeFocused();
  await toolbar.getByRole('button', { name: 'More block options' }).click();
  await page.keyboard.press('Escape');
  await expect(toolbar.getByRole('button', { name: 'More block options' })).toBeFocused();
});
