import { expect, test, type Locator } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import { createStudioHttpFixture } from '../helpers/studio-http-fixture.mjs';

const mediaUrl = '/__captions-test__/timed-captions.webm';
// A generated blue frame with a 440 Hz tone. The fixture carries no third-party content.
const mediaFile = fileURLToPath(new URL('./fixtures/timed-captions.webm', import.meta.url));
const captions = {
  name: 'tone.vtt',
  mimeType: 'text/vtt',
  buffer: Buffer.from('WEBVTT\n\n00:00:00.500 --> 00:00:01.500\n[Steady tone]\n'),
};
const editorUrl = '/studio?library=page&documentId=timed-captions';

async function playCue(video: Locator) {
  const track = video.locator('track[kind="captions"]');
  await expect(track).toHaveAttribute('srclang', 'en-GB');
  await expect(track).toHaveAttribute('label', 'English (UK)');
  await expect.poll(() => track.evaluate((element: HTMLTrackElement) => ({
    ready: element.readyState,
    mode: element.track.mode,
  }))).toEqual({ ready: 2, mode: 'showing' });
  await video.evaluate(async (element: HTMLVideoElement) => {
    element.muted = true;
    element.currentTime = 0;
    await element.play();
  });
  await expect.poll(() => track.evaluate((element: HTMLTrackElement) =>
    Array.from(element.track.activeCues ?? [], cue => (cue as VTTCue).text),
  ), { intervals: [50, 100] }).toEqual(['[Steady tone]']);
  await expect.poll(() => video.evaluate((element: HTMLVideoElement) => ({
    pastCue: element.currentTime > 1.5,
    active: element.textTracks[0].activeCues?.length,
  })), { intervals: [100, 250] }).toEqual({ pastCue: true, active: 0 });
  await video.evaluate((element: HTMLVideoElement) => { element.pause(); });
}

test('a real WebVTT caption plays after saving, reloading and publishing the local page', async ({ page }, testInfo) => {
  test.setTimeout(75_000);
  const fixture = await createStudioHttpFixture({ frontendURL: testInfo.project.use.baseURL });
  try {
    await page.route(`**${mediaUrl}`, route => route.fulfill({ path: mediaFile, contentType: 'video/webm' }));
    await page.addInitScript(src => {
      const key = 'acm-studio-workspace-v2';
      if (localStorage.getItem(key)) return;
      const document = {
        id: 'timed-captions', kind: 'page', title: 'Timed captions', slug: 'timed-captions',
        status: 'draft', updatedAt: '2026-11-22T00:00:00Z', excerpt: '', tags: [], seoTitle: '', seoDescription: '',
        blocks: [{ id: 'tone-video', type: 'video', src, caption: 'Visible figure caption' }],
      };
      const other = {
        ...document, id: 'other-caption-page', slug: 'other-caption-page', title: 'Other caption page',
        blocks: [{ ...document.blocks[0], caption: 'Other figure caption' }],
      };
      localStorage.setItem(key, JSON.stringify({ version: 67, activeDocumentId: document.id, documents: [document, other], categories: [], bin: [] }));
    }, mediaUrl);
    await page.goto(fixture.origin + editorUrl);
    const video = page.locator('figure.content-video video');
    await page.getByRole('group', { name: 'Video block', exact: true }).click();
    const file = page.getByLabel('Caption track file', { exact: true });
    await file.waitFor({ state: 'attached', timeout: 5000 });
    await expect(video).toBeVisible();
    await expect(video.locator('track')).toHaveCount(0);
    await file.setInputFiles(captions);
    const apply = page.getByRole('button', { name: 'Apply Caption Track', exact: true });
    await expect(apply).toBeEnabled();
    const navigation = page.getByRole('complementary', { name: 'Studio Navigation', exact: true });
    await navigation.getByRole('button', { name: /Other caption page/ }).click();
    await expect(page.locator('figure.content-video figcaption')).toHaveText('Other figure caption');
    await page.getByRole('group', { name: 'Video block', exact: true }).click();
    await expect(file).toBeAttached();
    await expect(apply).toHaveCount(0);
    await expect(video.locator('track')).toHaveCount(0);
    await navigation.getByRole('button', { name: /Timed captions/ }).click();
    await expect(page.locator('figure.content-video figcaption')).toHaveText('Visible figure caption');
    await page.getByRole('group', { name: 'Video block', exact: true }).click();
    await file.setInputFiles(captions);
    const language = page.getByLabel('Caption track language', { exact: true });
    await language.fill('not_a_tag');
    await expect(apply).toBeDisabled();
    await language.fill('en-GB');
    await language.press('Tab');
    const label = page.getByLabel('Caption track label', { exact: true });
    await label.fill('English (UK)');
    await label.press('Tab');
    await apply.press('Enter');
    await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('acm-studio-workspace-v2')!).documents[0].blocks[0].captionTrack))
      .toMatchObject({ language: 'en-GB', label: 'English (UK)' });

    await page.reload();
    await playCue(video);
    await page.locator('figure.content-video figcaption').click();
    const wideViewport = page.viewportSize()!;
    await page.setViewportSize({ width: 390, height: 844 });
    const longName = 'replacement-captions-'.repeat(8) + 'en-GB.vtt';
    await file.setInputFiles({ ...captions, name: longName });
    const filename = page.getByText(longName, { exact: true });
    await expect(filename).toBeVisible();
    expect(await filename.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
    await page.getByRole('button', { name: 'Cancel Caption Changes', exact: true }).press('Enter');
    await expect(page.getByRole('button', { name: 'Replace WebVTT File', exact: true })).toBeFocused();
    await file.setInputFiles({ ...captions, name: 'invalid.vtt', buffer: Buffer.from('WEBVTT\n\nNo timed cues') });
    await expect(page.getByRole('alert').filter({ hasText: /WebVTT|cue/i })).toBeVisible();
    await expect(video.locator('track')).toHaveAttribute('label', 'English (UK)');
    const remove = page.getByRole('button', { name: 'Remove Caption Track', exact: true });
    await remove.scrollIntoViewIfNeeded();
    const removeBounds = (await remove.boundingBox())!;
    expect(removeBounds.x).toBeGreaterThanOrEqual(0);
    expect(removeBounds.x + removeBounds.width).toBeLessThanOrEqual(390);
    await remove.press('Enter');
    await expect(video.locator('track')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Choose WebVTT File', exact: true })).toBeFocused();
    await page.setViewportSize(wideViewport);
    await page.getByRole('button', { name: 'Undo', exact: true }).press('Enter');
    await expect(video.locator('track')).toHaveAttribute('label', 'English (UK)');
    await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('acm-studio-workspace-v2')!).documents[0].blocks[0].captionTrack?.label))
      .toBe('English (UK)');

    await page.goto(fixture.origin + editorUrl + '&preview=1');
    await playCue(video);
    await page.goto(fixture.origin + editorUrl);
    await page.getByRole('button', { name: 'Publish', exact: true }).click();
    await page.getByRole('link', { name: 'View page' }).click();
    await expect(page.locator('figure.content-video figcaption')).toHaveText('Visible figure caption');
    await playCue(video);
  } finally { await fixture.close(); }
});
