import { expect, test } from '@playwright/test';
import { createStudioHttpFixture } from '../helpers/studio-http-fixture.mjs';

test('ordinary editor saves and reloads a per-side margin override', async ({ browser }, testInfo) => {
  test.setTimeout(90000);
  const fixture = await createStudioHttpFixture({ frontendURL: String(testInfo.project.use.baseURL) });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  try {
  const document = { id: 'inherited-margin-page', kind: 'page', title: 'Margin example', subtitle: '', slug: 'margin-example', excerpt: '', status: 'draft', updatedAt: '2026-10-31T00:00:00.000Z', documentShellVersion: 1, tags: [], seoTitle: '', seoDescription: '', blocks: [{ id: 'margin-paragraph', type: 'paragraph', text: 'Margin example' }] };
  await page.addInitScript(doc => { if (!localStorage.getItem('acm-studio-workspace-v2')) localStorage.setItem('acm-studio-workspace-v2', JSON.stringify({ version: 56, activeDocumentId: doc.id, documents: [doc], categories: [], bin: [] })); }, document);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(`${fixture.origin}/studio`);
  await expect(page.locator('.block-editor')).not.toHaveAttribute('data-readonly', 'true');
  const paragraph = page.locator('[data-studio-block-anchor-id="margin-paragraph"] .rich-text-editor');
  await paragraph.click();
  const inspector = page.locator('.studio-inspector');
  await inspector.getByRole('button', { name: 'Dimensions options' }).click();
  await page.getByRole('group', { name: 'Dimensions controls' }).getByRole('button', { name: 'Margin', exact: true }).click();
  await page.keyboard.press('Escape');
  await inspector.getByRole('button', { name: 'Unlink margin sides' }).click();
  await inspector.getByRole('slider', { name: 'Margin Top amount' }).fill('1');
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('acm-studio-workspace-v2')!).documents[0].blocks[0].style?.marginSides)).toEqual({ top: '8px' });
  await page.reload();
  await paragraph.click();
  await expect(inspector.getByRole('slider', { name: 'Margin Top amount' })).toHaveValue('1');
  } finally { await context.close(); await fixture.close(); }
});
