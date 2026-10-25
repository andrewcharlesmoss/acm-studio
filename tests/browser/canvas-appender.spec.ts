import { expect, test } from '@playwright/test';

test('shared canvas appender matches Gutenberg presentation and keeps insertion behaviour', async ({ page }) => {
  await page.goto('/studio/ui/workspace#block-editor-playground');
  const template = page.getByRole('combobox', { name: 'Playground template' });
  await template.selectOption('empty');
  await expect(page.getByRole('status').filter({ hasText: 'Empty: 0 top-level blocks.' })).toBeVisible();

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
  expect(presentation.placeholderColor).toBe('rgb(117, 117, 117)');
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
