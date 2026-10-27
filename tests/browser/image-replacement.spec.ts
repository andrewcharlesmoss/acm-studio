import { expect, test } from '@playwright/test';

test('replacing a Library image updates its caption without stale formatting and is undoable', async ({ page }) => {
  await page.goto('/studio/ui/blocks/image');
  const specimen = page.getByRole('region', { name: 'Editable specimen' });
  await expect(specimen).toHaveAttribute('data-ready', 'true');
  const choose = specimen.getByRole('button', { name: 'Choose from files' });
  await choose.click();
  const caption = specimen.getByRole('textbox', { name: 'Image caption' });
  await expect(caption).toHaveText('A local flower sample');
  await caption.evaluate(element => {
    const text = element.firstChild;
    if (!text) throw new Error('Caption text is missing');
    const range = document.createRange();
    range.setStart(text, 2); range.setEnd(text, 14);
    const selection = window.getSelection(); selection?.removeAllRanges(); selection?.addRange(range);
    element.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
  });
  await specimen.getByRole('button', { name: 'Bold selected text' }).click();
  await expect(caption.locator('strong')).toHaveText('local flower');
  await choose.click();
  await expect(caption).toHaveText('A local landscape sample');
  await expect(caption.locator('strong')).toHaveCount(0);
  await specimen.getByRole('button', { name: 'Undo specimen change' }).click();
  await expect(caption).toHaveText('A local flower sample');
  await expect(caption.locator('strong')).toHaveText('local flower');
  await specimen.getByRole('button', { name: 'Redo specimen change' }).click();
  await expect(caption).toHaveText('A local landscape sample');
});
