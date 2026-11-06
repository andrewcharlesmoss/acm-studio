import { expect, test } from '@playwright/test';

test('site selection follows navigation into and out of Site Editor', async ({ page }) => {
  await page.goto('/studio?site=test2&library=page');
  const siteEditor = page.getByRole('link', { name: 'Site Editor Preview site design' });
  await expect(siteEditor).toHaveAttribute('href', '/studio/site-editor?site=test2&library=page&section=design');
  await siteEditor.click();
  await expect(page).toHaveURL(/\/studio\/site-editor\?site=test2&library=page&section=design$/);
  await expect(page.getByLabel('Current design scope')).toHaveText('Test2');
  const designScope = page.locator('label.site-editor-preview-scope').filter({ hasText: 'Design Scope' }).locator('select');
  await expect(designScope).toHaveValue('test2');
  await expect(designScope.locator('option[value="test2"]')).toHaveText('Test2');
  const headerBack = page.locator('.site-editor-app-header').getByRole('link', { name: 'Back to Studio' });
  const paneBack = page.locator('.site-editor-design-heading').getByRole('link', { name: 'Back to Studio' });
  await expect(headerBack).toHaveAttribute('href', '/studio?site=test2&library=page');
  await expect(paneBack).toHaveAttribute('href', '/studio?site=test2&library=page');
  await designScope.selectOption('test');
  await expect(page.getByLabel('Current design scope')).toHaveText('Test');
  await expect(page).toHaveURL(/\/studio\/site-editor\?site=test&library=page&section=design$/);
  await expect(headerBack).toHaveAttribute('href', '/studio?site=test&library=page');
  await expect(paneBack).toHaveAttribute('href', '/studio?site=test&library=page');
  await headerBack.click();
  await expect(page).toHaveURL(/\/studio\?site=test&library=page$/);
});

test('Site Editor opens Design for the selected page and scope while explicit page links still open Pages', async ({ page }) => {
  for (const site of ['test', 'test2']) {
    await page.goto(`/studio?site=${site}&library=page&documentId=test-site`);
    const siteEditor = page.getByRole('link', { name: 'Site Editor Preview site design' });
    await expect(siteEditor).toHaveAttribute('href', new RegExp(`/studio/site-editor\\?site=${site}&library=page&documentId=test-site&section=design`));
    await siteEditor.click();
    await expect(page.getByLabel('Current design scope')).toHaveText(site === 'test' ? 'Test' : 'Test2');
    await expect(page.locator('label.site-editor-preview-scope').filter({ hasText: 'Design Scope' }).locator('select')).toHaveValue(site);
    await expect(page.locator('.site-editor-design-heading')).toContainText('Design');
    await expect(page.getByRole('complementary', { name: 'Site Editor Identity' })).toBeVisible();

    const internalSiteEditor = page.getByRole('link', { name: 'Site Editor Preview site design' });
    await expect(internalSiteEditor).toHaveAttribute('href', new RegExp(`/studio/site-editor\\?site=${site}&library=page&documentId=test-site&section=design`));
    await internalSiteEditor.click();
    await expect(page.getByRole('complementary', { name: 'Site Editor Identity' })).toBeVisible();
  }

  await page.goto('/studio/site-editor?site=test&documentId=test-site');
  await expect(page.getByRole('complementary', { name: 'Site Editor Pages' })).toBeVisible();
});

test('direct Site Editor addresses validate and retain their scope', async ({ page }) => {
  for (const [query, expected] of [['', 'test'], ['?site=unknown', 'test'], ['?site=global', 'global'], ['?site=test2', 'test2']]) {
    await page.goto(`/studio/site-editor${query}`);
    await expect(page.getByLabel('Design Scope')).toHaveValue(expected);
    await page.reload();
    await expect(page.getByLabel('Design Scope')).toHaveValue(expected);
  }
});

test('unsaved Site Editor identity changes update the site preview before review or save', async ({ page }) => {
  await page.goto('/studio/site-editor?site=test&section=design');
  const frame = page.frameLocator('iframe[title^="Test page preview"]');
  const previewTitle = frame.locator('.website-design-identity .template-brand-name');
  await expect(previewTitle).toBeVisible();
  await page.getByLabel('Site Title', { exact: true }).fill('Unsaved preview title');
  await expect(previewTitle).toHaveText('Unsaved preview title');
  await expect(page.getByRole('button', { name: 'Review 1 change…' })).toBeVisible();
});
