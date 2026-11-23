import { expect, test } from '@playwright/test';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { CurrentTestSiteCollection } from '../../app/studio/test-site/contract';
import { revisionOf } from '../../scripts/test-site-store.mjs';
import { createStudioHttpFixture } from '../helpers/studio-http-fixture.mjs';

test('Navigation Page List selects as its own template child block and exposes Gutenberg pane settings and styles', async ({ page }, testInfo) => {
  test.setTimeout(60000);
  const fixture = await createStudioHttpFixture({ frontendURL: String(testInfo.project.use.baseURL ?? 'http://localhost:3010') });
  try {
    const siteRoot = fixture.fixtureRoots.test2;
    const sourcePath = path.join(siteRoot, 'content/site.json');
    const source: CurrentTestSiteCollection = JSON.parse(await readFile(sourcePath, 'utf8'));
    const home = source.documents[0];
    for (const title of ['About', 'Contact']) {
      const slug = title.toLowerCase();
      source.documents.push({ ...home, id: `test2-${slug}`, title, slug, blocks: [] });
    }
    await writeFile(sourcePath, JSON.stringify(source));
    await writeFile(path.join(siteRoot, 'dist/index.html'), `<meta name="acm-test-revision" content="${revisionOf(source)}">`);
    const response = await fetch(`${fixture.origin}/__studio/test-site`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Studio-Client': 'codex-history', Origin: fixture.origin },
      body: JSON.stringify({ action: 'global-read', siteId: 'test' }),
    });
    expect(response.status).toBe(200);
    const snapshot = await response.json() as { library: import('../../app/studio/global-template-contract').GlobalTemplateLibrary };
    const set = snapshot.library.templates.sets.find(item => item.parts.some(part => part.kind === 'header'))!;
    const header = set.parts.find(part => part.kind === 'header')!;
    header.nodes = [{
      id: 'page-list-selection-navigation',
      type: 'element',
      element: 'navigation',
      overlayMenu: 'mobile',
    }];
    await mkdir(path.join(fixture.globalRoot, 'work'), { recursive: true });
    await writeFile(path.join(fixture.globalRoot, 'work/global-template-library.json'), JSON.stringify(snapshot.library));

    await page.setViewportSize({ width: 1920, height: 1000 });
    await page.goto(`${fixture.origin}/studio?site=test2&mode=templates&scope=global&set=${encodeURIComponent(set.id)}&target=${encodeURIComponent(header.id)}`);
    await page.getByRole('button', { name: 'List View', exact: true }).click();
    const listView = page.getByRole('complementary', { name: 'List View', exact: true });
    await listView.getByRole('button', { name: 'Navigation', exact: true }).click();
    await listView.getByRole('button', { name: 'Close List View', exact: true }).click();
    await page.getByRole('group', { name: 'Editor tools', exact: true }).getByRole('button', { name: 'Add block', exact: true }).click();
    await page.getByRole('searchbox', { name: 'Search blocks', exact: true }).fill('page list');
    const blockLibrary = page.getByRole('complementary', { name: 'Block Library', exact: true });
    await blockLibrary.getByRole('button', { name: 'Page List', exact: true }).click();
    await blockLibrary.getByRole('button', { name: 'Close block library', exact: true }).click();
    const pageList = page.getByRole('group', { name: 'Page List block', exact: true });
    await expect(pageList).toBeVisible({ timeout: 30000 });
    await page.getByRole('navigation', { name: 'Block selection path' }).getByRole('button', { name: 'Navigation', exact: true }).click();
    await expect(pageList).not.toHaveClass(/is-selected/);
    await pageList.getByRole('link', { name: 'Contact', exact: true }).click();
    await expect(pageList).toHaveClass(/is-selected/);
    await expect(pageList.getByRole('group', { name: 'Page List block tools', exact: true })).toBeVisible();
    const blockId = await pageList.getAttribute('data-navigation-page-list-id');
    const inspector = page.locator(`[data-selected-template-block-id="${blockId}"]`);
    await expect(inspector).toBeVisible();
    await expect(inspector.getByRole('heading', { name: 'Page List', exact: true })).toBeVisible();
    await expect(inspector.getByRole('tab', { name: 'Settings' })).toBeVisible();
    await expect(inspector.getByRole('tab', { name: 'Styles' })).toBeVisible();
    await expect(inspector.getByRole('combobox', { name: 'Parent page' })).toBeVisible();
    const parentOptions = inspector.locator('datalist option');
    await expect.poll(() => parentOptions.evaluateAll(options => options.map(option => option.getAttribute('value')).sort()))
      .toEqual(['About', 'Contact', home.title].sort());
    await expect(inspector.getByText('Choose a page to show only its subpages.', { exact: true })).toBeVisible();
    await expect(inspector.getByRole('button', { name: 'Edit', exact: true })).toBeDisabled();
    await page.getByRole('button', { name: 'List View', exact: true }).click();
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
    await expect(inspector.getByRole('textbox', { name: 'Additional CSS', exact: true })).toBeVisible();
    await inspector.getByRole('tab', { name: 'Styles' }).click();
    await expect(inspector.getByText('Typography', { exact: true })).toBeVisible();
    await expect(inspector.getByRole('button', { name: 'Colour', exact: true })).toBeVisible();
    await expect(inspector.getByRole('group', { name: 'Font size', exact: true })).toBeVisible();
    const tools = pageList.getByRole('group', { name: 'Page List block tools', exact: true });
    await expect(tools.getByRole('button', { name: 'Edit Page List', exact: true })).toBeDisabled();
    await expect.poll(() => pageList.evaluate(element => getComputedStyle(element, '::before').borderTopWidth)).toBe('1px');
    await tools.getByRole('button', { name: 'Move Page List left' }).click();
    await expect(tools.getByRole('button', { name: 'Move Page List left' })).toBeDisabled();
    await expect(tools.getByRole('button', { name: 'Move Page List right' })).toBeEnabled();
    await tools.getByRole('button', { name: 'Select parent block: Navigation', exact: true }).click();
    await expect(pageList).not.toHaveClass(/is-selected/);
    await pageList.focus();
    await pageList.press('Enter');
    await expect(tools).toBeVisible();

    const resize = page.getByRole('separator', { name: 'Resize template preview from right edge' });
    await resize.press('Home');
    await page.getByLabel('Open menu', { exact: true }).click();
    const overlay = page.locator('.template-navigation-overlay[open]');
    await overlay.getByRole('link', { name: 'Contact', exact: true }).click();
    await expect(overlay).toBeVisible();
    await expect(overlay.getByRole('group', { name: 'Page List block', exact: true })).toHaveClass(/is-selected/);
    await overlay.getByRole('button', { name: 'Close menu', exact: true }).click();
    await resize.press('End');
    await page.getByRole('group', { name: 'part view' }).getByRole('button', { name: 'Preview' }).click();
    await expect(page.getByRole('link', { name: 'Contact', exact: true })).toBeVisible();
    await expect(page.getByRole('group', { name: 'Page List block tools' })).toHaveCount(0);

    await page.goto(`${fixture.origin}/studio/ui/blocks/navigation-page-list`);
    await expect(page.locator(".ui-block-specimen")).toHaveAttribute("data-ready", "true");
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
    await libraryInspector.getByRole('tab', { name: 'Settings' }).click();
    await libraryInspector.getByRole('combobox', { name: 'Parent page' }).fill('About');
    await libraryPageList.getByRole('button', { name: 'Edit Page List', exact: true }).click();
    await expect(libraryPageList).toHaveCount(0);
    const specimen = page.locator('.ui-block-canvas');
    await expect(specimen.getByRole('textbox', { name: 'Navigation link text: Team', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Undo specimen change' }).click();
    await expect(libraryPageList.getByText('Team', { exact: true })).toBeVisible();
    await expect(specimen.getByRole('textbox', { name: 'Navigation link text: Team', exact: true })).toHaveCount(0);
  } finally {
    await fixture.close();
  }
});
