import { expect, test } from '@playwright/test';

test('application header shares production chrome with isolated section, action and width examples', async ({ page }) => {
  await page.goto('/studio/ui/workspace#application-header');
  const example = page.locator('.ui-application-header-example');
  const header = example.locator('.studio-app-header');
  await expect(header.getByText('Content Studio', { exact: true })).toBeVisible();
  await header.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(example.locator(':scope > p[role="status"]').filter({ hasText: 'Save completed' })).toHaveText('Save completed in this example only.');
  await example.getByLabel('Header example section').selectOption('templates');
  await expect(header.getByText('Header', { exact: true })).toBeVisible();
  await expect(header.getByRole('button', { name: 'Content', exact: true })).toBeVisible();
  await expect(header.getByRole('button', { name: 'Save', exact: true })).toHaveCount(0);
  await header.getByRole('link', { name: 'Templates', exact: true }).click();
  await expect(page).toHaveURL(/\/studio\/ui\/workspace#application-header$/);
  await expect(example.locator(':scope > p[role="status"]')).toContainText('Templates selected in this example.');
  await example.getByLabel('Header example width').selectOption('390');
  expect((await header.boundingBox())!.width).toBeLessThanOrEqual(390);
  for (const control of await header.locator('a, button').all()) {
    const bounds = (await control.boundingBox())!;
    const parent = (await header.boundingBox())!;
    expect(bounds.x).toBeGreaterThanOrEqual(parent.x);
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(parent.x + parent.width + 1);
  }
  await example.getByRole('button', { name: 'Reset example' }).click();
  await expect(example.getByLabel('Header example section')).toHaveValue('content');
  await expect(example.getByLabel('Header example width')).toHaveValue('full');
  await expect(example.locator(':scope > p[role="status"]')).toContainText('Temporary example');
});

test('section examples use actual action sets and show fixture sync status once', async ({ page }) => {
  await page.goto('/studio/ui/workspace#application-header');
  const example = page.locator('.ui-application-header-example');
  const header = example.locator('.studio-app-header');
  const section = example.getByLabel('Header example section');
  // A real callback acknowledgement ensures hydration before native select input.
  await header.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(example.locator(':scope > p[role="status"]')).toHaveText('Save completed in this example only.');
  await example.getByLabel('Header example scenario').selectOption('synced');
  for (const name of ['content', 'files', 'bin', 'backup']) {
    await section.selectOption(name);
    await expect(header.getByText('Synced with another Test tab', { exact: true })).toHaveCount(1);
    if (name !== 'content') {
      await expect(header.getByRole('button', { name: 'Back to Content' })).toBeVisible();
      await expect(header.getByRole('button', { name: /Upload files|Export backup/ })).toHaveCount(0);
    }
  }
  await section.selectOption('siteEditor');
  await expect(header.getByRole('link', { name: 'Back to Studio' })).toBeVisible();
  await expect(header.getByRole('button', { name: 'View', exact: true })).toBeVisible();
  await expect(header.getByRole('button', { name: 'View page' })).toBeVisible();
  await expect(header.getByText('Saved locally', { exact: true })).toBeVisible();
  await expect(header.getByRole('button', { name: 'Export', exact: true })).toHaveCount(0);
  await expect(header.getByRole('button', { name: 'Save', exact: true })).toHaveCount(0);
  await header.getByRole('button', { name: 'View page' }).click();
  await expect(example.locator(':scope > p[role="status"]')).toHaveText('View page completed in this example only.');
  await header.getByRole('button', { name: 'View', exact: true }).click();
  const siteEditorMenu = page.getByRole('menu', { name: 'View options' });
  await expect(siteEditorMenu).toBeVisible();
  await expect(siteEditorMenu.getByRole('menuitemradio', { name: /Editing View|Website View|Full Preview/ })).toHaveCount(0);
  await expect(siteEditorMenu.getByLabel('Focus Outline')).toBeVisible();
  await expect(siteEditorMenu.getByText('Use Styles → Blocks for device-specific style changes.')).toBeVisible();
  const showTemplate = siteEditorMenu.getByRole('menuitemcheckbox', { name: 'Show template' });
  await expect(showTemplate).toHaveAttribute('aria-checked', 'true');
  await showTemplate.click();
  await expect(showTemplate).toHaveAttribute('aria-checked', 'false');
  await expect(example.locator(':scope > p[role="status"]')).toHaveText('Hide template completed in this example only.');
  await expect(siteEditorMenu).toBeVisible();
  await page.getByRole('menuitemradio', { name: /Mobile/ }).click();
  await expect(example.getByLabel('Header example width')).toHaveValue('full');
  await header.getByRole('button', { name: 'View', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Preview in new tab' }).click();
  await expect(example.locator(':scope > p[role="status"]')).toHaveText('Preview in new tab completed in this example only.');
  await example.getByLabel('Header example scenario').selectOption('draft');
  await expect(header.getByText('Draft preview', { exact: true })).toBeVisible();
  await expect(header.getByText('Draft preview', { exact: true })).toHaveAttribute('title', 'This page has not been published.');
  await expect(header.getByText('Saved locally', { exact: true })).toBeVisible();
  await expect(header.getByRole('button', { name: 'View page' })).toHaveCount(0);
  await example.getByLabel('Header example width').selectOption('390');
  for (const status of await header.locator('.studio-save-status').all()) {
    const bounds = (await status.boundingBox())!;
    const parent = (await header.boundingBox())!;
    expect(bounds.x).toBeGreaterThanOrEqual(parent.x);
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(parent.x + parent.width + 1);
  }
  await example.getByLabel('Header example scenario').selectOption('published');
  await expect(header.getByText('Draft preview', { exact: true })).toHaveCount(0);
  await expect(header.getByRole('button', { name: 'View page' })).toBeVisible();
  await section.selectOption('designLibrary');
  await expect(header.getByText('Design Library', { exact: true })).toBeVisible();
  await section.selectOption('designs');
  await expect(header.getByText('Design Canvas', { exact: true })).toBeVisible();
  await expect(header.getByRole('link', { name: 'ACM Studio home' })).toHaveAttribute('href', '/');
  await section.selectOption('content');
  await example.getByLabel('Header example scenario').selectOption('readonly');
  await expect(header.getByRole('button', { name: 'Save', exact: true })).toBeDisabled();
  await page.goto('/studio/designs/library');
  const realDesignHeader = page.locator('.studio-app-header');
  await expect(realDesignHeader.getByText('Design Library', { exact: true })).toBeVisible();
  await expect(realDesignHeader.getByRole('link', { name: 'ACM Studio home' })).toHaveAttribute('href', '/');
  await page.goto('/studio/designs');
  await expect(page.locator('.studio-app-header').getByText('Design Canvas', { exact: true })).toBeVisible();
});

test('portalled View controls and preview commands stay inside the Library example', async ({ page, context }) => {
  await page.goto('/studio/ui/workspace#application-header');
  const example = page.locator('.ui-application-header-example');
  const globalFocus = page.locator('.ui-library > .studio-app-header').getByLabel('Focus Outline');
  const initialFocus = await globalFocus.inputValue();
  const initialPages = context.pages().length;
  await example.getByRole('button', { name: 'View', exact: true }).click();
  const menu = page.getByRole('menu', { name: 'View options' });
  await menu.getByLabel('Focus Outline').selectOption('on');
  await expect(globalFocus).toHaveValue(initialFocus);
  await menu.getByRole('menuitem', { name: 'Preview in new tab' }).click();
  await expect(example.locator(':scope > p[role="status"]')).toHaveText('Preview in new tab completed in this example only.');
  expect(context.pages()).toHaveLength(initialPages);
  await example.getByRole('button', { name: 'View', exact: true }).click();
  await expect(menu.getByLabel('Focus Outline')).toHaveValue('on');
  await page.keyboard.press('Escape');
  await expect(example.getByRole('button', { name: 'View', exact: true })).toBeFocused();
  await example.getByRole('button', { name: 'View', exact: true }).click();
  await example.getByRole('button', { name: 'Reset example' }).click();
  await expect(menu).toHaveCount(0);
  await example.getByRole('button', { name: 'View', exact: true }).click();
  await expect(menu.getByLabel('Focus Outline')).toHaveValue('keyboard');
});


test('Site Editor header returns from the isolated editing example', async ({ page }) => {
  await page.goto('/studio/ui/workspace#application-header');
  const example = page.locator('.ui-application-header-example');
  await expect(async () => {
    await example.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(example.locator(':scope > p[role="status"]')).toHaveText('Save completed in this example only.', { timeout: 1000 });
  }).toPass({ timeout: 15000 });
  await example.getByLabel('Header example section').selectOption('siteEditor');
  await example.getByLabel('Header example scenario').selectOption('editing');
  const header = example.locator('.studio-app-header');
  await header.getByRole('button', { name: 'Return to Preview' }).click();
  await expect(header.getByRole('link', { name: 'Back to Studio' })).toBeVisible();
  await expect(example.locator(':scope > p[role="status"]')).toHaveText('Return to Preview completed in this example only.');
  await expect(header.getByRole('link', { name: 'Back to Studio' })).toBeFocused();
});
