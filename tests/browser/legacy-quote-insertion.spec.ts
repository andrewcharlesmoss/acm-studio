import { expect, test } from '@playwright/test';

for (const [type, body, citation] of [
  ['quote', 'A legacy quote remains editable.', 'Legacy content'],
  ['pullquote', 'A useful idea deserves a little space.', 'A Studio reader'],
]) test(`${type} Library appender preserves legacy text and supports Undo`, async ({ page }) => {
  await page.goto(`/studio/ui/blocks/${type}`);
  const quote = page.locator('.ui-block-canvas .quote-field').filter({ hasText: body }).first();
  await expect(quote).toBeVisible();
  await quote.click({ position: { x: 3, y: 3 } });
  const appender = quote.locator('.nested-end-inserter');
  await appender.scrollIntoViewIfNeeded();
  await appender.focus();
  await page.keyboard.press('Enter');
  await page.getByRole('dialog', { name: 'Choose a block' }).getByRole('button', { name: 'Paragraph', exact: true }).click();
  await expect(quote).toContainText(body);
  await expect(quote).toContainText(citation);
  await expect(quote.locator('.quote-body-block')).toHaveCount(2);
  await page.getByRole('button', { name: 'Undo specimen change', exact: true }).click();
  await expect(quote).toContainText(body);
  await expect(quote).toContainText(citation);
  await expect(quote.locator('.quote-body-block')).toHaveCount(1);
});
