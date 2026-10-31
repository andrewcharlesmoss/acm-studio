import { expect, test } from '@playwright/test';
import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { createStudioHttpFixture } from '../helpers/studio-http-fixture.mjs';

test('Test2 image picker and drop save portable images and survive reload', async ({ browser }, testInfo) => {
  test.setTimeout(90000);
  const fixture = await createStudioHttpFixture({ frontendURL: String(testInfo.project.use.baseURL ?? 'http://localhost:3010') });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  async function insertImage() {
    const library = page.getByRole('complementary', { name: 'Block Library', exact: true });
    if (!await library.isVisible()) await page.getByRole('group', { name: 'Editor tools', exact: true }).getByRole('button', { name: 'Add block', exact: true }).click();
    await page.getByRole('searchbox', { name: 'Search blocks', exact: true }).fill('Image');
    await library.getByRole('button', { name: 'Image', exact: true }).click();
    return page.locator('.image-empty-panel').last();
  }
  try {
    await page.goto(`${fixture.origin}/studio?site=test2&library=page`);
    await expect(page.locator('.block-editor')).not.toHaveAttribute('data-readonly', 'true');
    await expect.poll(async () => Boolean(await readFile(path.join(fixture.globalRoot, 'work/global-template-library.json')).catch(() => null))).toBe(true);
    await expect(page.getByRole('tab', { name: /Templates/ })).not.toContainText('…');
    await expect(page.getByRole('button', { name: 'New from template', exact: true })).toBeEnabled({ timeout: 30000 });
    const first = await insertImage();
    const firstId = await first.evaluate(element => element.closest<HTMLElement>('[data-studio-block-anchor-id]')!.dataset.studioBlockAnchorId!);
    const toolbar = page.locator(`[data-studio-block-anchor-id="${firstId}"]`).getByRole('group', { name: 'Image block tools', exact: true });
    async function checkToolbarOrder(populated: boolean) {
      const structure = ['Transform Image block', 'Drag to reorder Image block', 'Move block up', 'Move block down', 'Align block'];
      const labels = [...structure, 'Duotone', 'Image link settings', 'Crop image', 'Add caption', 'Add image', 'Replace image'];
      const controls = populated ? ['Duotone', 'Image link settings', 'Crop image', 'Add caption', 'Replace image'] : ['Duotone', 'Image link settings', 'Add caption', 'Add image'];
      const expected = [...structure, ...controls];
      await expect.poll(() => toolbar.locator('button').evaluateAll((buttons, names) => buttons.map(button => button.getAttribute('aria-label')).filter(label => label && names.includes(label)), labels)).toEqual(expected);
      await toolbar.getByRole('button', { name: 'Duotone', exact: true }).focus();
      for (const label of controls.slice(1)) {
        await page.keyboard.press('Tab');
        await expect(toolbar.getByRole('button', { name: label, exact: true })).toBeFocused();
      }
    }
    await checkToolbarOrder(false);
    const invalidChooserPromise = page.waitForEvent('filechooser');
    await first.getByRole('button', { name: 'Upload', exact: true }).click();
    await (await invalidChooserPromise).setFiles({ name: 'unsupported.avif', mimeType: 'image/avif', buffer: Buffer.from('invalid') });
    await expect(first.getByRole('alert')).toContainText('PNG, JPEG, WebP or GIF');
    await expect(page.locator('.image-field img')).toHaveCount(0);
    const chooserPromise = page.waitForEvent('filechooser');
    await first.getByRole('button', { name: 'Upload', exact: true }).click();
    await (await chooserPromise).setFiles(path.resolve('public/specimens/landscape.png'));
    await expect(page.locator('.image-field img')).toHaveCount(1);
    await checkToolbarOrder(true);
    const second = await insertImage();
    await second.evaluate(async element => {
      const blob = await (await fetch('/specimens/landscape.png')).blob();
      const transfer = new DataTransfer();
      transfer.items.add(new File([blob], 'drop.png', { type: 'image/png' }));
      element.dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer: transfer }));
      element.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: transfer }));
    });
    await expect(page.locator('.image-field img')).toHaveCount(2);
    const third = await insertImage();
    await third.getByRole('button', { name: 'Media Library', exact: true }).click();
    await page.locator('.media-manager input[type=file]').setInputFiles(path.resolve('public/specimens/mont-blanc.jpg'));
    const libraryImage = page.locator('.media-file-card').filter({ hasText: 'mont-blanc.jpg' });
    await expect(libraryImage).toHaveCount(1);
    await libraryImage.click();
    await page.getByRole('button', { name: /^Insert into / }).click();
    await expect(page.getByRole('dialog', { name: 'Describe this image', exact: true })).toHaveCount(0);
    await expect(page.locator('.image-field img')).toHaveCount(3);
    await expect(page.getByRole('img', { name: 'mont-blanc', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Files Browse images and files', exact: true }).click();
    await expect(page.locator('.media-file-card').filter({ hasText: 'mont-blanc.jpg' })).toHaveCount(1);
    await page.getByRole('button', { name: 'Back to Content', exact: true }).click();
    await expect.poll(async () => {
      const source = JSON.parse(await readFile(path.join(fixture.fixtureRoots.test2, 'content/site.json'), 'utf8'));
      return source.documents[0].blocks.filter((block: { type: string; src?: string }) => block.type === 'image' && block.src?.startsWith('/media/')).length;
    }).toBe(3);
    await page.reload();
    await expect(page.locator('.image-field img')).toHaveCount(3);
    for (const image of await page.locator('.image-field img').all()) await expect.poll(() => image.evaluate(node => (node as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  } finally {
    await context.close();
    await fixture.close();
  }
});
