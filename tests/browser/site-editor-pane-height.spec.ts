import { expect, test } from '@playwright/test';

test('Site Editor panes fill the tablet viewport and retain collapse behaviour at supported widths', async ({ page }) => {
  await page.setViewportSize({ width: 820, height: 900 });
  await page.goto('/studio/site-editor');

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

  for (const width of [1440, 820, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/studio/site-editor');
    const navigation = page.getByRole('button', { name: 'Hide Site Editor Navigation' });
    const identity = page.getByRole('button', { name: 'Hide Site Editor Identity' });
    await navigation.focus();
    await navigation.press('Enter');
    await identity.click();
    await expect(page.getByRole('button', { name: 'Show Site Editor Navigation' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Show Site Editor Identity' })).toBeVisible();

    const collapsedWidths = await page.locator('.two-left-pane-slot[data-collapsed="true"]').evaluateAll(
      slots => slots.map(slot => slot.getBoundingClientRect().width),
    );
    expect(collapsedWidths).toEqual([0, 0]);
    const [workspaceLeft, collapsedButtonRects] = await Promise.all([
      page.locator('.two-left-pane-content').evaluate(element => element.getBoundingClientRect().left),
      page.locator('.two-left-pane-control-layer .pane-collapse[data-collapsed="true"]').evaluateAll(buttons => buttons.map(button => button.getBoundingClientRect().toJSON())),
    ]);
    expect(workspaceLeft).toBe(0);
    expect(collapsedButtonRects[0].bottom).toBeLessThanOrEqual(collapsedButtonRects[1].top);

    await page.getByRole('button', { name: 'Show Site Editor Navigation' }).press('Enter');
    await page.getByRole('button', { name: 'Show Site Editor Identity' }).press('Space');
    await expect(page.getByRole('button', { name: 'Hide Site Editor Navigation' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Hide Site Editor Identity' })).toBeVisible();
  }
});
