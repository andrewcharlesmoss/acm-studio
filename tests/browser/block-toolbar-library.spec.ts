import { expect, test } from '@playwright/test';

test('Library block toolbars use the shared single-row toolbar contract', async ({ page }) => {
  await page.goto('/studio/ui/blocks/button');
  await expect(page.locator('.ui-block-specimen')).toHaveAttribute('data-ready', 'true');

  const toolbar = page.locator('.ui-library-canvas .studio-block-toolbar').first();
  await expect(toolbar).toBeVisible();
  await expect(toolbar).toHaveClass(/canvas-block-toolbar/);
  await expect(toolbar).toHaveCSS('flex-wrap', 'nowrap');

  const rowTops = await toolbar.evaluate(element => Array.from(element.children, child => Math.round(child.getBoundingClientRect().top)));
  expect(new Set(rowTops).size).toBeLessThanOrEqual(1);
});

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

test('Library Image toolbar wraps the unchanged image in Details for Edit and Preview', async ({ page }) => {
  await page.goto('/studio/ui/blocks/image');
  await expect(page.locator('.ui-block-specimen')).toHaveAttribute('data-ready', 'true');
  const editor = page.locator('.ui-library-canvas');
  const toolbar = () => editor.locator('.canvas-block.is-selected').first().getByRole('group', { name: 'Image block tools', exact: true });

  await toolbar().getByRole('button', { name: 'Transform Image block', exact: true }).click();
  await page.getByRole('menu', { name: 'Transform block', exact: true }).getByRole('menuitem', { name: 'Details', exact: true }).click();
  const details = editor.locator('details').filter({ hasText: 'A local PNG fixture' }).first();
  await expect(details.locator(':scope > summary')).toHaveText('Details');
  await expect(details.locator('img')).toHaveAttribute('alt', 'Illustrated green hill with a blue sky');
  await expect(details.locator('figcaption')).toHaveText('A local PNG fixture');

  await page.getByRole('group', { name: 'Specimen view' }).getByRole('button', { name: 'Preview', exact: true }).click();
  const previewDetails = page.locator('.ui-block-canvas details').first();
  await expect(previewDetails.locator(':scope > summary')).toHaveText('Details');
  await previewDetails.locator(':scope > summary').click();
  await expect(previewDetails.locator('img')).toBeVisible();
  await expect(previewDetails.locator('figcaption')).toHaveText('A local PNG fixture');
  await page.getByRole('button', { name: 'Reset Example', exact: true }).click();
});

test('Library Cover full-height toolbar uses the existing minimum-height field with undo and redo', async ({ page }) => {
  await page.goto('/studio/ui/blocks/cover');
  await expect(page.locator('.ui-block-specimen')).toHaveAttribute('data-ready', 'true');
  const editor = page.locator('.ui-library-canvas');
  const selected = editor.locator('.canvas-block.is-selected').first();
  const toolbar = selected.getByRole('group', { name: 'Cover block tools', exact: true });
  const fullHeight = toolbar.getByRole('button', { name: 'Toggle full height', exact: true });
  const figure = selected.locator('.content-cover');

  await expect(toolbar).toHaveAttribute('data-toolbar-actions', /cover-full-height/);
  await expect(fullHeight).toBeEnabled();
  await expect(fullHeight).toHaveAttribute('aria-pressed', 'false');
  await fullHeight.click();
  await expect(fullHeight).toHaveAttribute('aria-pressed', 'true');
  await expect(figure).toHaveAttribute('style', /min-height:\s*100vh/);

  await page.getByRole('button', { name: 'Undo specimen change' }).click();
  await expect(fullHeight).toHaveAttribute('aria-pressed', 'false');
  await expect(figure).not.toHaveAttribute('style', /min-height:\s*100vh/);
  await page.getByRole('button', { name: 'Redo specimen change' }).click();
  await expect(fullHeight).toHaveAttribute('aria-pressed', 'true');
  await expect(figure).toHaveAttribute('style', /min-height:\s*100vh/);

  await page.getByRole('checkbox', { name: 'Read-only example' }).check();
  await expect(fullHeight).toBeDisabled();
  await page.getByRole('checkbox', { name: 'Read-only example' }).uncheck();
  await page.getByRole('group', { name: 'Specimen view' }).getByRole('button', { name: 'Preview', exact: true }).click();
  await expect(editor.locator('.canvas-block-toolbar')).toHaveCount(0);
  await expect(page.locator('.ui-block-canvas .content-cover')).toHaveAttribute('style', /min-height:\s*100vh/);
  await page.getByRole('button', { name: 'Reset Example', exact: true }).click();
});

test('Library Cover can replace its background image through Files with undo and redo', async ({ page }) => {
  await page.goto('/studio/ui/blocks/cover');
  await expect(page.locator('.ui-block-specimen')).toHaveAttribute('data-ready', 'true');
  const editor = page.locator('.ui-library-canvas');
  const selected = editor.locator('.canvas-block.is-selected').first();
  const toolbar = selected.getByRole('group', { name: 'Cover block tools', exact: true });
  const originalAlt = 'Illustrated green hills beneath a blue sky and yellow sun';

  await toolbar.getByRole('button', { name: 'Replace background image', exact: true }).click();
  const files = page.getByRole('dialog', { name: 'Files' });
  await expect(files).toBeVisible();
  await files.getByRole('button', { name: /Landscape\.png/ }).first().click();
  await files.getByRole('button', { name: 'Insert into Cover background', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Describe this image' })).toHaveCount(0);

  await expect(page.getByRole('textbox', { name: 'Alternative text' })).toHaveValue('A landscape illustration');
  await page.getByRole('button', { name: 'Undo specimen change' }).click();
  await expect(page.getByRole('textbox', { name: 'Alternative text' })).toHaveValue(originalAlt);
  await page.getByRole('button', { name: 'Redo specimen change' }).click();
  await expect(page.getByRole('textbox', { name: 'Alternative text' })).toHaveValue('A landscape illustration');
  await page.getByRole('button', { name: 'Reset Example', exact: true }).click();
});

test('Library empty Cover offers media and featured image, then turns colour selection into editable content', async ({ page }) => {
  await page.goto('/studio/ui/blocks/cover');
  await expect(page.locator('.ui-block-specimen')).toHaveAttribute('data-ready', 'true');
  const editor = page.locator('.ui-library-canvas');
  const emptyCover = editor.locator('[data-studio-block-anchor-id="cover-library-specimen-empty"]');
  const figure = emptyCover.locator('.content-cover.is-empty');

  await expect(figure).toBeVisible();
  await expect(figure.getByText('Cover', { exact: true })).toBeVisible();
  await expect(figure.getByRole('button', { name: 'Upload', exact: true })).toBeEnabled();
  await expect(figure.getByRole('button', { name: 'Media Library', exact: true })).toBeEnabled();
  await expect(figure.getByRole('button', { name: 'Use featured image', exact: true })).toBeEnabled();
  await figure.getByRole('button', { name: 'Media Library', exact: true }).click();
  let files = page.getByRole('dialog', { name: 'Files' });
  await expect(files).toBeVisible();
  await files.getByRole('button', { name: 'Close Files', exact: true }).click();

  await figure.getByRole('button', { name: 'Upload', exact: true }).click();
  files = page.getByRole('dialog', { name: 'Files' });
  await expect(files).toBeVisible();
  await files.getByRole('button', { name: 'Close Files', exact: true }).click();

  await figure.getByRole('button', { name: 'Use featured image', exact: true }).click();
  await expect(emptyCover.locator('.content-cover-background img')).toBeVisible();
  let toolbar = emptyCover.getByRole('group', { name: 'Cover block tools', exact: true });
  await expect(toolbar.getByRole('button', { name: 'Replace background image', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Reset Example', exact: true }).click();

  await figure.getByRole('button', { name: 'Set overlay colour to Accent 1', exact: true }).click();
  await expect(figure.locator('.content-cover-placeholder')).toHaveCSS('background-color', 'rgb(255, 238, 88)');
  await expect(figure.locator('.content-cover-empty-panel')).toHaveCount(0);
  await expect(figure.locator('.rich-text-editor[data-placeholder="Write title…"]')).toBeVisible();
  await expect(figure.getByRole('button', { name: 'Add block to Cover', exact: true })).toBeVisible();
  toolbar = emptyCover.getByRole('group', { name: 'Cover block tools', exact: true });
  await expect(toolbar.getByRole('button', { name: 'Add media', exact: true })).toBeVisible();
  await figure.getByRole('button', { name: 'Add block to Cover', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Close block chooser', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Close block chooser', exact: true }).click();
  await page.getByRole('button', { name: 'Reset Example', exact: true }).click();
});

test('Library Content toolbar wraps the dynamic slot in Details for Edit and Preview', async ({ page }) => {
  await page.goto('/studio/ui/blocks/template-content');
  await expect(page.locator('.ui-block-specimen')).toHaveAttribute('data-ready', 'true');
  const editor = page.locator('.ui-library-canvas');
  const toolbar = editor.locator('.canvas-block.is-selected').first().getByRole('group', { name: 'Group block tools', exact: true });

  await toolbar.getByRole('button', { name: 'Transform Content block', exact: true }).click();
  await page.getByRole('menu', { name: 'Transform block', exact: true }).getByRole('menuitem', { name: 'Details', exact: true }).click();
  const editDetails = editor.locator('details.studio-nested-group').first();
  await expect(editDetails.locator(':scope > summary input')).toHaveValue('Details');

  await page.getByRole('group', { name: 'Specimen view' }).getByRole('button', { name: 'Preview', exact: true }).click();
  const previewDetails = page.locator('details.template-group').first();
  await expect(previewDetails.locator(':scope > summary')).toHaveText('Details');
  await previewDetails.locator(':scope > summary').click();
  await expect(previewDetails.locator('.template-content-layout')).toContainText('This body is projected into the template Content slot during local preview.');
  await page.getByRole('button', { name: 'Reset Example', exact: true }).click();
});

test('Library Author Files selection and profile details render in Edit and Preview', async ({ page }) => {
  await page.goto('/studio/ui/blocks/post-author');
  await expect(page.locator('.ui-block-specimen')).toHaveAttribute('data-ready', 'true');

  const inspector = page.locator('.ui-block-inspector');
  await inspector.getByRole('button', { name: 'Choose profile image from Files', exact: true }).click();
  const files = page.getByRole('dialog', { name: 'Files', exact: true });
  await files.locator('.media-file-card').filter({ hasText: 'Landscape.png' }).click();
  await files.getByRole('button', { name: 'Insert into Author profile image', exact: true }).click();
  await expect(page.locator('.ui-library-canvas img[alt="A landscape illustration"]')).toBeVisible();

  await inspector.getByLabel('Biography', { exact: true }).fill('A temporary profile biography.');
  await inspector.getByLabel('Profile URL', { exact: true }).fill('https://example.com/author');
  await inspector.getByLabel('Open profile link in new tab', { exact: true }).check();
  await page.getByRole('group', { name: 'Specimen view' }).getByRole('button', { name: 'Preview', exact: true }).click();

  const preview = page.locator('.ui-block-canvas');
  await expect(preview.locator('img[alt="A landscape illustration"]')).toBeVisible();
  await expect(preview).toContainText('A temporary profile biography.');
  await expect(preview.locator('a[href="https://example.com/author"][target="_blank"][rel="noopener noreferrer"]')).toBeVisible();
  await page.getByRole('button', { name: 'Reset Example', exact: true }).click();
});

test('Library Column toolbar overrides and inherits its Columns vertical alignment', async ({ page }) => {
  await page.goto('/studio/ui/blocks/column');
  await expect(page.locator('.ui-block-specimen')).toHaveAttribute('data-ready', 'true');
  const editor = page.locator('.ui-library-canvas');
  const column = editor.locator('[data-studio-nested-block-id="column-library-specimen"]').first();
  const toolbar = column.getByRole('group', { name: 'Column block tools', exact: true });
  const alignment = toolbar.getByRole('button', { name: 'Vertical alignment', exact: true });
  const surface = column.locator('.studio-column-content');
  const parent = editor.locator('.studio-columns').first();
  const width = await surface.evaluate(element => element.getBoundingClientRect().width);

  await expect(toolbar).toHaveAttribute('data-toolbar-actions', /column-vertical-alignment/);
  await expect(surface).toHaveCSS('align-self', 'start');
  await alignment.click();
  await expect(page.getByRole('menu', { name: 'Vertical alignment', exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('menu', { name: 'Vertical alignment', exact: true })).toBeHidden();
  await expect(alignment).toBeFocused();

  await alignment.click();
  await page.getByRole('menuitemradio', { name: 'Align middle', exact: true }).click();
  await expect(surface).toHaveCSS('align-self', 'center');
  await expect(surface).toHaveJSProperty('offsetWidth', width);
  await expect(parent).toHaveCSS('align-items', 'stretch');
  await page.getByRole('button', { name: 'Undo specimen change' }).click();
  await expect(surface).toHaveCSS('align-self', 'start');
  await page.getByRole('button', { name: 'Redo specimen change' }).click();
  await expect(surface).toHaveCSS('align-self', 'center');

  await alignment.click();
  await page.getByRole('menuitemradio', { name: 'Use Columns setting', exact: true }).click();
  await expect(surface).toHaveCSS('align-self', 'auto');
  await expect(parent).toHaveCSS('align-items', 'stretch');
  await page.getByRole('button', { name: 'Undo specimen change' }).click();
  await expect(surface).toHaveCSS('align-self', 'center');

  const readOnly = page.getByRole('checkbox', { name: 'Read-only example' });
  await readOnly.check();
  await expect(alignment).toBeDisabled();
  await readOnly.uncheck();
  await page.getByRole('group', { name: 'Specimen view' }).getByRole('button', { name: 'Preview', exact: true }).click();
  await expect(editor.locator('.canvas-block-toolbar')).toHaveCount(0);
});

test('Library Group toolbar exposes Gutenberg item justification for the default layout', async ({ page }) => {
  await page.goto('/studio/ui/blocks/group');
  await expect(page.locator('.ui-block-specimen')).toHaveAttribute('data-ready', 'true');
  const editor = page.locator('.ui-library-canvas');
  const selected = () => editor.locator('.canvas-block.is-selected').first();
  const toolbar = () => selected().getByRole('group', { name: 'Group block tools', exact: true });
  const surface = () => selected().locator('.studio-nested-group').first();
  const justification = () => toolbar().getByRole('button', { name: 'Justify items', exact: true });

  await expect(toolbar()).toBeVisible();
  await expect(surface()).not.toHaveAttribute('data-layout-justification');
  await justification().click();
  const menu = page.getByRole('menu', { name: 'Justify items', exact: true });
  await expect(menu.getByRole('menuitemradio', { name: 'Justify items left', exact: true })).toHaveAttribute('aria-checked', 'true');
  await expect(menu.getByRole('menuitemradio', { name: 'Justify items center', exact: true })).toBeVisible();
  await expect(menu.getByRole('menuitemradio', { name: 'Justify items right', exact: true })).toBeVisible();
  await menu.getByRole('menuitemradio', { name: 'Justify items center', exact: true }).click();
  await expect(surface()).toHaveAttribute('data-layout-justification', 'centre');
  await page.getByRole('button', { name: 'Undo specimen change' }).click();
  await expect(surface()).not.toHaveAttribute('data-layout-justification');
  await page.getByRole('button', { name: 'Redo specimen change' }).click();
  await expect(surface()).toHaveAttribute('data-layout-justification', 'centre');
});

test('Library Grid child handles resize spans on canvas and through keyboard input', async ({ page }) => {
  await page.goto('/studio/ui/blocks/grid');
  await expect(page.locator('.ui-block-specimen')).toHaveAttribute('data-ready', 'true');
  const editor = page.locator('.ui-library-canvas');
  const gridChoice = page.getByRole('checkbox', { name: 'Grid', exact: true }).first();
  await gridChoice.check();
  const inspector = page.getByRole('complementary', { name: 'Grid settings', exact: true });
  await inspector.getByLabel('Minimum column width').fill('8');
  await page.getByRole('checkbox', { name: 'Selectable child heading', exact: true }).check();

  const child = editor.locator('[data-studio-nested-block-id="grid-child-heading"]').first();
  const columnHandle = editor.getByRole('button', { name: 'Resize Grid column span', exact: true });
  await expect(columnHandle).toBeVisible();
  const startSpanWidth = await child.evaluate(element => element.getBoundingClientRect().width);
  const trackStride = await editor.locator('.studio-nested-group.layout-grid').last().evaluate(element => {
    const style = getComputedStyle(element);
    return Number.parseFloat(style.gridTemplateColumns.split(' ')[0]) + Number.parseFloat(style.columnGap);
  });
  const handleBox = await columnHandle.boundingBox();
  if (!handleBox) throw new Error('Grid column resize handle has no visible bounds');
  const startX = handleBox.x + handleBox.width / 2;
  const startY = handleBox.y + handleBox.height / 2;
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX + trackStride, startY);
  await page.mouse.up();
  await expect(child).toHaveAttribute('style', /grid-column:\s*span 2/);
  await expect.poll(() => child.evaluate(element => element.getBoundingClientRect().width)).toBeGreaterThan(startSpanWidth);
  await page.getByRole('button', { name: 'Undo specimen change' }).click();
  await expect(child).toHaveAttribute('style', /grid-column:\s*span 1/);

  const rowHandle = editor.getByRole('button', { name: 'Resize Grid row span', exact: true });
  await rowHandle.focus();
  await rowHandle.press('ArrowDown');
  await expect(child).toHaveAttribute('style', /grid-row:\s*span 2/);
  await page.getByRole('button', { name: 'Undo specimen change' }).click();
  await expect(child).toHaveAttribute('style', /grid-row:\s*span 1/);
  await page.getByRole('button', { name: 'Reset Example', exact: true }).click();
});

test('Library Social Icons toolbar edits justification and retains style and wrap transforms', async ({ page }) => {
  await page.goto('/studio/ui/blocks/social-icons');
  await expect(page.locator('.ui-block-specimen')).toHaveAttribute('data-ready', 'true');
  const editor = page.locator('.ui-library-canvas');
  const selected = () => editor.locator('.canvas-block.is-selected').first();
  const toolbar = () => selected().locator('.canvas-block-toolbar');
  const social = () => selected().locator('.social-icons-block');

  await expect(toolbar()).toHaveAttribute('data-toolbar-actions', /social-icons-justification/);
  const justification = toolbar().getByRole('button', { name: 'Justification', exact: true });
  await expect(social().locator('ul')).toHaveCSS('justify-content', 'flex-start');
  await justification.click();
  await expect(page.getByRole('menu', { name: 'Justification', exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('menu', { name: 'Justification', exact: true })).toBeHidden();
  await expect(justification).toBeFocused();
  await justification.click();
  await page.getByRole('menuitemradio', { name: 'Justify items center', exact: true }).click();
  await expect(social().locator('ul')).toHaveCSS('justify-content', 'center');
  await page.getByRole('button', { name: 'Undo specimen change' }).click();
  await expect(social().locator('ul')).toHaveCSS('justify-content', 'flex-start');
  await page.getByRole('button', { name: 'Redo specimen change' }).click();
  await expect(social().locator('ul')).toHaveCSS('justify-content', 'center');

  const transform = () => toolbar().getByRole('button', { name: 'Transform Social Icons block', exact: true });
  await transform().click();
  const transformMenu = page.getByRole('menu', { name: 'Transform block', exact: true });
  await expect(transformMenu.getByRole('menuitemradio', { name: 'Pill Shape', exact: true })).toHaveAttribute('aria-checked', 'true');
  await transformMenu.getByRole('menuitemradio', { name: 'Logos Only', exact: true }).click();
  await expect(social()).toHaveClass(/is-style-logos-only/);
  await expect(social().locator('[data-studio-nested-block-id="social-linkedin-fixture"]')).toBeVisible();
  await expect(social().locator('[data-studio-nested-block-id="social-tiktok-fixture"]')).toBeVisible();
  await page.getByRole('button', { name: 'Undo specimen change' }).click();
  await expect(social()).toHaveClass(/is-style-pill-shape/);

  await transform().click();
  await page.getByRole('menuitem', { name: 'Group', exact: true }).click();
  await expect(toolbar()).toHaveAttribute('data-toolbar-block', 'group');
  await expect(selected().locator('.social-icons-block')).toHaveClass(/is-style-pill-shape/);
  await page.getByRole('button', { name: 'Undo specimen change' }).click();
  await expect(toolbar()).toHaveAttribute('data-toolbar-block', 'social-icons');

  await transform().click();
  await page.getByRole('menuitem', { name: 'Columns', exact: true }).click();
  await expect(toolbar()).toHaveAttribute('data-toolbar-block', 'columns');
  await expect(selected().locator('.social-icons-block')).toHaveClass(/is-style-pill-shape/);
  await page.getByRole('button', { name: 'Undo specimen change' }).click();
  await expect(toolbar()).toHaveAttribute('data-toolbar-block', 'social-icons');

  const readOnly = page.getByRole('checkbox', { name: 'Read-only example' });
  await readOnly.check();
  await expect(toolbar().getByRole('button', { name: 'Justification', exact: true })).toBeDisabled();
  await expect(transform()).toBeDisabled();
  await readOnly.uncheck();
  await page.getByRole('group', { name: 'Specimen view' }).getByRole('button', { name: 'Preview', exact: true }).click();
  await expect(editor.locator('.canvas-block-toolbar')).toHaveCount(0);
});

for (const type of ['social-linkedin', 'social-tiktok'] as const) {
  const label = type === 'social-linkedin' ? 'LinkedIn' : 'TikTok';
  const childId = `${type}-library-specimen`;
  const siblingId = `${childId}-sibling`;
  const parentId = `${childId}-social-parent`;

  test(`Library ${label} child toolbar edits its Social Icons parent and moves with its orientation`, async ({ page }) => {
    await page.goto(`/studio/ui/blocks/${type}`);
    await expect(page.locator('.ui-block-specimen')).toHaveAttribute('data-ready', 'true');
    const editor = page.locator('.ui-library-canvas');
    const child = () => editor.locator(`[data-studio-nested-block-id="${childId}"]`);
    const toolbar = () => child().getByRole('group', { name: `${label} block tools`, exact: true });
    const parent = () => editor.locator(`[data-studio-block-anchor-id="${parentId}"]`);

    await expect(toolbar()).toHaveAttribute('data-toolbar-actions', /social-icon-select-parent/);
    await expect(toolbar()).toHaveAttribute('data-toolbar-actions', /social-icon-parent-alignment/);
    await expect(toolbar()).toHaveAttribute('data-toolbar-actions', /social-icon-parent-justification/);
    await expect(toolbar()).toHaveAttribute('data-toolbar-actions', /social-icon-reorder/);
    await expect(toolbar()).not.toHaveAttribute('data-toolbar-actions', /(^|\s)move(\s|$)/);

    const inspector = page.getByRole('complementary', { name: `${label} profile settings`, exact: true });
    await inspector.getByRole('button', { name: 'Advanced', exact: true }).click();
    for (const field of ['HTML anchor', 'Additional CSS class(es)', 'Additional CSS']) await expect(inspector.getByRole('textbox', { name: field, exact: true })).toBeVisible();

    const alignment = toolbar().getByRole('button', { name: 'Align Social Icons block', exact: true });
    const justification = toolbar().getByRole('button', { name: 'Justification', exact: true });
    await expect(toolbar().getByRole('button', { name: `Move ${label} icon ${type === 'social-linkedin' ? 'right' : 'left'}`, exact: true })).toBeEnabled();
    await expect(toolbar().getByRole('button', { name: `Move ${label} icon ${type === 'social-linkedin' ? 'left' : 'right'}`, exact: true })).toBeDisabled();

    await justification.click();
    await page.getByRole('menuitemradio', { name: 'Justify items center', exact: true }).click();
    await expect(child()).toHaveAttribute('data-studio-selected', 'true');
    await expect(parent().locator('.social-icons-block ul')).toHaveCSS('justify-content', 'center');
    await alignment.click();
    await page.getByRole('menuitemradio', { name: 'Align right', exact: true }).click();
    await expect(parent()).toHaveClass(/has-block-align-right/);

    const moveForward = toolbar().getByRole('button', { name: `Move ${label} icon ${type === 'social-linkedin' ? 'right' : 'left'}`, exact: true });
    const arrow = moveForward.locator('svg');
    await expect(arrow).toHaveClass(/is-vertical/);
    await expect(arrow).toHaveCSS('transform', 'matrix(0, 1, -1, 0, 0, 0)');
    await moveForward.click();
    await expect(parent().locator('.social-icons-block ul > li[data-studio-nested-block-id]').first()).toHaveAttribute('data-studio-nested-block-id', type === 'social-linkedin' ? siblingId : childId);
    await page.getByRole('button', { name: 'Undo specimen change' }).click();
    await expect(parent().locator('.social-icons-block ul > li[data-studio-nested-block-id]').first()).toHaveAttribute('data-studio-nested-block-id', type === 'social-linkedin' ? childId : siblingId);
    await page.getByRole('button', { name: 'Undo specimen change' }).click();
    await expect(parent().locator('.social-icons-block ul')).toHaveCSS('justify-content', 'center');
    await expect(parent()).not.toHaveClass(/has-block-align-right/);
    await page.getByRole('button', { name: 'Undo specimen change' }).click();
    await expect(parent().locator('.social-icons-block ul')).toHaveCSS('justify-content', 'flex-start');

    await toolbar().getByRole('button', { name: 'Select parent block: Social Icons', exact: true }).click();
    await expect(parent().getByRole('group', { name: 'Social Icons block tools', exact: true })).toBeVisible();
    await page.getByRole('complementary', { name: 'Social Icons settings', exact: true }).getByLabel('Orientation').selectOption('vertical');
    await child().click();
    await expect(toolbar().getByRole('button', { name: `Move ${label} icon ${type === 'social-linkedin' ? 'down' : 'up'}`, exact: true })).toBeEnabled();
    await expect(toolbar().getByRole('button', { name: `Move ${label} icon ${type === 'social-linkedin' ? 'up' : 'down'}`, exact: true })).toBeDisabled();
    await expect(toolbar().getByRole('button', { name: `Move ${label} icon ${type === 'social-linkedin' ? 'down' : 'up'}` }).locator('svg')).not.toHaveClass(/is-vertical/);

    const readOnly = page.getByRole('checkbox', { name: 'Read-only example' });
    await readOnly.check();
    await expect(toolbar().getByRole('button', { name: 'Select parent block: Social Icons', exact: true })).toBeEnabled();
    await expect(alignment).toBeDisabled();
    await expect(justification).toBeDisabled();
    const verticalBefore = type === 'social-linkedin' ? 'up' : 'down';
    const verticalAfter = type === 'social-linkedin' ? 'down' : 'up';
    await expect(toolbar().getByRole('button', { name: `Move ${label} icon ${verticalBefore}`, exact: true })).toBeDisabled();
    await expect(toolbar().getByRole('button', { name: `Move ${label} icon ${verticalAfter}`, exact: true })).toBeDisabled();
    await readOnly.uncheck();
    await page.getByRole('group', { name: 'Specimen view' }).getByRole('button', { name: 'Preview', exact: true }).click();
    await expect(editor.locator('.canvas-block-toolbar')).toHaveCount(0);
    await page.getByRole('group', { name: 'Specimen view' }).getByRole('button', { name: 'Edit', exact: true }).click();
  });
}

test('LinkedIn child toolbar is rendered by the production Template editor', async ({ page }) => {
  await page.goto('/studio/ui/selection/template');
  const child = page.locator('[data-studio-nested-block-id="template-social-linkedin"]');
  await child.click();
  const toolbar = child.getByRole('group', { name: 'LinkedIn block tools', exact: true });
  await expect(toolbar).toHaveAttribute('data-toolbar-actions', /social-icon-parent-alignment/);
  await expect(toolbar.getByRole('button', { name: 'Align Social Icons block', exact: true })).toBeVisible();
  await expect(toolbar.getByRole('button', { name: 'Justification', exact: true })).toBeVisible();
  await expect(toolbar.getByRole('button', { name: 'Select parent block: Social Icons', exact: true })).toBeVisible();
});

for (const width of [1440, 390]) {
  test(`Library LinkedIn horizontal mover remains visible at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/studio/ui/blocks/social-linkedin');
    await expect(page.locator('.ui-block-specimen')).toHaveAttribute('data-ready', 'true');
    const editor = page.locator('.ui-library-canvas');
    const toolbar = editor.locator('[data-studio-nested-block-id="social-linkedin-library-specimen"] .canvas-block-toolbar');
    const moveRight = toolbar.getByRole('button', { name: 'Move LinkedIn icon right', exact: true });
    const box = await moveRight.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(width + 1);
    await expect(moveRight.locator('svg')).toHaveClass(/is-vertical/);
    await moveRight.click();
    await expect(editor.locator('[data-studio-block-anchor-id="social-linkedin-library-specimen-social-parent"] .social-icons-block li[data-studio-nested-block-id]').first()).toHaveAttribute('data-studio-nested-block-id', 'social-linkedin-library-specimen-sibling');
  });
}

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

test('Library Navigation root toolbar exposes justification and records it in specimen history', async ({ page }) => {
  await page.goto('/studio/ui/blocks/navigation');
  await expect(page.locator('.ui-block-specimen')).toHaveAttribute('data-ready', 'true');
  const navigation = page.locator('.navigation-editor');
  const toolbar = page.getByRole('group', { name: 'Navigation block tools', exact: true });
  await expect(toolbar).toBeVisible();
  await expect(toolbar).toHaveAttribute('data-toolbar-actions', /navigation-justification/);
  const trigger = toolbar.getByRole('button', { name: 'Justification', exact: true });
  await expect(toolbar.getByRole('group', { name: 'Navigation layout alignment', exact: true })).toBeVisible();
  await trigger.click();
  const menu = page.getByRole('menu', { name: 'Justification', exact: true });
  await expect(menu).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(menu).toBeHidden();
  await expect(trigger).toBeFocused();
  await trigger.click();
  await expect(menu).toBeVisible();
  await menu.getByRole('menuitemradio', { name: 'Justify items right', exact: true }).click();
  await expect(navigation).toHaveAttribute('data-navigation-align', 'right');
  await page.getByRole('button', { name: 'Undo specimen change', exact: true }).click();
  await expect(navigation).toHaveAttribute('data-navigation-align', 'left');
  const links = navigation.locator(':scope > .template-navigation-items > .navigation-edit-item');
  const initialCount = await links.count();
  await toolbar.getByRole('button', { name: 'Add navigation link', exact: true }).click();
  const addDialog = page.getByRole('dialog', { name: 'Add navigation link', exact: true });
  await expect(addDialog).toBeVisible();
  await addDialog.getByRole('textbox', { name: 'Search or type URL' }).fill('https://example.org/navigation-toolbar');
  await addDialog.getByRole('textbox', { name: 'Search or type URL' }).press('Enter');
  await expect(links).toHaveCount(initialCount + 1);
  await page.getByRole('button', { name: 'Undo specimen change', exact: true }).click();
  await expect(links).toHaveCount(initialCount);
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


test('nested Quote owns its citation independently of its parent', async ({ page }) => {
  await page.goto('/studio/ui/blocks/quote');
  await expect(page.locator('.ui-block-specimen')).toHaveAttribute('data-ready', 'true');
  const parent = page.locator('[data-studio-block-anchor-id="quote-library-specimen-presentation"]');
  const nested = parent.locator('[data-studio-nested-block-id="quote-library-specimen-presentation-nested"]');
  await expect(parent.locator(':scope > .quote-field > .quote-citation')).toHaveText('Presentation source');
  await expect(nested.locator(':scope > .quote-field > .quote-citation')).toHaveCount(0);
  await nested.click({ position: { x: 2, y: 2 } });
  const toolbar = page.getByRole('group', { name: 'Quote block tools', exact: true });
  await toolbar.getByRole('button', { name: 'Add citation', exact: true }).click();
  await expect(nested.locator(':scope > .quote-field > .quote-citation .quote-citation-editor')).toBeVisible();
  await expect(parent.locator(':scope > .quote-field > .quote-citation')).toHaveText('Presentation source');
  await toolbar.getByRole('button', { name: 'Remove citation', exact: true }).click();
  await expect(nested.locator(':scope > .quote-field > .quote-citation')).toHaveCount(0);
});
