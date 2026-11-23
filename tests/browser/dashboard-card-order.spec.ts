import { expect, test } from '@playwright/test';

test('dashboard cards reorder independently and retain order', async ({ page }) => {
  await page.goto('/');
  const sites = page.locator('.dashboard-site-grid');
  const tools = page.locator('.dashboard-tool-grid');
  const siteCards = sites.locator('.card-shuffle-slot');
  const toolCards = tools.locator('.card-shuffle-slot');
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


test('dashboard saves through the editor tab holding Studio write ownership', async ({ context, page }) => {
  await page.goto('/studio');
  await expect.poll(() => page.evaluate(() => navigator.locks.query().then(result => result.held?.some(lock => lock.name === 'acm-studio-writer-v1')))).toBe(true);
  const dashboard = await context.newPage();
  try {
    await dashboard.goto('/');
    await expect(dashboard.locator('.dashboard-shell')).toHaveAttribute('data-dashboard-ready', 'true');
    const sites = dashboard.locator('.dashboard-site-grid .card-shuffle-slot');
    const tools = dashboard.locator('.dashboard-tool-grid .card-shuffle-slot');
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

for (const { label, width, from, to, across } of [
  { label: "within a row", width: 1150, from: 0, to: 1, across: 0.4 },
  { label: "up a wrapped row", width: 1150, from: 4, to: 0, across: 0.85 },
  { label: "up a single column", width: 390, from: 1, to: 0, across: 0.85 },
]) {
  test(`the first drag puts a site card in the card slot ${label}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1200 });
    await page.goto('/');
    await expect(page.locator('.dashboard-shell')).toHaveAttribute('data-dashboard-ready', 'true');
    const grid = page.locator('.dashboard-site-grid');
    const cards = grid.locator('.card-shuffle-slot');
    const handle = cards.nth(from).getByRole('button', { name: /^Reorder / });
    await handle.scrollIntoViewIfNeeded();
    const original = await cards.evaluateAll(nodes => nodes.map(node => node.getAttribute('data-library-entry-id')));
    const expected = [...original];
    expected.splice(to, 0, ...expected.splice(from, 1));
    const grip = (await handle.boundingBox())!;
    const target = (await cards.nth(to).boundingBox())!;
    const end = { x: target.x + target.width * across, y: target.y + target.height / 2 };
    await page.mouse.move(grip.x + grip.width / 2, grip.y + grip.height / 2);
    await page.mouse.down();
    await page.mouse.move(end.x, end.y, { steps: 12 });
    await expect(cards.nth(to)).toHaveAttribute('data-destination', 'true');
    await page.mouse.up();
    await expect.poll(() => cards.evaluateAll(nodes => nodes.map(node => node.getAttribute('data-library-entry-id')))).toEqual(expected);
    await expect(grid.locator('[data-destination]')).toHaveCount(0);
    await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('acm-studio-dashboard-sites-order-v1') || '[]'))).toEqual(expected);
  });
}

test('Loquage opens the bottom-left slot while held, then lands there on release', async ({ page }) => {
  const start = ['acm-account', 'acm-studio', 'test', 'test2', 'lid-angle', 'andrew-moss', 'loquafy', 'loquage', 'habit-tracker'];
  const savedKey = 'acm-studio-dashboard-sites-order-v1';
  await page.addInitScript(({ start, savedKey }) => {
    if (!localStorage.getItem(savedKey)) localStorage.setItem(savedKey, JSON.stringify(start));
  }, { start, savedKey });
  await page.setViewportSize({ width: 1280, height: 1700 });
  await page.goto('/');
  const grid = page.getByRole('group', { name: 'Site cards' });
  const loquage = grid.locator('[data-library-entry-id="loquage"]');
  const habit = grid.locator('[data-library-entry-id="habit-tracker"]');
  const handle = loquage.getByRole('button', { name: 'Reorder Loquage' });
  await expect(handle).toHaveAttribute('aria-disabled', 'false');
  const source = (await loquage.boundingBox())!;
  const target = (await habit.boundingBox())!;
  expect(target.y).toBeGreaterThan(source.y);
  const begin = async () => {
    const grip = (await handle.boundingBox())!;
    await page.mouse.move(grip.x + grip.width / 2, grip.y + grip.height / 2);
    await page.mouse.down();
    await page.mouse.move(target.x - 4, target.y + target.height / 2, { steps: 12 });
    await expect(habit).toHaveAttribute('data-destination', 'true');
    await expect.poll(async () => {
      const box = (await habit.locator('.card-shuffle-face').boundingBox())!;
      return Math.abs(box.x - source.x) + Math.abs(box.y - source.y);
    }).toBeLessThan(2);
    expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), savedKey)).toEqual(start);
  };
  await begin();
  await page.keyboard.press('Escape');
  await page.mouse.up();
  await expect(grid.locator('[data-destination]')).toHaveCount(0);
  expect((await habit.boundingBox())!.x).toBe(target.x);
  await begin();
  await page.mouse.up();
  const expected = [...start.slice(0, -2), 'habit-tracker', 'loquage'];
  await expect.poll(() => page.evaluate(key => JSON.parse(localStorage.getItem(key)!), savedKey)).toEqual(expected);
  await page.reload();
  await expect(grid.locator('.card-shuffle-slot').last()).toHaveAttribute('data-library-entry-id', 'loquage');
  const landed = (await loquage.boundingBox())!;
  expect(Math.abs(landed.x - target.x)).toBeLessThan(1);
  expect(landed.y).toBeGreaterThan((await habit.boundingBox())!.y);
});

for (const { width, columns } of [{ width: 1280, columns: 4 }, { width: 900, columns: 2 }]) {
  test(`each site row previews its first and last slots with ${columns} columns`, async ({ page }) => {
    await page.setViewportSize({ width, height: 2600 });
    await page.goto('/');
    await expect(page.locator('.dashboard-shell')).toHaveAttribute('data-dashboard-ready', 'true');
    const grid = page.locator('.dashboard-site-grid');
    const cards = grid.locator('.card-shuffle-slot');
    const handles = grid.getByRole('button', { name: /^Reorder / });
    const destinationSlot = grid.locator('[data-destination]');
    const order = () => cards.evaluateAll(nodes => nodes.map(node => node.getAttribute('data-library-entry-id')));
    const original = await order();
    const bounds = await cards.evaluateAll(nodes => nodes.map(node => {
      const rect = node.getBoundingClientRect();
      return { left: rect.left, right: rect.right, top: rect.top, middle: rect.top + rect.height / 2 };
    }));

    expect(bounds.filter(card => card.top === bounds[0].top)).toHaveLength(columns);
    for (let start = 0; start < bounds.length; start += columns) {
      const end = Math.min(start + columns, bounds.length) - 1;
      for (const { index, side } of [{ index: start, side: 'left' }, { index: end, side: 'right' }] as const) {
        const destination = bounds[index];
        const gapIndex = side === 'left' ? index : index + 1;
        // Pick a source outside the gap so this would be an effective move.
        const sourceIndex = gapIndex < 2 ? bounds.length - 1 : 0;
        const grip = (await handles.nth(sourceIndex).boundingBox())!;
        await page.mouse.move(grip.x + grip.width / 2, grip.y + grip.height / 2);
        await page.mouse.down();
        await page.mouse.move(destination[side] + (side === 'left' ? -4 : 4), destination.middle, { steps: 8 });
        await expect(destinationSlot).toHaveAttribute('data-library-entry-id', original[index]!);
        await page.keyboard.press('Escape');
        await page.mouse.up();
        await expect(destinationSlot).toHaveCount(0);
      }
    }
    await expect.poll(order).toEqual(original);
  });
}

test('the UI Library shuffle previews, cancels an outside drop, and supports keyboard, undo and reset', async ({ page }) => {
  await page.goto('/studio/ui/controls/drag-placement');
  const specimen = page.getByRole('group', { name: 'Drag-to-position controls' });
  const grid = specimen.getByRole('group', { name: 'Card shuffle example' });
  await expect(async () => {
    await specimen.getByRole('combobox', { name: 'Layout' }).selectOption('shuffle');
    await expect(grid).toBeVisible({ timeout: 1000 });
  }).toPass({ timeout: 10000 });
  const slots = grid.locator('.card-shuffle-slot');
  const handle = grid.getByRole('button', { name: 'Reorder First item' });
  await grid.scrollIntoViewIfNeeded();
  const grip = (await handle.boundingBox())!;
  const target = (await slots.nth(1).boundingBox())!;
  await page.mouse.move(grip.x + grip.width / 2, grip.y + grip.height / 2);
  await page.mouse.down();
  await page.mouse.move(target.x + target.width / 2, target.y + target.height / 2, { steps: 10 });
  await expect(slots.nth(1)).toHaveAttribute('data-destination', 'true');
  const bounds = (await grid.boundingBox())!;
  await page.mouse.move(bounds.x + bounds.width / 2, bounds.y - 18);
  await page.mouse.up();
  await expect(slots.first()).toHaveAttribute('data-library-entry-id', 'first');
  await expect(grid.locator('[data-destination]')).toHaveCount(0);
  await handle.press('Alt+ArrowRight');
  await expect(slots.nth(1)).toHaveAttribute('data-library-entry-id', 'first');
  await expect(handle).toBeFocused();
  await specimen.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(slots.first()).toHaveAttribute('data-library-entry-id', 'first');
  await specimen.getByRole('button', { name: 'Redo', exact: true }).click();
  await specimen.getByRole('button', { name: 'Reset example' }).click();
  await expect(slots.first()).toHaveAttribute('data-library-entry-id', 'first');
  await specimen.getByRole('checkbox', { name: 'Read-only example' }).check();
  await expect(handle).toBeDisabled();
});

test('a touch drag shuffles a single-column grid with reduced motion', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, reducedMotion: 'reduce' });
  try {
    const page = await context.newPage();
    await page.goto('/');
    const grid = page.getByRole('group', { name: 'Site cards' });
    const slots = grid.locator('.card-shuffle-slot');
    const grip = slots.first().getByRole('button', { name: /^Reorder / });
    await expect(grip).toBeEnabled();
    await slots.first().evaluate(el => el.scrollIntoView({ block: 'start' }));
    const sourceId = await slots.first().getAttribute('data-library-entry-id');
    const handle = (await grip.boundingBox())!;
    const second = (await slots.nth(1).boundingBox())!;
    const client = await context.newCDPSession(page);
    await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: handle.x + handle.width / 2, y: handle.y + handle.height / 2 }] });
    await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: second.x + 30, y: second.y + 35 }] });
    await expect(slots.nth(1)).toHaveAttribute('data-destination', 'true');
    await expect(slots.nth(1).locator('.card-shuffle-face')).toHaveCSS('transition-property', 'none');
    const viewportHeight = page.viewportSize()!.height;
    const offscreenIndex = await slots.evaluateAll((nodes, height) => nodes.findIndex(node => node.getBoundingClientRect().top > height), viewportHeight);
    expect(offscreenIndex).toBeGreaterThan(1);
    await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: second.x + 30, y: viewportHeight - 5 }] });
    await expect(slots.nth(offscreenIndex)).toHaveAttribute('data-destination', 'true');
    await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await expect(slots.nth(offscreenIndex)).toHaveAttribute('data-library-entry-id', sourceId!);
  } finally { await context.close(); }
});
