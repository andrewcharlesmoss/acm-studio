import { test, expect } from '@playwright/test';

test('paragraph padding displays inherited values and keeps untouched sides inheriting', async ({ page }) => {
  await page.setViewportSize({ width: 1900, height: 1100 });
  await page.goto('/studio/ui/blocks/paragraph');
  await expect(page.locator('.ui-block-specimen')).toHaveAttribute('data-ready', 'true');
  const block = page.getByRole('complementary', { name: 'Paragraph Local Styles', exact: true });
  const site = page.getByRole('complementary', { name: 'Paragraph Global Styles', exact: true });
  const siteVertical = site.getByRole('slider', { name: 'Padding Vertical amount' });
  if (!(await siteVertical.isVisible())) await site.getByText('Dimensions', { exact: true }).first().click();
  const blockVertical = block.getByRole('slider', { name: 'Padding Vertical amount' });
  if (!(await blockVertical.isVisible())) {
    await block.getByRole('button', { name: 'Dimensions options' }).click();
    await page.getByRole('group', { name: 'Dimensions controls' }).getByRole('button', { name: 'Padding', exact: true }).click();
  }
  await siteVertical.fill('4');
  await expect(blockVertical).toHaveValue('4');
  await site.getByRole('button', { name: 'Unlink padding sides' }).click();
  await site.getByRole('slider', { name: 'Padding Bottom amount' }).fill('6');
  await expect(blockVertical).toHaveAttribute('aria-valuetext', 'Mixed');
  await site.getByRole('button', { name: 'Link padding sides' }).click();
  await siteVertical.fill('3');
  await siteVertical.fill('4');
  await expect(blockVertical).toHaveAttribute('aria-valuetext', 'Regular');
  await block.getByRole('button', { name: 'Unlink padding sides' }).click();
  await block.getByRole('slider', { name: 'Padding Top amount' }).fill('1');
  await siteVertical.fill('6');
  await expect(block.getByRole('slider', { name: 'Padding Top amount' })).toHaveValue('1');
  await expect(block.getByRole('slider', { name: 'Padding Bottom amount' })).toHaveValue('6');
  const painted = page.locator('.ui-block-canvas .site-block-style-paragraph').first();
  const spacing = () => painted.evaluate(element => ({ top: getComputedStyle(element).paddingTop, bottom: getComputedStyle(element).paddingBottom }));
  await expect.poll(spacing).toMatchObject({ top: '8px' });
  const edit = await spacing();
  expect(parseFloat(edit.bottom)).toBeGreaterThan(8);
  await block.getByRole('button', { name: 'Preview', exact: true }).click();
  await expect.poll(spacing).toEqual(edit);
  await block.getByRole('button', { name: 'Edit', exact: true }).click();
  await block.getByRole('button', { name: 'Undo specimen change', exact: true }).click();
  await expect(block.getByRole('slider', { name: 'Padding Top amount' })).toHaveValue('6');
});
