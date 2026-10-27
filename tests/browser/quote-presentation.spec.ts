import { expect, test, type Page } from '@playwright/test';

async function setHeadingHex(page: Page, value: string) {
  await page.getByRole('button', { name: 'Custom heading colour picker', exact: true }).click();
  await page.getByRole('textbox', { name: 'Hex colour', exact: true }).fill(value);
  await page.getByRole('textbox', { name: 'Hex colour', exact: true }).press('Enter');
  await page.getByRole('button', { name: 'Close custom colour picker', exact: true }).click();
}

async function renderingModules() {
  const { loadProductionModule } = await import('../production-module.mjs');
  const { createElement } = await import('react');
  const { renderToStaticMarkup } = await import('react-dom/server');
  const { readFileSync } = await import('node:fs');
  const load = (path: string) => loadProductionModule(new URL(path, import.meta.url));
  const { BlockRenderer } = await load('../../app/components/content.tsx');
  const { BlockField } = await load('../../app/studio/studio-canvas.tsx');
  const { QuoteContent } = await load('../../app/components/blocks/quote-content.tsx');
  const { BlockPreviewRules } = await load('../../app/studio/site-editor/block-preview-rules.tsx');
  const { projectWebsiteDesignBlocks } = await load('../../app/studio/site-editor/website-design-surface.tsx');
  const { responsiveBlockCss } = await load('../../app/content/responsive-styles.ts');
  const css = readFileSync(new URL('../../app/globals.css', import.meta.url), 'utf8') + readFileSync(new URL('../../app/studio/studio.css', import.meta.url), 'utf8') + responsiveBlockCss;
  return { createElement, renderToStaticMarkup, BlockRenderer, BlockField, QuoteContent, BlockPreviewRules, projectWebsiteDesignBlocks, css };
}

test('Quote presentation reaches painted Edit, Preview and public surfaces with nested and child ownership', async ({ page }) => {
  const m = await renderingModules();
  const quote = { id: 'painted-quote', type: 'quote', text: '', visualStyle: { blockGap: '12px', headingColor: '#123456', headingBackgroundColor: '#ffeecc', responsive: { mobile: { blockGap: '0', headingColor: '#aa0000', headingBackgroundColor: '#ccddee', textColor: '#222222' } } }, children: [
    { id: 'first', type: 'paragraph', text: 'First visible paragraph' },
    { id: 'hidden', type: 'paragraph', text: 'Hidden paragraph', editorial: { hidden: true } },
    { id: 'second', type: 'paragraph', text: 'Second visible paragraph' },
    ...[1,2,3,4,5,6].map(level => ({ id: `heading-${level}`, type: 'heading', level, text: `Inherited heading ${level}` })),
    { id: 'own', type: 'heading', level: 2, text: 'Explicit child heading', visualStyle: { textColor: '#008800', backgroundColor: '#ffeedd', responsive: { mobile: { textColor: '#000088' } } } },
    { id: 'css-own', type: 'heading', level: 2, text: 'Additional CSS child heading', visualStyle: { additionalCss: 'color: #0000ff; background-color: #aabbcc;' } },
    { id: 'nested', type: 'quote', text: '', visualStyle: { headingColor: '#880088', headingBackgroundColor: '#eeeeee' }, children: [{ id: 'nested-heading', type: 'heading', level: 3, text: 'Nearer nested heading' }] },
  ], attribution: 'Painted citation' };
  const selection = { paletteId: 'default', typographyId: 'default', blockStyles: { heading: { textColor: '#ff0000', backgroundColor: '#00ffff' }, quote: { blockGap: '40px', headingColor: '#ff8800', headingColors: { 2: '#ffff00' } } } };
  for (const width of [1000, 600, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    const sections = ['edit', 'preview', 'article'].map(mode => {
      const blocks = mode === 'article' ? [quote] : m.projectWebsiteDesignBlocks([quote], selection);
      const content = mode === 'edit' ? m.createElement(m.BlockField, { block: blocks[0], rootBlocks: blocks, writable: true, onChange() {} }) : m.createElement(m.BlockRenderer, { blocks, variant: mode === 'article' ? 'article' : 'studio' });
      return m.createElement('section', { id: mode, key: mode, 'data-block-preview-scope': mode, className: mode === 'article' ? 'prose' : 'studio-responsive-container', style: { width: '100%', containerType: mode === 'article' ? undefined : 'inline-size', containerName: 'studio-document' } },
        mode === 'article' ? null : m.createElement(m.BlockPreviewRules, { selection, scopeId: mode, referenceDefaults: false }), content);
    });
    await page.setContent(`<style>${m.css}</style>${m.renderToStaticMarkup(m.createElement('main', null, ...sections))}`);
    for (const mode of ['edit', 'preview', 'article']) {
      const surface = page.locator(`#${mode}`);
      const mobile = width <= 480;
      for (const level of [1,2,3,4,5,6]) {
        const heading = mode === 'edit' ? surface.locator(`[data-studio-block-id="heading-${level}"]`) : surface.getByText(`Inherited heading ${level}`, { exact: true });
        await expect(heading).toHaveCSS('color', mobile ? 'rgb(170, 0, 0)' : 'rgb(18, 52, 86)');
        await expect(heading).toHaveCSS('background-color', mobile ? 'rgb(204, 221, 238)' : 'rgb(255, 238, 204)');
      }
      await expect(mode === 'edit' ? surface.locator('[data-studio-block-id="own"]') : surface.getByText('Explicit child heading', { exact: true })).toHaveCSS('color', mobile ? 'rgb(0, 0, 136)' : 'rgb(0, 136, 0)');
      await expect(mode === 'edit' ? surface.locator('[data-studio-block-id="nested-heading"]') : surface.getByText('Nearer nested heading', { exact: true })).toHaveCSS('color', 'rgb(136, 0, 136)');
      await expect(mode === 'edit' ? surface.locator('[data-studio-block-id="css-own"]') : surface.getByText('Additional CSS child heading', { exact: true })).toHaveCSS('color', 'rgb(0, 0, 255)');
      await expect((mode === 'edit' ? surface.locator('[data-studio-block-id="css-own"]') : surface.getByText('Additional CSS child heading', { exact: true })).locator('..')).toHaveCSS('background-color', 'rgb(170, 187, 204)');
      if (mode !== 'edit') {
        await expect(surface.getByText('Hidden paragraph', { exact: true })).toHaveCount(0);
        const first = await surface.getByText('First visible paragraph', { exact: true }).boundingBox();
        const second = await surface.getByText('Second visible paragraph', { exact: true }).boundingBox();
        expect(Math.round(second!.y - first!.y - first!.height)).toBe(mobile ? 0 : 12);
      }
      const frame = surface.locator(mode === 'article' ? '.pull-quote' : '.quote-field').first();
      if (mode === 'edit') {
        const children = frame.locator(':scope > blockquote > .quote-body-block');
        await expect(children.nth(1).getByText(/is hidden/i).first()).toBeVisible();
        const first = await children.nth(0).boundingBox(), placeholder = await children.nth(1).boundingBox(), second = await children.nth(2).boundingBox();
        expect(Math.round(placeholder!.y - first!.y - first!.height)).toBe(mobile ? 0 : 12);
        expect(Math.round(second!.y - placeholder!.y - placeholder!.height)).toBe(mobile ? 0 : 12);
      }
      const body = await frame.locator(':scope > blockquote').boundingBox();
      const citation = await frame.locator(':scope > .quote-citation').boundingBox();
      expect(Math.round(citation!.y - body!.y - body!.height), `${mode} width${width} citationgap; body=${JSON.stringify(body)} citation=${JSON.stringify(citation)} css=${await frame.locator(':scope > .quote-citation').evaluate(node => JSON.stringify({ margin: getComputedStyle(node).margin, own: getComputedStyle(node).getPropertyValue('--studio-quote-block-gap') }))}`).toBe(mobile ? 0 : 12);
    }
    await page.screenshot({ path: `/private/tmp/acm-quote-presentation-${width}.png`, fullPage: true });
  }
});

test('unstyled public Quotes retain the previous canonical public body typography and geometry', async ({ page }) => {
  const m = await renderingModules();
  const children = [{ id: 'one', type: 'paragraph', text: 'First unchanged paragraph' }, { id: 'two', type: 'paragraph', text: 'Second unchanged paragraph' }, { id: 'heading', type: 'heading', level: 2, text: 'Unchanged heading' }];
  const quote = { id: 'legacy', type: 'quote', text: '', children, attribution: 'Legacy citation' };
  // The historical public Quote composed the canonical child renderer in its
  // prose wrapper. Keep that boundary as the baseline, without copying styles.
  const baseline = m.createElement('div', { className: 'prose' }, m.createElement(m.QuoteContent, { block: quote, studio: false, citation: 'Legacy citation' }, m.createElement(m.BlockRenderer, { blocks: children, variant: 'article' })));
  const current = m.createElement(m.BlockRenderer, { blocks: [quote], variant: 'article' });
  for (const width of [1000, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.setContent(`<style>${m.css}</style><section id="baseline">${m.renderToStaticMarkup(baseline)}</section><section id="current">${m.renderToStaticMarkup(current)}</section>`);
    const measure = async (id: string) => page.locator(id).evaluate(root => {
      const frame = root.querySelector('figure')!, start = frame.getBoundingClientRect().top;
      return { height: frame.getBoundingClientRect().height, children: [...root.querySelectorAll('p,h2,figcaption')].map(node => ({ top: node.getBoundingClientRect().top - start, height: node.getBoundingClientRect().height, size: getComputedStyle(node).fontSize, colour: getComputedStyle(node).color, margin: getComputedStyle(node).margin })) };
    });
    expect(await measure('#current')).toEqual(await measure('#baseline'));
  }
});

test('Quote block spacing stays with its direct owner while Heading colours inherit', async ({ page }) => {
  const m = await renderingModules();
  const inner = { id: 'inner-gap', type: 'quote', text: '', children: [{ id: 'inner-one', type: 'paragraph', text: 'Inner first' }, { id: 'inner-two', type: 'paragraph', text: 'Inner second' }, { id: 'inner-heading', type: 'heading', level: 2, text: 'Inherited inner heading' }] };
  const outer = { id: 'outer-gap', type: 'quote', text: '', visualStyle: { blockGap: '12px', headingColor: '#123456' }, children: [inner] };
  const selection = { paletteId: 'default', typographyId: 'default', blockStyles: { quote: { blockGap: '40px' } } };
  for (const ownGap of [undefined, '6px']) {
    const block = { ...outer, children: [{ ...inner, visualStyle: ownGap ? { blockGap: ownGap } : undefined }] };
    const projected = m.projectWebsiteDesignBlocks([block], selection);
    const markup = m.renderToStaticMarkup(m.createElement('section', { 'data-block-preview-scope': 'nested-gap', className: 'studio-responsive-container' }, m.createElement(m.BlockPreviewRules, { selection, scopeId: 'nested-gap', referenceDefaults: false }), m.createElement(m.BlockRenderer, { blocks: projected, variant: 'studio' })));
    await page.setContent(`<style>${m.css}</style>${markup}`);
    const first = await page.getByText('Inner first', { exact: true }).boundingBox();
    const second = await page.getByText('Inner second', { exact: true }).boundingBox();
    expect(Math.round(second!.y - first!.y - first!.height)).toBe(ownGap ? 6 : 40);
    await expect(page.getByText('Inherited inner heading', { exact: true })).toHaveCSS('color', 'rgb(18, 52, 86)');
  }
});

test('authored Quote spacing contains trailing child margins before its citation', async ({ page }) => {
  const m = await renderingModules();
  const block = { id: 'margin-quote', type: 'quote', text: '', visualStyle: { blockGap: '12px' }, children: [{ id: 'margin-child', type: 'paragraph', text: 'Trailing authored margin', style: { margin: '0 0 18px' } }], attribution: 'Margin citation' };
  const markup = m.renderToStaticMarkup(m.createElement(m.BlockRenderer, { blocks: [block], variant: 'article' }));
  await page.setContent(`<style>${m.css}</style>${markup}`);
  const child = await page.getByText('Trailing authored margin', { exact: true }).boundingBox();
  const body = await page.locator('.pull-quote > blockquote').boundingBox();
  const citation = await page.getByText('Margin citation', { exact: true }).boundingBox();
  expect(Math.round(body!.y + body!.height - child!.y - child!.height)).toBe(18);
  expect(Math.round(citation!.y - body!.y - body!.height)).toBe(12);
});

test('authored Quote spacing replaces default margins for all supported direct child types', async ({ page }) => {
  const m = await renderingModules();
  const children = [
    { id: 'mixed-p', type: 'paragraph', text: 'Mixed Paragraph' },
    { id: 'mixed-h', type: 'heading', level: 2, text: 'Mixed Heading' },
    { id: 'mixed-q', type: 'quote', text: '', children: [{ id: 'mixed-q-p', type: 'paragraph', text: 'Nested quotation' }] },
    { id: 'mixed-l', type: 'list', style: 'unordered', items: ['Mixed List item'] },
    { id: 'mixed-i', type: 'image', src: '/specimens/landscape.svg', alt: 'Mixed image', displayWidth: 240, displayHeight: 80 },
    { id: 'mixed-last', type: 'paragraph', text: 'After mixed children' },
  ];
  for (const gap of [0,12]) for (const mode of ['edit','preview','article']) {
    const block = { id: 'mixed', type: 'quote', text: '', visualStyle: { blockGap: `${gap}px` }, children };
    const element = mode === 'edit' ? m.createElement(m.BlockField, { block, rootBlocks: [block], writable: true, onChange() {} }) : m.createElement(m.BlockRenderer, { blocks: [block], variant: mode === 'article' ? 'article' : 'studio' });
    await page.setContent(`<style>${m.css}</style>${m.renderToStaticMarkup(element)}`);
    const frame = page.locator(mode === 'article' ? '.pull-quote' : '.quote-field').first();
    const body = frame.locator(mode === 'article' ? ':scope > blockquote > .prose > .quote-body-block' : ':scope > blockquote > .quote-body-block');
    await expect(body).toHaveCount(children.length);
    const boxes = await body.evaluateAll(nodes => nodes.map(node => { const box = node.getBoundingClientRect(); return { y: box.y, height: box.height }; }));
    for (let index = 1; index < boxes.length; index++) {
      const details = children[index].type === 'image' ? await body.nth(index - 1).evaluate(node => JSON.stringify([...node.querySelectorAll('ul,ol,li')].map(child => ({ tag: child.tagName, box: child.getBoundingClientRect().toJSON(), margin: getComputedStyle(child).margin, display: getComputedStyle(child).display })))) : '';
      expect(Math.round(boxes[index].y - boxes[index-1].y - boxes[index-1].height), `${mode} gap${gap} before${children[index].type} boxes=${JSON.stringify(boxes)} list=${details}`).toBe(gap);
    }
  }
});

for (const host of ['library', 'content', 'template']) {
  test(`Quote spacing and Heading controls paint and retain actual ${host} history`, async ({ page }) => {
    await page.goto(host === 'library' ? '/studio/ui/blocks/quote' : host === 'content' ? '/studio/ui/selection' : '/studio/ui/selection/template');
    const body = host === 'library' ? 'Quote presentation body.' : host === 'content' ? 'Quote body' : 'Template quote body';
    const headingText = host === 'library' ? 'An inherited Quote heading' : host === 'content' ? 'Content Quote heading' : 'Template Quote heading';
    if (host === 'library') await page.getByRole('group', { name: 'Select an example block', exact: true }).getByRole('button', { name: 'Quote', exact: true }).nth(2).click();
    else await page.locator('.quote-field').filter({ hasText: body }).first().click({ position: { x: 2, y: 2 } });
    await page.getByRole('button', { name: 'Dimensions options', exact: true }).click();
    await page.getByRole('group', { name: 'Dimensions controls', exact: true }).getByRole('button', { name: 'Block spacing', exact: true }).click();
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Block spacing Top custom value', exact: true }).click();
    const spacing = page.getByRole('spinbutton', { name: 'Block spacing Top value', exact: true });
    await spacing.fill('24'); await spacing.press('Enter');
    await page.getByRole('button', { name: 'Elements options', exact: true }).click();
    await page.getByRole('group', { name: 'Elements controls', exact: true }).getByRole('button', { name: 'Heading', exact: true }).click();
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Choose Heading colour', exact: true }).click();
    await setHeadingHex(page, '123456');
    await page.keyboard.press('Escape');
    await expect(page.locator('.heading-field').filter({ hasText: headingText }).first()).toHaveCSS('color', 'rgb(18, 52, 86)');
    const measuredGap = async () => {
      const frame = page.locator('.quote-field').filter({ hasText: body }).first();
      const children = frame.locator(':scope > blockquote > .quote-body-block');
      const first = await children.nth(0).boundingBox(), second = await children.nth(1).boundingBox();
      return Math.round(second!.y - first!.y - first!.height);
    };
    expect(await measuredGap()).toBe(24);
    const trigger = page.getByRole('button', { name: 'Transform Quote block', exact: true });
    await trigger.focus(); await page.keyboard.press('Meta+z');
    await expect(page.locator('.heading-field').filter({ hasText: headingText }).first()).not.toHaveCSS('color', 'rgb(18, 52, 86)');
    await page.keyboard.press('Meta+Shift+z');
    await expect(page.locator('.heading-field').filter({ hasText: headingText }).first()).toHaveCSS('color', 'rgb(18, 52, 86)');
    await page.getByRole('button', { name: 'Preview', exact: true }).click();
    await expect(page.locator('.heading-field').filter({ hasText: headingText }).first()).toHaveCSS('color', 'rgb(18, 52, 86)');
    expect(await measuredGap()).toBe(24);
  });
}

test('Quote HTML editing round-trips portable presentation with the browser DOM parser', async ({ page }) => {
  const { build } = await import('rolldown');
  const bundle = await build({ input: 'app/studio/studio-html-editor.ts', platform: 'browser', write: false, output: { format: 'iife', name: 'QuoteHtml' }, plugins: [{ name: 'ignore-css', load(id) { if (id.endsWith('.css')) return ''; } }] });
  await page.setContent('<main>HTML round trip</main>');
  await page.addScriptTag({ content: bundle.output.find(chunk => chunk.type === 'chunk')!.code });
  const quote = { id: 'html-quote', type: 'quote', text: '', visualStyle: { blockGap: '0', headingColor: '#123456', headingBackgroundGradient: { type: 'linear', angle: 90, stops: [{ colour: '#ffffff', position: 0 }, { colour: '#000000', position: 100 }] }, responsive: { mobile: { blockGap: '24px', headingBackgroundColor: '#aabbcc' } } }, children: [{ id: 'html-heading', type: 'heading', level: 2, text: 'HTML heading' }], attribution: 'Rich citation', attributionRuns: [{ text: 'Rich citation', marks: ['italic'] }] };
  const result = await page.evaluate(quote => {
    const api = (globalThis as unknown as { QuoteHtml: { blockToHtml: (block: unknown) => string; parseHtmlToBlock: (html: string, original: unknown) => { block?: typeof quote; error?: string } } }).QuoteHtml;
    const html = api.blockToHtml(quote);
    const original = { ...quote, visualStyle: undefined };
    const parsed = api.parseHtmlToBlock(html, original);
    const invalid = new DOMParser().parseFromString(html, 'text/html').body.firstElementChild!;
    invalid.setAttribute('data-quote-presentation', JSON.stringify({ blockGap: '-12px' }));
    return { parsed, invalid: api.parseHtmlToBlock(invalid.outerHTML, original) };
  }, quote);
  expect(result.parsed.error).toBeUndefined();
  expect(result.parsed.block!.visualStyle).toEqual(quote.visualStyle);
  expect(result.parsed.block!.attributionRuns).toEqual(quote.attributionRuns);
  expect(result.invalid.error).toMatch(/Quote presentation/);
});

test('Quote Heading background and gradient controls reset through actual Library history', async ({ page }) => {
  await page.goto('/studio/ui/blocks/quote');
  await page.getByRole('group', { name: 'Select an example block', exact: true }).getByRole('button', { name: 'Quote', exact: true }).nth(2).click();
  await page.getByRole('button', { name: 'Elements options', exact: true }).click();
  await page.getByRole('group', { name: 'Elements controls', exact: true }).getByRole('button', { name: 'Heading', exact: true }).click();
  await page.keyboard.press('Escape');
  const heading = page.locator('.ui-library-canvas .heading-field').filter({ hasText: 'An inherited Quote heading' });
  const trigger = page.getByRole('button', { name: 'Choose Heading colour', exact: true });
  await trigger.click();
  await page.getByRole('tab', { name: 'Background', exact: true }).click();
  await setHeadingHex(page, 'AABBCC');
  await expect(heading).toHaveCSS('background-color', 'rgb(170, 187, 204)');
  await page.getByRole('tab', { name: 'Gradient', exact: true }).click();
  await page.getByRole('spinbutton', { name: 'Gradient angle', exact: true }).fill('45');
  await page.keyboard.press('Escape');
  await expect(heading).toHaveCSS('background-image', /linear-gradient/);
  await page.getByRole('button', { name: 'Undo specimen change', exact: true }).click();
  await expect(heading).toHaveCSS('background-color', 'rgb(170, 187, 204)');
  await expect(heading).toHaveCSS('background-image', 'none');
  await page.getByRole('button', { name: 'Redo specimen change', exact: true }).click();
  await expect(heading).toHaveCSS('background-image', /linear-gradient/);
  await page.getByRole('button', { name: 'Elements options', exact: true }).click();
  await page.getByRole('button', { name: 'Reset all', exact: true }).click();
  await page.keyboard.press('Escape');
  await expect(heading).toHaveCSS('background-image', 'none');
  await expect(heading).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
  await page.getByRole('button', { name: 'Undo specimen change', exact: true }).click();
  await expect(heading).toHaveCSS('background-image', /linear-gradient/);
});

test('Quote device Heading backgrounds switch between inherited gradient and mobile solid colour', async ({ page }) => {
  await page.goto('/studio/ui/selection/template');
  await page.locator('.quote-field').filter({ hasText: 'Template quote body' }).first().click({ position: { x: 2, y: 2 } });
  const heading = page.locator('.heading-field').filter({ hasText: 'Template Quote heading' }).first();
  async function showHeading() {
    await page.getByRole('button', { name: 'Elements options', exact: true }).click();
    await page.getByRole('group', { name: 'Elements controls', exact: true }).getByRole('button', { name: 'Heading', exact: true }).click();
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Choose Heading colour', exact: true }).click();
  }
  await showHeading();
  await page.getByRole('tab', { name: 'Gradient', exact: true }).click();
  await page.getByRole('spinbutton', { name: 'Gradient angle', exact: true }).fill('45');
  await page.keyboard.press('Escape');
  await expect(heading).toHaveCSS('background-image', /linear-gradient\(45deg/);
  await page.getByRole('combobox', { name: 'Width', exact: true }).selectOption('mobile');
  await showHeading();
  await page.getByRole('tab', { name: 'Background', exact: true }).click();
  await setHeadingHex(page, 'AABBCC');
  await page.keyboard.press('Escape');
  await expect(heading).toHaveCSS('background-image', 'none');
  await expect(heading).toHaveCSS('background-color', 'rgb(170, 187, 204)');
  await page.getByRole('combobox', { name: 'Width', exact: true }).selectOption('desktop');
  await expect(heading).toHaveCSS('background-image', /linear-gradient\(45deg/);
  await page.getByRole('combobox', { name: 'Width', exact: true }).selectOption('mobile');
  await expect(heading).toHaveCSS('background-image', 'none');
  await page.getByRole('button', { name: 'Elements options', exact: true }).click();
  await page.getByRole('button', { name: 'Reset all', exact: true }).click();
  await page.keyboard.press('Escape');
  await expect(heading).toHaveCSS('background-image', /linear-gradient\(45deg/);
  await page.getByRole('button', { name: 'Transform Quote block', exact: true }).focus();
  await page.keyboard.press('Meta+z');
  await expect(heading).toHaveCSS('background-image', 'none');
  await page.keyboard.press('Meta+Shift+z');
  await expect(heading).toHaveCSS('background-image', /linear-gradient\(45deg/);
});

for (const width of [1440, 820, 390]) {
  test(`Quote Heading element popup is reachable and dismisses at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/studio/ui/blocks/quote');
    await page.getByRole('group', { name: 'Select an example block', exact: true }).getByRole('button', { name: 'Quote', exact: true }).nth(2).click();
    await page.getByRole('button', { name: 'Elements options', exact: true }).click();
    await page.getByRole('group', { name: 'Elements controls', exact: true }).getByRole('button', { name: 'Heading', exact: true }).click();
    await page.keyboard.press('Escape');
    const trigger = page.getByRole('button', { name: 'Choose Heading colour', exact: true });
    await trigger.click();
    const popup = page.getByRole('dialog', { name: 'Heading colour palette', exact: true });
    await expect(popup).toBeVisible();
    const bounds = await popup.boundingBox();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width);
    await popup.getByRole('tab', { name: 'Background', exact: true }).click();
    await popup.screenshot({ path: `/private/tmp/acm-quote-heading-popup-${width}.png` });
    await page.keyboard.press('Escape');
    await expect(popup).toHaveCount(0);
    await expect(trigger).toBeFocused();
  });
}
