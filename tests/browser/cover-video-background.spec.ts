import { expect, test } from '@playwright/test';

const sourceUrl = 'https://wordpress.tv/2025/12/03/state-of-the-word-2025/';
const playerUrl = 'https://video.wordpress.com/embed/4llYxnAK?hd=0&cover=1&muted=1&loop=1&autoplay=1';
const nativeVideoUrl = 'https://media.example.test/background.mp4';

test('Library empty Cover can transform to an empty Video with undo and redo', async ({ page }) => {
  await page.goto('/studio/ui/blocks/cover');
  await expect(page.locator('.ui-block-specimen')).toHaveAttribute('data-ready', 'true');
  const editor = page.locator('.ui-library-canvas');
  await editor.getByRole('textbox', { name: 'Type / to choose a block' }).fill('/cover');
  const chooser = page.getByRole('dialog', { name: 'Choose a block' });
  await expect(chooser).toBeVisible();
  await chooser.getByRole('button', { name: 'Cover', exact: true }).click();

  const selected = editor.locator('.canvas-block.is-selected');
  await selected.getByRole('button', { name: 'Transform Cover block', exact: true }).click();
  await page.getByRole('menu', { name: 'Transform block' }).getByRole('menuitem', { name: 'Video', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Video URL', exact: true })).toBeVisible();
  await expect(editor).toContainText('Video block');

  await page.getByRole('button', { name: 'Undo specimen change' }).click();
  await expect(page.getByRole('textbox', { name: 'Direct video file URL', exact: true })).toBeVisible();
  await expect(selected.getByRole('button', { name: 'Transform Cover block', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Redo specimen change' }).click();
  await expect(page.getByRole('textbox', { name: 'Video URL', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Reset Example', exact: true }).click();
});

test('Library Cover renders direct native video in Edit and Preview and suppresses it for reduced motion', async ({ page }) => {
  await page.route('https://media.example.test/**', route => route.abort());
  await page.goto('/studio/ui/blocks/cover');
  const specimen = page.locator('.ui-block-specimen');
  await expect(specimen).toHaveAttribute('data-ready', 'true');
  const inspector = specimen.locator('.ui-block-inspector');
  await inspector.getByRole('textbox', { name: 'Direct video file URL', exact: true }).fill(nativeVideoUrl);
  await inspector.getByRole('button', { name: 'Add native video', exact: true }).click();

  const backgroundVideo = specimen.locator('.content-cover-native-video video');
  await expect(backgroundVideo).toHaveAttribute('src', nativeVideoUrl);
  await expect.poll(() => backgroundVideo.evaluate((video: HTMLVideoElement) => ({ autoplay: video.autoplay, muted: video.muted, loop: video.loop, playsInline: video.playsInline }))).toEqual({ autoplay: true, muted: true, loop: true, playsInline: true });

  await specimen.getByRole('button', { name: 'Preview', exact: true }).click();
  await expect(backgroundVideo).toHaveAttribute('src', nativeVideoUrl);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(specimen.locator('.content-cover-native-video')).toHaveCount(0);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await expect(backgroundVideo).toHaveAttribute('src', nativeVideoUrl);
  await specimen.getByRole('button', { name: 'Reset Example', exact: true }).click();
});

test('Library Cover resolves WordPress.tv to its validated VideoPress background in Edit and Preview', async ({ page }) => {
  const requests: unknown[] = [];
  await page.route('**/api/embed/resolve', async route => {
    requests.push(route.request().postDataJSON());
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        provider: 'WordPress.tv', kind: 'frame', title: 'State of the Word 2025',
        src: 'https://video.wordpress.com/embed/4llYxnAK?hd=0&cover=1',
      }),
    });
  });

  await page.goto('/studio/ui/blocks/cover');
  await expect(page.locator('.ui-block-specimen')).toHaveAttribute('data-ready', 'true');
  const inspector = page.locator('.ui-block-inspector');
  await inspector.getByRole('textbox', { name: 'Background video URL', exact: true }).fill(sourceUrl);
  await inspector.getByRole('button', { name: 'Add video', exact: true }).click();
  await expect.poll(() => requests.length).toBe(1);
  expect(requests).toEqual([{ url: sourceUrl }]);

  await page.getByRole('group', { name: 'Specimen view' }).getByRole('button', { name: 'Preview', exact: true }).click();
  await expect(page.locator('.content-cover-video iframe')).toHaveAttribute('src', playerUrl);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.locator('.content-cover-video iframe')).toHaveAttribute('src', 'https://video.wordpress.com/embed/4llYxnAK?hd=0&cover=1&muted=1&loop=1');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await expect(page.locator('.content-cover-video iframe')).toHaveAttribute('src', playerUrl);
  await page.getByRole('button', { name: 'Reset Example', exact: true }).click();
});

test('Library Cover rejects an unsafe WordPress.tv resolver result without changing the example', async ({ page }) => {
  let resolverCalls = 0;
  await page.route('**/api/embed/resolve', async route => {
    resolverCalls++;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        provider: 'WordPress.tv', kind: 'frame', title: 'Unexpected player',
        src: 'https://evil.test/embed/4llYxnAK',
      }),
    });
  });

  await page.goto('/studio/ui/blocks/cover');
  await expect(page.locator('.ui-block-specimen')).toHaveAttribute('data-ready', 'true');
  const inspector = page.locator('.ui-block-inspector');
  await inspector.getByRole('textbox', { name: 'Background video URL', exact: true }).fill(sourceUrl);
  await inspector.getByRole('button', { name: 'Add video', exact: true }).click();
  await expect(inspector.getByRole('alert')).toContainText('WordPress.tv could not resolve this video');
  expect(resolverCalls).toBe(1);
  await expect(page.locator('.content-cover-video iframe')).toHaveCount(0);
  await page.getByRole('button', { name: 'Reset Example', exact: true }).click();
});
