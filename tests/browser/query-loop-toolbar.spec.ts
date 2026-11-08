import { expect, test } from '@playwright/test';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createStudioHttpFixture } from '../helpers/studio-http-fixture.mjs';

test('Query Loop selection exposes shared tools in templates and hides them in Preview', async ({ page }, testInfo) => {
  test.setTimeout(90000);
  const fixture = await createStudioHttpFixture({ frontendURL: String(testInfo.project.use.baseURL ?? 'http://localhost:3010') });
  try {
    const response = await fetch(`${fixture.origin}/__studio/test-site`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Studio-Client': 'codex-history', Origin: fixture.origin }, body: JSON.stringify({ action: 'global-read', siteId: 'test' }) });
    expect(response.ok).toBe(true);
    const snapshot = await response.json() as { library: import('../../app/studio/global-template-contract').GlobalTemplateLibrary };
    const set = snapshot.library.templates.sets[0];
    const target = { id: "query-toolbar-template", name: "Query toolbar", kind: "post" as const, isDefault: false, nodes: [] as import("../../app/studio/template-model").TemplateNode[] };
    set.templates.push(target);
    (snapshot.library.templates.libraryOrder ??= []).push({ id: `${set.id}/${target.id}`, setId: set.id, entryId: target.id });
    target.nodes = [{ id: 'toolbar-query', type: 'query-loop', count: 3, order: 'desc', children: [
      { id: 'toolbar-posts', type: 'post-template', children: [{ id: 'toolbar-title', type: 'title', level: 2 }] },
      { id: 'toolbar-empty', type: 'no-results', children: [{ id: 'toolbar-message', type: 'paragraph', text: 'No posts.' }] },
    ] }];
    await mkdir(path.join(fixture.globalRoot, 'work'), { recursive: true });
    const sourcePath = path.join(fixture.globalRoot, 'work/global-template-library.json');
    await writeFile(sourcePath, JSON.stringify(snapshot.library));
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto(`${fixture.origin}/studio?site=test2&mode=templates&scope=global&set=${encodeURIComponent(set.id)}&target=${encodeURIComponent(target.id)}`);
    const query = page.locator('[data-studio-block-anchor-id="toolbar-query"]');
    await expect(query).toBeVisible({ timeout: 30000 });
    await query.focus(); await page.keyboard.press('Enter');
    const toolbar = query.getByRole('group', { name: 'Query-loop block tools', exact: true });
    await expect(toolbar).toBeVisible();
    await expect(toolbar).toHaveAttribute('data-toolbar-actions', /duplicate.*delete.*options/);
    await expect(toolbar.getByRole('button', { name: 'Duplicate block', exact: true })).toBeEnabled();
    await expect(toolbar).toHaveCSS('flex-wrap', 'nowrap');
    await page.screenshot({ path: testInfo.outputPath('query-template-toolbar.png') });
    const saved = await readFile(sourcePath, 'utf8');
    await page.getByRole('button', { name: 'Preview', exact: true }).click();
    await expect(page.locator('.canvas-block-toolbar')).toHaveCount(0);
    expect(await readFile(sourcePath, 'utf8')).toBe(saved);
  } finally { await fixture.close(); }
});

test('Query Loop Library specimen inherits the production toolbar and read-only guards', async ({ page }) => {
  await page.goto('/studio/ui/blocks/query-loop');
  await expect(page.locator('.ui-block-specimen')).toHaveAttribute('data-ready', 'true');
  const toolbar = page.getByRole('group', { name: 'Query-loop block tools', exact: true }).filter({ visible: true });
  await expect(toolbar).toBeVisible();
  await expect(toolbar.getByRole('button', { name: 'Duplicate block', exact: true })).toBeEnabled();
  await toolbar.getByRole('button', { name: 'Duplicate block', exact: true }).click();
  await expect(page.locator('.ui-library-canvas .canvas-block.is-query-loop')).toHaveCount(2);
  await page.getByRole('button', { name: 'Undo specimen change' }).click();
  await expect(page.locator('.ui-library-canvas .canvas-block.is-query-loop')).toHaveCount(1);
  await page.getByRole('checkbox', { name: 'Read-only example' }).check();
  await expect(toolbar.getByRole('button', { name: 'Duplicate block', exact: true })).toBeDisabled();
  await page.getByRole('checkbox', { name: 'Read-only example' }).uncheck();
  await page.getByRole('group', { name: 'Specimen view' }).getByRole('button', { name: 'Preview', exact: true }).click();
  await expect(page.locator('.ui-library-canvas .canvas-block-toolbar')).toHaveCount(0);
});
