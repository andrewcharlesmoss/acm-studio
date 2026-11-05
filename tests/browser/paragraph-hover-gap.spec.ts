import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
const globalTemplates = (JSON.parse(readFileSync(new URL('../../work/global-template-library.json', import.meta.url), 'utf8')) as { templates: import('../../app/studio/template-model').TemplateStore }).templates;
test('insertion gap never paints over an empty Paragraph prompt', async ({ page }) => {
 const doc={id:'hover-empty',kind:'page',title:'Hover empty paragraph',subtitle:'',slug:'hover-empty',excerpt:'',status:'draft',updatedAt:'2026-11-03T00:00:00Z',documentShellVersion:1,tags:[],seoTitle:'',seoDescription:'',blocks:[{id:'image',type:'image',src:'/specimens/landscape.svg',alt:'Landscape',displayWidth:160,displayHeight:90},...Array.from({length:11},(_,i)=>({id:`empty-${i}`,type:'paragraph',text:''}))]};
 await page.addInitScript(({value,templates})=>{localStorage.setItem('acm-studio-workspace-v2',JSON.stringify({version:57,activeDocumentId:value.id,documents:[value],categories:[],bin:[]}));const set=templates.sets.find((s)=>s.templates.some((t)=>t.kind==='page'));if (!set) throw new Error('No page template set in fixture');const template=set.templates.find((t)=>t.kind==='page');if (!template) throw new Error('No page template in fixture');localStorage.setItem('acm-studio-templates-v1',JSON.stringify({...templates,assignments:[{documentId:value.id,setId:set.id,templateId:template.id,kind:'page'}],bin:[]}));},{value:doc,templates:globalTemplates});
 await page.goto('/studio');
 const paragraph=page.locator('[data-studio-block-anchor-id="empty-0"] .paragraph-field');
 await expect(paragraph).toBeVisible();
 const box=(await paragraph.boundingBox())!;
 // Approach the prompt through the preceding real gap, reproducing the
 // pointer transition that previously painted a stale cue through the line.
 for (const x of [box.x + 40, box.x + 100]) {
  for (const dy of [1, 5, 10, 15, 20]) {
   await page.mouse.move(x, box.y - 10);
   await page.mouse.move(x, box.y + dy);
   await expect(page.locator('.canvas-insertion-cue')).toHaveCount(0);
  }
 }
 await page.screenshot({ path: '/tmp/studio-paragraph-hover-after.png' });
 // Logical gap buttons remain keyboard reachable and open the canonical chooser.
 const anchor = paragraph.locator('xpath=ancestor::div[contains(@class,"block-position")][1]').locator(':scope > .between-blocks');
 await anchor.focus();
 const cue = page.locator('.canvas-insertion-cue');
 await expect(cue).toBeVisible();
 await page.mouse.move(400, 200);
 const r = (await anchor.boundingBox())!;
 await page.mouse.move(r.x + 100, r.y + r.height / 2);

 await expect(cue).toBeVisible();
 const cueBox = (await cue.boundingBox())!;
 expect(cueBox.y + cueBox.height / 2 + 2).toBeLessThanOrEqual(box.y);
 const settled = await anchor.evaluate(async element => {
  const samples = [];
  for (let frame = 0; frame < 3; frame++) {
   await new Promise(resolve => requestAnimationFrame(resolve));
   const cue = document.querySelector('.canvas-insertion-cue');
   samples.push({ anchorTop: element.getBoundingClientRect().top, cueCount: document.querySelectorAll('.canvas-insertion-cue').length, cueTop: cue?.getBoundingClientRect().top });
  }
  return samples;
 });
 for (const sample of settled) {
  expect(sample.cueCount).toBe(1);
  expect(sample.anchorTop).toBe(r.y);
  expect(sample.cueTop).toBe(cueBox.y);
 }
 await page.screenshot({ path: '/tmp/studio-paragraph-gap-after.png' });
 await cue.click();
 await expect(page.getByRole('dialog')).toBeVisible();
});
