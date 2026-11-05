import { expect, test } from '@playwright/test';
import { buildMediaAdapter } from './helpers/media-adapter';
declare global { interface Window { StudioMediaAdapter: typeof import('./fixtures/media-store-adapter') } }

test('the live media store renews the source revision for same-size replacement', async ({ page }) => {
  const source = await buildMediaAdapter();
  // Playwright provides a fresh isolated browser context; requests never reach a Studio server.
  await page.route('**/*', route => route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>Media revision test</title>' }));
  await page.goto('http://localhost:3011/');
  await page.addScriptTag({ content: source });
  const result = await page.evaluate(async () => {
    const owner = window.StudioMediaAdapter.studioWriteOwnership;
    const release = owner.acquire((token: symbol) => owner.loaded(token, true));
    for (let pass = 0; pass < 30 && !owner.canWrite(); pass++) await new Promise(resolve => setTimeout(resolve, 0));
    if (!owner.canWrite()) throw new Error('Owner unavailable.');
    const store = window.StudioMediaAdapter.mediaStore;
    const original = { id: 'image', name: 'Original', folderId: null, type: 'image/png', size: 1, blob: new Blob(['x'], { type: 'image/png' }), createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z', altText: '', caption: '' };
    await store.replaceMediaLibrary([original], []);
    const first = await store.replaceMediaAssetContent('image', new Blob(['y'], { type: 'image/png' }));
    await store.updateMediaAsset('image', { name: 'Updated' });
    const renamed = await store.getMediaAsset('image');
    if (!renamed) throw new Error('The renamed image is missing.');
    const second = await store.replaceMediaAssetContent('image', new Blob(['z'], { type: 'image/png' }));
    release();
    return { first: typeof first.sourceRevision === 'string' && !!first.sourceRevision, renamedSame: renamed.sourceRevision === first.sourceRevision, replacedDifferent: second.sourceRevision !== first.sourceRevision, bytes: await second.blob.text(), type: second.type, name: second.name };
  });
  expect(result).toEqual({ first: true, renamedSame: true, replacedDifferent: true, bytes: 'z', type: 'image/png', name: 'Updated' });
});
