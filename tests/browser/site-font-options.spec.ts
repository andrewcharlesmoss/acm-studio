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
