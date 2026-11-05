import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
const templates = (JSON.parse(readFileSync(new URL('../../work/global-template-library.json', import.meta.url), 'utf8')) as { templates: import('../../app/studio/template-model').TemplateStore }).templates;

test('multiple selected blocks have the same even highlight', async ({ page }) => {
  const doc = { id: 'selection-colour', kind: 'page', title: 'Selection', subtitle: '', slug: 'selection', excerpt: '', status: 'draft', updatedAt: '2026-10-31T00:00:00.000Z', documentShellVersion: 1, tags: [], seoTitle: '', seoDescription: '', blocks: Array.from({ length: 4 }, (_, index) => ({ id: `selection-${index}`, type: 'paragraph', text: '' })) };
  await page.addInitScript(({ value, templates }) => { localStorage.setItem('acm-studio-workspace-v2', JSON.stringify({ version: 57, activeDocumentId: value.id, documents: [value], categories: [], bin: [] })); const set = templates.sets.find((s) => s.templates.some((t) => t.kind === 'page')); if (!set) throw new Error('No page template set in fixture'); const template = set.templates.find((t) => t.kind === 'page'); if (!template) throw new Error('No page template in fixture'); localStorage.setItem('acm-studio-templates-v1', JSON.stringify({ ...templates, assignments: [{ documentId: value.id, setId: set.id, templateId: template.id, kind: 'page' }], bin: [] })); }, { value: doc, templates });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/studio?library=page');
  const blocks = page.locator('.canvas-blocks > .block-position > .canvas-block');
  await expect(blocks).toHaveCount(4);
  await blocks.nth(0).click();
  await blocks.nth(3).click({ modifiers: ['Shift'] });
  const selected = page.locator('.canvas-block[data-studio-multi-selected="true"]');
  await expect(selected).toHaveCount(4);
  await page.mouse.move(0, 0);
  const boxes = await Promise.all((await selected.all()).map(block => block.boundingBox()));
  const screenshot = (await page.screenshot()).toString('base64');
  const samples = await page.evaluate(async ({ screenshot, boxes }) => {
    const image = new Image(); image.src = `data:image/png;base64,${screenshot}`; await image.decode();
    const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height;
    const context = canvas.getContext('2d')!; context.drawImage(image, 0, 0);
    const pixel = (x: number, y: number) => [...context.getImageData(Math.floor(x * devicePixelRatio), Math.floor(y * devicePixelRatio), 1, 1).data].slice(0, 3);
    return boxes.map(box => { const b = box!; return [pixel(b.x + b.width / 2, b.y + 3), pixel(b.x + b.width / 2, b.y + b.height - 4)]; });
  }, { screenshot, boxes });
  for (const [top, bottom] of samples) { expect(top).toEqual(samples[0][0]); expect(bottom).toEqual(samples[0][0]); }
});
