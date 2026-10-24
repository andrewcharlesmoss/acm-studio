import { expect, test } from '@playwright/test';

for (const target of ['shape', 'image', 'page', 'workspace']) {
  test(`${target} keeps its displayed resize when pointer capture ends before pointer-up`, async ({ page }) => {
    await page.goto(target === 'workspace' ? '/studio/ui/workspace#object-manipulation-playground' : '/studio/ui/controls#resize-handles');
    const specimen = page.getByRole('group', { name: target === 'workspace' ? 'Object manipulation example' : 'Resize handles example', exact: true });
    // Wait for a real React response rather than acting on the pre-hydration select.
    const initialHandle = specimen.getByRole('button', { name: 'Resize example from bottom right' });
    await expect(async () => {
      await specimen.getByLabel('Read-only example').press('Space');
      await expect(initialHandle).toHaveAttribute('aria-disabled', 'true', { timeout: 400 });
    }).toPass();
    await specimen.getByLabel('Read-only example').press('Space');
    await expect(initialHandle).not.toHaveAttribute('aria-disabled', 'true');
    if (target !== 'workspace') await specimen.getByLabel('Resize example target').selectOption(target === 'shape' ? 'rectangle' : target);
    const handle = specimen.getByRole('button', { name: target === 'page' ? 'Resize page from bottom right' : 'Resize example from bottom right' });
    await handle.scrollIntoViewIfNeeded();
    const start = await handle.boundingBox();
    expect(start).not.toBeNull();
    const x = start!.x + start!.width / 2;
    const y = start!.y + start!.height / 2;
    const status = specimen.getByRole('status');
    const before = (await status.innerText()).split(' · History position')[0];
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x + 45, y + 45, { steps: 8 });
    await expect(status).not.toContainText(before);
    const displayed = (await status.innerText()).split(' · History position')[0];
    const canvas = specimen.locator('svg[tabindex="-1"]');
    await expect.poll(() => canvas.evaluate(el => el.hasPointerCapture(1))).toBe(true);
    await canvas.evaluate(el => el.releasePointerCapture(1));
    await expect(status).toContainText(displayed);
    await page.mouse.up();
    await expect(status).toContainText(displayed);
    await specimen.getByRole('button', { name: 'Undo', exact: true }).click();
    await expect(status).toContainText(before);
    await expect(specimen.getByRole('button', { name: 'Undo', exact: true })).toBeDisabled();

    for (const ending of ['escape', 'cancel', 'release']) {
      await handle.scrollIntoViewIfNeeded();
      const box = (await handle.boundingBox())!;
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width / 2 + 30, box.y + box.height / 2 + 30, { steps: 5 });
      await expect(status).not.toContainText(before);
      const resized = (await status.innerText()).split(' · History position')[0];
      if (ending === 'escape') await page.keyboard.press('Escape');
      if (ending === 'cancel') await canvas.dispatchEvent('pointercancel', { pointerId: 1 });
      await page.mouse.up();
      await expect(status).toContainText(ending === 'release' ? resized : before);
    }
  });
}
