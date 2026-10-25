import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { loadProductionModule } from '../production-module.mjs';

let fixture;
test.beforeAll(async () => {
  const { TemplateDocument } = await loadProductionModule(new URL('../../app/studio/template-renderer.tsx', import.meta.url));
  const { createTemplateSet, TEMPLATE_VERSION } = await loadProductionModule(new URL('../../app/studio/template-model.ts', import.meta.url));
  const { WebsiteDesignSurface } = await loadProductionModule(new URL('../../app/studio/site-editor/website-design-surface.tsx', import.meta.url));
  const set = createTemplateSet('Temporary page preview');
  const template = set.templates.find(item => item.kind === 'page');
  template.nodes = [template.nodes[0], { id: 'content', type: 'element', element: 'content' }];
  const css = (await Promise.all(['templates.css', 'studio.css'].map(file => readFile(new URL(`../../app/studio/${file}`, import.meta.url), 'utf8')))).join('\n');
  fixture = (populated, hosted = true) => `<style>${css}</style><div class="${hosted ? "studio-hosted-home-editor is-home-preview" : "ordinary-template-preview"}"><div style="width:100%">${renderToStaticMarkup(h(WebsiteDesignSurface, {
    design: { identity: { title: 'Site Title', tagline: 'A short description of your site.' }, styles: { paletteId: 'default', typographyId: 'default' } }, referenceDefaults: true,
  }, h('div', { style: { display: 'contents' } }, h(TemplateDocument, {
    snapshot: { version: TEMPLATE_VERSION, set, templateId: template.id },
    document: { id: 'temporary-page', kind: 'page', title: 'Temporary page', blocks: populated ? [{ id: 'body', type: 'paragraph', text: 'Readable page content.' }] : [] },
  }))))}</div></div>`;
});

test('assigned page templates retain their available width inside the hosted preview flex layout', async ({ page }) => {
  // Render real components and styles with memory-only data: no fixture gateway or saved content.
  for (const hosted of [false, true]) for (const populated of [false, true]) {
    for (const width of [1200, 645, 320]) {
      await page.setViewportSize({ width, height: 900 });
      await page.setContent(fixture(populated, hosted));
      const surface = page.locator('.template-surface');
      await expect(surface).toBeVisible();
      const geometry = await surface.evaluate(element => {
        const identity = element.querySelector('.website-design-identity-copy');
        return { surface: element.getBoundingClientRect().width, available: element.closest('.website-design-surface').getBoundingClientRect().width, identity: identity?.getBoundingClientRect().width ?? 0 };
      });
      expect(geometry.surface).toBeGreaterThan(Math.min(geometry.available, 645) - 1);
      expect(geometry.surface).toBeLessThanOrEqual(geometry.available);
      expect(geometry.identity).toBeGreaterThan(150);
      await expect(page.getByText('A short description of your site.', { exact: true })).toBeVisible();
      if (populated) await expect(page.getByText('Readable page content.', { exact: true })).toBeVisible();
    }
  }
});
