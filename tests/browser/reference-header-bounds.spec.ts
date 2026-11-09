import { expect, test } from '@playwright/test';
import { createStudioHttpFixture } from '../helpers/studio-http-fixture.mjs';

test('full-width reference Header and its wide Row stay inside the resized frame in Edit and Preview', async ({ page }, testInfo) => {
  test.setTimeout(90000);
  const fixture = await createStudioHttpFixture({ frontendURL: String(testInfo.project.use.baseURL ?? 'http://localhost:3010') });
  try {
    await page.addInitScript(() => localStorage.setItem('acm-studio-template-header-canvas-view-v1', 'fit'));
    await page.setViewportSize({ width: 2400, height: 1000 });
    await page.goto(`${fixture.origin}/studio?site=test2&mode=templates&scope=global&set=studio-twenty-twenty-five-parts&target=tt5-header`);
    const frame = page.locator('.template-authoring-surface > .template-header');
    const shell = frame.locator('.template-group.tt5-header-shell');
    const row = frame.locator('.template-group.tt5-header-row');
    const title = frame.locator('.template-site-title-text');
    await expect(frame).toBeVisible({ timeout: 30000 });
    for (const mode of ['Edit', 'Preview'] as const) {
      await page.getByRole('button', { name: mode, exact: true }).click();
      for (const width of [2400, 1440, 960]) {
        await page.setViewportSize({ width, height: 1000 });
        await expect.poll(async () => {
          const [outer, root, inner, text] = await Promise.all([frame.boundingBox(), shell.boundingBox(), row.boundingBox(), title.boundingBox()]);
          if (!outer || !root || !inner || !text) return false;
          return root.x >= outer.x - 1 && root.x + root.width <= outer.x + outer.width + 1
            && inner.x >= outer.x - 1 && inner.x + inner.width <= outer.x + outer.width + 1
            && text.x >= outer.x - 1 && text.x + text.width <= outer.x + outer.width + 1;
        }, { message: `${mode} Header descendants stay inside the visible frame at ${width}px` }).toBe(true);
      }
    }
  } finally {
    await fixture.close();
  }
});
