import { expect, test } from '@playwright/test';

test('one colour setting applies to social, status and media icons together', async ({ page }) => {
  await page.goto('/studio/ui/icons?icon=social.service.flickr');
  await page.waitForLoadState('networkidle');
  const toggle = page.getByLabel('Icon Colours');
  await expect(toggle).not.toBeChecked();
  await toggle.check();
  const search = page.getByRole('textbox', { name: 'Search Icons' });
  const inspector = page.getByRole('complementary', { name: 'Icon Inspector' });
  for (const [name, attribute, colour] of [
    ['social.service.flickr', 'fill', '#0063DC'],
    ['state.warning', 'fill', '#FF8D28'],
    ['library.files', 'stroke', '#0088FF'],
  ]) {
    await search.fill(name);
    await page.locator('.rl-icon-card').filter({ hasText: name }).click();
    const icon = inspector.locator('.rl-enlarged svg');
    await expect(attribute === 'stroke' ? icon : icon.locator('path').first()).toHaveAttribute(attribute, colour);
  }
  await toggle.uncheck();
  await expect(inspector.locator('.rl-enlarged svg')).toHaveAttribute('stroke', 'currentColor');
});
