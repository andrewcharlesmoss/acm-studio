import { expect, test } from '@playwright/test';

test('Site Editor stacks oversized Pages panes in a scrollable tablet workspace', async ({ page }) => {
  await page.setViewportSize({ width: 820, height: 900 });
  await page.goto('/studio/site-editor?site=test&documentId=test-site');

  await expect(page.locator('.site-editor-preview-layout > .two-left-pane-layout')).toHaveAttribute('data-arrangement', 'stacked');
  const tabletGeometry = await page.evaluate(() => {
    const main = document.querySelector('.site-editor-preview > main')!;
    const slots = [...document.querySelectorAll<HTMLElement>('.site-editor-preview-layout > .two-left-pane-layout > .two-left-pane-slot')];
    return {
      viewportBottom: window.innerHeight,
      mainBottom: main.getBoundingClientRect().bottom,
      mainScrolls: main.scrollHeight > main.clientHeight,
      panes: slots.map(slot => ({top:slot.getBoundingClientRect().top,bottom:slot.getBoundingClientRect().bottom})),
    };
  });
  expect(tabletGeometry.mainBottom).toBe(tabletGeometry.viewportBottom);
  expect(tabletGeometry.panes[0].bottom).toBe(tabletGeometry.viewportBottom);
  expect(tabletGeometry.panes[1].top).toBe(tabletGeometry.panes[0].bottom);
  expect(tabletGeometry.mainScrolls).toBe(true);

});


test('all three Site Editor panes collapse into a clear left-to-right ordered stack', async ({ page }) => {
  for (const width of [1440, 820, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/studio/site-editor?site=test&documentId=test-site');
    await expect.poll(() => page.locator('.site-editor-preview-layout .two-left-pane-control').first().evaluate(element => parseFloat((element as HTMLElement).style.top))).toBeGreaterThan(0);
    for (const label of ['Studio Navigation', 'Site Editor Navigation', 'Site Editor Pages']) {
      const show = page.getByRole('button', { name: `Show ${label}` });
      if (await show.isVisible()) { await show.focus(); await show.press('Enter'); }
    }
    for (const label of ['Studio Navigation', 'Site Editor Navigation', 'Site Editor Pages']) {
      const hide = page.getByRole('button', { name: `Hide ${label}` });
      await hide.focus();
      await hide.press('Enter');
      await expect(page.getByRole('button', { name: `Show ${label}` })).toBeVisible();
    }
    const controls = [
      page.getByRole('button', { name: 'Show Studio Navigation' }),
      page.getByRole('button', { name: 'Show Site Editor Navigation' }),
      page.getByRole('button', { name: 'Show Site Editor Pages' }),
    ];
    await expect.poll(async () => {
      const boxes = await Promise.all(controls.map(control => control.boundingBox()));
      return boxes.every(Boolean) && boxes[0]!.y < boxes[1]!.y && boxes[1]!.y < boxes[2]!.y;
    }).toBe(true);
    const rectangles = await Promise.all(controls.map(control => control.boundingBox()));
    expect(rectangles.every(Boolean)).toBe(true);
    const [first, second, third] = rectangles!;
    expect(first!.x).toBeCloseTo(second!.x, 0);
    expect(second!.x).toBeCloseTo(third!.x, 0);
    expect(first!.y).toBeLessThan(second!.y);
    expect(second!.y).toBeLessThan(third!.y);
    expect(second!.y - first!.y - first!.height).toBeGreaterThanOrEqual(9);
    expect(third!.y - second!.y - second!.height).toBeGreaterThanOrEqual(9);
    for (const control of [...controls].reverse()) { await control.focus(); await control.press('Enter'); }
    await expect(page.getByRole('button', { name: 'Hide Studio Navigation' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Hide Site Editor Navigation' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Hide Site Editor Pages' })).toBeVisible();
  }
});


test('Identity keeps its configured width beside the preview when the composition fits', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/studio/site-editor?site=test');
  const layout = page.locator('.site-editor-preview-layout > .two-left-pane-layout');
  await expect(page.getByRole('button', { name: 'Hide Site Editor Identity' })).toBeVisible();
  await expect.poll(async () => layout.evaluate(element => {
    const settings = element.querySelector('.two-left-pane-secondary')!.getBoundingClientRect();
    const preview = element.querySelector('.two-left-pane-content')!.getBoundingClientRect();
    const configured = parseFloat((element as HTMLElement).style.getPropertyValue('--two-left-secondary-width'));
    return Math.abs(settings.width - configured) < 1 && Math.abs(settings.top - preview.top) < 1 && preview.left >= settings.right && preview.width >= 240;
  })).toBe(true);
});


test('Identity responds to available width and retains keyboard collapse and reopening', async ({ page }) => {
  for (const width of [1280, 820, 390]) {
    await page.setViewportSize({width,height:900});
    await page.goto('/studio/site-editor?site=test');
    const layout = page.locator('.site-editor-preview-layout > .two-left-pane-layout');
    await expect.poll(() => layout.locator('.two-left-pane-control').first().evaluate(element => parseFloat((element as HTMLElement).style.top))).toBeGreaterThan(0);
    for (const label of ['Site Editor Navigation','Site Editor Identity']) {
      const show = page.getByRole('button',{name:`Show ${label}`});
      if (await show.isVisible()) { await show.focus(); await show.press('Enter'); }
    }
    await expect(layout).toHaveAttribute('data-arrangement',width===1280?'beside':'below');
    for (const label of ['Site Editor Navigation','Site Editor Identity']) {
      const hide = page.getByRole('button',{name:`Hide ${label}`});
      await hide.focus(); await hide.press('Enter');
    }
    await expect(layout).toHaveAttribute('data-arrangement','beside');
    const geometry=await layout.evaluate(element=>({
      slots:[...element.querySelectorAll('.two-left-pane-slot')].map(slot=>slot.getBoundingClientRect().width),
      content:element.querySelector('.two-left-pane-content')!.getBoundingClientRect().left-element.getBoundingClientRect().left,
    }));
    expect(geometry).toEqual({slots:[0,0],content:0});
    for (const label of ['Site Editor Navigation','Site Editor Identity']) {
      const show=page.getByRole('button',{name:`Show ${label}`});
      await show.focus();
      const box=await show.boundingBox();
      expect(box!.x).toBeGreaterThanOrEqual(0); expect(box!.x+box!.width).toBeLessThanOrEqual(width);
      await show.press('Enter');
      await expect(page.getByRole('button',{name:`Hide ${label}`})).toBeVisible();
    }
  }
});


test('Pane Library demonstrates beside, below and fully stacked container layouts', async ({ page }) => {
  await page.setViewportSize({width:1280,height:900});
  await page.goto('/studio/ui/panes#two-left-panes');
  const preview=page.getByRole('region',{name:'Two Left Panes Preview'});
  const layout=preview.locator('.two-left-pane-layout');
  const width=page.getByRole('combobox',{name:'Example Width',exact:true});
  for (const [value,arrangement] of [['760','beside'],['820','beside'],['390','stacked']]) {
    await width.selectOption(value);
    await expect(layout).toHaveAttribute('data-arrangement',arrangement);
  }
  await width.selectOption('760');
  const separator=preview.getByRole('separator',{name:'Resize Example Settings'});
  await separator.focus();
  await separator.press('ArrowRight');
  await expect(layout).toHaveAttribute('data-arrangement','below');
  await expect(preview.getByLabel('Example Title')).toHaveValue('Example website');
});


test('closed Site Editor navigation reopens at the left of Identity without overlapping Studio Navigation', async ({ page }) => {
  for (const width of [1440, 820, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/studio/site-editor?site=global');
    await expect.poll(() => page.locator('.site-editor-preview-layout .two-left-pane-control').first().evaluate(element => parseFloat((element as HTMLElement).style.top))).toBeGreaterThan(0);
    const studioShow = page.getByRole('button', { name: 'Show Studio Navigation' });
    if (!await studioShow.isVisible()) { const hide = page.getByRole('button', { name: 'Hide Studio Navigation' }); await hide.focus(); await hide.press('Enter'); }
    await expect(studioShow).toBeVisible();
    const navigationShow = page.getByRole('button', { name: 'Show Site Editor Navigation' });
    if (await navigationShow.isVisible()) await navigationShow.click();
    const identityShow = page.getByRole('button', { name: 'Show Site Editor Identity' });
    if (await identityShow.isVisible()) await identityShow.click();
    const navigationHide = page.getByRole('button', { name: 'Hide Site Editor Navigation' });
    await navigationHide.focus(); await navigationHide.press('Enter');
    await expect(studioShow).toBeVisible();
    const identityHide = page.getByRole('button', { name: 'Hide Site Editor Identity' });
    const geometry = async () => {
      const [studio, navigation, identity, pane] = await Promise.all([studioShow.boundingBox(), navigationShow.boundingBox(), identityHide.boundingBox(), page.locator('.site-editor-preview-layout .two-left-pane-secondary').boundingBox()]);
      if (!studio || !navigation || !identity || !pane) return null;
      return { studio, navigation, identity, pane };
    };
    await expect.poll(async () => {
      const boxes = await geometry();
      return boxes && { left: Math.round(boxes.navigation.x - boxes.pane.x), right: Math.round(boxes.identity.x + boxes.identity.width / 2 - boxes.pane.x - boxes.pane.width), gap: Math.round(boxes.navigation.y - boxes.studio.y - boxes.studio.height) };
    }, { message: `Collapsed navigation geometry at ${width}px` }).toEqual({ left: 0, right: 0, gap: 10 });
    await studioShow.focus(); await studioShow.press('Enter');
    const studioHide = page.getByRole('button', { name: 'Hide Studio Navigation' });
    await expect.poll(async () => {
      const [studio, navigation] = await Promise.all([studioHide.boundingBox(), navigationShow.boundingBox()]);
      return studio && navigation && Math.abs(studio.x + studio.width / 2 - navigation.x - navigation.width / 2) < 1 && navigation.y >= studio.y + studio.height;
    }).toBe(true);
    await navigationShow.focus();
    await navigationShow.press('Enter');
    await expect(page.getByRole('button', { name: 'Hide Site Editor Navigation' })).toBeVisible();
  }
});
