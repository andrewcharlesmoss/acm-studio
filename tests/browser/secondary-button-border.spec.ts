import { expect, test } from '@playwright/test';

test('outlined buttons inherit the saved website border width in Library Edit and Preview', async ({ page }) => {
  await page.goto('/studio/ui/blocks/buttons');
  await expect(page.locator('.ui-block-specimen')).toHaveAttribute('data-ready', 'true');

  const canvas = page.locator('.ui-block-canvas');
  await canvas.evaluate(element => element.style.setProperty('--acm-button-base-border-width', '1px'));
  const outlinedButton = canvas.locator('.content-button.is-secondary').first();
  await expect(outlinedButton).toBeVisible();
  await expect.poll(() => outlinedButton.evaluate(element => getComputedStyle(element).borderTopWidth)).toBe('1px');

  await page.getByRole('group', { name: 'Specimen view' }).getByRole('button', { name: 'Preview', exact: true }).click();
  await expect.poll(() => outlinedButton.evaluate(element => getComputedStyle(element).borderTopWidth)).toBe('1px');
});
