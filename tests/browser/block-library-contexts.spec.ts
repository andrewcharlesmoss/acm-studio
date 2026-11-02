import {expect,test} from '@playwright/test';

test('Block Library cards navigate across the full compact card',async({page})=>{
  await page.goto('/studio/ui/blocks');
  const card=page.locator('a.ui-catalogue-card').filter({hasText:'Ordinary prose with inline formatting'});
  await expect(card).toHaveAttribute('href','/studio/ui/blocks/paragraph');
  const bounds=(await card.boundingBox())!;
  expect(bounds.height).toBeLessThan(180);
  await page.mouse.click(bounds.x+bounds.width-8,bounds.y+bounds.height-8);
  await expect(page.locator('.ui-block-detail-page h1')).toHaveText('Paragraph');
  await page.goBack();
  await expect(page.getByRole('heading',{name:'Blocks',exact:true})).toBeVisible();
  await card.focus();
  await expect(card).toBeFocused();
  await card.press('Enter');
  await expect(page.locator('.ui-block-detail-page h1')).toHaveText('Paragraph');
});

test('Block Library tabs preserve independent production histories and reset only their context',async({page})=>{
  await page.goto('/studio/ui/blocks/image');
  const editor=page.getByRole('tabpanel',{name:'Block editor',exact:true});
  const editorTab=page.getByRole('tab',{name:'Block editor',exact:true});
  const stylesTab=page.getByRole('tab',{name:'Site editor styles',exact:true});
  await expect(page.locator('.ui-block-specimen')).toHaveAttribute('data-ready','true');
  const lock=page.getByRole('region',{name:'Editor state examples'}).getByRole('checkbox',{name:'Lock move and remove',exact:true});
  await lock.check();
  await expect(editor.getByRole('button',{name:'Undo specimen change',exact:true})).toBeEnabled();
  const canvas=page.locator('.ui-block-canvas');
  await canvas.evaluate(node=>node.setAttribute('data-persistent-canvas','true'));
  await editorTab.focus();await page.keyboard.press('ArrowRight');
  await expect(canvas).toHaveAttribute('data-persistent-canvas','true');
  await expect(stylesTab.locator('xpath=ancestor::aside')).toHaveClass(/pane/);
  await expect(page.locator('.ui-block-inspector .site-block-inline-specimen')).toHaveCount(1);
  await expect(stylesTab).toBeFocused();await expect(stylesTab).toHaveAttribute('aria-selected','true');
  const styles=page.getByRole('tabpanel',{name:'Site editor styles',exact:true});
  await styles.getByRole('button',{name:'Preview',exact:true}).click();
  await expect(canvas).toHaveAttribute('aria-label','Image preview specimen');
  await editorTab.click();
  await expect(editor.getByRole('button',{name:'Preview',exact:true})).toHaveAttribute('aria-pressed','true');
  await stylesTab.click();
  await styles.getByRole('button',{name:'Edit',exact:true}).click();
  await expect(canvas).toHaveAttribute('aria-label','Image editing specimen');
  await expect(page.locator('.ui-block-inspector .pane-body > [role=tabpanel]:not([hidden])')).toHaveCount(1);
  const margin=styles.getByRole('slider',{name:'Margin Vertical amount',exact:true});
  await margin.focus();await page.keyboard.press('End');await page.keyboard.press('ArrowLeft');await page.keyboard.press('ArrowLeft');
  await expect(margin).toHaveAttribute('aria-valuetext','Large');
  await expect.poll(async()=>canvas.locator('.site-block-style-image').first().evaluate(node=>parseFloat(getComputedStyle(node).marginTop))).toBeGreaterThan(0);
  await expect(styles.getByRole('button',{name:'Undo site style specimen change',exact:true})).toBeEnabled();
  await stylesTab.focus();await page.keyboard.press('Home');
  await expect(editorTab).toBeFocused();await expect(lock).toBeChecked();
  await editor.getByRole('button',{name:'Reset Example',exact:true}).click();await expect(lock).not.toBeChecked();
  await lock.check();
  await stylesTab.click();await expect(margin).toHaveAttribute('aria-valuetext','Large');
  await styles.getByRole('button',{name:'Undo site style specimen change',exact:true}).click();
  await expect(styles.getByRole('button',{name:'Redo site style specimen change',exact:true})).toBeEnabled();
  await styles.getByRole('button',{name:'Redo site style specimen change',exact:true}).click();
  await expect(margin).toHaveAttribute('aria-valuetext','Large');
  await styles.getByRole('button',{name:'Reset Example',exact:true}).click();
  await expect(styles.getByRole('button',{name:'Undo site style specimen change',exact:true})).toBeDisabled();
  await editorTab.click();await expect(lock).toBeChecked();
});

for(const [type,label] of [['search','Site editor styles'],['video','Block editor']])test(`${type} exposes only its supported context`,async({page})=>{
  await page.goto(`/studio/ui/blocks/${type}`);
  await expect(page.getByRole('navigation',{name:'Block Library',exact:true}).getByRole('button',{name:'Search',exact:true})).toBeVisible();
  await expect(page.getByRole('tablist',{name:'Block context',exact:true}).getByRole('tab')).toHaveCount(1);
  await expect(page.getByRole('tab',{name:label,exact:true})).toHaveAttribute('aria-selected','true');
  await expect(page.getByRole('tabpanel',{name:label,exact:true})).toBeVisible();
});

for(const width of [1440,820,390])test(`Image context tabs and style specimen fit at ${width}px`,async({page})=>{
  await page.setViewportSize({width,height:1000});await page.goto('/studio/ui/blocks/image');
  await expect(page.locator('.ui-block-specimen')).toHaveAttribute('data-ready','true');
  const stylesTab=page.getByRole('tab',{name:'Site editor styles',exact:true});
  await stylesTab.click();await expect(stylesTab).toHaveAttribute('aria-selected','true');
  await expect(page.locator('.ui-block-inspector .pane-body > [role=tabpanel]:not([hidden])')).toHaveCount(1);
  const handle=page.getByRole('separator',{name:'Resize preview',exact:true});
  await expect(handle).toBeVisible();
  const tabs=page.getByRole('tablist',{name:'Block context',exact:true});
  const geometry=await tabs.evaluate(node=>({left:node.getBoundingClientRect().left,right:node.getBoundingClientRect().right,width:window.innerWidth}));
  if(width===1440){const bounds=await page.locator('.ui-block-canvas').boundingBox();expect(geometry.left).toBeGreaterThan(bounds!.x+bounds!.width-1);}
  expect(geometry.left).toBeGreaterThanOrEqual(0);expect(geometry.right).toBeLessThanOrEqual(geometry.width+1);
  if(width===390){
    const canvas=page.locator('.ui-block-canvas');
    const lastAction=canvas.locator('.canvas-block-toolbar button').last();
    await lastAction.focus();
    await expect(lastAction).toBeFocused();
    const buttonBounds=await lastAction.boundingBox();
    const frameBounds=await canvas.locator('.studio-preview-frame-content').boundingBox();
    expect(buttonBounds!.x).toBeGreaterThanOrEqual(frameBounds!.x-1);
    expect(buttonBounds!.x+buttonBounds!.width).toBeLessThanOrEqual(frameBounds!.x+frameBounds!.width+1);
  }
  await page.screenshot({path:`/private/tmp/block-context-image-${width}.png`,fullPage:true});
});

test('Block Library preview width stays independent from the selected Styles viewport',async({page})=>{
  await page.setViewportSize({width:1440,height:1000});
  await page.goto('/studio/ui/blocks/paragraph');
  await expect(page.locator('.ui-block-specimen')).toHaveAttribute('data-ready','true');
  await page.getByRole('tab',{name:'Site editor styles',exact:true}).click();
  const styles=page.getByRole('tabpanel',{name:'Site editor styles',exact:true});
  const handle=page.getByRole('separator',{name:'Resize preview',exact:true});
  const initial=Number(await handle.getAttribute('aria-valuenow'));
  await page.getByRole('button',{name:'States',exact:true}).click();
  await page.getByRole('menuitemradio',{name:'Mobile',exact:true}).click();
  await expect(handle).toHaveAttribute('aria-valuenow',String(initial));
  await styles.getByRole('button',{name:'Use custom font size',exact:true}).click();
  await styles.getByRole('combobox',{name:'Custom font size unit',exact:true}).selectOption('px');
  await styles.getByRole('spinbutton',{name:'Custom font size',exact:true}).fill('30');
  await styles.getByRole('spinbutton',{name:'Custom font size',exact:true}).press('Enter');
  const paragraph=page.getByRole('textbox',{name:'Paragraph text',exact:true});
  await expect(paragraph).toHaveCSS('font-size','30px');
  await page.getByRole('button',{name:'States',exact:true}).click();
  await page.getByRole('menuitemradio',{name:'Default',exact:true}).click();
  await expect(paragraph).not.toHaveCSS('font-size','30px');
  await expect(handle).toHaveAttribute('aria-valuenow',String(initial));
  await page.getByRole('button',{name:'States',exact:true}).click();
  await page.getByRole('menuitemradio',{name:'Mobile',exact:true}).click();
  await expect(paragraph).toHaveCSS('font-size','30px');
  await handle.focus();await page.keyboard.press('ArrowRight');
  await expect.poll(async()=>Number(await handle.getAttribute('aria-valuenow'))).toBeLessThan(initial);
  await page.getByRole('button',{name:'States',exact:true}).click();
  await expect(page.getByRole('menuitemradio',{name:'Mobile',exact:true})).toHaveAttribute('aria-checked','true');
  await page.keyboard.press('Escape');
  const resized=await handle.getAttribute('aria-valuenow');
  await page.getByRole('tab',{name:'Block editor',exact:true}).click();
  await page.getByRole('button',{name:'Preview',exact:true}).click();
  await expect(handle).toHaveAttribute('aria-valuenow',resized!);
});

test('Paragraph Edit and Preview share the resize frame surface and position',async({page})=>{
  await page.setViewportSize({width:1440,height:1000});
  await page.goto('/studio/ui/blocks/paragraph');
  await expect(page.locator('.ui-block-specimen')).toHaveAttribute('data-ready','true');
  const frame=page.locator('.ui-block-canvas .studio-preview-frame-content');
  const editor=page.getByRole('textbox',{name:'Paragraph text',exact:true});
  const editorSurface=page.locator('.ui-library-canvas .block-canvas');
  await expect(editorSurface).toHaveCSS('box-shadow','none');
  await expect(editorSurface).toHaveCSS('background-color','rgba(0, 0, 0, 0)');
  const frameTop=(await frame.boundingBox())!.y;
  const editTop=(await editor.boundingBox())!.y-frameTop;
  await page.getByRole('tabpanel',{name:'Block editor',exact:true}).getByRole('button',{name:'Preview',exact:true}).click();
  const paragraph=page.locator('.document-preview .paragraph-field').first();
  await expect(paragraph).toBeVisible();
  expect(Math.abs((await paragraph.boundingBox())!.y-(await frame.boundingBox())!.y-editTop)).toBeLessThanOrEqual(2);
  await expect(page.locator('.ui-library-canvas .document-preview')).toHaveCSS('box-shadow','none');
});

for(const [alias,canonical,label] of [['divider','separator','Separator'],['reading-time','time-to-read','Time to Read'],['content','template-content','Content']])test(`legacy ${alias} detail redirects to ${canonical}`,async({page})=>{
  await page.goto(`/studio/ui/blocks/${alias}`);
  await expect(page).toHaveURL(new RegExp(`/studio/ui/blocks/${canonical}$`));
  await expect(page.locator('.ui-block-detail-page > h1')).toHaveText(label);
  const tabs=page.getByRole('tablist',{name:'Block context',exact:true});
  await expect(tabs.getByRole('tab',{name:'Block editor',exact:true})).toBeVisible();
  await expect(tabs.getByRole('tab',{name:'Site editor styles',exact:true})).toBeVisible();
});

test('website style variation paints the persistent large preview without an inspector thumbnail',async({page})=>{
  await page.goto('/studio/ui/blocks/image');
  await expect(page.locator('.ui-block-specimen')).toHaveAttribute('data-ready','true');
  const canvas=page.locator('.ui-block-canvas');
  await page.getByRole('tab',{name:'Site editor styles',exact:true}).click();
  const styles=page.getByRole('tabpanel',{name:'Site editor styles',exact:true});
  await styles.getByRole('button',{name:'Rounded',exact:true}).click();
  await expect(canvas.locator('.image-field img').first()).toHaveCSS('border-radius','9999px');
  await expect(page.locator('.ui-block-inspector .site-block-inline-specimen')).toHaveCount(1);
  await page.getByRole('tab',{name:'Block editor',exact:true}).click();
  await expect(canvas.locator('.image-field img').first()).toHaveCSS('border-radius','9999px');
});

test('Navigation website typography paints the same main canvas in Edit and Preview',async({page})=>{
  await page.goto('/studio/ui/blocks/navigation');
  await expect(page.locator('.ui-block-specimen')).toHaveAttribute('data-ready','true');
  const canvas=page.locator('.ui-block-canvas');
  await page.getByRole('tab',{name:'Site editor styles',exact:true}).click();
  const styles=page.getByRole('tabpanel',{name:'Site editor styles',exact:true});
  await styles.getByRole('button',{name:'Use custom font size',exact:true}).click();
  await styles.getByRole('combobox',{name:'Custom font size unit',exact:true}).selectOption('px');
  await styles.getByRole('spinbutton',{name:'Custom font size',exact:true}).fill('30');
  await styles.getByRole('spinbutton',{name:'Custom font size',exact:true}).press('Enter');
  await expect(canvas.getByRole('textbox',{name:'Navigation link text: About',exact:true})).toHaveCSS('font-size','30px');
  await page.getByRole('tab',{name:'Block editor',exact:true}).click();
  await page.getByRole('tabpanel',{name:'Block editor',exact:true}).getByRole('button',{name:'Preview',exact:true}).click();
  await expect(canvas.getByRole('link',{name:'About',exact:true}).first()).toBeVisible();
  await expect(canvas.getByRole('link',{name:'About',exact:true}).first()).toHaveCSS('font-size','30px');
});

test('keyboard Undo and Redo in the Styles inspector preserve independently populated content history',async({page})=>{
  await page.goto('/studio/ui/blocks/image');
  await expect(page.locator('.ui-block-specimen')).toHaveAttribute('data-ready','true');
  const editor=page.getByRole('tabpanel',{name:'Block editor',exact:true});
  const styles=page.getByRole('tabpanel',{name:'Site editor styles',exact:true});
  const lock=page.getByRole('region',{name:'Editor state examples'}).getByRole('checkbox',{name:'Lock move and remove',exact:true});
  await lock.check();
  await page.getByRole('tab',{name:'Site editor styles',exact:true}).click();
  const margin=styles.getByRole('slider',{name:'Margin Vertical amount',exact:true});
  await margin.focus();await page.keyboard.press('End');await page.keyboard.press('ArrowLeft');await page.keyboard.press('ArrowLeft');
  await expect(margin).toHaveAttribute('aria-valuetext','Large');
  const modifier=await page.evaluate(()=>/Mac|iPhone|iPad/.test(navigator.platform)?'Meta':'Control');
  await page.getByRole('tab',{name:'Site editor styles',exact:true}).focus();
  await page.keyboard.press(`${modifier}+z`);
  await expect(styles.getByRole('button',{name:'Redo site style specimen change',exact:true})).toBeEnabled();
  await page.keyboard.press(`${modifier}+Shift+z`);
  await expect(margin).toHaveAttribute('aria-valuetext','Large');
  await page.getByRole('tab',{name:'Block editor',exact:true}).click();
  await expect(lock).toBeChecked();
  await expect(editor.getByRole('button',{name:'Undo specimen change',exact:true})).toBeEnabled();
});

test('Search-only website controls paint a large main preview with no compact height limit',async({page})=>{
  await page.goto('/studio/ui/blocks/search');
  await expect(page.locator('.ui-library-styles-inspector')).toHaveAttribute('data-ready','true');
  const styles=page.getByRole('tabpanel',{name:'Site editor styles',exact:true});
  await styles.getByRole('button',{name:'Use custom font size',exact:true}).click();
  await styles.getByRole('combobox',{name:'Custom font size unit',exact:true}).selectOption('px');
  await styles.getByRole('spinbutton',{name:'Custom font size',exact:true}).fill('32');
  await styles.getByRole('spinbutton',{name:'Custom font size',exact:true}).press('Enter');
  const canvas=page.locator('.ui-block-canvas');
  await expect(canvas.locator('.site-block-style-search')).toHaveCSS('font-size','32px');
  const preview=canvas.locator('.site-block-inline-specimen');
  await expect(preview).toHaveCSS('max-height','none');
  expect((await preview.boundingBox())!.height).toBeGreaterThanOrEqual(360);
  expect((await preview.boundingBox())!.width).toBeGreaterThan((await canvas.boundingBox())!.width*0.85);
  await page.screenshot({path:'/private/tmp/library-search-large-preview.png',fullPage:true});
  await expect(page.locator('.ui-block-inspector .site-block-inline-specimen')).toHaveCount(1);
});

test('Navigation label typography preserves authored link and block values over website defaults',async({page})=>{
  const {loadProductionModule}=await import('../production-module.mjs');
  const {createElement}=await import('react');const {renderToStaticMarkup}=await import('react-dom/server');
  const {readFileSync}=await import('node:fs');
  const load=(name:string)=>loadProductionModule(new URL(name,import.meta.url));
  const {WebsiteDesignSurface}=await load('../../app/studio/site-editor/website-design-surface.tsx');
  const {effectiveWebsiteDesign}=await load('../../app/studio/site-editor/website-design.ts');
  const {TemplateNodes,TemplateSurface}=await load('../../app/studio/template-renderer.tsx');
  const {createTemplateSet}=await load('../../app/studio/template-model.ts');
  const {styleBookDocument}=await load('../../app/studio/site-editor/style-book-model.ts');
  const {responsiveBlockCss}=await load('../../app/content/responsive-styles.ts');
  const set=createTemplateSet('Typography');set.navigation=[{id:'inherited',label:'Inherited link',url:'#inherited'},{id:'authored',label:'Authored link',url:'#authored',visualStyle:{fontSizeCustom:'14px'}}];
  const design={...effectiveWebsiteDesign(undefined,undefined),styles:{paletteId:'default',typographyId:'default',blockStyles:{navigation:{fontSizeCustom:'30px'}}}};
  const cases: Array<[string,{fontSizeCustom:string}|undefined]>=[['website',undefined],['authored-root',{fontSizeCustom:'20px'}]];
  const examples=cases.map(([id,visualStyle])=>createElement('section',{id,key:id},createElement(WebsiteDesignSurface,{design},createElement(TemplateSurface,{set},createElement(TemplateNodes,{set,document:styleBookDocument,nodes:[{id:`navigation-${id}`,type:'element',element:'navigation',overlayMenu:'never',visualStyle}]})))));
  await page.setContent(`<style>${readFileSync(new URL('../../app/globals.css',import.meta.url),'utf8')}${readFileSync(new URL('../../app/studio/templates.css',import.meta.url),'utf8')}${responsiveBlockCss}</style>${renderToStaticMarkup(createElement('div',null,examples))}`);
  await expect(page.locator('#website').getByRole('link',{name:'Inherited link',exact:true}).first()).toHaveCSS('font-size','30px');
  await expect(page.locator('#authored-root').getByRole('link',{name:'Inherited link',exact:true}).first()).toHaveCSS('font-size','20px');
  for(const id of ['website','authored-root'])await expect(page.locator(`#${id}`).getByRole('link',{name:'Authored link',exact:true}).first()).toHaveCSS('font-size','14px');
});

test('converting a Page List does not freeze inherited website typography into Navigation',async({page})=>{
  await page.goto('/studio/ui/blocks/navigation');
  await expect(page.locator('.ui-block-specimen')).toHaveAttribute('data-ready','true');
  const canvas=page.locator('.ui-block-canvas');
  const label=canvas.getByRole('textbox',{name:'Navigation link text: About',exact:true}).first();
  const baseline=await label.evaluate(node=>getComputedStyle(node).fontSize);
  await page.getByRole('tab',{name:'Site editor styles',exact:true}).click();
  const styles=page.getByRole('tabpanel',{name:'Site editor styles',exact:true});
  await styles.getByRole('button',{name:'Use custom font size',exact:true}).click();
  await styles.getByRole('combobox',{name:'Custom font size unit',exact:true}).selectOption('px');
  await styles.getByRole('spinbutton',{name:'Custom font size',exact:true}).fill('30');
  await styles.getByRole('spinbutton',{name:'Custom font size',exact:true}).press('Enter');
  await expect(label).toHaveCSS('font-size','30px');
  await canvas.getByRole('button',{name:'Add Page List',exact:true}).click();
  await canvas.getByRole('button',{name:'Edit Page List',exact:true}).first().click();
  await expect(canvas.getByRole('textbox',{name:'Navigation link text: About',exact:true})).toHaveCount(2);
  await styles.getByRole('button',{name:'Reset Example',exact:true}).click();
  await expect(label).toHaveCSS('font-size',baseline);
});

test('Block colour shows inherited site colour without creating an override',async({page})=>{
  await page.setViewportSize({width:2200,height:1000});
  await page.goto('/studio/ui/blocks/paragraph');
  await expect(page.locator('.ui-block-specimen')).toHaveAttribute('data-ready','true');
  const blockPane=page.locator('.ui-library-comparison-pane').first();
  const stylesPane=page.locator('.ui-library-styles-pane');
  const blockColour=blockPane.locator('.inspector-colour-row').first();
  await expect(blockColour.locator('.studio-inherited-indicator')).toBeVisible();
  await page.getByRole('textbox',{name:'Paragraph text',exact:true}).fill('Plain sample');
  await stylesPane.getByRole('button',{name:'Choose Colour',exact:true}).click();
  let palette=page.getByRole('dialog',{name:'Colour palette',exact:true});
  await palette.locator('.paragraph-colour-swatch').nth(3).click();
  await page.keyboard.press('Escape');
  const paragraph=page.getByRole('textbox',{name:'Paragraph text',exact:true});
  const effectiveColour=await paragraph.evaluate(node=>getComputedStyle(node).color);
  const appender=page.locator(".ui-block-canvas .canvas-appender input");
  await expect(appender).toHaveCSS("color",effectiveColour);
  expect(await appender.evaluate(node=>getComputedStyle(node,"::placeholder").color)).toBe(effectiveColour);
  await appender.fill("Draft paragraph");
  await expect(appender).toHaveCSS("color",effectiveColour);
  await appender.fill("");
  await expect.poll(()=>blockColour.locator('.studio-colour-value-swatch').evaluate(node=>getComputedStyle(node).backgroundImage)).toContain(effectiveColour);
  await expect(blockColour).toHaveAttribute('aria-label',new RegExp(`Inherited colour ${effectiveColour.replace(/[()]/g, '\\$&')}`));
  await expect(blockColour).toHaveAttribute('aria-label',/Colour warning/);
  const inheritedMark=blockColour.locator('.studio-inherited-indicator');
  const warningMark=blockColour.locator('.paragraph-palette-warning-icon');
  await expect(inheritedMark).toBeVisible();
  await expect(warningMark).toBeVisible();
  const inheritedBox=(await inheritedMark.boundingBox())!;
  const warningBox=(await warningMark.boundingBox())!;
  expect(warningBox.x - (inheritedBox.x + inheritedBox.width)).toBeGreaterThanOrEqual(0);
  expect(warningBox.x - (inheritedBox.x + inheritedBox.width)).toBeLessThanOrEqual(8);
  await expect(blockPane.locator('.inspector-block-contrast-warning')).toHaveCount(0);
  await blockColour.click();
  palette=page.getByRole('dialog',{name:'Colour palette',exact:true});
  const textWarning=palette.locator('.paragraph-colour-contrast-warning');
  await expect(textWarning).toBeVisible();
  await expect(textWarning).toHaveText('This color has poor contrast against the background. Consider increasing contrast.');
  await expect(palette).toHaveAttribute('aria-describedby',await textWarning.getAttribute('id') as string);
  await page.keyboard.press('Escape');
  const backgroundWarning=blockPane.getByRole('button',{name:'Colour warning',exact:true});
  await backgroundWarning.focus();
  await page.keyboard.press('Enter');
  const backgroundPalette=page.getByRole('dialog',{name:'Background colour palette',exact:true});
  await expect(backgroundPalette.locator('.paragraph-colour-contrast-warning')).toHaveText('This color has poor contrast against the background. Consider increasing contrast.');
  await expect(blockPane.locator('.paragraph-background-contrast-help')).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(backgroundWarning).toBeFocused();
  await backgroundWarning.press('Enter');
  await backgroundPalette.locator('.paragraph-colour-swatch').nth(3).click();
  await expect(backgroundWarning).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(blockPane.locator('.paragraph-background-option')).toBeFocused();
  await blockPane.getByRole('button',{name:'Reset background colour',exact:true}).click();
  await blockColour.click();
  palette=page.getByRole('dialog',{name:'Colour palette',exact:true});
  await expect(palette.getByText('No colour selected',{exact:true})).toBeVisible();
  await palette.locator('.paragraph-colour-swatch').nth(1).click();
  await page.keyboard.press('Escape');
  await expect(blockColour.locator('.studio-inherited-indicator')).toHaveCount(0);
  await expect(appender).toHaveCSS('color',effectiveColour);
  expect(await appender.evaluate(node=>getComputedStyle(node,'::placeholder').color)).toBe(effectiveColour);
  await blockColour.click();
  await page.getByRole('dialog',{name:'Colour palette',exact:true}).getByRole('button',{name:'Clear',exact:true}).click();
  await page.keyboard.press('Escape');
  await expect(blockColour.locator('.studio-inherited-indicator')).toBeVisible();
  await blockPane.getByRole('button',{name:'Preview',exact:true}).click();
  const preview=page.locator('.document-preview .paragraph-field').first();
  await expect(preview).toHaveCSS('color',effectiveColour);
  await expect(blockColour.locator('.studio-inherited-indicator')).toBeVisible();
  await expect.poll(()=>blockColour.locator('.studio-colour-value-swatch').evaluate(node=>getComputedStyle(node).backgroundImage)).toContain(effectiveColour);
  await page.setViewportSize({width:390,height:1000});
  const narrowColour=page.locator('.ui-block-inspector .inspector-colour-row').first();
  const narrowInherited=narrowColour.locator('.studio-inherited-indicator');
  const narrowWarning=narrowColour.locator('.paragraph-palette-warning-icon');
  await expect(narrowInherited).toBeVisible();
  await expect(narrowWarning).toBeVisible();
  const narrowInheritedBox=(await narrowInherited.boundingBox())!;
  const narrowWarningBox=(await narrowWarning.boundingBox())!;
  expect(narrowWarningBox.x - (narrowInheritedBox.x + narrowInheritedBox.width)).toBeGreaterThanOrEqual(0);
  expect(narrowWarningBox.x - (narrowInheritedBox.x + narrowInheritedBox.width)).toBeLessThanOrEqual(8);
  const narrowRowBox=(await narrowColour.boundingBox())!;
  expect(narrowInheritedBox.x).toBeGreaterThanOrEqual(narrowRowBox.x);
  expect(narrowWarningBox.x + narrowWarningBox.width).toBeLessThanOrEqual(narrowRowBox.x + narrowRowBox.width);
});


test('appender follows responsive Paragraph text colour',async({page})=>{
  await page.setViewportSize({width:1440,height:1000});
  await page.goto('/studio/ui/blocks/paragraph');
  await expect(page.locator('.ui-block-specimen')).toHaveAttribute('data-ready','true');
  await page.getByRole('tab',{name:'Site editor styles',exact:true}).click();
  await page.getByRole('button',{name:'States',exact:true}).click();
  await page.getByRole('menuitemradio',{name:'Mobile',exact:true}).click();
  const styles=page.getByRole('tabpanel',{name:'Site editor styles',exact:true});
  await styles.getByRole('button',{name:'Choose Colour',exact:true}).click();
  await page.getByRole('dialog',{name:'Colour palette',exact:true}).locator('.paragraph-colour-swatch').nth(3).click();
  await page.keyboard.press('Escape');
  const handle=page.getByRole('separator',{name:'Resize preview',exact:true});
  await handle.focus();
  await page.keyboard.press('Home');
  await page.getByRole('tab',{name:'Block editor',exact:true}).click();
  const paragraph=page.getByRole('textbox',{name:'Paragraph text',exact:true});
  const appender=page.locator('.ui-block-canvas .canvas-appender input');
  await expect.poll(()=>paragraph.evaluate(node=>getComputedStyle(node).color)).toBe('rgb(246, 207, 244)');
  await expect(appender).toHaveCSS('color','rgb(246, 207, 244)');
  expect(await appender.evaluate(node=>getComputedStyle(node,'::placeholder').color)).toBe('rgb(246, 207, 244)');
});

test('Link colour warning over a gradient uses the WordPress message',async({page})=>{
  await page.setViewportSize({width:1440,height:1000});
  await page.goto('/studio/ui/blocks/paragraph');
  await expect(page.locator('.ui-block-specimen')).toHaveAttribute('data-ready','true');
  const pane=page.locator('.ui-block-inspector');
  await pane.getByRole('button',{name:'Gradient',exact:true}).click();
  const gradient=page.getByRole('dialog',{name:'Background gradient',exact:true});
  await gradient.getByRole('spinbutton',{name:'Gradient angle',exact:true}).fill('45');
  await page.keyboard.press('Escape');
  await pane.getByRole('button',{name:'Elements options',exact:true}).click();
  await page.getByRole('group',{name:'Elements controls',exact:true}).getByRole('button',{name:'Link',exact:true}).click();
  await page.keyboard.press('Escape');
  await pane.getByRole('button',{name:'Choose Link',exact:true}).click();
  const palette=page.getByRole('dialog',{name:'Link colour palette',exact:true});
  await palette.locator('.paragraph-colour-swatch').first().click();
  await expect(palette.locator('.paragraph-colour-contrast-warning')).toHaveText('This color has poor contrast against the background. Consider increasing contrast.');
});

test('Background warning returns focus to Colour when an Image action precedes it',async({page})=>{
  await page.setViewportSize({width:1440,height:1000});
  await page.goto('/studio/ui/blocks/code');
  await expect(page.locator('.ui-block-specimen')).toHaveAttribute('data-ready','true');
  const inspector=page.getByRole('tabpanel',{name:'Block editor',exact:true});
  const image=inspector.getByRole('button',{name:'Choose background image',exact:true});
  await expect(image).toBeVisible();
  await inspector.locator('.inspector-colour-row').first().click();
  const textPalette=page.getByRole('dialog',{name:'Colour palette',exact:true});
  await textPalette.locator('.paragraph-colour-swatch').first().click();
  await page.keyboard.press('Escape');
  const warning=inspector.getByRole('button',{name:'Colour warning',exact:true});
  await expect(warning).toBeVisible();
  await warning.focus();
  await page.keyboard.press('Enter');
  const backgroundPalette=page.getByRole('dialog',{name:'Background colour palette',exact:true});
  await expect(backgroundPalette).toBeVisible();
  // Reproduce the trigger disappearing after its warning is resolved.
  await warning.evaluate(node=>node.remove());
  await expect(warning).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(inspector.locator('.paragraph-background-option:not(.group-background-image)')).toBeFocused();
});

test('Colour Picker library demonstrates inherited and warning indicators together',async({page})=>{
  await page.goto('/studio/ui/controls/colour-picker');
  const row=page.locator('.inspector-colour-row').filter({hasText:'Inherited text colour'});
  await expect(row.locator('.studio-inherited-indicator')).toBeVisible();
  await expect(row.locator('.paragraph-palette-warning-icon')).toBeVisible();
  await row.click();
  const palette=page.getByRole('dialog',{name:'Inherited text colour palette'});
  await expect(palette.locator('.paragraph-colour-contrast-warning')).toBeVisible();
  await palette.getByRole('button',{name:'Raised surface, #FFFFFF'}).click();
  await expect(palette.locator('.paragraph-colour-contrast-warning')).toBeVisible();
  await palette.getByRole('button',{name:'Text, #1C1C1E'}).click();
  await expect(palette.locator('.paragraph-colour-contrast-warning')).toHaveCount(0);
  await palette.getByRole('button',{name:'Clear',exact:true}).click();
  await expect(palette.locator('.paragraph-colour-contrast-warning')).toBeVisible();
});

test('Block card history keeps Controls draft while restoring the library tab',async({page})=>{
  await page.goto('/studio/ui/controls');
  await page.waitForLoadState('networkidle');
  await page.getByRole('textbox',{name:'Text input example',exact:true}).fill('Keep this draft');
  await page.getByRole('tab',{name:'Blocks',exact:true}).click();
  const card=page.locator('a.ui-catalogue-card').filter({hasText:'Ordinary prose with inline formatting'});
  await card.click();
  await expect(page).toHaveURL('/studio/ui/blocks/paragraph');
  await page.goBack();
  await expect(page).toHaveURL('/studio/ui/blocks');
  await expect(page.getByRole('tab',{name:'Blocks',exact:true})).toHaveAttribute('aria-selected','true');
  await page.goBack();
  await expect(page).toHaveURL('/studio/ui/controls');
  await expect(page.getByRole('tab',{name:'Controls',exact:true})).toHaveAttribute('aria-selected','true');
  await expect(page.getByRole('textbox',{name:'Text input example',exact:true})).toHaveValue('Keep this draft');
  await page.goForward();
  await expect(page).toHaveURL('/studio/ui/blocks');
  await page.goForward();
  await expect(page).toHaveURL('/studio/ui/blocks/paragraph');
  await expect(page.locator('.ui-block-detail-page h1')).toHaveText('Paragraph');
});


test('returning to a direct block detail restores its original route',async({page})=>{
  await page.goto('/studio/ui/blocks/paragraph');
  await page.getByRole('tab',{name:'Controls',exact:true}).click();
  await page.getByRole('tab',{name:'Blocks',exact:true}).click();
  await expect(page).toHaveURL('/studio/ui/blocks/paragraph');
  await expect(page.locator('.ui-block-detail-page h1')).toHaveText('Paragraph');
});

test('returning to a query-specific Icons entry preserves its collection',async({page})=>{
  await page.goto('/studio/ui/icons?collection=keyboard');
  await page.getByRole('tab',{name:'Controls',exact:true}).click();
  await page.getByRole('tab',{name:'Icons',exact:true}).click();
  await expect(page).toHaveURL('/studio/ui/icons?collection=keyboard');
  await expect(page.getByRole('region',{name:'UK Keyboard Collection',exact:true})).toBeVisible();
});
