import { expect, test } from '@playwright/test';
import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { createStudioHttpFixture } from '../helpers/studio-http-fixture.mjs';

test('actual Studio Drafts Files uploads, replaces and restores remounted openers',async({browser},testInfo)=>{
  test.setTimeout(90000);
  const fixture=await createStudioHttpFixture({frontendURL:String(testInfo.project.use.baseURL??'http://localhost:3011')});
  const context=await browser.newContext({viewport:{width:1440,height:1000}});
  const page=await context.newPage();page.setDefaultTimeout(10000);
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
  try {
    await page.goto(`${fixture.origin}/studio`);
    const canvas=page.locator('.block-editor');await expect(canvas).toBeVisible();await expect(canvas).not.toHaveAttribute('data-readonly','true');
    await page.evaluate(() => {
      const addHiddenDecoy = () => {
        const pane=document.querySelector('.studio-inspector');
        if(!pane||pane.querySelector('[data-hidden-choose-decoy]'))return;
        const outer=document.createElement('div');outer.hidden=true;outer.dataset.hiddenChooseDecoy='true';
        const nestedPanel=document.createElement('div');nestedPanel.setAttribute('role','tabpanel');
        const button=document.createElement('button');button.className='choose-media-button';button.textContent='Nested hidden chooser';nestedPanel.append(button);outer.append(nestedPanel);pane.prepend(outer);
      };
      new MutationObserver(addHiddenDecoy).observe(document.body,{childList:true,subtree:true});addHiddenDecoy();
    });
    await page.getByRole('group',{name:'Editor tools',exact:true}).getByRole('button',{name:'Add block',exact:true}).click();
    await page.getByRole('searchbox',{name:'Search blocks',exact:true}).fill('Image');
    await page.getByRole('complementary',{name:'Block Library',exact:true}).getByRole('button',{name:'Image',exact:true}).click();
    await page.locator('.studio-inspector').getByRole('button',{name:'Choose from files',exact:true}).click();
    await expect(page.getByRole('button',{name:'Upload files',exact:true}).first()).toBeEnabled();
    await page.locator('.media-manager input[type=file]').setInputFiles([path.resolve('public/specimens/landscape.png'),path.resolve('public/specimens/mont-blanc.jpg')]);
    const landscape=page.locator('.media-file-card').filter({hasText:'landscape.png'});await landscape.click();
    await page.getByRole('button',{name:/^Insert into /}).click();
    const description=page.getByRole('dialog',{name:'Describe this image',exact:true});await description.getByRole('textbox').fill('Production landscape');await description.getByRole('button',{name:'Insert image',exact:true}).click();
    const image=page.getByRole('img',{name:'Production landscape',exact:true});await expect(image).toBeVisible();await image.click();
    const tools=page.getByRole('group',{name:'Image block tools',exact:true});const replace=tools.getByRole('button',{name:'Replace image',exact:true});await replace.click();
    await page.locator('.media-file-card').filter({hasText:'mont-blanc.jpg'}).click();await page.getByRole('button',{name:/^Insert into /}).click();
    await description.getByRole('textbox').fill('Production mountains');await page.screenshot({path:'/private/tmp/acm-image-production-description-success.png'});await description.getByRole('button',{name:'Insert image',exact:true}).click();
    const replaced=page.getByRole('img',{name:'Production mountains',exact:true});await expect(replaced).toBeVisible();await expect(replace).toBeFocused();
    await expect.poll(()=>replaced.evaluate(node=>(node as HTMLImageElement).naturalWidth)).toBe(500);
    await replace.click();await page.getByRole('button',{name:'Back to Content',exact:true}).click();await expect(replace).toBeFocused();await expect(replaced).toBeVisible();
    const pane=page.locator('.studio-inspector');const contentTab=pane.getByRole('tab',{name:'Content',exact:true});if(await contentTab.count())await contentTab.click();
    const choose=pane.getByRole('button',{name:'Choose from files',exact:true});await choose.click();
    await landscape.click();await page.getByRole('button',{name:/^Insert into /}).click();await description.getByRole('textbox').fill('Production restored landscape');await description.getByRole('button',{name:'Insert image',exact:true}).click();
    await expect(choose).toBeFocused();await expect(page.getByRole('img',{name:'Production restored landscape',exact:true})).toBeVisible();await page.screenshot({path:'/private/tmp/acm-image-production-focused-choose-success.png',fullPage:true});
    await replace.focus();await page.keyboard.press('Meta+z');await expect(replaced).toBeVisible();await page.keyboard.press('Meta+Shift+z');await expect(page.getByRole('img',{name:'Production restored landscape',exact:true})).toBeVisible();
    expect(new URL(page.url()).origin).toBe(fixture.origin);expect(errors).toEqual([]);
    const sources=await Promise.all(Object.values(fixture.fixtureRoots).map(directory=>readFile(path.join(directory,'content/site.json'),'utf8')));expect(sources).toEqual(fixture.initialSources);
    await page.screenshot({path:'/private/tmp/acm-image-production-files.png',fullPage:true});
  } finally {await context.close();await fixture.close();}
});

test('generic Files navigation captures an insertion owner and preview remains read-only',async({browser},testInfo)=>{
  test.setTimeout(60000);
  const fixture=await createStudioHttpFixture({frontendURL:String(testInfo.project.use.baseURL??'http://localhost:3011')});
  const context=await browser.newContext({viewport:{width:1440,height:1000}});const page=await context.newPage();page.setDefaultTimeout(10000);
  try {
    await page.goto(`${fixture.origin}/studio`);await expect(page.locator('.block-editor')).not.toHaveAttribute('data-readonly','true');
    await page.getByRole('button',{name:'Files Browse images and files',exact:true}).click();
    await page.locator('.media-manager input[type=file]').setInputFiles(path.resolve('public/specimens/landscape.png'));
    await page.locator('.media-file-card').filter({hasText:'landscape.png'}).click();
    await page.getByRole('button',{name:'Insert into Media library',exact:true}).click();
    const description=page.getByRole('dialog',{name:'Describe this image',exact:true});await description.getByRole('textbox').fill('Generic Files landscape');await description.getByRole('button',{name:'Insert image',exact:true}).click();
    const image=page.getByRole('img',{name:'Generic Files landscape',exact:true});await expect(image).toBeVisible();await expect.poll(()=>image.evaluate(node=>(node as HTMLImageElement).naturalWidth)).toBe(640);
    await image.click();await page.getByRole('button',{name:'Replace image',exact:true}).focus();await page.keyboard.press('Meta+z');await expect(image).toHaveCount(0);await page.keyboard.press('Meta+Shift+z');await expect(image).toBeVisible();
    await page.getByRole('button',{name:'Save Draft',exact:true}).click();await expect(page.locator('.studio-save-status')).toContainText('Saved locally');
    const documentId=await page.locator('.block-editor').getAttribute('data-studio-document-id');
    const preview=await context.newPage();await preview.goto(`${fixture.origin}/studio?preview=1&documentId=${encodeURIComponent(documentId!)}`);await expect(preview.locator('.block-editor')).toHaveAttribute('data-readonly','true');
    await expect(preview.getByRole('button',{name:'Replace image',exact:true})).toHaveCount(0);await expect(preview.getByRole('button',{name:'Files Browse images and files',exact:true})).toHaveCount(0);
    expect(new URL(page.url()).origin).toBe(fixture.origin);expect(new URL(preview.url()).origin).toBe(fixture.origin);
    await page.screenshot({path:'/private/tmp/acm-image-production-generic-files-success.png',fullPage:true});
  }finally{await context.close();await fixture.close();}
});
