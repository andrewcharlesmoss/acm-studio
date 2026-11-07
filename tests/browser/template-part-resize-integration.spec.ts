import { expect, test } from '@playwright/test';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createStudioHttpFixture } from '../helpers/studio-http-fixture.mjs';
import { revisionOf } from '../../scripts/test-site-store.mjs';

test('shared Header and Footer resize their visible editor surface without saving', async ({ page }, testInfo) => {
  test.setTimeout(90000);
  const fixture = await createStudioHttpFixture({ frontendURL: String(testInfo.project.use.baseURL ?? 'http://localhost:3010') });
  try {
    const fixturePath = path.join(fixture.fixtureRoots.test2, 'content/site.json');
    const fixtureSource = JSON.parse(await readFile(fixturePath, 'utf8'));
    fixtureSource.navigationMenus[0].links[0].label = 'A deliberately long temporary navigation link for mobile preview testing';
    await writeFile(fixturePath, JSON.stringify(fixtureSource));
    await writeFile(path.join(fixture.fixtureRoots.test2, 'dist/index.html'), `<meta name="acm-test-revision" content="${revisionOf(fixtureSource)}">`);
    const response = await fetch(`${fixture.origin}/__studio/test-site`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Studio-Client': 'codex-history', Origin: fixture.origin }, body: JSON.stringify({ action: 'global-read', siteId: 'test' }) });
    expect(response.ok).toBe(true);
    const snapshot = await response.json() as { library: import('../../app/studio/global-template-contract').GlobalTemplateLibrary };
    const set = snapshot.library.templates.sets.find(item => item.parts.some(part => part.kind === 'header'))!;
    const responsiveStyle = { textColor: '#111111', responsive: { mobile: { textColor: '#ff0000' }, tablet: { textColor: '#0000ff' } } };
    set.parts.find(part => part.kind === 'header')!.nodes.push({ id: 'resize-header-responsive', type: 'paragraph', text: 'Responsive fixture', style: responsiveStyle }, { id: 'resize-header-selection', type: 'paragraph', text: 'Selection fixture' }, { id: 'resize-header-navigation', type: 'element', element: 'navigation', overlayMenu: 'mobile' });
    set.parts.push({ id: 'resize-fixture-footer', name: 'Footer', kind: 'footer', nodes: [{ id: 'resize-fixture-copyright', type: 'element', element: 'copyright' }, { id: 'resize-footer-responsive', type: 'paragraph', text: 'Responsive fixture', style: responsiveStyle }] });
    await mkdir(path.join(fixture.globalRoot, 'work'), { recursive: true });
    await writeFile(path.join(fixture.globalRoot, 'work/global-template-library.json'), JSON.stringify(snapshot.library));
    await page.addInitScript(() => {
      localStorage.setItem('acm-studio-template-header-canvas-view-v1', 'fit');
      localStorage.setItem('acm-studio-template-footer-canvas-view-v1', 'fit');
    });
    for (const kind of ['header', 'footer'] as const) {
      const part = set.parts.find(item => item.kind === kind)!;
      await page.setViewportSize({ width: 1440, height: 1000 });
      await page.goto(`${fixture.origin}/studio?site=test2&mode=templates&scope=global&set=${encodeURIComponent(set.id)}&target=${encodeURIComponent(part.id)}`);
      const region = page.locator(`.template-authoring-surface > .template-${kind}`);
      const right = page.getByRole('separator', { name: 'Resize template preview from right edge' });
      const left = page.getByRole('separator', { name: 'Resize template preview from left edge' });
      await expect(region).toBeVisible({ timeout: 30000 });
      await expect(left).toBeVisible(); await expect(right).toBeVisible();
      if (kind === 'header') {
        const firstBlock = region.locator('[data-studio-block-anchor-id="resize-header-responsive"]');
        const secondBlock = region.locator('[data-studio-block-anchor-id="resize-header-selection"]');
        await firstBlock.click(); await secondBlock.click({ modifiers: ['Shift'] });
        const selection = page.getByRole('status').filter({ hasText: '2 blocks selected' });
        await expect(selection).toBeVisible();
        await right.scrollIntoViewIfNeeded(); await right.click();
        await expect(selection).toBeVisible();
      }
      await right.scrollIntoViewIfNeeded();
      await right.click(); await left.focus();
      await expect(page.locator('.template-editing')).not.toHaveClass(/template-part-custom-width/);
      const before = await region.boundingBox();
      const scroll = page.locator('.template-fit-part .editor-canvas-scroll');
      const viewport = (await scroll.boundingBox())!;
      expect(Math.abs((before!.y + before!.height / 2) - (viewport.y + viewport.height / 2))).toBeLessThan(3);
      await right.focus(); await page.keyboard.press('ArrowLeft');
      const after = await region.boundingBox();
      expect(before!.width - after!.width).toBeCloseTo(10, 0);
      const globalPath = path.join(fixture.globalRoot, 'work/global-template-library.json');
      const saved = await readFile(globalPath, 'utf8');
      await left.focus(); await page.keyboard.press('ArrowLeft');
      await expect.poll(async () => (await region.boundingBox())!.width).toBeCloseTo(before!.width, 0);
      await right.focus(); await page.keyboard.press('Enter');
      await expect(page.locator('.template-editing')).not.toHaveClass(/template-part-custom-width/);
      await right.scrollIntoViewIfNeeded();
      const grip = (await right.boundingBox())!;
      await page.mouse.move(grip.x + grip.width / 2, grip.y + grip.height / 2);
      await page.mouse.down(); await page.mouse.move(grip.x + grip.width / 2 - 15, grip.y + grip.height / 2);
      await expect.poll(async () => (await region.boundingBox())!.width).toBeCloseTo(before!.width - 30, 0);
      await page.keyboard.press('Escape'); await page.mouse.up();
      await expect(page.locator('.template-editing')).not.toHaveClass(/template-part-custom-width/);
      await expect.poll(async () => (await region.boundingBox())!.width).toBeCloseTo(before!.width, 0);
      await page.getByRole('button', { name: 'View', exact: true }).click();
      await page.getByRole('menuitemradio', { name: /Tablet/ }).click();
      await expect(page.locator('.template-editing')).not.toHaveClass(/template-part-custom-width/);
      await expect.poll(async () => (await region.boundingBox())!.width).toBeLessThan(before!.width);
      await page.getByRole('button', { name: 'View', exact: true }).click();
      await page.getByRole('menuitemradio', { name: /Desktop/ }).click();
      await expect.poll(async () => (await region.boundingBox())!.width).toBeCloseTo(before!.width, 0);
      expect(await readFile(globalPath, 'utf8')).toBe(saved);
      await page.getByRole('button', { name: 'Preview', exact: true }).click();
      await expect(region).toBeVisible();
      await expect(left).toBeVisible(); await expect(right).toBeVisible();
      const previewWidth = (await region.boundingBox())!.width;
      await right.focus(); await page.keyboard.press('ArrowLeft');
      await expect.poll(async () => (await region.boundingBox())!.width).toBeCloseTo(previewWidth - 10, 0);
      await right.focus(); await page.keyboard.press('Home');
      await expect.poll(async () => Math.round((await region.boundingBox())!.width)).toBe(Number(await right.getAttribute('aria-valuemin')));
      const responsiveText = region.getByText('Responsive fixture', { exact: true });
      await expect(responsiveText).toHaveCSS('color', 'rgb(255, 0, 0)');
      await left.focus();
      for (let step = 0; step < 8; step++) { await page.keyboard.press('Shift+ArrowLeft'); await expect(right).toHaveAttribute('aria-valuenow', String(340 + step * 20)); }
      await expect(right).toHaveAttribute('aria-valuenow', '480');
      await expect(responsiveText).toHaveCSS('color', 'rgb(255, 0, 0)');
      await page.keyboard.press('ArrowLeft');
      await expect(responsiveText).toHaveCSS('color', 'rgb(0, 0, 255)');
      for (let step = 0; step < 14; step++) { await page.keyboard.press('Shift+ArrowLeft'); await expect(right).toHaveAttribute('aria-valuenow', String(510 + step * 20)); }
      await page.keyboard.press('ArrowLeft');
      await expect(right).toHaveAttribute('aria-valuenow', '780');
      await expect(responsiveText).toHaveCSS('color', 'rgb(0, 0, 255)');
      await page.keyboard.press('ArrowLeft');
      await expect(responsiveText).toHaveCSS('color', 'rgb(17, 17, 17)');
      await right.focus(); await page.keyboard.press('Home');

      const narrowPart = (await region.boundingBox())!;
      const workspace = (await scroll.boundingBox())!;
      expect(Math.abs((narrowPart.x + narrowPart.width / 2) - (workspace.x + workspace.width / 2))).toBeLessThan(3);
      await right.focus(); await page.keyboard.press('End');
      await expect.poll(async () => Math.round((await region.boundingBox())!.width)).toBe(Number(await right.getAttribute('aria-valuemax')));
      await right.focus(); await page.keyboard.press('Enter');
      await expect.poll(async () => Math.round((await region.boundingBox())!.width)).toBe(Math.round(before!.width));
      if (kind === 'header') {
        await right.focus(); await page.keyboard.press('Home');
        const navigation = region.locator('.template-navigation').last();
        const opener = navigation.locator('summary[aria-label="Open menu"]');
        await opener.click({ timeout: 5000 });
        const overlay = navigation.locator('.template-navigation-overlay-content');
        await expect(overlay).toBeVisible();
        const overlayBox = (await overlay.boundingBox())!;
        const leftBox = (await left.boundingBox())!, rightBox = (await right.boundingBox())!;
        expect(Math.abs(leftBox.x + leftBox.width - overlayBox.x)).toBeLessThan(2);
        expect(Math.abs(rightBox.x - (overlayBox.x + overlayBox.width))).toBeLessThan(2);
        expect(Math.abs((leftBox.y + leftBox.height / 2) - (overlayBox.y + overlayBox.height / 2))).toBeLessThan(2);
        await right.click(); await expect(right).toBeFocused();
        await page.keyboard.press('Tab'); await expect(navigation.getByRole('button', { name: 'Close menu' })).toBeFocused();
        await page.keyboard.press('Shift+Tab'); await expect(right).toBeFocused();
        await page.keyboard.press('ArrowRight'); await expect(right).toHaveAttribute('aria-valuenow', '330');
        await left.focus(); await page.keyboard.press('ArrowLeft'); await expect(left).toHaveAttribute('aria-valuenow', '340');
        const resizedOverlay = (await overlay.boundingBox())!, resizedRight = (await right.boundingBox())!;
        expect(Math.abs(resizedRight.x - (resizedOverlay.x + resizedOverlay.width))).toBeLessThan(2);
        await page.mouse.move(resizedRight.x + resizedRight.width / 2, resizedRight.y + resizedRight.height / 2);
        await page.mouse.down(); await page.mouse.move(resizedRight.x + resizedRight.width / 2 + 10, resizedRight.y + resizedRight.height / 2);
        await expect(right).toHaveAttribute('aria-valuenow', '360');
        await page.keyboard.press('Escape'); await page.mouse.up();
        await expect(right).toHaveAttribute('aria-valuenow', '340'); await expect(overlay).toBeVisible();
        await page.getByRole('button', { name: 'Zoom in', exact: true }).click();
        const zoomedOverlay = (await overlay.boundingBox())!, zoomedRight = (await right.boundingBox())!;
        expect(Math.abs(zoomedRight.x - (zoomedOverlay.x + zoomedOverlay.width))).toBeLessThan(2);
        await right.focus(); await page.keyboard.press('Escape'); await expect(overlay).toBeHidden(); await expect(opener).toBeFocused();
        await page.getByRole('button', { name: /Reset template zoom to 100 percent/ }).click();
        await right.focus(); await page.keyboard.press('Enter');
      }
      for (let zoom = 0; zoom < 10; zoom++) await page.getByRole('button', { name: 'Zoom in', exact: true }).click();
      await expect(page.getByRole('button', { name: 'Reset template zoom to 100 percent (currently 200 percent)' })).toBeVisible();
      await page.getByRole('button', { name: /Reset template zoom to 100 percent/ }).click();
      await expect(page.getByRole('button', { name: 'Reset template zoom to 100 percent (currently 100 percent)' })).toBeVisible();
      for (const narrow of [320, 390, 600, 782, 820, 1024, 1440, 1920]) {
        await page.setViewportSize({ width: narrow, height: 1000 });
        await expect(region).toBeVisible();
        await left.scrollIntoViewIfNeeded(); await expect(left).toBeInViewport();
        await right.scrollIntoViewIfNeeded(); await expect(right).toBeInViewport();
      }
      expect(await readFile(globalPath, 'utf8')).toBe(saved);
    }
  } finally { await fixture.close(); }
});

test('all seven Twenty Twenty-Five parts remain usable from narrow preview to 200 percent zoom', async ({ page }, testInfo) => {
  test.setTimeout(180000);
  const fixture = await createStudioHttpFixture({ frontendURL: String(testInfo.project.use.baseURL ?? 'http://localhost:3010') });
  try {
    const response = await fetch(`${fixture.origin}/__studio/test-site`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Studio-Client': 'codex-history', Origin: fixture.origin }, body: JSON.stringify({ action: 'global-read', siteId: 'test' }) });
    expect(response.ok).toBe(true);
    const snapshot = await response.json() as { library: import('../../app/studio/global-template-contract').GlobalTemplateLibrary };
    const set = snapshot.library.templates.sets.find(item => item.id === 'studio-twenty-twenty-five-parts')!;
    const expectedIds = ['tt5-vertical-header', 'tt5-sidebar', 'tt5-header', 'tt5-header-large-title', 'tt5-footer', 'tt5-footer-newsletter', 'tt5-footer-columns'];
    expect(set.parts.map(part => part.id)).toEqual(expectedIds);
    await page.addInitScript(() => {
      for (const kind of ['header', 'footer', 'general']) localStorage.setItem(`acm-studio-template-${kind}-canvas-view-v1`, 'fit');
    });
    for (const part of set.parts) {
      await page.setViewportSize({ width: 1440, height: 1000 });
      await page.goto(`${fixture.origin}/studio?site=test2&mode=templates&scope=global&set=${encodeURIComponent(set.id)}&target=${encodeURIComponent(part.id)}`);
      const region = page.locator(`.template-authoring-surface > .template-${part.kind}`);
      const left = page.getByRole('separator', { name: 'Resize template preview from left edge' });
      const right = page.getByRole('separator', { name: 'Resize template preview from right edge' });
      await expect(region).toBeVisible({ timeout: 30000 });
      for (let step = 0; step < 10; step++) await page.getByRole('button', { name: 'Zoom in', exact: true }).click();
      await expect(page.getByRole('button', { name: 'Reset template zoom to 100 percent (currently 200 percent)' })).toBeVisible();
      for (const width of [320, 390, 600, 782, 1024, 1440, 1920]) {
        await page.setViewportSize({ width, height: 1000 });
        if (width <= 600) {
          const hideNavigation = page.getByRole('button', { name: 'Hide Studio Navigation' });
          if (await hideNavigation.isVisible()) await hideNavigation.click();
          const hideInspector = page.getByRole('button', { name: 'Hide Template Inspector' });
          if (await hideInspector.isVisible()) await hideInspector.click();
        }
        await expect(region).toBeVisible();
        for (const handle of [left, right]) {
          await expect(handle).toBeVisible();
          await handle.scrollIntoViewIfNeeded();
          await expect(handle).toBeInViewport();
        }
      }
      await page.getByRole('button', { name: /Reset template zoom to 100 percent/ }).click();
      await expect(page.getByRole('button', { name: 'Reset template zoom to 100 percent (currently 100 percent)' })).toBeVisible();
    }
  } finally { await fixture.close(); }
});
