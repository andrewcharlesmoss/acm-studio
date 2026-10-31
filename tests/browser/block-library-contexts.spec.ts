import {expect,test} from '@playwright/test';

test('Block Library tabs preserve independent production histories and reset only their context',async({page})=>{
  await page.goto('/studio/ui/blocks/image');
  const editor=page.getByRole('tabpanel',{name:'Block editor',exact:true});
  const editorTab=page.getByRole('tab',{name:'Block editor',exact:true});
  const stylesTab=page.getByRole('tab',{name:'Site editor styles',exact:true});
  await expect(page.locator('.ui-block-specimen')).toHaveAttribute('data-ready','true');
  const lock=editor.getByRole('checkbox',{name:'Lock move and remove',exact:true});
  await lock.check();
  await expect(editor.getByRole('button',{name:'Undo specimen change',exact:true})).toBeEnabled();
  const canvas=page.locator('.ui-block-canvas');
  await canvas.evaluate(node=>node.setAttribute('data-persistent-canvas','true'));
  await editorTab.focus();await page.keyboard.press('ArrowRight');
  await expect(canvas).toHaveAttribute('data-persistent-canvas','true');
  await expect(stylesTab.locator('xpath=ancestor::aside')).toHaveClass(/pane/);
  await expect(page.locator('.ui-block-inspector .site-block-inline-specimen')).toHaveCount(0);
  await expect(stylesTab).toBeFocused();await expect(stylesTab).toHaveAttribute('aria-selected','true');
  const styles=page.getByRole('tabpanel',{name:'Site editor styles',exact:true});
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
  await styles.getByRole('button',{name:'Reset styles example',exact:true}).click();
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
  expect((await page.locator('.ui-library-website-preview').boundingBox())!.width).toBeGreaterThanOrEqual(783);
  const tabs=page.getByRole('tablist',{name:'Block context',exact:true});
  const geometry=await tabs.evaluate(node=>({left:node.getBoundingClientRect().left,right:node.getBoundingClientRect().right,width:window.innerWidth}));
  if(width===1440){const bounds=await page.locator('.ui-block-canvas').boundingBox();expect(geometry.left).toBeGreaterThan(bounds!.x+bounds!.width-1);}
  expect(geometry.left).toBeGreaterThanOrEqual(0);expect(geometry.right).toBeLessThanOrEqual(geometry.width+1);
  if(width===390){
    const canvas=page.locator('.ui-block-canvas');
    await expect(canvas).toHaveCSS('overflow-x','auto');
    await canvas.locator('.canvas-block-toolbar button').last().focus();
    await expect.poll(()=>canvas.evaluate(node=>node.scrollLeft)).toBeGreaterThan(0);
  }
  await page.screenshot({path:`/private/tmp/block-context-image-${width}.png`,fullPage:true});
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
  await expect(page.locator('.ui-block-inspector .site-block-inline-specimen')).toHaveCount(0);
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
  await editor.getByRole('checkbox',{name:'Lock move and remove',exact:true}).check();
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
  await expect(editor.getByRole('checkbox',{name:'Lock move and remove',exact:true})).toBeChecked();
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
  await expect(page.locator('.ui-block-inspector .site-block-inline-specimen')).toHaveCount(0);
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
