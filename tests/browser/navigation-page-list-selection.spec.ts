import { expect, test } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createStudioHttpFixture } from '../helpers/studio-http-fixture.mjs';

test('Navigation Page List selects as its own template child block and exposes Styles', async ({ page }, testInfo) => {
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
    await expect(inspector.getByText('Typography', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Select parent block: Navigation', exact: true })).toBeVisible();
  } finally {
    await fixture.close();
  }
});
