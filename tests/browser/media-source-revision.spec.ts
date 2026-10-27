import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

test('the live media store renews the source revision for same-size replacement', async ({ page }) => {
  const paths = ['app/studio/write-ownership.ts', 'app/studio/media-store.ts'];
  const sources = await Promise.all(paths.map(async path => ts.transpileModule(await readFile(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText));
  // Playwright provides a fresh isolated browser context; requests never reach a Studio server.
  await page.route('**/*', route => route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>Media revision test</title>' }));
  await page.goto('http://localhost:3011/');
  const result = await page.evaluate(async sources => {
    const ownershipModule = { exports: {} };
    new Function('exports', 'module', sources[0])(ownershipModule.exports, ownershipModule);
    const owner = (ownershipModule.exports as any).studioWriteOwnership;
    const release = owner.acquire((token: symbol) => owner.loaded(token, true), { request: async (_name: string, _options: unknown, callback: (lock: object) => Promise<unknown>) => callback({}) });
    for (let pass = 0; pass < 30 && !owner.canWrite(); pass++) await new Promise(resolve => setTimeout(resolve, 0));
    if (!owner.canWrite()) throw new Error('Owner unavailable.');
    const storeModule = { exports: {} };
    new Function('exports', 'module', 'require', sources[1])(storeModule.exports, storeModule, (name: string) => {
      if (name === './write-ownership') return ownershipModule.exports;
      if (name === './template-store') return { assertTemplateMediaCanBeDeleted() {} };
      if (name === '../content/local-storage-keys') return { LOCAL_WORKSPACE_KEY: 'workspace' };
      return {};
    });
    const store = storeModule.exports as any;
    const original = { id: 'image', name: 'Original', folderId: null, type: 'image/png', size: 1, blob: new Blob(['x'], { type: 'image/png' }), createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z', altText: '', caption: '' };
    await store.replaceMediaLibrary([original], []);
    const first = await store.replaceMediaAssetContent('image', new Blob(['y'], { type: 'image/png' }));
    await store.updateMediaAsset('image', { name: 'Updated' });
    const renamed = await store.getMediaAsset('image');
    const second = await store.replaceMediaAssetContent('image', new Blob(['z'], { type: 'image/png' }));
    release();
    return { first: typeof first.sourceRevision === 'string' && !!first.sourceRevision, renamedSame: renamed.sourceRevision === first.sourceRevision, replacedDifferent: second.sourceRevision !== first.sourceRevision, bytes: await second.blob.text(), type: second.type, name: second.name };
  }, sources);
  expect(result).toEqual({ first: true, renamedSame: true, replacedDifferent: true, bytes: 'z', type: 'image/png', name: 'Updated' });
});
