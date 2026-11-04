import { expect, test } from '@playwright/test';

test('status colour previews and exports follow the selected palette', async ({ page }) => {
  await page.goto('/studio/ui/icons?icon=state.warning');
  await page.waitForLoadState('networkidle');
  const inspector = page.getByRole('complementary', { name: 'Icon Inspector' });
  const status = page.getByLabel('Status Colours');
  await status.check();
  await expect(inspector.locator('.rl-enlarged svg path').first()).toHaveAttribute('fill', '#FF8D28');
  const downloadPromise = page.waitForEvent('download');
  await inspector.getByRole('button', { name: 'Download 24px SVG' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toContain('-status-');
  const stream = await download.createReadStream();
  let contents = '';
  for await (const chunk of stream!) contents += chunk.toString();
  expect(contents).toContain('fill="#FF8D28"');
  const search = page.getByRole('textbox', { name: 'Search Icons' });
  for (const [name, colour] of [['state.info', '#0088FF'], ['state.caution', '#FF8D28'], ['state.error', '#FF383C'], ['state.published', '#34C759']]) {
    await search.fill(name);
    await page.locator('.rl-icon-card').filter({ hasText: name }).click();
    await expect(inspector.locator('.rl-enlarged svg path').first()).toHaveAttribute('fill', colour);
  }
  await search.fill('state.warning');
  await page.locator('.rl-icon-card').filter({ hasText: 'state.warning' }).click();
  await status.uncheck();
  await expect(inspector.locator('.rl-enlarged svg path').first()).not.toHaveAttribute('fill', '#FF8D28');
});
