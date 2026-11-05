import { expect, test } from '@playwright/test';

test('site and tool rows highlight across their reorder handles', async ({ page }) => {
  await page.goto('/studio/site-editor?site=global&library=page&section=design');
  const site = page.locator('.studio-site-entry').filter({ has: page.getByRole('button', { name: 'Reorder Test', exact: true }) });
  const heading = site.locator('.inspector-accordion-heading');
  const siteHandle = site.getByRole('button', { name: 'Reorder Test', exact: true });
  await expect(siteHandle).toBeVisible();
  const normal = await heading.evaluate(e => getComputedStyle(e).backgroundColor);
  await siteHandle.hover();
  await expect.poll(() => heading.evaluate(e => getComputedStyle(e).backgroundColor)).not.toBe(normal);
  const hovered = await heading.evaluate(e => getComputedStyle(e).backgroundColor);
  await expect(siteHandle).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
  const tool = page.locator('.library-tool-row').filter({ has: page.getByRole('button', { name: 'Reorder Studio UI Library' }) });
  const toolHandle = tool.getByRole('button', { name: 'Reorder Studio UI Library' });
  await toolHandle.hover();
  await expect(tool).toHaveCSS('background-color', hovered);
  await expect(toolHandle).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
});
