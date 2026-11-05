import {test,expect} from '@playwright/test';

test('Paragraph font size and other style controls expose inherited status and preserve local overrides',async({page})=>{
  await page.setViewportSize({width:1900,height:1100});
  await page.goto('/studio/ui/blocks/paragraph');
  await expect(page.locator('.ui-block-specimen')).toHaveAttribute('data-ready','true');
  const block=page.getByRole('complementary',{name:'Paragraph Local Styles',exact:true});
  const styles=page.getByRole('complementary',{name:'Paragraph Global Styles',exact:true});
  const size=block.locator('.paragraph-font-size-heading > span').first();
  await expect(page.locator('.ui-block-inspector .studio-inherited-indicator')).toHaveCount(0);
  await expect(size).not.toHaveAttribute('data-inherited','true');
  await styles.getByRole('group',{name:'Font size presets',exact:true}).getByRole('button').last().click();
  await expect(size).toHaveAttribute('data-inherited','true');
  await expect(block.locator('.studio-inherited-indicator')).toHaveCount(1);
  await block.getByRole('group',{name:'Font size presets',exact:true}).getByRole('button',{name:'XX-Large',exact:true}).click();
  await expect(size).not.toHaveAttribute('data-inherited','true');
  await block.getByRole('button',{name:'Undo specimen change',exact:true}).click();
  await expect(size).toHaveAttribute('data-inherited','true');
  await styles.getByRole('group',{name:'Font size presets',exact:true}).getByRole('button').last().click();
  await expect(block.locator('.studio-inherited-indicator')).toHaveCount(0);
  await styles.getByRole('button',{name:'Undo site style specimen change',exact:true}).click();
  await expect(size).toHaveAttribute('data-inherited','true');
  await styles.getByRole('button',{name:'Choose Colour',exact:true}).click();
  await page.getByRole('dialog',{name:'Colour palette',exact:true}).locator('.paragraph-colour-swatch').nth(3).click();
  await page.keyboard.press('Escape');
  const colour=block.locator('.inspector-colour-row').first();
  await expect(colour.locator('.studio-inherited-indicator')).toBeVisible();
  await expect(colour.locator('.paragraph-palette-warning-icon')).toBeVisible();
  const inherited=await colour.locator('.studio-inherited-indicator').boundingBox();
  const warning=await colour.locator('.paragraph-palette-warning-icon').boundingBox();
  expect(inherited!.x+inherited!.width).toBeLessThanOrEqual(warning!.x);
  await page.screenshot({path:'/private/tmp/inherited-paragraph-settings.png',fullPage:true});
  await page.setViewportSize({width:390,height:1000});
  const narrow=page.locator('.ui-block-inspector .paragraph-font-size-heading .studio-setting-label:visible');
  await expect(narrow).toHaveAttribute('data-inherited','true');
  const narrowIcon=await narrow.locator('.studio-inherited-indicator').boundingBox();
  const heading=await narrow.locator('..').boundingBox();
  expect(narrowIcon!.x+narrowIcon!.width).toBeLessThanOrEqual(heading!.x+heading!.width);
  await page.screenshot({path:'/private/tmp/inherited-paragraph-settings-narrow.png',fullPage:true});
});

for(const type of ['code','button'])test(`${type} reference styles are unmarked until an upstream field is authored`,async({page})=>{
  await page.setViewportSize({width:1900,height:1100});await page.goto(`/studio/ui/blocks/${type}`);
  await expect(page.locator('.ui-block-specimen')).toHaveAttribute('data-ready','true');
  await expect(page.locator('.ui-block-inspector .studio-inherited-indicator')).toHaveCount(0);
});
