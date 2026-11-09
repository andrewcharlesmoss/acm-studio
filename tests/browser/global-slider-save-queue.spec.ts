import { expect, test } from '@playwright/test';
import { createStudioHttpFixture } from '../helpers/studio-http-fixture.mjs';

test('spacing sliders remain responsive while a global save is delayed', async ({ page }, testInfo) => {
  const fixture = await createStudioHttpFixture({ frontendURL: String(testInfo.project.use.baseURL ?? 'http://localhost:3010') });
  let release!: () => void;
  const blocked = new Promise<void>(resolve => { release = resolve; });
  let requestBlocked = false;
  try {
    await page.route('**/__studio/test-site', async route => {
      const request = route.request();
      if (!requestBlocked && request.method() === 'POST' && request.postDataJSON()?.action === 'global-save') {
        requestBlocked = true;
        await blocked;
      }
      await route.continue();
    });
    await page.goto(`${fixture.origin}/studio?site=test2&mode=templates&scope=global&set=studio-twenty-twenty-five-parts&target=tt5-header`);
    await page.getByRole('button', { name: 'List View', exact: true }).click();
    await page.getByRole('complementary', { name: 'List View' }).getByRole('button', { name: 'Header', exact: true }).click();
    await expect(page.getByRole('group', { name: 'Group block tools' }).getByRole('button', { name: /Transform .* block/ })).toBeEnabled();
    const slider = page.getByRole('slider', { name: 'Padding Vertical amount' });
    const before = await slider.inputValue();
    const bounds = await slider.boundingBox();
    if (!bounds) throw new Error('Padding slider is not visible');
    await slider.focus();
    await page.keyboard.press('End');
    await expect.poll(() => requestBlocked).toBe(true);
    const updatedBounds = await slider.boundingBox();
    if (!updatedBounds) throw new Error('Slider moved out of view');
    await page.mouse.move(updatedBounds.x + updatedBounds.width - 6, updatedBounds.y + updatedBounds.height / 2);
    await page.mouse.down();
    const dragged = new Set<string>();
    for (const position of [.8, .65, .5, .35]) {
      await page.mouse.move(updatedBounds.x + updatedBounds.width * position, updatedBounds.y + updatedBounds.height / 2);
      await expect(slider).toBeEnabled();
      dragged.add(await slider.inputValue());
    }
    await page.mouse.up();
    expect(dragged.size).toBeGreaterThan(1);
    const latest = await slider.inputValue();
    expect(latest).not.toBe(before);
    const margin = page.getByRole('slider', { name: 'Margin Vertical amount' });
    const marginBefore = await margin.inputValue();
    await expect(margin).toBeEnabled();
    await margin.focus(); await page.keyboard.press('End');
    const marginLatest = await margin.inputValue();
    expect(marginLatest).not.toBe(marginBefore);
    const spacing = page.getByRole('slider', { name: 'Block spacing Top amount' });
    const spacingBefore = await spacing.inputValue();
    await expect(spacing).toBeEnabled();
    await spacing.focus(); await page.keyboard.press('End');
    const spacingLatest = await spacing.inputValue();
    expect(spacingLatest).not.toBe(spacingBefore);
    release();
    await expect(page.getByText('Global templates saved locally')).toBeVisible();
    await page.getByRole('button', { name: 'Undo', exact: true }).click();
    await expect.poll(() => spacing.inputValue()).toBe(spacingBefore);
    await page.reload();
    await page.getByRole('button', { name: 'List View', exact: true }).click();
    await page.getByRole('complementary', { name: 'List View' }).getByRole('button', { name: 'Header', exact: true }).click();
    await expect(page.getByRole('slider', { name: 'Padding Vertical amount' })).toHaveValue(latest);
    await expect(page.getByRole('slider', { name: 'Margin Vertical amount' })).toHaveValue(marginLatest);
    await expect(page.getByRole('slider', { name: 'Block spacing Top amount' })).toHaveValue(spacingBefore);
  } finally { release(); await fixture.close(); }
});
