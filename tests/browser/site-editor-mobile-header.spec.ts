import { expect, test } from '@playwright/test';

test('Site Editor keeps the shared navigation compact on mobile', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('acm-studio-local-website-notice-dismissed-v1', 'true'));
  for (const width of [390, 342]) {
    await page.setViewportSize({ width, height: 900 });
    for (const [value, label] of [['test', 'Test'], ['global', 'Universal Defaults']]) {
      await page.goto(`/studio/site-editor?site=${value}`);
      const header = page.locator('.site-editor-app-header');
      const scope = header.getByRole('group', { name: 'Current design scope' });
      await expect(scope.locator('.site-editor-header-scope-full')).toHaveText(label);
      await expect(scope.locator('.site-editor-header-scope-compact')).toHaveText(value === 'global' ? 'Universal' : label);
      await expect(scope).toHaveAttribute('aria-description', label);

      const geometry = await page.evaluate(() => {
        const header = document.querySelector<HTMLElement>('.site-editor-app-header')!;
        const identity = header.querySelector<HTMLElement>('.studio-app-identity')!.getBoundingClientRect();
        const scope = header.querySelector<HTMLElement>('.site-editor-header-scope')!.getBoundingClientRect();
        const files = [...document.querySelectorAll<HTMLElement>('.studio-navigation-workspace button')]
          .find(button => button.textContent?.trim().startsWith('Files'))!;
        return {
          headerHeight: header.getBoundingClientRect().height,
          identityCentre: identity.top + identity.height / 2,
          scopeCentre: scope.top + scope.height / 2,
          filesTop: files.getBoundingClientRect().top,
        };
      });

      expect(Math.abs(geometry.scopeCentre - geometry.identityCentre)).toBeLessThanOrEqual(1);
      expect(geometry.headerHeight).toBeLessThanOrEqual(112);
      expect(geometry.filesTop).toBeLessThanOrEqual(220);
    }
  }
});

test('the shared header specimen follows its available width', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/studio/ui/workspace#application-header');
  const example = page.locator('.ui-application-header-example');
  await expect(example).toHaveAttribute('data-ready', 'true');
  await example.getByLabel('Header example section').selectOption('siteEditor');
  await example.getByLabel('Header example width').selectOption('390');
  const header = example.locator('.site-editor-app-header');
  const identity = header.locator('.studio-app-identity');
  const scope = header.getByRole('group', { name: 'Current design scope' });
  await expect(scope).toHaveAttribute('aria-description', 'Test');
  await expect(scope.locator('.site-editor-header-scope-compact')).toBeVisible();
  const identityBox = await identity.boundingBox();
  const scopeBox = await scope.boundingBox();
  expect(identityBox).not.toBeNull(); expect(scopeBox).not.toBeNull();
  expect(Math.abs(identityBox!.y + identityBox!.height / 2 - scopeBox!.y - scopeBox!.height / 2)).toBeLessThanOrEqual(1);
  await header.getByRole('link', { name: 'ACM Studio home' }).focus();
  await expect(header.getByRole('link', { name: 'ACM Studio home' })).toBeFocused();
});

test('the Site Editor header exposes the full scope at wider sizes', async ({ page }) => {
  for (const width of [820, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/studio/site-editor?site=global');
    const scope = page.locator('.site-editor-app-header').getByRole('group', { name: 'Current design scope' });
    await expect(scope.locator('.site-editor-header-scope-full')).toBeVisible();
    await expect(scope).toHaveAttribute('aria-description', 'Universal Defaults');
    const header = page.locator('.site-editor-app-header');
    for (const control of await header.locator('a, button').all()) {
      if (!await control.isVisible()) continue;
      const bounds = await control.boundingBox();
      expect(bounds!.x).toBeGreaterThanOrEqual(0);
      expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width + 1);
    }
  }
});
