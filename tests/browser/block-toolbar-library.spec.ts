import { expect, test } from '@playwright/test';

test('Library Quote toolbar adds and removes its citation through the production canvas', async ({ page }) => {
  await page.goto('/studio/ui/blocks/quote');
  await expect(page.locator('.ui-block-specimen')).toHaveAttribute('data-ready', 'true');
  const editor = page.locator('.ui-library-canvas');
  const selectedQuote = editor.locator('.canvas-block.is-selected').first();
  const toolbar = selectedQuote.getByRole('group', { name: 'Quote block tools', exact: true });
  await expect(toolbar).toBeVisible();
  await expect(toolbar).toHaveAttribute('data-toolbar-actions', /quote-citation/);

  await toolbar.getByRole('button', { name: 'Remove citation' }).click();
  await expect(selectedQuote.locator('.quote-citation')).toHaveCount(0);
  await toolbar.getByRole('button', { name: 'Add citation' }).click();
  const citation = selectedQuote.locator('.quote-citation-editor');
  await expect(citation).toBeFocused();
  await expect(citation).toHaveText('');
  await citation.fill('Restored specimen citation');

  await page.getByRole('group', { name: 'Specimen view' }).getByRole('button', { name: 'Preview', exact: true }).click();
  await expect(editor.locator('.canvas-block-toolbar')).toHaveCount(0);
  await expect(page.locator('.ui-block-canvas .quote-citation').filter({ hasText: 'Restored specimen citation' })).toBeVisible();
});

test('Library Table toolbar uses production alignment controls and temporary undo', async ({ page }) => {
  await page.goto('/studio/ui/blocks/table');
  await expect(page.locator('.ui-block-specimen')).toHaveAttribute('data-ready', 'true');
  const editor = page.locator('.ui-library-canvas');
  const toolbar = editor.getByRole('group', { name: 'Table block tools', exact: true }).first();
  await expect(toolbar).toHaveAttribute('data-toolbar-actions', /table-cell-alignment/);
  await editor.getByRole('textbox', { name: 'Table header 1', exact: true }).first().click();
  const alignment = toolbar.getByRole('button', { name: 'Cell alignment', exact: true });
  await expect(alignment).toBeEnabled();
  await alignment.click();
  await page.getByRole('menuitemradio', { name: 'Align cell right', exact: true }).click();
  await expect(editor.locator('table').first().locator('th').first()).toHaveCSS('text-align', 'right');
  await page.getByRole('button', { name: 'Undo specimen change' }).click();
  await expect(editor.locator('table').first().locator('th').first()).toHaveCSS('text-align', 'center');
});

test('Library Page Link toolbar uses the Navigation editor adapter', async ({ page }) => {
  await page.goto('/studio/ui/blocks/page-link');
  await expect(page.locator('.ui-block-specimen')).toHaveAttribute('data-ready', 'true');
  const toolbar = page.locator('.navigation-link-toolbar');
  await expect(toolbar).toBeVisible();
  await expect(toolbar).toHaveAttribute('data-toolbar-actions', /page-link-reorder/);
  await expect(toolbar.getByRole('button', { name: 'Edit Page link' })).toBeVisible();
  await expect(toolbar.getByRole('button', { name: 'Bold Page link' })).toBeVisible();
  await expect(toolbar.getByRole('button', { name: 'Options for Home' })).toBeVisible();
});

test('Library Page Link toolbar appears on hover and hides when the pointer leaves', async ({ page }) => {
  await page.goto('/studio/ui/blocks/page-link');
  await expect(page.locator('.ui-block-specimen')).toHaveAttribute('data-ready', 'true');
  const link = page.getByRole('textbox', { name: 'Navigation link text: Home', exact: true });
  const toolbar = page.getByRole('group', { name: 'Page link tools', exact: true });

  await page.mouse.move(0, 0);
  await link.focus();
  await link.press('Escape');
  await expect(toolbar).toBeHidden();

  await link.hover();
  await expect(toolbar).toBeVisible();
  await toolbar.getByRole('button', { name: 'Bold Page link', exact: true }).hover();
  await expect(toolbar).toBeVisible();
  await expect(link.locator('xpath=..')).not.toHaveClass(/is-selected/);
  await page.mouse.move(0, 0);
  await expect(toolbar).toBeHidden();
});

test('Library Navigation shows the hovered link toolbar without selecting it', async ({ page }) => {
  await page.goto('/studio/ui/blocks/navigation');
  await expect(page.locator('.ui-block-specimen')).toHaveAttribute('data-ready', 'true');
  const navigation = page.locator('.navigation-editor');
  const home = navigation.getByRole('textbox', { name: 'Navigation link text: Home', exact: true });
  const about = navigation.getByRole('textbox', { name: 'Navigation link text: About', exact: true });
  const homeToolbar = home.locator('xpath=..').getByRole('group', { name: 'Page link tools', exact: true });
  const aboutToolbar = about.locator('xpath=..').getByRole('group', { name: 'Page link tools', exact: true });

  await home.hover();
  await expect(homeToolbar).toBeVisible();
  await expect(homeToolbar).toHaveAttribute('data-toolbar-actions', /page-link-options/);
  await expect(aboutToolbar).toBeHidden();
  await expect(navigation.locator('.navigation-edit-item.is-selected')).toHaveCount(0);
  await expect(page.getByRole('complementary', { name: 'Navigation settings', exact: true })).toBeVisible();

  await about.hover();
  await expect(aboutToolbar).toBeVisible();
  await expect(homeToolbar).toBeHidden();
  await page.mouse.move(0, 0);
  await expect(aboutToolbar).toBeHidden();
});

test('Library Navigation keeps keyboard focus on a nested Page link toolbar', async ({ page }) => {
  await page.goto('/studio/ui/blocks/navigation');
  await expect(page.locator('.ui-block-specimen')).toHaveAttribute('data-ready', 'true');
  const navigation = page.locator('.navigation-editor');
  await navigation.getByRole('textbox', { name: 'Navigation link text: Guides', exact: true }).focus();
  const child = navigation.getByRole('textbox', { name: 'Navigation link text: Studio guide', exact: true });
  await expect(child).toBeVisible();
  await child.focus();
  const childToolbar = child.locator('xpath=..').getByRole('group', { name: 'Page link tools', exact: true });
  await expect(childToolbar).toBeVisible();

  await childToolbar.getByRole('button', { name: 'Bold Page link', exact: true }).focus();
  await expect(page.getByRole('textbox', { name: 'Text', exact: true })).toHaveValue('Studio guide');
  await expect(child.locator('xpath=..')).toHaveClass(/is-selected/);
});

test('Navigation appender inserts a link immediately when a destination is chosen', async ({ page }) => {
  await page.goto('/studio/ui/blocks/navigation');
  await expect(page.locator('.ui-block-specimen')).toHaveAttribute('data-ready', 'true');
  const navigation = page.locator('.navigation-editor');
  const add = navigation.locator('.navigation-appender > .navigation-add');
  await navigation.evaluate(element => element.setAttribute('data-inspector-popover-owner', ''));
  await add.click();

  const popover = page.getByRole('dialog', { name: 'Add navigation link', exact: true });
  await expect(popover).toBeVisible();
  const [triggerBox, popoverBox] = await Promise.all([add.boundingBox(), popover.boundingBox()]);
  expect(triggerBox).not.toBeNull();
  expect(popoverBox).not.toBeNull();
  expect(Math.abs(popoverBox!.x - triggerBox!.x)).toBeLessThanOrEqual(16);
  await expect(popover.getByRole('button', { name: 'Apply', exact: true })).toHaveCount(0);
  const items = navigation.locator(':scope > .template-navigation-items > .navigation-edit-item');
  const initialCount = await items.count();
  await popover.getByRole('button').filter({ hasText: 'Home' }).click();
  await expect(items).toHaveCount(initialCount + 1);
  await expect(page.getByRole('textbox', { name: 'Text', exact: true })).toHaveValue('Home');
  await expect(popover).toBeHidden();

  await add.click();
  const urlPopover = page.getByRole('dialog', { name: 'Add navigation link', exact: true });
  const url = 'https://example.org/help';
  const countAfterPage = await items.count();
  await urlPopover.getByRole('textbox', { name: 'Search or type URL' }).fill(url);
  await urlPopover.getByRole('textbox', { name: 'Search or type URL' }).press('Enter');
  await expect(items).toHaveCount(countAfterPage + 1);
  await expect(page.getByRole('textbox', { name: 'Text', exact: true })).toHaveValue(url);
  await expect(urlPopover).toBeHidden();

  await add.click();
  const invalidPopover = page.getByRole('dialog', { name: 'Add navigation link', exact: true });
  const countAfterUrl = await items.count();
  const search = invalidPopover.getByRole('textbox', { name: 'Search or type URL' });
  await search.fill('javascript:alert(1)');
  await search.press('Enter');
  await expect(items).toHaveCount(countAfterUrl);
  await expect(invalidPopover.getByRole('alert')).toBeVisible();
  await search.press('Escape');
  await expect(invalidPopover).toBeHidden();
  await expect(add).toBeFocused();
});

test('Library block transform and More options actions use temporary history', async ({ page }) => {
  await page.goto('/studio/ui/blocks/paragraph');
  await expect(page.locator('.ui-block-specimen')).toHaveAttribute('data-ready', 'true');
  const editor = page.locator('.ui-library-canvas');
  const selected = () => editor.locator('.canvas-block.is-selected').first();
  let toolbar = selected().locator('.canvas-block-toolbar');

  await toolbar.getByRole('button', { name: 'Transform Paragraph block' }).click();
  await page.getByRole('menuitem', { name: 'Heading 2', exact: true }).click();
  await expect(selected().locator('.canvas-block-toolbar')).toHaveAttribute('data-toolbar-block', 'heading');
  await page.getByRole('button', { name: 'Undo specimen change' }).click();
  await expect(selected().locator('.canvas-block-toolbar')).toHaveAttribute('data-toolbar-block', 'paragraph');

  toolbar = selected().locator('.canvas-block-toolbar');
  const blockCount = editor.locator('.canvas-block');
  await expect(blockCount).toHaveCount(1);
  await toolbar.getByRole('button', { name: 'More block options' }).click();
  await page.getByRole('menuitem', { name: /^Add after(?: |$)/ }).click();
  await expect(blockCount).toHaveCount(2);
  await expect(selected().locator('.canvas-block-toolbar').getByRole('button', { name: 'Move block up' })).toBeEnabled();
  await page.getByRole('button', { name: 'Undo specimen change' }).click();
  await expect(blockCount).toHaveCount(1);
  await page.getByRole('button', { name: 'Redo specimen change' }).click();
  await expect(blockCount).toHaveCount(2);
  await page.getByRole('button', { name: 'Reset Example' }).click();
  await expect(blockCount).toHaveCount(1);
});

test('Library examples exercise read-only and move/remove lock toolbar states', async ({ page }) => {
  await page.goto('/studio/ui/blocks/paragraph');
  await expect(page.locator('.ui-block-specimen')).toHaveAttribute('data-ready', 'true');
  const toolbar = page.locator('.ui-library-canvas .canvas-block.is-selected .canvas-block-toolbar');
  const readOnly = page.getByRole('checkbox', { name: 'Read-only example' });
  await readOnly.check();
  await expect(toolbar.getByRole('button', { name: 'Text alignment' })).toBeDisabled();
  await expect(toolbar.getByRole('button', { name: 'Align block' })).toBeDisabled();
  await expect(toolbar.getByRole('button', { name: 'Drag to reorder Paragraph block' })).toBeDisabled();
  await expect(toolbar.getByRole('button', { name: 'Remove block' })).toBeDisabled();
  await readOnly.uncheck();

  const locked = page.getByRole('checkbox', { name: 'Lock move and remove' });
  await locked.check();
  await expect(toolbar.getByRole('button', { name: 'Drag to reorder Paragraph block' })).toBeDisabled();
  await expect(toolbar.getByRole('button', { name: 'Remove block' })).toBeDisabled();
  await page.getByRole('button', { name: 'Reset Example' }).click();
  await expect(locked).not.toBeChecked();
});
