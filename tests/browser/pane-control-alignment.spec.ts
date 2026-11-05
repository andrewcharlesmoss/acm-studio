import { expect, test, type Page } from '@playwright/test';

async function checkPaneControls(page: Page, step: number) {
  expect(await page.evaluate(() => matchMedia('(pointer: coarse)').matches)).toBe(step === 44);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/studio/ui/panes#studio-navigation-workspace');
  const preview = page.getByRole('region', { name: 'Studio Navigation workspace preview' });
  const labels = ['Studio Navigation', 'Editor Navigation', 'Editor Settings'];
  const width = page.getByRole('combobox', { name: 'Example Width', exact: true });
  for (const size of ['1440', '390']) {
    await width.selectOption(size);
    for (let state = 0; state < 8; state++) {
      for (let index = 0; index < labels.length; index++) {
        const closed = Boolean(state & (1 << index));
        const change = preview.getByRole('button', { name: `${closed ? 'Hide' : 'Show'} ${labels[index]}`, exact: true });
        if (await change.isVisible()) await change.click();
      }
      const controls = await Promise.all(labels.map(async (label, index) => {
        const closed = Boolean(state & (1 << index));
        const locator = preview.getByRole('button', { name: `${closed ? 'Show' : 'Hide'} ${label}`, exact: true });
        await expect(locator).toBeVisible();
        return locator;
      }));
      const primaryClosed = Boolean(state & 2);
      const secondaryClosed = Boolean(state & 4);
      const group = primaryClosed ? (secondaryClosed ? controls : controls.slice(0, 2)) : secondaryClosed ? controls.slice(1) : [];
      if (group.length) {
        await expect.poll(async () => {
          const boxes = await Promise.all(group.map(control => control.boundingBox()));
          if (boxes.some(box => !box)) return false;
          const centres = boxes.map(box => ({ x: box!.x + box!.width / 2, y: box!.y + box!.height / 2 }));
          return centres.every((centre, index) => Math.abs(centre.x - centres[0].x) < 1 && (index === 0 || Math.abs(centre.y - centres[index - 1].y - step) < 1));
        }, { message: `Aligned controls at ${size}px, state ${state}` }).toBe(true);
        for (const control of group) {
          await control.scrollIntoViewIfNeeded();
          await expect.poll(() => control.evaluate(element => {
            const rect = element.getBoundingClientRect();
            return [rect.left + 2, rect.right - 2].every(x => { const hit = document.elementFromPoint(x, rect.top + rect.height / 2); return hit === element || element.contains(hit); });
          }), { message: `Full hit target at ${size}px, state ${state}` }).toBe(true);
        }
      }
    }
    await preview.evaluate(element => { element.scrollLeft = 100; });
    const closed = labels.map(label => preview.getByRole('button', { name: `Show ${label}`, exact: true }));
    await expect.poll(async () => {
      const boxes = await Promise.all(closed.map(control => control.boundingBox()));
      if (boxes.some(box => !box)) return false;
      return boxes.every((box, index) => Math.abs(box!.x - boxes[0]!.x) < 1 && (index === 0 || Math.abs(box!.y - boxes[index - 1]!.y - step) < 1));
    }, { message: `Aligned controls after scrolling at ${size}px` }).toBe(true);
  }
}

test('pane controls align for mouse across all collapse states', async ({ page }) => { await checkPaneControls(page, 36); });
test.describe('coarse pointer', () => {
  test.use({ hasTouch: true });
  test('pane controls align for touch across all collapse states', async ({ page }) => { await checkPaneControls(page, 44); });
});
