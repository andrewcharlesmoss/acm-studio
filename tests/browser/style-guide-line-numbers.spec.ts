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
      const verticalScroll = guide.locator(':scope > .sg-guide-document-scroll-region');
      const labels = guide.locator('.sg-fixed-number-gutter > span');
      await expect(labels).toHaveCount(sourceCount);
      expect((await labels.allTextContents()).map(Number)).toEqual(expected);
      if (mode === 'Markdown source') {
        const firstLineGeometry = await guide.evaluate(element => {
          const frame = element.getBoundingClientRect();
          const firstLine = element.querySelector<HTMLElement>('[data-source-line="1"]')!.getBoundingClientRect();
          const firstNumber = element.querySelector<HTMLElement>('.sg-fixed-number-gutter > span')!.getBoundingClientRect();
          return {
            topClearance: firstLine.top - frame.top,
            numberCentreOffset: Math.abs((firstNumber.top + firstNumber.height / 2) - (firstLine.top + firstLine.height / 2)),
          };
        });
        expect(firstLineGeometry.topClearance).toBeGreaterThanOrEqual(12);
        expect(firstLineGeometry.numberCentreOffset).toBeLessThanOrEqual(2);
      }
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
            const collapsedWithoutHeaderGap = rowRect.height <= 1 && Math.abs(rect.top + rect.height / 2 - rowRect.top) <= 1;
            return rowRect.height > 1 || !collapsedWithoutHeaderGap;
          }).map(row => row.id);
        });
        expect(clippedSeparators).toEqual([]);
      }
      for (const wrap of [true, false]) {
        const toggle = page.getByRole('checkbox', { name: 'Word wrap', exact: true });
        await toggle.setChecked(wrap);
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
          // The max-content grid row leaves vertical overflow to the scroll region.
          content.scrollTop = 200;
          const innerVerticalScroll = content.scrollTop;
          const vertical = element.querySelector<HTMLElement>(':scope > .sg-guide-document-scroll-region')!;
          const verticalRange = vertical.scrollHeight - vertical.clientHeight;
          const scrollbarRect = element.querySelector<HTMLElement>('.sg-guide-bottom-scrollbar')!.getBoundingClientRect();
          const guideRect = element.getBoundingClientRect();
          const scrollbarBottomOffset = guideRect.bottom - scrollbarRect.bottom;
          return { before, after, scroll, nestedScrollers, innerVerticalScroll, verticalRange, scrollbarBottomOffset };
        });
        expect(measurements.after).toEqual(measurements.before);
        expect(Math.max(...measurements.before) - Math.min(...measurements.before)).toBeLessThanOrEqual(1);
        expect(measurements.nestedScrollers).toBe(0);
        expect(measurements.innerVerticalScroll).toBe(0);
        expect(measurements.verticalRange).toBeGreaterThan(0);
        expect(measurements.scrollbarBottomOffset).toBeLessThanOrEqual(2);
        const scrollbar = guide.locator('.sg-guide-bottom-scrollbar');
        await expect(scrollbar).toBeVisible();
        if (!wrap) {
          expect(measurements.scroll).toBeGreaterThan(0);
          await scrollbar.evaluate(element => { element.scrollLeft = element.scrollWidth; });
          await expect.poll(() => guide.locator('.sg-guide-horizontal-scroll').evaluate(element => element.scrollLeft)).toBeGreaterThan(0);
          await scrollbar.evaluate(element => { element.scrollLeft = 0; });
          await verticalScroll.focus();
          await page.keyboard.press('ArrowRight');
          await expect.poll(() => guide.locator('.sg-guide-horizontal-scroll').evaluate(element => element.scrollLeft)).toBeGreaterThan(0);
          await verticalScroll.evaluate(element => { element.scrollTop = 0; });
          const lineOffset = () => guide.evaluate(element => {
            const label = element.querySelector('.sg-fixed-number-gutter > span')!;
            const line = element.querySelector('[id="sg-guide-formatted-line-1"], [data-source-line="1"]')!;
            return label.getBoundingClientRect().top - line.getBoundingClientRect().top;
          });
          const offsetBeforeScroll = await lineOffset();
          await page.keyboard.press('PageDown');
          await expect.poll(() => verticalScroll.evaluate(element => element.scrollTop)).toBeGreaterThan(0);
          const stickyScrollbarOffset = await scrollbar.evaluate(element => {
            const bar = element.getBoundingClientRect();
            const panel = element.closest('.sg-guide-document-frame')!.getBoundingClientRect();
            return panel.bottom - bar.bottom;
          });
          expect(stickyScrollbarOffset).toBeLessThanOrEqual(2);
          expect(Math.abs(await lineOffset() - offsetBeforeScroll)).toBeLessThanOrEqual(1);
        }
      }
    }
  });
}

test('typography role selection jumps to its canonical guide row, including when reselected', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/studio/ui/styles');
  await expect(page.getByRole('status').filter({ hasText: 'Source loaded' })).toBeVisible();

  await expect(page.getByRole('button', { name: 'Formatted', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: 'Markdown source', exact: true })).toHaveAttribute('aria-pressed', 'false');

  const h2 = page.getByRole('group', { name: 'Typography role' }).getByRole('button', { name: 'H2', exact: true });
  const location = page.locator('.sg-source-detail dl > div').nth(2).locator('dd');

  for (const view of ['Formatted', 'Markdown source']) {
    await page.getByRole('button', { name: view, exact: true }).click();
    const viewName = view === 'Formatted' ? 'Formatted Style Guide' : 'Full Style Guide Markdown source with line numbers';
    const frame = page.locator(view === 'Formatted' ? '.sg-guide-formatted' : '.sg-guide-markdown').first();
    const scrollRegion = page.getByRole('region', { name: viewName });
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
    const pageScrollBeforeJump = await page.evaluate(() => window.scrollY);

    await h2.click();
    await expect(page.locator('.sg-source-detail h3')).toHaveText('typography.h2.size');
    const lineNumber = Number((await location.textContent())?.replace('Line ', ''));
    expect(Number.isInteger(lineNumber)).toBe(true);
    const rowId = `sg-guide-${view === 'Formatted' ? 'formatted' : 'markdown'}-line-${lineNumber}`;
    const sourceRow = frame.locator(`#${rowId}`);
    await expect(sourceRow).toHaveAttribute('aria-current', 'location');
    await expect.poll(() => scrollRegion.evaluate(element => element.scrollTop)).toBeGreaterThan(0);
    await expect.poll(() => page.evaluate(id => {
      const row = document.getElementById(id);
      const frame = row?.closest('.sg-guide-document-frame');
      const region = frame?.querySelector(':scope > .sg-guide-document-scroll-region');
      if (!region || !row) return false;
      const regionRect = region.getBoundingClientRect();
      const rowRect = row.getBoundingClientRect();
      return rowRect.top >= regionRect.top && rowRect.bottom <= regionRect.bottom;
    }, rowId)).toBe(true);
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(pageScrollBeforeJump);

    await scrollRegion.evaluate(element => { element.scrollTop = 0; });
    await expect.poll(() => scrollRegion.evaluate(element => element.scrollTop)).toBe(0);
    await h2.click();
    await expect.poll(() => scrollRegion.evaluate(element => element.scrollTop)).toBeGreaterThan(0);
    await expect(sourceRow).toHaveAttribute('aria-current', 'location');
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(pageScrollBeforeJump);
  }
});
