import { expect, test } from '@playwright/test';

for (const activation of ['click', 'Enter'] as const) test(`Edit Header opens the canonical shared Header with ${activation}`, async ({ page }) => {
  await page.goto('/studio/site-editor');
  const home = page.frameLocator('.site-editor-home-host iframe');
  await expect(home.getByRole('button', { name: 'Edit Home Page' })).toHaveCount(0);
  await home.getByRole('heading', { name: 'Home' }).click();
  await expect(page.locator('.studio-app-header').getByRole('button', { name: 'Return to Preview' })).toBeVisible();
  const edit = home.locator('header[data-template-part]').getByRole('button', { name: /^Edit / });
  const id = await edit.evaluate(button => button.closest('header[data-template-part]')?.getAttribute('data-template-part'));
  expect(id).toBeTruthy();
  if (activation === 'click') await edit.click();
  else {
    await edit.focus();
    await page.keyboard.press('Enter');
  }

  await expect(page.locator('.template-workspace')).toBeVisible();
  await expect(page).toHaveURL(/\/studio\?site=test&mode=templates&scope=global&set=/);
  expect(new URL(page.url()).searchParams.get('target')).toBe(id);
  await expect(page.getByText('Global template — layout and style changes apply to every site.')).toBeVisible();
  await expect(page.locator('[aria-label="Template node: Site Identity"]')).toBeVisible();
  await expect(page.locator('[aria-label="Template node: Navigation"]')).toBeVisible();
  await expect(page.getByRole('banner').getByRole('button', { name: 'Content', exact: true })).toBeVisible();
  await expect(page.locator('.site-editor-preview')).toHaveCount(0);
});
