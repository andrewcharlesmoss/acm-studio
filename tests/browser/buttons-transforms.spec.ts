import { expect, test, type Page } from '@playwright/test';

async function openButtons(page: Page, host: string) {
  await page.goto(host === 'library' ? '/studio/ui/blocks/buttons' : host === 'content' ? '/studio/ui/selection' : '/studio/ui/selection/template');
  if (host === 'library') await expect(page.locator('.ui-block-specimen')).toHaveAttribute('data-ready', 'true');
  const id = host === 'library' ? 'buttons-library-specimen' : host === 'content' ? 'nested-buttons' : 'template-buttons';
  const source = page.locator(`[data-studio-block-anchor-id="${id}"], [data-studio-nested-block-id="${id}"]`).first();
  if (host === 'template') await source.focus();
  else if (host === 'content') { const box = await source.boundingBox(); await source.click({ position: { x: box!.width - 1, y: 2 } }); }
  return source;
}

for (const host of ['library', 'content', 'template']) for (const wrapper of ['Group', 'Columns']) {
  test(`Buttons ${wrapper} wrapping retains the ${host} subtree and owning history`, async ({ page }) => {
    const source = await openButtons(page, host);
    const labels = await source.locator('.content-button').allTextContents();
    const richCount = await source.locator('.content-button strong').count();
    const wrapperClass = wrapper === 'Columns' ? 'studio-columns' : host === 'template' ? 'template-group' : 'studio-nested-group';
    const ancestors = source.locator(`xpath=ancestor::*[contains(concat(' ',normalize-space(@class),' '),' ${wrapperClass} ')]`);
    const initialAncestors = await ancestors.count();
    const trigger = page.getByRole('button', { name: 'Transform Buttons block', exact: true }).filter({ visible: true });
    await trigger.click();
    await page.getByRole('menu', { name: 'Transform block', exact: true }).getByRole('menuitem', { name: wrapper, exact: true }).click();
    const toolbar = page.getByRole('group', { name: `${wrapper} block tools`, exact: true }).filter({ visible: true });
    await expect(toolbar).toBeVisible();
    await expect(ancestors).toHaveCount(initialAncestors + 1);
    expect(await source.locator('.content-button').allTextContents()).toEqual(labels);
    await expect(source.locator('.content-button strong')).toHaveCount(richCount);
    await toolbar.getByRole('button', { name: 'More block options', exact: true }).focus();
    await page.keyboard.press('Meta+z');
    await expect(ancestors).toHaveCount(initialAncestors);
    expect(await source.locator('.content-button').allTextContents()).toEqual(labels);
    await page.keyboard.press('Meta+Shift+z');
    await expect(ancestors).toHaveCount(initialAncestors + 1);
    expect(await source.locator('.content-button').allTextContents()).toEqual(labels);
    await page.getByRole('button', { name: 'Preview', exact: true }).click();
    const preview = page.locator('.content-buttons').filter({ has: page.locator('.content-button', { hasText: labels[0] }) }).first();
    await expect(preview).toBeVisible();
    expect(await preview.locator('.content-button').allTextContents()).toEqual(labels);
    await preview.scrollIntoViewIfNeeded();
    await page.screenshot({ path: `/private/tmp/acm-buttons-wrap-${host}-${wrapper.toLowerCase()}.png` });
  });
}

for (const width of [1440, 820, 390]) test(`Buttons wrapping menu supports keyboard and readonly states at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 1000 });
  await openButtons(page, 'library');
  const trigger = page.getByRole('button', { name: 'Transform Buttons block', exact: true }).filter({ visible: true });
  await trigger.focus(); await page.keyboard.press('Enter');
  for (const name of ['Group', 'Columns']) await expect(page.getByRole('menuitem', { name, exact: true })).toBeVisible();
  await page.keyboard.press('Escape'); await expect(trigger).toBeFocused();
  const canvas = await page.locator('.ui-block-canvas').boundingBox(); const toolbar = await page.getByRole('group', { name: 'Buttons block tools', exact: true }).filter({ visible: true }).boundingBox();
  expect(toolbar!.x).toBeGreaterThanOrEqual(canvas!.x - 1); expect(toolbar!.x + toolbar!.width).toBeLessThanOrEqual(canvas!.x + canvas!.width + 1);
  expect(toolbar!.y).toBeGreaterThanOrEqual(canvas!.y - 1);
  await page.screenshot({ path: `/private/tmp/acm-buttons-wrap-toolbar-${width}.png` });
  await page.getByRole('checkbox', { name: 'Read-only example', exact: true }).check(); await expect(trigger).toBeDisabled();
  await page.getByRole('checkbox', { name: 'Read-only example', exact: true }).uncheck();
  await page.getByRole('checkbox', { name: 'Lock move and remove', exact: true }).check(); await expect(trigger).toHaveCount(0);
});
