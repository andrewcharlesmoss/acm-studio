import { expect, test } from '@playwright/test';

test('published local pages open on their owning local site', async ({ page }) => {
  await page.route('**/__studio/local-projects', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ available: true, projects: [{ id: 'test2', status: 'running', href: 'http://localhost:3006/' }] }),
  }));
  await page.context().route('http://localhost:3006/**', route => route.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>Local page fixture</title>' }));

  await page.goto('/studio?site=test2&library=page');
  const viewPage = page.getByRole('button', { name: 'View page' });
  await expect(viewPage).toBeVisible();
  await expect(viewPage).toBeEnabled();
  await expect(viewPage).toHaveText('');

  const [openedPage] = await Promise.all([page.waitForEvent('popup'), viewPage.click()]);
  await expect(openedPage).toHaveURL(/http:\/\/localhost:3006\/#document=/);
});

test('Site Editor shares the View menu, links to the active site, and keeps save status in its header', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1400 });
  await page.route('**/__studio/local-projects', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ available: true, projects: [{ id: 'test', status: 'running', href: 'http://localhost:3006/' }] }),
  }));
  await page.context().route('http://localhost:3006/**', route => route.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>Local site fixture</title>' }));

  await page.goto('/studio/site-editor');
  const localNotice = page.locator('.site-editor-preview > .studio-notice');
  await expect(localNotice).toContainText('Local Test website. Saved changes are stored on this workstation and update its local preview. The live website is unchanged.');
  const header = page.locator('.site-editor-preview > .studio-app-header');
  const viewTrigger = header.getByRole('button', { name: 'View', exact: true });
  await expect(viewTrigger).toBeVisible();
  await expect(viewTrigger.locator('svg.studio-view-trigger-icon')).toBeVisible();
  await expect(header.getByRole('button', { name: 'View page' })).toBeEnabled();
  await expect(header.getByText(/Saved locally|Saving…/)).toBeVisible();
  await expect(header.getByRole('button', { name: 'Export', exact: true })).toHaveCount(0);
  await expect(header.getByRole('button', { name: 'Save', exact: true })).toHaveCount(0);

  await header.getByRole('button', { name: 'View', exact: true }).click();
  const viewMenu = page.getByRole('menu', { name: 'View options' });
  await expect(viewMenu.getByRole('menuitemradio', { name: /Editing View|Website View|Full Preview/ })).toHaveCount(0);
  await expect(viewMenu.getByLabel('Focus Outline')).toBeVisible();
  await expect(viewMenu.getByText('Use Styles → Blocks for device-specific style changes.')).toBeVisible();
  const showTemplate = viewMenu.getByRole('menuitemcheckbox', { name: 'Show template' });
  await expect(showTemplate).toHaveAttribute('aria-checked', 'true');
  await showTemplate.click();
  await expect(page.frameLocator('.site-editor-home-host iframe').locator('.studio-shell')).toHaveAttribute('data-show-template', 'false');
  await expect(showTemplate).toHaveAttribute('aria-checked', 'false');
  await showTemplate.click();
  await expect(page.frameLocator('.site-editor-home-host iframe').locator('.studio-shell')).toHaveAttribute('data-show-template', 'true');
  const homePreview = page.frameLocator('.site-editor-home-host iframe');
  await expect(homePreview.getByRole('button', { name: 'Edit Home Page' })).toHaveCount(0);
  await viewTrigger.click();
  await homePreview.getByRole('heading', { name: 'Home' }).click();
  await expect(header.getByRole('button', { name: 'Return to Preview' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Show Site Editor Navigation' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Show Site Editor Identity' })).toBeVisible();
  await homePreview.getByRole('button', { name: 'Show editor panes' }).click();
  await expect(page.getByRole('button', { name: 'Hide Site Editor Navigation' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Hide Site Editor Identity' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Hide Site Editor Navigation' })).toBeFocused();
  await header.getByRole('button', { name: 'Return to Preview' }).click();
  await expect(header.getByRole('button', { name: 'Return to Preview' })).toHaveCount(0);
  await expect(header.getByRole('link', { name: 'Back to Studio' })).toBeFocused();
  await expect(homePreview.locator('.studio-hosted-home-toolbar')).toHaveCount(0);
  await homePreview.locator('.test-site-page').evaluate(element => { const shortContent = document.createElement('p'); shortContent.textContent = 'Short preview content'; element.replaceChildren(shortContent); });
  await expect.poll(async () => homePreview.locator('.test-site-page').evaluate(element => { const pageBottom = element.getBoundingClientRect().bottom; const canvasBottom = element.closest('.editor-canvas-scroll')!.getBoundingClientRect().bottom; return Math.abs(canvasBottom - pageBottom); })).toBeLessThanOrEqual(1);
  await homePreview.locator('.test-site-page').evaluate(element => { const longContent = document.createElement('div'); longContent.style.height = '1500px'; element.replaceChildren(longContent); });
  await expect.poll(async () => homePreview.locator('.test-site-page').evaluate(element => { const pageBottom = element.getBoundingClientRect().bottom; const surfaceBottom = element.closest('.website-design-surface')!.getBoundingClientRect().bottom; return pageBottom - surfaceBottom; })).toBeLessThanOrEqual(1);

  await header.getByRole('button', { name: 'View', exact: true }).click();
  const previewInNewTab = page.getByRole('menuitem', { name: 'Preview in new tab' });
  await expect(previewInNewTab).toBeEnabled();
  const [openedPreview] = await Promise.all([page.waitForEvent('popup'), previewInNewTab.click()]);
  await expect(openedPreview).toHaveURL('http://localhost:3006/#document=test-site');

  await header.getByRole('button', { name: 'View', exact: true }).click();
  await page.getByRole('menuitemradio', { name: /Mobile/ }).click();
  const homeFrame = page.locator('.site-editor-home-host');
  await expect.poll(async () => homeFrame.evaluate(element => element.getBoundingClientRect().width)).toBeLessThanOrEqual(390);

  const [openedPage] = await Promise.all([page.waitForEvent('popup'), header.getByRole('button', { name: 'View page' }).click()]);
  await expect(openedPage).toHaveURL('http://localhost:3006/#document=test-site');

  await page.getByLabel('Design Scope').selectOption('test2');
  await expect(localNotice).toContainText('Local Test2 website. Saved changes are stored on this workstation and update its local preview. The live website is unchanged.');
  await page.getByLabel('Design Scope').selectOption('global');
  await expect(localNotice).toHaveCount(0);
  await expect(header.getByRole('button', { name: 'View page' })).toHaveCount(0);
  await header.getByRole('button', { name: 'View', exact: true }).click();
  const globalTemplate = page.getByRole('menuitemcheckbox', { name: 'Show template' });
  await expect(globalTemplate).toBeDisabled();
  await expect(page.getByText('Select a site to preview its template.')).toBeVisible();
});
