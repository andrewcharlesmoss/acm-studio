import { expect, test } from '@playwright/test';

test('Site Editor panes fill the tablet viewport', async ({ page }) => {
  await page.setViewportSize({ width: 820, height: 900 });
  await page.goto('/studio/site-editor?site=test&documentId=test-site');

  const tabletGeometry = await page.evaluate(() => {
    const main = document.querySelector('.site-editor-preview > main')!;
    const slots = [...document.querySelectorAll<HTMLElement>('.site-editor-preview-layout > .two-left-pane-layout > .two-left-pane-slot')];
    return {
      viewportBottom: window.innerHeight,
      mainBottom: main.getBoundingClientRect().bottom,
      mainScrolls: main.scrollHeight > main.clientHeight,
      paneBottoms: slots.map(slot => slot.getBoundingClientRect().bottom),
    };
  });
  expect(tabletGeometry.mainBottom).toBe(tabletGeometry.viewportBottom);
  expect(tabletGeometry.paneBottoms).toEqual([tabletGeometry.viewportBottom, tabletGeometry.viewportBottom]);
  expect(tabletGeometry.mainScrolls).toBe(true);

});


test('all three Site Editor panes collapse into a clear left-to-right ordered stack', async ({ page }) => {
  for (const width of [1440, 820, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/studio/site-editor?site=test&documentId=test-site');
    for (const label of ['Studio Navigation', 'Site Editor Navigation', 'Site Editor Pages']) {
      const show = page.getByRole('button', { name: `Show ${label}` });
      if (await show.isVisible()) { await show.focus(); await show.press('Enter'); }
    }
    for (const label of ['Studio Navigation', 'Site Editor Navigation', 'Site Editor Pages']) {
      const hide = page.getByRole('button', { name: `Hide ${label}` });
      await hide.focus();
      await hide.press('Enter');
    }
    const controls = [
      page.getByRole('button', { name: 'Show Studio Navigation' }),
      page.getByRole('button', { name: 'Show Site Editor Navigation' }),
      page.getByRole('button', { name: 'Show Site Editor Pages' }),
    ];
    const rectangles = await Promise.all(controls.map(control => control.boundingBox()));
    expect(rectangles.every(Boolean)).toBe(true);
    const [first, second, third] = rectangles!;
    expect(first!.x).toBeCloseTo(second!.x, 0);
    expect(second!.x).toBeCloseTo(third!.x, 0);
    expect(first!.y).toBeLessThan(second!.y);
    expect(second!.y).toBeLessThan(third!.y);
    expect(second!.y - first!.y - first!.height).toBeGreaterThanOrEqual(9);
    expect(third!.y - second!.y - second!.height).toBeGreaterThanOrEqual(9);
    for (const control of [...controls].reverse()) { await control.focus(); await control.press('Enter'); }
    await expect(page.getByRole('button', { name: 'Hide Studio Navigation' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Hide Site Editor Navigation' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Hide Site Editor Pages' })).toBeVisible();
  }
});
