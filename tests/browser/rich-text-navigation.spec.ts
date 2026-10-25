import { expect, test } from '@playwright/test';

test('vertical arrows cross between consecutive text blocks at their caret edges', async ({ page }) => {
  await page.goto('/studio?site=test');
  const paragraphs = page.locator('.rich-text-editor.paragraph-field[data-studio-block-id]');
  await expect(paragraphs.nth(1)).toBeVisible();

  const firstId = await paragraphs.nth(0).getAttribute('data-studio-block-id');
  const secondId = await paragraphs.nth(1).getAttribute('data-studio-block-id');
  expect(firstId).toBeTruthy();
  expect(secondId).toBeTruthy();

  await paragraphs.nth(0).evaluate(editor => {
    editor.focus();
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(editor);
    range.collapse(false);
    selection?.removeAllRanges();
    selection?.addRange(range);
  });
  await page.keyboard.press('ArrowDown');
  await expect.poll(() => page.evaluate(() => (document.activeElement as HTMLElement | null)?.dataset.studioBlockId)).toBe(secondId);

  await paragraphs.nth(1).evaluate(editor => {
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(editor);
    range.collapse(true);
    selection?.removeAllRanges();
    selection?.addRange(range);
  });
  await page.keyboard.press('ArrowUp');
  await expect.poll(() => page.evaluate(() => (document.activeElement as HTMLElement | null)?.dataset.studioBlockId)).toBe(firstId);
});

test('vertical arrows enter adjacent empty paragraph placeholders', async ({ page }) => {
  await page.goto('/studio?site=test');
  const paragraphs = page.locator('.rich-text-editor.paragraph-field[data-studio-block-id]');
  await expect(paragraphs.nth(1)).toBeVisible();
  const firstId = await paragraphs.nth(0).getAttribute('data-studio-block-id');
  const secondId = await paragraphs.nth(1).getAttribute('data-studio-block-id');

  await paragraphs.nth(0).evaluate(editor => {
    editor.innerHTML = '';
    editor.focus();
    const selection = window.getSelection();
    const range = document.createRange();
    range.setStart(editor, 0);
    range.collapse(true);
    selection?.removeAllRanges();
    selection?.addRange(range);
  });
  await paragraphs.nth(1).evaluate(editor => { editor.innerHTML = ''; });
  await page.keyboard.press('ArrowDown');
  await expect.poll(() => page.evaluate(() => (document.activeElement as HTMLElement | null)?.dataset.studioBlockId)).toBe(secondId);

  await page.keyboard.press('ArrowUp');
  await expect.poll(() => page.evaluate(() => (document.activeElement as HTMLElement | null)?.dataset.studioBlockId)).toBe(firstId);
});

test('explicitly focused template wrappers enter their first editable descendant', async ({ page }) => {
  await page.goto('/studio/ui/selection/template');
  const text = page.locator('[data-studio-block-id="template-drag-source"]');
  await expect(text).toBeVisible();
  const frame = page.locator('[data-studio-block-anchor-id="template-drag-source"]');
  await frame.focus();
  await page.keyboard.press('ArrowDown');
  await expect(text).toBeFocused();
});
