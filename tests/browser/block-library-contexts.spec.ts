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
