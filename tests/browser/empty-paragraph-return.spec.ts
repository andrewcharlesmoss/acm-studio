import { expect, test } from '@playwright/test';

test('repeated Return in an empty Paragraph does not repeat placeholder labels', async ({ page }) => {
  await page.goto('/studio/ui/blocks/paragraph');
  const editor = page.locator('.ui-block-editable .paragraph-field').first();
  await expect(editor).toBeVisible();

  await editor.click();
  await page.keyboard.press('ControlOrMeta+A');
  await page.keyboard.press('Backspace');
  await expect(editor).not.toHaveAttribute('data-placeholder', 'Paragraph');
  await expect(page.locator('.ui-block-editable .paragraph-field')).toHaveCount(1);

  for (let press = 0; press < 5; press += 1) {
    await page.keyboard.press('Enter');
    await expect(page.locator('.ui-block-editable .paragraph-field')).toHaveCount(press + 2);
  }
});

test('template Library keeps Return, boundary arrows and immediate splitting in one shared editing flow', async ({ page }) => {
  await page.goto('/studio/ui/selection/template');
  const editor = page.locator('[data-studio-block-id="template-drag-source"]');
  await expect(editor).toBeVisible();
  await editor.click();
  await page.keyboard.press('ControlOrMeta+A');
  await page.keyboard.type('Alpha');
  await page.keyboard.press('Enter');
  await page.keyboard.press('Enter');
  await page.keyboard.press('Enter');
  const textEditors = page.locator('.rich-text-editor');
  await expect(textEditors.nth(1)).toHaveText('');
  await expect(textEditors.nth(2)).toHaveText('');
  await expect(textEditors.nth(3)).toBeFocused();
  await page.keyboard.press('ArrowUp');
  await expect(textEditors.nth(2)).toBeFocused();
  await page.keyboard.press('ArrowUp');
  await expect(textEditors.nth(1)).toBeFocused();
  await page.keyboard.press('Backspace');
  await expect(editor).toBeFocused();
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('Enter');
  await expect(editor).toHaveText('Alp');
  await expect(textEditors.nth(1)).toHaveText('ha');
});

