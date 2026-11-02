import {expect,test} from '@playwright/test';

for(const scale of [.8,1.25])test(`preview resize grip follows the pointer at ${scale} layout scale`,async({page})=>{
  await page.setViewportSize({width:1440,height:1000});
  await page.goto('/studio/ui/blocks/paragraph');
  await expect(page.locator('.ui-block-specimen')).toHaveAttribute('data-ready','true');
  await page.evaluate(scale=>{document.body.style.zoom=String(scale);},scale);
  const handle=page.getByRole('separator',{name:'Resize preview',exact:true});
  await handle.scrollIntoViewIfNeeded();await handle.focus();await page.keyboard.press('End');
  const grip=await handle.boundingBox();const startX=grip!.x+grip!.width/2;const y=grip!.y+grip!.height/2;
  await page.mouse.move(startX,y);await page.mouse.down();
  for(const delta of [20,40,60,40,20]){
    await page.mouse.move(startX+delta,y);
    await expect.poll(async()=>{const b=await handle.boundingBox();return Math.abs(b!.x+b!.width/2-startX-delta);}).toBeLessThan(1);
  }
  await page.mouse.up();
});
