import { expect, test } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
import { isolatedNativeZoom, zoomMetrics } from './helpers/native-zoom';

test('canonical Files inserts directly at native 200% zoom',async({},testInfo)=>{
  const baseURL=String(testInfo.project.use.baseURL??'http://localhost:3010');
  const normal=await isolatedNativeZoom(1);let before:Awaited<ReturnType<typeof zoomMetrics>>;
  try{const page=normal.context.pages()[0];await page.goto(`${baseURL}/studio/ui/blocks/image`);before=await zoomMetrics(page);}finally{await normal.close();}
  const enlarged=await isolatedNativeZoom(2);
  try{
    const page=enlarged.context.pages()[0];await page.goto(`${baseURL}/studio/ui/blocks/image`);await expect(page.locator('.ui-block-specimen')).toHaveAttribute('data-ready','true');
    const after=await zoomMetrics(page);expect(after.pixelRatio/before!.pixelRatio).toBeCloseTo(2,1);expect(after.cssZoom).toBe('1');expect(after.visualScale).toBe(1);
    await page.getByRole('img',{name:'Illustrated green hill with a blue sky',exact:true}).click();
    const replace=page.getByRole('button',{name:'Replace image',exact:true});await replace.focus();await replace.press('Enter');
    const files=page.getByRole('dialog',{name:'Files',exact:true});await files.locator('.media-file-card').filter({hasText:'Mont Blanc.jpg'}).click();
    await expect(files.getByRole('textbox',{name:'Alternative text',exact:true})).toHaveValue('Snow-covered mountains');
    const insert=files.getByRole('button',{name:'Insert into Image',exact:true});await insert.focus();
    await page.bringToFront();await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))));
    const session=await enlarged.context.newCDPSession(page);const capture=await session.send('Page.captureScreenshot',{format:'png',fromSurface:true,captureBeyondViewport:false});await writeFile('/private/tmp/acm-image-picker-native200-files.png',Buffer.from(capture.data,'base64'));await session.detach();
    await insert.press('Enter');await expect(page.getByRole('dialog',{name:'Describe this image',exact:true})).toHaveCount(0);await expect(replace).toBeFocused();
    await expect(page.getByRole('img',{name:'Snow-covered mountains',exact:true})).toBeVisible();
  }finally{await enlarged.close();}
});
