import { expect, test } from '@playwright/test';

test('content-fitting preview resizes from both edges and cancels a drag', async ({ page }) => {
  await page.goto('/studio/ui/controls/preview-frame');
  const example = page.getByRole('region', { name: 'Content-fitting preview example' });
  const left = example.getByRole('separator', { name: 'Resize template preview from left edge' });
  const right = example.getByRole('separator', { name: 'Resize template preview from right edge' });
  await expect(left).toHaveAttribute('aria-valuenow', '640');
  await left.hover(); await expect(left).toHaveCSS('cursor', 'ew-resize');
  await right.hover(); await expect(right).toHaveCSS('cursor', 'ew-resize');
  await expect(async () => {
    await right.focus(); await page.keyboard.press('ArrowLeft');
    await expect(right).toHaveAttribute('aria-valuenow', '630', { timeout: 1000 });
  }).toPass({ timeout: 20000 });
  await left.focus(); await page.keyboard.press('ArrowLeft');
  await expect(left).toHaveAttribute('aria-valuenow', '640');
  await right.scrollIntoViewIfNeeded();
  const box = (await right.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down(); await page.mouse.move(box.x + box.width / 2 + 20, box.y + box.height / 2);
  await expect(right).toHaveCSS('cursor', 'ew-resize');
  await expect(right).toHaveAttribute('aria-valuenow', '680');
  await page.keyboard.press('Escape'); await page.mouse.up();
  await expect(right).toHaveAttribute('aria-valuenow', '640');
  await right.focus(); await page.keyboard.press('ArrowRight');
  await expect(right).toHaveAttribute('aria-valuenow', '650');
  await example.getByRole('button', { name: 'Reset Example' }).click();
  await expect(right).toHaveAttribute('aria-valuenow', '640');
});
