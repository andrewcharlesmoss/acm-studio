import { expect, test } from '@playwright/test';
import { createStudioHttpFixture } from '../helpers/studio-http-fixture.mjs';

test('Header Group chrome is anchored to the outer frame', async ({ page }, testInfo) => {
  test.setTimeout(90000);
  const fixture = await createStudioHttpFixture({ frontendURL: String(testInfo.project.use.baseURL ?? 'http://localhost:3010') });
  try {
    await page.goto(`${fixture.origin}/studio?site=test2&mode=templates&scope=global&set=studio-twenty-twenty-five-parts&target=tt5-header`);
    await page.getByRole('button', { name: 'List View', exact: true }).click();
    const list = page.getByRole('complementary', { name: 'List View' });
    await list.getByRole('button', { name: 'Group', exact: true }).first().click();
    const frame = page.locator('.canvas-block[data-header-group-proxy="true"]');
    await expect(frame).toHaveCount(1);
    const toolbar = frame.getByRole('group', { name: 'Group block tools' });
    const appender = frame.locator(':scope > .canvas-paragraph-inserter[data-group-sibling-inserter]');
    await expect(toolbar).toBeVisible();
    await expect(appender).toBeVisible();
    expect(await frame.locator('[data-header-group-proxied="true"]').evaluate(element => getComputedStyle(element, '::before').content)).toBe('none');
    await expect.poll(async () => {
      const bounds = await frame.boundingBox();
      const tools = await frame.locator(':scope > .canvas-block-toolbar').boundingBox();
      const plus = await appender.boundingBox();
      if (!bounds || !tools || !plus) return Infinity;
      return Math.max(Math.abs(tools.x - bounds.x), Math.abs(plus.x + plus.width - bounds.x - bounds.width));
    }).toBeLessThan(2);
    const drag = toolbar.getByRole('button', { name: 'Drag to reorder Group block' });
    await expect(drag).toBeEnabled();
    await drag.hover();
    const grip = await drag.boundingBox();
    expect(grip).not.toBeNull();
    await page.mouse.down();
    await expect(frame).toHaveCount(1);
    await expect(drag).toBeFocused();
    await page.mouse.move(grip!.x + grip!.width / 2 + 40, grip!.y + grip!.height / 2 + 40, { steps: 8 });
    await expect(page.locator('.block-editor.is-block-dragging')).toBeVisible();
    await expect(frame.locator(':scope > .canvas-block-toolbar')).toBeHidden();
    await page.keyboard.press('Escape');
    await page.mouse.up();
    await expect(page.locator('.block-editor.is-block-dragging')).toHaveCount(0);
    await expect(toolbar).toBeVisible();
    if (!await list.isVisible()) await page.getByRole('button', { name: 'List View', exact: true }).click();
    await list.getByRole('button', { name: 'Row', exact: true }).first().click();
    await expect(page.locator('.canvas-block[data-header-group-proxy="true"]')).toHaveCount(0);
    await list.getByRole('button', { name: 'Group', exact: true }).first().click();
    await appender.click();
    await expect(page.getByRole('searchbox', { name: 'Search blocks' })).toBeVisible();
    await page.getByRole('button', { name: 'Close block chooser', exact: true }).last().click();
    await toolbar.getByRole('button', { name: /Select parent block:/ }).click();
    await expect(page.getByRole('heading', { name: 'Header', exact: true })).toBeVisible();
    const resize = page.getByRole('separator', { name: 'Resize template preview from right edge' });
    await resize.focus();
    await page.keyboard.press('Home');
    const overlay = page.locator('.template-header .template-navigation-overlay').first();
    await expect(overlay.locator(':scope > summary')).toBeVisible();
    await page.locator('.template-header .template-navigation').first().click();
    await overlay.locator(':scope > summary').click();
    await expect(overlay).toHaveAttribute('open', '');
    if (!await list.isVisible()) await page.getByRole('button', { name: 'List View', exact: true }).click();
    await list.getByRole('button', { name: 'Group', exact: true }).first().click();
    await expect(overlay).toHaveAttribute('open', '');
    await expect(frame.locator(':scope > .canvas-block-toolbar')).toBeHidden();
    await page.locator('.template-header .template-navigation').first().click();
    await overlay.getByRole('button', { name: 'Close menu' }).click();
    await expect(overlay).not.toHaveAttribute('open', '');

  } finally { await fixture.close(); }
});
