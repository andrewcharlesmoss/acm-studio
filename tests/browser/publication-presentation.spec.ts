import { expect, test } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createStudioHttpFixture } from '../helpers/studio-http-fixture.mjs';
import type { GlobalTemplateLibrary } from '../../app/studio/global-template-contract';
import type { TemplateSet } from '../../app/studio/template-model';

test('Preview and Publish use shared artwork and keep the snapshot until Update', async ({ page }, testInfo) => {
  test.setTimeout(90000);
  const fixture = await createStudioHttpFixture({ frontendURL: testInfo.project.use.baseURL });
  try {
    const response = await page.request.post(fixture.origin + '/__studio/test-site', {
      headers: { Origin: fixture.origin, 'X-Studio-Client': 'codex-history' },
      data: { action: 'global-read', siteId: 'test' },
    });
    expect(response.ok()).toBe(true);
    const { library }: { library: GlobalTemplateLibrary } = await response.json();
    const headerSet = library.templates.sets.find(set => set.id === library.header!.setId)!;
    const part = headerSet.parts.find(part => part.id === library.header!.partId)!;
    const design: TemplateSet = {
      ...structuredClone(headerSet), id: 'publication-design', name: 'Publication design', parts: [],
      templates: [{ id: 'publication-page', kind: 'page', name: 'Publication page', nodes: [] }],
    };
    library.templates.sets.push(design);
    const template = design.templates[0];
    const globalDirectory = path.join(fixture.globalRoot, 'work');
    await mkdir(globalDirectory, { recursive: true });
    async function writeDesign(version: string) {
      part.nodes = [{ id: 'frozen-header', type: 'paragraph', text: version + ' shared header' }];
      template.nodes = [
        { id: 'frozen-art', type: 'paragraph', text: version + ' shared design' },
        { id: 'content-slot', type: 'element', element: 'content' },
      ];
      await writeFile(path.join(globalDirectory, 'global-template-library.json'), JSON.stringify(library));
    }
    await writeDesign('First');
    const recovery = structuredClone(design);
    recovery.templates[0].nodes[0] = { id: 'frozen-art', type: 'paragraph', text: 'Obsolete recovery design' };
    await page.addInitScript(({ recovery, templateVersion }) => {
      if (localStorage.getItem('acm-studio-workspace-v2')) return;
      const document = { id: 'audit-page', kind: 'page', title: 'Audit page', slug: 'audit-page', excerpt: '', status: 'draft', updatedAt: '2026-11-22T00:00:00Z', tags: [], seoTitle: '', seoDescription: '', blocks: [{ id: 'body', type: 'paragraph', text: 'Publication body' }] };
      localStorage.setItem('acm-studio-workspace-v2', JSON.stringify({ version: 67, documents: [document], activeDocumentId: document.id, categories: [], bin: [] }));
      localStorage.setItem('acm-studio-templates-v1', JSON.stringify({ version: templateVersion, sets: [recovery], assignments: [{ documentId: document.id, kind: 'page', setId: recovery.id, templateId: recovery.templates[0].id }], bin: [] }));
    }, { recovery, templateVersion: library.templates.version });
    const editor = fixture.origin + '/studio?library=page&documentId=audit-page';
    await page.goto(editor + '&preview=1');
    await expect(page.getByText('First shared design', { exact: true })).toBeVisible();
    await expect(page.getByText('First shared header', { exact: true })).toBeVisible();
    await page.goto(editor);
    await page.getByRole('button', { name: 'Publish', exact: true }).click();
    await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('acm-studio-workspace-v2')!).documents[0].status)).toBe('published');
    await page.getByRole('link', { name: 'View page' }).click();
    await expect(page.getByText('Publication body', { exact: true })).toBeVisible();
    await expect(page.getByText('First shared design', { exact: true })).toBeVisible();
    await expect(page.getByText('First shared header', { exact: true })).toBeVisible();
    await expect(page.getByText('Obsolete recovery design')).toHaveCount(0);
    await writeDesign('Second');
    await page.reload();
    await expect(page.getByText('First shared header', { exact: true })).toBeVisible();
    await page.goto(editor + '&preview=1');
    await expect(page.getByText('Second shared header', { exact: true })).toBeVisible();
    await expect(page.getByText('Second shared design', { exact: true })).toBeVisible();
    await page.goto(editor);
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await page.getByRole('link', { name: 'View page' }).click();
    await expect(page.getByText('Second shared design', { exact: true })).toBeVisible();
    await expect(page.getByText('Second shared header', { exact: true })).toBeVisible();
  } finally { await fixture.close(); }
});
