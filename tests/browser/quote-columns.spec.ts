import { expect, test, type Page } from '@playwright/test';

const hosts = {
  library: { route: '/studio/ui/blocks/quote', body: 'A useful idea deserves a little space.', citation: 'A Studio reader' },
  content: { route: '/studio/ui/selection', body: 'Quote body', citation: 'Quote citation' },
  template: { route: '/studio/ui/selection/template', body: 'Template quote body', citation: 'Template quote citation' },
};

async function selectQuote(page: Page, body: string) {
  if (body === hosts.library.body) {
    await page.getByRole('group', { name: 'Select an example block', exact: true }).getByRole('button', { name: 'Quote', exact: true }).first().click();
  } else {
    await page.locator('.quote-field').filter({ hasText: body }).first().click({ position: { x: 2, y: 2 } });
  }
  await expect(page.getByRole('button', { name: 'Transform Quote block', exact: true })).toBeVisible();
}

for (const [host, fixture] of Object.entries(hosts)) {
  for (const target of ['Paragraph', 'Group', 'Columns']) {
    test(`Quote ${target} preserves body and citation through actual ${host} history`, async ({ page }) => {
      await page.goto(fixture.route);
      await selectQuote(page, fixture.body);
      const trigger = page.getByRole('button', { name: 'Transform Quote block', exact: true });
      await trigger.click();
      await page.keyboard.press('Escape');
      await expect(trigger).toBeFocused();
      await trigger.click();
      if (target === 'Columns' && host !== 'content') await page.screenshot({ path: `/private/tmp/acm-quote-${host}-columns-menu.png` });
      await page.getByRole('menuitem', { name: target, exact: true }).click();
      await expect(page.locator('.paragraph-field').filter({ hasText: fixture.body }).first()).toBeVisible();
      const citation = page.locator(target === 'Columns' ? '.quote-citation' : '.paragraph-field').filter({ hasText: fixture.citation }).first();
      await expect(citation).toBeVisible();
      if (target === 'Columns' && host !== 'content') await page.screenshot({ path: `/private/tmp/acm-quote-${host}-columns-result.png` });
      if (target === 'Columns') {
        const wrapped = page.locator('.studio-columns .quote-field').filter({ hasText: fixture.body });
        await expect(wrapped).toBeVisible();
        if (host === 'template') {
          await expect(wrapped.locator('.paragraph-field strong')).toHaveText(fixture.body);
          await expect(wrapped.locator('.quote-citation em')).toHaveText(fixture.citation);
        }
      }
      await page.getByRole('button', { name: 'More block options', exact: true }).first().focus();
      await page.keyboard.press('Meta+z');
      await expect(page.locator('.quote-field .quote-citation').filter({ hasText: fixture.citation }).first()).toBeVisible();
      await page.keyboard.press('Meta+Shift+z');
      await expect(citation).toBeVisible();
      await page.getByRole('button', { name: 'Preview', exact: true }).click();
      const preview = page.locator(host === 'library' ? '.ui-block-canvas' : '.document-preview');
      await expect(preview.getByText(fixture.body, { exact: true }).first()).toBeVisible();
      await expect(preview.getByText(fixture.citation, { exact: true }).first()).toBeVisible();
    });
  }
}

for (const width of [1440, 820, 390]) {
  test(`Quote Columns menu remains reachable at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(hosts.library.route);
    await selectQuote(page, hosts.library.body);
    const trigger = page.getByRole('button', { name: 'Transform Quote block', exact: true });
    await trigger.click();
    const choice = page.getByRole('menuitem', { name: 'Columns', exact: true });
    await expect(choice).toBeVisible();
    const box = await choice.boundingBox();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(width);
    await page.screenshot({ path: `/private/tmp/acm-quote-columns-menu-${width}.png` });
    await page.keyboard.press('Escape');
    await expect(trigger).toBeFocused();
    await page.screenshot({ path: `/private/tmp/acm-quote-columns-${width}.png` });
  });
}

// Root CSS zoom scales the portalled popup twice, so it cannot establish browser-zoom support.
test.skip('Quote Columns menu at native browser zoom 200% — requires browser UI verification', async () => {
  // CSS root zoom does not simulate native browser zoom. Native 200% remains unverified.
});

for (const host of ['content', 'template'] as const) {
  test(`Quote Default and Plain choices use actual ${host} history`, async ({ page }) => {
    const fixture = hosts[host];
    await page.goto(fixture.route);
    await selectQuote(page, fixture.body);
    const quote = page.locator('.quote-field').filter({ hasText: fixture.body }).first();
    const trigger = page.getByRole('button', { name: 'Transform Quote block', exact: true });
    await trigger.click();
    await page.getByRole('menuitemradio', { name: 'Plain', exact: true }).click();
    await expect(quote).toHaveClass(/is-style-plain/);
    await trigger.click();
    await expect(page.getByRole('menuitemradio', { name: 'Plain', exact: true })).toHaveAttribute('aria-checked', 'true');
    await page.getByRole('menuitemradio', { name: 'Default', exact: true }).click();
    await expect(quote).not.toHaveClass(/is-style-plain/);
    await trigger.focus();
    await page.keyboard.press('Meta+z');
    await expect(quote).toHaveClass(/is-style-plain/);
    await page.keyboard.press('Meta+Shift+z');
    await expect(quote).not.toHaveClass(/is-style-plain/);
  });
}
