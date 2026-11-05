import { expect, test as base } from '@playwright/test';
import { createSavedWebsiteDesignFixture } from './helpers/website-design-fixture';

const test = base.extend<{ fixtureOrigin: string }>({ fixtureOrigin: async ({ baseURL, page }, runFixture) => {
  const fixture = await createSavedWebsiteDesignFixture(baseURL);
  try { await runFixture(fixture.origin); } finally { await page.close(); await fixture.close(); }
} });

test('Theme colour swatches stay circular when Show Details is open', async ({ page, fixtureOrigin }) => {
  test.setTimeout(60000);
  await page.goto(`${fixtureOrigin}/studio/site-editor?site=test`);
  await expect(page.locator('.site-identity-persistence-fields')).toBeEnabled({ timeout: 30000 });
  const styles = page.getByRole('button', { name: 'Styles Browse Styles' });
  await expect.poll(async () => { await styles.click(); return styles.getAttribute('aria-current'); }).toBe('page');
  await expect(page.getByRole('navigation', { name: 'Styles preview menu' })).toBeVisible();
  await page.getByRole('button', { name: 'Colours', exact: true }).click();
  await page.getByRole('button', { name: 'Edit palette' }).click();
  await page.getByRole('button', { name: 'Theme options' }).click();
  await page.getByRole('button', { name: 'Show Details' }).click();

  const swatches = page.locator('.site-colours-theme-details .site-colours-theme-detail-row > .studio-colour-value-swatch');
  await expect(swatches).toHaveCount(8);
  for (const viewport of [{ width: 1440, height: 1000 }, { width: 900, height: 900 }]) {
    await page.setViewportSize(viewport);
    for (const swatch of await swatches.all()) {
      const { width, height } = await swatch.boundingBox() ?? { width: 0, height: 0 };
      expect(width, `swatch width at ${viewport.width}px viewport`).toBe(24);
      expect(height, `swatch height at ${viewport.width}px viewport`).toBe(24);
      await expect(swatch).toHaveCSS('border-radius', '50%');
    }
  }

  await page.getByRole('button', { name: 'Choose Base colour' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Done' }).click();
  const overviewSwatch = page.locator('.site-colours-theme-grid .paragraph-palette-trigger > .paragraph-palette-default-swatch').first();
  await expect(overviewSwatch).toBeVisible();
  const { width, height } = await overviewSwatch.boundingBox() ?? { width: 0, height: 0 };
  expect(width).toBe(height);
});

test('colour palette rows keep equal side insets inside the Styles pane', async ({ page, fixtureOrigin }) => {
  test.setTimeout(60000);
  await page.goto(`${fixtureOrigin}/studio/site-editor?site=test`);
  await expect(page.locator('.site-identity-persistence-fields')).toBeEnabled({ timeout: 30000 });
  const styles = page.getByRole('button', { name: 'Styles Browse Styles' });
  await expect.poll(async () => { await styles.click(); return styles.getAttribute('aria-current'); }).toBe('page');
  await expect(page.getByRole('navigation', { name: 'Styles preview menu' })).toBeVisible();
  await page.getByRole('button', { name: 'Colours', exact: true }).click();
  await page.getByRole('button', { name: 'Edit palette' }).click();

  const paneBody = page.getByRole('complementary', { name: 'Site Editor Styles', exact: true }).locator(':scope > .pane-body');
  const palettes = page.locator('.site-colours-palettes');
  await expect(palettes).toBeVisible();
  for (const viewport of [{ width: 1440, height: 500 }, { width: 900, height: 500 }]) {
    await page.setViewportSize(viewport);
    const { left, right, overflows } = await palettes.evaluate(grid => {
      const body = grid.closest('.pane')?.querySelector<HTMLElement>(':scope > .pane-body');
      if (!body) throw new Error('Styles palette pane is not mounted');
      const bodyRect = body.getBoundingClientRect();
      const gridRect = grid.getBoundingClientRect();
      return { left: gridRect.left - bodyRect.left, right: bodyRect.right - gridRect.right, overflows: body.scrollHeight > body.clientHeight };
    });
    expect(overflows, `Styles pane scrolls at ${viewport.width}px viewport`).toBe(true);
    expect(Math.abs(left - right), `side inset difference at ${viewport.width}px viewport`).toBeLessThanOrEqual(1);
    await expect(paneBody).toBeVisible();
  }
});
