import { expect, test } from '@playwright/test';

for (const host of ['library', 'site'] as const) {
  test(`${host} preview reflows vertically and its resize grip tracks the pointer`, async ({ page }) => {
    await page.setViewportSize({ width: 1900, height: 1000 });
    if (host === 'library') {
      await page.goto('/studio/ui/blocks/paragraph');
      await expect(page.locator('.ui-block-specimen')).toHaveAttribute('data-ready', 'true');
    } else {
      await page.route('**/__studio/**', route => route.abort());
      await page.goto('/studio/site-editor');
      await expect.poll(async () => {
        await page.locator('.site-editor-preview-scope select').selectOption('global');
        return page.getByRole('group', { name: 'Current design scope' }).innerText();
      }).toBe('Global Defaults');
    }
    const stage = page.locator(host === 'library' ? '.ui-library-block-preview-stage' : '.site-preview-stage').first();
    const frame = stage.locator('.studio-preview-frame');
    const handle = stage.getByRole('separator', { name: 'Resize preview', exact: true });
    await expect.poll(async () => Number(await handle.getAttribute('aria-valuemax'))).toBeGreaterThan(700);
    await handle.focus(); await page.keyboard.press('End');
    const fit = await frame.boundingBox();
    if (host === 'library') {
      await expect(page.getByRole('heading', { name: 'Paragraph', level: 1 })).toBeVisible();
      const heading = page.locator('.ui-block-navigation-detail');
      const tabs = page.getByRole('tablist', { name: 'Studio UI Library Sections' });
      const headingBox = (await heading.boundingBox())!;
      const tabsBox = (await tabs.boundingBox())!;
      expect(headingBox.x + headingBox.width).toBeLessThanOrEqual(fit!.x);
      expect(Math.abs(fit!.y - (tabsBox.y + tabsBox.height))).toBeLessThan(1);
      expect(Math.abs(fit!.y + fit!.height - await page.evaluate(() => window.innerHeight))).toBeLessThan(1);
      const documentTop = await frame.evaluate(el => el.getBoundingClientRect().top + window.scrollY);
      await page.mouse.move(fit!.x + fit!.width / 2, Math.min(900, fit!.y + fit!.height / 2));
      await page.mouse.wheel(0, 400);
      await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
      await expect.poll(() => frame.evaluate(el => el.getBoundingClientRect().top + window.scrollY)).toBeCloseTo(documentTop, 0);
      await page.evaluate(() => window.scrollTo(0, 0));
    }
    await handle.focus(); await page.keyboard.press('Home');
    const narrow = await frame.boundingBox();
    expect(fit!.height).toBeGreaterThan(narrow!.height + 30);
    if (host === 'library') {
      const tabs = (await page.getByRole('tablist', { name: 'Studio UI Library Sections' }).boundingBox())!;
      const topGap = narrow!.y - tabs.y - tabs.height;
      const bottomGap = await page.evaluate(() => window.innerHeight) - narrow!.y - narrow!.height;
      expect(Math.abs(topGap - bottomGap)).toBeLessThan(1);
    }
    await handle.scrollIntoViewIfNeeded();
    const grip = (await handle.boundingBox())!;
    const x = grip.x + grip.width / 2; const y = grip.y + grip.height / 2;
    await page.mouse.move(x, y); await page.mouse.down(); await page.mouse.move(x - 30, y);
    await expect.poll(async () => { const next = (await handle.boundingBox())!; return Math.abs(next.x + next.width / 2 - (x - 30)); }).toBeLessThan(1);
    await expect.poll(async () => { const next = (await handle.boundingBox())!; return Math.abs(next.y + next.height / 2 - y); }).toBeLessThan(1);
    await expect.poll(async () => (await frame.boundingBox())!.height).toBeGreaterThan(narrow!.height + 5);
    await page.mouse.up();
    if (host === 'library') {
      const size = await frame.boundingBox();
      const blockPane = page.getByRole('complementary', { name: 'Paragraph Local Styles', exact: true });
      await blockPane.getByRole('button', { name: 'Preview', exact: true }).click();
      await expect.poll(async () => (await frame.boundingBox())!.height).toBeCloseTo(size!.height, 0);
      await blockPane.getByRole('button', { name: 'Edit', exact: true }).click();
      await expect.poll(async () => (await frame.boundingBox())!.height).toBeCloseTo(size!.height, 0);
    }
  });
}

test('Library preview stays centred and the grip follows a long horizontal drag', async ({ page }) => {
  await page.setViewportSize({ width: 1900, height: 1000 });
  await page.goto('/studio/ui/blocks/paragraph');
  await expect(page.locator('.ui-block-specimen')).toHaveAttribute('data-ready', 'true');
  const stage = page.locator('.ui-library-block-preview-stage');
  const frame = stage.locator('.studio-preview-frame');
  const handle = stage.getByRole('separator', { name: 'Resize preview' });
  await handle.focus(); await page.keyboard.press('End');
  await expect.poll(async () => { const box = (await frame.boundingBox())!; const tabs = (await page.getByRole('tablist', { name: 'Studio UI Library Sections' }).boundingBox())!; return Math.abs(box.y + box.height / 2 - (tabs.y + tabs.height + await page.evaluate(() => window.innerHeight)) / 2); }).toBeLessThan(1);
  const initial = (await handle.boundingBox())!;
  const x = initial.x + initial.width / 2; const y = initial.y + initial.height / 2;
  await page.mouse.move(x, y); await page.mouse.down();
  for (const delta of [40, 80, 120, 160, 200]) {
    await page.mouse.move(x + delta, y);
    await expect.poll(async () => { const box = (await handle.boundingBox())!; return Math.hypot(box.x + box.width / 2 - x - delta, box.y + box.height / 2 - y); }).toBeLessThan(1);
    await expect.poll(async () => { const box = (await frame.boundingBox())!; const tabs = (await page.getByRole('tablist', { name: 'Studio UI Library Sections' }).boundingBox())!; return Math.abs(box.y + box.height / 2 - (tabs.y + tabs.height + await page.evaluate(() => window.innerHeight)) / 2); }).toBeLessThan(1);
  }
  await page.mouse.up();
  const back = page.locator('.ui-block-navigation-detail').getByRole('button', { name: 'Blocks', exact: true });
  await back.focus(); await expect(back).toBeFocused(); await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Blocks', level: 1 })).toBeVisible();
});

for (const width of [820, 390]) test(`block title remains visible in the content area at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 });
  await page.goto('/studio/ui/blocks/paragraph');
  await expect(page.locator('.ui-block-specimen')).toHaveAttribute('data-ready', 'true');
  await expect(page.locator('.ui-block-detail-page > h1')).toBeVisible();
  await expect(page.locator('.ui-block-navigation-detail')).toBeHidden();
});

for (const [width, desktop] of [[1000, false], [1001, true]] as const) test(`block heading switches cleanly at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 });
  await page.goto('/studio/ui/blocks/paragraph');
  await expect(page.locator('.ui-block-specimen')).toHaveAttribute('data-ready', 'true');
  await expect(page.locator('.ui-block-navigation-detail')).toBeVisible({ visible: desktop });
  await expect(page.locator('.ui-block-detail-page > h1')).toBeVisible({ visible: !desktop });
  await expect(page.getByRole('heading', { name: 'Paragraph', level: 1 })).toBeVisible();
});

test('desktop heading and centred preview remain separate at 200% page zoom', async ({ page }) => {
  await page.setViewportSize({ width: 1900, height: 1000 });
  await page.goto('/studio/ui/blocks/paragraph');
  await expect(page.locator('.ui-block-specimen')).toHaveAttribute('data-ready', 'true');
  await page.evaluate(() => { document.body.style.zoom = '2'; });
  const heading = page.getByRole('heading', { name: 'Paragraph', level: 1 });
  const frame = page.locator('.ui-library-block-preview-stage .studio-preview-frame');
  await expect(heading).toBeVisible();
  await expect(frame).toBeVisible();
  const [title, preview] = await Promise.all([heading.boundingBox(), frame.boundingBox()]);
  expect(title!.x + title!.width).toBeLessThanOrEqual(preview!.x + 1);
});
