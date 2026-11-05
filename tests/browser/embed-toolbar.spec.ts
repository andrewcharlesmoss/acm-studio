import { expect, test, type Page } from '@playwright/test';

async function openEmbed(page: Page, host = 'library') {
  await page.route('**/*', route => { const url = new URL(route.request().url()); return ['localhost', '127.0.0.1'].includes(url.hostname) ? route.continue() : route.abort(); });
  await page.goto(host === 'library' ? '/studio/ui/blocks/embed' : host === 'content' ? '/studio/ui/selection' : '/studio/ui/selection/template');
  await expect(page.locator(host === "library" ? ".ui-block-specimen" : ".selection-library-specimen")).toHaveAttribute("data-ready", "true");
  const id = host === 'library' ? 'embed-library-specimen' : host === 'content' ? 'inline-image-embed' : 'template-embed';
  const source = page.locator(`[data-studio-block-anchor-id="${id}"], [data-studio-nested-block-id="${id}"]`).first();
  if (host !== 'library') await source.focus();
  const toolbar = page.getByRole('group', { name: 'Embed block tools', exact: true }).filter({ visible: true });
  const edit = toolbar.getByRole('button', { name: 'Edit URL', exact: true });
  await expect(edit).toBeEnabled();
  return { source, toolbar, edit };
}

for (const host of ['library', 'content', 'template']) test(`Embed ${host} toolbar reuses the field for validation, cancel, URL-only change and history`, async ({ page }) => {
  const { source, toolbar, edit } = await openEmbed(page, host);
  const original = await source.getByRole('link', { name: 'Open original content', exact: true }).getAttribute('href');
  const caption = await source.locator('figcaption').textContent();
  const title = await source.getByRole('textbox', { name: 'Embed player title', exact: true }).inputValue();
  const emphasis = await source.locator('figcaption em').count();
  await edit.click();
  const input = source.getByRole('textbox', { name: 'Enter URL to embed', exact: true });
  await expect(input).toBeFocused(); await expect(input).toHaveValue(original!);
  await input.fill('https://example.test/preserved-open-draft'); await edit.click();
  await expect(input).toBeFocused(); await expect(input).toHaveValue('https://example.test/preserved-open-draft');
  await input.fill('javascript:alert(1)'); await source.getByRole('button', { name: 'Embed', exact: true }).click();
  await expect(source.getByRole('alert')).toContainText('Enter a valid web address');
  await source.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(edit).toBeFocused(); await expect(input).toHaveCount(0);
  await expect(source.getByRole('link', { name: 'Open original content', exact: true })).toHaveAttribute('href', original!);
  await source.locator('.embed-edit-url').click(); await expect(input).toBeFocused();
  await input.fill('https://example.test/cancelled'); await input.press('Escape');
  await expect(source.locator('.embed-edit-url')).toBeFocused();
  await edit.click(); await input.fill('https://vimeo.com/76979871');
  // An independently authored Advanced value must survive the pending URL draft.
  const advanced = page.getByRole('button', { name: 'Advanced', exact: true });
  if (await advanced.getAttribute('aria-expanded') !== 'true') await advanced.click();
  await page.getByRole('textbox', { name: 'HTML anchor', exact: true }).fill(`retained-${host}`);
  await source.getByRole('button', { name: 'Embed', exact: true }).click();
  await expect(input).toHaveCount(0); await expect(edit).toBeFocused();
  await expect(source.getByRole('link', { name: 'Open original content', exact: true })).toHaveAttribute('href', 'https://vimeo.com/76979871');
  await expect(page.getByRole('textbox', { name: 'HTML anchor', exact: true })).toHaveValue(`retained-${host}`);
  await expect(source.locator('figcaption')).toHaveText(caption!); await expect(source.locator('figcaption em')).toHaveCount(emphasis);
  await expect(source.locator('iframe')).toHaveAttribute('title', title);
  await expect(source.getByRole('textbox', { name: 'Embed player title', exact: true })).toHaveValue(title);
  await toolbar.getByRole('button', { name: 'More block options', exact: true }).focus();
  await page.keyboard.press('Meta+z'); await expect(source.getByRole('link', { name: 'Open original content', exact: true })).toHaveAttribute('href', original!);
  await page.keyboard.press('Meta+Shift+z'); await expect(source.getByRole('link', { name: 'Open original content', exact: true })).toHaveAttribute('href', 'https://vimeo.com/76979871');
  await page.getByRole('button', { name: 'Preview', exact: true }).click();
  await expect(page.locator('.embed-player-block').filter({ has: page.locator('a[href="https://vimeo.com/76979871"]') }).locator('figcaption')).toHaveText(caption!);
});

for (const host of ['library', 'content', 'template']) for (const wrapper of ['Group', 'Columns']) test(`Embed ${wrapper} wrapping preserves the ${host} source and history`, async ({ page }) => {
  const { source, toolbar } = await openEmbed(page, host);
  const url = await source.getByRole('link', { name: 'Open original content', exact: true }).getAttribute('href');
  const caption = await source.locator('figcaption').textContent();
  const wrapperClass = wrapper === 'Columns' ? 'studio-columns' : host === 'template' ? 'template-group' : 'studio-nested-group';
  const ancestors = source.locator(`xpath=ancestor::*[contains(concat(' ',normalize-space(@class),' '),' ${wrapperClass} ')]`);
  const initial = await ancestors.count();
  await toolbar.getByRole('button', { name: 'Transform Embed block', exact: true }).click();
  await page.getByRole('menuitem', { name: wrapper, exact: true }).click();
  const wrapperToolbar = page.getByRole('group', { name: `${wrapper} block tools`, exact: true }).filter({ visible: true });
  await expect(wrapperToolbar).toBeVisible(); await expect(ancestors).toHaveCount(initial + 1);
  await expect(source.getByRole('link', { name: 'Open original content', exact: true })).toHaveAttribute('href', url!);
  await wrapperToolbar.getByRole('button', { name: 'More block options', exact: true }).focus();
  await page.keyboard.press('Meta+z'); await expect(ancestors).toHaveCount(initial);
  await page.keyboard.press('Meta+Shift+z'); await expect(ancestors).toHaveCount(initial + 1);
  await page.getByRole('button', { name: 'Preview', exact: true }).click();
  const preview = page.locator('.embed-player-block').filter({ has: page.locator(`a[href="${url}"]`) }).first();
  await expect(preview.locator('figcaption')).toHaveText(caption!); await preview.scrollIntoViewIfNeeded();
  await page.screenshot({ path: `/private/tmp/acm-embed-${host}-${wrapper.toLowerCase()}.png` });
});

for (const width of [1440, 820, 390]) test(`Embed URL controls are keyboard accessible and readonly-safe at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 1000 });
  const { source, edit, toolbar } = await openEmbed(page);
  await edit.scrollIntoViewIfNeeded(); await edit.focus(); await page.keyboard.press('Enter');
  const input = source.getByRole('textbox', { name: 'Enter URL to embed', exact: true });
  await expect(input).toBeFocused(); await input.fill('https://example.test/preserved-draft');
  await page.getByRole('checkbox', { name: 'Read-only example', exact: true }).check();
  await expect(input).toBeDisabled(); await expect(edit).toBeDisabled();
  await expect(input).toHaveValue('https://example.test/preserved-draft');
  await page.getByRole('checkbox', { name: 'Read-only example', exact: true }).uncheck();
  await expect(input).toBeEnabled(); await input.press('Escape'); await expect(edit).toBeFocused();
  // The shared toolbar stays on one row and uses canvas scrolling at narrow widths.
  await expect(toolbar).toHaveCSS('flex-wrap', 'nowrap');
  const actions = await toolbar.locator('button:enabled').all();
  await actions[0].focus();
  for (const [index, button] of actions.entries()) {
    if (index) await page.keyboard.press('Tab');
    await expect(button).toBeFocused();
    await expect(button).toBeInViewport({ ratio: 0.99 });
    const canvas = await page.locator('.ui-block-canvas').boundingBox();
    const rect = await button.boundingBox();
    expect(rect!.x).toBeGreaterThanOrEqual(canvas!.x - 1);
    expect(rect!.x + rect!.width).toBeLessThanOrEqual(canvas!.x + canvas!.width + 1);
  }
  await page.screenshot({ path: `/private/tmp/acm-embed-toolbar-${width}.png` });
});

test('Embed no-op URL edits do not create history and source changes dispose an obsolete draft', async ({ page }) => {
  const { source, toolbar, edit } = await openEmbed(page);
  const undo = page.getByRole('button', { name: 'Undo specimen change', exact: true });
  const original = await source.getByRole('link', { name: 'Open original content', exact: true }).getAttribute('href');
  const input = source.getByRole('textbox', { name: 'Enter URL to embed', exact: true });
  await expect(undo).toBeDisabled();
  await edit.click(); await source.getByRole('button', { name: 'Embed', exact: true }).click();
  await expect(input).toHaveCount(0); await expect(edit).toBeFocused(); await expect(undo).toBeDisabled();
  await edit.click(); await input.fill('https://example.test/unsupported-resource');
  await source.getByRole('button', { name: 'Embed', exact: true }).click();
  await expect(source.locator('.content-provider-embed')).toContainText('This URL cannot be embedded');
  await expect(source.locator('iframe')).toHaveCount(0);
  await edit.click(); await input.fill('https://example.test/obsolete-draft');
  const obsolete = await input.elementHandle();
  await toolbar.getByRole('button', { name: 'More block options', exact: true }).focus();
  await page.keyboard.press('Meta+z');
  await expect(source.getByRole('link', { name: 'Open original content', exact: true })).toHaveAttribute('href', original!);
  expect(await obsolete!.evaluate(element => element.isConnected)).toBe(false);
  await edit.click(); await expect(input).toHaveValue(original!); await input.press('Escape'); await expect(edit).toBeFocused();
});

test('Template URL pointer submit retains its hit target after repeated toolbar focus', async ({ page }) => {
  await page.addInitScript(() => {
    const nativeFocus = HTMLElement.prototype.focus;
    (window as unknown as { embedFocusOptions: boolean[] }).embedFocusOptions = [];
    HTMLElement.prototype.focus = function(options?: FocusOptions) {
      if (this.matches('.embed-url-placeholder-form input')) (window as unknown as { embedFocusOptions: boolean[] }).embedFocusOptions.push(options?.preventScroll === true);
      nativeFocus.call(this, options);
    };
  });
  const { source, edit } = await openEmbed(page, 'template');
  const input = source.getByRole('textbox', { name: 'Enter URL to embed', exact: true });
  for (let attempt = 0; attempt < 5; attempt++) {
    await edit.click();
    expect(await page.evaluate(() => (window as unknown as { embedFocusOptions: boolean[] }).embedFocusOptions.length > 0 && (window as unknown as { embedFocusOptions: boolean[] }).embedFocusOptions.every(Boolean))).toBe(true);
    await input.fill('https://example.test/draft'); await edit.click();
    await input.fill('javascript:alert(1)');
    await source.getByRole('button', { name: 'Embed', exact: true }).click();
    await expect(source.getByRole('alert')).toContainText('Enter a valid web address');
    await source.getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(edit).toBeFocused();
  }
});

for (const activation of ['form-enter', 'button-space', 'button-enter']) test(`Template Embed keeps native ${activation} submission and focus return`, async ({ page }) => {
  const { source, edit } = await openEmbed(page, 'template');
  await edit.click();
  const input = source.getByRole('textbox', { name: 'Enter URL to embed', exact: true });
  await input.fill('https://vimeo.com/76979871');
  if (activation === 'form-enter') await input.press('Enter');
  else {
    await input.press('Tab');
    await expect(source.getByRole('button', { name: 'Embed', exact: true })).toBeFocused();
    await page.keyboard.press(activation === 'button-space' ? 'Space' : 'Enter');
  }
  await expect(input).toHaveCount(0);
  await expect(source.getByRole('link', { name: 'Open original content', exact: true })).toHaveAttribute('href', 'https://vimeo.com/76979871');
  await expect(edit).toBeFocused();
});

test('Template Embed touch submission remains stable after editing the inspector', async ({ browser }) => {
  const context = await browser.newContext({ hasTouch: true, viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  try {
    const { source, edit } = await openEmbed(page, 'template');
    await edit.tap();
    const input = source.getByRole('textbox', { name: 'Enter URL to embed', exact: true });
    await input.fill('https://vimeo.com/76979871');
    const advanced = page.getByRole('button', { name: 'Advanced', exact: true });
    if (await advanced.getAttribute('aria-expanded') !== 'true') await advanced.tap();
    await page.getByRole('textbox', { name: 'HTML anchor', exact: true }).fill('retained-touch');
    await source.getByRole('button', { name: 'Embed', exact: true }).tap();
    await expect(input).toHaveCount(0);
    await expect(source.getByRole('link', { name: 'Open original content', exact: true })).toHaveAttribute('href', 'https://vimeo.com/76979871');
    await expect(page.getByRole('textbox', { name: 'HTML anchor', exact: true })).toHaveValue('retained-touch');
  } finally { await context.close(); }
});

test('Library edge toolbar actions accept pointer activation after horizontal scrolling', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  const { toolbar } = await openEmbed(page);
  const blocks = page.locator('.ui-library-canvas .canvas-block.is-embed');
  const initialCount = await blocks.count();
  expect(initialCount).toBeGreaterThan(0);
  const duplicate = toolbar.getByRole('button', { name: 'Duplicate block', exact: true });
  await duplicate.scrollIntoViewIfNeeded();
  await expect(duplicate).toBeInViewport({ ratio: 0.99 });
  await duplicate.click();
  await expect(blocks).toHaveCount(initialCount + 1);
  await page.getByRole('button', { name: 'Undo specimen change', exact: true }).click();
  await expect(blocks).toHaveCount(initialCount);
});

test('Library toolbar actions stay keyboard reachable in the minimum preview frame', async ({ page }) => {
  const { toolbar } = await openEmbed(page);
  const resize = page.getByRole('separator', { name: 'Resize preview', exact: true });
  const minimum = await resize.getAttribute('aria-valuemin');
  expect(minimum).not.toBeNull();
  await resize.press('Home');
  await expect(resize).toHaveAttribute('aria-valuenow', minimum!);
  const actions = await toolbar.locator('button:enabled').all();
  await actions[0].focus();
  for (const [index, button] of actions.entries()) {
    if (index) await page.keyboard.press('Tab');
    await expect(button).toBeFocused();
    await expect(button).toBeInViewport({ ratio: 0.99 });
    const frame = await page.locator('.ui-block-canvas .studio-preview-frame-content').boundingBox();
    const bounds = await button.boundingBox();
    expect(bounds!.x).toBeGreaterThanOrEqual(frame!.x - 1);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(frame!.x + frame!.width + 1);
  }
});
