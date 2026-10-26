import { expect, test } from '@playwright/test';

async function expectStatusCentred(status: import('@playwright/test').Locator) {
  const centres = await status.evaluate(element => {
    const environment = element.closest('.dashboard-local-environment')!;
    const dot = element.querySelector('.studio-server-status-dot')!.getBoundingClientRect();
    const address = element.querySelector('.dashboard-local-status-address')!.getBoundingClientRect();
    const column = environment.getBoundingClientRect();
    return { status: (dot.left + address.right) / 2, column: (column.left + column.right) / 2 };
  });
  expect(Math.abs(centres.status - centres.column)).toBeLessThanOrEqual(1);
}

test('Sites use independent compact disclosures without navigating or hiding reorder controls', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  let discoveryRequests = 0;
  let test2Status: 'running' | 'stopped' = 'running';
  await page.route('**/__studio/local-projects', async route => { discoveryRequests++; await new Promise(resolve => setTimeout(resolve, 80)); return route.fulfill({ json: { available: true, projects: [
    { id: 'test', status: 'running', href: 'http://localhost:3005/' },
    test2Status === 'running' ? { id: 'test2', status: 'running', href: 'http://localhost:3006/' } : { id: 'test2', status: 'stopped' },
  ] } }); });
  await page.goto('/studio?site=test&library=page');
  await page.locator('.studio-workspace').evaluate(workspace => workspace.style.setProperty('--studio-library-width', '230px'));
  const libraryPane = page.locator('.studio-library.pane');
  await libraryPane.evaluate(pane => pane.style.setProperty('--pane-width', '230px'));
  expect((await libraryPane.boundingBox())?.width).toBe(230);
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
  await expect(status).toHaveText('3006');
  await expectStatusCentred(status);
  await expect(status.locator('.dashboard-local-status-address-full')).toBeHidden();
  await expect(status.locator('.dashboard-local-status-address-port')).toBeVisible();
  await expect(status).toHaveAttribute('aria-label', 'Refresh local status for Test2');
  await expect(status).toHaveAttribute('aria-description', 'Local server running — localhost:3006');
  await expect(statusRow.locator('.dashboard-local-refresh')).toHaveCount(0);
  await expect(status).toHaveAttribute('title', 'Refresh local status for Test2');
  const [statusBox, layout] = await Promise.all([status.boundingBox(), statusRow.evaluate(row => {
    const trigger = row.querySelector('.dashboard-local-status-trigger')!;
    const rowBounds = row.getBoundingClientRect();
    const triggerBounds = trigger.getBoundingClientRect();
    const environmentGrid = row.closest('.studio-site-entry')!.querySelector('.dashboard-project-environments')!;
    return { rowClientWidth: row.clientWidth, rowScrollWidth: row.scrollWidth, triggerClientWidth: trigger.clientWidth, triggerInsideRow: triggerBounds.right <= rowBounds.right, environmentColumns: getComputedStyle(environmentGrid).gridTemplateColumns.split(/\s+/).length };
  })]);
  expect(statusBox).not.toBeNull();
  expect(layout.rowScrollWidth).toBeLessThanOrEqual(layout.rowClientWidth);
  expect(layout.triggerClientWidth).toBe(layout.rowClientWidth);
  expect(layout.triggerInsideRow).toBe(true);
  expect(layout.environmentColumns).toBe(1);
  expect(statusBox!.height).toBeGreaterThanOrEqual(32);
  expect(statusBox!.height).toBeLessThanOrEqual(32);
  const requestsBeforeManualRefresh = discoveryRequests;
  await refresh.click();
  await expect.poll(() => discoveryRequests).toBeGreaterThan(requestsBeforeManualRefresh);
  await expect(page.locator('.studio-local-refresh-announcement')).toHaveCount(1);
  await expect(page.locator('.studio-local-refresh-announcement')).toHaveText('Refreshing local server status');
  await expect(statusRow.locator('.dashboard-local-status-announcement')).toHaveText('Local server running — localhost:3006');
  await expect(status).toHaveAttribute('aria-busy', 'true');
  await expect(status).toBeDisabled();
  await expect(status).toBeEnabled();
  const requestsBeforeKeyboardRefresh = discoveryRequests;
  test2Status = 'stopped';
  await status.focus();
  await status.press('Enter');
  await expect.poll(() => discoveryRequests).toBeGreaterThan(requestsBeforeKeyboardRefresh);
  await expect(status).toBeEnabled();
  await expect(status).toHaveText('Local server stopped');
  await expect(statusRow.locator('.dashboard-local-status-announcement')).toHaveText('Local server stopped');

  await page.locator('.studio-workspace').evaluate(workspace => workspace.style.setProperty('--studio-library-width', '270px'));
  await libraryPane.evaluate(pane => pane.style.setProperty('--pane-width', '270px'));
  const narrowGrid = sites.locator('.studio-site-entry.is-active .dashboard-project-environments');
  const narrowLayout = await narrowGrid.evaluate(grid => ({
    columns: getComputedStyle(grid).gridTemplateColumns.split(/\s+/).filter(Boolean),
    tops: [...grid.children].map(environment => environment.getBoundingClientRect().top),
    details: [...grid.children].map(environment => {
      const label = environment.querySelector('strong')!.getBoundingClientRect();
      const actions = [...environment.querySelector('.dashboard-project-links')!.children].map(action => action.getBoundingClientRect());
      return { labelHeight: label.height, actionTops: actions.map(action => action.top), actionWidths: actions.map(action => action.width) };
    }),
  }));
  expect(narrowLayout.columns).toHaveLength(3);
  expect(Math.max(...narrowLayout.tops) - Math.min(...narrowLayout.tops)).toBeLessThanOrEqual(1);
  for (const detail of narrowLayout.details) {
    expect(detail.labelHeight).toBeLessThanOrEqual(20);
    expect(Math.max(...detail.actionTops) - Math.min(...detail.actionTops)).toBeLessThanOrEqual(1);
    expect(detail.actionWidths).toEqual([36, 36]);
  }
  const narrowStatus = sites.locator('.studio-site-entry.is-active .dashboard-local-status');
  await expect(narrowStatus).toHaveText('3005');
  await expectStatusCentred(narrowStatus);
  await expect(narrowStatus.locator('.dashboard-local-status-address-full')).toBeHidden();
  await expect(narrowStatus.locator('.dashboard-local-status-address-port')).toBeVisible();

  await page.locator('.studio-workspace').evaluate(workspace => workspace.style.setProperty('--studio-library-width', '373px'));
  await libraryPane.evaluate(pane => pane.style.setProperty('--pane-width', '373px'));
  const compactStatus = sites.locator('.studio-site-entry.is-active .dashboard-local-status');
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
  expect(compactLayout.statusHeight).toBeLessThanOrEqual(32);
  expect(compactLayout.fontSize).toBe('13px');
  await expect(compactStatus).toHaveText('localhost:3005');
  await expectStatusCentred(compactStatus);
  await expect(compactStatus.locator('.dashboard-local-status-address-full')).toBeVisible();
  await expect(compactStatus.locator('.dashboard-local-status-address-port')).toBeHidden();
  await expect(compactStatus).toHaveAttribute('aria-label', 'Refresh local status for Test');

  await page.locator('.studio-workspace').evaluate(workspace => workspace.style.setProperty('--studio-library-width', '320px'));
  await libraryPane.evaluate(pane => pane.style.setProperty('--pane-width', '320px'));
  const intermediateGrid = sites.locator('.studio-site-entry.is-active .dashboard-project-environments');
  const intermediateLayout = await intermediateGrid.evaluate(grid => ({
    columns: getComputedStyle(grid).gridTemplateColumns.split(/\s+/).filter(Boolean),
    tops: [...grid.children].map(environment => environment.getBoundingClientRect().top),
  }));
  expect(intermediateLayout.columns).toHaveLength(3);
  expect(Math.max(...intermediateLayout.tops) - Math.min(...intermediateLayout.tops)).toBeLessThanOrEqual(1);
  await expect(sites.locator('.studio-site-entry.is-active .dashboard-local-status')).toHaveText('localhost:3005');

  await page.locator('.studio-workspace').evaluate(workspace => workspace.style.setProperty('--studio-library-width', '374px'));
  await libraryPane.evaluate(pane => pane.style.setProperty('--pane-width', '374px'));
  const equalSplitStatus = sites.locator('.studio-site-entry.is-active .dashboard-local-status');
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
  expect(equalSplitLayout.statusHeight).toBeLessThanOrEqual(32);
  await expect(equalSplitStatus).toHaveAttribute('aria-label', 'Refresh local status for Test');

  await expect(active.getByRole('button', { name: 'Test — Active site', exact: true })).toHaveAttribute('aria-expanded', 'true');
  await expect(page).toHaveURL(/site=test&library=page/);
  await toggle.press('Space');
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
});

test('Library compact site disclosures preserve temporary content and reset', async ({ page }) => {
  await page.goto('/studio/ui/controls#inspector-accordion');
  const specimen = page.locator('#inspector-accordion');
  await specimen.locator('.ui-control-live').evaluate(example => { example.style.width = '200px'; example.style.maxWidth = '200px'; });
  const exampleStatusRow = specimen.locator('.studio-site-entry').first().locator('.dashboard-local-status-row');
  expect(await exampleStatusRow.evaluate(row => Boolean(row.closest('.dashboard-local-environment')))).toBe(true);
  const exampleStatus = exampleStatusRow.locator('.dashboard-local-status');
  await expect(exampleStatus).toBeVisible();
  await expect(exampleStatus).toHaveText('3005');
  await expectStatusCentred(exampleStatus);
  await expect(exampleStatus).toHaveAttribute('title', 'Refresh example local status');
  await expect(exampleStatus).toHaveAttribute('aria-label', 'Refresh example local status');
  const [exampleStatusBox, exampleLayout] = await Promise.all([exampleStatus.boundingBox(), exampleStatusRow.evaluate(row => {
    const trigger = row.querySelector('.dashboard-local-status-trigger')!;
    const rowBounds = row.getBoundingClientRect();
    const triggerBounds = trigger.getBoundingClientRect();
    return { rowClientWidth: row.clientWidth, rowScrollWidth: row.scrollWidth, triggerClientWidth: trigger.clientWidth, triggerInsideRow: triggerBounds.right <= rowBounds.right, environmentColumns: getComputedStyle(row.closest('.studio-site-entry')!.querySelector('.dashboard-project-environments')!).gridTemplateColumns.split(/\s+/).length };
  })]);
  expect(exampleStatusBox).not.toBeNull();
  await expect(exampleStatus).toBeVisible();
  expect(exampleLayout.rowScrollWidth).toBeLessThanOrEqual(exampleLayout.rowClientWidth);
  expect(exampleLayout.triggerClientWidth).toBe(exampleLayout.rowClientWidth);
  expect(exampleLayout.triggerInsideRow).toBe(true);
  expect(exampleLayout.environmentColumns).toBe(1);
  expect(exampleStatusBox!.height).toBeGreaterThanOrEqual(32);
  expect(exampleStatusBox!.height).toBeLessThanOrEqual(32);
  await exampleStatus.click();
  await expect(specimen.locator('p[role="status"]')).toHaveText('Example local status refreshed.');
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
