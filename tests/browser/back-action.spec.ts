import { expect, test } from '@playwright/test';
test('shared back actions preserve native keyboard semantics, compact layout and reset',async({page})=>{
 await page.goto('/studio/ui/controls#back-action');
 const example=page.locator('#back-action');
 const button=example.getByRole('button',{name:'Back to example overview',exact:true});
 await example.getByRole('button',{name:'Open Example Detail'}).click();
 await expect(example.getByRole('status')).toHaveText('Example detail opened.');
 await button.focus();await page.keyboard.press('Enter');
 await expect(example.getByRole('status')).toHaveText('Button returned to the example overview.');
 await example.getByRole('button',{name:'Open Example Detail'}).click();
 await button.focus();await page.keyboard.press('Space');
 await expect(example.getByRole('status')).toHaveText('Button returned to the example overview.');
 const link=example.getByRole('link',{name:'Back using an example link'});
 await link.focus();await page.keyboard.press('Enter');await expect(example.getByRole('status')).toHaveText('Link returned to the example overview.');
 await expect(example.getByRole('button',{name:'Unavailable back action'})).toBeDisabled();
 const box=(await button.boundingBox())!;expect(box.width).toBe(32);expect(box.height).toBe(32);
 await button.hover();await expect(button).toHaveCSS('background-color','rgba(0, 0, 0, 0)');
 const live=example.locator('.ui-control-live');expect((await live.boundingBox())!.width).toBeLessThanOrEqual(220);
 for(const control of await live.locator('button,a').all()){const bounds=(await control.boundingBox())!,parent=(await live.boundingBox())!;expect(bounds.x+bounds.width).toBeLessThanOrEqual(parent.x+parent.width+1);}
 await example.getByRole('button',{name:'Reset example',exact:true}).click();await expect(example.getByRole('status')).toHaveText('No back action used.');
 await page.screenshot({path:'/private/tmp/design-back-library.png',fullPage:false});
});
test('Site Editor exposes the shared guarded Design back link and description',async({page})=>{
 await page.goto('/studio/site-editor');
 const heading=page.locator('.site-editor-design-heading');await expect(heading.getByRole('link',{name:'Back to Studio'})).toHaveAttribute('href','/studio');
 await expect(heading.getByRole('heading',{name:'Design',exact:true})).toBeVisible();
 await expect(page.getByText('Customise the appearance of your website using the block editor.',{exact:true})).toBeVisible();
 await page.screenshot({path:'/private/tmp/design-back-site-editor.png'});
});
