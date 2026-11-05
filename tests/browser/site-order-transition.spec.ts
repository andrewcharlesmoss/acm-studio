import { expect, test } from '@playwright/test';

test('site switches never show the default order before the saved order', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('acm-studio-site-order-v1', JSON.stringify(['test2', 'test', 'acm-studio']));
    const record = () => {
      const section = document.querySelector('.studio-local-sites');
      if (!section) return;
      const rows = [...section.querySelectorAll('.studio-site-drag-button')].filter(element => getComputedStyle(element).visibility === 'visible');
      if (rows.length === 3) {
        const orders = JSON.parse(sessionStorage.getItem('observed-site-orders') || '[]');
        orders.push(rows.map(row => row.getAttribute('aria-label')?.replace('Reorder ', '')));
        sessionStorage.setItem('observed-site-orders', JSON.stringify(orders));
      }
    };
    new MutationObserver(record).observe(document, { subtree: true, childList: true, attributes: true });
    document.addEventListener('DOMContentLoaded', record);
  });
  await page.goto('/studio?site=test&library=page');
  await expect(page.locator('.studio-local-sites .studio-site-drag-button')).toHaveCount(3);
  await expect(page.locator('.studio-local-sites .studio-site-drag-button').first()).toHaveAttribute('aria-label', 'Reorder Test2');
  await page.goto('/studio?site=test2&library=page');
  await expect(page.locator('.studio-local-sites .studio-site-drag-button').first()).toHaveAttribute('aria-label', 'Reorder Test2');
  const orders = await page.evaluate(() => JSON.parse(sessionStorage.getItem('observed-site-orders') || '[]'));
  expect(orders.length).toBeGreaterThan(0);
  for (const order of orders) expect(order.map((text: string) => text.replace(/\s+/g, ' ').trim())).toEqual(['Test2', 'Test', 'ACM Studio']);
});

test('site list remains available when the saved preference cannot be read', async ({ page }) => {
  await page.addInitScript(() => {
    const original = Storage.prototype.getItem;
    Storage.prototype.getItem = function (key) {
      if (key === 'acm-studio-site-order-v1') throw new Error('Storage unavailable');
      return original.call(this, key);
    };
  });
  await page.goto('/studio?site=test&library=page');
  const sites = page.locator('.studio-local-sites .studio-site-drag-button');
  await expect(sites).toHaveCount(3);
  await expect(sites.first()).toBeVisible();
  await expect(sites.first()).toHaveAttribute('aria-label', 'Reorder ACM Studio');
});
