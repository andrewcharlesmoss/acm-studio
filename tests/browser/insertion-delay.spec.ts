declare global { interface Window { __initialInsertionCue?: Element } }
import { expect, test } from '@playwright/test';

test('gap cue waits briefly, cancels when leaving, and remains immediate for keyboard focus', async ({ page }) => {
  const doc = { id: 'cue-delay', kind: 'page', title: 'Cue delay', subtitle: '', slug: 'cue-delay', excerpt: '', status: 'draft', updatedAt: '2026-10-31T00:00:00.000Z', documentShellVersion: 1, tags: [], seoTitle: '', seoDescription: '', blocks: [{ id: 'first', type: 'paragraph', text: 'First paragraph' }, { id: 'second', type: 'paragraph', text: 'Second paragraph' }, { id: 'third', type: 'paragraph', text: 'Third paragraph' }] };
  await page.addInitScript(doc => localStorage.setItem('acm-studio-workspace-v2', JSON.stringify({ version: 56, activeDocumentId: doc.id, documents: [doc], categories: [], bin: [] })), doc);
  await page.goto('/studio');
  const anchor = page.locator('[data-studio-block-anchor-id="second"]').locator('xpath=..').locator(':scope > .between-blocks');
  await expect(anchor).toBeAttached();
  const r = (await anchor.boundingBox())!;
  const cue = page.locator('.canvas-insertion-cue');
  await page.mouse.move(r.x + r.width / 2, r.y + r.height / 2);
  await expect(cue).toHaveCount(1);
  await expect(cue).toHaveAttribute('data-pointer-cue', 'true');
  const animation = () => cue.evaluate(el => ({ line: getComputedStyle(el, '::before').opacity, plus: getComputedStyle(el.querySelector('span')!).transform, lineDelay: getComputedStyle(el, '::before').animationDelay, plusDelay: getComputedStyle(el.querySelector('span')!).animationDelay }));
  await page.waitForTimeout(100);
  expect(await animation()).toMatchObject({ line: '0', plus: 'matrix(0, 0, 0, 0, 0, 0)', lineDelay: '0.5s', plusDelay: '0.4s' });
  expect(await cue.evaluate(el => [getComputedStyle(el).pointerEvents, getComputedStyle(el.querySelector('span')!).pointerEvents])).toEqual(['none', 'none']);
  await page.mouse.move(0, 0);
  await expect(cue).toHaveCount(0);
  const other = page.locator('[data-studio-block-anchor-id="third"]').locator('xpath=..').locator(':scope > .between-blocks');
  const otherRect = (await other.boundingBox())!;
  await page.mouse.move(r.x + r.width / 2, r.y + r.height / 2);
  await page.waitForTimeout(200);
  await cue.evaluate(element => { window.__initialInsertionCue = element; });
  await page.mouse.move(otherRect.x + otherRect.width / 2, otherRect.y + otherRect.height / 2);
  await expect(cue).toHaveAttribute('data-studio-insertion-proxy-for', await other.getAttribute('id') as string);
  expect(await cue.evaluate(element => element === window.__initialInsertionCue)).toBe(true);
  await page.waitForTimeout(100);
  expect((await animation()).plus).toBe('matrix(0, 0, 0, 0, 0, 0)');
  await page.waitForTimeout(800);
  expect(await animation()).toMatchObject({ line: '1', plus: 'none' });
  await page.mouse.move(0, 0);
  await expect(cue).toHaveCount(0);
  await anchor.focus();
  await expect(cue).toBeVisible();
  await anchor.press('Enter');
  await expect(page.getByRole('dialog', { name: 'Choose a block' })).toBeVisible();
  await page.keyboard.press('Escape');
  await page.mouse.move(r.x + r.width / 2, r.y + r.height / 2);
  await page.waitForTimeout(70);
  await page.locator('[data-studio-block-anchor-id="first"] .paragraph-field').click();
  await page.waitForTimeout(250);
  await expect(cue).toHaveCount(0);
});

test('the Workspace playground uses the same delayed insertion cue', async ({ page }) => {
  await page.goto('/studio/ui/workspace#block-editor-playground');
  const example = page.locator('#block-editor-playground');
  const template = example.getByRole('combobox', { name: 'Playground template' });
  await expect(async () => {
    await template.selectOption('empty');
    await expect(example.getByRole('textbox', { name: 'Paragraph text' }).first()).toBeVisible({ timeout: 1000 });
  }).toPass({ timeout: 20000 });
  const paragraph = example.getByRole('textbox', { name: 'Paragraph text' }).first();
  await paragraph.pressSequentially('First');
  await paragraph.press('Enter');
  await example.locator('.block-canvas').click({ position: { x: 5, y: 5 } });
  const anchor = example.locator('.block-position > .between-blocks').first();
  await expect(anchor).toBeAttached();
  const rect = (await anchor.boundingBox())!;
  await page.mouse.move(rect.x + rect.width / 2, rect.y + rect.height / 2);
  const cue = page.locator('.canvas-insertion-cue');
  await expect(cue).toBeVisible();
  await expect(cue).toHaveAttribute('data-pointer-cue', 'true');
  await expect.poll(() => cue.evaluate(el => getComputedStyle(el.querySelector('span')!).transform)).toBe('none');
});

test('pointer can activate a real wide gap near either neighbour', async ({ page }) => {
  const doc = { id: 'wide-gap', kind: 'page', title: 'Wide gap', subtitle: '', slug: 'wide-gap', excerpt: '', status: 'draft', updatedAt: '2026-10-31T00:00:00.000Z', documentShellVersion: 1, tags: [], seoTitle: '', seoDescription: '', blocks: [{ id: 'wide-first', type: 'paragraph', text: 'First' }, { id: 'wide-second', type: 'paragraph', text: 'Second' }] };
  await page.addInitScript(doc => localStorage.setItem('acm-studio-workspace-v2', JSON.stringify({ version: 56, activeDocumentId: doc.id, documents: [doc], categories: [], bin: [] })), doc);
  await page.goto('/studio');
  const first = page.locator('[data-studio-block-anchor-id="wide-first"]');
  const second = page.locator('[data-studio-block-anchor-id="wide-second"]');
  await expect(first).toBeVisible();
  await page.addStyleTag({ content: '.block-position + .block-position { margin-top: 100px !important; }' });
  const previous = (await first.boundingBox())!;
  const next = (await second.boundingBox())!;
  expect(next.y - (previous.y + previous.height)).toBeGreaterThan(80);
  const cue = page.locator('.canvas-insertion-cue');
  for (const y of [previous.y + previous.height + 5, next.y - 5]) {
    await page.mouse.move(previous.x + previous.width / 2, y);
    await expect(cue).toHaveCount(1);
    await page.mouse.move(0, 0);
    await expect(cue).toHaveCount(0);
  }
});

test('moving across a paragraph reveals the next gap and inserts there', async ({ page }) => {
  const doc = { id: 'gap-move', kind: 'page', title: 'Gap movement', subtitle: '', slug: 'gap-move', excerpt: '', status: 'draft', updatedAt: '2026-10-31T00:00:00.000Z', documentShellVersion: 1, tags: [], seoTitle: '', seoDescription: '', blocks: [{ id: 'move-first', type: 'paragraph', text: 'First paragraph' }, { id: 'move-middle', type: 'paragraph', text: 'Middle paragraph' }, { id: 'move-last', type: 'paragraph', text: 'Last paragraph' }] };
  await page.addInitScript(value => localStorage.setItem('acm-studio-workspace-v2', JSON.stringify({ version: 57, activeDocumentId: value.id, documents: [value], categories: [], bin: [] })), doc);
  await page.goto('/studio?library=page');
  const middle = page.locator('[data-studio-block-anchor-id="move-middle"]');
  const last = page.locator('[data-studio-block-anchor-id="move-last"]');
  const beforeMiddle = middle.locator('xpath=..').locator(':scope > .between-blocks');
  const beforeLast = last.locator('xpath=..').locator(':scope > .between-blocks');
  await expect(middle).toBeVisible();
  const firstGap = (await beforeMiddle.boundingBox())!;
  const secondGap = (await beforeLast.boundingBox())!;
  const middleText = (await middle.locator('.paragraph-field').boundingBox())!;
  const cue = page.locator('.canvas-insertion-cue');
  await page.mouse.move(firstGap.x + firstGap.width / 2, firstGap.y + firstGap.height / 2);
  await expect(cue).toHaveAttribute('data-studio-insertion-proxy-for', await beforeMiddle.getAttribute('id') as string);
  await page.mouse.move(middleText.x + 20, middleText.y + middleText.height / 2);
  await expect(cue).toHaveCount(0);
  await page.mouse.move(secondGap.x + secondGap.width / 2, secondGap.y + secondGap.height / 2);
  await expect(cue).toHaveAttribute('data-studio-insertion-proxy-for', await beforeLast.getAttribute('id') as string);
  await expect.poll(() => cue.evaluate(el => getComputedStyle(el.querySelector('span')!).transform)).toBe('none');
  await cue.locator('span').click();
  await expect(page.getByRole('dialog', { name: 'Choose a block' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(beforeLast).toBeFocused();
  await beforeLast.press('Enter');
  await page.getByRole('dialog', { name: 'Choose a block' }).getByRole('button', { name: 'Heading', exact: true }).click();
  const blocks = page.locator('.canvas-blocks > .block-position > .canvas-block');
  await expect(blocks).toHaveCount(4);
  await expect(blocks.nth(1)).toHaveAttribute('data-studio-block-anchor-id', 'move-middle');
  await expect(blocks.nth(2)).toHaveClass(/is-heading/);
  await expect(blocks.nth(3)).toHaveAttribute('data-studio-block-anchor-id', 'move-last');
});
