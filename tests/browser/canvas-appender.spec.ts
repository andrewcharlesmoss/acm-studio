import { expect, test } from '@playwright/test';

test('ordinary editor keeps the appender prompt close to the last paragraph', async ({ page }) => {
  const document = { id: 'appender-gap-page', kind: 'page', title: 'Appender gap', subtitle: '', slug: 'appender-gap', excerpt: '', status: 'draft', updatedAt: '2026-10-31T00:00:00.000Z', documentShellVersion: 1, tags: [], seoTitle: '', seoDescription: '', blocks: [{ id: 'last-paragraph', type: 'paragraph', text: 'Last paragraph' }] };
  await page.addInitScript(doc => localStorage.setItem('acm-studio-workspace-v2', JSON.stringify({ version: 56, activeDocumentId: doc.id, documents: [doc], categories: [], bin: [] })), document);
  await page.goto('/studio');
  const paragraph = page.locator('[data-studio-block-anchor-id="last-paragraph"] .rich-text-editor');
  const prompt = page.locator('.canvas-appender input');
  await expect(paragraph).toBeVisible();
  await expect(prompt).toBeVisible();
  await paragraph.click();
  await expect(page.locator('[data-studio-block-anchor-id="last-paragraph"]')).toHaveClass(/is-selected/);
  await prompt.focus();
  await expect(prompt).toHaveAttribute('placeholder', 'Type / to choose a block');
  await expect(page.locator('[data-studio-block-anchor-id="last-paragraph"]')).toHaveClass(/is-selected/);
  const paragraphColour = await paragraph.evaluate(element => getComputedStyle(element).color);
  await expect(prompt).toHaveCSS('color', paragraphColour);
  expect(await prompt.evaluate(element => getComputedStyle(element, '::placeholder').color)).toBe(paragraphColour);
  const paragraphBottom = (await paragraph.boundingBox())!.y + (await paragraph.boundingBox())!.height;
  const promptLineTop = await prompt.evaluate(input => {
    const bounds = input.getBoundingClientRect();
    return bounds.top + parseFloat(getComputedStyle(input).paddingTop);
  });
  expect(promptLineTop - paragraphBottom).toBeGreaterThanOrEqual(20);
  expect(promptLineTop - paragraphBottom).toBeLessThanOrEqual(40);
});

test('appender follows the same gap as adjacent paragraphs', async ({ page }) => {
  await page.goto('/studio/ui/workspace#block-editor-playground');
  await expect(async () => {
    await page.getByRole('combobox', { name: 'Playground template' }).selectOption('empty');
    await expect(page.getByRole('status').filter({ hasText: 'Empty: 0 top-level blocks.' })).toBeVisible({ timeout: 1000 });
  }).toPass({ timeout: 20000 });
  const specimen = page.locator('.ui-block-editor-specimen');
  const appender = specimen.locator('.canvas-appender');
  const prompt = appender.locator('input');
  await expect(appender).toHaveCSS('margin-top', '0px');
  await prompt.fill('First paragraph');
  await prompt.press('Enter');
  await prompt.fill('Second paragraph');
  await prompt.press('Enter');
  const blocks = specimen.locator('.canvas-blocks > .block-position > .canvas-block');
  await expect(blocks).toHaveCount(2);
  const first = (await blocks.nth(0).boundingBox())!;
  const second = (await blocks.nth(1).boundingBox())!;
  const after = (await appender.boundingBox())!;
  const betweenBlocks = second.y - first.y - first.height;
  const beforeAppender = after.y - second.y - second.height;
  expect(Math.abs(beforeAppender - betweenBlocks)).toBeLessThanOrEqual(2);

  // Exercise the production Content-slot adapter with a custom block gap.
  await specimen.locator('.canvas-blocks').first().evaluate(canvas => {
    const slot = document.createElement('div');
    slot.className = 'template-content-layout has-layout-options';
    slot.dataset.layoutConstrained = 'true';
    slot.style.setProperty('--block-layout-gap', '32px');
    canvas.parentElement!.insertBefore(slot, canvas);
    slot.appendChild(canvas);
  });
  const firstInSlot = (await blocks.nth(0).boundingBox())!;
  const secondInSlot = (await blocks.nth(1).boundingBox())!;
  const appenderInSlot = (await appender.boundingBox())!;
  const slotBlockGap = secondInSlot.y - firstInSlot.y - firstInSlot.height;
  const slotAppenderGap = appenderInSlot.y - secondInSlot.y - secondInSlot.height;
  expect(Math.abs(slotAppenderGap - slotBlockGap)).toBeLessThanOrEqual(2);
});

test('shared canvas appender matches Gutenberg presentation and keeps insertion behaviour', async ({ page }) => {
  await page.goto('/studio/ui/workspace#block-editor-playground');
  const template = page.getByRole('combobox', { name: 'Playground template' });
  await expect(async () => {
    await template.selectOption('empty');
    await expect(page.getByRole('status').filter({ hasText: 'Empty: 0 top-level blocks.' })).toBeVisible({ timeout: 1000 });
  }).toPass({ timeout: 20000 });

  const appender = page.locator('.ui-block-editor-specimen .canvas-appender');
  const prompt = appender.locator('input');
  const plus = appender.getByRole('button', { name: 'Add block' });
  await expect(prompt).toBeVisible();
  await expect(prompt).toHaveAttribute('placeholder', 'Type / to choose a block');

  const presentation = await appender.evaluate(element => {
    const input = element.querySelector('input')!;
    const button = element.querySelector('button')!;
    const buttonStyle = getComputedStyle(button);
    return {
      appenderFontSize: getComputedStyle(element).fontSize,
      inputFontSize: getComputedStyle(input).fontSize,
      placeholderColor: getComputedStyle(input, '::placeholder').color,
      buttonWidth: button.getBoundingClientRect().width,
      buttonHeight: button.getBoundingClientRect().height,
      iconWidth: button.querySelector('svg')!.getBoundingClientRect().width,
      iconHeight: button.querySelector('svg')!.getBoundingClientRect().height,
      buttonBackground: buttonStyle.backgroundColor,
      buttonForeground: buttonStyle.color,
    };
  });
  expect(presentation.inputFontSize).toBe(presentation.appenderFontSize);
  expect(presentation.placeholderColor).toBe(await prompt.evaluate(input => getComputedStyle(input).color));
  expect(presentation.buttonWidth).toBe(24);
  expect(presentation.buttonHeight).toBe(24);
  expect(presentation.iconWidth).toBe(20);
  expect(presentation.iconHeight).toBe(20);
  expect(presentation.buttonBackground).toBe('rgb(30, 30, 30)');
  expect(presentation.buttonForeground).toBe('rgb(255, 255, 255)');

  await prompt.pressSequentially('/');
  await expect(page.getByRole('dialog', { name: 'Choose a block' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Choose a block' })).toHaveCount(0);

  await plus.click();
  await expect(page.getByRole('dialog', { name: 'Choose a block' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Choose a block' })).toHaveCount(0);

  for (let press = 0; press < 4; press += 1) await prompt.press('Enter');
  await expect(page.getByRole('status').filter({ hasText: 'Empty: 4 top-level blocks.' })).toBeVisible();
  await expect(appender.locator('input[placeholder="Type / to choose a block"]')).toHaveCount(1);
  await expect(plus).toBeVisible();
});
