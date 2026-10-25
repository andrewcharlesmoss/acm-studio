import { expect, test } from '@playwright/test';

for (const kind of ['paragraph', 'heading']) {
  test(`${kind} styles share the production inspector, rendering and temporary history`, async ({ page }) => {
    await page.goto(`/studio/ui/blocks/${kind}`);
    await expect(page.locator('.ui-block-specimen')).toHaveAttribute('data-ready', 'true');
    const choices = page.getByRole('group', { name: `${kind === 'paragraph' ? 'Paragraph' : 'Heading'} styles`, exact: true });
    await expect(choices.getByRole('button', { name: 'Default', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await choices.getByRole('button', { name: 'Display', exact: true }).click();
    await expect(choices.getByRole('button', { name: 'Display', exact: true })).toHaveAttribute('aria-pressed', 'true');
    const painted = page.locator('.ui-library-canvas .is-style-display').first();
    await expect(painted).toBeVisible();
    if (kind === 'heading') await expect(painted.locator('.heading-field')).toHaveCSS('font-size', await painted.evaluate(element => getComputedStyle(element).fontSize));
    const editSize = await painted.evaluate(element => getComputedStyle(element).fontSize);
    await page.getByRole('button', { name: 'Undo specimen change' }).click();
    await expect(choices.getByRole('button', { name: 'Default', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await page.getByRole('button', { name: 'Redo specimen change' }).click();
    await expect(choices.getByRole('button', { name: 'Display', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await page.getByRole('group', { name: 'Specimen view' }).getByRole('button', { name: 'Preview', exact: true }).click();
    await expect(page.locator('.ui-block-canvas .is-style-display').first()).toHaveCSS('font-size', editSize);
    await page.getByRole('group', { name: 'Specimen view' }).getByRole('button', { name: 'Edit', exact: true }).click();
    await choices.getByRole('button', { name: 'Annotation', exact: true }).click();
    await expect(page.locator('.ui-library-canvas .is-style-annotation').first()).toHaveCSS('border-radius', '16px');
    const stylesOptions = page.locator('.ui-block-inspector').getByRole('button', { name: 'Styles options', exact: true });
    await stylesOptions.click();
    await page.keyboard.press('Escape');
    await expect(stylesOptions).toBeFocused();
    await page.getByRole('button', { name: 'Reset Example', exact: true }).click();
    await expect(choices.getByRole('button', { name: 'Default', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await page.getByRole('checkbox', { name: 'Read-only example' }).check();
    await expect(choices.getByRole('button', { name: 'Display', exact: true })).toBeDisabled();
    await page.getByRole('checkbox', { name: 'Read-only example' }).uncheck();
    await choices.getByRole('button', { name: 'Subtitle', exact: true }).focus();
    await page.keyboard.press('Enter');
    await expect(choices.getByRole('button', { name: 'Subtitle', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await choices.getByRole('button', { name: 'Subtitle', exact: true }).hover();
    await page.locator('.ui-block-inspector').evaluate(element => { element.style.width = '180px'; });
    expect(await choices.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
    await page.locator('.ui-block-inspector').evaluate(element => { element.style.width = ''; });
    await page.evaluate(() => { document.body.style.zoom = '2'; });
    await expect(choices.getByRole('button', { name: 'Annotation', exact: true })).toBeVisible();
    expect(await choices.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
    await page.evaluate(() => { document.body.style.zoom = ''; });
    await page.screenshot({ path: `/tmp/studio-${kind}-styles.png`, fullPage: false });
  });
}


test('Site Editor variation-default navigation is also available in the shared Library pane', async ({ page }) => {
  await page.goto('/studio/ui/controls/block-style-panels');
  const example = page.getByRole('group', { name: 'Block Styles panes example', exact: true });
  await expect(example).toHaveAttribute('data-ready', 'true');
  for (const kind of ['Paragraph', 'Heading']) {
    await example.locator('.site-blocks-list').getByRole('button', { name: kind, exact: true }).click();
    const variations = example.getByRole('group', { name: 'Style variations', exact: true });
    for (const label of ['Display', 'Subtitle', 'Annotation']) await expect(variations.getByRole('button', { name: label, exact: true })).toBeVisible();
    await variations.getByRole('button', { name: 'Display', exact: true }).click();
    await expect(example.locator('.site-browse-styles-heading h3')).toHaveText('Display');
    await example.getByRole('button', { name: 'Back to Blocks', exact: true }).click();
    await example.getByRole('button', { name: 'Back to Blocks', exact: true }).click();
  }
});
