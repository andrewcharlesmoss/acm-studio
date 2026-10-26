import { expect, test } from '@playwright/test';

test('Image Styles exposes the Large reference margin and resets it', async ({ page }) => {
  await page.goto('/studio/ui/controls#block-style-panels');
  const specimen = page.getByRole('group', { name: 'Block Styles panes example', exact: true });
  await expect(specimen).toHaveAttribute('data-ready', 'true');
  await specimen.locator('[data-block-target="image"]').click();
  const margin = specimen.getByRole('slider', { name: 'Margin Vertical amount' });
  await margin.focus();
  await page.keyboard.press('End');
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('ArrowLeft');
  await expect(margin).toHaveAttribute('aria-valuetext', 'Large');
  await specimen.getByRole('button', { name: 'Reset example', exact: true }).click();
  await expect(specimen.locator('[data-block-target="image"]')).toBeVisible();
});

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
  const editParagraphs = surface.getByLabel('Paragraph Edit comparison').locator('.site-block-style-paragraph');
  const previewParagraphs = surface.getByLabel('Paragraph Preview comparison').locator('.site-block-style-paragraph');
  for (const mode of [editParagraphs, previewParagraphs]) {
    await expect(mode.nth(0)).toHaveCSS('text-indent', '0px');
    await expect(mode.nth(1)).toHaveCSS('text-indent', '24px');
  }
  await expect(paragraphs.nth(0)).toHaveCSS('text-indent', '0px');
  await expect(paragraphs.nth(1)).toHaveCSS('text-indent', '24px');
  await specimen.getByRole('button', { name: 'Indent all paragraphs', exact: true }).click();
  await expect(paragraphs.nth(0)).toHaveCSS('text-indent', '24px');
  await expect(paragraphs.nth(1)).toHaveCSS('text-indent', '24px');
  for (const mode of [editParagraphs, previewParagraphs]) {
    await expect(mode.nth(0)).toHaveCSS('text-indent', '24px');
    await expect(mode.nth(1)).toHaveCSS('text-indent', '24px');
  }
  for (const [width, indent] of [['900', '8px'], ['640', '16px'], ['400', '24px']]) {
    await specimen.getByLabel('Comparison viewport').selectOption(width);
    for (const mode of [editParagraphs, previewParagraphs]) {
      await expect(mode.nth(0)).toHaveCSS('text-indent', indent);
      await expect(mode.nth(1)).toHaveCSS('text-indent', indent);
    }
  }
  await specimen.getByRole('button', { name: 'Reset example', exact: true }).click();
  await specimen.getByText('Compare authored styles', { exact: true }).click();
  await expect(specimen.getByRole('button', { name: 'Indent all paragraphs', exact: true })).toHaveAttribute('aria-pressed', 'false');
  await expect(paragraphs.nth(0)).toHaveCSS('text-indent', '0px');
});

test('Heading backgrounds agree in Edit and Preview and use the nearest container', async ({ page }) => {
  await page.goto('/studio/ui/controls#block-style-panels');
  const specimen = page.getByRole('group', { name: 'Block Styles panes example', exact: true });
  await expect(specimen).toHaveAttribute('data-ready', 'true');
  const chooseBackground = async (label: string, swatch: string) => {
    await specimen.getByRole('button', { name: `Choose ${label} colour`, exact: true }).click();
    const picker = page.getByRole('dialog', { name: `${label} colour palette`, exact: true });
    await picker.getByRole('tab', { name: 'Background', exact: true }).click();
    await picker.getByRole('button', { name: swatch, exact: true }).click();
    await page.keyboard.press('Escape');
  };
  await specimen.getByRole('button', { name: 'Group', exact: true }).click();
  await specimen.getByRole('button', { name: 'Elements options', exact: true }).click();
  await page.getByRole('group', { name: 'Elements controls', exact: true }).getByRole('button', { name: 'Show H2', exact: true }).click();
  await page.keyboard.press('Escape');
  await chooseBackground('H2', 'Accent 1, #FFEE58');
  await specimen.getByRole('button', { name: 'Back to Blocks', exact: true }).click();
  await specimen.getByRole('button', { name: 'Column', exact: true }).click();
  await chooseBackground('Heading', 'Accent 3, #503AA8');
  await specimen.getByText('Compare container Button inheritance', { exact: true }).click();
  const modes = ['Container Button Edit comparison', 'Container Button Preview comparison'].map(label => specimen.getByLabel(label, { exact: true }));
  for (const mode of modes) {
    await expect(mode.locator('.heading-field').filter({ hasText: /^Group heading$/ })).toHaveCSS('background-color', 'rgb(255, 238, 88)');
    await expect(mode.locator('.heading-field').filter({ hasText: /^Column heading$/ })).toHaveCSS('background-color', 'rgb(80, 58, 168)');
    await expect(mode.locator('.heading-field').filter({ hasText: /^Inner Group heading$/ })).toHaveCSS('background-color', 'rgb(255, 238, 88)');
    await expect(mode.locator('.site-block-style-heading.site-block-authored-background-color')).toHaveCSS('background-color', 'rgb(18, 52, 86)');
    await expect(mode.locator('.heading-field').filter({ hasText: /^Authored heading$/ })).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
  }
  await specimen.getByRole('button', { name: 'Back to Blocks', exact: true }).click();
  await specimen.getByRole('button', { name: 'Group', exact: true }).click();
  await specimen.getByRole('button', { name: 'Elements options', exact: true }).click();
  await page.getByRole('button', { name: 'Reset H2', exact: true }).click();
  await page.keyboard.press('Escape');
  for (const mode of modes) {
    await expect(mode.locator('.heading-field').filter({ hasText: /^Group heading$/ })).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
    await expect(mode.locator('.heading-field').filter({ hasText: /^Column heading$/ })).toHaveCSS('background-color', 'rgb(80, 58, 168)');
  }
  await specimen.getByRole('button', { name: 'Undo', exact: true }).click();
  for (const mode of modes) await expect(mode.locator('.heading-field').filter({ hasText: /^Group heading$/ })).toHaveCSS('background-color', 'rgb(255, 238, 88)');
});
