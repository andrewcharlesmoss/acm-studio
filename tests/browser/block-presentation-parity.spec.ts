import { expect, test, type Page } from '@playwright/test';

const specimens = [
  { type: 'paragraph', edit: '.paragraph-field', preview: '.paragraph-field' },
  { type: 'heading', edit: '.heading-field', preview: '.heading-field' },
  { type: 'quote', edit: '.quote-field', preview: '.quote-field' },
  { type: 'quote', edit: '.quote-citation', preview: '.quote-citation' },
  { type: 'quote', edit: '.quote-field .paragraph-field', preview: '.quote-field .paragraph-field' },
  { type: 'code', edit: '.code-highlight', preview: '.studio-code-preview' },
  { type: 'image', edit: '.image-field', preview: '.image-field' },
  { type: 'buttons', edit: '.content-button', preview: '.content-button' },
  { type: 'buttons', edit: '.content-buttons', preview: '.content-buttons' },
  { type: 'list', edit: '.list-item-editor', preview: '.list-item-text' },
  { type: 'table', edit: '.table-cell-editor', preview: '.content-table-cell' },
  { type: 'table', edit: '.table-field > figcaption', preview: '.content-table-frame > figcaption' },
  { type: 'table', edit: '.table-field:has(table)', preview: '.content-table-frame' },
  { type: 'embed', edit: '.embed-player-block > figcaption', preview: '.embed-player-block > figcaption' },
];

async function compareSpecimen(page: Page, specimen: (typeof specimens)[number]) {
    await page.goto(`/studio/ui/blocks/${specimen.type}`);
    await expect(page.locator('.ui-block-specimen')).toHaveAttribute('data-ready', 'true');
    const canvas = page.locator('.ui-block-canvas');
    await expect(canvas.locator(specimen.edit).first()).toBeVisible();
    await expect(canvas.locator(specimen.edit).first()).not.toHaveText('');
    if (specimen.type === 'image') await expect(canvas.locator('.image-field img')).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    const measure = (selector: string) => canvas.locator(selector).evaluateAll(elements => elements.map(element => {
      const rect = element.getBoundingClientRect();
      const css = getComputedStyle(element);
      const style = Object.fromEntries(['fontFamily', 'fontSize', 'fontWeight', 'fontStyle', 'lineHeight', 'letterSpacing', 'textAlign', 'textIndent', 'whiteSpace', 'color', 'backgroundColor'].map(property => [property, css[property as keyof CSSStyleDeclaration]]));
      const readText = (node: Node): string => node.nodeType === Node.TEXT_NODE ? node.textContent ?? '' : node.nodeName === 'BR' ? '\n' : [...node.childNodes].map(readText).join('');
      return { text: readText(element), width: rect.width, height: rect.height, style };
    }));
    const edit = await measure(specimen.edit);
    await page.getByRole('group', { name: 'Specimen view' }).getByRole('button', { name: 'Preview', exact: true }).click();
    await expect(page.getByRole('group', { name: 'Specimen view' }).getByRole('button', { name: 'Preview', exact: true })).toHaveAttribute('aria-pressed', 'true');
    const preview = await measure(specimen.preview);
    expect(preview).toHaveLength(edit.length);
    for (let index = 0; index < edit.length; index += 1) {
      expect.soft(preview[index].text).toBe(edit[index].text);
      expect.soft(preview[index].style, `painted styles for ${index}`).toEqual(edit[index].style);
      expect.soft(preview[index].width, `width for ${index}`).toBeCloseTo(edit[index].width, 1);
      expect.soft(preview[index].height, `height for ${index}`).toBeCloseTo(edit[index].height, 1);
    }
}

for (const specimen of specimens) {
  test(`${specimen.type} ${specimen.edit} preserves painted presentation in Preview`, async ({ page }) => {
    await compareSpecimen(page, specimen);
  });
}

for (const width of [820, 390]) {
  for (const type of ['quote', 'code', 'buttons', 'table']) {
    test(`${type} retains presentation at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 1000 });
      await compareSpecimen(page, specimens.find(specimen => specimen.type === type)!);
    });
  }
}

test('document headings and body positions stay fixed when switching modes', async ({ page }) => {
  await page.goto('/studio/ui/selection');
  await expect(page.locator('[data-studio-block-id="column-drag-source"]')).toHaveText('Drag this paragraph into a column.');
  await expect(page.locator('#document-title')).toHaveValue('Multiple block selection');
  await page.locator('#document-subtitle').fill('A supporting subtitle\nwith another line\n');
  const measure = () => page.locator('.document-heading .preview-title, .document-heading .preview-subtitle, [data-studio-block-id="column-drag-source"], [data-preview-block-id="column-drag-source"] > .paragraph-field').evaluateAll(elements => elements.map(element => {
    const r = element.getBoundingClientRect();
    return { text: element.textContent, x: r.x, y: r.y, width: r.width, height: r.height, font: getComputedStyle(element).font };
  }));
  await expect(page.locator('.preview-subtitle')).toHaveText('A supporting subtitle\nwith another line\n');
  await page.evaluate(() => document.fonts.ready);
  const edit = await measure();
  await page.getByRole('group', { name: 'Post view' }).getByRole('button', { name: 'Preview', exact: true }).click();
  expect(await measure()).toEqual(edit);
});


test('code native input retains the painted size while adding and removing lines', async ({ page }) => {
  await page.goto('/studio/ui/blocks/code');
  await expect(page.locator('.ui-block-specimen')).toHaveAttribute('data-ready', 'true');
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator('.ui-block-specimen')).toHaveAttribute('data-ready', 'true');
  const modes = page.getByRole('group', { name: 'Specimen view' });
  await modes.getByRole('button', { name: 'Preview', exact: true }).click();
  await expect(page.locator('.code-input')).toHaveCount(0);
  await modes.getByRole('button', { name: 'Edit', exact: true }).click();
  const input = page.locator('.code-input').first();
  await expect(input).not.toHaveValue('');
  for (const text of ['first\nsecond\n', 'short', 'a long line '.repeat(40) + '\n\n']) {
    await input.fill(text);
    await expect(page.locator('.code-highlight').first()).toHaveText(text);
    const paint = await page.locator('.code-highlight').first().boundingBox();
    const field = await input.boundingBox();
    expect(field).toEqual(paint);
  }
  await input.fill("const idea = 'A fresh perspective';\nconsole.log(idea);");
  await expect(page.locator('.code-highlight').first()).toHaveText("const idea = 'A fresh perspective';\nconsole.log(idea);");
  await modes.getByRole('button', { name: 'Preview', exact: true }).click();
  await expect(modes.getByRole('button', { name: 'Preview', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.locator('.studio-code-preview').first().screenshot({ path: '/tmp/acm-studio-code-preview.png' });
});

test('template canvas keeps the first paragraph in the same place in both modes', async ({ page }) => {
  await page.goto('/studio/ui/selection/template');
  const editor = page.locator('[data-studio-block-id="template-drag-source"]');
  await expect(editor).not.toHaveText('');
  await page.evaluate(() => document.fonts.ready);
  const measure = (selector: string) => page.locator(selector).evaluate(element => {
    const r = element.getBoundingClientRect();
    return { text: element.textContent, x: r.x, y: r.y, width: r.width, height: r.height, font: getComputedStyle(element).font };
  });
  const edit = await measure('[data-studio-block-id="template-drag-source"]');
  await page.locator('.editor-mode-control').getByRole('button', { name: 'Preview', exact: true }).click();
  expect(await measure('[data-preview-block-id="template-drag-source"] .paragraph-field')).toEqual(edit);
});

test('footnote content keeps the same height and text geometry in both modes', async ({ page }) => {
  await page.goto('/studio/ui/blocks/footnotes');
  await expect(page.locator('.ui-block-specimen')).toHaveAttribute('data-ready', 'true');
  await page.evaluate(() => document.fonts.ready);
  const modes = page.getByRole('group', { name: 'Specimen view' });
  const measure = () => page.locator('.article-footnotes').evaluate(element => {
    const rect = element.getBoundingClientRect();
    const note = element.querySelector('li');
    const noteRect = note?.getBoundingClientRect();
    const field = note?.querySelector('textarea');
    return { height: rect.height, noteHeight: noteRect?.height, noteText: (field?.value ?? note?.textContent ?? '').replace(/\s+/g, ' ').trim() };
  });
  const edit = await measure();
  await modes.getByRole('button', { name: 'Preview', exact: true }).click();
  const preview = await measure();
  expect(preview.noteText).toBe(edit.noteText);
  expect(preview.height).toBeCloseTo(edit.height, 0);
  expect(preview.noteHeight!).toBeCloseTo(edit.noteHeight!, 0);
});

test('social icon add control does not take part in icon layout', async ({ page }) => {
  await page.goto('/studio/ui/blocks/social-icons');
  await expect(page.locator('.ui-block-specimen')).toHaveAttribute('data-ready', 'true');
  await page.evaluate(() => document.fonts.ready);
  const modes = page.getByRole('group', { name: 'Specimen view' });
  const measure = () => page.locator('.social-icons-block').evaluate(element => {
    const rect = element.getBoundingClientRect();
    const list = element.querySelector('ul')?.getBoundingClientRect();
    const icons = [...element.querySelectorAll('.social-icon-item, .social-icon-link')].map(icon => {
      const iconRect = icon.getBoundingClientRect();
      return { x: iconRect.x, y: iconRect.y, width: iconRect.width, height: iconRect.height };
    });
    const appender = element.querySelector('.social-icons-appender');
    return { height: rect.height, listHeight: list?.height, icons, appenderPosition: appender ? getComputedStyle(appender).position : null };
  });
  const edit = await measure();
  expect(edit.appenderPosition).toBe('absolute');
  await modes.getByRole('button', { name: 'Preview', exact: true }).click();
  const preview = await measure();
  expect(preview.height).toBe(edit.height);
  expect(preview.listHeight).toBe(edit.listHeight);
  expect(preview.icons).toEqual(edit.icons);
});

test('navigation labels match links while drag and add controls stay out of layout', async ({ page }) => {
  await page.goto('/studio/ui/blocks/navigation');
  await expect(page.locator('.ui-block-specimen')).toHaveAttribute('data-ready', 'true');
  await page.evaluate(() => document.fonts.ready);
  const modes = page.getByRole('group', { name: 'Specimen view' });
  const measureEdit = () => page.locator('.navigation-editor').evaluate(element => ({
    height: element.getBoundingClientRect().height,
    items: [...element.querySelectorAll(':scope > ul > .navigation-edit-item > .navigation-edit-label')].map(input => {
      const rect = input.getBoundingClientRect();
      return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
    }),
    addPosition: getComputedStyle(element.querySelector('.navigation-appender')!).position,
  }));
  await expect(page.locator('.navigation-edit-label').first()).toHaveValue('Home');
  const edit = await measureEdit();
  await modes.getByRole('button', { name: 'Preview', exact: true }).click();
  const preview = await page.locator('.template-navigation:not(.navigation-editor)').evaluate(element => ({
    height: element.getBoundingClientRect().height,
    items: [...element.querySelectorAll(':scope > .template-navigation-desktop > ul > li')].map(item => {
      const rect = item.querySelector('a')!.getBoundingClientRect();
      return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
    }),
  }));
  expect(edit.height).toBe(preview.height);
  expect(edit.items).toEqual(preview.items);
  expect(edit.addPosition).toBe('absolute');
});

test('spacer authoring outline does not change its authored dimensions', async ({ page }) => {
  await page.goto('/studio/ui/blocks/spacer');
  await expect(page.locator('.ui-block-specimen')).toHaveAttribute('data-ready', 'true');
  await page.evaluate(() => document.fonts.ready);
  const modes = page.getByRole('group', { name: 'Specimen view' });
  const measure = (selector: string) => page.locator(selector).first().evaluate(element => {
    const rect = element.getBoundingClientRect();
    return { width: rect.width, height: rect.height };
  });
  const edit = await measure('.spacer-field');
  await modes.getByRole('button', { name: 'Preview', exact: true }).click();
  expect(await measure('.content-spacer')).toEqual(edit);
});

test('Spacer visual styles use the same frame in Edit and Preview', async ({ page }) => {
  await page.goto('/studio/ui/blocks/spacer');
  await expect(page.locator('.ui-block-specimen')).toHaveAttribute('data-ready', 'true');
  await page.evaluate(() => document.fonts.ready);
  const modes = page.getByRole('group', { name: 'Specimen view' });
  await page.getByRole('textbox', { name: 'Additional CSS', exact: true }).fill('background-color: #fff3cd; border: 2px solid #ff0000; padding: 4px;');
  const measure = (selector: string) => page.locator(selector).first().evaluate(element => {
    const frame = element.parentElement!;
    const rect = frame.getBoundingClientRect();
    const style = getComputedStyle(frame);
    const canvas = element.closest('.ui-block-canvas')!.getBoundingClientRect();
    return { x: rect.x - canvas.x, y: rect.y - canvas.y, width: rect.width, height: rect.height, background: style.backgroundColor, border: style.border, padding: style.padding };
  });
  const edit = await measure('.spacer-field');
  await modes.getByRole('button', { name: 'Preview', exact: true }).click();
  expect(await measure('.content-spacer')).toEqual(edit);
});

test('Row children retain their inline position when one child is a zero-height Spacer', async ({ page }) => {
  await page.goto('/studio/ui/blocks/spacer');
  await expect(page.locator('.ui-block-specimen')).toHaveAttribute('data-ready', 'true');
  await page.evaluate(() => document.fonts.ready);
  const modes = page.getByRole('group', { name: 'Specimen view' });
  const measure = (selector: string) => page.locator(selector).evaluate(element => {
    const rect = element.getBoundingClientRect();
    return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
  });
  const edit = await measure('.studio-nested-group.layout-row .paragraph-field');
  await modes.getByRole('button', { name: 'Preview', exact: true }).click();
  expect(await measure('.content-group.layout-row .paragraph-field')).toEqual(edit);
});

test('headings keep complete descenders without extra line-box padding', async ({ page }) => {
  await page.goto('/studio/ui/blocks/heading');
  await expect(page.locator('.ui-block-specimen')).toHaveAttribute('data-ready', 'true');
  const field = page.locator('.ui-block-canvas .heading-field').first();
  await field.fill('A place for good ideas');
  const measure = () => page.locator('.ui-block-canvas .heading-field').first().evaluate(e => ({ height: e.getBoundingClientRect().height, overflow: getComputedStyle(e).overflow, padding: getComputedStyle(e).paddingBottom }));
  const edit = await measure();
  expect(edit.overflow).toBe('visible');
  expect(edit.padding).toBe('0px');
  await page.getByRole('group', { name: 'Specimen view' }).getByRole('button', { name: 'Preview', exact: true }).click();
  expect(await measure()).toEqual(edit);
  await page.locator('.ui-block-canvas .heading-field').first().screenshot({ path: '/tmp/acm-heading-descenders.png' });
});
