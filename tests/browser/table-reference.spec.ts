import { expect, test } from '@playwright/test';

for (const width of [1440, 820, 390]) {
  test(`table cells share Gutenberg geometry in Edit and Preview at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('/studio/ui/blocks/table');
    await expect(page.locator('.ui-block-specimen')).toHaveAttribute('data-ready', 'true');
    const canvas = page.locator('.ui-block-canvas');
    await canvas.getByRole('textbox', { name: 'Table row 1, column 2', exact: true }).first().fill('A longer entry\nwith another line\nand a third line');
    const measure = () => canvas.locator('table').first().evaluate(table => {
      const tableStyle = getComputedStyle(table);
      return [...table.querySelectorAll('th,td')].map(cell => {
        const content = cell.firstElementChild!;
        const style = getComputedStyle(content);
        const cellStyle = getComputedStyle(cell);
        const cellRect = cell.getBoundingClientRect();
        const contentRect = content.getBoundingClientRect();
        return { font: style.fontSize, tableFont: tableStyle.fontSize, padding: parseFloat(style.paddingTop), align: cellStyle.textAlign, vertical: cellStyle.verticalAlign,
          centred: Math.abs((cellRect.top + cellRect.bottom) / 2 - (contentRect.top + contentRect.bottom) / 2) < 1.1,
          width: cellRect.width, height: cellRect.height };
      });
    });
    const edit = await measure();
    for (const cell of edit) {
      expect(cell.font).toBe(cell.tableFont);
      expect(cell.padding).toBeCloseTo(parseFloat(cell.font) / 2, 2);
      expect(cell.vertical).toBe('middle');
      expect(cell.centred).toBe(true);
    }
    expect(edit[0].align).toBe('center');
    expect(edit[2].align).toBe('start');
    await page.getByRole('group', { name: 'Specimen view' }).getByRole('button', { name: 'Preview', exact: true }).click();
    expect(await measure()).toEqual(edit);
  });
}

for (const vertical of ['top', 'middle', 'bottom']) {
  test(`cell ${vertical} alignment and explicit row heights survive Preview`, async ({ page }) => {
    await page.goto('/studio/ui/blocks/table');
    await expect(page.locator('.ui-block-specimen')).toHaveAttribute('data-ready', 'true');
    const canvas = page.locator('.ui-block-canvas');
    // The third fixture has explicit minimum heights; every fixture remains visible.
    const field = canvas.locator('[data-studio-block-id="table-height"][data-table-cell-row="1"][data-table-cell-column="0"]');
    await field.click();
    await page.getByRole('button', { name: 'Cell alignment', exact: true }).click();
    await page.getByRole('menuitemradio', { name: `Align cell ${vertical}`, exact: true }).click();
    const measure = (selector: string) => canvas.locator(selector).nth(2).evaluate(table => ({
      height: table.getBoundingClientRect().height,
      cells: [...table.querySelectorAll('th,td')].map(cell => {
        const r = cell.getBoundingClientRect(), c = cell.firstElementChild!.getBoundingClientRect();
        return { height: r.height, offset: c.top - r.top, contentHeight: c.height, vertical: getComputedStyle(cell).verticalAlign };
      }),
    }));
    const edit = await measure('table');
    expect(edit.cells[2].vertical).toBe(vertical);
    expect(edit.cells[2].height).toBeGreaterThanOrEqual(129);
    await page.getByRole('group', { name: 'Specimen view' }).getByRole('button', { name: 'Preview', exact: true }).click();
    expect(await measure('table')).toEqual(edit);
  });
}

test('explicit Left is applied to a header and Escape returns focus to the shared control', async ({ page }) => {
  await page.goto('/studio/ui/blocks/table');
  await expect(page.locator('.ui-block-specimen')).toHaveAttribute('data-ready', 'true');
  await page.getByRole('textbox', { name: 'Table header 1', exact: true }).first().click();
  const trigger = page.getByRole('button', { name: 'Cell alignment', exact: true });
  await trigger.click();
  await page.getByRole('menuitemradio', { name: 'Align cell left', exact: true }).click();
  expect(await page.locator('.ui-block-canvas th').first().evaluate(e => getComputedStyle(e).textAlign)).toBe('left');
  await trigger.click();
  await page.getByRole('menuitemradio', { name: 'Align cell left', exact: true }).press('Escape');
  await expect(trigger).toBeFocused();
  await page.getByRole('group', { name: 'Specimen view' }).getByRole('button', { name: 'Preview', exact: true }).click();
  expect(await page.locator('.ui-block-canvas th').first().evaluate(e => getComputedStyle(e).textAlign)).toBe('left');
});

test('empty table cells and growing explicit rows keep equal geometry', async ({ page }) => {
  await page.goto('/studio/ui/blocks/table');
  await expect(page.locator('.ui-block-specimen')).toHaveAttribute('data-ready', 'true');
  const canvas = page.locator('.ui-block-canvas');
  for (const field of await canvas.getByRole('textbox', { name: /^Table (header|row)/ }).all()) await field.fill('');
  await canvas.locator('[data-studio-block-id="table-height"][data-table-cell-row="2"][data-table-cell-column="0"]').fill('Many\nlines\nof\ncontent\nthat\nexceed\nthe\nrow');
  const measure = () => canvas.locator('table').evaluateAll(tables => tables.map(table => [...(table as HTMLTableElement).rows].map(row => row.getBoundingClientRect().height)));
  const edit = await measure();
  await page.getByRole('group', { name: 'Specimen view' }).getByRole('button', { name: 'Preview', exact: true }).click();
  expect(await measure()).toEqual(edit);
});
