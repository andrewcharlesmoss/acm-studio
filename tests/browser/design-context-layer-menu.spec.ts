import { expect, test, type Page } from '@playwright/test';

const timestamp = '2026-11-04T00:00:00.000Z';
const project = {
  format: 'acm-studio-design', version: 1, id: 'design-context-layer-menu', name: 'Layer menu regression',
  createdAt: timestamp, updatedAt: timestamp, activePageId: 'page-context-layer-menu', assets: [],
  pages: [{
    id: 'page-context-layer-menu', name: 'Page 1', width: 600, height: 400,
    background: { kind: 'solid', colour: '#ffffff' },
    objects: ['back', 'second', 'middle', 'fourth', 'front'].map((id, index) => ({
      id, type: 'rectangle', shape: 'rectangle', x: 20 + index * 100, y: 80, width: 70, height: 70,
      rotation: 0, opacity: 1, fill: '#e0e7ff', stroke: '#3858e9', strokeWidth: 1,
    })),
  }],
};

async function openLayerMenu(page: Page, objectId = 'middle') {
  await page.locator(`.design-object[data-object-id="${objectId}"]`).click({ button: 'right' });
  const layer = page.getByRole('menuitem', { name: 'Layer' });
  await expect(layer).toBeVisible();
  await layer.click();
  const submenu = page.getByRole('menu', { name: 'Layer' });
  await expect(submenu).toBeVisible();
  return submenu;
}

async function seedDesign(page: Page, lockedIds: string[] = []) {
  const seeded = structuredClone(project);
  for (const object of seeded.pages[0].objects) if (lockedIds.includes(object.id)) Object.assign(object, { locked: true });
  await page.addInitScript(value => localStorage.setItem('acm-studio-designs-v1', JSON.stringify([value])), seeded);
  await page.goto('/studio/designs');
  await expect(page.locator('.design-canvas-area .design-page-svg')).toBeVisible();
}

async function objectOrder(page: Page) {
  return page.locator('.design-canvas-area .design-object[data-object-id]').evaluateAll(objects => objects.map(object => object.getAttribute('data-object-id')));
}

for (const [label, expected] of [
  ['Bring forward', ['back', 'second', 'fourth', 'middle', 'front']],
  ['Bring to front', ['back', 'second', 'fourth', 'front', 'middle']],
  ['Send backward', ['back', 'middle', 'second', 'fourth', 'front']],
  ['Send to back', ['middle', 'back', 'second', 'fourth', 'front']],
] as const) {
  test(`Design context Layer menu ${label} reorders the selected object`, async ({ page }) => {
    await seedDesign(page);
    const submenu = await openLayerMenu(page);
    await submenu.getByRole('menuitem', { name: label }).click();
    await expect.poll(() => objectOrder(page)).toEqual(expected);
    await expect(page.getByRole('menu', { name: 'Canvas actions' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Undo', exact: true })).toBeEnabled();
  });
}

test('Design context Layer menu opens from the keyboard and Show layers expands the Layers pane', async ({ page }) => {
  await seedDesign(page);
  await page.getByRole('button', { name: 'Hide Design pages and layers' }).click();
  await page.locator('.design-object[data-object-id="middle"]').click({ button: 'right' });
  const layer = page.getByRole('menuitem', { name: 'Layer' });
  await layer.focus();
  await page.keyboard.press('ArrowRight');
  const submenu = page.getByRole('menu', { name: 'Layer' });
  await expect(submenu).toBeVisible();
  await expect(submenu.getByRole('menuitem', { name: 'Bring to front' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(layer).toBeFocused();
  await layer.click();
  await submenu.getByRole('menuitem', { name: 'Show layers' }).click();
  await expect(page.getByRole('tab', { name: 'Layers' })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('button', { name: 'Hide Design pages and layers' })).toBeVisible();
});

test('Design context Layer menu disables moves at layer boundaries and for locked objects', async ({ page }) => {
  await seedDesign(page, ['middle']);
  let submenu = await openLayerMenu(page, 'back');
  await expect(submenu.getByRole('menuitem', { name: 'Send backward' })).toBeDisabled();
  await expect(submenu.getByRole('menuitem', { name: 'Send to back' })).toBeDisabled();
  await page.keyboard.press('Escape');
  await page.keyboard.press('Escape');

  submenu = await openLayerMenu(page, 'front');
  await expect(submenu.getByRole('menuitem', { name: 'Bring forward' })).toBeDisabled();
  await expect(submenu.getByRole('menuitem', { name: 'Bring to front' })).toBeDisabled();
  await page.keyboard.press('Escape');
  await page.keyboard.press('Escape');

  submenu = await openLayerMenu(page, 'middle');
  for (const label of ['Bring forward', 'Bring to front', 'Send backward', 'Send to back'])
    await expect(submenu.getByRole('menuitem', { name: label })).toBeDisabled();
  await expect(submenu.getByRole('menuitem', { name: 'Show layers' })).toBeEnabled();
});

test('Design context menu keeps Align layout and targets a right-clicked resize handle', async ({ page }) => {
  await seedDesign(page);
  await page.locator('.design-object[data-object-id="middle"]').click({ button: 'right' });
  const canvasMenu = page.getByRole('menu', { name: 'Canvas actions' });
  const menuLabels = await canvasMenu.getByRole('menuitem').allTextContents();
  expect(menuLabels.indexOf('Layer')).toBe(menuLabels.indexOf('Align to page') - 1);
  await expect(canvasMenu.getByRole('separator')).toHaveCount(2);
  await page.getByRole('menuitem', { name: 'Align to page' }).click();
  const alignMenu = page.getByRole('menu', { name: 'Align selected layer to page' });
  const topAction = alignMenu.getByRole('menuitem', { name: 'Top' });
  await expect(topAction).toBeVisible();
  await expect(topAction).toHaveCSS('display', 'block');
  await page.keyboard.press('Escape');
  await page.keyboard.press('Escape');

  await page.locator('.design-object[data-object-id="second"]').click();
  await page.locator('.design-object[data-object-id="front"]').hover();
  const handle = page.locator('.design-page-svg [aria-label="Resize selected object from bottom right"]').last();
  await expect(handle).toBeVisible();
  await handle.click({ button: 'right' });
  await page.getByRole('menuitem', { name: 'Layer' }).click();
  const layerMenu = page.getByRole('menu', { name: 'Layer' });
  await expect(layerMenu.getByRole('menuitem', { name: 'Bring to front' })).toBeDisabled();
});
