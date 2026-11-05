import { expect, test } from '@playwright/test';

test('ordinary editor appender follows the selected Paragraph text colour', async ({ page }) => {
  const document = { id: 'appender-colour-page', kind: 'page', title: 'Appender colour', subtitle: '', slug: 'appender-colour', excerpt: '', status: 'draft', updatedAt: '2026-10-31T00:00:00.000Z', documentShellVersion: 1, tags: [], seoTitle: '', seoDescription: '', blocks: [{ id: 'coloured-paragraph', type: 'paragraph', text: 'Coloured paragraph', style: { textColor: '#F6CFF4' } }] };
  await page.addInitScript(doc => localStorage.setItem('acm-studio-workspace-v2', JSON.stringify({ version: 56, activeDocumentId: doc.id, documents: [doc], categories: [], bin: [] })), document);
  await page.goto('/studio');
  const paragraph = page.locator('[data-studio-block-anchor-id="coloured-paragraph"] .rich-text-editor');
  const prompt = page.locator('.canvas-appender-trigger');
  await expect(paragraph).toBeVisible();
  await paragraph.click();
  await expect(prompt).toHaveCSS('color', 'rgb(246, 207, 244)');
  await expect(prompt).toHaveCSS('color', await paragraph.evaluate(element => getComputedStyle(element).color));
});

test('Block Library appender tracks inherited colour through local override and reset', async ({ page }) => {
  await page.setViewportSize({ width: 2200, height: 1000 });
  await page.goto('/studio/ui/blocks/paragraph');
  await expect(page.locator('.ui-block-specimen')).toHaveAttribute('data-ready', 'true');

  const stylesPane = page.getByRole('complementary', { name: 'Paragraph Global Styles', exact: true });
  const blockPane = page.getByRole('complementary', { name: 'Paragraph Local Styles', exact: true });
  await stylesPane.getByRole('button', { name: 'Choose Colour', exact: true }).click();
  let palette = page.getByRole('dialog', { name: 'Colour palette', exact: true });
  await palette.locator('.paragraph-colour-swatch').nth(3).click();
  await page.keyboard.press('Escape');

  const paragraph = page.getByRole('textbox', { name: 'Paragraph text', exact: true });
  const appender = page.locator('.ui-block-canvas .canvas-appender-trigger');
  await paragraph.click();
  const inheritedColour = await paragraph.evaluate(node => getComputedStyle(node).color);
  await expect(appender).toHaveCSS('color', inheritedColour);

  const textColour = blockPane.locator('.inspector-colour-row').first();
  await textColour.click();
  palette = page.getByRole('dialog', { name: 'Colour palette', exact: true });
  await palette.locator('.paragraph-colour-swatch').nth(1).click();
  await page.keyboard.press('Escape');
  const localColour = await paragraph.evaluate(node => getComputedStyle(node).color);
  expect(localColour).not.toBe(inheritedColour);
  await expect(appender).toHaveCSS('color', localColour);

  await textColour.click();
  palette = page.getByRole('dialog', { name: 'Colour palette', exact: true });
  await palette.getByRole('button', { name: 'Clear', exact: true }).click();
  await page.keyboard.press('Escape');
  await expect(paragraph).toHaveCSS('color', inheritedColour);
  await expect(appender).toHaveCSS('color', inheritedColour);
});

test('ordinary editor keeps the appender prompt close to the last paragraph', async ({ page }) => {
  const document = { id: 'appender-gap-page', kind: 'page', title: 'Appender gap', subtitle: '', slug: 'appender-gap', excerpt: '', status: 'draft', updatedAt: '2026-10-31T00:00:00.000Z', documentShellVersion: 1, tags: [], seoTitle: '', seoDescription: '', blocks: [{ id: 'last-paragraph', type: 'paragraph', text: 'Last paragraph' }] };
  await page.addInitScript(doc => localStorage.setItem('acm-studio-workspace-v2', JSON.stringify({ version: 56, activeDocumentId: doc.id, documents: [doc], categories: [], bin: [] })), document);
  await page.goto('/studio');
  const paragraph = page.locator('[data-studio-block-anchor-id="last-paragraph"] .rich-text-editor');
  const prompt = page.locator('.canvas-appender-trigger');
  await expect(paragraph).toBeVisible();
  await expect(prompt).toBeVisible();
  await paragraph.click();
  await expect(page.locator('[data-studio-block-anchor-id="last-paragraph"]')).toHaveClass(/is-selected/);
  await prompt.focus();
  await expect(prompt).toHaveText('');
  await expect(page.locator('[data-studio-block-anchor-id="last-paragraph"]')).toHaveClass(/is-selected/);
  const paragraphColour = await paragraph.evaluate(element => getComputedStyle(element).color);
  await expect(prompt).toHaveCSS('color', paragraphColour);
  const paragraphBottom = (await paragraph.boundingBox())!.y + (await paragraph.boundingBox())!.height;
  await prompt.click();
  const nextParagraph = page.getByRole('textbox', { name: 'Paragraph text' }).last();
  await expect(nextParagraph).toBeFocused();
  const nextTop = (await nextParagraph.boundingBox())!.y;
  expect(nextTop - paragraphBottom).toBeGreaterThanOrEqual(20);
  expect(nextTop - paragraphBottom).toBeLessThanOrEqual(40);
});

test('appender follows the same gap as adjacent paragraphs', async ({ page }) => {
  await page.goto('/studio/ui/workspace#block-editor-playground');
  await expect(async () => {
    await page.getByRole('combobox', { name: 'Playground template' }).selectOption('empty');
    await expect(page.getByRole('status').filter({ hasText: 'Empty: 1 top-level block.' })).toBeVisible({ timeout: 1000 });
  }).toPass({ timeout: 20000 });
  const specimen = page.locator('.ui-block-editor-specimen');
  const appender = specimen.locator('.canvas-appender');
  const editors = specimen.getByRole('textbox', { name: 'Paragraph text' });
  await editors.last().pressSequentially('First paragraph');
  await editors.last().press('Enter');
  await editors.last().pressSequentially('Second paragraph');
  const blocks = specimen.locator('.canvas-blocks > .block-position > .canvas-block');
  await expect(blocks).toHaveCount(2);
  const first = (await blocks.nth(0).boundingBox())!;
  const second = (await blocks.nth(1).boundingBox())!;
  const after = (await appender.boundingBox())!;
  const betweenBlocks = second.y - first.y - first.height;
  const beforeAppender = after.y - second.y - second.height;
  expect(Math.abs(beforeAppender - betweenBlocks)).toBeLessThanOrEqual(2);

  // Exercise the production Content-slot adapter with a custom block gap.
  await specimen.locator('.canvas-blocks').first().evaluate(canvas => {
    const slot = document.createElement('div');
    slot.className = 'template-content-layout has-layout-options';
    slot.dataset.layoutConstrained = 'true';
    slot.style.setProperty('--block-layout-gap', '32px');
    canvas.parentElement!.insertBefore(slot, canvas);
    slot.appendChild(canvas);
  });
  const firstInSlot = (await blocks.nth(0).boundingBox())!;
  const secondInSlot = (await blocks.nth(1).boundingBox())!;
  const appenderInSlot = (await appender.boundingBox())!;
  const slotBlockGap = secondInSlot.y - firstInSlot.y - firstInSlot.height;
  const slotAppenderGap = appenderInSlot.y - secondInSlot.y - secondInSlot.height;
  expect(Math.abs(slotAppenderGap - slotBlockGap)).toBeLessThanOrEqual(2);
});

test('shared canvas appender matches Gutenberg presentation and keeps insertion behaviour', async ({ page }) => {
  await page.goto('/studio/ui/workspace#block-editor-playground');
  const template = page.getByRole('combobox', { name: 'Playground template' });
  await expect(async () => {
    await template.selectOption('empty');
    await expect(page.getByRole('status').filter({ hasText: 'Empty: 1 top-level block.' })).toBeVisible({ timeout: 1000 });
  }).toPass({ timeout: 20000 });

  await page.locator('.ui-block-editor-specimen').getByRole('textbox', { name: 'Paragraph text' }).first().pressSequentially('First paragraph');
  const appender = page.locator('.ui-block-editor-specimen .canvas-appender');
  const prompt = appender.locator('.canvas-appender-trigger');
  const plus = appender.getByRole('button', { name: 'Add block' });
  await expect(prompt).toBeVisible();
  await expect(prompt).toHaveText('');

  const presentation = await appender.evaluate(element => {
    const input = element.querySelector<HTMLElement>('.canvas-appender-trigger')!;
    const button = element.querySelector<HTMLElement>('.canvas-appender-button')!;
    const buttonStyle = getComputedStyle(button);
    return {
      appenderFontSize: getComputedStyle(element).fontSize,
      inputFontSize: getComputedStyle(input).fontSize,
      placeholderColor: getComputedStyle(input).color,
      buttonWidth: button.getBoundingClientRect().width,
      buttonHeight: button.getBoundingClientRect().height,
      iconWidth: button.querySelector('svg')!.getBoundingClientRect().width,
      iconHeight: button.querySelector('svg')!.getBoundingClientRect().height,
      buttonBackground: buttonStyle.backgroundColor,
      buttonForeground: buttonStyle.color,
    };
  });
  expect(presentation.inputFontSize).toBe(presentation.appenderFontSize);
  expect(presentation.placeholderColor).toBe(await prompt.evaluate(input => getComputedStyle(input).color));
  expect(presentation.buttonWidth).toBe(24);
  expect(presentation.buttonHeight).toBe(24);
  expect(presentation.iconWidth).toBe(20);
  expect(presentation.iconHeight).toBe(20);
  expect(presentation.buttonBackground).toBe('rgb(30, 30, 30)');
  expect(presentation.buttonForeground).toBe('rgb(255, 255, 255)');

  await plus.click();
  await expect(page.getByRole('dialog', { name: 'Choose a block' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Choose a block' })).toHaveCount(0);

  const paragraphs = page.locator('.ui-block-editor-specimen').getByRole('textbox', { name: 'Paragraph text' });
  await expect(paragraphs).toHaveCount(1);
  await paragraphs.last().focus();
  for (let press = 0; press < 3; press += 1) await paragraphs.last().press('Enter');
  await expect(page.getByRole('status').filter({ hasText: 'Empty: 4 top-level blocks.' })).toBeVisible();
  await expect(plus).toBeHidden();
});



test('appender creates a real Paragraph immediately and keeps draft through Preview', async ({page}) => {
  await page.setViewportSize({width:1900,height:1000}); await page.goto('/studio/ui/blocks/paragraph');
  await expect(page.locator('.ui-block-specimen')).toHaveAttribute('data-ready','true');
  const canvas=page.locator('.ui-block-canvas'); const appender=canvas.getByRole('button',{name:'Add paragraph',exact:true});
  const original=canvas.getByRole('textbox',{name:'Paragraph text'}); await expect(original).toHaveCount(1);
  await appender.click(); const editors=canvas.getByRole('textbox',{name:'Paragraph text'}); await expect(editors).toHaveCount(2); await expect(editors.last()).toBeFocused();
  await editors.last().pressSequentially('Draft before Enter'); await expect(editors.last()).toHaveText('Draft before Enter');
  await page.getByRole('complementary',{name:'Paragraph Local Styles'}).getByRole('button',{name:'Preview',exact:true}).click();
  await expect(canvas.locator('.document-preview')).toContainText('Draft before Enter');
  await page.getByRole('complementary',{name:'Paragraph Local Styles'}).getByRole('button',{name:'Edit',exact:true}).click();
  await expect(editors.last()).toHaveText('Draft before Enter');
});

test('empty paragraph slash query stays in paragraph on Escape and can replace it', async ({page}) => {
  await page.setViewportSize({width:1900,height:1000}); await page.goto('/studio/ui/blocks/paragraph');
  await expect(page.locator('.ui-block-specimen')).toHaveAttribute('data-ready','true');
  const canvas=page.locator('.ui-block-canvas'); await canvas.getByRole('button',{name:'Add paragraph'}).click();
  const paragraph=canvas.getByRole('textbox',{name:'Paragraph text'}).last(); await expect(paragraph).toBeFocused();
  await paragraph.pressSequentially('/heading'); let choices=page.getByRole('listbox',{name:'Suggested blocks'}); await expect(choices).toBeVisible();
  await expect(paragraph).toHaveText('/heading'); await expect(paragraph).toBeFocused();
  await page.keyboard.press('Escape'); await expect(paragraph).toHaveText('/heading'); await expect(paragraph).toBeFocused();
  await paragraph.press('ControlOrMeta+a'); await paragraph.press('Backspace'); await paragraph.pressSequentially('/heading'); choices=page.getByRole('listbox',{name:'Suggested blocks'}); await expect(choices).toBeVisible();
  await paragraph.press('Enter');
  await expect(canvas.getByRole('textbox',{name:'Heading text'})).toHaveCount(1); await expect(canvas.getByRole('textbox',{name:'Paragraph text'})).toHaveCount(1);
});

test('new empty paragraph can be undone, redone and removed with Backspace', async ({page}) => {
  await page.setViewportSize({width:1900,height:1000}); await page.goto('/studio/ui/blocks/paragraph');
  await expect(page.locator('.ui-block-specimen')).toHaveAttribute('data-ready','true');
  const canvas=page.locator('.ui-block-canvas'); const block=page.getByRole('complementary',{name:'Paragraph Local Styles'});
  await canvas.getByRole('button',{name:'Add paragraph'}).click(); const paragraphs=canvas.getByRole('textbox',{name:'Paragraph text'}); await expect(paragraphs).toHaveCount(2);
  await block.getByRole('button',{name:'Undo specimen change'}).click(); await expect(paragraphs).toHaveCount(1);
  await block.getByRole('button',{name:'Redo specimen change'}).click(); await expect(paragraphs).toHaveCount(2);
  await paragraphs.last().click(); await paragraphs.last().press('Backspace'); await expect(paragraphs).toHaveCount(1); await expect(paragraphs.first()).toBeFocused();
});

test('slash suggestions do not accept composing Enter or arrows', async ({page}) => {
  await page.setViewportSize({width:1900,height:1000}); await page.goto('/studio/ui/blocks/paragraph'); await expect(page.locator('.ui-block-specimen')).toHaveAttribute('data-ready','true');
  const canvas=page.locator('.ui-block-canvas'); await canvas.getByRole('button',{name:'Add paragraph'}).click(); const paragraph=canvas.getByRole('textbox',{name:'Paragraph text'}).last();
  await paragraph.press('/'); const list=page.getByRole('listbox',{name:'Suggested blocks'}); await expect(list).toBeVisible();
  const selected=await list.locator('[aria-selected=true]').getAttribute('id');
  await paragraph.evaluate(el => { el.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowDown',keyCode:229,which:229,bubbles:true})); el.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',keyCode:229,which:229,bubbles:true})); });
  await expect(list.locator('[aria-selected=true]')).toHaveAttribute('id', selected!); await expect(paragraph).toHaveText('/'); await expect(canvas.getByRole('textbox',{name:'Paragraph text'})).toHaveCount(2);
});

test('empty playground focuses a real Paragraph without double insertion', async ({page}) => {
  await page.goto('/studio/ui/workspace#block-editor-playground');
  const template=page.getByRole('combobox',{name:'Playground template'}); await expect(template).toBeVisible();
  await expect(async () => { await template.selectOption('empty'); await expect(page.getByRole('status').filter({hasText:'Empty:'})).toBeVisible({timeout:1000}); }).toPass({timeout:20000});
  const canvas=page.locator('.ui-block-editor-specimen'); const paragraphs=canvas.getByRole('textbox',{name:'Paragraph text'});
  await expect(paragraphs).toHaveCount(1); await expect(paragraphs.first()).toBeFocused();
  await page.keyboard.type('First typed text'); await expect(paragraphs.first()).toHaveText('First typed text'); await expect(paragraphs).toHaveCount(1);
});


test('appender text is persisted before Enter and survives reload', async ({page}) => {
 const doc={id:'appender-persist-page',kind:'page',title:'Appender persist',subtitle:'',slug:'appender-persist',excerpt:'',status:'draft',updatedAt:'2026-10-31T00:00:00.000Z',documentShellVersion:1,tags:[],seoTitle:'',seoDescription:'',blocks:[{id:'appender-original',type:'paragraph',text:'Original'}]};
 await page.addInitScript(doc=>{if(!localStorage.getItem('acm-studio-workspace-v2'))localStorage.setItem('acm-studio-workspace-v2',JSON.stringify({version:56,activeDocumentId:doc.id,documents:[doc],categories:[],bin:[]}));},doc);
 await page.goto('/studio'); const trigger=page.locator('.canvas-appender-trigger'); await expect(trigger).toBeVisible(); await trigger.click();
 const paragraphs=page.getByRole('textbox',{name:'Paragraph text'}); await expect(paragraphs).toHaveCount(2); await expect(paragraphs.last()).toBeFocused();
 await paragraphs.last().pressSequentially('Persisted before Return'); await expect(paragraphs.last()).toHaveText('Persisted before Return');
 await paragraphs.first().click(); await expect.poll(()=>page.evaluate(()=>localStorage.getItem('acm-studio-workspace-v2')),{timeout:15000}).toContain('Persisted before Return');
 await page.reload(); await expect(page.getByRole('textbox',{name:'Paragraph text'}).last()).toHaveText('Persisted before Return');
});

test('slash replaces a nested Group Paragraph in place', async ({ page }) => {
  const doc = { id: 'nested-slash', kind: 'page', title: 'Nested slash', subtitle: '', slug: 'nested-slash', excerpt: '', status: 'draft', updatedAt: '2026-10-31T00:00:00.000Z', documentShellVersion: 1, tags: [], seoTitle: '', seoDescription: '', blocks: [{ id: 'group', type: 'group', layout: 'flow', children: [{ id: 'nested-paragraph', type: 'paragraph', text: '' }, { id: 'sibling', type: 'paragraph', text: 'Sibling' }] }] };
  await page.addInitScript(value => localStorage.setItem('acm-studio-workspace-v2', JSON.stringify({ version: 56, activeDocumentId: value.id, documents: [value], categories: [], bin: [] })), doc);
  await page.goto('/studio');
  const paragraph = page.locator('.rich-text-editor[data-studio-block-id="nested-paragraph"]');
  await paragraph.click();
  await paragraph.pressSequentially('/heading');
  await expect(page.getByRole('listbox', { name: 'Suggested blocks' })).toBeVisible();
  await paragraph.press('Enter');
  await expect(page.locator('[data-studio-nested-block-id="group"]')).toHaveCount(0);
  await expect(page.locator('[data-studio-block-anchor-id="group"]').getByRole('textbox', { name: /Heading text/i })).toBeVisible();
  await expect(page.getByText('Sibling', { exact: true })).toBeVisible();
});

test('template slash Navigation replaces the Paragraph in one undoable change', async ({ page }) => {
  await page.goto('/studio/ui/workspace#block-editor-playground');
  const specimen = page.locator('.ui-block-editor-specimen');
  await expect(async () => {
    await specimen.getByRole('combobox', { name: 'Playground template' }).selectOption('empty');
    await expect(specimen.getByRole('status')).toContainText('Empty:', { timeout: 1000 });
  }).toPass({ timeout: 20000 });
  const paragraph = specimen.getByRole('textbox', { name: 'Paragraph text' }).first();
  await paragraph.click();
  await paragraph.pressSequentially('/navigation');
  await expect(page.getByRole('listbox', { name: 'Suggested blocks' }).getByRole('option', { name: 'Navigation', exact: true }).last()).toBeVisible();
  const before = await specimen.getByRole('status').innerText();
  await paragraph.press('Enter');
  await expect(specimen.locator('.template-navigation')).toBeVisible();
  await specimen.getByRole('button', { name: /Undo/ }).first().click();
  await expect(specimen.getByRole('textbox', { name: 'Paragraph text' }).first()).toHaveText('/navigation');
  const previousIndex = Number(before.match(/History position (\d+)/)?.[1]);
  await expect(specimen.getByRole('status')).toContainText(`History position ${previousIndex} of ${previousIndex + 1}`);
});

test('empty Paragraph sequences retain line geometry and the first prompt after deselection', async ({ page }) => {
  const doc = { id: 'stable-empty-paragraphs', kind: 'page', title: 'Stable empty paragraphs', subtitle: '', slug: 'stable-empty-paragraphs', excerpt: '', status: 'draft', updatedAt: '2026-11-03T00:00:00.000Z', documentShellVersion: 1, tags: [], seoTitle: '', seoDescription: '', blocks: [
    { id: 'empty-image', type: 'image', src: '/specimens/landscape.svg', alt: 'Landscape', displayWidth: 160, displayHeight: 90 },
    { id: 'first-empty', type: 'paragraph', text: '' },
    { id: 'second-empty', type: 'paragraph', text: '' },
  ] };
  await page.addInitScript(value => localStorage.setItem('acm-studio-workspace-v2', JSON.stringify({ version: 57, activeDocumentId: value.id, documents: [value], categories: [], bin: [] })), doc);
  await page.goto('/studio');
  const first = page.locator('[data-studio-block-anchor-id="first-empty"] .paragraph-field');
  const second = page.locator('[data-studio-block-anchor-id="second-empty"] .paragraph-field');
  const state = (field: typeof first) => field.evaluate(element => ({ height: element.getBoundingClientRect().height, lineHeight: parseFloat(getComputedStyle(element).lineHeight), placeholder: getComputedStyle(element, '::before').content, opacity: getComputedStyle(element, '::before').opacity }));
  await first.click();
  const before = await state(first);
  await page.locator('[data-studio-block-anchor-id="empty-image"]').click();
  const after = await state(first);
  expect(after.height).toBeGreaterThanOrEqual(after.lineHeight - 1);
  expect(Math.abs(after.height - before.height)).toBeLessThanOrEqual(1);
  expect(after.placeholder).toContain('Type / to choose a block');
  expect(after.opacity).toBe('1');
  await second.click();
  expect((await state(second)).opacity).toBe('0');
  expect((await state(second)).height).toBeGreaterThanOrEqual((await state(second)).lineHeight - 1);
  await expect(page.locator('.canvas-appender')).toBeHidden();
  const inlineInserter = page.locator('[data-studio-block-anchor-id="second-empty"] .canvas-paragraph-inserter');
  await expect(inlineInserter).toBeVisible();
  await inlineInserter.click();
  await expect(page.getByRole('dialog', { name: 'Choose a block' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('.canvas-blocks > .block-position')).toHaveCount(3);
  await first.pressSequentially('First paragraph');
  expect((await state(second)).opacity).toBe('1');
  await second.pressSequentially('Second paragraph');
  await expect(page.locator('.canvas-appender')).toBeVisible();
});

test('trailing empty Paragraph + replaces that Paragraph without leaving another blank block', async ({ page }) => {
  const doc = { id: 'replace-empty-appender', kind: 'page', title: 'Replace empty paragraph', subtitle: '', slug: 'replace-empty-appender', excerpt: '', status: 'draft', updatedAt: '2026-11-03T00:00:00.000Z', documentShellVersion: 1, tags: [], seoTitle: '', seoDescription: '', blocks: [{ id: 'remain', type: 'paragraph', text: 'Remain' }, { id: 'empty', type: 'paragraph', text: '' }] };
  await page.addInitScript(value => localStorage.setItem('acm-studio-workspace-v2', JSON.stringify({ version: 57, activeDocumentId: value.id, documents: [value], categories: [], bin: [] })), doc);
  await page.goto('/studio');
  await page.locator('[data-studio-block-anchor-id="empty"] .paragraph-field').click();
  await page.locator('[data-studio-block-anchor-id="empty"] .canvas-paragraph-inserter').click();
  await page.getByRole('dialog', { name: 'Choose a block' }).getByRole('button', { name: 'Heading', exact: true }).click();
  await expect(page.locator('.canvas-blocks > .block-position')).toHaveCount(2);
  await expect(page.locator('[data-studio-block-anchor-id="empty"]')).toHaveCount(0);
  await expect(page.getByRole('textbox', { name: 'Heading text', exact: true })).toBeFocused();
  await expect(page.locator('[data-studio-block-anchor-id="remain"]')).toContainText('Remain');
});

test('remove-locked trailing empty Paragraph retains an append-after inserter', async ({ page }) => {
  const doc = { id: 'locked-empty-appender', kind: 'page', title: 'Locked empty paragraph', subtitle: '', slug: 'locked-empty-appender', excerpt: '', status: 'draft', updatedAt: '2026-11-03T00:00:00.000Z', documentShellVersion: 1, tags: [], seoTitle: '', seoDescription: '', blocks: [{ id: 'locked-empty', type: 'paragraph', text: '', editorial: { lock: { remove: true } } }] };
  await page.addInitScript(value => localStorage.setItem('acm-studio-workspace-v2', JSON.stringify({ version: 57, activeDocumentId: value.id, documents: [value], categories: [], bin: [] })), doc);
  await page.goto('/studio');
  await expect(page.locator('.canvas-paragraph-inserter')).toHaveCount(0);
  await page.locator('[data-studio-block-anchor-id="locked-empty"] .paragraph-field').click();
  await page.locator('.canvas-appender .canvas-appender-button').click();
  await page.getByRole('dialog', { name: 'Choose a block' }).getByRole('button', { name: 'Heading', exact: true }).click();
  await expect(page.locator('[data-studio-block-anchor-id="locked-empty"]')).toHaveCount(1);
  await expect(page.locator('.canvas-blocks > .block-position')).toHaveCount(2);
});
