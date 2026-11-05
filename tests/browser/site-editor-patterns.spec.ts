import { expect, test } from '@playwright/test';

test('Patterns filters shared template parts and opens their existing editors', async ({ page }) => {
  await page.goto('/studio/site-editor?site=global');
  const categories = page.getByRole('navigation', { name: 'Template part categories' });
  await expect(async () => {
    await page.getByRole('button', { name: 'Patterns Browse template parts' }).click();
    await expect(categories).toBeVisible({ timeout: 1000 });
  }).toPass({ timeout: 20000 });
  const catalogue = page.getByRole('region', { name: 'Template parts' });
  await expect(catalogue.getByRole('heading', { name: 'All Template Parts' })).toBeVisible();
  await expect(catalogue.getByRole('link', { name: /Shared header/i }).first()).toBeVisible();
  await expect(catalogue.getByRole('link', { name: /Shared footer/i }).first()).toBeVisible();
  await categories.getByRole('button', { name: /^Header/ }).click();
  await expect(catalogue.getByRole('heading', { name: 'Header' })).toBeVisible();
  await expect(catalogue.getByRole('link', { name: /Shared footer/i })).toHaveCount(0);
  const header = catalogue.getByRole('link', { name: /Shared header/i }).first();
  await expect(header).toHaveAttribute('href', /mode=templates.*scope=global.*target=/);
  await categories.getByRole('button', { name: /^Footer/ }).click();
  await expect(catalogue.getByRole('heading', { name: 'Footer' })).toBeVisible();
  await expect(catalogue.getByRole('link', { name: /Shared header/i })).toHaveCount(0);
  const footer = catalogue.getByRole('link', { name: /Shared footer/i }).first();
  await expect(footer).toBeVisible();
  const destination = await footer.getAttribute('href');
  await footer.click();
  await expect(page).toHaveURL(new RegExp(destination!.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$'));
});

for (const width of [390, 820]) {
  test(`Patterns categories remain available at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/studio/site-editor?site=global');
    const categories = page.getByRole('navigation', { name: 'Template part categories' });
    await expect(async () => {
      await page.getByRole('button', { name: 'Patterns Browse template parts' }).click();
      await expect(categories).toBeVisible({ timeout: 1000 });
    }).toPass({ timeout: 20000 });
    await expect(categories.getByRole('button', { name: /^All Template Parts/ })).toBeVisible();
    await categories.getByRole('button', { name: /^Header/ }).click();
    await expect(page.getByRole('region', { name: 'Template parts' }).getByRole('heading', { name: 'Header' })).toBeVisible();
  });
}
