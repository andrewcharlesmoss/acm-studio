import { expect, test } from '@playwright/test';

for (const width of [1440, 820, 390]) {
  test(`shared Block Styles at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('/studio/ui/controls#block-style-panels');
    const specimen = page.getByRole('group', { name: 'Block Styles panes example', exact: true });
    await expect(specimen).toBeVisible();
    await expect(specimen).toHaveAttribute("data-ready", "true");
    await expect(specimen.locator('[data-block-target="search"]')).toContainText('Reference only');
    await expect(specimen.locator('[data-block-target="pullquote"]')).toContainText('Reference only');
    await specimen.getByRole('button', { name: 'Show Group inheritance', exact: true }).click();
    await expect(specimen.getByRole('spinbutton', { name: 'Custom font size', exact: true })).toHaveValue('24');
    await specimen.getByText('Compare Style Book', { exact: true }).click();
    const inline = specimen.locator('.site-block-inline-specimen .site-block-style-row').first();
    const book = specimen.locator('details .site-block-style-row').first();
    await expect(inline).toHaveCSS('color', 'rgb(18, 52, 86)');
    await expect(book).toHaveCSS('color', 'rgb(18, 52, 86)');
    await expect(inline).toHaveCSS('padding', '16px');
    await expect(book).toHaveCSS('padding', '16px');
    await expect(inline).toHaveCSS('font-size', '24px');
    await expect(book).toHaveCSS('font-size', '24px');
    await specimen.getByRole('button', { name: 'Reset example', exact: true }).click();
    await expect(specimen.locator('[data-block-target="row"]')).toBeVisible();
  });
}

test('authored Button states and responsive paragraph indentation retain precedence', async ({ page }) => {
  await page.goto('/studio/ui/controls#block-style-panels');
  const specimen = page.getByRole('group', { name: 'Block Styles panes example', exact: true });
  await expect(specimen).toHaveAttribute('data-ready', 'true');
  await specimen.getByText('Compare authored styles', { exact: true }).click();
  const surface = specimen.getByLabel('Authored styles example', { exact: true });
  const button = surface.getByRole('link', { name: 'Authored state example' });
  await button.hover();
  await expect(button).toHaveCSS('color', 'rgb(18, 52, 86)');
  await expect(button).toHaveCSS('background-color', 'rgb(171, 205, 239)');
  await expect(button).toHaveCSS('border-radius', '12px');
  await page.mouse.move(0, 0);
  await button.focus();
  await expect(button).toHaveCSS('color', 'rgb(101, 67, 33)');
  await button.hover();
  await page.mouse.down();
  await expect(button).toHaveCSS('color', 'rgb(19, 87, 36)');
  await page.mouse.up();
  const paragraphs = surface.locator('.site-block-style-paragraph');
  await expect(paragraphs.nth(0)).toHaveCSS('text-indent', '0px');
  await expect(paragraphs.nth(1)).toHaveCSS('text-indent', '24px');
  await specimen.getByRole('button', { name: 'Indent all paragraphs', exact: true }).click();
  await expect(paragraphs.nth(0)).toHaveCSS('text-indent', '24px');
  await expect(paragraphs.nth(1)).toHaveCSS('text-indent', '24px');
  await specimen.getByRole('button', { name: 'Reset example', exact: true }).click();
  await specimen.getByText('Compare authored styles', { exact: true }).click();
  await expect(specimen.getByRole('button', { name: 'Indent all paragraphs', exact: true })).toHaveAttribute('aria-pressed', 'false');
  await expect(paragraphs.nth(0)).toHaveCSS('text-indent', '0px');
});
