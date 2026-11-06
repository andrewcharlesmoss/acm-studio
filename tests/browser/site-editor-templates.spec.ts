import { expect, test } from '@playwright/test';

for (const width of [1440, 820, 390]) {
  test(`Site Editor lists shared Post and Page templates at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/studio/site-editor?site=global');
    const categories = page.getByRole('navigation', { name: 'Template categories' });
    await expect(async () => {
      await page.getByRole('button', { name: 'Templates Browse templates' }).click();
      await expect(categories).toBeVisible({ timeout: 1000 });
    }).toPass({ timeout: 20000 });
    await expect(categories.getByRole('button', { name: /^All Templates/ })).toBeVisible();
    const catalogue = page.getByRole('region', { name: 'Templates', exact: true });
    await expect(catalogue.getByRole('heading', { name: 'All Templates' })).toBeVisible();
    await expect(catalogue.getByRole('link', { name: /Shared post template/i }).first()).toBeVisible();
    const pageTemplate = catalogue.getByRole('link', { name: /Shared page template/i }).first();
    await expect(pageTemplate).toBeVisible();
    await expect(catalogue.getByRole('link', { name: /Shared (header|footer)/i })).toHaveCount(0);
    await expect(pageTemplate).toHaveAttribute('href', /mode=templates.*scope=global.*target=/);
    if (width === 1440) {
      const destination = await pageTemplate.getAttribute('href');
      await pageTemplate.click();
      await expect(page).toHaveURL(new RegExp(destination!.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$'));
    }
  });
}
