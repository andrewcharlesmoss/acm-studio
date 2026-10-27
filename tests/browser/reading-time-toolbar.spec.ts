import { expect, test } from '@playwright/test';

test('Time to Read variations and alignment retain output and own history', async ({ page }) => {
  await page.goto('/studio/ui/blocks/reading-time');
  await expect(page.locator('.ui-block-specimen')).toHaveAttribute('data-ready', 'true');
  await expect(page.getByRole('heading', { name: 'Time to Read', level: 1, exact: true })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Block Library', exact: true }).getByRole('button', { name: 'Time to Read', exact: true })).toBeVisible();
  await expect(page.getByRole('complementary', { name: 'Time to Read settings', exact: true })).toBeVisible();
  const editor = page.locator('.ui-library-canvas');
  const output = editor.locator('.reading-time-block-editor');
  const initial = await output.innerText();
  const mode = editor.getByRole('button', { name: 'Time to Read variation' });
  const undo = page.getByRole('button', { name: 'Undo specimen change' });
  await expect(undo).toBeDisabled();
  await mode.click();
  await page.getByRole('menuitemradio', { name: 'Time to Read', exact: true }).click();
  await expect(undo).toBeDisabled();
  await mode.click();
  await page.getByRole('menuitemradio', { name: 'Word Count', exact: true }).click();
  await expect(output).toContainText(/\d+ words?/);
  await expect(mode).toBeFocused();
  const words = await output.innerText();
  await undo.click(); await expect(output).toHaveText(initial);
  await page.getByRole('button', { name: 'Redo specimen change' }).click();
  await expect(output).toHaveText(words);
  await editor.getByRole('button', { name: 'Text alignment', exact: true }).click();
  await page.getByRole('menuitemradio', { name: 'Align text centre' }).click();
  await expect(output).toHaveClass(/align-centre/);
  await undo.click(); await expect(output).toHaveClass(/align-left/);
  await page.getByRole('button', { name: 'Redo specimen change' }).click();
  await expect(output).toHaveClass(/align-centre/);
  await page.getByRole('button', { name: 'Preview', exact: true }).click();
  await expect(page.locator('.ui-block-specimen .article-reading-time')).toHaveText(words);
  await expect(page.locator('.ui-block-specimen .article-reading-time')).toHaveClass(/align-centre/);
});

test('Time to Read read-only and movement locks retain accurate controls', async ({ page }) => {
  await page.goto('/studio/ui/blocks/reading-time');
  await expect(page.locator('.ui-block-specimen')).toHaveAttribute('data-ready', 'true');
  const toolbar = page.getByRole('group', { name: 'Time to Read block tools' });
  await page.getByRole('checkbox', { name: 'Lock move and remove' }).check();
  for (const name of ['Time to Read variation', 'Text alignment']) await expect(toolbar.getByRole('button', { name, exact: true })).toBeEnabled();
  await expect(toolbar.getByRole('button', { name: 'Bold selected text' })).toHaveCount(0);
  await page.getByRole('checkbox', { name: 'Read-only example' }).check();
  for (const name of ['Time to Read variation', 'Text alignment']) await expect(toolbar.getByRole('button', { name, exact: true })).toBeDisabled();
});

for (const host of ['content', 'template']) {
  test(`Time to Read uses actual ${host} owner and keyboard history`, async ({ page }) => {
    await page.goto(host === 'content' ? '/studio/ui/selection' : '/studio/ui/selection/template');
    const id = host === 'content' ? 'reading-time-example' : 'template-reading-time';
    await page.locator(`[data-studio-block-anchor-id="${id}"], [data-studio-nested-block-id="${id}"]`).first().click();
    const output = page.locator('.reading-time-block-editor');
    const initial = await output.innerText();
    const mode = page.getByRole('button', { name: 'Time to Read variation' });
    await mode.click(); await page.getByRole('menuitemradio', { name: 'Word Count', exact: true }).click();
    await expect(output).toContainText(/About \d+ words?/);
    const words = await output.innerText();
    await page.keyboard.press('Meta+z'); await expect(output).toHaveText(initial);
    await page.keyboard.press('Meta+Shift+z'); await expect(output).toHaveText(words);
    await page.getByRole('button', { name: 'Text alignment', exact: true }).click();
    await page.getByRole('menuitemradio', { name: 'Align text right' }).click();
    await expect(output).toHaveClass(/align-right/);
    await page.keyboard.press('Meta+z'); await expect(output).toHaveClass(/align-left/);
    await page.keyboard.press('Meta+Shift+z'); await expect(output).toHaveClass(/align-right/);
  });
}

for (const width of [1440, 820, 390]) {
  test(`Time to Read full toolbar remains reachable at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/studio/ui/blocks/reading-time');
    await expect(page.locator('.ui-block-specimen')).toHaveAttribute('data-ready', 'true');
    const toolbar = page.getByRole('group', { name: 'Time to Read block tools' });
    for (const name of ['Transform Time to Read block', 'Time to Read variation', 'Text alignment', 'More block options']) {
      const button = toolbar.getByRole('button', { name, exact: true });
      await button.click(); await page.keyboard.press('Escape'); await expect(button).toBeFocused();
    }
    const canvasBox = await page.locator('.ui-block-canvas').boundingBox();
    const toolbarBox = await toolbar.boundingBox();
    expect(toolbarBox!.x).toBeGreaterThanOrEqual(canvasBox!.x);
    expect(toolbarBox!.x + toolbarBox!.width).toBeLessThanOrEqual(canvasBox!.x + canvasBox!.width);
    await page.screenshot({ path: `/private/tmp/acm-reading-time-toolbar-${width}.png` });
  });
}

for (const host of ['library', 'content', 'template']) for (const wrapper of ['Group', 'Columns']) {
  test(`Time to Read ${wrapper} wrapping preserves the ${host} block and owning history`, async ({ page }) => {
    await page.goto(host === 'library' ? '/studio/ui/blocks/reading-time' : host === 'content' ? '/studio/ui/selection' : '/studio/ui/selection/template');
    if (host === 'library') await expect(page.locator('.ui-block-specimen')).toHaveAttribute('data-ready', 'true');
    else await page.locator(`[data-studio-block-anchor-id="${host === 'content' ? 'reading-time-example' : 'template-reading-time'}"], [data-studio-nested-block-id="${host === 'content' ? 'reading-time-example' : 'template-reading-time'}"]`).first().click();
    const output = page.locator('.reading-time-block-editor');
    const initial = await output.innerText();
    const identity = () => output.evaluate(element => { const frame = element.closest('[data-studio-block-anchor-id], [data-studio-nested-block-id]')!; return frame.getAttribute('data-studio-block-anchor-id') ?? frame.getAttribute('data-studio-nested-block-id'); });
    const originalId = await identity();
    const wrapperClass = wrapper === 'Columns' ? 'studio-columns' : host === 'template' ? 'template-group' : 'studio-nested-group';
    const trigger = page.getByRole('button', { name: 'Transform Time to Read block', exact: true });
    await trigger.click();
    await expect(page.getByRole('menu', { name: 'Time to Read variation', exact: true })).toHaveCount(0);
    await page.getByRole('menu', { name: 'Transform block', exact: true }).getByRole('menuitem', { name: wrapper, exact: true }).click();
    const wrapperToolbar = page.getByRole('group', { name: `${wrapper} block tools`, exact: true }).filter({ visible: true });
    await expect(wrapperToolbar).toBeVisible();
    expect(await identity()).toBe(originalId);
    await expect(output).toHaveText(initial);
    await expect(output.locator(`xpath=ancestor::*[contains(concat(' ',normalize-space(@class),' '),' ${wrapperClass} ')]`).first()).toBeVisible();
    await wrapperToolbar.getByRole('button', { name: 'More block options', exact: true }).focus();
    await page.keyboard.press('Meta+z');
    await expect(output).toHaveText(initial);
    await expect(output.locator(`xpath=ancestor::*[contains(concat(' ',normalize-space(@class),' '),' ${wrapperClass} ')]`)).toHaveCount(0);
    await page.keyboard.press('Meta+Shift+z');
    await expect(output).toHaveText(initial);
    await expect(output.locator(`xpath=ancestor::*[contains(concat(' ',normalize-space(@class),' '),' ${wrapperClass} ')]`).first()).toBeVisible();
    await page.getByRole('button', { name: 'Preview', exact: true }).click();
    await expect(page.locator('.article-reading-time').filter({ hasText: initial }).first()).toBeVisible();
  });
}

test('Time to Read variation and wrapping menus open exclusively and respect source locks', async ({ page }) => {
  await page.goto('/studio/ui/blocks/reading-time');
  await expect(page.locator('.ui-block-specimen')).toHaveAttribute('data-ready', 'true');
  const variation = page.getByRole('button', { name: 'Time to Read variation', exact: true });
  await variation.click();
  await expect(page.getByRole('menu', { name: 'Transform block', exact: true })).toHaveCount(0);
  await page.getByRole('menuitemradio', { name: 'Word Count', exact: true }).click();
  const trigger = page.getByRole('button', { name: 'Transform Time to Read block', exact: true });
  await trigger.click(); await page.keyboard.press('Escape'); await expect(trigger).toBeFocused();
  await page.getByRole('checkbox', { name: 'Lock move and remove' }).check();
  await expect(trigger).toHaveCount(0);
  await expect(variation).toBeEnabled();
});
