import { expect, test } from '@playwright/test';

test('inspector panes extend beside disclosures without changing preview resizing', async ({ page }) => {
  await page.setViewportSize({ width: 1900, height: 1000 });
  await page.goto('/studio/ui/blocks/paragraph');
  const detail = page.locator('.ui-block-detail-page');
  const inspector = detail.locator('.ui-block-inspector');
  const disclosure = detail.locator('.ui-block-inventory');
  const frame = detail.locator('.studio-preview-frame');
  await expect(detail).toHaveClass(/is-comparison/);
  await expect.poll(async () => {
    const [pane, pageBox, menu] = await Promise.all([inspector.boundingBox(), detail.boundingBox(), disclosure.boundingBox()]);
    const leftSpace = menu!.x - pageBox!.x;
    const rightSpace = pane!.x - menu!.x - menu!.width;
    return Math.max(Math.abs(pane!.y + pane!.height - pageBox!.y - pageBox!.height), Math.abs(leftSpace - rightSpace));
  }).toBeLessThan(2);
  const secondDisclosure = detail.locator('.ui-block-compatibility-notes');
  await expect.poll(async () => {
    const [pane, pageBox, menu] = await Promise.all([inspector.boundingBox(), detail.boundingBox(), secondDisclosure.boundingBox()]);
    return Math.abs((menu!.x - pageBox!.x) - (pane!.x - menu!.x - menu!.width));
  }).toBeLessThan(2);
  const original = await disclosure.evaluate(el => el.getBoundingClientRect().top + window.scrollY);
  const width = (await frame.boundingBox())!.width;
  await page.getByRole('separator', { name: 'Resize preview', exact: true }).press('Home');
  await expect.poll(async () => (await frame.boundingBox())!.width).toBeLessThan(width);
  await expect.poll(() => disclosure.evaluate(el => el.getBoundingClientRect().top + window.scrollY)).toBeCloseTo(original, 0);
  await disclosure.locator('summary').click();
  await expect(disclosure).toHaveAttribute('open', '');
  await expect.poll(async () => {
    const [pane, pageBox] = await Promise.all([inspector.boundingBox(), detail.boundingBox()]);
    return Math.abs(pane!.y + pane!.height - pageBox!.y - pageBox!.height);
  }).toBeLessThan(2);
});

test('comparison controls centre between the visible library tabs and viewport bottom', async ({ page }) => {
  await page.setViewportSize({ width: 1900, height: 1000 });
  await page.goto('/studio/ui/blocks/paragraph');
  const block = page.getByRole('button', { name: 'Hide Paragraph Local Styles' });
  const styles = page.getByRole('button', { name: 'Hide Paragraph Global Styles' });
  const tabs = page.getByRole('tablist', { name: 'Studio UI Library Sections' });
  const centre = async (locator: typeof block) => { const box = (await locator.boundingBox())!; return box.y + box.height / 2; };
  const expected = async () => (Math.max(0, Math.min(await page.evaluate(() => window.innerHeight), (await tabs.boundingBox())!.y + (await tabs.boundingBox())!.height)) + await page.evaluate(() => window.innerHeight)) / 2;
  await expect.poll(async () => Math.abs(await centre(block) - await expected())).toBeLessThan(1);
  await expect.poll(async () => Math.abs(await centre(styles) - await expected())).toBeLessThan(1);
  await page.setViewportSize({ width: 1900, height: 800 });
  await expect.poll(async () => Math.abs(await centre(block) - await expected())).toBeLessThan(1);
  await expect.poll(async () => Math.abs(await centre(styles) - await expected())).toBeLessThan(1);
  await page.locator('.ui-block-inventory summary').click();
  await expect.poll(async () => Math.abs(await centre(block) - await expected())).toBeLessThan(1);
  await page.evaluate(() => window.scrollTo(0, 600));
  await expect.poll(async () => Math.abs(await centre(block) - await expected())).toBeLessThan(1);
  await expect.poll(async () => Math.abs(await centre(styles) - await expected())).toBeLessThan(1);
  await block.click();
  const reopen = page.getByRole('button', { name: 'Show Paragraph Local Styles' });
  await expect.poll(async () => Math.abs((await centre(reopen) + await centre(styles)) / 2 - await expected())).toBeLessThan(1);
  // Local now sits after Global, so their boundaries remain horizontally separate.
  await expect.poll(async () => Math.abs((await reopen.boundingBox())!.x - (await styles.boundingBox())!.x)).toBeGreaterThan(36);
  await expect.poll(async () => Math.abs(await centre(reopen) - await expected())).toBeLessThan(1);
  await expect.poll(async () => Math.abs(await centre(styles) - await expected())).toBeLessThan(1);
  await styles.click();
  const reopenStyles = page.getByRole('button', { name: 'Show Paragraph Global Styles' });
  await expect.poll(async () => Math.abs((await reopen.boundingBox())!.x - (await reopenStyles.boundingBox())!.x)).toBeLessThan(1);
  await expect.poll(async () => Math.abs((await centre(reopen) + await centre(reopenStyles)) / 2 - await expected())).toBeLessThan(1);
  await expect.poll(async () => await centre(reopen) - await centre(reopenStyles)).toBeGreaterThanOrEqual(36);
  await page.getByRole('button', { name: 'Hide Paragraph Universal Styles' }).click();
  const reopenUniversal = page.getByRole('button', { name: 'Show Paragraph Universal Styles' });
  const stack = [reopenUniversal, reopenStyles, reopen];
  await expect.poll(async () => Math.max(...await Promise.all(stack.map(async control => (await control.boundingBox())!.x))) - Math.min(...await Promise.all(stack.map(async control => (await control.boundingBox())!.x)))).toBeLessThan(1);
  await expect.poll(async () => Math.abs((await centre(reopenUniversal) + await centre(reopenStyles) + await centre(reopen)) / 3 - await expected())).toBeLessThan(1);
  await expect.poll(async () => await centre(reopenStyles) - await centre(reopenUniversal)).toBeGreaterThanOrEqual(36);
  await expect.poll(async () => await centre(reopen) - await centre(reopenStyles)).toBeGreaterThanOrEqual(36);
  for (const control of stack) {
    const box = (await control.boundingBox())!;
    expect(Math.abs(box.x + box.width - 1900)).toBeLessThanOrEqual(1);
  }
  await reopen.focus();
  await page.keyboard.press('Enter');
  await expect(block).toHaveAttribute('aria-expanded', 'true');
});
