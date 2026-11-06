import { expect, test } from '@playwright/test';
import { createSavedWebsiteDesignFixture } from './helpers/website-design-fixture';

test('shared Header selection is purple and clears when selecting page content', async ({ page }) => {
  await page.goto('/studio?site=test2&library=page');
  const header = page.locator('[data-template-part][aria-label="Header shared template part"]');
  await expect(header).toBeVisible();
  await header.hover();
  await expect.poll(() => header.evaluate(element => getComputedStyle(element, '::before').borderTopColor)).toBe('rgb(127, 0, 255)');
  await header.click();
  await expect(header).toHaveAttribute('data-shared-part-selected', 'true');
  await expect.poll(() => header.evaluate(element => getComputedStyle(element, '::before').borderTopColor)).toBe('rgb(127, 0, 255)');
  const block = page.locator('.canvas-block').first();
  await block.click();
  await expect(header).not.toHaveAttribute('data-shared-part-selected', 'true');
  await expect(block).toHaveClass(/is-selected/);
  await expect.poll(() => block.evaluate(element => getComputedStyle(element, '::before').borderTopColor)).toBe('rgb(255, 56, 60)');
  await expect(page.getByRole('button', { name: 'Edit Header' })).toBeVisible();
});

test('nested shared-part specimen selects the deepest part and resets', async ({ page }) => {
  await page.goto('/studio/ui/workspace#block-editor-playground');
  const example = page.locator('#block-editor-playground');
  const header = example.locator('[aria-label="Header shared template part"]');
  const nested = example.locator('[aria-label="Navigation shared template part"]');
  await header.click({ position: { x: 4, y: 4 } });
  await expect(header).toHaveAttribute('data-shared-part-selected', 'true');
  await nested.click();
  await expect(header).not.toHaveAttribute('data-shared-part-selected', 'true');
  await expect(nested).toHaveAttribute('data-shared-part-selected', 'true');
  await example.getByRole('button', { name: 'Reset example' }).click();
  await expect(example.locator('[data-shared-part-selected="true"]')).toHaveCount(0);
  await header.press('Enter');
  await expect(header).toHaveAttribute('data-shared-part-selected', 'true');
});

test('template editor shared references show the purple hover outline', async ({ page }) => {
  await page.goto('/studio/ui/workspace#block-editor-playground');
  const example = page.locator('#block-editor-playground');
  const reference = example.locator('.canvas-block[data-studio-shared-part="true"]');
  await expect(async () => {
    await example.getByLabel('Add Template Element').selectOption({ label: 'Navigation Reference' });
    await expect(reference).toBeVisible({ timeout: 1000 });
  }).toPass({ timeout: 10000 });
  await example.locator('.canvas-block').first().click();
  await expect(reference).not.toHaveClass(/is-selected/);
  await reference.hover();
  await expect.poll(() => reference.evaluate(element => getComputedStyle(element, '::before').borderTopColor)).toBe('rgb(127, 0, 255)');
});

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

test('Site Editor shares the View menu, links to the active site, and keeps save status in its header', async ({ page }, testInfo) => {
  test.setTimeout(90000);
  const fixture = await createSavedWebsiteDesignFixture(String(testInfo.project.use.baseURL ?? 'http://localhost:3010'));
  try {
  await page.setViewportSize({ width: 1440, height: 1400 });
  await page.route('**/__studio/local-projects', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ available: true, projects: [{ id: 'test', status: 'running', href: 'http://localhost:3006/' }] }),
  }));
  await page.context().route('http://localhost:3006/**', route => route.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>Local site fixture</title>' }));

  await page.goto(`${fixture.origin}/studio/site-editor`);
  await expect(page.locator('.site-identity-persistence-fields')).toBeEnabled({ timeout: 30000 });
  const localNotice = page.locator('.site-editor-preview > .studio-notice');
  await expect(localNotice).toContainText('Local Test website. Saved changes are stored on this workstation and update its local preview. The live website is unchanged.');
  const header = page.locator('.site-editor-preview > .studio-app-header');
  const scopeLabel = header.getByRole('group', { name: 'Current design scope' });
  await expect(scopeLabel.locator('.site-editor-header-scope-full')).toHaveText('Test');
  await expect(scopeLabel.locator('.site-editor-header-scope-compact')).toHaveText('Test');
  await expect(scopeLabel).toHaveAccessibleDescription('Test');
  const headerCenter = await header.evaluate(element => element.getBoundingClientRect().left + element.getBoundingClientRect().width / 2);
  const scopeCenter = await scopeLabel.evaluate(element => element.getBoundingClientRect().left + element.getBoundingClientRect().width / 2);
  expect(Math.abs(scopeCenter - headerCenter)).toBeLessThanOrEqual(1);
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
  await homePreview.getByText('Temporary gateway fixture', { exact: true }).click();
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
  await expect(openedPreview).toHaveURL('http://localhost:3006/#document=test-home');

  await header.getByRole('button', { name: 'View', exact: true }).click();
  await page.getByRole('menuitemradio', { name: /Mobile/ }).click();
  const homeFrame = page.locator('.site-editor-home-host');
  await expect.poll(async () => homeFrame.evaluate(element => element.getBoundingClientRect().width)).toBeLessThanOrEqual(390);

  const [openedPage] = await Promise.all([page.waitForEvent('popup'), header.getByRole('button', { name: 'View page' }).click()]);
  await expect(openedPage).toHaveURL('http://localhost:3006/#document=test-home');

  await page.getByRole('combobox', { name: /^Design Scope/ }).selectOption('test2');
  await expect(scopeLabel).toHaveAccessibleDescription('Test2');
  await expect(localNotice).toContainText('Local Test2 website. Saved changes are stored on this workstation and update its local preview. The live website is unchanged.');
  await page.getByRole('combobox', { name: /^Design Scope/ }).selectOption('global');
  await expect(scopeLabel).toHaveAccessibleDescription('Universal Defaults');
  await expect(localNotice).toHaveCount(0);
  await expect(header.getByRole('button', { name: 'View page' })).toHaveCount(0);
  await header.getByRole('button', { name: 'View', exact: true }).click();
  const globalTemplate = page.getByRole('menuitemcheckbox', { name: 'Show template' });
  await expect(globalTemplate).toBeDisabled();
  await expect(page.getByText('Select a site to preview its template.')).toBeVisible();

  for (const width of [820, 390]) {
    await page.setViewportSize({ width, height: 900 });
    const currentHeaderCenter = await header.evaluate(element => element.getBoundingClientRect().left + element.getBoundingClientRect().width / 2);
    const currentScopeCenter = await scopeLabel.evaluate(element => element.getBoundingClientRect().left + element.getBoundingClientRect().width / 2);
    if ((await header.boundingBox())!.width > 600) expect(Math.abs(currentScopeCenter - currentHeaderCenter)).toBeLessThanOrEqual(1);
    else await expect(scopeLabel.locator('.site-editor-header-scope-compact')).toBeVisible();
    const scopeBox = await scopeLabel.boundingBox();
    const headerBox = await header.boundingBox();
    expect(scopeBox).not.toBeNull();
    expect(headerBox).not.toBeNull();
    expect(scopeBox!.x).toBeGreaterThanOrEqual(headerBox!.x);
    expect(scopeBox!.x + scopeBox!.width).toBeLessThanOrEqual(headerBox!.x + headerBox!.width);
  }
  } finally { await page.close(); await fixture.close(); }
});

test('local website notice dismissal persists across Studio routes, reloads and site scopes', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/studio?site=test&library=page');
  const mainNotice = page.locator('.studio-local-website-notice');
  await expect(mainNotice).toContainText('Local Test website. Saved changes are stored on this workstation and update its local preview. The live website is unchanged.');
  await expect(mainNotice.getByRole('button', { name: 'Close local website notice' })).toBeVisible();
  await mainNotice.getByRole('button', { name: 'Close local website notice' }).click();
  await expect(mainNotice).toHaveCount(0);

  await page.goto('/studio/site-editor?site=test');
  const notice = page.locator('.studio-local-website-notice');
  await expect(notice).toHaveCount(0);
  await page.reload();
  await expect(notice).toHaveCount(0);

  await page.goto('/studio?site=test2&library=page');
  await expect(notice).toHaveCount(0);
  await page.goto('/studio/site-editor?site=test2');
  await expect(notice).toHaveCount(0);
});


test('Studio local notice closes and stays closed when changing routes', async ({ page }) => {
  await page.goto('/studio?library=page');
  const notice = page.getByRole('note').filter({ hasText: 'Local-only Studio.' });
  await expect(notice).toBeVisible();
  await notice.getByRole('button', { name: 'Close local website notice' }).click();
  await expect(notice).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole('note').filter({ hasText: 'Local-only Studio.' })).toHaveCount(0);
  await page.goto('/studio/site-editor?site=test');
  await expect(page.getByRole('note').filter({ hasText: 'Local Test website.' })).toHaveCount(0);
});
