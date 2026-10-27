import { expect, test, type Page } from '@playwright/test';

const hosts = {
  library: { route: '/studio/ui/blocks/table', id: 'table-populated', text: 'Library profiles', caption: 'Example settings inventory' },
  content: { route: '/studio/ui/selection', id: 'table', text: 'First cell', caption: 'Content table caption' },
  template: { route: '/studio/ui/selection/template', id: 'template-table', text: 'First template cell', caption: 'Template caption' },
};
async function openTable(page: Page, host: keyof typeof hosts) {
  const fixture = hosts[host];
  await page.goto(fixture.route);
  if (host === 'library') await expect(page.locator('.ui-block-specimen')).toHaveAttribute('data-ready', 'true');
  const cell = page.locator(`[data-studio-block-id="${fixture.id}"][data-table-cell-row]`).filter({ hasText: fixture.text }).first();
  await cell.click();
  const table = cell.locator('xpath=ancestor::figure[1]');
  return { fixture, cell, table };
}
async function setToggle(field: ReturnType<Page['getByRole']>, checked: boolean) {
  if (await field.isChecked() !== checked) await field.locator('..').click();
}
async function history(page: Page, redo = false) {
  await page.getByRole('group', { name: /block tools$/ }).filter({ has: page.getByRole('button', { name: 'More block options', exact: true }) }).first().getByRole('button', { name: 'More block options', exact: true }).focus();
  await page.keyboard.press(redo ? 'Meta+Shift+z' : 'Meta+z');
}

for (const host of Object.keys(hosts) as (keyof typeof hosts)[]) {
  for (const wrapper of ['Group', 'Columns']) test(`Table ${wrapper} preserves rich cells and caption in ${host} history`, async ({ page }) => {
    const { fixture, cell, table } = await openTable(page, host);
    const snapshot = () => table.locator('table').evaluate(node => ({ columns: [...node.querySelectorAll('col')].map(col => col.style.width), rows: [...(node as HTMLTableElement).rows].map(row => [...row.cells].map(cell => ({ tag: cell.tagName, scope: cell.scope, html: cell.firstElementChild?.innerHTML }))) }));
    const before = await snapshot();
    const trigger = page.getByRole('button', { name: 'Transform Table block', exact: true });
    await trigger.click(); await page.keyboard.press('Escape'); await expect(trigger).toBeFocused();
    await trigger.click();
    await page.getByRole('menu', { name: 'Transform block' }).getByRole('menuitem', { name: wrapper, exact: true }).click();
    await expect(page.getByRole('group', { name: `${wrapper} block`, exact: true }).filter({ has: cell })).toBeVisible();
    expect(await snapshot()).toEqual(before);
    await expect(cell.locator('strong,b')).toHaveText(fixture.text);
    await expect(table.locator('figcaption em,figcaption i')).toHaveText(fixture.caption);
    await history(page);
    await cell.click(); await expect(trigger).toBeVisible();
    expect(await snapshot()).toEqual(before);
    await history(page, true);
    await expect(page.getByRole('group', { name: `${wrapper} block`, exact: true }).filter({ has: cell })).toBeVisible();
    expect(await snapshot()).toEqual(before);
    await page.getByRole('button', { name: 'Preview', exact: true }).click();
    await expect(page.getByText(fixture.text, { exact: true }).first()).toBeVisible();
    await expect(page.locator('figcaption em,figcaption i').filter({ hasText: fixture.caption })).toBeVisible();
  });

  test(`Table settings, sections and reset preserve body and history in ${host}`, async ({ page }) => {
    const { fixture, cell, table } = await openTable(page, host);
    const fixed = page.getByRole('checkbox', { name: 'Fixed width table cells', exact: true });
    await setToggle(fixed, false); await expect(table.locator('table')).toHaveClass(/is-auto-layout/);
    const header = page.getByRole('checkbox', { name: 'Header section', exact: true });
    await setToggle(header, false); await setToggle(header, true);
    const heading = table.locator('thead .rich-text-editor').first();
    await expect(heading).toHaveText(''); await heading.click(); await heading.fill('Reviewed header');
    const footer = page.getByRole('checkbox', { name: 'Footer section', exact: true });
    await setToggle(footer, true);
    const foot = table.locator('tfoot .rich-text-editor').first();
    await expect(foot).toHaveText(''); await foot.click(); await foot.fill('Reviewed footer');
    await setToggle(header, false); await expect(table.locator('thead')).toHaveCount(0);
    await history(page); await expect(table.locator('thead')).toHaveText(/Reviewed header/);
    await history(page, true); await expect(table.locator('thead')).toHaveCount(0);
    await page.getByRole('button', { name: 'Settings options', exact: true }).click();
    await page.getByRole('button', { name: 'Reset all', exact: true }).click();
    await expect(fixed).toBeChecked(); await expect(header).not.toBeChecked(); await expect(footer).not.toBeChecked();
    await expect(table.locator('tfoot')).toHaveCount(0);
    await expect(cell.locator('strong,b')).toHaveText(fixture.text);
    await expect(table.locator('figcaption em,figcaption i')).toHaveText(fixture.caption);
    await history(page); await expect(table.locator('tfoot')).toHaveText(/Reviewed footer/); await expect(fixed).not.toBeChecked();
  });

  test(`Table row and column actions retain rich cells and caption in ${host}`, async ({ page }) => {
    const { fixture, cell, table } = await openTable(page, host);
    const rows = await table.locator('tr').count(), columns = await table.locator('tr').first().locator('th,td').count();
    for (const [insert, remove, countSelector, count] of [['Insert row after', 'Delete row', 'tr', rows], ['Insert column after', 'Delete column', 'tr:first-child > :is(th,td)', columns]] as const) {
      await cell.click(); await page.getByRole('button', { name: 'Table options', exact: true }).click();
      await page.getByRole('menuitem', { name: insert, exact: true }).click();
      const counted = countSelector === 'tr' ? table.locator('tr') : table.locator('tr').first().locator('th,td');
      await expect(counted).toHaveCount(count + 1);
      await page.getByRole('button', { name: 'Table options', exact: true }).click();
      await page.getByRole('menuitem', { name: remove, exact: true }).click();
      await expect(counted).toHaveCount(count);
      await expect(cell.locator('strong,b')).toHaveText(fixture.text);
      await expect(table.locator('figcaption em,figcaption i')).toHaveText(fixture.caption);
    }
    await page.getByRole('button', { name: 'Preview', exact: true }).click();
    await expect(page.getByText(fixture.text, { exact: true }).first()).toBeVisible();
  });
}

test('Empty Table creates requested dimensions and supports Undo/Redo', async ({ page }) => {
  await page.goto('/studio/ui/blocks/table');
  await expect(page.locator('.ui-block-specimen')).toHaveAttribute('data-ready', 'true');
  await page.getByRole('button', { name: 'Empty Table', exact: true }).click();
  const placeholder = page.locator('.table-placeholder');
  await placeholder.getByRole('spinbutton', { name: 'Column count', exact: true }).fill('3');
  await placeholder.getByRole('spinbutton', { name: 'Row count', exact: true }).fill('2');
  await placeholder.getByRole('button', { name: 'Create Table', exact: true }).click();
  await expect(page.locator('[data-studio-nested-block-id="table-empty"] table tr')).toHaveCount(2);
  await expect(page.locator('[data-studio-nested-block-id="table-empty"] table td')).toHaveCount(6);
  await page.getByRole('button', { name: 'Undo specimen change', exact: true }).click(); await expect(placeholder).toBeVisible();
  await page.getByRole('button', { name: 'Redo specimen change', exact: true }).click();
  await expect(page.locator('[data-studio-nested-block-id="table-empty"] table td')).toHaveCount(6);
});
