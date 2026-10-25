import { expect, test } from '@playwright/test';

test('empty fixture settings share Gutenberg presentation in Edit and Preview', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1000 });
  await page.goto('/studio/ui/controls#block-style-panels');
  const panels = page.getByRole('group', { name: 'Block Styles panes example', exact: true });
  await expect(panels).toHaveAttribute('data-ready', 'true');
  await panels.getByText('Compare website presentation', { exact: true }).click();
  const surface = page.getByLabel('Fixture website presentation', { exact: true });
  await page.evaluate(() => document.fonts.ready);
  for (const mode of ['preview', 'edit']) {
    await panels.getByLabel('Website example mode').selectOption(mode);
    await expect(surface).toHaveCSS('width', '693px');
    const heading = surface.locator('.heading-field.is-h1').first();
    await expect(heading).toHaveCSS('font-family', '"TT5 Manrope", sans-serif');
    await expect(heading).toHaveCSS('font-size', '48px');
    await expect(heading).toHaveCSS('font-weight', '400');
    await expect(heading).toHaveCSS('padding-bottom', '0px');
    await expect(surface.locator('.paragraph-field').first()).toHaveCSS('font-size', '22px');
    await expect(surface.locator('.quote-field .paragraph-field')).toHaveCSS('font-style', 'normal');
    await expect(surface.locator('.quote-field')).toHaveCSS('border-left-width', '2px');
    await expect(surface.locator('.quote-field')).toHaveCSS('padding', '20px 30px');
    await expect(surface.locator('.quote-field > .quote-citation')).toHaveCSS('margin-top', '20px');
    await expect(surface.locator('.image-field img')).toHaveCSS('width', '645px');
    await expect(surface.locator('.image-field figcaption')).toHaveCSS('text-align', 'left');
    await expect(surface.locator('.image-field figcaption')).toHaveCSS('font-size', '14px');
    await expect(surface.locator('.content-button.is-primary')).toHaveCSS('border-radius', '999px');
    await expect(surface.locator('.content-button.is-primary')).toHaveCSS('font-weight', '300');
    await expect(surface.locator('.content-button.is-primary')).toHaveCSS('color', 'rgb(255, 255, 255)');
    await expect(surface.locator('.content-button.is-secondary')).toHaveCSS('color', 'rgb(17, 17, 17)');
    await expect(surface.locator('.content-button.is-secondary')).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
    await expect(surface.locator('.content-button.is-secondary')).toHaveCSS('border-width', '1px');
    await expect(surface.locator('table')).toHaveCSS('font-size', '22px');
    for (const code of await surface.locator('.studio-code-preview,.code-editor-shell,.code-input').all()) await expect(code).toHaveCSS('border-radius', '0px');
    await surface.screenshot({ path: `/private/tmp/sample-appearance-reference-${mode}.png` });
  }
});

test('fixture reference defaults yield to saved and authored device/interaction values', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1000 });
  await page.goto('/studio/ui/controls#block-style-panels');
  const panels = page.getByRole('group', { name: 'Block Styles panes example', exact: true });
  await expect(panels).toHaveAttribute('data-ready', 'true');
  await panels.getByText('Compare website presentation', { exact: true }).click();
  await panels.getByLabel('Authored overrides', { exact: true }).check();
  const surface = page.getByLabel('Fixture website presentation', { exact: true });
  for (const mode of ['preview', 'edit']) {
    await panels.getByLabel('Website example mode').selectOption(mode);
    await panels.getByLabel('Website example width').selectOption('900');
    await expect(surface.locator('.heading-field').first()).toHaveCSS('font-size', '37px');
    await expect(surface.locator('.heading-field.is-h2')).toHaveCSS('font-size', '32px');
    await expect(surface.locator('.heading-field').first()).toHaveCSS('color', 'rgb(19, 87, 36)');
    await expect(surface.locator('.paragraph-field').first()).toHaveCSS('font-size', '20px');
    await expect(surface.locator('.image-field img')).toHaveCSS('width', '320px');
    for (const code of await surface.locator('.studio-code-preview,.code-editor-shell,.code-input').all()) await expect(code).toHaveCSS('border-radius', '12px');
    const button = surface.locator('.content-button.is-primary');
    await expect(button).toHaveCSS('border-radius', '12px');
    await button.hover();
    await expect(button).toHaveCSS('border-radius', '18px');
    await expect(button).toHaveCSS('color', 'rgb(171, 205, 239)');
    await page.mouse.move(0, 0);
    await panels.getByLabel('Website example width').selectOption('390');
    await expect(surface.locator('.heading-field').first()).toHaveCSS('font-size', '29px');
    await expect(surface.locator('.heading-field.is-h2')).toHaveCSS('font-size', '29px');
  }
  await panels.getByRole('button', { name: 'Reset website example' }).click();
  await expect(panels.getByLabel('Authored overrides', { exact: true })).not.toBeChecked();
  await expect(panels.getByLabel('Website example mode')).toHaveValue('preview');
});

test('saved Button role sizes and gutter choices retain their meaning with the fixture baseline', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1000 });
  await page.goto('/studio/ui/controls#block-style-panels');
  const panels = page.getByRole('group', { name: 'Block Styles panes example', exact: true });
  await expect(panels).toHaveAttribute('data-ready', 'true');
  await panels.getByText('Compare website presentation', { exact: true }).click();
  const surface = page.getByLabel('Fixture website presentation', { exact: true });
  for (const mode of ['preview', 'edit']) {
    await panels.getByLabel('Website example mode').selectOption(mode);
    await panels.getByLabel('Authored overrides', { exact: true }).uncheck();
    await panels.getByLabel('Button typography example').selectOption('custom');
    await expect(surface.locator('.content-button.is-primary')).toHaveCSS('font-size', '24px');
    await panels.getByLabel('Button typography example').selectOption('preset');
    await expect(surface.locator('.content-button.is-primary')).toHaveCSS('font-size', '22px');
    await panels.getByLabel('Authored overrides', { exact: true }).check();
    await expect(surface.locator('.content-button.is-primary')).toHaveCSS('font-size', '26px');
    await panels.getByLabel('Authored overrides', { exact: true }).uncheck();
    for (const padding of ['10px', '40px']) {
      await panels.getByLabel('Website gutter example').selectOption(padding);
      await expect(surface).toHaveCSS('width', `${645 + 2 * parseFloat(padding)}px`);
      await expect(surface.locator('.image-field img')).toHaveCSS('width', '645px');
    }
    await panels.getByLabel('Text style example').selectOption('italic');
    await expect(surface.locator('.quote-field .paragraph-field')).toHaveCSS('font-style', 'italic');
    await panels.getByLabel('Authored overrides', { exact: true }).check();
    await expect(surface.locator('.quote-field .paragraph-field')).toHaveCSS('font-style', 'normal');
    await panels.getByLabel('Text style example').selectOption('default');
  }
});

test('hosted home preview uses the frame width without editor canvas gutters', async ({ page }) => {
  await page.goto('/studio?site=test&siteEditorHome=1');
  await expect(page.locator('.studio-hosted-home-editor.is-home-preview')).toBeVisible();
  for (const width of [390, 820, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    const surface = page.locator('.document-preview .test-site-page');
    await expect(surface).toHaveCSS('width', `${Math.min(width, 693)}px`);
    await expect(page.locator('.document-preview')).toHaveCSS('padding-left', '0px');
    await expect(page.locator('.editor-canvas-scroll')).toHaveCSS('padding-left', '0px');
    await expect(surface.locator('.image-field img')).toHaveCSS('width', `${Math.min(width, 693) - 48}px`);
    await expect(page.locator('.studio-workspace > .block-editor')).toHaveCSS('border-right-width', '0px');
    if (width === 390) await page.screenshot({ path: '/private/tmp/sample-appearance-hosted-mobile.png' });
  }
});
