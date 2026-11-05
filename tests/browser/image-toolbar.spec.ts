import { expect, test } from '@playwright/test';
import { isolatedNativeZoom, zoomMetrics } from './helpers/native-zoom';

test('Crop shared controls retain their geometry and keyboard behaviour at native Chrome 200%', async ({ browserName: _browserName }, testInfo) => {
  const enlarged = await isolatedNativeZoom(2);
  try {
    const page = enlarged.context.pages()[0];
    await page.goto(`${testInfo.project.use.baseURL ?? 'http://localhost:3010'}/studio/ui/blocks/image`);
    await expect(page.locator('.ui-block-specimen')).toHaveAttribute('data-ready', 'true');
    const metrics = await zoomMetrics(page);
    expect(metrics.cssZoom).toBe('1');
    expect(metrics.innerWidth).toBeLessThanOrEqual(metrics.outerWidth / 1.9);
    const crop = page.locator('.ui-library-canvas').getByRole('button', { name: 'Crop image', exact: true });
    await crop.click();
    const dialog = page.getByRole('dialog', { name: 'Crop image', exact: true });
    const bounds = (await dialog.boundingBox())!;
    expect(bounds.x).toBeGreaterThanOrEqual(0);
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(metrics.innerWidth + 1);
    const radii = await dialog.evaluate(element => { const style = getComputedStyle(element); return [style.borderTopLeftRadius, style.borderTopRightRadius, style.borderBottomLeftRadius, style.borderBottomRightRadius]; });
    expect(radii).toEqual(['8px', '8px', '8px', '8px']);
    const zoom = dialog.getByRole('slider', { name: 'Zoom', exact: true });
    await zoom.focus(); await zoom.press('ArrowRight');
    await expect(zoom).toHaveValue('1.01');
    await page.screenshot({ path: testInfo.outputPath('crop-native-200.png') });
    await zoom.press('Escape'); await expect(dialog).toHaveCount(0);
    await expect(crop).toBeFocused();
  } finally { await enlarged.close(); }
});

for (const [width, zoom] of [[1440, 1], [820, 1], [390, 1], [1440, 2]]) {
  test.describe(`${width}px / ${zoom * 100}%`, () => {
  // Browser zoom reduces the CSS viewport and increases device-pixel scaling.
  test.use({ viewport: { width: width / zoom, height: 960 / zoom }, deviceScaleFactor: zoom });
  test(`Crop shared controls remain usable at ${width}px and ${zoom * 100}%`, async ({ page }, testInfo) => {
    await page.goto('/studio/ui/blocks/image');
    await expect(page.locator('.ui-block-specimen')).toHaveAttribute('data-ready', 'true');
    const crop = page.locator('.ui-library-canvas').getByRole('button', { name: 'Crop image', exact: true });
    await crop.click();
    const dialog = page.getByRole('dialog', { name: 'Crop image', exact: true });
    await expect(dialog.getByRole('combobox', { name: 'Aspect ratio', exact: true })).toBeEnabled();
    const bounds = await dialog.boundingBox();
    expect(bounds).not.toBeNull();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width / zoom + 1);
    for (const name of ['Left', 'Top', 'Width', 'Height']) {
      const field = dialog.getByRole('spinbutton', { name, exact: true });
      await field.scrollIntoViewIfNeeded();
      const box = await field.boundingBox();
      expect(box!.x).toBeGreaterThanOrEqual(bounds!.x);
      expect(box!.x + box!.width).toBeLessThanOrEqual(bounds!.x + bounds!.width);
    }
    const zoomControl = dialog.getByRole('slider', { name: 'Zoom', exact: true });
    await zoomControl.focus();
    await zoomControl.press('ArrowRight');
    await expect(zoomControl).toHaveValue('1.01');
    await page.screenshot({ path: testInfo.outputPath('crop-dialog.png') });
    await zoomControl.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect(crop).toBeFocused();
  });
  });
}

test('Image caption focus activates formatting and keyboard navigation clears it', async ({ page }) => {
  await page.goto('/studio/ui/blocks/image');
  await expect(page.locator('.ui-block-specimen')).toHaveAttribute('data-ready', 'true');
  const editor = page.locator('.ui-library-canvas');
  const labels = ['Bold selected text', 'Italicise selected text', 'Add or edit hyperlink'];
  for (const name of labels) await expect(editor.getByRole('button', { name, exact: true })).toHaveCount(0);
  const caption = editor.getByRole('textbox', { name: 'Image caption' });
  await caption.focus();
  await expect(caption).toBeFocused();
  for (const name of labels) await expect(editor.getByRole('button', { name, exact: true })).toBeVisible();
  await caption.press('Shift+Tab');
  await expect(caption).not.toBeFocused();
  for (const name of labels) await expect(editor.getByRole('button', { name, exact: true })).toHaveCount(0);
});

test('Image caption toggle preserves the caption through Undo', async ({ page }) => {
  await page.goto('/studio/ui/blocks/image');
  await expect(page.locator('.ui-block-specimen')).toHaveAttribute('data-ready', 'true');
  const editor = page.locator('.ui-library-canvas');
  const caption = editor.getByRole('textbox', { name: 'Image caption' });
  const original = await caption.innerText();
  await editor.getByRole('button', { name: 'Remove caption' }).click();
  await expect(caption).toHaveCount(0);
  await page.getByRole('button', { name: 'Undo specimen change' }).click();
  await expect(caption).toHaveText(original);
  await editor.getByRole('button', { name: 'Remove caption' }).click();
  await editor.getByRole('button', { name: 'Add caption' }).click();
  await expect(caption).toBeFocused();
  await caption.fill('A new caption');
  await expect(caption).toHaveText('A new caption');
});

test('Image Group transform retains the image and caption through Undo', async ({ page }) => {
  await page.goto('/studio/ui/blocks/image');
  await expect(page.locator('.ui-block-specimen')).toHaveAttribute('data-ready', 'true');
  const editor = page.locator('.ui-library-canvas');
  const original = await editor.getByRole('textbox', { name: 'Image caption' }).innerText();
  await editor.getByRole('button', { name: 'Transform Image block' }).click();
  await page.getByRole('menu', { name: 'Transform block' }).getByRole('menuitem', { name: 'Group', exact: true }).click();
  await expect(editor.getByRole('group', { name: 'Group block tools' })).toBeVisible();
  await expect(editor.getByRole('textbox', { name: 'Image caption' })).toHaveText(original);
  await page.getByRole('button', { name: 'Undo specimen change' }).click();
  await expect(editor.getByRole('button', { name: 'Transform Image block' })).toBeVisible();
  await expect(editor.getByRole('textbox', { name: 'Image caption' })).toHaveText(original);
});

test('Image Media & Text adaptation creates equal Columns and keeps the Image intact in Edit and Preview', async ({ page }) => {
  await page.goto('/studio/ui/blocks/image');
  await expect(page.locator('.ui-block-specimen')).toHaveAttribute('data-ready', 'true');
  const editor = page.locator('.ui-library-canvas');
  const originalCaption = await editor.getByRole('textbox', { name: 'Image caption' }).innerText();

  await editor.getByRole('button', { name: 'Transform Image block' }).click();
  await page.getByRole('menu', { name: 'Transform block' }).getByRole('menuitem', { name: 'Media & Text (Columns)', exact: true }).click();
  const columns = editor.locator('.studio-columns');
  await expect(columns).toBeVisible();
  await expect(columns.locator('.studio-column-block')).toHaveCount(2);
  await expect(columns.locator('.image-field img')).toHaveAttribute('alt', 'Illustrated green hill with a blue sky');
  await expect(columns.getByRole('textbox', { name: 'Image caption' })).toHaveText(originalCaption);
  await expect(columns.locator('.paragraph-field[contenteditable="true"]')).toHaveCount(1);

  await page.getByRole('button', { name: 'Preview', exact: true }).click();
  const previewColumns = page.locator('.document-preview .content-columns');
  await expect(previewColumns).toBeVisible();
  await expect(previewColumns.locator('img')).toHaveAttribute('alt', 'Illustrated green hill with a blue sky');
  await expect(previewColumns).toContainText(originalCaption);
});

test('Image transforms to an editable Cover in the main editor', async ({ page }) => {
  const document = {
    id: 'cover-test-page', kind: 'page', title: 'Cover transform test', subtitle: '', slug: 'cover-transform-test',
    excerpt: '', status: 'draft', updatedAt: '2026-10-28T00:00:00.000Z', documentShellVersion: 1,
    tags: [], template: 'default', seoTitle: '', seoDescription: '',
    blocks: [{ id: 'cover-source-image', type: 'image', src: '/specimens/landscape.svg', alt: 'Green hills beneath a blue sky', caption: 'A caption that becomes editable Cover text' }],
  };
  await page.addInitScript(workspace => {
    localStorage.setItem('acm-studio-workspace-v2', JSON.stringify({ version: 46, activeDocumentId: workspace.id, documents: [workspace], categories: [], bin: [] }));
  }, document);
  await page.goto('/studio');

  const image = page.locator('[data-studio-block-anchor-id="cover-source-image"]');
  await expect(image.locator('figure.image-field')).toBeVisible();
  await image.getByRole('button', { name: 'Transform Image block' }).click();
  await page.getByRole('menu', { name: 'Transform block' }).getByRole('menuitem', { name: 'Cover', exact: true }).click();

  const cover = page.locator('[data-studio-block-anchor-id="cover-source-image"]');
  await expect(cover.locator('figure.content-cover')).toBeVisible();
  const media = cover.locator('.content-cover-background img');
  await expect(media).toHaveAttribute('src', '/specimens/landscape.svg');
  await expect.poll(() => media.evaluate(element => (element as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  const caption = cover.locator('[data-studio-nested-block-id="cover-caption"]');
  const text = caption.locator('[contenteditable="true"][data-studio-block-id="cover-caption"]');
  await expect(text).toHaveText('A caption that becomes editable Cover text');
  await text.click();
  await expect(caption).toHaveAttribute('data-studio-selected', 'true');
  await text.fill('Edited text over the image');
  await expect(text).toHaveText('Edited text over the image');

  const add = cover.locator('.nested-end-inserter');
  await expect(add).toBeVisible();
  await add.click();
  const chooser = page.getByRole('dialog', { name: 'Choose a block' });
  await expect(chooser).toBeVisible();
  await chooser.getByRole('button', { name: 'Paragraph', exact: true }).click();
  await expect(cover.locator('[data-studio-nested-block-id]')).toHaveCount(2);
  await expect(cover.locator('.paragraph-field[contenteditable="true"]')).toHaveCount(2);

  await page.getByRole('button', { name: 'Preview', exact: true }).click();
  await expect(page.locator('.document-preview .content-cover .content-cover-background img')).toHaveAttribute('src', '/specimens/landscape.svg');
  await expect(page.locator('.document-preview .content-cover')).toContainText('Edited text over the image');
});

test('Image Group transform is withheld for locked blocks and caption controls are disabled in read-only mode', async ({ page }) => {
  await page.goto('/studio/ui/blocks/image');
  await expect(page.locator('.ui-block-specimen')).toHaveAttribute('data-ready', 'true');
  const editor = page.locator('.ui-library-canvas');
  await page.getByRole('checkbox', { name: 'Lock move and remove' }).check();
  await expect(editor.getByRole('button', { name: 'Transform Image block' })).toHaveCount(0);
  await page.getByRole('checkbox', { name: 'Read-only example' }).check();
  await expect(editor.getByRole('button', { name: /(?:Add|Remove) caption/ })).toBeDisabled();
  await expect(editor.getByRole('button', { name: 'Image link settings' })).toBeDisabled();
});

test('Image link settings update the image and the inspector using the same destination fields', async ({ page }) => {
  await page.goto('/studio/ui/blocks/image');
  await expect(page.locator('.ui-block-specimen')).toHaveAttribute('data-ready', 'true');
  const editor = page.locator('.ui-library-canvas');
  const pane = page.getByRole('complementary', { name: 'Image settings', exact: true });
  await editor.getByRole('button', { name: 'Image link settings' }).click();
  const dialog = page.getByRole('dialog', { name: 'Image link settings' });
  await dialog.getByLabel('Link destination').selectOption('custom');
  await dialog.getByLabel('Link URL').fill('https://example.com/image');
  await dialog.getByLabel('Open in new tab').check();
  await expect(pane.getByLabel('Link destination')).toHaveValue('custom');
  await expect(pane.getByLabel('Link URL')).toHaveValue('https://example.com/image');
  await expect(editor.locator('figure.image-field a')).toHaveAttribute('href', 'https://example.com/image');
  await expect(editor.locator('figure.image-field a')).toHaveAttribute('target', '_blank');
  await page.keyboard.press('Escape');
  await expect(editor.getByRole('button', { name: 'Image link settings' })).toBeFocused();
  await page.getByRole('button', { name: 'Undo specimen change' }).click();
  await expect(editor.locator('figure.image-field a')).not.toHaveAttribute('target', '_blank');
});

test('Image crop supports keyboard editing, transforms, persistence in the specimen and Undo/Redo', async ({ page }) => {
  await page.goto('/studio/ui/blocks/image');
  await expect(page.locator('.ui-block-specimen')).toHaveAttribute('data-ready', 'true');
  const editor = page.locator('.ui-library-canvas');
  const cropButton = editor.getByRole('button', { name: 'Crop image' });
  await cropButton.click();
  const dialog = page.getByRole('dialog', { name: 'Crop image' });
  await expect(dialog).toBeVisible();

  await dialog.getByLabel('Width', { exact: true }).fill('80');
  const moveHandle = dialog.getByRole('slider', { name: 'Move crop area' });
  await moveHandle.focus();
  await page.keyboard.press('ArrowRight');
  await expect(moveHandle).toHaveAttribute('aria-valuenow', '1');
  await dialog.getByLabel('Aspect ratio').selectOption('square');
  const straighten = dialog.getByLabel('Straighten');
  await straighten.focus();
  for (let step = 0; step < 10; step += 1) await page.keyboard.press('ArrowRight');
  await expect(straighten).toHaveValue('10');
  await dialog.getByRole('button', { name: 'Rotate right 90°' }).click();
  await expect(straighten).toHaveValue('10');
  await expect(dialog.locator('output').filter({ hasText: '10°' })).toBeVisible();
  await dialog.getByRole('button', { name: 'Flip horizontal' }).click();
  await dialog.getByRole('button', { name: 'Apply', exact: true }).click();
  await expect(dialog).toHaveCount(0);

  const cropped = editor.locator('svg[viewBox] image');
  await expect(cropped).toHaveAttribute('transform', /rotate\(100\).*scale\(-1 1\)/);
  await expect(cropButton).toBeFocused();
  await page.getByRole('button', { name: 'Undo specimen change' }).click();
  await expect(editor.locator('figure.image-field img')).toBeVisible();
  await page.getByRole('button', { name: 'Redo specimen change' }).click();
  await expect(editor.locator('svg[viewBox] image')).toHaveAttribute('transform', /rotate\(100\)/);
  const cropSurface = editor.locator('figure.image-field svg[viewBox]');
  const before = (await cropSurface.boundingBox())!.width;
  const resize = editor.getByRole('button', { name: 'Resize image width' });
  await resize.focus();
  await page.keyboard.press('Shift+ArrowLeft');
  await expect.poll(async () => (await cropSurface.boundingBox())!.width).toBeLessThan(before);
  const after = (await cropSurface.boundingBox())!.width;
  await page.getByRole('group', { name: 'Specimen view' }).getByRole('button', { name: 'Preview' }).click();
  const preview = page.locator('.ui-block-canvas figure svg[viewBox]');
  await expect(preview).toBeVisible();
  expect(Math.abs((await preview.boundingBox())!.width - after)).toBeLessThanOrEqual(1);
});

test('Image crop waits for intrinsic dimensions and never persists the 1x1 loading placeholder', async ({ page }) => {
  let releaseImage!: () => void;
  let signalImageRequest!: () => void;
  const heldImage = new Promise<void>(resolve => { releaseImage = resolve; });
  const imageRequested = new Promise<void>(resolve => { signalImageRequest = resolve; });
  await page.route('**/specimens/landscape.svg', async route => {
    signalImageRequest();
    await heldImage;
    await route.continue();
  });

  await page.addInitScript(() => {
    const document = { id: 'crop-loading', kind: 'page', title: 'Crop loading', subtitle: '', slug: 'crop-loading', excerpt: '', status: 'draft', updatedAt: '2026-11-05T00:00:00Z', documentShellVersion: 1, tags: [], template: 'default', seoTitle: '', seoDescription: '', blocks: [{ id: 'crop-loading-image', type: 'image', src: '/specimens/landscape.svg', alt: 'Landscape', caption: 'Loading crop source' }] };
    localStorage.setItem('acm-studio-workspace-v2', JSON.stringify({ version: 59, activeDocumentId: document.id, documents: [document], categories: [], bin: [] }));
  });
  await page.goto('/studio', { waitUntil: 'domcontentloaded' });
  await imageRequested;
  const editor = page.locator('.block-editor');
  await page.locator('[data-studio-block-anchor-id="crop-loading-image"]').click();
  await editor.getByRole('button', { name: 'Crop image' }).click();
  const dialog = page.getByRole('dialog', { name: 'Crop image' });
  const apply = dialog.getByRole('button', { name: 'Apply', exact: true });
  await expect(dialog.getByLabel('Aspect ratio')).toBeDisabled();
  await expect(apply).toBeDisabled();

  releaseImage();
  await expect(dialog.getByLabel('Aspect ratio')).toBeEnabled();
  await dialog.getByRole('spinbutton', { name: 'Width', exact: true }).fill('80');
  await dialog.getByRole('spinbutton', { name: 'Left', exact: true }).fill('10');
  await apply.click();
  const renderedImage = editor.locator('svg[viewBox] image').first();
  const viewBox = await renderedImage.evaluate(element => element.closest('svg')?.getAttribute('viewBox'));
  expect(viewBox).not.toBeNull();
  const [, , width, height] = viewBox!.split(/\s+/).map(Number);
  expect(width).toBeGreaterThan(1);
  expect(height).toBeGreaterThan(1);
  expect(viewBox).not.toBe('0 0 1 1');
});

test('Image Group undo and redo keep a valid selection in the production Template editor', async ({ page }) => {
  await page.goto('/studio/ui/selection/template');
  const image = page.locator('[data-studio-block-anchor-id="template-image"]');
  await image.click();
  await page.getByRole('button', { name: 'Transform Image block' }).click();
  await page.getByRole('menu', { name: 'Transform block' }).getByRole('menuitem', { name: 'Group', exact: true }).click();
  const group = page.getByRole('group', { name: 'Group block tools' });
  await expect(group).toBeVisible();
  await page.keyboard.press('Meta+z');
  await expect(page.getByRole('button', { name: 'Transform Image block' })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Image caption' })).toHaveText('Template image caption');
  await page.keyboard.press('Meta+Shift+z');
  await expect(page.getByRole('textbox', { name: 'Image caption' })).toHaveText('Template image caption');
  await expect(page.locator('div[data-studio-nested-block-id="template-image"]')).toHaveAttribute('data-studio-selected', 'true');
});

for (const width of [1440, 820, 390]) {
  test(`Image toolbar remains reachable at ${width}px viewport width`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/studio/ui/blocks/image');
    await expect(page.locator('.ui-block-specimen')).toHaveAttribute('data-ready', 'true');
    const canvas = page.locator('.ui-block-canvas');
    const toolbar = canvas.getByRole('group', { name: 'Image block tools' });
    const transform = toolbar.getByRole('button', { name: 'Transform Image block' });
    const scrollArea = canvas.locator('.editor-canvas-scroll');
    const replace = toolbar.getByRole('button', { name: 'Replace image', exact: true });
    const [scrollBounds, toolbarBounds, replaceBounds] = await Promise.all([scrollArea.boundingBox(), toolbar.boundingBox(), replace.boundingBox()]);
    expect(scrollBounds).not.toBeNull();
    expect(toolbarBounds).not.toBeNull();
    expect(replaceBounds).not.toBeNull();
    expect(toolbarBounds!.y).toBeGreaterThanOrEqual(scrollBounds!.y - 1);
    expect(toolbarBounds!.x).toBeGreaterThanOrEqual(scrollBounds!.x - 1);
    expect(toolbarBounds!.x + toolbarBounds!.width).toBeLessThanOrEqual(scrollBounds!.x + scrollBounds!.width + 1);
    expect(replaceBounds!.width).toBeGreaterThan(40);
    await expect(replace).toHaveCSS('white-space', 'nowrap');
    await page.screenshot({ path: testInfo.outputPath(`before-image-toolbar-${width}.png`) });
    try { await transform.click({ timeout: 5000 }); } catch (error) {
      await page.screenshot({ path: testInfo.outputPath(`failed-image-toolbar-${width}.png`) });
      throw error;
    }
    const menu = page.getByRole('menu', { name: 'Transform block' });
    await expect(menu.getByRole('menuitem', { name: 'Group', exact: true })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(transform).toBeFocused();
    await expect(transform).toHaveCSS('outline-style', 'solid');
    const canvasBox = await canvas.boundingBox();
    const toolbarBox = await toolbar.boundingBox();
    expect(canvasBox).not.toBeNull();
    expect(toolbarBox).not.toBeNull();
    expect(toolbarBox!.x).toBeGreaterThanOrEqual(canvasBox!.x - 1);
    expect(toolbarBox!.x + toolbarBox!.width).toBeLessThanOrEqual(canvasBox!.x + canvasBox!.width + 1);
    for (const name of ['Image link settings', 'Remove caption']) await expect(toolbar.getByRole('button', { name })).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath(`image-toolbar-${width}.png`) });
  });
}

test('Image toolbar remains reachable with 200% document scaling', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/studio/ui/blocks/image');
  await expect(page.locator('.ui-block-specimen')).toHaveAttribute('data-ready', 'true');
  // CSS scaling exercises the 200% layout; real browser zoom remains a separate check.
  await page.addStyleTag({ content: 'html { zoom: 2 !important; }' });
  const toolbar = page.locator('.ui-block-canvas').getByRole('group', { name: 'Image block tools' });
  const transform = toolbar.getByRole('button', { name: 'Transform Image block' });
  await transform.click();
  await expect(page.getByRole('menu', { name: 'Transform block' }).getByRole('menuitem', { name: 'Group', exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(transform).toBeFocused();
  await expect(transform).toHaveCSS('outline-style', 'solid');
  await expect(toolbar.getByRole('button', { name: 'Image link settings' })).toBeVisible();
  await expect(toolbar.getByRole('button', { name: 'Remove caption' })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('image-toolbar-200-percent.png') });
});

test("Image block toolbar uses the white Gutenberg surface", async ({ page }) => {
  await page.goto('/studio/ui/blocks/image');
  await expect(page.locator('.ui-block-specimen')).toHaveAttribute('data-ready', 'true');
  const toolbar = page.locator('.ui-block-canvas').getByRole('group', { name: 'Image block tools' });
  await expect(toolbar).toBeVisible();
  await expect(toolbar).toHaveCSS('background-color', 'rgb(255, 255, 255)');
});

test('selected Image block can be resized from either edge and the dimensions undo together', async ({ page }) => {
  await page.goto('/studio/ui/blocks/image');
  await expect(page.locator('.ui-block-specimen')).toHaveAttribute('data-ready', 'true');
  const editor = page.locator('.ui-library-canvas');
  const image = editor.locator('figure.image-field img').first();
  await page.getByRole('tablist', { name: 'Image inspector' }).getByRole('tab', { name: 'Styles' }).click();
  const width = page.getByRole('spinbutton', { name: 'Width (px)' });
  const height = page.getByRole('spinbutton', { name: 'Height (px)' });
  await expect(image).toBeVisible();
  await expect.poll(() => image.evaluate(node => (node as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  const widthHandle = editor.getByRole('button', { name: 'Resize image width' });
  const heightHandle = editor.getByRole('button', { name: 'Resize image height' });
  await expect(widthHandle).toBeVisible();
  await expect(heightHandle).toBeVisible();
  await expect(widthHandle).toHaveCSS('cursor', 'ew-resize');
  await expect(heightHandle).toHaveCSS('cursor', 'ns-resize');
  const imageBox = await image.boundingBox();
  const widthHandleBox = await widthHandle.boundingBox();
  const heightHandleBox = await heightHandle.boundingBox();
  expect(imageBox).not.toBeNull();
  expect(widthHandleBox).not.toBeNull();
  expect(heightHandleBox).not.toBeNull();
  expect(Math.abs(widthHandleBox!.x + widthHandleBox!.width / 2 - (imageBox!.x + imageBox!.width))).toBeLessThanOrEqual(1);
  expect(Math.abs(heightHandleBox!.y + heightHandleBox!.height / 2 - (imageBox!.y + imageBox!.height))).toBeLessThanOrEqual(1);
  const captionBox = await editor.locator('figure.image-field figcaption').boundingBox();
  expect(captionBox).not.toBeNull();
  expect(captionBox!.y).toBeGreaterThanOrEqual(imageBox!.y + imageBox!.height + 15);
  const originalWidth = Number(await width.inputValue());
  const originalHeight = Number(await height.inputValue());

  const drag = async (label: string, dx: number, dy: number) => {
    const handle = editor.getByRole('button', { name: label });
    await handle.scrollIntoViewIfNeeded();
    const box = await handle.boundingBox();
    expect(box).not.toBeNull();
    const x = box!.x + box!.width / 2;
    const y = box!.y + box!.height / 2;
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x + dx, y + dy, { steps: 4 });
    await page.mouse.up();
  };

  await drag('Resize image width', -36, 0);
  await expect.poll(async () => Number(await width.inputValue())).toBeLessThan(originalWidth);
  const afterWidth = Number(await width.inputValue());
  const afterWidthHeight = Number(await height.inputValue());
  expect(afterWidthHeight).toBeLessThan(originalHeight);

  await drag('Resize image height', 0, -24);
  await expect.poll(async () => Number(await height.inputValue())).toBeLessThan(afterWidthHeight);
  await expect.poll(async () => Number(await width.inputValue())).toBeLessThan(afterWidth);

  await page.getByRole('button', { name: 'Undo specimen change' }).click();
  await expect(width).toHaveValue(String(afterWidth));
  await expect(height).toHaveValue(String(afterWidthHeight));
  await page.getByRole('button', { name: 'Undo specimen change' }).click();
  await expect(width).toHaveValue(String(originalWidth));
  await expect(height).toHaveValue(String(originalHeight));

  await widthHandle.focus();
  await page.keyboard.press('ArrowLeft');
  await expect.poll(async () => Number(await width.inputValue())).toBeLessThan(originalWidth);
  await page.getByRole('button', { name: 'Undo specimen change' }).click();
  await expect(width).toHaveValue(String(originalWidth));

  await page.getByRole('group', { name: 'Specimen view' }).getByRole('button', { name: 'Preview' }).click();
  await expect(page.locator('.ui-library-canvas').getByRole('button', { name: /Resize image/ })).toHaveCount(0);
});
