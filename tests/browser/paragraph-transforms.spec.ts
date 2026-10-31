import { expect, test } from '@playwright/test';

for (const target of ['Heading 2', 'Quote']) {
  test(`Paragraph ${target} conversion retains content and history in the Library`, async ({ page }) => {
    await page.goto('/studio/ui/blocks/paragraph');
    await expect(page.locator('.ui-block-specimen')).toHaveAttribute('data-ready', 'true');
    const editor = page.locator('.ui-library-canvas');
    const text = await editor.locator('.paragraph-field').first().innerText();
    await editor.getByRole('button', { name: 'Transform Paragraph block' }).click();
    await page.getByRole('menu', { name: 'Transform block' }).getByRole('menuitem', { name: target, exact: true }).click();
    const transformed = editor.locator(target === 'Quote' ? '.quote-field' : '.heading-field').first();
    await expect(transformed).toContainText(text);
    await page.getByRole('button', { name: 'Undo specimen change' }).click();
    await expect(editor.locator('.paragraph-field').first()).toHaveText(text);
    await page.getByRole('button', { name: 'Redo specimen change' }).click();
    await expect(transformed).toContainText(text);
    await page.getByRole('button', { name: 'Preview', exact: true }).click();
    await expect(page.locator(target === 'Quote' ? '.ui-block-specimen blockquote' : '.ui-block-canvas h2').first()).toContainText(text);
  });
}

test('Paragraph transforms to an editable Details disclosure in the Library', async ({ page }) => {
  await page.goto('/studio/ui/blocks/paragraph');
  await expect(page.locator('.ui-block-specimen')).toHaveAttribute('data-ready', 'true');
  const editor = page.locator('.ui-library-canvas');
  const text = await editor.locator('.paragraph-field').first().innerText();
  await editor.getByRole('button', { name: 'Transform Paragraph block' }).click();
  await page.getByRole('menu', { name: 'Transform block' }).getByRole('menuitem', { name: 'Details', exact: true }).click();

  const disclosure = editor.locator('details').first();
  await expect(disclosure.locator('summary')).toHaveText('Details');
  await expect(disclosure.locator('.paragraph-field')).toContainText(text);
  await disclosure.locator('summary').click();
  await expect(disclosure).toHaveAttribute('open', '');

  await page.getByRole('button', { name: 'Undo specimen change' }).click();
  await expect(editor.locator('.paragraph-field').first()).toHaveText(text);
  await page.getByRole('button', { name: 'Redo specimen change' }).click();
  await expect(editor.locator('details').first().locator('.paragraph-field')).toContainText(text);

  await page.getByRole('button', { name: 'Preview', exact: true }).click();
  await expect(page.locator('.ui-block-specimen details summary').first()).toHaveText('Details');
});

test('Short Paragraph converts to Buttons in the Library and retains undo, redo and Preview', async ({ page }) => {
  await page.goto('/studio/ui/blocks/paragraph');
  await expect(page.locator('.ui-block-specimen')).toHaveAttribute('data-ready', 'true');
  const editor = page.locator('.ui-library-canvas');
  await editor.locator('.paragraph-field[contenteditable="true"]').fill('Read this guide');
  await editor.getByRole('button', { name: 'Transform Paragraph block' }).click();
  await page.getByRole('menu', { name: 'Transform block' }).getByRole('menuitem', { name: 'Buttons', exact: true }).click();

  await expect(editor.locator('.content-buttons .content-button')).toContainText('Read this guide');
  await page.getByRole('button', { name: 'Undo specimen change' }).click();
  await expect(editor.locator('.paragraph-field').first()).toHaveText('Read this guide');
  await page.getByRole('button', { name: 'Redo specimen change' }).click();
  await expect(editor.locator('.content-buttons .content-button')).toContainText('Read this guide');
  await page.getByRole('button', { name: 'Preview', exact: true }).click();
  await expect(page.locator('.ui-block-specimen .content-buttons a').first()).toContainText('Read this guide');
});

test('Paragraph styles Preformatted while retaining rich text and exact whitespace', async ({ page }) => {
  await page.goto('/studio/ui/blocks/paragraph');
  await expect(page.locator('.ui-block-specimen')).toHaveAttribute('data-ready', 'true');
  const editor = page.locator('.ui-library-canvas');
  const paragraph = editor.locator('.paragraph-field[contenteditable="true"]').first();
  await paragraph.fill('First line');
  await paragraph.press('End');
  await paragraph.press('Shift+Enter');
  await paragraph.pressSequentially('  Second line');
  const text = await paragraph.innerText();
  await editor.getByRole('button', { name: 'Transform Paragraph block' }).click();
  await page.getByRole('menu', { name: 'Transform block' }).getByRole('menuitemradio', { name: 'Preformatted', exact: true }).click();

  const preformatted = editor.locator('.block-visual-style.is-preformatted .paragraph-field[contenteditable="true"]');
  await expect(preformatted).toContainText('First line');
  expect(await preformatted.evaluate(element => getComputedStyle(element).whiteSpace)).toBe('pre-wrap');
  expect(await preformatted.evaluate(element => getComputedStyle(element).fontFamily)).toContain('monospace');
  expect(await preformatted.innerText()).toBe(text);
  await page.getByRole('button', { name: 'Undo specimen change' }).click();
  await expect(editor.locator('.paragraph-field').first()).toHaveText(text);
  await page.getByRole('button', { name: 'Redo specimen change' }).click();
  await expect.poll(() => preformatted.innerText()).toBe(text);
  await page.getByRole('button', { name: 'Preview', exact: true }).click();
  const preview = page.locator('.ui-block-specimen .block-visual-style.is-preformatted .paragraph-field');
  await expect(preview).toContainText('First line');
  expect(await preview.evaluate(element => getComputedStyle(element).whiteSpace)).toBe('pre-wrap');
  await expect.poll(() => preview.innerText()).toBe(text);
});

test('Paragraph exposes Pullquote, Poetry and Preformatted styles across Edit, Preview and Undo', async ({ page }) => {
  await page.goto('/studio/ui/blocks/paragraph');
  await expect(page.locator('.ui-block-specimen')).toHaveAttribute('data-ready', 'true');
  const editor = page.locator('.ui-library-canvas');

  const originalText = await editor.locator('.paragraph-field').first().innerText();
  await editor.getByRole('button', { name: 'Transform Paragraph block' }).click();
  await page.getByRole('menu', { name: 'Transform block' }).getByRole('menuitemradio', { name: 'Pullquote', exact: true }).click();
  await expect(editor.locator('.quote-field.is-pullquote.align-centre')).toContainText(originalText);
  await page.getByRole('button', { name: 'Undo specimen change' }).click();
  await expect(editor.locator('.paragraph-field').first()).toHaveText(originalText);
  await page.getByRole('button', { name: 'Redo specimen change' }).click();
  await page.getByRole('button', { name: 'Preview', exact: true }).click();
  await expect(page.locator('.ui-block-specimen .quote-field.is-pullquote.align-centre')).toContainText(originalText);

  await page.getByRole('button', { name: 'Edit', exact: true }).click();
  await page.getByRole('button', { name: 'Undo specimen change' }).click();
  const paragraph = editor.locator('.paragraph-field[contenteditable="true"]').first();
  await paragraph.fill('First poetic line');
  await paragraph.press('End');
  await paragraph.press('Shift+Enter');
  await paragraph.pressSequentially('  Second poetic line');
  const poetryText = await paragraph.innerText();
  await editor.getByRole('button', { name: 'Transform Paragraph block' }).click();
  await page.getByRole('menu', { name: 'Transform block' }).getByRole('menuitemradio', { name: 'Poetry', exact: true }).click();
  const poetry = editor.locator('.block-visual-style.is-poetry .paragraph-field[contenteditable="true"]');
  await expect(poetry).toContainText('First poetic line');
  expect(await poetry.innerText()).toBe(poetryText);
  expect(await poetry.evaluate(element => getComputedStyle(element).whiteSpace)).toBe('pre-wrap');
  await page.getByRole('button', { name: 'Undo specimen change' }).click();
  await expect(editor.locator('.block-visual-style.is-poetry')).toHaveCount(0);
  await page.getByRole('button', { name: 'Redo specimen change' }).click();
  await expect(poetry).toContainText('Second poetic line');
  await page.getByRole('button', { name: 'Preview', exact: true }).click();
  await expect(page.locator('.ui-block-specimen .block-visual-style.is-poetry .paragraph-field')).toContainText('Second poetic line');
});

test('Paragraph List conversion preserves line boundaries and returns through Undo and Redo', async ({ page }) => {
  await page.goto('/studio/ui/blocks/paragraph');
  await expect(page.locator('.ui-block-specimen')).toHaveAttribute('data-ready', 'true');
  const editor = page.locator('.ui-library-canvas');
  const field = editor.locator('.paragraph-field[contenteditable="true"]');
  await field.fill('First line');
  await field.press('End');
  await field.press('Shift+Enter');
  await field.pressSequentially('Second line');
  await editor.getByRole('button', { name: 'Transform Paragraph block' }).click();
  await page.getByRole('menu', { name: 'Transform block' }).getByRole('menuitem', { name: 'List', exact: true }).click();
  await expect(editor.locator('.list-item-editor')).toHaveText(['First line', 'Second line']);
  await page.getByRole('button', { name: 'Undo specimen change' }).click();
  await expect.poll(() => editor.locator('.paragraph-field').innerText()).toBe('First line\nSecond line');
  await page.getByRole('button', { name: 'Redo specimen change' }).click();
  await expect(editor.locator('.list-item-editor')).toHaveText(['First line', 'Second line']);
});

for (const host of ['content', 'template']) {
  test(`Paragraph transformation uses actual ${host} owner and keyboard history`, async ({ page }) => {
    await page.goto(host === 'content' ? '/studio/ui/selection' : '/studio/ui/selection/template');
    const id = host === 'content' ? 'column-drag-source' : 'template-drag-source';
    const block = page.locator(`[data-studio-block-id="${id}"]`);
    await expect(block).toContainText(host === 'content' ? 'Drag this paragraph' : 'Drag this template paragraph');
    const text = await block.innerText();
    await block.click();
    await page.getByRole('button', { name: 'Transform Paragraph block' }).click();
    await page.getByRole('menu', { name: 'Transform block' }).getByRole('menuitem', { name: 'Heading 3', exact: true }).click();
    await expect(block).toHaveClass(/is-h3/);
    await expect(block).toContainText(text);
    await page.getByRole('button', { name: 'More block options' }).focus();
    await page.keyboard.press('Meta+z');
    await expect(block).toHaveClass(/paragraph-field/);
    await expect(block).toHaveText(text);
    await page.keyboard.press('Meta+Shift+z');
    await expect(block).toHaveClass(/is-h3/);
    await expect(block).toContainText(text);
  });
}

test('Paragraph transforms respect read-only and movement locks', async ({ page }) => {
  await page.goto('/studio/ui/blocks/paragraph');
  await expect(page.locator('.ui-block-specimen')).toHaveAttribute('data-ready', 'true');
  const trigger = page.getByRole('button', { name: 'Transform Paragraph block' });
  await page.getByRole('checkbox', { name: 'Lock move and remove' }).check();
  await trigger.click();
  const menu = page.getByRole('menu', { name: 'Transform block' });
  await expect(menu.getByRole('menuitem', { name: 'Group', exact: true })).toHaveCount(0);
  await expect(menu.getByRole('menuitem', { name: 'Heading 2', exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await page.getByRole('checkbox', { name: 'Read-only example' }).check();
  await expect(trigger).toBeDisabled();
});

test('Spacer transforms to Details in the Library and preserves its dimensions through history and Preview', async ({ page }) => {
  await page.goto('/studio/ui/blocks/spacer');
  await expect(page.locator('.ui-block-specimen')).toHaveAttribute('data-ready', 'true');
  const editor = page.locator('.ui-library-canvas');
  const trigger = editor.getByRole('button', { name: 'Transform Spacer block' });
  await trigger.click();
  const menu = page.getByRole('menu', { name: 'Transform block' });
  await expect(menu.getByRole('menuitem', { name: 'Details', exact: true })).toBeVisible();
  await menu.getByRole('menuitem', { name: 'Details', exact: true }).click();

  const disclosure = editor.locator('details').first();
  await expect(disclosure.locator('summary')).toHaveText('Details');
  await expect(disclosure.locator('.spacer-field')).toHaveCount(1);
  await disclosure.locator('summary').click();
  await expect(disclosure).toHaveAttribute('open', '');
  await expect(disclosure.locator('.spacer-field')).toBeVisible();

  await page.getByRole('button', { name: 'Undo specimen change' }).click();
  await expect(editor.locator('.spacer-field').first()).toBeVisible();
  await page.getByRole('button', { name: 'Redo specimen change' }).click();
  await expect(editor.locator('details .spacer-field')).toBeVisible();

  await page.getByRole('button', { name: 'Preview', exact: true }).click();
  const previewDisclosure = page.locator('.ui-block-specimen details').first();
  await expect(previewDisclosure.locator('summary')).toHaveText('Details');
  await expect(previewDisclosure.locator('.content-spacer')).toHaveCount(1);
  await previewDisclosure.locator('summary').click();
  await expect(previewDisclosure.locator('.content-spacer')).toBeVisible();
  await page.getByRole('button', { name: 'Reset Example' }).click();
});

test('Separator transforms to Details in the Library and preserves its style through history and Preview', async ({ page }) => {
  await page.goto('/studio/ui/blocks/divider');
  await expect(page.locator('.ui-block-specimen')).toHaveAttribute('data-ready', 'true');
  const editor = page.locator('.ui-library-canvas');
  await editor.getByRole('button', { name: 'Transform Separator block' }).click();
  const menu = page.getByRole('menu', { name: 'Transform block' });
  await menu.getByRole('menuitem', { name: 'Details', exact: true }).click();

  const disclosure = editor.locator('details').first();
  await expect(disclosure.locator('summary')).toHaveText('Details');
  await expect(disclosure.locator('.divider-field')).toHaveCount(1);
  await disclosure.locator('summary').click();
  await expect(disclosure.locator('.divider-field')).toBeVisible();

  await page.getByRole('button', { name: 'Undo specimen change' }).click();
  await expect(editor.locator('.divider-field')).toBeVisible();
  await page.getByRole('button', { name: 'Redo specimen change' }).click();
  await expect(editor.locator('details .divider-field')).toBeVisible();

  await page.getByRole('button', { name: 'Preview', exact: true }).click();
  const previewDisclosure = page.locator('.ui-block-specimen details').first();
  await expect(previewDisclosure.locator('summary')).toHaveText('Details');
  await expect(previewDisclosure.locator('.content-divider')).toHaveCount(1);
  await previewDisclosure.locator('summary').click();
  await expect(previewDisclosure.locator('.content-divider')).toBeVisible();
  await page.getByRole('button', { name: 'Reset Example' }).click();
});

for (const width of [1440, 820, 390]) {
  test(`Paragraph full toolbar remains reachable at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/studio/ui/blocks/paragraph');
    await expect(page.locator('.ui-block-specimen')).toHaveAttribute('data-ready', 'true');
    const toolbar = page.getByRole('group', { name: 'Paragraph block tools' });
    for (const name of ['Transform Paragraph block', 'More block options']) {
      const button = toolbar.getByRole('button', { name, exact: true });
      await button.click(); await page.keyboard.press('Escape'); await expect(button).toBeFocused();
    }
    const canvasBox = await page.locator('.ui-block-canvas').boundingBox();
    const toolbarBox = await toolbar.boundingBox();
    expect(toolbarBox!.x).toBeGreaterThanOrEqual(canvasBox!.x);
    expect(toolbarBox!.x + toolbarBox!.width).toBeLessThanOrEqual(canvasBox!.x + canvasBox!.width);
    await page.screenshot({ path: `/private/tmp/acm-paragraph-${width}.png` });
  });
}

test('Paragraph toolbar remains reachable at 200% CSS document scaling', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/studio/ui/blocks/paragraph');
  await expect(page.locator('.ui-block-specimen')).toHaveAttribute('data-ready', 'true');
  await page.addStyleTag({ content: 'html { zoom: 2 !important; }' });
  const trigger = page.getByRole('button', { name: 'Transform Paragraph block' });
  await trigger.click();
  await expect(page.getByRole('menu', { name: 'Transform block' }).getByRole('menuitem', { name: 'Group', exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(trigger).toBeFocused();
});
