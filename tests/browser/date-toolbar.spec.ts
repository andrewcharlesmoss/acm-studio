import { expect, test } from '@playwright/test';

test('Date variations and alignment retain output and own history', async ({ page }) => {
  await page.goto('/studio/ui/blocks/post-date');
  await expect(page.locator('.ui-block-specimen')).toHaveAttribute('data-ready', 'true');
  const editor = page.locator('.ui-library-canvas');
  const output = editor.locator('[data-studio-block-anchor-id="post-date-fixture"] .article-byline-detail').first();
  const initial = await output.innerText();
  const mode = editor.getByRole('button', { name: 'Date variation' });
  const undo = page.getByRole('button', { name: 'Undo specimen change' });
  await expect(undo).toBeDisabled();
  await mode.click();
  await page.getByRole('menuitemradio', { name: 'Post Date', exact: true }).click();
  await expect(undo).toBeDisabled();
  await mode.click();
  await page.getByRole('menuitemradio', { name: 'Modified Date', exact: true }).click();
  await mode.click(); await expect(page.getByRole('menuitemradio', { name: 'Modified Date', exact: true })).toHaveAttribute('aria-checked', 'true'); await page.keyboard.press('Escape');
  await expect(mode).toBeFocused();
  const modified = await output.innerText();
  expect(modified).not.toEqual(initial);
  await undo.click(); await expect(output).toHaveText(initial);
  await page.getByRole('button', { name: 'Redo specimen change' }).click();
  await expect(output).toHaveText(modified);
  await editor.getByRole('button', { name: 'Text alignment', exact: true }).click();
  await page.getByRole('menuitemradio', { name: 'Align text centre' }).click();
  await expect(output).toHaveClass(/align-centre/);
  await undo.click(); await expect(output).toHaveClass(/align-left/);
  await page.getByRole('button', { name: 'Redo specimen change' }).click();
  await expect(output).toHaveClass(/align-centre/);
  await page.getByRole('button', { name: 'Preview', exact: true }).click();
  await expect(page.locator('.ui-block-specimen .metadata-block:has(time)')).toHaveText(modified);
  await expect(page.locator('.ui-block-specimen .metadata-block:has(time)')).toHaveClass(/align-centre/);
});

test('Date read-only and movement locks retain accurate controls', async ({ page }) => {
  await page.goto('/studio/ui/blocks/post-date');
  await expect(page.locator('.ui-block-specimen')).toHaveAttribute('data-ready', 'true');
  const toolbar = page.getByRole('group', { name: 'Date block tools' });
  await page.getByRole('checkbox', { name: 'Lock move and remove' }).check();
  for (const name of ['Date variation', 'Text alignment']) await expect(toolbar.getByRole('button', { name, exact: true })).toBeEnabled();
  await expect(toolbar.getByRole('button', { name: 'Bold selected text' })).toHaveCount(0);
  await page.getByRole('checkbox', { name: 'Read-only example' }).check();
  for (const name of ['Date variation', 'Text alignment']) await expect(toolbar.getByRole('button', { name, exact: true })).toBeDisabled();
});

for (const host of ['content', 'template']) {
  test(`Date uses actual ${host} owner and keyboard history`, async ({ page }) => {
    await page.goto(host === 'content' ? '/studio/ui/selection' : '/studio/ui/selection/template');
    const id = host === 'content' ? 'post-date-example' : 'template-post-date';
    await page.locator(`[data-studio-block-anchor-id="${id}"], [data-studio-nested-block-id="${id}"]`).first().click();
    const output = page.locator(`[data-studio-block-anchor-id="${id}"] .article-byline-detail, [data-studio-nested-block-id="${id}"] .article-byline-detail`).first();
    const initial = await output.innerText();
    const mode = page.getByRole('button', { name: 'Date variation' });
    await mode.click(); await page.getByRole('menuitemradio', { name: 'Modified Date', exact: true }).click();
    await mode.click(); await expect(page.getByRole('menuitemradio', { name: 'Modified Date', exact: true })).toHaveAttribute('aria-checked', 'true'); await page.keyboard.press('Escape');
    const modified = await output.innerText();
  expect(modified).not.toEqual(initial);
    await page.keyboard.press('Meta+z'); await expect(output).toHaveText(initial);
    await page.keyboard.press('Meta+Shift+z'); await expect(output).toHaveText(modified);
    await page.getByRole('button', { name: 'Text alignment', exact: true }).click();
    await page.getByRole('menuitemradio', { name: 'Align text right' }).click();
    await expect(output).toHaveClass(/align-right/);
    await page.keyboard.press('Meta+z'); await expect(output).toHaveClass(/align-left/);
    await page.keyboard.press('Meta+Shift+z'); await expect(output).toHaveClass(/align-right/);
  });
}

for (const width of [1440, 820, 390]) {
  test(`Date full toolbar remains reachable at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/studio/ui/blocks/post-date');
    await expect(page.locator('.ui-block-specimen')).toHaveAttribute('data-ready', 'true');
    const toolbar = page.getByRole('group', { name: 'Date block tools' });
    for (const name of ['Date variation', 'Text alignment', 'More block options']) {
      const button = toolbar.getByRole('button', { name, exact: true });
      await button.click(); await page.keyboard.press('Escape'); await expect(button).toBeFocused();
    }
    const canvasBox = await page.locator('.ui-block-canvas').boundingBox();
    const toolbarBox = await toolbar.boundingBox();
    expect(toolbarBox!.x).toBeGreaterThanOrEqual(canvasBox!.x);
    expect(toolbarBox!.x + toolbarBox!.width).toBeLessThanOrEqual(canvasBox!.x + canvasBox!.width);
    await page.screenshot({ path: `/private/tmp/acm-post-date-toolbar-${width}.png` });
  });
}
