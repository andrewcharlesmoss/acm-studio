import { expect, test } from '@playwright/test';
import { localPublicationScript } from '../../app/studio/test-site/publication-runtime';

test('generated Query Loops reveal eligible scheduled posts and rerank within the saved bound', async ({ page }) => {
  const start = Date.parse('2026-11-07T12:00:00Z');
  const due = start + 60_000;
  await page.setContent(`<div class="content-query-loop" data-query-count="1" data-query-order="desc" data-query-sticky-first="true">
    <div data-query-no-results>No posts yet</div>
    <template data-query-scheduled-candidate="${due}"><div class="content-query-post" data-query-post-id="newest" data-query-published-at="${new Date(due).toISOString()}" data-query-sticky="false"><a>Newest scheduled post</a></div></template>
    <template data-query-scheduled-candidate="${due}"><div class="content-query-post" data-query-post-id="sticky" data-query-published-at="${new Date(due).toISOString()}" data-query-sticky="true"><a>Sticky scheduled post</a></div></template>
  </div>`);
  await page.evaluate((time) => {
    Date.now = () => time;
    (window as typeof window & { publicationTick?: () => void }).setInterval = ((callback: TimerHandler) => {
      (window as typeof window & { publicationTick?: () => void }).publicationTick = callback as () => void;
      return 1;
    }) as typeof window.setInterval;
  }, start);
  await page.addScriptTag({ content: localPublicationScript() });
  await expect(page.locator('[data-query-no-results]')).toBeVisible();
  await expect(page.locator('.content-query-post')).toHaveCount(0);
  await page.evaluate((time) => {
    Date.now = () => time;
    (window as typeof window & { publicationTick?: () => void }).publicationTick?.();
  }, due + 1);
  await expect(page.locator('[data-query-no-results]')).toBeHidden();
  await expect(page.locator('.content-query-post')).toHaveCount(2);
  await expect(page.locator('.content-query-post').first()).toContainText('Sticky scheduled post');
  await expect(page.locator('.content-query-post').first()).toBeVisible();
  await expect(page.locator('.content-query-post').nth(1)).toBeHidden();
});
