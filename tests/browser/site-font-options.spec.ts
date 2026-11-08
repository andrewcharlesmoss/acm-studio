import { expect, test } from '@playwright/test';

test('local Paragraph font choices follow Site Editor fonts', async ({ page }) => {
  await page.setViewportSize({ width: 2200, height: 1200 });
  await page.goto('/studio/ui/blocks/paragraph');
  const local = page.locator('aside[aria-label="Paragraph Local Styles"]');
  await expect(local).toBeVisible();
  await local.getByRole('button', { name: 'Typography options' }).click();
  const typography = page.getByRole('group', { name: 'Typography controls' });
  await typography.getByRole('button', { name: 'Font', exact: true }).click();
  await page.keyboard.press('Escape');
  await local.locator('.studio-font-preview-trigger').click();
  await expect(page.getByRole('menuitemradio', { name: 'Manrope' })).toBeVisible();
  await expect(page.getByRole('menuitemradio', { name: 'Fira Code' })).toBeVisible();
  await expect(page.getByRole('menuitemradio', { name: 'Helvetica Neue' })).toHaveCount(0);
  await page.getByRole('menuitemradio', { name: 'Manrope' }).click();
  await expect(local.locator('.studio-font-preview-trigger')).toContainText('Manrope');
  await expect(page.locator('.ui-library-block-preview-stage [style*="site-manrope"]').first()).toBeVisible();
});

test('Paragraph Appearance previews inherited font weights and keeps its default unset', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/studio/ui/blocks/paragraph');
  await expect(page.locator('.ui-block-specimen')).toHaveAttribute('data-ready', 'true');
  const local = page.getByRole('complementary', { name: 'Paragraph inspector', exact: true });
  const options = local.getByRole('button', { name: 'Typography options', exact: true });
  await options.click();
  const appearanceToggle = page.locator('.inspector-tools-menu').getByRole('button', { name: 'Appearance', exact: true });
  if (await appearanceToggle.getAttribute('aria-pressed') !== 'true') await appearanceToggle.click();
  await page.keyboard.press('Escape');
  await expect(options).toBeFocused();

  const paragraph = page.locator('.ui-block-canvas').getByRole('textbox', { name: 'Paragraph text', exact: true }).first();
  const inheritedFamily = await paragraph.evaluate(element => getComputedStyle(element).fontFamily);
  const inheritedWeight = await paragraph.evaluate(element => getComputedStyle(element).fontWeight);
  const undo = local.getByRole('button', { name: 'Undo specimen change', exact: true });
  for (const width of [700, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(local).toBeVisible();
    const trigger = local.getByRole('button', { name: /^Appearance / });
    await trigger.click();
    const menu = page.getByRole('menu', { name: 'Appearance', exact: true });
    const choices = menu.getByRole('menuitemradio');
    await expect(choices).toHaveCount(21);
    await expect(choices.first()).toHaveAttribute('aria-checked', 'true');
    const preview = await choices.evaluateAll(elements => elements.map(element => {
      const label = element.querySelector('span') as HTMLElement;
      const style = getComputedStyle(label);
      return { label: label.textContent, weight: style.fontWeight, style: style.fontStyle, family: style.fontFamily };
    }));
    expect(preview.map(({ label }) => label)).toEqual([
      'Default', 'Thin', 'Extra Light', 'Light', 'Regular', 'Medium', 'Semi Bold', 'Bold', 'Extra Bold', 'Black', 'Extra Black',
      'Thin Italic', 'Extra Light Italic', 'Light Italic', 'Regular Italic', 'Medium Italic', 'Semi Bold Italic', 'Bold Italic', 'Extra Bold Italic', 'Black Italic', 'Extra Black Italic',
    ]);
    expect(preview.slice(1, 11).map(({ weight }) => weight)).toEqual(['100', '200', '300', '400', '500', '600', '700', '800', '900', '1000']);
    expect(preview.slice(11).map(({ weight }) => weight)).toEqual(['100', '200', '300', '400', '500', '600', '700', '800', '900', '1000']);
    expect(preview.slice(1).every(({ family }) => family === inheritedFamily)).toBe(true);
    expect(preview.slice(11).every(({ style }) => style === 'italic')).toBe(true);
    const geometry = await menu.evaluate(element => {
      const menuRect = element.getBoundingClientRect();
      const triggerRect = document.querySelector('.studio-font-preview-trigger[aria-expanded="true"]')!.getBoundingClientRect();
      return { menuWidth: menuRect.width, triggerWidth: triggerRect.width, right: menuRect.right, bottom: menuRect.bottom, height: menuRect.height, viewportWidth: innerWidth, viewportHeight: innerHeight };
    });
    expect(Math.abs(geometry.menuWidth - geometry.triggerWidth)).toBeLessThan(1);
    expect(geometry.right).toBeLessThanOrEqual(geometry.viewportWidth);
    expect(geometry.bottom).toBeLessThanOrEqual(geometry.viewportHeight);
    expect(geometry.height).toBeLessThanOrEqual(400);
    await page.keyboard.press('End');
    await page.keyboard.press('Enter');
    await expect(trigger).toBeFocused();
    await expect(paragraph).toHaveCSS('font-weight', '1000');
    await expect(paragraph).toHaveCSS('font-style', 'italic');
    await undo.click();
    await expect(paragraph).toHaveCSS('font-weight', inheritedWeight);
    await expect(paragraph).toHaveCSS('font-style', 'normal');
    await trigger.click();
    await expect(menu.getByRole('menuitemradio', { name: 'Default', exact: true })).toHaveAttribute('aria-checked', 'true');
    await page.keyboard.press('Escape');
    await expect(trigger).toBeFocused();
  }
});

test('disabled site fonts use their fallback in the editing canvas and preview', async ({ page }) => {
  const { build } = await import('rolldown');
  const { readFileSync } = await import('node:fs');
  const path = await import('node:path');
  const { createRequire } = await import('node:module');
  const require = createRequire(import.meta.url);
  const entry = `import React,{useState} from 'react';import {createRoot} from 'react-dom/client';import {StudioEditor} from './app/studio/studio-editor';import {initialStudioWorkspace} from './app/studio/editor-model';import {WebsiteFontAvailabilityContext} from './app/studio/site-editor/font-availability-context';
  const noop=()=>{};const styles={paletteId:'default',typographyId:'default',typography:{disabledFonts:['"TT5 Manrope", sans-serif']}};
  function Example(){const [preview,setPreview]=useState(false);const doc={...initialStudioWorkspace.documents[0],blocks:[{id:'font-block',type:'paragraph',text:'Font sample',style:{fontFamily:'site-manrope'}}]};return React.createElement(WebsiteFontAvailabilityContext.Provider,{value:styles},React.createElement('button',{onClick:()=>setPreview(!preview)},'Switch mode'),React.createElement(StudioEditor,{writable:true,canvas:{activeDocument:doc,previewing:preview,wordCount:2,characterCount:11,linkTargets:[],showCoverImage:false,mediaBlockUrls:{},selectedBlockId:null,showInserter:false,inserterQuery:'',filteredBlocks:[],publishFeedback:'',onUpdateBlock:noop,onSelectBlock:noop,onClearBlockSelection:noop,onPreviewChange:noop,onOpenInserter:noop,onSetPublishFeedback:noop,onDocumentFieldChange:noop,onApplyDocumentCode:noop,onCodeEditorDirtyChange:noop,onFocusDocumentField:noop,onOpenCoverMediaLibrary:noop,onRemoveCoverImage:noop,onSetDragOverIndex:noop,onMoveBlockTo:noop,onRemoveBlock:noop,onInsertBlock:noop,onSetShowInserter:noop,onSetInserterQuery:noop}}));}createRoot(document.getElementById('mounted')).render(React.createElement(Example));`;
  const bundle = await build({ input:'virtual-font-fallback', platform:'browser', write:false, output:{format:'iife'}, plugins:[{name:'font-fallback-fixture',resolveId(id) {if(id==='virtual-font-fallback') return path.resolve('font-fallback-mounted.ts');if(id==='react'||id==='react/jsx-runtime'||id==='react-dom/client') return require.resolve(id);},load(id) {if(id===path.resolve('font-fallback-mounted.ts')) return entry;if(id.endsWith('?raw')) return `export default ${JSON.stringify(readFileSync(id.slice(0,-4),'utf8'))}`;if(id.endsWith('.css')) return {code:'',moduleType:'js' as const};}}] });
  await page.route('**/__font-fallback-fixture', route => route.fulfill({contentType:'text/html',body:'<main id="mounted"></main>'}));
  await page.goto('/__font-fallback-fixture');
  await page.addScriptTag({content:bundle.output.find(chunk => chunk.type==='chunk')!.code});
  const canvas=page.locator('.block-editor');
  await expect(canvas).toHaveCSS('--site-manrope','sans-serif');
  await expect(canvas.locator('[style*="site-manrope"]').first()).toHaveCSS('font-family','sans-serif');
  await page.getByRole('button',{name:'Switch mode'}).click();
  await expect(canvas).toHaveCSS('--site-manrope','sans-serif');
  await expect(canvas.locator('[style*="site-manrope"]').first()).toHaveCSS('font-family','sans-serif');
});
