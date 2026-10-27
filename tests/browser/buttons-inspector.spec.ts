import { expect, test } from '@playwright/test';

async function enableTypography(page: import('@playwright/test').Page) {
  const options = page.getByRole('button', { name: 'Typography options', exact: true });
  await options.click();
  for (const name of ['Font family', 'Line height', 'Letter spacing', 'Decoration', 'Letter case']) {
    const toggle = page.locator('.inspector-tools-menu').getByRole('button', { name, exact: true });
    if (await toggle.getAttribute('aria-pressed') !== 'true') await toggle.click();
  }
  await page.keyboard.press('Escape'); await expect(options).toBeFocused();
}

for (const host of ['library', 'content', 'template']) test(`Buttons canonical ${host} inspector edits inherited typography with owning history and Preview`, async ({ page }) => {
  await page.goto(host === 'library' ? '/studio/ui/blocks/buttons' : host === 'content' ? '/studio/ui/selection' : '/studio/ui/selection/template');
  if (host === 'library') await expect(page.locator('.ui-block-specimen')).toHaveAttribute('data-ready', 'true');
  const group = host === 'library' ? page.locator('.ui-block-canvas .content-buttons').first() : page.locator(`[data-studio-nested-block-id="${host === 'content' ? 'nested-buttons' : 'template-buttons'}"], [data-studio-block-anchor-id="${host === 'content' ? 'nested-buttons' : 'template-buttons'}"]`).first();
  if (host === 'template') await group.focus();
  else if (host === 'content') { const box = await group.boundingBox(); await group.click({ position: { x: box!.width - 1, y: 2 } }); }
  await expect(page.getByRole('heading', { name: 'Buttons', exact: true, level: 2 })).toBeVisible();
  const surface = group.locator('.content-button').first();
  const initialLabel = await surface.textContent();
  const initialFamily = await surface.evaluate(element => getComputedStyle(element).fontFamily);
  await enableTypography(page);
  await page.getByRole('combobox', { name: 'Font family', exact: true }).selectOption('arial');
  await page.getByRole('textbox', { name: 'Line height', exact: true }).fill('1.8');
  await page.getByRole('textbox', { name: 'Letter spacing', exact: true }).fill('0.1em');
  await page.getByRole('combobox', { name: 'Decoration', exact: true }).selectOption('underline');
  await page.getByRole('combobox', { name: 'Letter case', exact: true }).selectOption('uppercase');
  await expect(surface).toHaveCSS('text-transform', 'uppercase');
  await expect(surface).toHaveCSS('text-decoration-line', 'underline');
  await expect(surface).toHaveCSS('font-family', 'Arial, sans-serif');
  const metrics = await surface.evaluate(element => { const css = getComputedStyle(element); return { lineHeight: parseFloat(css.lineHeight) / parseFloat(css.fontSize), spacing: parseFloat(css.letterSpacing) / parseFloat(css.fontSize) }; });
  expect(metrics.lineHeight).toBeCloseTo(1.8, 2); expect(metrics.spacing).toBeCloseTo(0.1, 2);
  expect(await surface.textContent()).toBe(initialLabel);
  const toolbar = page.getByRole('group', { name: 'Buttons block tools', exact: true }).filter({ visible: true });
  await toolbar.getByRole('button', { name: 'More block options', exact: true }).focus();
  await page.keyboard.press('Meta+z'); await expect(surface).not.toHaveCSS('text-transform', 'uppercase');
  await page.keyboard.press('Meta+Shift+z'); await expect(surface).toHaveCSS('text-transform', 'uppercase');
  await page.getByRole('button', { name: 'Preview', exact: true }).click();
  const preview = host === 'library' ? page.locator('.ui-block-canvas .content-buttons').first().locator('.content-button').first() : page.locator('.content-buttons .content-button').filter({ hasText: initialLabel! }).first();
  await expect(preview).toHaveCSS('font-family', 'Arial, sans-serif');
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
  for (const [name, value] of [['Font family', 'arial'], ['Decoration', 'underline'], ['Letter case', 'uppercase']]) {
    const control = page.getByRole('combobox', { name, exact: true });
    await control.selectOption(value); await expect(control).toHaveValue(value);
  }
  await page.getByRole('textbox', { name: 'Line height', exact: true }).fill('2');
  await expect(page.getByRole('textbox', { name: 'Line height', exact: true })).toHaveValue('2');
  await page.getByRole('textbox', { name: 'Letter spacing', exact: true }).fill('0.2em');
  await expect(page.getByRole('textbox', { name: 'Letter spacing', exact: true })).toHaveValue('0.2em');
  await page.screenshot({ path: `/private/tmp/acm-buttons-inspector-${width}.png` });
  await page.getByRole('checkbox', { name: 'Read-only example', exact: true }).check();
  for (const name of ['Font family', 'Decoration', 'Letter case']) await expect(page.getByRole('combobox', { name, exact: true })).toBeDisabled();
  for (const name of ['Line height', 'Letter spacing']) await expect(page.getByRole('textbox', { name, exact: true })).toBeDisabled();
});
