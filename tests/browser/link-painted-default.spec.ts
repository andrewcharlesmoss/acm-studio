import { test, expect } from '@playwright/test';

test('Link swatch and warning agree with painted default without marking it inherited', async ({ page }) => {
  await page.setViewportSize({ width: 1900, height: 1100 });
  await page.goto('/studio/ui/blocks/paragraph');
  await expect(page.locator('.ui-block-specimen')).toHaveAttribute('data-ready', 'true');
  const block = page.getByRole('complementary', { name: 'Paragraph Local Styles', exact: true });
  await block.getByRole('button', { name: 'Elements options' }).click();
  await page.getByRole('group', { name: 'Elements controls' }).getByRole('button', { name: 'Link', exact: true }).click();
  await page.keyboard.press('Escape');
  const row = block.getByRole('button', { name: /^Choose Link/ });
  // A painted default can come from a theme or CSS without explicit provenance.
  await page.locator('.ui-block-canvas').evaluate(canvas => {
    const rule = document.createElement('style');
    rule.textContent = '.ui-block-canvas .rich-text-editor a { color: #f6cff4 !important; }';
    canvas.append(rule);
    canvas.querySelector<HTMLElement>('.rich-text-editor a')?.style.setProperty('--studio-paragraph-link-hover-color', '#ffee58');
  });
  await expect(page.locator('.ui-block-canvas .rich-text-editor a').first()).toHaveCSS('color', 'rgb(246, 207, 244)');
  await expect(row.locator('.studio-colour-value-swatch').first()).toHaveCSS('background-image', /246, 207, 244/);
  await expect(row.locator('.studio-colour-value-swatch').last()).toHaveCSS('background-image', /255, 238, 88/);
  await expect(row.locator('.paragraph-palette-warning-icon')).toBeVisible();
  await expect(row.locator('.studio-inherited-indicator')).toHaveCount(0);
  await row.click();
  const picker = page.getByRole('dialog', { name: 'Link colour palette' });
  await expect(picker.locator('.paragraph-colour-preview')).toHaveCSS('background-image', /246, 207, 244/);
  await expect(picker.getByText('This color has poor contrast against the background. Consider increasing contrast.')).toBeVisible();
  await expect(picker.getByRole('button', { name: 'Clear', exact: true })).toHaveCount(0);
  await picker.getByRole('button', { name: 'Hover', exact: true }).click();
  await expect(picker.locator('.paragraph-colour-preview')).toHaveCSS('background-image', /255, 238, 88/);
  await expect(picker.getByText('This color has poor contrast against the background. Consider increasing contrast.')).toBeVisible();
  await expect(picker.getByRole('button', { name: 'Clear', exact: true })).toHaveCount(0);
});
