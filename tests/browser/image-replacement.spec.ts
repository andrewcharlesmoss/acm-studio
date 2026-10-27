import { expect, test, type Page, type Locator } from '@playwright/test';
import { createRequire } from 'node:module';
import path from 'node:path';
const require = createRequire(import.meta.url);
const { PNG } = require(path.join(path.dirname(require.resolve('playwright-core/package.json')), 'lib/utilsBundle.js'));
async function pixel(image: Locator) {
  const png=PNG.sync.read(await image.screenshot());const offset=(Math.floor(png.height*.15)*png.width+Math.floor(png.width*.5))*4;
  return [...png.data.subarray(offset,offset+3)] as number[];
}

const hosts = {
  library: { url: '/studio/ui/blocks/image', alt: 'Illustrated green hill with a blue sky' },
  content: { url: '/studio/ui/selection', alt: 'A local geometric image fixture' },
  template: { url: '/studio/ui/selection/template', alt: 'Template landscape example' },
};
async function choose(page: Page, name: string, alt: string) {
  const files = page.getByRole('dialog', {name:'Files', exact:true});
  await expect(files).toBeVisible();
  await files.locator('.media-file-card').filter({hasText:name}).click();
  await files.getByRole('button', {name:'Insert into Image',exact:true}).click();
  const description = page.getByRole('dialog',{name:'Describe this image',exact:true});
  await description.getByRole('textbox').fill(alt);
  await description.getByRole('button',{name:'Insert image',exact:true}).click();
  await expect(files).toHaveCount(0);
}
for (const [host, fixture] of Object.entries(hosts)) {
  test(`canonical Files replaces actual ${host} image, preserves styles and supports history`, async ({page}) => {
    const requests:string[]=[];
    page.on('request',request=>{if(request.url().includes('/__studio/'))requests.push(request.url());});
    await page.goto(fixture.url);
    if(host==='library')await expect(page.locator('.ui-block-specimen')).toHaveAttribute('data-ready','true');
    const image=page.getByRole('img',{name:fixture.alt,exact:true});await image.click();
    const tools=page.getByRole('group',{name:'Image block tools',exact:true});
    await tools.getByRole('button',{name:'Duotone',exact:true}).click();
    await page.getByRole('button',{name:'Duotone preset 1',exact:true}).click();await page.keyboard.press('Escape');
    const replace=tools.getByRole('button',{name:'Replace image',exact:true});await replace.click();
    await choose(page,'Mont Blanc.jpg','Chosen mountains');
    const replaced=page.getByRole('img',{name:'Chosen mountains',exact:true});
    await expect(replaced).toHaveAttribute('src',/^blob:/);await expect(replaced).toHaveAttribute('data-image-duotone-authored','true');
    await expect(replace).toBeFocused();
    await expect.poll(()=>replaced.evaluate(node=>(node as HTMLImageElement).naturalWidth)).toBe(500);
    const mountainPixel=await pixel(replaced);expect(Math.max(...mountainPixel)-Math.min(...mountainPixel)).toBeLessThanOrEqual(2);
    const caption=page.getByRole('textbox',{name:'Image caption',exact:true});await expect(caption).toHaveText('A mountain sample');
    await caption.fill('Retained rich caption');await caption.press('Meta+A');await page.getByRole('button',{name:'Bold selected text',exact:true}).click();
    await expect(caption.locator('strong,b')).toHaveText('Retained rich caption');
    const contentTab=page.getByRole('tab',{name:'Content',exact:true});if(await contentTab.count())await contentTab.click();
    const chooseButton=page.getByRole('button',{name:'Choose from files',exact:true});await expect(chooseButton).not.toHaveCSS('background-color','rgb(255, 255, 255)');await chooseButton.click();
    await choose(page,'Landscape.png','Chosen landscape');
    await expect(chooseButton).toBeFocused();await expect(caption.locator('strong,b')).toHaveText('Retained rich caption');
    await expect(page.getByRole('img',{name:'Chosen landscape',exact:true})).toHaveAttribute('data-image-duotone-authored','true');
    const landscapePixel=await pixel(page.getByRole('img',{name:'Chosen landscape',exact:true}));expect(landscapePixel).not.toEqual(mountainPixel);
    await replace.focus();await page.keyboard.press('Meta+z');await expect(page.getByRole('img',{name:'Chosen mountains',exact:true})).toBeVisible();
    await page.keyboard.press('Meta+Shift+z');await expect(page.getByRole('img',{name:'Chosen landscape',exact:true})).toBeVisible();
    await page.getByRole('button',{name:'Preview',exact:true}).click();await expect(page.getByRole('img',{name:'Chosen landscape',exact:true})).toHaveAttribute('data-image-duotone-authored','true');
    expect(await pixel(page.getByRole('img',{name:'Chosen landscape',exact:true}))).toEqual(landscapePixel);
    await page.screenshot({path:`/private/tmp/acm-image-picker-${host}-preview.png`,fullPage:true});
    expect(requests).toEqual([]);
  });
  test(`Files and description Escape restore ${host} opening controls`,async({page})=>{
    await page.goto(fixture.url);if(host==='library')await expect(page.locator('.ui-block-specimen')).toHaveAttribute('data-ready','true');
    await page.getByRole('img',{name:fixture.alt,exact:true}).click();
    const replace=page.getByRole('group',{name:'Image block tools',exact:true}).getByRole('button',{name:'Replace image',exact:true});await replace.click();
    const files=page.getByRole('dialog',{name:'Files',exact:true});await files.locator('.media-file-card').filter({hasText:'Landscape.png'}).click();
    const insert=files.getByRole('button',{name:'Insert into Image',exact:true});await insert.click();
    await page.keyboard.press('Escape');await expect(page.getByRole('dialog',{name:'Describe this image',exact:true})).toHaveCount(0);await expect(insert).toBeFocused();
    await page.keyboard.press('Escape');await expect(files).toHaveCount(0);await expect(replace).toBeFocused();
    await expect(page.getByRole('img',{name:fixture.alt,exact:true})).toBeVisible();
  });
}
test('Files remains contained and operable in a narrow Library viewport',async({page})=>{
  await page.setViewportSize({width:390,height:844});await page.goto(hosts.library.url);await expect(page.locator('.ui-block-specimen')).toHaveAttribute('data-ready','true');
  await page.getByRole('img',{name:hosts.library.alt,exact:true}).click();await page.getByRole('button',{name:'Replace image',exact:true}).click();
  const files=page.getByRole('dialog',{name:'Files',exact:true});const bounds=(await files.boundingBox())!;expect(bounds.x).toBeGreaterThanOrEqual(0);expect(bounds.x+bounds.width).toBeLessThanOrEqual(391);
  await choose(page,'Landscape.png','Narrow landscape');await expect(page.getByRole('img',{name:'Narrow landscape',exact:true})).toBeVisible();
});
