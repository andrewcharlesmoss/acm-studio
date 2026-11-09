import { expect, test } from '@playwright/test';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createStudioHttpFixture } from '../helpers/studio-http-fixture.mjs';
import { loadProductionModule } from '../production-module.mjs';

test('Header selection breadcrumbs and List View expose real ancestors, menu links and one typed Page List', async ({ page }, testInfo) => {
  test.setTimeout(90000);
  const fixture = await createStudioHttpFixture({ frontendURL: String(testInfo.project.use.baseURL ?? 'http://localhost:3010') });
  try {
    const response = await fetch(`${fixture.origin}/__studio/test-site`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Studio-Client': 'codex-history', Origin: fixture.origin }, body: JSON.stringify({ action: 'global-read', siteId: 'test' }) });
    expect(response.ok).toBe(true);
    const snapshot = await response.json() as { library: import('../../app/studio/global-template-contract').GlobalTemplateLibrary };
    const set = snapshot.library.templates.sets.find(item => item.id === 'studio-twenty-twenty-five-parts')!;
    const header = set.parts.find(part => part.id === 'tt5-header')!;
    const { createReferenceTemplateParts } = await loadProductionModule(new URL('../../app/studio/reference-template-parts.ts', import.meta.url));
    header.nodes = createReferenceTemplateParts().parts.find((part: { id: string }) => part.id === 'tt5-header').nodes;
    const nodes = (items: import('../../app/studio/template-model').TemplateNode[]): import('../../app/studio/template-model').TemplateNode[] => items.flatMap(node => [node, ...(node.type === 'group' || node.type === 'section' || node.type === 'columns' || node.type === 'column' ? nodes(node.children) : [])]);
    const navigation = nodes(header.nodes).find(node => node.type === 'element' && node.element === 'navigation') as import('../../app/studio/template-model').NavigationTemplateNode;
    expect(navigation.pageListBlock?.type).toBe('navigation-page-list');
    navigation.overlayMenu = 'never';
    await mkdir(path.join(fixture.globalRoot, 'work'), { recursive: true });
    const globalPath = path.join(fixture.globalRoot, 'work/global-template-library.json');
    await writeFile(globalPath, JSON.stringify(snapshot.library));
    await page.setViewportSize({ width: 1920, height: 1000 });
    await page.goto(`${fixture.origin}/studio?site=test2&mode=templates&scope=global&set=${set.id}&target=${header.id}`);
    const headerTrail = page.getByRole('navigation', { name: 'Breadcrumb', exact: true });
    await expect(headerTrail.getByRole('link', { name: 'Template Part', exact: true })).toBeVisible();
    await expect(headerTrail).toContainText('Header');
    const trail = page.getByRole('navigation', { name: 'Block selection path', exact: true });
    await expect(trail).toContainText('Template Part');
    await expect(trail.getByRole('button', { name: 'Header', exact: true })).toBeVisible();
    await page.locator('.template-authoring-surface > .template-header .template-site-title-text').click();
    await expect(trail).toContainText('Site Title');
    await page.getByRole('button', { name: 'List View', exact: true }).click();
    const list = page.getByRole('complementary', { name: 'List View', exact: true });
    const rowInList = list.getByRole('button', { name: 'Row', exact: true });
    await expect(rowInList).toHaveCount(1);
    await rowInList.click();
    await expect(trail.getByRole('button', { name: 'Row', exact: true })).toBeVisible();
    await expect(page.getByRole('radiogroup', { name: 'Group layout', exact: true }).getByRole('radio', { name: 'Row', exact: true })).toBeChecked();
    await trail.getByRole('button', { name: 'Header', exact: true }).click();
    await expect(trail.getByRole('button')).toHaveCount(1);
    const headerRoot = list.locator('nav > ol > li > .studio-list-item > .studio-list-select');
    await expect(headerRoot).toHaveText('Header');
    const headerChildren = headerRoot.locator('xpath=ancestor::li[1]').locator(':scope > ol > li > .studio-list-item > .studio-list-select');
    await expect(headerChildren.first()).toHaveText('Row');
    const rowChildren = headerChildren.first().locator('xpath=ancestor::li[1]').locator(':scope > ol > li > .studio-list-item > .studio-list-select');
    await expect(rowChildren.first()).toHaveText('Group');
    await list.getByRole('button', { name: 'Navigation', exact: true }).click();
    await headerRoot.click();
    await expect(headerRoot).toHaveAttribute('aria-current', 'true');
    await expect(page.getByRole('tab', { name: 'Block', exact: true })).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('tab', { name: 'Template Part', exact: true })).toHaveAttribute('aria-selected', 'false');
    await list.getByRole('button', { name: 'Navigation', exact: true }).click();
    await expect(list).toBeVisible();
    await expect(list.getByRole('button', { name: 'Page List', exact: true })).toHaveCount(1);
    const pageListRow = list.getByRole('button', { name: 'Page List', exact: true }).locator('xpath=ancestor::li[1]');
    const navigationRow = list.getByRole('button', { name: 'Navigation', exact: true }).locator('xpath=ancestor::li[1]');
    await expect(navigationRow.locator(':scope > ol > li')).toHaveCount(1);
    await expect(pageListRow.locator(':scope > ol .studio-list-select')).not.toHaveCount(0);
    await expect(pageListRow.locator(':scope > ol .studio-list-select')).toHaveText(['Hello from WordPress Playground!', 'Sample Page']);
    const surface = page.locator('.template-authoring-surface > .template-header');
    const title = surface.locator('.template-site-title-text');
    const headerGroup = surface.locator('.template-group.tt5-header-row').first();
    const headerNavigation = surface.locator('.template-navigation').first();
    const pageListItems = headerNavigation.locator(':scope > .template-navigation-desktop > .template-navigation-items > .template-navigation-page-list > .template-navigation-page-list-items');
    await expect(headerGroup).toHaveCSS('display', 'flex');
    await expect(headerGroup).toHaveCSS('flex-direction', 'row');
    await expect(pageListItems).toHaveCSS('display', 'flex');
    await expect(pageListItems).toHaveCSS('flex-wrap', 'wrap');
    const pageListLabels = pageListItems.locator(':scope > li > a');
    await expect(pageListLabels).toHaveText(['Hello from WordPress Playground!', 'Sample Page']);
    const desktopNavigationList = headerNavigation.locator(':scope > .template-navigation-desktop > .template-navigation-items');
    await expect(desktopNavigationList.locator(':scope > li:not([data-navigation-page-list])')).toHaveCount(0);
    for (const label of await pageListLabels.all()) {
      const box = await label.boundingBox();
      expect(box).not.toBeNull();
      const lineHeight = await label.evaluate(element => Number.parseFloat(getComputedStyle(element).lineHeight));
      expect(box!.height).toBeLessThanOrEqual(lineHeight + 1);
    }
    const headerGroupBox = await headerGroup.boundingBox();
    const titleBox = await title.boundingBox();
    const navigationBox = await headerNavigation.boundingBox();
    expect(headerGroupBox).not.toBeNull();
    expect(titleBox).not.toBeNull();
    expect(navigationBox).not.toBeNull();
    expect(titleBox!.x).toBeGreaterThanOrEqual(headerGroupBox!.x - 1);
    expect(titleBox!.x + titleBox!.width).toBeLessThanOrEqual(navigationBox!.x + 1);
    expect(Math.abs((titleBox!.y + titleBox!.height / 2) - (navigationBox!.y + navigationBox!.height / 2))).toBeLessThan(3);
    const pageListBox = await pageListItems.boundingBox();
    expect(pageListBox).not.toBeNull();
    expect(pageListBox!.x).toBeGreaterThanOrEqual(navigationBox!.x - 1);
    expect(pageListBox!.x + pageListBox!.width).toBeLessThanOrEqual(navigationBox!.x + navigationBox!.width + 1);
    for (const width of [1920, 900, 560]) {
      await page.setViewportSize({ width, height: 1000 });
      const surfaceBox = await surface.boundingBox();
      const titleBox = await title.boundingBox();
      expect(surfaceBox).not.toBeNull();
      expect(titleBox).not.toBeNull();
      expect(titleBox!.x).toBeGreaterThanOrEqual(surfaceBox!.x - 1);
      expect(titleBox!.x + titleBox!.width).toBeLessThanOrEqual(surfaceBox!.x + surfaceBox!.width + 1);
    }
    await page.setViewportSize({ width: 1920, height: 1000 });
    const previewResize = page.getByRole('separator', { name: 'Resize template preview from right edge' });
    await previewResize.press('Home');
    await expect(previewResize).toHaveAttribute('aria-valuenow', '320');
    const narrowSurface = await surface.boundingBox();
    expect(narrowSurface).not.toBeNull();
    for (const content of [title, headerNavigation, pageListItems]) {
      const box = await content.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.x).toBeGreaterThanOrEqual(narrowSurface!.x - 1);
      expect(box!.x + box!.width).toBeLessThanOrEqual(narrowSurface!.x + narrowSurface!.width + 1);
    }
    for (const label of await pageListLabels.all()) {
      const labelLines = await label.evaluate(element => {
        const range = document.createRange();
        range.selectNodeContents(element);
        return Array.from(range.getClientRects()).map(rect => ({ left: rect.left, right: rect.right }));
      });
      for (const line of labelLines) {
        expect(line.left).toBeGreaterThanOrEqual(narrowSurface!.x - 1);
        expect(line.right).toBeLessThanOrEqual(narrowSurface!.x + narrowSurface!.width + 1);
      }
    }
    await page.setViewportSize({ width: 1920, height: 1000 });
    await expect(pageListRow.locator(':scope > ol .studio-list-select').first()).toBeVisible();
    await pageListRow.locator(':scope > ol .studio-list-select').first().click();
    await expect(page.getByRole('combobox', { name: 'Parent page', exact: true })).toBeVisible();
    await list.getByRole('button', { name: 'Page List', exact: true }).click();
    await expect(page.getByRole('combobox', { name: 'Parent page', exact: true })).toBeVisible();
    await expect(trail.getByRole('button', { name: 'Page List', exact: true })).toHaveAttribute('aria-current', 'location');
    await expect(list.getByRole('button', { name: 'Collapse Navigation', exact: true })).toBeVisible();
    await list.getByRole('button', { name: 'Collapse Header', exact: true }).click();
    await expect(list.getByRole('button', { name: 'Navigation', exact: true })).toHaveCount(0);
    await list.getByRole('button', { name: 'Expand Header', exact: true }).click();
    await expect(list.getByRole('button', { name: 'Page List', exact: true })).toHaveCount(1);
    expect(JSON.parse(await readFile(globalPath, 'utf8')).templates.sets.find((item: { id: string }) => item.id === set.id).parts.find((item: { id: string }) => item.id === header.id).nodes).toEqual(header.nodes);
  } finally { await fixture.close(); }
});
