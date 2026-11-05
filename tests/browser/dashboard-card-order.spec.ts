import { expect, test } from '@playwright/test';

test('dashboard cards reorder independently and retain order', async ({ page }) => {
  await page.goto('/');
  const sites = page.locator('.dashboard-site-grid');
  const tools = page.locator('.dashboard-tool-grid');
  const siteCards = sites.locator('.dashboard-card-reorder');
  const toolCards = tools.locator('.dashboard-card-reorder');
  const firstSite = await siteCards.first().getAttribute('data-library-entry-id');
  const secondSite = await siteCards.nth(1).getAttribute('data-library-entry-id');
  const firstTool = await toolCards.first().getAttribute('data-library-entry-id');
  const secondTool = await toolCards.nth(1).getAttribute('data-library-entry-id');
  await expect(page.locator('.dashboard-shell')).toHaveAttribute('data-dashboard-ready', 'true');
  await siteCards.nth(1).getByRole('button', { name: /^Reorder / }).press('Alt+ArrowUp');
  await expect(siteCards.first()).toHaveAttribute('data-library-entry-id', secondSite!);
  await toolCards.nth(1).getByRole('button', { name: /^Reorder / }).press('Alt+ArrowUp');
  await expect(toolCards.first()).toHaveAttribute('data-library-entry-id', secondTool!);
  await expect.poll(() => page.evaluate(() => [localStorage.getItem('acm-studio-dashboard-sites-order-v1'), localStorage.getItem('acm-studio-dashboard-tools-order-v1')].every(Boolean))).toBe(true);
  await page.reload();
  await expect(siteCards.first()).toHaveAttribute('data-library-entry-id', secondSite!);
  await expect(toolCards.first()).toHaveAttribute('data-library-entry-id', secondTool!);
  const movedToolId = await toolCards.first().getAttribute('data-library-entry-id');
  const lastTool = toolCards.last();
  await toolCards.first().getByRole('button', { name: /^Reorder / }).dragTo(lastTool, { targetPosition: { x: 5, y: 20 } });
  await expect(toolCards.first()).not.toHaveAttribute('data-library-entry-id', movedToolId!);
  const lastSiteId = await siteCards.last().getAttribute('data-library-entry-id');
  await siteCards.last().getByRole('button', { name: /^Reorder / }).dragTo(siteCards.first(), { targetPosition: { x: 5, y: 20 } });
  await expect(siteCards.first()).toHaveAttribute('data-library-entry-id', lastSiteId!);
  await page.screenshot({ path: '/private/tmp/acm-dashboard-desktop.png', fullPage: true });
  const pointerSiteOrder = await siteCards.evaluateAll(nodes => nodes.map(node => node.getAttribute('data-library-entry-id')));
  const pointerToolOrder = await toolCards.evaluateAll(nodes => nodes.map(node => node.getAttribute('data-library-entry-id')));
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('acm-studio-dashboard-sites-order-v1') || '[]'))).toEqual(pointerSiteOrder);
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('acm-studio-dashboard-tools-order-v1') || '[]'))).toEqual(pointerToolOrder);
  await page.reload();
  await expect.poll(() => siteCards.evaluateAll(nodes => nodes.map(node => node.getAttribute('data-library-entry-id')))).toEqual(pointerSiteOrder);
  await expect.poll(() => toolCards.evaluateAll(nodes => nodes.map(node => node.getAttribute('data-library-entry-id')))).toEqual(pointerToolOrder);
  await page.setViewportSize({ width: 390, height: 844 });
  for (const handle of await page.getByRole('button', { name: /^Reorder / }).all()) await expect(handle).toBeVisible();
  await page.screenshot({ path: '/private/tmp/acm-dashboard-mobile.png', fullPage: true });
  const source = siteCards.locator(`button[aria-label="Reorder ACM Studio"]`);
  await expect(source).toHaveCount(1);
  expect(firstSite).not.toBe(secondSite);
  expect(firstTool).not.toBe(secondTool);
});


test('dashboard card drag feedback stays vertical across wrapped rows', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 1000 });
  await page.goto('/');
  const tools = page.locator('.dashboard-tool-grid');
  await expect(page.locator('.dashboard-shell')).toHaveAttribute('data-dashboard-ready', 'true');
  const marker = await page.evaluate(() => {
    const grid = document.querySelector<HTMLElement>('.dashboard-tool-grid')!;
    const cards = Array.from(grid.querySelectorAll<HTMLElement>('.dashboard-card-reorder'));
    const firstRow = cards.filter(card => Math.abs(card.getBoundingClientRect().top - cards[0].getBoundingClientRect().top) < 1);
    const nextRow = cards.find(card => card.getBoundingClientRect().top > cards[0].getBoundingClientRect().top + 1)!;
    if (!nextRow || firstRow.length === cards.length) throw new Error('The dashboard tools did not wrap at the test viewport.');
    const handle = cards[0].querySelector<HTMLButtonElement>('.dashboard-card-drag')!;
    const lastInRow = firstRow.at(-1)!.getBoundingClientRect();
    const gridBounds = grid.getBoundingClientRect();
    const dataTransfer = new DataTransfer();
    handle.dispatchEvent(new DragEvent('dragstart', { bubbles: true, cancelable: true, dataTransfer }));
    grid.dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer, clientX: gridBounds.right - 1, clientY: lastInRow.bottom - 1 }));
    const line = grid.querySelector<HTMLElement>('.studio-gap-line');
    if (!line) throw new Error('The dashboard did not render a drop indicator.');
    const measured = { width: line.getBoundingClientRect().width, height: line.getBoundingClientRect().height, left: line.getBoundingClientRect().left, nextLeft: nextRow.getBoundingClientRect().left };
    handle.dispatchEvent(new DragEvent('dragend', { bubbles: true, dataTransfer }));
    return measured;
  });
  expect(marker.width).toBe(2);
  expect(marker.height).toBeGreaterThan(2);
  expect(marker.left + marker.width / 2).toBeCloseTo(marker.nextLeft, 0);
  await expect(tools.locator('.studio-gap-line')).toHaveCount(0);
});

test('dashboard saves through the editor tab holding Studio write ownership', async ({ context, page }) => {
  await page.goto('/studio');
  await expect.poll(() => page.evaluate(() => navigator.locks.query().then(result => result.held?.some(lock => lock.name === 'acm-studio-writer-v1')))).toBe(true);
  const dashboard = await context.newPage();
  try {
    await dashboard.goto('/');
    await expect(dashboard.locator('.dashboard-shell')).toHaveAttribute('data-dashboard-ready', 'true');
    const sites = dashboard.locator('.dashboard-site-grid .dashboard-card-reorder');
    const tools = dashboard.locator('.dashboard-tool-grid .dashboard-card-reorder');
    const siteId = await sites.nth(1).getAttribute('data-library-entry-id');
    const toolId = await tools.nth(1).getAttribute('data-library-entry-id');
    await sites.nth(1).getByRole('button', { name: /^Reorder / }).press('Alt+ArrowUp');
    await tools.nth(1).getByRole('button', { name: /^Reorder / }).press('Alt+ArrowUp');
    await expect.poll(() => dashboard.evaluate(() => JSON.parse(localStorage.getItem('acm-studio-dashboard-sites-order-v1') || '[]')[0])).toBe(siteId);
    await expect.poll(() => dashboard.evaluate(() => JSON.parse(localStorage.getItem('acm-studio-dashboard-tools-order-v1') || '[]')[0])).toBe(toolId);
    await dashboard.reload();
    await expect(sites.first()).toHaveAttribute('data-library-entry-id', siteId!);
    await expect(tools.first()).toHaveAttribute('data-library-entry-id', toolId!);
  } finally { await dashboard.close(); }
});
