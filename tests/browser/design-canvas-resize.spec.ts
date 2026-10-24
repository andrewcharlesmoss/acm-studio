import { expect, test, type Page } from '@playwright/test';

const timestamp = '2026-10-24T00:00:00.000Z';
const project = {
  format: 'acm-studio-design', version: 1, id: 'design-resize-regression', name: 'Resize regression',
  createdAt: timestamp, updatedAt: timestamp, activePageId: 'page-resize-regression', assets: [],
  pages: [{
    id: 'page-resize-regression', name: 'Page 1', width: 600, height: 400,
    background: { kind: 'solid', colour: '#ffffff' },
    objects: [{ id: 'shape-resize-regression', type: 'rectangle', shape: 'rectangle', x: 180, y: 130, width: 160, height: 100, rotation: 0, opacity: 1, fill: '#e0e7ff', stroke: '#3858e9', strokeWidth: 1 }],
  }],
};

async function seedDesign(page: Page) {
  await page.addInitScript(value => localStorage.setItem('acm-studio-designs-v1', JSON.stringify([value])), project);
  await page.goto('/studio/designs');
  await expect(page.locator('.design-canvas-area .design-page-svg')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Undo', exact: true })).toBeDisabled();
}

async function measuredSize(page: Page, target: 'object' | 'page') {
  if (target === 'page') {
    return page.locator('.design-canvas-area .design-page-svg').getAttribute('viewBox').then(value => value!.split(' ').slice(2).map(Number));
  }
  const shape = page.locator('.design-object[data-object-id="shape-resize-regression"] > rect').first();
  return Promise.all(['width', 'height'].map(async name => Number(await shape.getAttribute(name))));
}

async function resize(page: Page, target: 'object' | 'page') {
  if (target === 'object') await page.locator('.design-object[data-object-id="shape-resize-regression"]').click();
  const handle = page.getByRole('button', { name: target === 'object' ? 'Resize selected object from bottom right' : 'Resize page from bottom right' });
  await expect(handle).toBeVisible();
  const box = (await handle.boundingBox())!;
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  const before = await measuredSize(page, target);
  const undoWasDisabled = await page.getByRole('button', { name: 'Undo', exact: true }).isDisabled();
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 42, y + 42, { steps: 8 });
  await expect.poll(() => measuredSize(page, target)).not.toEqual(before);
  return { handle, before, displayed: await measuredSize(page, target), undoWasDisabled, dragEnd: { x: x + 42, y: y + 42 } };
}

for (const target of ['object', 'page'] as const) {
  test(`Design Canvas ${target} resize retains its size after pointer capture loss`, async ({ page }) => {
    await seedDesign(page);
    const { before, displayed } = await resize(page, target);
    const svg = page.locator('.design-canvas-area .design-page-svg');
    await expect.poll(() => svg.evaluate(element => element.hasPointerCapture(1))).toBe(true);
    await svg.evaluate(element => element.releasePointerCapture(1));
    await page.mouse.move(0, 0);
    await page.mouse.up();
    await expect.poll(() => measuredSize(page, target)).toEqual(displayed);
    await expect(page.getByRole('button', { name: 'Undo', exact: true })).toBeEnabled();
    await page.getByRole('button', { name: 'Undo', exact: true }).click();
    await expect.poll(() => measuredSize(page, target)).toEqual(before);
  });

  for (const ending of ['escape', 'pointer-cancel'] as const) {
    test(`Design Canvas ${target} resize restores its original size on ${ending}`, async ({ page }) => {
      await seedDesign(page);
      const { handle, before, undoWasDisabled } = await resize(page, target);
      if (ending === 'escape') {
        await page.keyboard.press('Escape');
        await expect(handle).toBeFocused();
        await expect.poll(() => page.locator('.design-canvas-area .design-page-svg').evaluate(element => element.hasPointerCapture(1))).toBe(false);
      } else await page.locator('.design-canvas-area .design-page-svg').dispatchEvent('pointercancel', { pointerId: 1 });
      await page.mouse.up();
      await expect.poll(() => measuredSize(page, target)).toEqual(before);
      if (undoWasDisabled) await expect(page.getByRole('button', { name: 'Undo', exact: true })).toBeDisabled();
      else await expect(page.getByRole('button', { name: 'Undo', exact: true })).toBeEnabled();
      await expect(handle).toBeVisible();
    });
  }

  test(`Design Canvas ${target} resize ignores cancellation from another pointer`, async ({ page }) => {
    await seedDesign(page);
    const { displayed, dragEnd } = await resize(page, target);
    const svg = page.locator('.design-canvas-area .design-page-svg');
    await svg.dispatchEvent('pointercancel', { pointerId: 2 });
    await expect.poll(() => measuredSize(page, target)).toEqual(displayed);
    await expect.poll(() => svg.evaluate(element => element.hasPointerCapture(1))).toBe(true);
    await page.mouse.move(dragEnd.x + 10, dragEnd.y + 10, { steps: 2 });
    await expect.poll(() => measuredSize(page, target)).not.toEqual(displayed);
    const latest = await measuredSize(page, target);
    await svg.evaluate(element => element.releasePointerCapture(1));
    await page.mouse.move(0, 0);
    await page.mouse.up();
    await expect.poll(() => measuredSize(page, target)).toEqual(latest);
    await expect(page.getByRole('button', { name: 'Undo', exact: true })).toBeEnabled();
  });
}
