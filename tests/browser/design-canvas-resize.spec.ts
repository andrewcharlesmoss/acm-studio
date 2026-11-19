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

async function seedDesign(page: Page, allPages = false) {
  const fixture = allPages ? { ...project, pages: [
    ...project.pages, { ...project.pages[0], id: 'page-next', name: 'Next page', objects: [] },
  ] } : project;
  await page.addInitScript(value => localStorage.setItem('acm-studio-designs-v1', JSON.stringify([value])), fixture);
  await page.goto('/studio/designs');
  await expect(page.locator('.design-canvas-area .design-page-svg')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Undo', exact: true })).toBeDisabled();
}

async function measuredSize(page: Page, target: 'object' | 'page') {
  if (target === 'page') {
    return page.locator('.design-canvas-area .design-page-svg').first().getAttribute('viewBox').then(value => value!.split(' ').slice(2).map(Number));
  }
  const shape = page.locator('.design-object[data-object-id="shape-resize-regression"] > rect').first();
  return Promise.all(['width', 'height'].map(async name => Number(await shape.getAttribute(name))));
}

async function resize(page: Page, target: 'object' | 'page', corner = 'bottom right', delta = 42) {
  if (target === 'object') await page.locator('.design-object[data-object-id="shape-resize-regression"]').click();
  const handle = page.getByRole('button', { name: `Resize ${target === 'object' ? 'selected object' : 'page'} from ${corner}` });
  await expect(handle).toBeVisible();
  const box = (await handle.boundingBox())!;
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  const before = await measuredSize(page, target);
  const undoWasDisabled = await page.getByRole('button', { name: 'Undo', exact: true }).isDisabled();
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + delta, y + delta, { steps: 8 });
  await expect.poll(() => measuredSize(page, target)).not.toEqual(before);
  return { handle, before, displayed: await measuredSize(page, target), undoWasDisabled, dragEnd: { x: x + delta, y: y + delta } };
}

for (const allPages of [false, true]) {
  test(`Design Canvas retains the page placement on release in ${allPages ? 'All Pages' : 'single-page view'}`, async ({ page }) => {
    await seedDesign(page, allPages);
    if (allPages) {
      await page.getByRole('tab', { name: 'View', exact: true }).click();
      await page.getByRole('button', { name: 'All pages', exact: true }).click();
      await page.getByRole('tab', { name: 'Home', exact: true }).click();
    }
    const canvas = page.locator('.design-canvas-area .design-page-svg').first();
    const before = (await canvas.boundingBox())!;
    const { displayed } = allPages
      ? await resize(page, 'page', 'top left', -30)
      : await resize(page, 'page');
    const during = (await canvas.boundingBox())!;
    if (allPages) {
      expect(Math.abs(during.y + during.height - (before.y + before.height))).toBeLessThan(1);
    } else {
      expect(during.x).toBeCloseTo(before.x, 0);
      expect(during.y).toBeCloseTo(before.y, 0);
    }
    await page.mouse.up();
    await expect.poll(() => canvas.boundingBox()).toEqual(during);
    await expect.poll(() => measuredSize(page, 'page')).toEqual(displayed);
    if (allPages) {
      const next = (await page.locator('.design-all-page-heading').nth(1).boundingBox())!;
      expect(next.y).toBeGreaterThan(during.y + during.height);
    }
    await page.getByRole('button', { name: 'Undo', exact: true }).click();
    await expect.poll(() => canvas.boundingBox()).toEqual(before);
    await page.getByRole('button', { name: 'Redo', exact: true }).click();
    await expect.poll(() => canvas.boundingBox()).toEqual(during);
    if (!allPages) {
      await page.getByRole('button', { name: 'Resize page from left middle' }).press('Shift+ArrowLeft');
      await expect.poll(() => measuredSize(page, 'page')).toEqual([displayed[0] + 10, displayed[1]]);
      const keyboardResize = (await canvas.boundingBox())!;
      expect(Math.abs(keyboardResize.x + keyboardResize.width - (during.x + during.width))).toBeLessThan(1);
    }
  });
}

test('Design Canvas keeps the opposite edge anchored as the page grows beyond the viewport at 100% zoom', async ({ page }) => {
  await seedDesign(page);
  await page.getByRole('tab', { name: 'View', exact: true }).click();
  await page.getByRole('combobox', { name: 'Zoom', exact: true }).selectOption('100');
  const canvas = page.locator('.design-canvas-area .design-page-svg');
  await expect.poll(async () => (await canvas.boundingBox())?.width).toBe(600);
  const before = (await canvas.boundingBox())!;
  const handle = (await page.getByRole('button', { name: 'Resize page from left middle' }).boundingBox())!;
  const x = handle.x + handle.width / 2;
  const y = handle.y + handle.height / 2;
  await page.keyboard.down('Shift');
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x - 240, y, { steps: 8 });
  await expect.poll(() => measuredSize(page, 'page')).toEqual([840, 400]);
  const during = (await canvas.boundingBox())!;
  expect(during.width).toBe(840);
  expect(Math.abs(during.x + during.width - (before.x + before.width))).toBeLessThan(1);
  await page.mouse.up();
  await page.keyboard.up('Shift');
  await expect.poll(() => canvas.boundingBox()).toEqual(during);
});

test('Design Canvas side handles change one dimension without Shift', async ({ page }) => {
  await seedDesign(page);
  await page.locator('.design-object[data-object-id="shape-resize-regression"]').click();
  const handle = page.getByRole('button', { name: 'Resize selected object from right middle' });
  const box = (await handle.boundingBox())!;
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 40, y, { steps: 5 });
  await page.mouse.up();
  await expect.poll(() => measuredSize(page, 'object')).not.toEqual([160, 100]);
  const resized = await measuredSize(page, 'object');
  expect(resized[0]).toBeGreaterThan(160);
  expect(resized[1]).toBe(100);
});

test('Resize handles Library side controls resize one axis, with Shift locking proportions', async ({ page }) => {
  await page.goto('/studio/ui/controls#resize-handles');
  const example = page.getByRole('group', { name: 'Resize handles example' });
  const status = example.getByRole('status');
  const handle = example.getByRole('button', { name: 'Resize example from right middle' });
  await expect(status).toContainText('Size: 160.00 × 160.00');
  await handle.focus();
  await page.keyboard.press('ArrowRight');
  await expect(status).toContainText('Size: 161.00 × 160.00');
  await page.keyboard.press('Shift+ArrowRight');
  await expect(status).toContainText('Size: 171.00 × 169.94');
});

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
    if (target === 'page') await svg.dispatchEvent('pointerup', { pointerId: 2 });
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
