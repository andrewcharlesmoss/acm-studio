import { expect, test } from '@playwright/test';

test('Sites use independent compact disclosures without navigating or hiding reorder controls', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route('**/__studio/local-projects', route => route.fulfill({ json: { available: true, projects: [
    { id: 'test', status: 'running', href: 'http://localhost:3005/' },
    { id: 'test2', status: 'running', href: 'http://localhost:3006/' },
  ] } }));
  await page.goto('/studio?site=test&library=page');
  await page.locator('.studio-workspace').evaluate(workspace => workspace.style.setProperty('--studio-library-width', '270px'));
  const libraryPane = page.locator('.studio-library.pane');
  await libraryPane.evaluate(pane => pane.style.setProperty('--pane-width', '270px'));
  expect((await libraryPane.boundingBox())?.width).toBe(270);
  const sites = page.locator('.studio-local-sites');
  const entries = sites.locator('.studio-site-entry');
  await expect(entries).toHaveCount(3);
  const active = sites.locator('.studio-site-entry.is-active');
  await expect(active.getByRole('button', { name: 'Test — Active site', exact: true })).toHaveAttribute('aria-expanded', 'true');
  const inactive = entries.filter({ has: page.getByRole('region', { name: 'Test2 environments', exact: true }) });
  const toggle = inactive.getByRole('button', { name: 'Test2', exact: true });
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  expect((await inactive.boundingBox())!.height).toBeLessThanOrEqual(44);
  await expect(inactive.getByRole('button', { name: 'Reorder Test2', exact: true })).toBeVisible();
  await toggle.press('Enter');
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await expect(inactive.getByRole('link', { name: 'Edit Site — Test2 — Local', exact: true })).toBeVisible();
  const statusRow = inactive.locator('.dashboard-local-status-row').first();
  expect(await statusRow.evaluate(row => Boolean(row.closest('.dashboard-local-environment')))).toBe(true);
  const refresh = statusRow.getByRole('button', { name: 'Refresh local status for Test2', exact: true });
  const status = statusRow.locator('.dashboard-local-status');
  await expect(status).toHaveText('localhost:3006');
  await expect(status).not.toHaveAttribute('title', /Project Ports|Local server/);
  await expect(status).toHaveAttribute('aria-label', 'Local server running — localhost:3006');
  const [statusBox, refreshBox, layout] = await Promise.all([status.boundingBox(), refresh.boundingBox(), statusRow.evaluate(row => {
    const text = row.querySelector('.dashboard-local-status')!;
    const action = row.querySelector('.dashboard-local-refresh')!;
    const rowBounds = row.getBoundingClientRect();
    const textBounds = text.getBoundingClientRect();
    const actionBounds = action.getBoundingClientRect();
    const environmentGrid = row.closest('.studio-site-entry')!.querySelector('.dashboard-project-environments')!;
    return { rowClientWidth: row.clientWidth, rowScrollWidth: row.scrollWidth, textClientWidth: text.clientWidth, textScrollWidth: text.scrollWidth, gap: actionBounds.left - textBounds.right, actionInsideRow: actionBounds.right <= rowBounds.right, environmentColumns: getComputedStyle(environmentGrid).gridTemplateColumns.split(/\s+/).length };
  })]);
  expect(statusBox).not.toBeNull();
  expect(refreshBox).not.toBeNull();
  expect(layout.rowScrollWidth).toBeLessThanOrEqual(layout.rowClientWidth);
  expect(layout.textScrollWidth).toBeLessThanOrEqual(layout.textClientWidth);
  expect(layout.gap).toBeGreaterThanOrEqual(0);
  expect(layout.actionInsideRow).toBe(true);
  expect(layout.environmentColumns).toBe(1);
  expect(statusBox!.height).toBeLessThanOrEqual(20);
  expect(refreshBox!.y).toBeLessThan(statusBox!.y + statusBox!.height);
  expect(refreshBox!.y + refreshBox!.height).toBeGreaterThan(statusBox!.y);

  await page.locator('.studio-workspace').evaluate(workspace => workspace.style.setProperty('--studio-library-width', '373px'));
  await libraryPane.evaluate(pane => pane.style.setProperty('--pane-width', '373px'));
  const compactStatus = sites.locator('.studio-site-entry.is-active .dashboard-local-status');
  const compactRefresh = sites.locator('.studio-site-entry.is-active .dashboard-local-refresh');
  const compactLayout = await compactStatus.evaluate(status => {
    const row = status.closest('.dashboard-local-status-row')!;
    const grid = row.closest('.studio-site-entry')!.querySelector('.dashboard-project-environments')!;
    const columns = getComputedStyle(grid).gridTemplateColumns.split(/\s+/).map(width => Number.parseFloat(width)).filter(width => width > 0);
    const local = grid.querySelector('.dashboard-local-environment')!.getBoundingClientRect();
    const production = grid.querySelector('.dashboard-project-environment:not(.dashboard-local-environment)')!.getBoundingClientRect();
    const tops = [...grid.children].map(environment => environment.getBoundingClientRect().top);
    return { columns, localWidth: local.width, productionWidth: production.width, tops, statusHeight: status.getBoundingClientRect().height, fontSize: getComputedStyle(status).fontSize };
  });
  expect(compactLayout.columns).toHaveLength(3);
  expect(Math.abs(compactLayout.localWidth - compactLayout.productionWidth)).toBeLessThanOrEqual(1);
  expect(Math.max(...compactLayout.tops) - Math.min(...compactLayout.tops)).toBeLessThanOrEqual(1);
  expect(compactLayout.statusHeight).toBeLessThanOrEqual(20);
  expect(compactLayout.fontSize).toBe('13px');
  expect((await compactRefresh.boundingBox())!.y).toBeLessThan((await compactStatus.boundingBox())!.y + 20);

  await page.locator('.studio-workspace').evaluate(workspace => workspace.style.setProperty('--studio-library-width', '320px'));
  await libraryPane.evaluate(pane => pane.style.setProperty('--pane-width', '320px'));
  const intermediateGrid = sites.locator('.studio-site-entry.is-active .dashboard-project-environments');
  const intermediateLayout = await intermediateGrid.evaluate(grid => ({
    columns: getComputedStyle(grid).gridTemplateColumns.split(/\s+/).filter(Boolean),
    tops: [...grid.children].map(environment => environment.getBoundingClientRect().top),
  }));
  expect(intermediateLayout.columns).toHaveLength(3);
  expect(Math.max(...intermediateLayout.tops) - Math.min(...intermediateLayout.tops)).toBeLessThanOrEqual(1);

  await page.locator('.studio-workspace').evaluate(workspace => workspace.style.setProperty('--studio-library-width', '374px'));
  await libraryPane.evaluate(pane => pane.style.setProperty('--pane-width', '374px'));
  const equalSplitStatus = sites.locator('.studio-site-entry.is-active .dashboard-local-status');
  const equalSplitRefresh = sites.locator('.studio-site-entry.is-active .dashboard-local-refresh');
  const equalSplitLayout = await equalSplitStatus.evaluate(status => {
    const row = status.closest('.dashboard-local-status-row')!;
    const grid = row.closest('.studio-site-entry')!.querySelector('.dashboard-project-environments')!;
    const columns = getComputedStyle(grid).gridTemplateColumns.split(/\s+/).map(width => Number.parseFloat(width)).filter(width => width > 0);
    const local = grid.querySelector('.dashboard-local-environment')!.getBoundingClientRect();
    const production = grid.querySelector('.dashboard-project-environment:not(.dashboard-local-environment)')!.getBoundingClientRect();
    return { columns, localWidth: local.width, productionWidth: production.width, statusHeight: status.getBoundingClientRect().height };
  });
  expect(equalSplitLayout.columns).toHaveLength(3);
  expect(Math.abs(equalSplitLayout.localWidth - equalSplitLayout.productionWidth)).toBeLessThanOrEqual(1);
  expect(Math.abs(equalSplitLayout.columns[0] - equalSplitLayout.columns[1])).toBeLessThanOrEqual(1);
  expect(equalSplitLayout.statusHeight).toBeLessThanOrEqual(20);
  expect((await equalSplitRefresh.boundingBox())!.y).toBeLessThan((await equalSplitStatus.boundingBox())!.y + 20);

  await expect(active.getByRole('button', { name: 'Test — Active site', exact: true })).toHaveAttribute('aria-expanded', 'true');
  await expect(page).toHaveURL(/site=test&library=page/);
  await toggle.press('Space');
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
});

test('Library compact site disclosures preserve temporary content and reset', async ({ page }) => {
  await page.goto('/studio/ui/controls#inspector-accordion');
  const specimen = page.locator('#inspector-accordion');
  await specimen.locator('.ui-control-live').evaluate(example => { example.style.width = '240px'; example.style.maxWidth = '240px'; });
  const exampleStatusRow = specimen.locator('.studio-site-entry').first().locator('.dashboard-local-status-row');
  expect(await exampleStatusRow.evaluate(row => Boolean(row.closest('.dashboard-local-environment')))).toBe(true);
  const exampleRefresh = exampleStatusRow.getByRole('button', { name: 'Refresh example local status', exact: true });
  await expect(exampleRefresh).toBeVisible();
  const exampleStatus = exampleStatusRow.locator('.dashboard-local-status');
  await expect(exampleStatus).toHaveText('localhost:3005');
  await expect(exampleStatus).not.toHaveAttribute('title');
  const [exampleStatusBox, exampleRefreshBox, exampleLayout] = await Promise.all([exampleStatus.boundingBox(), exampleRefresh.boundingBox(), exampleStatusRow.evaluate(row => {
    const text = row.querySelector('.dashboard-local-status')!;
    const action = row.querySelector('.dashboard-local-refresh')!;
    const rowBounds = row.getBoundingClientRect();
    const textBounds = text.getBoundingClientRect();
    const actionBounds = action.getBoundingClientRect();
    return { rowClientWidth: row.clientWidth, rowScrollWidth: row.scrollWidth, textClientWidth: text.clientWidth, textScrollWidth: text.scrollWidth, gap: actionBounds.left - textBounds.right, actionInsideRow: actionBounds.right <= rowBounds.right, environmentColumns: getComputedStyle(row.closest('.studio-site-entry')!.querySelector('.dashboard-project-environments')!).gridTemplateColumns.split(/\s+/).length };
  })]);
  expect(exampleStatusBox).not.toBeNull();
  expect(exampleRefreshBox).not.toBeNull();
  expect(exampleLayout.rowScrollWidth).toBeLessThanOrEqual(exampleLayout.rowClientWidth);
  expect(exampleLayout.textScrollWidth).toBeLessThanOrEqual(exampleLayout.textClientWidth);
  expect(exampleLayout.gap).toBeGreaterThanOrEqual(0);
  expect(exampleLayout.actionInsideRow).toBe(true);
  expect(exampleLayout.environmentColumns).toBe(1);
  expect(exampleStatusBox!.height).toBeLessThanOrEqual(20);
  expect(exampleRefreshBox!.y).toBeLessThan(exampleStatusBox!.y + exampleStatusBox!.height);
  expect(exampleRefreshBox!.y + exampleRefreshBox!.height).toBeGreaterThan(exampleStatusBox!.y);
  await specimen.locator('.ui-control-live').evaluate(example => { example.style.width = '373px'; example.style.maxWidth = '373px'; });
  const libraryEnvironmentGrid = specimen.locator('.studio-site-entry').first().locator('.dashboard-project-environments');
  const libraryEnvironmentLayout = await libraryEnvironmentGrid.evaluate(grid => {
    const local = grid.querySelector('.dashboard-local-environment')!.getBoundingClientRect();
    const production = grid.querySelector('.dashboard-project-environment:not(.dashboard-local-environment)')!.getBoundingClientRect();
    const columns = getComputedStyle(grid).gridTemplateColumns.split(/\s+/).filter(Boolean);
    const tops = [...grid.children].map(environment => environment.getBoundingClientRect().top);
    return { local: local.width, production: production.width, columns, tops };
  });
  expect(libraryEnvironmentLayout.columns).toHaveLength(3);
  expect(Math.abs(libraryEnvironmentLayout.local - libraryEnvironmentLayout.production)).toBeLessThanOrEqual(1);
  expect(Math.max(...libraryEnvironmentLayout.tops) - Math.min(...libraryEnvironmentLayout.tops)).toBeLessThanOrEqual(1);
  const entry = specimen.locator('.studio-site-entry').filter({ has: page.getByRole('region', { name: 'Another site environments', exact: true }) });
  const toggle = entry.getByRole('button', { name: 'Another site', exact: true });
  await expect(async () => {
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true', { timeout: 1000 });
  }).toPass({ timeout: 15000 });
  await entry.getByRole('button', { name: 'Example action for Another site' }).click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await expect(specimen.locator('p[role="status"]')).toHaveText('Action for Another site stays in this example.');
  const note = entry.getByLabel('Example site note');
  await note.fill('Retained temporary value');
  await toggle.click();
  await toggle.click();
  await expect(note).toHaveValue('Retained temporary value');
  await specimen.getByRole('button', { name: 'Reset example', exact: true }).click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await toggle.click();
  await expect(note).toHaveValue('Temporary note');
});
