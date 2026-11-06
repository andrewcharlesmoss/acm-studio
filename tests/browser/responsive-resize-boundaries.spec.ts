import { expect, test } from '@playwright/test';
import { responsiveBlockCss } from '../../app/content/responsive-styles';

test('responsive content and Quote use the same exact editor and public breakpoints', async ({ page }) => {
  const styles = 'color:#111;--studio-rs-mobile-color:#f00;--studio-rs-tablet-color:#00f';
  const quoteStyles = '--studio-quote-heading-color:#111;--studio-rs-mobile-studio-quote-heading-color:#f00;--studio-rs-tablet-studio-quote-heading-color:#00f';
  const quoteClasses = 'quote-field has-quote-heading-colour has-quote-mobile-heading-colour has-quote-tablet-heading-colour';
  await page.setContent(`<style>${responsiveBlockCss}</style><p id="public" style="${styles}">Public</p><div class="${quoteClasses}" style="${quoteStyles}"><h2 id="public-quote">Quote</h2></div><div class="studio-responsive-container" id="frame"><p id="editor" style="${styles}">Editor</p><div class="${quoteClasses}" style="${quoteStyles}"><h2 id="editor-quote">Quote</h2></div></div>`);
  for (const [width, colour] of [[480, 'rgb(255, 0, 0)'], [481, 'rgb(0, 0, 255)'], [782, 'rgb(0, 0, 255)'], [783, 'rgb(17, 17, 17)']] as const) {
    await page.setViewportSize({ width, height: 900 });
    await page.locator('#frame').evaluate((el, w) => { (el as HTMLElement).style.width = `${w}px`; }, width);
    for (const id of ['public', 'public-quote', 'editor', 'editor-quote']) await expect(page.locator(`#${id}`)).toHaveCSS('color', colour);
  }
});
