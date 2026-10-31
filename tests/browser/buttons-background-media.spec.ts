import { expect, test } from '@playwright/test';
import path from 'node:path';
import { createStudioHttpFixture } from '../helpers/studio-http-fixture.mjs';

test('Buttons background image selection through Files applies and survives a draft reload', async ({ browser }, testInfo) => {
  test.setTimeout(90000);
  const fixture = await createStudioHttpFixture({ frontendURL: String(testInfo.project.use.baseURL ?? 'http://localhost:3011') });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  page.setDefaultTimeout(10000);
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));

  try {
    await page.goto(`${fixture.origin}/studio`);
    const canvas = page.locator('.block-editor');
    await expect(canvas).toBeVisible();
    if (await page.getByRole('button', { name: 'Try Editing Here', exact: true }).count()) {
      await page.getByRole('button', { name: 'Try Editing Here', exact: true }).click();
    }
    await expect(canvas).not.toHaveAttribute('data-readonly', 'true');

    await page.getByRole('group', { name: 'Editor tools', exact: true }).getByRole('button', { name: 'Add block', exact: true }).click();
    await page.getByRole('searchbox', { name: 'Search blocks', exact: true }).fill('Buttons');
    await page.getByRole('complementary', { name: 'Block Library', exact: true }).getByRole('button', { name: 'Buttons', exact: true }).click();
    await page.getByRole('button', { name: 'List View', exact: true }).click();
    await page.getByRole('tabpanel', { name: 'List View' }).getByRole('button', { name: 'Buttons', exact: true }).click();

    const inspector = page.locator('.studio-inspector');
    await expect(inspector.getByRole('heading', { name: 'Buttons', exact: true, level: 2 })).toBeVisible();
    await inspector.getByRole('button', { name: 'Choose background image', exact: true }).click();
    await page.locator('.media-manager input[type=file]').setInputFiles(path.resolve('public/specimens/landscape.png'));
    await page.locator('.media-file-card').filter({ hasText: 'landscape.png' }).click();
    await page.getByRole('button', { name: 'Use as background image', exact: true }).click();

    const buttons = page.locator('.canvas-block.is-buttons .block-visual-style').first();
    await expect(buttons).toHaveCSS('background-image', /blob:/);
    await expect(page.getByText('List Items changed while choosing an image', { exact: false })).toHaveCount(0);
    await page.getByRole('button', { name: 'Save Draft', exact: true }).click();
    await expect(page.locator('.studio-save-status')).toContainText('Saved locally');
    await page.reload();
    await expect(page.locator('.canvas-block.is-buttons .block-visual-style').first()).toHaveCSS('background-image', /blob:/);
    expect(errors).toEqual([]);
    expect(new URL(page.url()).origin).toBe(fixture.origin);
  } finally {
    await context.close();
    await fixture.close();
  }
});
