import { expect, test } from '@playwright/test';

test('toolbar spacing preference changes editor geometry and survives reload', async ({ page }) => {
  const document = { id: 'toolbar-preference-page', kind: 'page', title: 'Toolbar preference', subtitle: '', slug: 'toolbar-preference', excerpt: '', status: 'draft', updatedAt: '2026-10-31T00:00:00.000Z', documentShellVersion: 1, tags: [], seoTitle: '', seoDescription: '', blocks: [
    { id: 'first-paragraph', type: 'paragraph', text: 'First paragraph' },
    { id: 'second-paragraph', type: 'paragraph', text: 'Second paragraph' },
    { id: 'nested-group', type: 'group', layout: 'flow', children: [{ id: 'nested-first', type: 'paragraph', text: 'Nested first' }, { id: 'nested-second', type: 'paragraph', text: 'Nested second' }, { id: 'nested-buttons', type: 'buttons', children: [{ id: 'nested-button-a', type: 'button', label: 'Nested button', url: '/', style: 'primary' }, { id: 'nested-button-b', type: 'button', label: 'Another', url: '/', style: 'primary' }] }] },
    { id: 'test-columns', type: 'columns', children: [{ id: 'column-a', type: 'column', children: [] }, { id: 'column-b', type: 'column', children: [] }] },
    { id: 'test-buttons', type: 'buttons', children: [{ id: 'button-a', type: 'button', label: 'First', url: '/', style: 'primary' }, { id: 'button-b', type: 'button', label: 'Second', url: '/', style: 'primary' }] },
  ] };
  await page.addInitScript(doc => { if (!localStorage.getItem('acm-studio-workspace-v2')) localStorage.setItem('acm-studio-workspace-v2', JSON.stringify({ version: 56, activeDocumentId: doc.id, documents: [doc], categories: [], bin: [] })); }, document);
  await page.goto('/studio');
  const second = page.locator('[data-studio-block-anchor-id="second-paragraph"]');
  await second.click();
  await expect(second).toHaveClass(/is-selected/);
  const position = () => second.evaluate(element => (element.closest('.block-position') as HTMLElement).offsetTop);
  const original = await position();
  const trigger = page.getByRole('button', { name: 'Options', exact: true });
  await trigger.click();
  await page.getByRole('menu', { name: 'Options' }).getByRole('menuitem', { name: 'Preferences' }).click();
  const dialog = page.getByRole('dialog', { name: 'Preferences' });
  const toggle = dialog.getByRole('checkbox', { name: 'Make space for block toolbar' });
  await expect(toggle).not.toBeChecked();
  await toggle.focus();
  await page.keyboard.press('Space');
  await expect(page.locator('html')).toHaveAttribute('data-studio-toolbar-spacing', 'on');
  await expect.poll(position).toBeGreaterThan(original + 30);
  await expect.poll(() => page.evaluate(() => localStorage.getItem('acm-studio-toolbar-spacing-v1'))).toBe('on');
  await page.keyboard.press('Escape');
  await expect(trigger).toBeFocused();
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-studio-toolbar-spacing', 'on');
  await trigger.click();
  await page.getByRole('menu', { name: 'Options' }).getByRole('menuitem', { name: 'Preferences' }).click();
  await expect(toggle).toBeChecked();
  await toggle.focus();
  await page.keyboard.press('Space');
  await expect(page.locator('html')).toHaveAttribute('data-studio-toolbar-spacing', 'off');
  await page.keyboard.press('Escape');
  const nested = page.locator('[data-studio-nested-block-id="nested-second"]');
  await nested.click();
  const nestedTop = () => nested.evaluate(element => (element as HTMLElement).offsetTop);
  const nestedOriginal = await nestedTop();
  await trigger.click();
  await page.getByRole('menu', { name: 'Options' }).getByRole('menuitem', { name: 'Preferences' }).click();
  await toggle.focus();
  await page.keyboard.press('Space');
  await expect.poll(nestedTop).toBeGreaterThan(nestedOriginal + 30);
  await page.keyboard.press('Escape');
  const nestedFirst = page.locator('[data-studio-nested-block-id="nested-first"]');
  await nestedFirst.click();
  const firstToolbar = nestedFirst.locator(':scope > .canvas-block-toolbar');
  await expect(firstToolbar).toBeVisible();
  await expect.poll(async () => (await firstToolbar.boundingBox())!.y - ((await second.boundingBox())!.y + (await second.boundingBox())!.height)).toBeGreaterThanOrEqual(-1);
  const preceding = page.locator('[data-studio-nested-block-id="nested-second"]');
  const nestedButton = page.locator('[data-studio-nested-block-id="nested-button-a"]');
  await nestedButton.click();
  const nestedToolbar = nestedButton.locator(':scope > .canvas-block-toolbar');
  await expect(nestedToolbar).toBeVisible();
  await expect.poll(async () => (await nestedToolbar.boundingBox())!.y - ((await preceding.boundingBox())!.y + (await preceding.boundingBox())!.height)).toBeGreaterThanOrEqual(-1);
  const columnA = page.locator('[data-studio-nested-block-id="column-a"]');
  const columnB = page.locator('[data-studio-nested-block-id="column-b"]');
  await columnA.click();
  await expect.poll(async () => Math.abs((await columnA.boundingBox())!.y - (await columnB.boundingBox())!.y)).toBeLessThanOrEqual(1);
  const buttonA = page.locator('[data-studio-nested-block-id="button-a"]');
  const buttonB = page.locator('[data-studio-nested-block-id="button-b"]');
  await buttonA.click();
  await expect.poll(async () => Math.abs((await buttonA.boundingBox())!.y - (await buttonB.boundingBox())!.y)).toBeLessThanOrEqual(1);
  await nestedButton.click();
  await trigger.click();
  await page.getByRole('menu', { name: 'Options' }).getByRole('menuitem', { name: 'Preferences' }).click();
  await toggle.focus();
  await page.keyboard.press('Space');
  await page.keyboard.press('Escape');
  await expect.poll(async () => (await nestedToolbar.boundingBox())!.y - ((await preceding.boundingBox())!.y + (await preceding.boundingBox())!.height)).toBeLessThan(0);
});

test('header specimen keeps its Preferences example temporary and resettable', async ({ page }) => {
  await page.goto('/studio/ui/workspace#application-header');
  const example = page.locator('.ui-application-header-example');
  await example.getByRole('button', { name: 'Options', exact: true }).click();
  await page.getByRole('menu', { name: 'Options' }).getByRole('menuitem', { name: 'Preferences' }).click();
  const dialog = page.getByRole('dialog', { name: 'Preferences' });
  await dialog.getByText('Make space for block toolbar').click();
  await expect.poll(() => page.evaluate(() => localStorage.getItem('acm-studio-toolbar-spacing-v1'))).toBeNull();
  await dialog.getByRole('button', { name: 'Close preferences' }).click();
  await example.getByRole('button', { name: 'Reset example' }).click();
  await example.getByRole('button', { name: 'Options', exact: true }).click();
  await page.getByRole('menu', { name: 'Options' }).getByRole('menuitem', { name: 'Preferences' }).click();
  await expect(dialog.getByRole('checkbox', { name: 'Make space for block toolbar' })).not.toBeChecked();
});

test('saved preference updates another Studio tab and template canvas', async ({ context, page }) => {
  await page.goto('/studio');
  const peer = await context.newPage();
  try {
    await peer.goto('/studio/ui/selection/template');
    await expect(peer.locator('html')).toHaveAttribute('data-studio-toolbar-spacing', 'off', { timeout: 20000 });
    const surface = peer.locator('.template-editing .template-authoring-surface').first();
    await expect(surface).toBeVisible();
    await expect(surface).toHaveCSS('--studio-selected-toolbar-gap', '0px');
    await page.bringToFront();
    await expect(page.locator('html')).toHaveAttribute('data-studio-toolbar-spacing', 'off');
    await page.getByRole('button', { name: 'Options', exact: true }).click();
    await page.getByRole('menu', { name: 'Options' }).getByRole('menuitem', { name: 'Preferences' }).click();
    const toggle = page.getByRole('dialog', { name: 'Preferences' }).getByRole('checkbox', { name: 'Make space for block toolbar' });
    await toggle.focus();
    await page.keyboard.press('Space');
    await expect(peer.locator('html')).toHaveAttribute('data-studio-toolbar-spacing', 'on');
    await expect(surface).toHaveCSS('--studio-selected-toolbar-gap', '38px');
  } finally { await peer.close(); }
});

test('Site Editor Options remains reachable at a narrow viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/studio/site-editor');
  const trigger = page.getByRole('button', { name: 'Options', exact: true });
  await expect(page.locator('html')).toHaveAttribute('data-studio-toolbar-spacing', 'off');
  await expect(trigger).toBeVisible();
  await trigger.click();
  await page.getByRole('menu', { name: 'Options' }).getByRole('menuitem', { name: 'Preferences' }).click();
  await expect(page.getByRole('dialog', { name: 'Preferences' })).toBeVisible();
});
