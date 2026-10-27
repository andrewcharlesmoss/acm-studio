import { expect, test } from '@playwright/test';

test('Title levels and alignment retain dynamic content, support history and ignore no-op choices', async ({ page }) => {
  await page.goto('/studio/ui/blocks/document-title');
  await expect(page.locator('.ui-block-specimen')).toHaveAttribute('data-ready', 'true');
  const editor = page.locator('.ui-library-canvas');
  const title = editor.locator('.document-dynamic-title');
  const text = await title.innerText();
  const level = editor.getByRole('button', { name: 'Title heading level' });
  const undo = page.getByRole('button', { name: 'Undo specimen change' });
  await expect(undo).toBeDisabled();
  await level.click();
  await page.getByRole('menu', { name: 'Title heading level' }).getByRole('menuitemradio', { name: 'Heading 2', exact: true }).click();
  await expect(undo).toBeDisabled();
  for (const value of [0, 1, 2, 3, 4, 5, 6]) {
    await level.click();
    await page.getByRole('menu', { name: 'Title heading level' }).getByRole('menuitemradio', { name: value === 0 ? 'Paragraph' : `Heading ${value}`, exact: true }).click();
    await expect(title).toHaveJSProperty('tagName', value === 0 ? 'P' : `H${value}`);
    await expect(title).toHaveText(text);
    await expect(level).toBeFocused();
  }
  const alignment = editor.getByRole('button', { name: 'Text alignment', exact: true });
  await alignment.click();
  await page.getByRole('menuitemradio', { name: 'Align text centre' }).click();
  await expect(title).toHaveClass(/align-centre/);
  await undo.click();
  await expect(title).toHaveClass(/align-left/);
  await page.getByRole('button', { name: 'Redo specimen change' }).click();
  await expect(title).toHaveClass(/align-centre/);
  await page.getByRole('button', { name: 'Preview', exact: true }).click();
  await expect(page.locator('.ui-block-specimen .document-dynamic-field h6')).toHaveText(text);
});

test('Title read-only and movement locks keep accurate presentation controls', async ({ page }) => {
  await page.goto('/studio/ui/blocks/document-title');
  await expect(page.locator('.ui-block-specimen')).toHaveAttribute('data-ready', 'true');
  const toolbar = page.getByRole('group', { name: 'Title block tools' });
  await page.getByRole('checkbox', { name: 'Lock move and remove' }).check();
  await expect(toolbar.getByRole('button', { name: 'Title heading level' })).toBeEnabled();
  await expect(toolbar.getByRole('button', { name: 'Text alignment', exact: true })).toBeEnabled();
  await expect(toolbar.getByRole('button', { name: 'Bold selected text' })).toHaveCount(0);
  await page.getByRole('checkbox', { name: 'Read-only example' }).check();
  await expect(toolbar.getByRole('button', { name: 'Title heading level' })).toBeDisabled();
  await expect(toolbar.getByRole('button', { name: 'Text alignment', exact: true })).toBeDisabled();
});

for (const host of ['content', 'template']) {
  test(`Title presentation uses actual ${host} owner and keyboard history`, async ({ page }) => {
    await page.goto(host === 'content' ? '/studio/ui/selection' : '/studio/ui/selection/template');
    const id = host === 'content' ? 'document-title-example' : 'template-title';
    await page.locator(`[data-studio-block-anchor-id="${id}"], [data-studio-nested-block-id="${id}"]`).first().click();
    const title = page.locator('.document-dynamic-title');
    const text = await title.innerText();
    const level = page.getByRole('button', { name: 'Title heading level' });
    await level.click();
    await page.getByRole('menuitemradio', { name: 'Heading 3', exact: true }).click();
    await expect(title).toHaveJSProperty('tagName', 'H3');
    await expect(title).toHaveText(text);
    await page.keyboard.press('Meta+z');
    await expect(title).toHaveJSProperty('tagName', 'H2');
    await page.keyboard.press('Meta+Shift+z');
    await expect(title).toHaveJSProperty('tagName', 'H3');
    await page.getByRole('button', { name: 'Text alignment', exact: true }).click();
    await page.getByRole('menuitemradio', { name: 'Align text right' }).click();
    await expect(title).toHaveClass(/align-right/);
    await page.keyboard.press('Meta+z');
    await expect(title).toHaveClass(/align-left/);
    await page.keyboard.press('Meta+Shift+z');
    await expect(title).toHaveClass(/align-right/);
  });
}

for (const width of [1440, 820, 390]) {
  test(`Title toolbar menus remain reachable at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/studio/ui/blocks/document-title');
    await expect(page.locator('.ui-block-specimen')).toHaveAttribute('data-ready', 'true');
    const toolbar = page.getByRole('group', { name: 'Title block tools' });
    const level = toolbar.getByRole('button', { name: 'Title heading level' });
    await level.click();
    await expect(page.getByRole('menuitemradio', { name: 'Paragraph', exact: true })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(level).toBeFocused();
    await toolbar.getByRole('button', { name: 'Text alignment', exact: true }).click();
    await page.keyboard.press('Escape');
    await expect(toolbar.getByRole('button', { name: 'Text alignment', exact: true })).toBeFocused();
    await toolbar.getByRole('button', { name: 'More block options' }).click();
    await page.keyboard.press('Escape');
    await expect(toolbar.getByRole('button', { name: 'More block options' })).toBeFocused();
    const canvasBox = await page.locator('.ui-block-canvas').boundingBox();
    const toolbarBox = await toolbar.boundingBox();
    expect(toolbarBox!.x).toBeGreaterThanOrEqual(canvasBox!.x);
    expect(toolbarBox!.x + toolbarBox!.width).toBeLessThanOrEqual(canvasBox!.x + canvasBox!.width);
    await page.screenshot({ path: `/private/tmp/acm-title-toolbar-${width}.png` });
  });
}
