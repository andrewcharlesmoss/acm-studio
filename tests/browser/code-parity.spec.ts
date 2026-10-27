import { expect, test } from '@playwright/test';

for (const host of ['library', 'content', 'template']) {
  for (const wrapper of ['Group', 'Columns']) {
    test(`Code ${wrapper} preserves exact input and actual ${host} history`, async ({ page }) => {
      await page.goto(host === 'library' ? '/studio/ui/blocks/code' : host === 'content' ? '/studio/ui/selection' : '/studio/ui/selection/template');
      if (host === 'library') await expect(page.locator('.ui-block-specimen')).toHaveAttribute('data-ready', 'true');
      const input = page.getByRole('textbox', { name: 'Code', exact: true }).first();
      const source = '\tconst text = `<tag>`;\n\n';
      await input.click(); await input.fill(source); await input.blur(); await input.click();
      const trigger = page.getByRole('button', { name: 'Transform Code block', exact: true });
      await trigger.click();
      await page.getByRole('menu', { name: 'Transform block' }).getByRole('menuitem', { name: wrapper, exact: true }).click();
      await expect(input).toHaveValue(source);
      const toolbar = page.getByRole('group', { name: `${wrapper} block tools`, exact: true });
      await toolbar.getByRole('button', { name: 'More block options', exact: true }).focus();
      await page.keyboard.press('Meta+z');
      await expect(input).toHaveValue(source);
      await input.click();
      await expect(trigger).toBeVisible();
      await page.getByRole('group', { name: 'Code block tools', exact: true }).getByRole('button', { name: 'More block options', exact: true }).focus();
      await page.keyboard.press('Meta+Shift+z');
      await expect(page.getByRole('group', { name: `${wrapper} block`, exact: true }).filter({ has: input })).toBeVisible();
      await expect(input).toHaveValue(source);
    });
  }
}

for (const host of ['library', 'content', 'template']) {
  test(`Code minimum dimensions reach Edit and Preview in ${host}`, async ({ page }) => {
    await page.goto(host === 'library' ? '/studio/ui/blocks/code' : host === 'content' ? '/studio/ui/selection' : '/studio/ui/selection/template');
    if (host === 'library') await expect(page.locator('.ui-block-specimen')).toHaveAttribute('data-ready', 'true');
    const input = page.getByRole('textbox', { name: 'Code', exact: true }).first();
    await input.click();
    await page.getByRole('button', { name: 'Dimensions options', exact: true }).click();
    for (const name of ['Minimum height', 'Minimum width']) await page.getByRole('group', { name: 'Dimensions controls', exact: true }).getByRole('button', { name, exact: true }).click();
    await page.keyboard.press('Escape');
    for (const [name, value] of [['Minimum height', '220'], ['Minimum width', '180']]) {
      const field = page.getByRole('spinbutton', { name: `${name} value`, exact: true });
      await field.fill(value); await field.press('Enter');
    }
    const minimumWidth = page.getByRole('spinbutton', { name: 'Minimum width value', exact: true });
    await page.locator('.paragraph-length-setting').filter({ has: minimumWidth }).getByRole('button', { name: 'Reset', exact: true }).click();
    await expect(minimumWidth).toHaveValue('');
    await minimumWidth.fill('180'); await minimumWidth.press('Enter');
    const pre = input.locator('..').locator('.studio-code-preview');
    expect((await pre.boundingBox())!.height).toBeGreaterThanOrEqual(220);
    const frame = pre.locator('..').locator('..');
    await expect(frame).toHaveCSS('min-width', '180px');
    expect((await input.boundingBox())!.height).toBeCloseTo((await pre.boundingBox())!.height, 1);
    await page.getByRole('button', { name: 'Preview', exact: true }).click();
    const preview = page.locator('.studio-code-preview').first();
    expect((await preview.boundingBox())!.height).toBeGreaterThanOrEqual(220);
    await expect(preview.locator('..')).toHaveCSS('min-width', '180px');
  });
}

test('Code website styling paints border and margin while preserving authored device overrides', async ({ page }) => {
  const { loadProductionModule } = await import('../production-module.mjs');
  const { createElement } = await import('react');
  const { renderToStaticMarkup } = await import('react-dom/server');
  const { readFileSync } = await import('node:fs');
  const load = (p: string) => loadProductionModule(new URL(p, import.meta.url));
  const { BlockRenderer } = await load('../../app/components/content.tsx');
  const { BlockField } = await load('../../app/studio/studio-canvas.tsx');
  const { BlockPreviewRules } = await load('../../app/studio/site-editor/block-preview-rules.tsx');
  const { projectWebsiteDesignBlocks } = await load('../../app/studio/site-editor/website-design-surface.tsx');
  const { responsiveBlockCss } = await load('../../app/content/responsive-styles.ts');
  const css = readFileSync(new URL('../../app/globals.css', import.meta.url), 'utf8') + readFileSync(new URL('../../app/studio/studio.css', import.meta.url), 'utf8') + responsiveBlockCss;
  const selection = { paletteId: 'default', typographyId: 'default', blockStyles: { code: { margin: '24px 0', padding: '18px', borderStyle: 'solid', borderWidth: '3px', borderColor: '#123456', borderRadius: '9px', responsive: { mobile: { padding: '8px', borderWidth: '5px', borderRadius: '12px', margin: '12px 0' } } } } };
  const blocks = [{ id: 'theme', type: 'code', code: '\tlong line '.repeat(12) + '\n\n', language: 'typescript' }, { id: 'own', type: 'code', code: 'Authored', visualStyle: { padding: '6px', borderStyle: 'solid', borderWidth: '2px', borderColor: '#008800', borderRadius: '4px', margin: '7px 0' } }, { id: 'device-own', type: 'code', code: 'Authored device map', visualStyle: { padding: '6px', borderStyle: 'solid', borderWidth: '2px', responsive: { tablet: { borderWidth: '4px' } } } }];
  for (const width of [1000, 600, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    const projected = projectWebsiteDesignBlocks(blocks, selection);
    const sections = ['edit', 'preview'].map(mode => createElement('section', { key: mode, id: mode, 'data-block-preview-scope': mode, className: 'studio-responsive-container', style: { containerType: 'inline-size', containerName: 'studio-document' } }, createElement(BlockPreviewRules, { selection, scopeId: mode, referenceDefaults: false }), mode === 'preview' ? createElement(BlockRenderer, { blocks: projected, variant: 'studio' }) : projected.map((block: any) => createElement(BlockField, { key: block.id, block, rootBlocks: projected, writable: true, onChange() {} }))));
    await page.setContent(`<style>${css}</style>${renderToStaticMarkup(createElement('main', null, ...sections))}`);
    for (const mode of ['edit', 'preview']) {
      const theme = page.locator(`#${mode} .studio-code-preview`).first();
      await expect(theme).toHaveCSS('border-top-width', width <= 480 ? '5px' : '3px');
      await expect(theme).toHaveCSS('border-top-color', 'rgb(18, 52, 86)');
      await expect(theme).toHaveCSS('border-radius', width <= 480 ? '12px' : '9px');
      await expect(theme).toHaveCSS('padding-top', width <= 480 ? '8px' : '18px');
      await expect(page.locator(`#${mode} .site-block-style-code`).first()).toHaveCSS('margin-top', width <= 480 ? '12px' : '24px');
      if (mode === 'edit') {
        const input = page.locator('#edit .code-input').first();
        for (const property of ['padding-top', 'border-top-width', 'border-top-style', 'font-size', 'line-height']) expect(await input.evaluate((node, p) => getComputedStyle(node).getPropertyValue(p), property)).toBe(await theme.evaluate((node, p) => getComputedStyle(node).getPropertyValue(p), property));
      }
      const own = page.locator(`#${mode} .site-block-style-code`).nth(1);
      await expect(own).toHaveCSS('padding-top', '0px');
      await expect(own.locator('.studio-code-preview')).toHaveCSS('border-top-color', 'rgb(0, 136, 0)');
      await expect(own.locator('.studio-code-preview')).toHaveCSS('border-radius', '4px');
      await expect(own.locator('.studio-code-preview')).toHaveCSS('padding-top', '6px');
      await expect(own).toHaveCSS('margin-top', '7px');
      const deviceOwn = page.locator(`#${mode} .site-block-style-code`).nth(2).locator('.studio-code-preview');
      await expect(deviceOwn).toHaveCSS('padding-top', '6px');
      await expect(deviceOwn).toHaveCSS('border-top-width', width > 480 && width <= 782 ? '4px' : '2px');
      await expect(deviceOwn).toHaveCSS('border-radius', width <= 480 ? '12px' : '9px');
    }
  }
});

test('Code Styles pane controls, device defaults, reset and history reach the painted preview', async ({ page }) => {
  await page.goto('/studio/ui/controls/block-style-panels');
  const controls = page.getByRole('group', { name: 'Block Styles panes example', exact: true });
  await expect(controls).toHaveAttribute('data-ready', 'true');
  await controls.getByRole('button', { name: 'Code', exact: true }).click();
  const pre = controls.getByLabel('Code style preview', { exact: true }).locator('.studio-code-preview');
  const baselineRadius = await pre.evaluate(node => getComputedStyle(node).borderRadius);
  const width = controls.getByRole('spinbutton', { name: 'Border All width', exact: true });
  await width.fill('3'); await width.press('Enter');
  await controls.getByRole('spinbutton', { name: 'Radius All value', exact: true }).fill('9');
  await controls.getByRole('spinbutton', { name: 'Radius All value', exact: true }).press('Enter');
  await expect(pre).toHaveCSS('border-top-width', '3px');
  await expect(pre).toHaveCSS('border-radius', '9px');
  await controls.getByRole('button', { name: 'Margin Vertical custom value', exact: true }).click();
  const margin = controls.getByRole('spinbutton', { name: 'Margin Vertical value', exact: true });
  await margin.fill('24'); await margin.press('Enter');
  await expect(pre.locator('..')).toHaveCSS('margin-top', '24px');
  await controls.getByRole('button', { name: 'Padding Vertical custom value', exact: true }).click();
  const padding = controls.getByRole('spinbutton', { name: 'Padding Vertical value', exact: true });
  await padding.fill('18'); await padding.press('Enter');
  await expect(pre).toHaveCSS('padding-top', '18px');
  await controls.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(pre).not.toHaveCSS('padding-top', '18px');
  await controls.getByRole('button', { name: 'Redo', exact: true }).click();
  await expect(pre).toHaveCSS('padding-top', '18px');
  await controls.getByRole('button', { name: 'States', exact: true }).click();
  await page.getByRole('menuitemradio', { name: 'Mobile', exact: true }).click();
  await width.fill('5'); await width.press('Enter');
  await expect(pre).toHaveCSS('border-top-width', '5px');
  await controls.getByRole('button', { name: 'States', exact: true }).click();
  await page.getByRole('menuitemradio', { name: 'Default', exact: true }).click();
  await expect(pre).toHaveCSS('border-top-width', '3px');
  await controls.getByRole('button', { name: 'Border options', exact: true }).click();
  await page.getByRole('button', { name: 'Reset Radius', exact: true }).click();
  await page.keyboard.press('Escape');
  await expect(pre).toHaveCSS('border-radius', baselineRadius);
  await controls.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(pre).toHaveCSS('border-radius', '9px');
  await controls.getByRole('button', { name: 'Reset example', exact: true }).click();
  await controls.getByRole('button', { name: 'Code', exact: true }).click();
  await expect(pre).toHaveCSS('border-top-width', '0px');
  await expect(pre).toHaveCSS('border-radius', baselineRadius);
});

test('Code safe CSS longhands paint once with minimum height in Edit, Preview and public output', async ({ page }) => {
  const { loadProductionModule } = await import('../production-module.mjs');
  const { createElement } = await import('react');
  const { renderToStaticMarkup } = await import('react-dom/server');
  const { readFileSync } = await import('node:fs');
  const load = (p: string) => loadProductionModule(new URL(p, import.meta.url));
  const { BlockRenderer } = await load('../../app/components/content.tsx');
  const { BlockField } = await load('../../app/studio/studio-canvas.tsx');
  const { responsiveBlockCss } = await load('../../app/content/responsive-styles.ts');
  const globals = readFileSync(new URL('../../app/globals.css', import.meta.url), 'utf8');
  const studio = readFileSync(new URL('../../app/studio/studio.css', import.meta.url), 'utf8');
  const block = { id: 'custom-code', type: 'code', code: '\tconst colour = "<pink>";\n\n', language: 'typescript', visualStyle: { minHeight: '220px', minWidth: '180px', additionalCss: 'padding:6px; padding-top:11px; border:4px solid #880088; border-left-width:7px; border-radius:24px; background:#ffeecc;' } };
  for (const mode of ['edit', 'preview', 'article']) {
    for (const width of [1000, 390]) {
      await page.setViewportSize({ width, height: 700 });
      const content = mode === 'edit' ? createElement(BlockField, { block, rootBlocks: [block], writable: true, onChange() {} }) : createElement(BlockRenderer, { blocks: [block], variant: mode === 'article' ? 'article' : 'studio' });
      await page.setContent(`<style>${globals}${mode === 'article' ? '' : studio}${responsiveBlockCss}</style>${renderToStaticMarkup(createElement('section', { className: mode === 'article' ? 'prose' : 'studio-responsive-container', style: { containerType: 'inline-size', containerName: 'studio-document' } }, content))}`);
      const frame = page.locator('.code-visual-style-frame'); const pre = frame.locator('pre');
      await expect(frame).toHaveCSS('padding-top', '0px');
      await expect(frame).toHaveCSS('border-top-width', '0px');
      await expect(pre).toHaveCSS('padding-top', '11px');
      await expect(pre).toHaveCSS('padding-left', '6px');
      await expect(pre).toHaveCSS('border-left-width', '7px');
      await expect(pre).toHaveCSS('border-top-color', 'rgb(136, 0, 136)');
      await expect(pre).toHaveCSS('border-radius', '24px');
      await expect(pre).toHaveCSS('background-color', 'rgb(255, 238, 204)');
      expect((await pre.boundingBox())!.height).toBeGreaterThanOrEqual(220);
      await expect(pre.locator('code')).toHaveText(block.code);
      if (mode === 'edit') {
        const input = frame.locator('.code-input');
        for (const property of ['padding-top', 'padding-left', 'border-top-width', 'border-left-width']) expect(await input.evaluate((node, p) => getComputedStyle(node).getPropertyValue(p), property)).toBe(await pre.evaluate((node, p) => getComputedStyle(node).getPropertyValue(p), property));
        await expect(input).toHaveCSS('border-top-color', 'rgba(0, 0, 0, 0)');
      }
      await page.screenshot({ path: `/private/tmp/acm-code-custom-${mode}-${width}.png` });
    }
  }
});
