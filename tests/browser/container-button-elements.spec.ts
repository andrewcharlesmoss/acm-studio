import { expect, test, type Locator, type Page } from '@playwright/test';

async function chooseElementColour(page: Page, specimen: Locator, block: string, tab: string, name: RegExp) {
  const back = specimen.getByRole('button', { name: 'Back to Blocks', exact: true });
  if (await back.count()) await back.click();
  await specimen.locator(`[data-block-target="${block}"]`).click();
  await specimen.getByRole('button', { name: 'Choose Button colour', exact: true }).click();
  const popup = page.getByRole('dialog', { name: 'Button colour palette', exact: true });
  await popup.getByRole('tab', { name: tab, exact: true }).click();
  await popup.getByRole('button', { name }).click();
  await page.keyboard.press('Escape');
  await expect(specimen.getByRole('button', { name: 'Choose Button colour', exact: true })).toBeFocused();
}

test('container Button colour uses shared controls, nearest inheritance, authored states and Reset', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/studio/ui/controls#block-style-panels');
  const specimen = page.getByRole('group', { name: 'Block Styles panes example', exact: true });
  await expect(specimen).toHaveAttribute('data-ready', 'true');
  await chooseElementColour(page, specimen, 'group', 'Text', /^Accent 3,/);
  await chooseElementColour(page, specimen, 'group', 'Background', /^Accent 2,/);
  await chooseElementColour(page, specimen, 'column', 'Text', /^Accent 1,/);
  await specimen.getByText('Compare container Button inheritance', { exact: true }).click();
  const preview = specimen.getByLabel('Container Button Preview comparison', { exact: true });
  const edit = specimen.getByLabel('Container Button Edit comparison', { exact: true });
  for (const surface of [preview, edit]) {
    await expect(surface.locator('.content-button').filter({ hasText: 'Group Button' }).first()).toHaveCSS('color', 'rgb(80, 58, 168)');
    await expect(surface.locator('.content-button').filter({ hasText: 'Column Button' })).toHaveCSS('color', 'rgb(255, 238, 88)');
    await expect(surface.locator('.content-button').filter({ hasText: 'Inner Group Button' })).toHaveCSS('color', 'rgb(80, 58, 168)');
    await expect(surface.locator('.content-button').filter({ hasText: 'Column Button' })).toHaveCSS('background-color', 'rgb(246, 207, 244)');
    await expect(surface.locator('.content-button').filter({ hasText: 'Authored Button' })).toHaveCSS('color', 'rgb(19, 87, 36)');
  }
  await expect(preview.getByRole('link', { name: 'Unscoped Button', exact: true })).toHaveCSS('color', 'rgb(255, 0, 0)');
  const themed = preview.getByRole('link', { name: 'Group Button', exact: true });
  await themed.hover();
  await expect(themed).toHaveCSS('color', 'rgb(152, 118, 84)');
  const authored = preview.getByRole('link', { name: 'Authored Button', exact: true });
  await authored.hover();
  await expect(authored).toHaveCSS('color', 'rgb(18, 52, 86)');
  await expect(authored).toHaveCSS('background-color', 'rgb(171, 205, 239)');
  await page.mouse.move(0, 0);
  await specimen.getByLabel('Container preview width').selectOption('400');
  await expect(authored).toHaveCSS('color', 'rgb(36, 104, 19)');
  await specimen.getByRole('button', { name: 'Reset example', exact: true }).click();
  await expect(specimen.locator('[data-block-target="group"]')).toBeVisible();
  await specimen.getByText('Compare container Button inheritance', { exact: true }).click();
  await expect(specimen.getByLabel('Container preview width')).toHaveValue('900');
});

test('container gradient never covers an authored solid Button background', async ({ page }) => {
  await page.goto('/studio/ui/controls#block-style-panels');
  const specimen = page.getByRole('group', { name: 'Block Styles panes example', exact: true });
  await expect(specimen).toHaveAttribute('data-ready', 'true');
  await specimen.locator('[data-block-target="group"]').click();
  await specimen.getByRole('button', { name: 'Choose Button colour', exact: true }).click();
  const popup = page.getByRole('dialog', { name: 'Button colour palette', exact: true });
  await popup.getByRole('tab', { name: 'Gradient', exact: true }).click();
  await popup.getByRole('spinbutton', { name: 'Gradient angle', exact: true }).fill('45');
  await popup.getByRole('spinbutton', { name: 'Gradient angle', exact: true }).press('Tab');
  await page.keyboard.press('Escape');
  await specimen.getByText('Compare container Button inheritance', { exact: true }).click();
  for (const label of ['Container Button Edit comparison', 'Container Button Preview comparison']) {
    const surface = specimen.getByLabel(label, { exact: true });
    await expect(surface.locator('.content-button').filter({ hasText: 'Group Button' }).first()).not.toHaveCSS('background-image', 'none');
    await expect(surface.locator('.content-button').filter({ hasText: 'Authored Button' })).toHaveCSS('background-image', 'none');
    await expect(surface.locator('.content-button').filter({ hasText: 'Authored Button' })).toHaveCSS('background-color', 'rgb(238, 238, 238)');
  }
  const group = specimen.getByLabel('Container Button Preview comparison', { exact: true }).getByRole('link', { name: 'Group Button', exact: true });
  await group.hover();
  await expect(group).toHaveCSS('background-image', 'none');
  await expect(group).toHaveCSS('background-color', 'rgb(254, 254, 254)');
  await page.mouse.move(0, 0);
  await chooseElementColour(page, specimen, 'group', 'Background', /^Accent 2,/);
  await expect(group).toHaveCSS('background-image', 'none');
  await expect(group).toHaveCSS('background-color', 'rgb(246, 207, 244)');
  await specimen.getByRole('button', { name: 'Elements options', exact: true }).click();
  await page.getByRole('group', { name: 'Elements controls', exact: true }).getByRole('button', { name: 'Reset Button', exact: true }).click();
  await page.keyboard.press('Escape');
  await expect(group).toHaveCSS('background-color', 'rgb(0, 255, 0)');
  await specimen.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(group).toHaveCSS('background-color', 'rgb(246, 207, 244)');
  await specimen.getByRole('button', { name: 'Redo', exact: true }).click();
  await expect(group).toHaveCSS('background-color', 'rgb(0, 255, 0)');

});

for (const { width, zoom } of [{ width: 1440, zoom: 1 }, { width: 820, zoom: 1 }, { width: 390, zoom: 1 }, { width: 1440, zoom: 2 }]) {
  test(`shared Button element popup at ${width}px and ${zoom * 100}% content zoom`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('/studio/ui/controls#block-style-panels');
    if (zoom !== 1) await page.locator('html').evaluate((element, value) => { element.style.zoom = String(value); }, zoom);
    const specimen = page.getByRole('group', { name: 'Block Styles panes example', exact: true });
    await expect(specimen).toHaveAttribute('data-ready', 'true');
    await specimen.locator('[data-block-target="group"]').click();
    const trigger = specimen.getByRole('button', { name: 'Choose Button colour', exact: true });
    await trigger.focus();
    await trigger.press('Enter');
    const popup = page.getByRole('dialog', { name: 'Button colour palette', exact: true });
    for (const label of ['Text', 'Background', 'Gradient']) {
      const tab = popup.getByRole('tab', { name: label, exact: true });
      await expect(tab).toBeVisible();
      await tab.click();
      const box = await tab.boundingBox();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(width + 1);
    }
    if (width === 1440 && zoom === 1) await popup.screenshot({ path: testInfo.outputPath('container-button-control.png') });
    await page.keyboard.press('Escape');
    await expect(popup).toBeHidden();
    await expect(trigger).toBeFocused();
  });
}
