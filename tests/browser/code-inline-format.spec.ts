import { expect, test } from '@playwright/test';

test('Code supports selected Bold, Italic and Link while keeping literal source and selection', async ({ page }) => {
  await page.goto('/studio/ui/blocks/code');
  await expect(page.locator('.ui-block-specimen')).toHaveAttribute('data-ready', 'true');
  const editor = page.locator('.ui-library-canvas');
  const input = editor.getByRole('textbox', { name: 'Code', exact: true }).first();
  const source = 'const value = 1;\n\n';
  await input.fill(source);
  const tools = page.getByRole('group', { name: 'Code block tools', exact: true });

  await input.evaluate(element => { const textarea = element as HTMLTextAreaElement; textarea.setSelectionRange(0, 5); textarea.dispatchEvent(new Event('select', { bubbles: true })); });
  await tools.getByRole('button', { name: 'Bold selected text', exact: true }).click();
  await expect(tools.getByRole('button', { name: 'Bold selected text', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(editor.locator('.code-highlight strong')).toHaveText('const');
  await expect(input).toHaveValue(source);
  await expect.poll(() => input.evaluate(element => { const textarea = element as HTMLTextAreaElement; return [textarea.selectionStart, textarea.selectionEnd]; })).toEqual([0, 5]);

  await input.evaluate(element => { const textarea = element as HTMLTextAreaElement; textarea.setSelectionRange(6, 11); textarea.dispatchEvent(new Event('select', { bubbles: true })); });
  await tools.getByRole('button', { name: 'Italicise selected text', exact: true }).click();
  await expect(editor.locator('.code-highlight em')).toHaveText('value');
  await expect(input).toHaveValue(source);
  await expect.poll(() => input.evaluate(element => { const textarea = element as HTMLTextAreaElement; return [textarea.selectionStart, textarea.selectionEnd]; })).toEqual([6, 11]);

  await input.evaluate(element => { const textarea = element as HTMLTextAreaElement; textarea.setSelectionRange(6, 11); textarea.dispatchEvent(new Event('select', { bubbles: true })); });
  await tools.getByRole('button', { name: 'Add or edit hyperlink', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Add hyperlink' });
  await dialog.getByLabel('Link').fill('https://example.com/docs');
  await dialog.getByRole('button', { name: 'Apply', exact: true }).click();
  await expect(editor.locator('.code-highlight a[href="https://example.com/docs"]')).toHaveText('value');
  await expect(input).toHaveValue(source);

  await page.getByRole('button', { name: 'Preview', exact: true }).click();
  await expect(editor.locator('.ui-block-specimen .studio-code-preview strong')).toHaveText('const');
  await expect(editor.locator('.ui-block-specimen .studio-code-preview a[href="https://example.com/docs"]')).toHaveText('value');
});

test('Code caret Bold and Italic apply to consecutive typed characters and preview', async ({ page }) => {
  await page.goto('/studio/ui/blocks/code');
  await expect(page.locator('.ui-block-specimen')).toHaveAttribute('data-ready', 'true');
  const specimen = page.locator('.ui-library-canvas');
  const input = specimen.getByRole('textbox', { name: 'Code', exact: true }).first();
  const tools = page.getByRole('group', { name: 'Code block tools', exact: true });
  await input.fill('type');
  await input.evaluate(element => {
    const textarea = element as HTMLTextAreaElement;
    textarea.focus();
    textarea.setSelectionRange(4, 4);
    textarea.dispatchEvent(new Event('select', { bubbles: true }));
  });
  await tools.getByRole('button', { name: 'Bold selected text', exact: true }).click();
  await expect(tools.getByRole('button', { name: 'Bold selected text', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await input.pressSequentially('XY');
  await expect(input).toHaveValue('typeXY');
  await expect(specimen.locator('.code-highlight strong')).toHaveText('XY');

  await input.evaluate(element => {
    const textarea = element as HTMLTextAreaElement;
    textarea.setSelectionRange(textarea.value.length, textarea.value.length);
    textarea.dispatchEvent(new Event('select', { bubbles: true }));
  });
  await tools.getByRole('button', { name: 'Italicise selected text', exact: true }).click();
  await input.pressSequentially('ZQ');
  await expect(input).toHaveValue('typeXYZQ');
  await expect(specimen.locator('.code-highlight em')).toHaveText('ZQ');

  await page.getByRole('button', { name: 'Preview', exact: true }).click();
  await expect(specimen.locator('.studio-code-preview strong')).toHaveText('XY');
  await expect(specimen.locator('.studio-code-preview em')).toHaveText('ZQ');
});

test('Code exposes the canonical More text formatting menu with literal-text formats', async ({ page }) => {
  await page.goto('/studio/ui/blocks/code');
  await expect(page.locator('.ui-block-specimen')).toHaveAttribute('data-ready', 'true');
  const specimen = page.locator('.ui-library-canvas');
  const input = specimen.getByRole('textbox', { name: 'Code', exact: true }).first();
  const tools = page.getByRole('group', { name: 'Code block tools', exact: true });
  const source = 'display';
  await input.fill(source);
  await input.evaluate(element => {
    const textarea = element as HTMLTextAreaElement;
    textarea.focus();
    textarea.setSelectionRange(0, 7);
    textarea.dispatchEvent(new Event('select', { bubbles: true }));
  });
  await tools.getByRole('button', { name: 'More text formatting', exact: true }).click();
  const menu = page.getByRole('menu', { name: 'More text formatting', exact: true });
  await expect(menu.getByRole('menuitemcheckbox', { name: 'Strikethrough selected text', exact: true })).toBeEnabled();
  await expect(menu.getByRole('menuitemcheckbox', { name: 'Subscript selected text', exact: true })).toBeEnabled();
  await expect(menu.getByRole('menuitemcheckbox', { name: 'Superscript selected text', exact: true })).toBeEnabled();
  await expect(menu.getByRole('menuitemcheckbox', { name: 'Inline code selected text', exact: true })).toBeEnabled();
  await expect(menu.getByRole('menuitemcheckbox', { name: 'Keyboard input selected text', exact: true })).toBeEnabled();
  await expect(menu.getByRole('menuitemcheckbox', { name: 'Language', exact: true })).toBeEnabled();
  await expect(menu.getByRole('menuitem', { name: 'Footnote', exact: true })).toBeDisabled();
  await expect(menu.getByRole('menuitem', { name: 'Inline image', exact: true })).toBeDisabled();
  await expect(menu.getByRole('menuitemcheckbox', { name: 'Math', exact: true })).toBeDisabled();

  await menu.getByRole('menuitemcheckbox', { name: 'Strikethrough selected text', exact: true }).click();
  await expect(input).toHaveValue(source);
  await expect(specimen.locator('.code-highlight s')).toHaveText(source);
  await page.getByRole('button', { name: 'Preview', exact: true }).click();
  await expect(specimen.locator('.studio-code-preview s')).toHaveText(source);
});
