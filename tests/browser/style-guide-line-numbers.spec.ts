import { expect, test } from '@playwright/test';

for (const section of ['styles', 'interface-styles']) for (const width of [1440, 782, 390]) {
  test(`${section} numbers stay complete, readable and fixed during document scrolling at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto(`/studio/ui/${section}`);
    await expect(page.getByRole('status').filter({ hasText: 'Source loaded' })).toBeVisible();
    if (width <= 680 && section === 'styles') await page.getByRole('button', { name: 'Written guide', exact: true }).click();
    const sourceCount = await page.locator('.sg-guide-markdown [data-source-line]').count();
    const expected = Array.from({ length: sourceCount }, (_, index) => index + 1);
    for (const mode of ['Formatted', 'Markdown source']) {
      await page.getByRole('button', { name: mode, exact: true }).click();
      const guide = page.locator(mode === 'Formatted' ? '.sg-guide-formatted' : '.sg-guide-markdown');
      const labels = guide.locator('.sg-fixed-number-gutter > span');
      await expect(labels).toHaveCount(sourceCount);
      expect((await labels.allTextContents()).map(Number)).toEqual(expected);
      if (mode === 'Formatted') {
        const ids = await guide.locator('[id^="sg-guide-formatted-line-"]').evaluateAll(rows => rows.map(row => Number(row.id.split('-').at(-1))));
        expect(ids).toEqual(expected);
        const clippedSeparators = await guide.evaluate(element => {
          const numbers = [...element.querySelectorAll<HTMLElement>('.sg-fixed-number-gutter > span')];
          return [...element.querySelectorAll<HTMLElement>('.sg-formatted-table-separator')].filter(row => {
            const line = row.id.split('-').at(-1);
            const label = numbers.find(number => number.textContent === line)!;
            const rect = label.getBoundingClientRect();
            const rowRect = row.getBoundingClientRect();
            return rect.top < rowRect.top - 1 || rect.bottom > rowRect.bottom + 1;
          }).map(row => row.id);
        });
        expect(clippedSeparators).toEqual([]);
      }
      for (const wrap of [true, false]) {
        const toggle = page.getByRole('button', { name: 'Word wrap', exact: true });
        if ((await toggle.getAttribute('aria-pressed')) !== String(wrap)) await toggle.click();
        const measurements = await guide.evaluate(element => {
          const content = element.querySelector<HTMLElement>('.sg-guide-horizontal-scroll')!;
          const labels = [...element.querySelectorAll<HTMLElement>('.sg-fixed-number-gutter > span')];
          const centres = () => labels.map(label => { const rect = label.getBoundingClientRect(); return rect.left + rect.width / 2; });
          content.scrollLeft = 0;
          const before = centres();
          content.scrollLeft = content.scrollWidth;
          const after = centres();
          const scroll = content.scrollLeft;
          content.scrollLeft = 0;
          const nestedScrollers = [...element.querySelectorAll<HTMLElement>('.sg-formatted-table')].filter(table => ['auto', 'scroll'].includes(getComputedStyle(table).overflowX)).length;
          // A max-content grid row leaves vertical overflow solely with the outer document.
          content.scrollTop = 200;
          const innerVerticalScroll = content.scrollTop;
          const verticalRange = element.scrollHeight - element.clientHeight;
          return { before, after, scroll, nestedScrollers, innerVerticalScroll, verticalRange };
        });
        expect(measurements.after).toEqual(measurements.before);
        expect(Math.max(...measurements.before) - Math.min(...measurements.before)).toBeLessThanOrEqual(1);
        expect(measurements.nestedScrollers).toBe(0);
        expect(measurements.innerVerticalScroll).toBe(0);
        expect(measurements.verticalRange).toBeGreaterThan(0);
        if (!wrap) {
          expect(measurements.scroll).toBeGreaterThan(0);
          await guide.focus();
          await page.keyboard.press('ArrowRight');
          await expect.poll(() => guide.locator('.sg-guide-horizontal-scroll').evaluate(element => element.scrollLeft)).toBeGreaterThan(0);
          await guide.evaluate(element => { element.scrollTop = 0; });
          const lineOffset = () => guide.evaluate(element => {
            const label = element.querySelector('.sg-fixed-number-gutter > span')!;
            const line = element.querySelector('[id="sg-guide-formatted-line-1"], [data-source-line="1"]')!;
            return label.getBoundingClientRect().top - line.getBoundingClientRect().top;
          });
          const offsetBeforeScroll = await lineOffset();
          await page.keyboard.press('PageDown');
          await expect.poll(() => guide.evaluate(element => element.scrollTop)).toBeGreaterThan(0);
          expect(await guide.locator('.sg-guide-horizontal-scroll').evaluate(element => element.scrollTop)).toBe(0);
          expect(Math.abs(await lineOffset() - offsetBeforeScroll)).toBeLessThanOrEqual(1);
        }
      }
    }
  });
}
