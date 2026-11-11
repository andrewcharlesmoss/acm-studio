import { expect, test } from '@playwright/test';

test('full keyboard selects keys by hover and keyboard regardless of catalogue filters', async ({ page }) => {
  await page.goto('/studio/ui/icons?collection=keyboard');
  const keyboard = page.getByRole('group', { name: 'Select a keyboard key' });
  const inspector = page.getByLabel('Keyboard Asset Inspector');
  const a = keyboard.getByRole('button', { name: 'A', exact: true });
  await expect(async () => {
    await page.mouse.move(0, 0);
    await a.hover();
    await expect(inspector.getByRole('heading', { name: 'A', exact: true })).toBeVisible({ timeout: 1000 });
  }).toPass({ timeout: 15000 });
  await page.getByLabel('Find a key').fill('brightness');
  await keyboard.getByRole('button', { name: 'Mac Tab', exact: true }).hover();
  await expect(inspector.getByRole('heading', { name: 'Mac Tab', exact: true })).toBeVisible();
  await keyboard.getByRole('button', { name: 'Return / Enter', exact: true }).click();
  await expect(inspector.getByRole('heading', { name: 'Return / Enter', exact: true })).toBeVisible();
  await a.focus();
  await expect(inspector.getByRole('heading', { name: 'A', exact: true })).toBeVisible();
  await page.keyboard.press('ArrowUp');
  await expect(inspector.getByRole('heading', { name: 'Q', exact: true })).toBeVisible();
  await page.keyboard.press('ArrowDown');
  await expect(inspector.getByRole('heading', { name: 'A', exact: true })).toBeVisible();
  await expect(a).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.press('ArrowRight');
  await expect(inspector.getByRole('heading', { name: 'S', exact: true })).toBeVisible();
  await page.getByRole('radiogroup', { name: 'Platform' }).getByRole('radio', { name: 'Windows' }).click();
  await keyboard.getByRole('button', { name: 'Backspace', exact: true }).hover();
  await expect(inspector.getByRole('heading', { name: 'Backspace', exact: true })).toBeVisible();
});


test('Return notch and backslash remain independently targetable in a narrow scrolled keyboard', async ({ page }) => {
  await page.setViewportSize({ width: 500, height: 850 });
  await page.goto('/studio/ui/icons?collection=keyboard');
  const keyboard = page.getByRole('group', { name: 'Select a keyboard key' });
  const inspector = page.getByLabel('Keyboard Asset Inspector');
  const slash = keyboard.getByRole('button', { name: /\\ \/ \|/ });
  await slash.scrollIntoViewIfNeeded();
  await slash.hover();
  await expect(inspector.getByRole('heading', { name: /\\ \/ \|/ })).toBeVisible();
  await keyboard.getByRole('button', { name: 'Return / Enter', exact: true }).click();
  await expect(inspector.getByRole('heading', { name: 'Return / Enter', exact: true })).toBeVisible();
});

test.describe('touch', () => {
  test.use({ hasTouch: true });
  test('tapping a key selects its asset', async ({ page }) => {
    await page.goto('/studio/ui/icons?collection=keyboard');
    await page.getByRole('group', { name: 'Select a keyboard key' }).getByRole('button', { name: 'A', exact: true }).tap();
    await expect(page.getByLabel('Keyboard Asset Inspector').getByRole('heading', { name: 'A', exact: true })).toBeVisible();
  });
});

test('rounded outer corners do not select a key from the surrounding case', async ({ page }) => {
  await page.goto('/studio/ui/icons?collection=keyboard');
  const keyboard = page.getByRole('group', { name: 'Select a keyboard key' });
  const inspector = page.getByLabel('Keyboard Asset Inspector');
  await expect(async () => {
    await keyboard.getByRole('button', { name: 'A', exact: true }).hover();
    await expect(inspector.getByRole('heading', { name: 'A', exact: true })).toBeVisible({ timeout: 1000 });
  }).toPass({ timeout: 15000 });
  const escape = keyboard.getByRole('button', { name: 'Mac Escape', exact: true });
  const bounds = await escape.boundingBox();
  expect(bounds).not.toBeNull();
  await page.mouse.move(bounds!.x + 1, bounds!.y + 1);
  await expect(inspector.getByRole('heading', { name: 'A', exact: true })).toBeVisible();
  await escape.hover();
  await expect(inspector.getByRole('heading', { name: 'Mac Escape', exact: true })).toBeVisible();
});
