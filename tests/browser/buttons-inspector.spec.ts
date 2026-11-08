import { expect, test } from '@playwright/test';

async function enableTypography(page: import('@playwright/test').Page) {
  const options = page.getByRole('button', { name: 'Typography options', exact: true });
  await options.click();
  for (const name of ['Font', 'Line height', 'Letter spacing', 'Decoration', 'Letter case']) {
    const toggle = page.locator('.inspector-tools-menu').getByRole('button', { name, exact: true });
    if (await toggle.getAttribute('aria-pressed') !== 'true') await toggle.click();
  }
  await page.keyboard.press('Escape'); await expect(options).toBeFocused();
}

async function chooseFont(page: import('@playwright/test').Page, family: string) {
  const previewTrigger = page.getByRole('button', { name: /^Font / }).first();
  if (await previewTrigger.count()) {
    await previewTrigger.click();
    const option = page.getByRole('menuitemradio', { name: family, exact: true });
    const previewFamily = await option.locator('span').evaluate(element => getComputedStyle(element).fontFamily);
    await option.click();
    return previewFamily;
  }
  await page.getByRole('combobox', { name: 'Font', exact: true }).selectOption(family);
  return undefined;
}

async function setLetterSpacing(page: import('@playwright/test').Page, value: string, unit: string) {
  await page.getByRole('spinbutton', { name: 'Letter spacing', exact: true }).fill(value);
  await page.getByRole('combobox', { name: 'Letter spacing unit', exact: true }).selectOption(unit);
}

for (const host of ['library', 'content', 'template']) test(`Buttons canonical ${host} inspector edits inherited typography with owning history and Preview`, async ({ page }) => {
  await page.goto(host === 'library' ? '/studio/ui/blocks/buttons' : host === 'content' ? '/studio/ui/selection' : '/studio/ui/selection/template');
  if (host === 'library') await expect(page.locator('.ui-block-specimen')).toHaveAttribute('data-ready', 'true');
  const group = host === 'library' ? page.locator('.ui-block-canvas .content-buttons').first() : page.locator(`[data-studio-nested-block-id="${host === 'content' ? 'nested-buttons' : 'template-buttons'}"], [data-studio-block-anchor-id="${host === 'content' ? 'nested-buttons' : 'template-buttons'}"]`).first();
  if (host === 'template' || host === 'content') { const box = await group.boundingBox(); await group.click({ position: { x: box!.width - 1, y: 2 } }); }
  await expect(page.getByRole('heading', { name: 'Buttons', exact: true, level: 2 })).toBeVisible();
  const surface = group.locator('.content-button').first();
  const initialLabel = await surface.textContent();
  const initialFamily = await surface.evaluate(element => getComputedStyle(element).fontFamily);
  await enableTypography(page);
  const family = await chooseFont(page, host === 'library' ? 'Fira Code' : 'Arial');
  await page.getByRole('spinbutton', { name: 'Line height', exact: true }).fill('1.8');
  await setLetterSpacing(page, '0.1', 'em');
  await page.getByRole('radio', { name: 'Underline', exact: true }).check();
  await page.getByRole('radio', { name: 'Uppercase', exact: true }).check();
  await expect(surface).toHaveCSS('text-transform', 'uppercase');
  await expect(surface).toHaveCSS('text-decoration-line', 'underline');
  const selectedFamily = await surface.evaluate(element => getComputedStyle(element).fontFamily);
  expect(selectedFamily).not.toBe(initialFamily);
  if (family) expect(selectedFamily).toBe(family);
  const metrics = await surface.evaluate(element => { const css = getComputedStyle(element); return { lineHeight: parseFloat(css.lineHeight) / parseFloat(css.fontSize), spacing: parseFloat(css.letterSpacing) / parseFloat(css.fontSize) }; });
  expect(metrics.lineHeight).toBeCloseTo(1.8, 2); expect(metrics.spacing).toBeCloseTo(0.1, 2);
  expect(await surface.textContent()).toBe(initialLabel);
  const toolbar = page.getByRole('group', { name: 'Buttons block tools', exact: true }).filter({ visible: true });
  await toolbar.getByRole('button', { name: 'More block options', exact: true }).focus();
  await page.keyboard.press('Meta+z'); await expect(surface).not.toHaveCSS('text-transform', 'uppercase');
  await page.keyboard.press('Meta+Shift+z'); await expect(surface).toHaveCSS('text-transform', 'uppercase');
  await page.getByRole('button', { name: 'Preview', exact: true }).click();
  const preview = host === 'library' ? page.locator('.ui-block-canvas .content-buttons').first().locator('.content-button').first() : page.locator('.content-buttons .content-button').filter({ hasText: initialLabel! }).first();
  await expect(preview).toHaveCSS('font-family', selectedFamily);
  await expect(preview).toHaveCSS('text-transform', 'uppercase');
  await expect(preview).toHaveCSS('text-decoration-line', 'underline');
  await preview.scrollIntoViewIfNeeded();
  await page.screenshot({ path: `/private/tmp/acm-buttons-inspector-${host}.png` });
  if (host === 'library') {
    await page.getByRole('button', { name: 'Reset Example', exact: true }).click();
    const resetSurface = page.locator('.ui-block-canvas .content-buttons').first().locator('.content-button').first();
    await expect(resetSurface).toHaveCSS('font-family', initialFamily);
    await expect(resetSurface).not.toHaveCSS('text-transform', 'uppercase');
    await expect(resetSurface).not.toHaveCSS('text-decoration-line', 'underline');
  }
});

for (const width of [820, 390]) test(`Buttons typography controls remain editable at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 1000 });
  await page.goto('/studio/ui/blocks/buttons');
  await expect(page.locator('.ui-block-specimen')).toHaveAttribute('data-ready', 'true');
  await enableTypography(page);
  await chooseFont(page, 'Fira Code');
  await page.getByRole('radio', { name: 'Underline', exact: true }).check();
  await expect(page.getByRole('radio', { name: 'Underline', exact: true })).toBeChecked();
  await page.getByRole('radio', { name: 'Uppercase', exact: true }).check();
  await expect(page.getByRole('radio', { name: 'Uppercase', exact: true })).toBeChecked();
  await page.getByRole('spinbutton', { name: 'Line height', exact: true }).fill('2');
  await expect(page.getByRole('spinbutton', { name: 'Line height', exact: true })).toHaveValue('2');
  await setLetterSpacing(page, '0.2', 'em');
  await expect(page.getByRole('spinbutton', { name: 'Letter spacing', exact: true })).toHaveValue('0.2');
  await expect(page.getByRole('combobox', { name: 'Letter spacing unit', exact: true })).toHaveValue('em');
  await page.screenshot({ path: `/private/tmp/acm-buttons-inspector-${width}.png` });
  await page.getByRole('checkbox', { name: 'Read-only example', exact: true }).check();
  await expect(page.getByRole('button', { name: /^Font / }).first()).toBeDisabled();
  for (const name of ['Underline', 'Uppercase']) await expect(page.getByRole('radio', { name, exact: true })).toBeDisabled();
  for (const name of ['Line height', 'Letter spacing']) await expect(page.getByRole('spinbutton', { name, exact: true })).toBeDisabled();
  await expect(page.getByRole('combobox', { name: 'Letter spacing unit', exact: true })).toBeDisabled();
});

test('Buttons inspector sets and resets its managed background image in the rendered specimen', async ({ page }) => {
  await page.goto('/studio/ui/blocks/buttons');
  await expect(page.locator('.ui-block-specimen')).toHaveAttribute('data-ready', 'true');
  const group = page.locator('.ui-block-canvas .content-buttons').first();
  const box = await group.boundingBox();
  await group.click({ position: { x: box!.width - 1, y: 2 } });
  await expect(page.getByRole('heading', { name: 'Buttons', exact: true, level: 2 })).toBeVisible();
  await page.getByRole('button', { name: 'Image', exact: true }).click();
  await expect(group).toHaveCSS('background-image', /library-local-image/);
  await expect(page.getByRole('combobox', { name: 'Image size', exact: true })).toHaveValue('cover');
  await page.getByRole('combobox', { name: 'Image size', exact: true }).selectOption('contain');
  await expect(group).toHaveCSS('background-size', 'contain');
  await page.getByRole('button', { name: 'Remove background image', exact: true }).click();
  await expect(group).not.toHaveCSS('background-image', /library-local-image/);
  await page.getByRole('button', { name: 'Reset Example', exact: true }).click();
});
