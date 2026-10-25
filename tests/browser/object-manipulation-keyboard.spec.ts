import { expect, test } from '@playwright/test';

test('Object manipulation arrow keys move from resize handles while Resize handles keeps arrow resizing', async ({ page }) => {
  await page.goto('/studio/ui/workspace#object-manipulation-playground');

  const playground = page.getByRole('group', { name: 'Object manipulation example' });
  const movementStatus = playground.getByRole('status');
  const movementHandle = playground.getByRole('button', { name: 'Resize example from right middle' });
  await expect(async () => {
    await playground.getByLabel('Read-only example').press('Space');
    await expect(movementHandle).toHaveAttribute('aria-disabled', 'true', { timeout: 400 });
  }).toPass();
  await playground.getByLabel('Read-only example').press('Space');
  await expect(movementHandle).not.toHaveAttribute('aria-disabled', 'true');
  await expect(movementStatus).toContainText('Position: -80.00, -80.00');
  await expect(movementHandle).toHaveAttribute('aria-describedby');
  await movementHandle.focus();
  await page.keyboard.press('ArrowRight');
  await expect(movementStatus).toContainText('Position: -79.00, -80.00');
  await expect(movementStatus).toContainText('Size: 160.00 × 160.00');
  await page.keyboard.press('Shift+ArrowDown');
  await expect(movementStatus).toContainText('Position: -79.00, -70.00');
  await expect(movementStatus).toContainText('Size: 160.00 × 160.00');
  await page.goto('/studio/ui/controls#resize-handles');
  const resizeExample = page.getByRole('group', { name: 'Object resize example' });
  const resizeStatus = resizeExample.getByRole('status');
  const resizeHandle = resizeExample.getByRole('button', { name: 'Resize example from right middle' });
  await expect(async () => {
    await resizeExample.getByLabel('Read-only example').press('Space');
    await expect(resizeHandle).toHaveAttribute('aria-disabled', 'true', { timeout: 400 });
  }).toPass();
  await resizeExample.getByLabel('Read-only example').press('Space');
  await expect(resizeHandle).not.toHaveAttribute('aria-disabled', 'true');
  await expect(resizeStatus).toContainText('Size: 160.00 × 160.00');
  await resizeHandle.focus();
  await page.keyboard.press('ArrowRight');
  await expect(resizeStatus).toContainText('Size: 161.00 × 160.00');
  await page.keyboard.press('Shift+ArrowRight');
  await expect(resizeStatus).toContainText('Size: 171.00 × 169.94');
});
