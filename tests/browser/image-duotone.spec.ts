import type { ContentBlock } from "../../app/content/model";
import { expect, test, type Locator, type Page } from '@playwright/test';
import { createRequire } from 'node:module';
import path from 'node:path';
import { readFileSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { PNG } = require(path.join(path.dirname(require.resolve('playwright-core/package.json')), 'lib/utilsBundle.js'));

async function pixel(image: Locator) {
  const png = PNG.sync.read(await image.screenshot());
  const offset = (Math.floor(png.height * 0.15) * png.width + Math.floor(png.width * 0.5)) * 4;
  return [...png.data.subarray(offset, offset + 3)] as number[];
}
function expectGray(value: number[]) { expect(Math.max(...value) - Math.min(...value)).toBeLessThanOrEqual(2); }
const hosts = {
  library: { url: '/studio/ui/blocks/image', alt: 'Illustrated green hill with a blue sky' },
  content: { url: '/studio/ui/selection', alt: 'A local geometric image fixture' },
  template: { url: '/studio/ui/selection/template', alt: 'Template landscape example' },
};
async function openImage(page: Page, host: keyof typeof hosts) {
  await page.goto(hosts[host].url);
  if (host === 'library') await expect(page.locator('.ui-block-specimen')).toHaveAttribute('data-ready', 'true');
  const image = page.getByRole('img', { name: hosts[host].alt, exact: true });
  await image.click();
  const toolbar = page.getByRole('group', { name: 'Image block tools', exact: true });
  return { image, toolbar, trigger: toolbar.getByRole('button', { name: 'Duotone', exact: true }) };
}
for (const host of Object.keys(hosts) as (keyof typeof hosts)[]) {
  test(`Image Duotone presets, clear, reset and history reach actual ${host} pixels`, async ({ page }) => {
    const { image, trigger } = await openImage(page, host);
    const original = await pixel(image);
    await trigger.click(); await page.getByRole('button', { name: 'Duotone preset 1', exact: true }).click();
    await page.keyboard.press('Escape'); await expect(trigger).toBeFocused();
    await expect(image).toHaveAttribute('data-image-duotone-authored', 'true');
    expectGray(await pixel(image));
    await page.keyboard.press('Meta+z'); await expect(image).not.toHaveAttribute('data-image-duotone-authored', 'true');
    expect(await pixel(image)).toEqual(original);
    await page.keyboard.press('Meta+Shift+z'); expectGray(await pixel(image));
    await trigger.click(); await page.getByRole('button', { name: 'Clear Duotone', exact: true }).click();
    await expect(image).toHaveCSS('filter', 'none');
    await expect(page.getByRole('button', { name: 'Clear Duotone', exact: true })).toBeDisabled();
    await page.getByRole('button', { name: 'Reset Duotone', exact: true }).click();
    await expect(image).not.toHaveAttribute('data-image-duotone-authored', 'true');
    await page.getByRole('button', { name: 'Duotone preset 2', exact: true }).click();
    await page.keyboard.press('Escape');
    const filtered = await pixel(image); expect(filtered).not.toEqual(original);
    const luminance = (original[0] * .2126 + original[1] * .7152 + original[2] * .0722) / 255;
    const expected = [255 * luminance, 204 * luminance, 128 * (1 - luminance)];
    filtered.forEach((channel, index) => expect(Math.abs(channel - expected[index])).toBeLessThanOrEqual(2));
    await page.getByRole('button', { name: 'Preview', exact: true }).click();
    const preview = page.locator('figure.image-field img').first();
    await expect(preview).toHaveAttribute('data-image-duotone-authored', 'true');
    expect(await pixel(preview)).toEqual(filtered);
  });
  test(`Image Columns retains Duotone and caption in ${host} history`, async ({ page }) => {
    const { image, trigger } = await openImage(page, host);
    await trigger.click(); await page.getByRole('button', { name: 'Duotone preset 1', exact: true }).click(); await page.keyboard.press('Escape');
    const caption = page.getByRole('textbox', { name: 'Image caption', exact: true });
    if (!await caption.count()) await page.getByRole('button', { name: 'Add caption', exact: true }).click();
    await caption.click(); await caption.fill('Retained rich caption'); await caption.press('Meta+A');
    await page.getByRole('button', { name: 'Bold selected text', exact: true }).click();
    await expect(caption.locator('strong,b')).toHaveText('Retained rich caption');
    const captionBefore = await caption.innerHTML();
    const before = await pixel(image);
    await page.getByRole('button', { name: 'Transform Image block', exact: true }).click();
    await page.getByRole('menuitem', { name: 'Columns', exact: true }).click();
    const tools = page.getByRole('group', { name: 'Columns block tools', exact: true });
    await expect(tools).toBeVisible(); expect(await pixel(image)).toEqual(before); expect(await caption.innerHTML()).toBe(captionBefore);
    await tools.getByRole('button', { name: 'More block options', exact: true }).focus();
    await page.keyboard.press('Meta+z'); await expect(page.getByRole('button', { name: 'Transform Image block', exact: true })).toBeVisible(); expect(await pixel(image)).toEqual(before); expect(await caption.innerHTML()).toBe(captionBefore);
    await page.getByRole('group', { name: 'Image block tools', exact: true }).getByRole('button', { name: 'More block options', exact: true }).focus();
    await page.keyboard.press('Meta+Shift+z'); await expect(page.getByRole('group', { name: 'Columns block', exact: true }).filter({ has: image })).toBeVisible(); expect(await pixel(image)).toEqual(before); expect(await caption.innerHTML()).toBe(captionBefore);
  });
}

test('Image inspector custom colours and read-only transition use the canonical Duotone popup', async ({ page }) => {
  const { image } = await openImage(page, 'library');
  const original = await pixel(image);
  const pane = page.getByRole('complementary', { name: 'Image settings', exact: true });
  await pane.getByRole('tab', { name: 'Styles', exact: true }).click();
  const trigger = pane.getByRole('button', { name: 'Duotone', exact: true });
  await trigger.click();
  await expect(page.getByRole('button', { name: 'Clear Duotone', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Clear Duotone', exact: true }).click();
  await expect(image).toHaveCSS('filter', 'none');
  await page.getByRole('button', { name: 'Reset Duotone', exact: true }).click();
  await page.getByRole('button', { name: 'Choose Shadows', exact: true }).click();
  await page.getByRole('button', { name: 'Custom shadows colour picker', exact: true }).click();
  const hex = page.getByRole('textbox', { name: 'Hex colour', exact: true });
  await hex.fill('123456'); await hex.press('Enter');
  await page.getByRole('button', { name: 'Close custom colour picker', exact: true }).click();
  await page.keyboard.press('Escape'); await page.keyboard.press('Escape');
  await expect(image).toHaveAttribute('data-image-duotone-authored', 'true');
  const custom = await pixel(image), y = (original[0] * .2126 + original[1] * .7152 + original[2] * .0722) / 255;
  [18 + 237 * y, 52 + 203 * y, 86 + 169 * y].forEach((channel, index) => expect(Math.abs(custom[index] - channel)).toBeLessThanOrEqual(2));
  await trigger.click();
  // Simulate permission loss while the portal is open; a pointer outside would dismiss it first.
  await page.getByRole('checkbox', { name: 'Read-only example', exact: true }).evaluate((node: HTMLInputElement) => node.click());
  await expect(page.getByRole('dialog', { name: 'Duotone', exact: true })).toHaveCount(0);
  await expect(trigger).toBeDisabled();
  await expect(pane.getByRole('tab', { name: 'Content', exact: true })).toBeEnabled();
});

test('Image lightbox keeps the authored filter without thumbnail sizing', async ({ page }) => {
  const { trigger } = await openImage(page, 'library');
  await trigger.click(); await page.getByRole('button', { name: 'Duotone preset 1', exact: true }).click(); await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Image link settings', exact: true }).click();
  await page.getByRole('dialog', { name: 'Image link settings', exact: true }).getByLabel('Link destination').selectOption('lightbox');
  await page.keyboard.press('Escape'); await page.getByRole('button', { name: 'Preview', exact: true }).click();
  const opener = page.getByRole('button', { name: /^Enlarge image:/ }); await opener.click();
  const dialog = page.getByRole('dialog', { name: hosts.library.alt, exact: true });
  await expect(dialog).toBeVisible(); const enlarged = dialog.locator('img');
  await enlarged.evaluate(node => (node as HTMLImageElement).decode());
  for (const width of [1280, 390]) {
    await page.setViewportSize({ width, height: 844 });
    const bounds = (await enlarged.boundingBox())!; expect(bounds.width).toBeGreaterThan(100); expect(bounds.height).toBeGreaterThan(50);
    expect(bounds.width / bounds.height).toBeCloseTo(640 / 360, 2); expect(bounds.x).toBeGreaterThanOrEqual(0); expect(bounds.x + bounds.width).toBeLessThanOrEqual(width);
  }
  expectGray(await pixel(enlarged));
  expect(await enlarged.evaluate(node => (node as HTMLImageElement).style.width)).toBe('');
  await enlarged.screenshot({ path: '/private/tmp/acm-image-duotone-lightbox.png' });
  await page.keyboard.press('Escape'); await expect(dialog).not.toBeVisible(); await expect(opener).toBeFocused();
});

test('Image HTML round trips object, explicit None and inheritance with real DOM validation errors', async ({ page }) => {
  const { build } = await import('rolldown');
  const bundle = await build({ input: 'app/studio/studio-html-editor.ts', platform: 'browser', write: false, output: { format: 'iife', name: 'ImageHtml' }, plugins: [{ name: 'ignore-css', load(id) { if (id.endsWith('.css')) return ''; } }] });
  await page.setContent('<main>Image HTML</main>');
  await page.addScriptTag({ content: bundle.output.find(chunk => chunk.type === 'chunk')!.code });
  const output = await page.evaluate(() => {
    const api = (globalThis as unknown as { ImageHtml: {
      blockToHtml: (block: unknown) => string;
      parseHtmlToBlock: (html: string, original: unknown) => { block?: { duotone?: unknown; captionRuns?: unknown }; error?: string };
      parseHtmlToBlocks: (html: string, originals: unknown[]) => { blocks?: { duotone?: unknown }[]; error?: string };
    } }).ImageHtml;
    const base = { id: 'html-image', type: 'image', src: '/specimens/landscape.svg', alt: 'Landscape', caption: 'Rich caption', captionRuns: [{ text: 'Rich caption', marks: ['italic'] }] };
    const values = [{ dark: '#000080', light: '#FFCC00' }, null, undefined];
    const roundTrips = values.map(duotone => { const source = { ...base, duotone }; const html = api.blockToHtml(source); return { value: duotone, block: api.parseHtmlToBlock(html, base), document: api.parseHtmlToBlocks(html, [base]) }; });
    const invalid = ['{', JSON.stringify({ dark: 'url(/image)', light: '#ffffff' }), JSON.stringify({ dark: '#fff', light: '#ffffff' }), JSON.stringify({ dark: '#000000', light: '#ffffff', extra: true })].map(value => {
      const element = new DOMParser().parseFromString(api.blockToHtml(base), 'text/html').body.firstElementChild!; element.setAttribute('data-image-duotone', value);
      return [api.parseHtmlToBlock(element.outerHTML, base), api.parseHtmlToBlocks(element.outerHTML, [base])];
    });
    return { roundTrips, invalid, original: base };
  });
  for (const result of output.roundTrips) {
    expect(result.block.error).toBeUndefined(); expect(result.document.error).toBeUndefined();
    expect(result.block.block!.duotone).toEqual(result.value); expect(result.document.blocks![0].duotone).toEqual(result.value);
    expect(result.block.block!.captionRuns).toEqual(output.original.captionRuns);
  }
  for (const results of output.invalid) for (const result of results) expect(result.error).toMatch(/Image Duotone/);
});

test('Image website inheritance, authored colours and explicit None paint distinct pixels in Edit, Preview, public and exported HTML', async ({ page }) => {
  const { loadProductionModule } = await import('../production-module.mjs');
  const { createElement } = await import('react');
  const { renderToStaticMarkup } = await import('react-dom/server');
  const load = (name: string) => loadProductionModule(new URL(name, import.meta.url));
  const { BlockRenderer } = await load('../../app/components/content.tsx');
  const { BlockField } = await load('../../app/studio/studio-canvas.tsx');
  const { BlockPreviewRules } = await load('../../app/studio/site-editor/block-preview-rules.tsx');
  const { projectWebsiteDesignBlocks } = await load('../../app/studio/site-editor/website-design-surface.tsx');
  const { blocksToHtml } = await load('../../app/studio/studio-html-editor.ts');
  const css = readFileSync(new URL('../../app/globals.css', import.meta.url), 'utf8') + readFileSync(new URL('../../app/studio/studio.css', import.meta.url), 'utf8');
  const effect = { dark: '#000080', light: '#FFCC00' };
  const base = { type: 'image', src: '/specimens/landscape.svg', alt: 'Pixel reference', displayWidth: 160, displayHeight: 90, caption: 'Unaffected caption' };
  const blocks = [{ ...base, id: 'inherited' }, { ...base, id: 'own', duotone: effect }, { ...base, id: 'none', duotone: null }, { ...base, id: 'other', duotone: { dark: '#003333', light: '#B9F6CA' } }];
  const selection = { paletteId: 'default', typographyId: 'default', blockStyles: { image: { duotone: { dark: '#000000', light: '#FFFFFF' }, responsive: { mobile: { duotone: { dark: '#880000', light: '#0000FF' } } } } } };
  // Keep a same-origin document for fixture images without mounting the Studio
  // application, whose delayed hydration can replace this test's static DOM.
  const blank = (route: import('@playwright/test').Route) => route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>Image pixel fixture</title>' });
  await page.route('**/studio/ui/blocks/image', blank);
  await page.goto('/studio/ui/blocks/image');
  await page.unroute('**/studio/ui/blocks/image', blank);
  for (const width of [1000, 600, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    const projected = projectWebsiteDesignBlocks(blocks, selection);
    for (const mode of ['edit', 'preview', 'article', 'export']) {
      const content = mode === 'export' ? null : mode === 'edit' ? projected.map((block: ContentBlock) => createElement(BlockField, { key: block.id, block, rootBlocks: projected, writable: true, onChange() {} })) : createElement(BlockRenderer, { blocks: projected, variant: mode === 'article' ? 'article' : 'studio' });
      const view = createElement('section', { 'data-block-preview-scope': mode, className: 'studio-responsive-container', style: { containerType: 'inline-size', containerName: 'studio-document' } }, mode !== 'export' ? createElement(BlockPreviewRules, { selection, scopeId: mode, referenceDefaults: false }) : null, content);
      await page.setContent(`<style>${css}</style>${mode === 'export' ? blocksToHtml(blocks) : renderToStaticMarkup(view)}`);
      const images = page.locator('figure img');
      const original = await pixel(images.nth(2));
      const own = await pixel(images.nth(1));
      const other = await pixel(images.nth(3));
      expect(own).not.toEqual(original); expect(other).not.toEqual(own);
      const y = (original[0] * .2126 + original[1] * .7152 + original[2] * .0722) / 255;
      [255 * y, 204 * y, 128 * (1 - y)].forEach((channel, index) => expect(Math.abs(own[index] - channel)).toBeLessThanOrEqual(2));
      await expect(images.nth(2)).toHaveCSS('filter', 'none');
      if (mode !== 'export') {
        const inherited = await pixel(images.first());
        if (width > 480) expectGray(inherited); else expect(inherited).not.toEqual(own);
      }
      for (const caption of await page.locator('figcaption').all()) await expect(caption).toHaveCSS('filter', 'none');
      const ids = await page.locator('filter').evaluateAll(nodes => nodes.map(node => node.id)); expect(new Set(ids).size).toBe(ids.length);
      await page.screenshot({ path: `/private/tmp/acm-image-duotone-${mode}-${width}.png`, fullPage: true });
    }
  }
});

test('shared Duotone keeps pane-owned and canvas-trigger presentations with hover, keyboard and dismissal', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/studio/ui/controls/block-style-panels');
  const example = page.getByRole('group', { name: 'Block Styles panes example', exact: true });
  await expect(example).toHaveAttribute('data-ready', 'true'); await example.getByRole('button', { name: 'Image', exact: true }).click();
  const paneTrigger = example.getByRole('button', { name: 'Duotone', exact: true });
  const appearance = (control: Locator) => control.evaluate(node => { const css = getComputedStyle(node); return { colour: css.color, background: css.backgroundColor, radius: css.borderRadius }; });
  await page.mouse.move(0, 0); const before = await appearance(paneTrigger); await paneTrigger.hover(); const hovered = await appearance(paneTrigger);
  // The existing pane trigger retains its neutral colour and no-fill hover.
  expect(hovered).toEqual(before);
  await paneTrigger.focus(); await paneTrigger.press('Enter');
  const popup = page.getByRole('dialog', { name: 'Duotone', exact: true }); await expect(popup).toBeVisible();
  await expect(page.getByRole('button', { name: 'Clear Duotone', exact: true })).toBeDisabled();
  const owner = await paneTrigger.evaluate(node => node.closest('[data-inspector-popover-owner]')!.getBoundingClientRect().toJSON());
  const box = (await popup.boundingBox())!; expect(box.x).toBeGreaterThanOrEqual(0); expect(box.x + box.width).toBeLessThanOrEqual(1440); expect(box.x).toBeLessThanOrEqual(owner.x);
  if (owner.x >= box.width + 16) expect(box.x + box.width).toBeLessThanOrEqual(owner.x + 1);
  await page.keyboard.press('Escape'); await expect(paneTrigger).toBeFocused();
  await example.screenshot({ path: '/private/tmp/acm-image-duotone-pane-control.png' });
  const { toolbar, trigger } = await openImage(page, 'library');
  const link = toolbar.getByRole('button', { name: 'Image link settings', exact: true }); await link.hover(); const reference = await appearance(link); await trigger.hover(); expect(await appearance(trigger)).toEqual(reference);
  await trigger.focus(); await trigger.press('Enter'); await expect(popup).toBeVisible();
  const triggerBox = (await trigger.boundingBox())!, canvasBox = (await popup.boundingBox())!;
  expect(canvasBox.y).toBeGreaterThanOrEqual(triggerBox.y); expect(canvasBox.x).toBeGreaterThanOrEqual(0); expect(canvasBox.x + canvasBox.width).toBeLessThanOrEqual(1440);
  await page.keyboard.press('Escape'); await expect(trigger).toBeFocused();
});

test('mounted editable Table cells and Image and Embed captions resolve their managed inline images', async ({ page }) => {
  const { build } = await import('rolldown');
  const entry = `import React from 'react'; import {createRoot} from 'react-dom/client'; import {BlockField} from './app/studio/studio-canvas';
    const runs=[{text:'\\uFFFC',inline:{type:'image',mediaId:'managed',alt:'Managed inline',width:150}}];
    const blocks=[{id:'t',type:'table',rows:[['\\uFFFC']],cellRuns:[[runs]],caption:'\\uFFFC',captionRuns:runs},{id:'i',type:'image',src:'/specimens/landscape.svg',alt:'Body image',caption:'\\uFFFC',captionRuns:runs},{id:'e',type:'embed',url:'https://example.com',caption:'\\uFFFC',captionRuns:runs}];
    const mediaUrls={managed:'/specimens/landscape.svg'};
    createRoot(document.getElementById('mounted')).render(React.createElement(React.Fragment,null,...blocks.map(block=>React.createElement('section',{'data-owner':block.id,key:block.id},React.createElement(BlockField,{block,selectedBlockId:block.id,writable:true,mediaUrls,onChange(){},onTableCellFocus(){},onTextSelection(){},onLinkActivate(){}})))));`;
  const bundle = await build({ input: 'virtual-inline-images', platform: 'browser', write: false, output: { format: 'iife' }, plugins: [{ name: 'mounted-entry', resolveId(id) { if (id === 'virtual-inline-images') return path.resolve('image-inline-mounted.ts'); if (id === 'react' || id === 'react/jsx-runtime' || id === 'react-dom/client') return require.resolve(id); }, load(id) { if (id === path.resolve('image-inline-mounted.ts')) return entry; if (id.endsWith('?raw')) return `export default ${JSON.stringify(readFileSync(id.slice(0, -4), 'utf8'))}`; if (id.endsWith('.css')) return { code: '', moduleType: 'js' as const }; } }] });
  await page.goto('/studio/ui/blocks/image');
  await page.goto('about:blank');
  await page.setContent('<base href="http://localhost:3011/"><main id="mounted"></main>');
  await page.addScriptTag({ content: bundle.output.find(chunk => chunk.type === 'chunk')!.code });
  for (const [owner, count] of [['t', 2], ['i', 1], ['e', 1]] as const) {
    const images = page.locator(`[data-owner="${owner}"] .rich-text-editor img.inline-image-object`);
    await expect(images).toHaveCount(count);
    for (const image of await images.all()) { await expect(image).toHaveAttribute('src', '/specimens/landscape.svg'); await expect(image).toHaveAttribute('alt', 'Managed inline'); }
  }
});

test('inherited Image colours remain visible and one-channel edits preserve the other colour in inspector and toolbar', async ({ page }) => {
  const { build } = await import('rolldown');
  const entry = `import React,{useState} from 'react';import {createRoot} from 'react-dom/client';import {StudioEditor} from './app/studio/studio-editor';import {withTestSiteNavigation} from './app/studio/test-site/navigation';import {emptyTemplateStore} from './app/studio/template-model';import {BlockInspector} from './app/studio/blocks/inspectors/block-inspector';import {initialStudioWorkspace} from './app/studio/editor-model';import {effectiveWebsiteDesign} from './app/studio/site-editor/website-design';
  const design=effectiveWebsiteDesign({identity:{},styles:{paletteId:'default',typographyId:'default',blockStyles:{image:{duotone:{dark:'#003333',light:'#B9F6CA'}}}}},undefined);
  const noop=()=>{};function Example(){const [doc,setDoc]=useState({...initialStudioWorkspace.documents[0],blocks:[{id:'image',type:'image',src:'/specimens/landscape.svg',alt:'Inherited fixture',displayWidth:240,displayHeight:135}]});const [selected,select]=useState('image');const block=doc.blocks[0];const update=(_id,updater)=>setDoc(current=>({...current,blocks:[updater(current.blocks[0])]}));const site={version:15,siteId:'test',websiteDesign:design,templates:emptyTemplateStore(),siteNavigation:{setId:'absent'},documents:[doc],navigationMenus:[]};const presentation=withTestSiteNavigation({},site,noop,noop);const inspector=React.createElement('aside',{'data-inspector-popover-owner':'','aria-label':'Image settings',style:{width:300,flexShrink:0}},React.createElement(BlockInspector,{block,onChange:next=>update(block.id,()=>next),onOpenFiles:noop,canOpenFiles:false}));return React.createElement('div',{style:{display:'grid',gridTemplateColumns:'minmax(900px,1fr) 300px',alignItems:'start'}},React.createElement(StudioEditor,{writable:true,target:{kind:'site',id:doc.id,name:'Memory site',blocks:doc.blocks,inspector},canvas:{presentation,activeDocument:doc,writable:true,previewing:false,wordCount:0,characterCount:0,linkTargets:[],showCoverImage:false,mediaBlockUrls:{},selectedBlockId:selected,showInserter:false,inserterQuery:'',filteredBlocks:[],publishFeedback:'',onUpdateBlock:update,onSelectBlock:select,onClearBlockSelection:()=>select(null),onPreviewChange:noop,onOpenInserter:noop,onSetPublishFeedback:noop,onDocumentFieldChange:noop,onApplyDocumentCode:noop,onCodeEditorDirtyChange:noop,onFocusDocumentField:noop,onOpenCoverMediaLibrary:noop,onRemoveCoverImage:noop,onSetDragOverIndex:noop,onMoveBlockTo:noop,onRemoveBlock:noop,onInsertBlock:noop,onSetShowInserter:noop,onSetInserterQuery:noop}}));}createRoot(document.getElementById('mounted')).render(React.createElement(Example));`;
  const bundle = await build({ input: 'virtual-inherited-image', platform: 'browser', write: false, output: { format: 'iife' }, plugins: [{ name: 'inherited-entry', resolveId(id) { if (id === 'virtual-inherited-image') return path.resolve('image-inherited-mounted.ts'); if (id === 'react' || id === 'react/jsx-runtime' || id === 'react-dom/client') return require.resolve(id); }, load(id) { if (id === path.resolve('image-inherited-mounted.ts')) return entry; if (id.endsWith('?raw')) return `export default ${JSON.stringify(readFileSync(id.slice(0, -4), 'utf8'))}`; if (id.endsWith('.css')) return { code: '', moduleType: 'js' as const }; } }] });
  const base = new URL(process.env.STUDIO_BROWSER_URL || 'http://localhost:3011').origin;
  const css = readFileSync(new URL('../../app/globals.css', import.meta.url), 'utf8') + readFileSync(new URL('../../app/studio/studio.css', import.meta.url), 'utf8');
  await page.route('**/__image-duotone-fixture', route => route.fulfill({ contentType: 'text/html', body: `<style>${css}</style><main id="mounted"></main>` }));
  await page.goto(`${base}/__image-duotone-fixture`);
  await page.addScriptTag({ content: bundle.output.find(chunk => chunk.type === 'chunk')!.code });
  const image = page.getByRole('img', { name: 'Inherited fixture', exact: true }); await expect(image).toBeVisible();
  for (const owner of ['inspector', 'toolbar']) {
    let trigger: Locator;
    if (owner === 'inspector') {
      const pane = page.getByRole('complementary', { name: /settings/i });
      await pane.getByRole('tab', { name: 'Styles', exact: true }).click(); trigger = pane.getByRole('button', { name: 'Duotone', exact: true });
    } else trigger = page.getByRole('group', { name: 'Image block tools', exact: true }).getByRole('button', { name: 'Duotone', exact: true });
    await trigger.click();
    const popup = page.getByRole('dialog', { name: 'Duotone', exact: true });
    await expect(popup.getByRole('button', { name: 'Reset Duotone', exact: true })).toBeDisabled();
    await expect(popup.getByRole('button', { name: 'Choose Highlights', exact: true }).locator('.studio-colour-value-swatch')).toHaveCSS('background-image', /rgb\(185, 246, 202\)/);
    await popup.getByRole('button', { name: 'Choose Shadows', exact: true }).click(); await page.getByRole('button', { name: 'Custom shadows colour picker', exact: true }).click();
    const hex = page.getByRole('textbox', { name: 'Hex colour', exact: true }); await hex.fill('123456'); await hex.press('Enter');
    await page.getByRole('button', { name: 'Close custom colour picker', exact: true }).click(); await page.keyboard.press('Escape');
    await expect(image).toHaveAttribute('data-image-duotone-authored', 'true');
    const filter = await image.evaluate(node => { const id = getComputedStyle(node).filter.match(/#([^")]+)/)?.[1]; return id ? document.getElementById(id)?.querySelector('feFuncR')?.getAttribute('tableValues') : null; });
    expect(filter).toBe(`${18 / 255} ${185 / 255}`);
    await popup.getByRole('button', { name: 'Reset Duotone', exact: true }).click(); await expect(image).not.toHaveAttribute('data-image-duotone-authored', 'true');
    await popup.getByRole('button', { name: 'Choose Highlights', exact: true }).click(); await page.getByRole('button', { name: 'Custom highlights colour picker', exact: true }).click();
    const highlights = page.getByRole('textbox', { name: 'Hex colour', exact: true }); await highlights.fill('AABBCC'); await highlights.press('Enter');
    await page.getByRole('button', { name: 'Close custom colour picker', exact: true }).click(); await page.keyboard.press('Escape');
    const red = await image.evaluate(node => { const id=getComputedStyle(node).filter.match(/#([^")]+)/)?.[1]; return id ? document.getElementById(id)?.querySelector('feFuncR')?.getAttribute('tableValues') : null; });
    expect(red).toBe(`0 ${170 / 255}`);
    await popup.getByRole('button', { name: 'Reset Duotone', exact: true }).click();
    await popup.getByRole('button', { name: 'Clear Duotone', exact: true }).click(); await expect(image).toHaveCSS('filter', 'none');
    await expect(popup.getByRole('button', { name: 'Clear Duotone', exact: true })).toBeDisabled();
    await popup.getByRole('button', { name: 'Reset Duotone', exact: true }).click(); await expect(image).not.toHaveAttribute('data-image-duotone-authored', 'true');
    await page.keyboard.press('Escape'); await expect(trigger).toBeFocused();
  }
});
