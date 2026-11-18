import { expect, test } from '@playwright/test';
import { fullKeyboardLayout } from '@acm/icons/keyboard/layout';

test('platform symbols switch the full keyboard by pointer and keyboard', async ({ page }) => {
  await page.goto('/studio/ui/icons?collection=keyboard');
  const group = page.getByRole('radiogroup', { name: 'Platform' });
  const mac = group.getByRole('radio', { name: 'Mac' });
  const windows = group.getByRole('radio', { name: 'Windows' });
  await expect(mac).toBeChecked();
  await expect(page.getByRole('img', { name: 'Illustrative full-size UK Mac keyboard' })).toBeVisible();
  await expect(async () => {
    await mac.click();
    await windows.click();
    await expect(page.getByRole('img', { name: 'Illustrative full-size UK Windows keyboard' })).toBeVisible({ timeout: 1000 });
  }).toPass({ timeout: 15000 });
  await expect(windows).toBeChecked();
  await windows.focus();
  await page.keyboard.press('ArrowLeft');
  await expect(mac).toBeChecked();
  await expect(page.getByRole('img', { name: 'Illustrative full-size UK Mac keyboard' })).toBeVisible();
});

test('the compact Windows specimen selects UK keys and exports the same drawing', async ({ page }) => {
  await page.goto('/studio/ui/icons?collection=keyboard');
  const windows = page.getByRole('radio', { name: 'Windows' });
  await expect(async () => {
    await windows.click();
    await expect(page.getByRole('img', { name: 'Illustrative full-size UK Windows keyboard' })).toBeVisible({ timeout: 1000 });
  }).toPass({ timeout: 15000 });

  const specimen = page.getByRole('group', { name: 'Select a keyboard key' });
  const copilot = specimen.getByRole('button', { name: 'Copilot', exact: true });
  await copilot.click();
  await expect(copilot).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.press('ArrowLeft');
  await expect(specimen.getByRole('button', { name: 'AltGr', exact: true })).toBeFocused();

  const pound = specimen.getByRole('button', { name: '3 / £', exact: true });
  await pound.click();
  await expect(pound).toHaveAttribute('aria-pressed', 'true');

  const image = page.getByRole('img', { name: 'Illustrative full-size UK Windows keyboard' });
  const preview = decodeURIComponent((await image.getAttribute('src'))!.split(',')[1]);
  const enter = specimen.getByRole('button', { name: 'Return / Enter', exact: true });
  const hitOutline = await enter.getAttribute('d');
  expect(preview).toContain(`d="${hitOutline}"`);

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('region', { name: 'Full-size keyboards' }).getByRole('button', { name: 'Download SVG', exact: true }).click(),
  ]);
  expect(download.suggestedFilename()).toBe('uk-windows-full-keyboard.svg');
  const svg = Buffer.concat(await (await download.createReadStream()).toArray()).toString();
  expect(svg).toContain(`d="${hitOutline}"`);
  expect(svg).toContain('Full-size UK Windows keyboard');

  await page.setContent(svg);
  const layout = fullKeyboardLayout('windows');
  const frame = (id: string) => {
    const key = layout.keys.find(key => key.id === id)!;
    return page.locator(`svg > g[transform="translate(${key.x} ${key.y})"] > path:first-child`);
  };
  const bracketBottom = await frame('punct-right-bracket').evaluate(path => {
    const box = (path as SVGPathElement).getBBox();
    return box.y + box.height;
  });
  // At the Enter overhang, the edge should line up with the adjacent ] key.
  const notch = await frame('enter').evaluate((element, y) => {
    const path = element as SVGPathElement;
    return [-0.25, 0.25].map(offset => path.isPointInFill(new DOMPoint(8, y + offset)));
  }, bracketBottom);
  expect.soft(notch).toEqual([true, false]);

  const navigation = ['insert', 'home', 'delete-forward', 'end'];
  const modifiers = ['windows-control-left', 'windows-fn', 'windows-alt-left', 'windows-altgr', 'windows-control-right'];
  const keys = fullKeyboardLayout('windows').keys.filter(key =>
    key.id === 'print-screen' || /^f\d+$|^keypad-[0-9]$/.test(key.id) || navigation.includes(key.id) || modifiers.includes(key.id));
  const legendBounds = await page.evaluate(keys => keys.map(key => {
    const groups = document.querySelectorAll<SVGGElement>(`svg > g[transform="translate(${key.x} ${key.y})"] > g`);
    const legends = Array.from(groups, group => {
      const bounds = group.getBBox();
      const translate = group.transform.baseVal.getItem(0).matrix;
      const scale = group.transform.baseVal.getItem(1).matrix.a;
      const stroke = parseFloat(getComputedStyle(group).strokeWidth) * scale / 2;
      return {
        left: translate.e + bounds.x * scale - stroke,
        right: translate.e + (bounds.x + bounds.width) * scale + stroke,
        centreY: translate.f + (bounds.y + bounds.height / 2) * scale,
        height: bounds.height * scale,
      };
    });
    return { id: key.id, legends };
  }), keys);
  const print = layout.keys.find(key => key.id === 'print-screen')!;
  const printLegends = legendBounds.find(key => key.id === print.id)!.legends;
  expect(printLegends).toHaveLength(2);
  const capturePaths = page.locator(`svg > g[transform="translate(${print.x} ${print.y})"] > g:first-of-type > path`);
  await expect(capturePaths).toHaveCount(2);
  const capture = await capturePaths.evaluateAll(elements => {
    const [frame, plus] = elements as SVGPathElement[];
    const box = plus.getBBox();
    const x = box.x + box.width / 2, y = box.y + box.height / 2;
    const corners = frame.getBBox();
    const start = frame.getPointAtLength(0), end = frame.getPointAtLength(frame.getTotalLength());
    return {
      open: Math.hypot(end.x - start.x, end.y - start.y) > 3,
      lowerRight: x > corners.x + corners.width / 2 && y > corners.y + corners.height / 2,
      crossed: [[0.3, 0], [-0.3, 0], [0, 0.3], [0, -0.3]].every(([dx, dy]) =>
        plus.isPointInStroke(new DOMPoint(x + dx * box.width, y + dy * box.height))),
    };
  });
  expect(capture).toEqual({ open: true, lowerRight: true, crossed: true });
  const [screen, label] = printLegends;
  expect((screen.left + screen.right) / 2).toBeCloseTo(print.width / 2, 1);
  expect(label.left - screen.right).toBeGreaterThan(3);
  expect(label.centreY).toBeGreaterThan(screen.centreY + 4);
  expect(print.width - label.right).toBeGreaterThan(4);
  expect(print.width - label.right).toBeLessThan(10);
  for (const { id, legends: [pictogram, caption] } of legendBounds.filter(key => /^f\d+$/.test(key.id))) {
    expect(caption.left - pictogram.right, `${id} has space between its shortcut and F-number`).toBeGreaterThanOrEqual(3);
  }
  const keypadDigitCentres = legendBounds.filter(key => key.id.startsWith('keypad-')).map(key => key.legends[0].centreY);
  expect(Math.max(...keypadDigitCentres) - Math.min(...keypadDigitCentres)).toBeLessThan(1);
  for (const family of [navigation, modifiers]) {
    const captions = legendBounds.filter(key => family.includes(key.id)).map(key => key.legends[0]);
    for (const caption of captions) expect(caption.centreY).toBeCloseTo(24, 1);
    const heights = captions.map(caption => caption.height);
    expect(Math.max(...heights) - Math.min(...heights)).toBeLessThan(1.4);
  }
});
