import { expect, test } from '@playwright/test';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createStudioHttpFixture } from '../helpers/studio-http-fixture.mjs';
import { revisionOf } from '../../scripts/test-site-store.mjs';

for (const custom of [false, true]) test(`mobile Navigation adds a site link inside the ${custom ? 'custom' : 'default'} overlay`, async ({ page }, testInfo) => {
  test.setTimeout(60000);
  const fixture = await createStudioHttpFixture({ frontendURL: String(testInfo.project.use.baseURL ?? 'http://localhost:3010') });
  try {
    const sourcePath = path.join(fixture.fixtureRoots.test2, 'content/site.json');
    const source = JSON.parse(await readFile(sourcePath, 'utf8'));
    source.navigationMenus[0].links[0].label = 'An intentionally long navigation link to trigger the mobile menu';
    await writeFile(sourcePath, JSON.stringify(source));
    await writeFile(path.join(fixture.fixtureRoots.test2, 'dist/index.html'), `<meta name="acm-test-revision" content="${revisionOf(source)}">`);
    const response = await fetch(`${fixture.origin}/__studio/test-site`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Studio-Client': 'codex-history', Origin: fixture.origin }, body: JSON.stringify({ action: 'global-read', siteId: 'test' }) });
    expect(response.ok).toBe(true);
    const snapshot = await response.json() as { library: import('../../app/studio/global-template-contract').GlobalTemplateLibrary };
    const set = snapshot.library.templates.sets.find(item => item.parts.some(part => part.kind === 'header'))!;
    const header = set.parts.find(part => part.kind === 'header')!;
    if (custom) set.parts.push({ id: 'mobile-overlay', name: 'Mobile overlay', kind: 'overlay', nodes: [{ id: 'mobile-overlay-nav', type: 'element', element: 'navigation', overlayMenu: 'never' }] });
    header.nodes = [{ id: 'mobile-navigation', type: 'element', element: 'navigation', overlayMenu: 'mobile', ...(custom ? { overlayPartId: 'mobile-overlay' } : {}) }];
    await mkdir(path.join(fixture.globalRoot, 'work'), { recursive: true });
    await writeFile(path.join(fixture.globalRoot, 'work/global-template-library.json'), JSON.stringify(snapshot.library));
    await page.goto(`${fixture.origin}/studio?site=test2&mode=templates&scope=global&set=${encodeURIComponent(set.id)}&target=${encodeURIComponent(header.id)}`);
    const nav = page.locator('.template-authoring-surface .template-navigation').first();
    await expect(nav).toBeVisible({ timeout: 30000 });
    await page.getByRole('separator', { name: 'Resize template preview from right edge' }).focus();
    await page.keyboard.press('Home');
    await nav.click();
    const menu = nav.locator(':scope > .template-navigation-overlay');
    const opener = menu.locator(':scope > summary');
    await expect(opener).toBeVisible();
    await expect(nav.locator('.template-navigation-desktop .navigation-appender')).toHaveCount(1);
    await expect(nav.locator('.navigation-appender:visible')).toHaveCount(0);
    const block = page.locator('[data-studio-block-anchor-id="mobile-navigation"]');
    await expect(block.locator('.canvas-paragraph-inserter')).toBeHidden();
    await opener.click();
    const appender = menu.locator('.navigation-appender');
    await expect(appender).toBeVisible();
    const add = appender.getByRole('button', { name: 'Add navigation link' });
    await expect(add).toHaveCSS('background-color', 'rgb(30, 30, 30)');
    await add.click();
    await page.keyboard.press('Escape');
    await expect(add).toBeFocused();
    await add.click();
    const picker = page.getByRole('dialog', { name: 'Add navigation link' });
    await expect(picker).toBeVisible();
    await picker.getByRole('textbox', { name: 'Search or type URL' }).fill('/mobile-added');
    await picker.getByRole('textbox', { name: 'Search or type URL' }).press('Enter');
    await expect(menu.locator('a:visible').filter({ hasText: '/mobile-added' })).toBeVisible();
    await expect(menu.locator('a:visible').filter({ hasText: '/mobile-added' })).toBeFocused();
    await menu.locator('a:visible').filter({ hasText: '/mobile-added' }).click();
    await expect(menu).toHaveAttribute('open', '');
    await nav.getByRole('button', { name: 'Close menu' }).click();
    await expect(appender).toHaveCount(0);
    await expect(opener).toBeVisible();
    await page.getByRole('button', { name: 'Preview', exact: true }).click();
    await expect(nav.locator('.navigation-appender')).toHaveCount(0);
  } finally { await fixture.close(); }
});

test('Navigation Library mobile example uses the same picker and respects read-only', async ({ page }) => {
  await page.goto('/studio/ui/blocks/navigation');
  const example = page.locator('details').filter({ has: page.getByText('Mobile menu example', { exact: true }) });
  await example.locator(':scope > summary').click();
  const nav = example.locator('.template-navigation').first();
  await nav.getByLabel('Open menu').click();
  const add = nav.getByRole('button', { name: 'Add navigation link' });
  await expect(add).toBeVisible();
  await expect(add).toHaveCSS('background-color', 'rgb(30, 30, 30)');
  await add.click();
  await expect(page.getByRole('dialog', { name: 'Add navigation link' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(add).toBeFocused();
  await nav.getByRole('button', { name: 'Close menu' }).click();
  await page.getByLabel('Read-only example').check();
  await nav.getByLabel('Open menu').click();
  await expect(nav.locator('.navigation-appender')).toHaveCount(0);
});

test('Navigation Library loads without hydration errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/studio/ui/blocks/navigation');
  await expect(page.getByText('Mobile menu example')).toBeVisible();
  expect(errors.filter(error => /hydrat/i.test(error))).toEqual([]);
});
