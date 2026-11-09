import { expect, test } from '@playwright/test';
import { createStudioHttpFixture } from '../helpers/studio-http-fixture.mjs';

test('template part root Group has compact toolbar and full size justification', async ({ page }, testInfo) => {
  const fixture = await createStudioHttpFixture({ frontendURL: String(testInfo.project.use.baseURL ?? 'http://localhost:3010') });
  try {
    await page.goto(`${fixture.origin}/studio?site=test2&mode=templates&scope=global&set=studio-twenty-twenty-five-parts&target=tt5-header`);
    await page.getByRole('button', { name: 'List View', exact: true }).click();
    await page.getByRole('complementary', { name: 'List View' }).getByRole('button', { name: 'Header', exact: true }).click();
    const toolbar = page.getByRole('group', { name: 'Group block tools' });
    await expect(toolbar.getByRole('button', { name: 'Drag to reorder Group block' })).toHaveCount(0);
    await expect(toolbar.getByRole('button', { name: 'Select parent Template Part' })).toHaveCount(0);
    await page.getByText('Inner blocks use content width', { exact: true }).click();
    const justify = toolbar.getByRole('button', { name: 'Change items justification' });
    await expect(justify.locator('svg')).toHaveCSS('width', '24px');
    await justify.click();
    await expect(page.getByRole('menu', { name: 'Change items justification' })).toBeVisible();
    await page.keyboard.press('Escape');
    await toolbar.getByRole('button', { name: /Transform .* block/ }).click();
    const menu = page.getByRole('menu', { name: 'Transform block' });
    await expect(menu.getByRole('menuitem', { name: 'Group', exact: true })).toBeVisible();
    const defaultStyle = menu.getByRole('menuitemradio', { name: 'Default', exact: true });
    const defaultText = defaultStyle.locator('span');
    const labelBox = await defaultText.boundingBox();
    const rowBox = await defaultStyle.boundingBox();
    expect(labelBox).not.toBeNull();
    expect(rowBox).not.toBeNull();
    expect(labelBox!.x).toBeGreaterThanOrEqual(rowBox!.x);
    expect(labelBox!.x + labelBox!.width).toBeLessThanOrEqual(rowBox!.x + rowBox!.width);
    await expect(defaultText).toHaveCSS('grid-column-start', '1');
    await expect(menu.getByRole('menuitemradio', { name: 'Style 1', exact: true })).toBeVisible();
    await menu.getByRole('menuitemradio', { name: 'Style 1', exact: true }).click();
    await expect(page.getByRole('group', { name: 'Group styles' }).getByRole('button', { name: 'Style 1' })).toHaveAttribute('aria-pressed', 'true');
  } finally { await fixture.close(); }
});
