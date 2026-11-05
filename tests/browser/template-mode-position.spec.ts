import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
const templates = (JSON.parse(readFileSync(new URL('../../work/global-template-library.json', import.meta.url), 'utf8')) as { templates: import('../../app/studio/template-model').TemplateStore }).templates;

for (const viewportWidth of [1440, 820, 390]) test(`template content retains its position in Preview at ${viewportWidth}px`, async ({ page }) => {
  const doc = { id: 'position-page', kind: 'page', title: 'Position page', subtitle: '', slug: 'position-page', excerpt: '', status: 'draft', updatedAt: '2026-10-31T00:00:00.000Z', documentShellVersion: 1, tags: [], seoTitle: '', seoDescription: '', blocks: [{ id: 'position-image', type: 'image', src: '/specimens/landscape.png', alt: 'Position image', displayWidth: 600 }, { id: 'position-text', type: 'paragraph', text: 'Position text' }] };
  await page.addInitScript(({ value, templates }) => { localStorage.setItem('acm-studio-workspace-v2', JSON.stringify({ version: 57, activeDocumentId: value.id, documents: [value], categories: [], bin: [] })); const set = templates.sets.find((s) => s.templates.some((t) => t.kind === 'page')); if (!set) throw new Error('No page template set in fixture'); const template = set.templates.find((t) => t.kind === 'page'); if (!template) throw new Error('No page template in fixture'); localStorage.setItem('acm-studio-templates-v1', JSON.stringify({ ...templates, assignments: [{ documentId: value.id, setId: set.id, templateId: template.id, kind: 'page' }], bin: [] })); }, { value: doc, templates });
  await page.setViewportSize({ width: viewportWidth, height: 900 }); await page.goto('/studio?library=page');
  const image = page.getByAltText('Position image'); await expect(image).toBeVisible(); await page.evaluate(() => document.fonts.ready);
  const measure = () => page.evaluate(() => {
    const image = document.querySelector('img[alt="Position image"]')!;
    const text = [...document.querySelectorAll('.paragraph-field, .studio-block-preview p')].find(e => e.textContent === 'Position text')!;
    const frame = image.closest('.block-canvas, .document-preview')!;
    const header = frame.querySelector('.template-part')!;
    const r = (element: Element) => { const rect = element.getBoundingClientRect(); return { x: rect.x, y: rect.y, width: rect.width, height: rect.height }; };
    return { frame: r(frame), header: r(header), image: r(image), text: r(text) };
  });
  const edit = await measure(); await page.getByRole('group', { name: 'Page view' }).getByRole('button', { name: 'Preview', exact: true }).click(); const preview = await measure();
  for (const item of ['header', 'image', 'text'] as const) for (const axis of ['x', 'y', 'width', 'height'] as const) {
    const expected = axis === 'x' || axis === 'y' ? edit[item][axis] - edit.frame[axis] : edit[item][axis];
    const actual = axis === 'x' || axis === 'y' ? preview[item][axis] - preview.frame[axis] : preview[item][axis];
    expect(actual, `${item} ${axis}`).toBeCloseTo(expected, 1);
  }
  if (viewportWidth !== 1440) return;
  await page.getByRole('group', { name: 'Page view' }).getByRole('button', { name: 'Edit', exact: true }).click();
  await image.click();
  const handle = page.getByRole('button', { name: 'Drag to reorder Image block' });
  const box = (await handle.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2 + 15, { steps: 3 });
  await expect(page.locator('.is-block-dragging')).toBeVisible();
  await page.keyboard.press('Escape'); await page.mouse.up();
  await expect(page.locator('.is-block-dragging')).toHaveCount(0);
  const restored = await measure(); expect(restored.image.y - restored.frame.y).toBeCloseTo(edit.image.y - edit.frame.y, 1);
  const dragBox = (await handle.boundingBox())!;
  await page.mouse.move(dragBox.x + dragBox.width / 2, dragBox.y + dragBox.height / 2); await page.mouse.down();
  await page.mouse.move(dragBox.x + dragBox.width / 2, dragBox.y + dragBox.height / 2 + 15, { steps: 3 });
  const last = page.locator('[data-studio-block-anchor-id="position-text"]');
  const lastBox = (await last.boundingBox())!;
  await page.mouse.move(lastBox.x + lastBox.width / 2, lastBox.y + lastBox.height + 5, { steps: 5 });
  await expect(page.locator('.studio-gap-line')).toBeVisible();
  await page.mouse.up();
  const blocks = page.locator('.canvas-blocks > .block-position > .canvas-block');
  await expect(blocks.nth(0)).toHaveAttribute('data-studio-block-anchor-id', 'position-text');
  await expect(blocks.nth(1)).toHaveAttribute('data-studio-block-anchor-id', 'position-image');
  await image.click();
  const returnHandle = page.getByRole('button', { name: 'Drag to reorder Image block' });
  const returnBox = (await returnHandle.boundingBox())!;
  await page.mouse.move(returnBox.x + returnBox.width / 2, returnBox.y + returnBox.height / 2); await page.mouse.down();
  await page.mouse.move(returnBox.x + returnBox.width / 2, returnBox.y + returnBox.height / 2 - 15, { steps: 3 });
  const firstBox = (await blocks.nth(0).boundingBox())!;
  await page.mouse.move(firstBox.x + firstBox.width / 2, firstBox.y - 5, { steps: 5 });
  await expect(page.locator('.studio-gap-line')).toBeVisible();
  await page.mouse.up();
  await expect(blocks.nth(0)).toHaveAttribute('data-studio-block-anchor-id', 'position-image');
  await expect(blocks.nth(1)).toHaveAttribute('data-studio-block-anchor-id', 'position-text');

});
