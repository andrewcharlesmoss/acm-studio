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
