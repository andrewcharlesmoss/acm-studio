import { expect, test } from '@playwright/test';
for (const width of [1440, 390]) {
 test(`Footnotes shared Styles controls and history at ${width}px`, async ({page}) => {
  await page.setViewportSize({width,height:1000});
  await page.goto('/studio/ui/controls#block-style-panels');
  const example=page.getByRole('group',{name:'Block Styles panes example',exact:true});
  await expect(example).toHaveAttribute('data-ready','true');
  await example.locator('[data-block-target="footnotes"]').click();
  const pane=example.locator('.ui-block-style-pane');
  await expect(pane.getByRole('radiogroup',{name:'Orientation',exact:true})).toBeVisible();
  await expect(pane.getByRole('radiogroup',{name:'Text alignment',exact:true})).toHaveCount(0);
  await expect(pane.locator('.paragraph-gradient-option-row')).toHaveCount(0);
  const preview=example.locator('.site-block-inline-specimen .article-footnotes ol');
  await pane.getByRole('radio',{name:'Vertical',exact:true}).check();
  await expect(preview).toHaveCSS('writing-mode','vertical-rl');
  await example.getByRole('button',{name:'Undo',exact:true}).click();
  await expect(preview).toHaveCSS('writing-mode','horizontal-tb');
  await example.getByRole('button',{name:'Redo',exact:true}).click();
  await expect(preview).toHaveCSS('writing-mode','vertical-rl');
  await pane.getByRole('radio',{name:'Horizontal',exact:true}).focus();
  await page.keyboard.press('Space');
  await expect(preview).toHaveCSS('writing-mode','horizontal-tb');
  await example.getByRole('button',{name:'Reset example',exact:true}).click();
  await example.locator('[data-block-target="footnotes"]').click();
  await expect(preview).toHaveCSS('writing-mode','horizontal-tb');
  if(width===1440) await pane.screenshot({path:'/private/tmp/footnotes-styles-library.png'});
 });
}
