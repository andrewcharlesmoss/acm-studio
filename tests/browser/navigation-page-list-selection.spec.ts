import { expect, test } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createStudioHttpFixture } from '../helpers/studio-http-fixture.mjs';

test('Navigation Page List selects as its own template child block and exposes Gutenberg pane settings and styles', async ({ page }, testInfo) => {
  test.setTimeout(60000);
  const fixture = await createStudioHttpFixture({ frontendURL: String(testInfo.project.use.baseURL ?? 'http://localhost:3010') });
  try {
    const response = await fetch(`${fixture.origin}/__studio/test-site`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Studio-Client': 'codex-page-list-selection', Origin: fixture.origin },
      body: JSON.stringify({ action: 'global-read', siteId: 'test' }),
    });
    expect(response.ok).toBe(true);
    const snapshot = await response.json() as { library: import('../../app/studio/global-template-contract').GlobalTemplateLibrary };
    const set = snapshot.library.templates.sets.find(item => item.parts.some(part => part.kind === 'header'))!;
    const header = set.parts.find(part => part.kind === 'header')!;
    header.nodes = [{
      id: 'page-list-selection-navigation',
      type: 'element',
      element: 'navigation',
    }];
    await mkdir(path.join(fixture.globalRoot, 'work'), { recursive: true });
    await writeFile(path.join(fixture.globalRoot, 'work/global-template-library.json'), JSON.stringify(snapshot.library));

    await page.goto(`${fixture.origin}/studio?site=test2&mode=templates&scope=global&set=${encodeURIComponent(set.id)}&target=${encodeURIComponent(header.id)}`);
    await page.getByRole('button', { name: 'List View', exact: true }).click();
    await page.getByRole('button', { name: 'Navigation', exact: true }).click();
    await page.getByRole('button', { name: 'Close List View', exact: true }).click();
    await page.getByRole('button', { name: 'Add block', exact: true }).click();
    await page.getByRole('searchbox', { name: 'Search blocks', exact: true }).fill('page list');
    await page.getByRole('button', { name: 'Page List', exact: true }).click();
    const pageList = page.locator('[data-navigation-page-list-id]');
    await expect(pageList).toBeVisible({ timeout: 30000 });
    await pageList.click();
    await expect(pageList).toHaveClass(/is-selected/);
    await expect(pageList.getByRole('group', { name: 'Page List block tools', exact: true })).toBeVisible();
    const blockId = await pageList.getAttribute('data-navigation-page-list-id');
    const inspector = page.locator(`[data-selected-template-block-id="${blockId}"]`);
    await expect(inspector).toBeVisible();
    await expect(inspector.getByRole('heading', { name: 'Page List', exact: true })).toBeVisible();
    await expect(inspector.getByRole('tab', { name: 'Settings' })).toBeVisible();
    await expect(inspector.getByRole('tab', { name: 'Styles' })).toBeVisible();
    await expect(inspector.getByRole('combobox', { name: 'Parent page' })).toBeVisible();
    await expect(inspector.locator('datalist option')).toHaveCount(3);
    await expect(inspector.getByText('Choose a page to show only its subpages.', { exact: true })).toBeVisible();
    await expect(inspector.getByRole('button', { name: 'Edit', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'List View', exact: true }).click();
    const listView = page.getByRole('complementary', { name: 'List View' });
    await listView.getByRole('button', { name: 'Navigation', exact: true }).click();
    await listView.getByRole('button', { name: 'Page List', exact: true }).click();
    await expect(inspector.getByRole('combobox', { name: 'Parent page' })).toBeVisible();
    await expect(inspector.getByRole('button', { name: 'Edit', exact: true })).toBeVisible();
    await expect(pageList).toHaveClass(/is-selected/);
    await expect(pageList.getByRole('group', { name: 'Page List block tools', exact: true })).toBeVisible();
    await listView.getByRole('button', { name: 'Close List View' }).click();
    await inspector.getByRole('button', { name: 'Advanced', exact: true }).click();
    await expect(inspector.getByLabel('HTML anchor')).toBeVisible();
    await expect(inspector.getByLabel('Additional CSS class(es)')).toBeVisible();
    await expect(inspector.getByLabel('Additional CSS')).toBeVisible();
    await inspector.getByRole('tab', { name: 'Styles' }).click();
    await expect(inspector.getByText('Typography', { exact: true })).toBeVisible();
    await expect(inspector.getByRole('button', { name: 'Colour', exact: true })).toBeVisible();
    await expect(inspector.getByText('Font size', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Select parent block: Navigation', exact: true })).toBeVisible();

    await page.goto(`${fixture.origin}/studio/ui/blocks/navigation-page-list`);
    const libraryInspector = page.locator('[data-selected-template-block-id="navigation-page-list-specimen"]');
    await expect(libraryInspector).toBeVisible();
    await expect(libraryInspector.getByRole('heading', { name: 'Page List', exact: true })).toBeVisible();
    await expect(libraryInspector.getByRole('combobox', { name: 'Parent page' })).toBeVisible();
    await libraryInspector.getByRole('combobox', { name: 'Parent page' }).fill('About');
    const libraryPageList = page.locator('[data-navigation-page-list-id="navigation-page-list-specimen"]');
    await expect(libraryPageList.getByText('Team', { exact: true })).toBeVisible();
    await expect(libraryPageList.getByText('History', { exact: true })).toBeVisible();
    await expect(libraryPageList.getByText('Home', { exact: true })).toHaveCount(0);
    await expect(libraryPageList.getByText('Guides', { exact: true })).toHaveCount(0);
    await libraryInspector.getByRole('combobox', { name: 'Parent page' }).fill('Team');
    await expect(libraryPageList).toBeVisible();
    await expect(libraryPageList.getByText('Team', { exact: true })).toHaveCount(0);
    await expect(libraryPageList.getByText('History', { exact: true })).toHaveCount(0);
    await expect(libraryInspector.getByRole('button', { name: 'Edit', exact: true })).toBeVisible();
    await libraryInspector.getByRole('button', { name: 'Advanced', exact: true }).click();
    await expect(libraryInspector.getByLabel('HTML anchor')).toBeVisible();
    await libraryInspector.getByRole('tab', { name: 'Styles' }).click();
    await expect(libraryInspector.getByText('Typography', { exact: true })).toBeVisible();
  } finally {
    await fixture.close();
  }
});
