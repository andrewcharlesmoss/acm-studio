import { expect, test } from '@playwright/test';

test('Buttons Library shows canonical inert bottom-right appender only in Edit', async ({ page }, testInfo) => {
  await page.goto('/studio/ui/blocks/buttons');
  const canvas = page.locator('.ui-block-canvas');
  const appender = canvas.locator('.studio-buttons-appender').first();
  await expect(appender).toHaveAttribute('inert', '');
  const geometry = await appender.evaluate(element => {
    const appender = element.getBoundingClientRect();
    const owner = element.parentElement!.getBoundingClientRect();
    return { right: appender.right - owner.right, bottom: owner.bottom - appender.bottom };
  });
  expect(Math.abs(geometry.right)).toBeLessThan(1);
  expect(Math.abs(geometry.bottom)).toBeLessThan(1);
  await canvas.screenshot({ path: testInfo.outputPath('buttons-appender.png') });
  await page.getByRole('group', { name: 'Specimen view' }).getByRole('button', { name: 'Preview', exact: true }).click();
  await expect(canvas.locator('.studio-buttons-appender')).toHaveCount(0);
});
