import { expect, test } from '@playwright/test';

for (const [route, label, other] of [['spacer', 'Spacer', 'Separator'], ['divider', 'Separator', 'Spacer']] as const) {
  test(`${label} converts to ${other} and restores its settings on Undo`, async ({ page }) => {
    await page.goto(`/studio/ui/blocks/${route}`);
    await expect(page.locator('.ui-block-specimen')).toHaveAttribute('data-ready', 'true');
    const editor = page.locator('.ui-library-canvas');
    const trigger = editor.getByRole('button', { name: `Transform ${label} block` });
    await trigger.click();
    await page.getByRole('menu', { name: 'Transform block' }).getByRole('menuitem', { name: other, exact: true }).click();
    await expect(editor.getByRole('button', { name: `Transform ${other} block` })).toBeVisible();
    await page.getByRole('button', { name: 'Undo specimen change' }).click();
    await expect(trigger).toBeVisible();
    if (route === 'spacer') await expect(editor.getByRole('button', { name: 'Spacer block', exact: true }).first()).toHaveCSS('height', '48px');
    else await expect(editor.locator('.divider-field').first()).toBeVisible();
    await page.getByRole('button', { name: 'Redo specimen change' }).click();
    await expect(editor.getByRole('button', { name: `Transform ${other} block` })).toBeVisible();
  });

  for (const wrapper of ['Group', 'Columns']) {
    test(`${label} ${wrapper} wrapper retains the block and restores selection on Undo`, async ({ page }) => {
      await page.goto(`/studio/ui/blocks/${route}`);
      await expect(page.locator('.ui-block-specimen')).toHaveAttribute('data-ready', 'true');
      const editor = page.locator('.ui-library-canvas');
      const trigger = editor.getByRole('button', { name: `Transform ${label} block` });
      await trigger.click();
      await page.getByRole('menu', { name: 'Transform block' }).getByRole('menuitem', { name: wrapper, exact: true }).click();
      const toolbar = editor.getByRole('group', { name: `${wrapper} block tools` });
      await expect(toolbar).toBeVisible();
      await toolbar.getByRole('button', { name: 'More block options' }).focus();
      await page.keyboard.press('Meta+z');
      await expect(trigger).toBeVisible();
      await expect(editor.locator('.editor-canvas-scroll')).toBeFocused();
      await page.keyboard.press('Meta+Shift+z');
      await expect(editor.getByRole('group', { name: `${wrapper} block`, exact: true }).filter({ has: page.locator(route === 'spacer' ? '.spacer-field' : '.divider-field') })).toBeVisible();
      await expect(editor.locator(route === 'spacer' ? '.spacer-field' : '.divider-field').first()).toBeVisible();
    });
  }
}

test('Separator style menu records selected style and honours locks', async ({ page }) => {
  await page.goto('/studio/ui/blocks/divider');
  await expect(page.locator('.ui-block-specimen')).toHaveAttribute('data-ready', 'true');
  const editor = page.locator('.ui-library-canvas');
  const trigger = editor.getByRole('button', { name: 'Transform Separator block' });
  await trigger.click();
  const menu = page.getByRole('menu', { name: 'Transform block' });
  await expect(menu.getByRole('menuitemradio', { name: 'Wide Line' })).toHaveAttribute('aria-checked', 'true');
  await menu.getByRole('menuitemradio', { name: 'Dots' }).click();
  await trigger.click();
  await expect(menu.getByRole('menuitemradio', { name: 'Dots' })).toHaveAttribute('aria-checked', 'true');
  await page.keyboard.press('Escape');
  await page.getByRole('checkbox', { name: 'Lock move and remove' }).check();
  await trigger.click();
  await expect(menu.getByRole('menuitem', { name: 'Group', exact: true })).toHaveCount(0);
  await expect(menu.getByRole('menuitem', { name: 'Columns', exact: true })).toHaveCount(0);
  await expect(menu.getByRole('menuitemradio', { name: 'Dots' })).toBeVisible();
});

for (const wrapper of ['Group', 'Columns']) {
  test(`Template Editor keeps keyboard history after undoing a Spacer ${wrapper} wrapper`, async ({ page }) => {
    await page.goto('/studio/ui/selection/template');
    const spacer = page.locator('[data-studio-block-id="template-spacer"]');
    await spacer.click();
    await page.getByRole('button', { name: 'Transform Spacer block' }).click();
    await page.getByRole('menu', { name: 'Transform block' }).getByRole('menuitem', { name: wrapper, exact: true }).click();
    const toolbar = page.getByRole('group', { name: `${wrapper} block tools` });
    await toolbar.getByRole('button', { name: 'More block options' }).focus();
    await page.keyboard.press('Meta+z');
    await expect(page.getByRole('button', { name: 'Transform Spacer block' })).toBeVisible();
    await expect(page.locator('.editor-canvas-scroll')).toBeFocused();
    await page.keyboard.press('Meta+Shift+z');
    await expect(page.getByRole('group', { name: `${wrapper} block`, exact: true }).filter({ has: spacer })).toBeVisible();
    await expect(spacer).toBeVisible();
  });
}
