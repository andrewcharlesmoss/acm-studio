import { expect, test } from '@playwright/test';
import { createStudioHttpFixture } from '../helpers/studio-http-fixture.mjs';

for (const target of ['Cover', 'Columns', 'Details']) {
  test(`Header transforms to ${target}, saves and supports Undo`, async ({ page }, testInfo) => {
    const fixture = await createStudioHttpFixture({ frontendURL: String(testInfo.project.use.baseURL ?? 'http://localhost:3010') });
    try {
      await page.goto(`${fixture.origin}/studio?site=test2&mode=templates&scope=global&set=studio-twenty-twenty-five-parts&target=tt5-header`);
      await page.getByRole('button', { name: 'List View', exact: true }).click();
      const list = page.getByRole('complementary', { name: 'List View' });
      await list.getByRole('button', { name: 'Header', exact: true }).click();
      await page.getByRole('button', { name: 'Transform Group block' }).click();
      await page.getByRole('menu', { name: 'Transform block' }).getByRole('menuitem', { name: target, exact: true }).click();
      await expect(page.getByRole('group', { name: `${target} block`, exact: true }).first()).toBeVisible();
      await expect(page.getByRole('button', { name: 'Undo', exact: true })).toBeEnabled();
      await page.getByRole('button', { name: 'Undo', exact: true }).click();
      await expect(page.getByRole('group', { name: `${target} block`, exact: true })).toHaveCount(0);
      await page.getByRole('button', { name: 'Redo', exact: true }).click();
      await expect(page.getByRole('group', { name: `${target} block`, exact: true }).first()).toBeVisible();
      await expect(page.getByText('Global templates saved locally')).toBeVisible();
      await page.reload();
      await page.getByRole('button', { name: 'List View', exact: true }).click();
      await expect(page.getByRole('group', { name: `${target} block`, exact: true }).first()).toBeVisible();
      if (target !== 'Details') await expect(page.getByText('My WordPress Website').first()).toBeVisible();
    } finally { await fixture.close(); }
  });
}
