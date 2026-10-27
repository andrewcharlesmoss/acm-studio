import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

test('the saving owner prepares bounded sizes from the captured original', async ({ page }) => {
  const compile = async (path: string) => ts.transpileModule(await readFile(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const [contractSource, parserSource, generatorSource, validationSource, preparationSource, fixture] = await Promise.all([
    compile('app/content/image-resolution.ts'), compile('app/content/raster-dimensions.ts'),
    compile('app/studio/image-rendition-generation.ts'), compile('app/studio/image-rendition-validation.ts'),
    compile('app/studio/image-rendition-preparation.ts'), readFile('public/specimens/landscape.png'),
  ]);
  await page.route('**/*', route => route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>Image preparation test</title>' }));
  await page.goto('http://localhost:3011/');
  const result = await page.evaluate(async ({ contractSource, parserSource, generatorSource, validationSource, preparationSource, fixture }) => {
    const moduleFor = (source: string, require: (id: string) => unknown = () => ({})) => {
      const module = { exports: {} }; new Function('exports', 'module', 'require', source)(module.exports, module, require); return module.exports;
    };
    const contract = moduleFor(contractSource); const parser = moduleFor(parserSource);
    const generator = moduleFor(generatorSource, id => id.includes('image-resolution') ? contract : parser);
    const validation = moduleFor(validationSource, id => id.includes('image-resolution') ? contract : id.includes('raster-dimensions') ? parser : generator);
    const preparation = moduleFor(preparationSource, id => id.includes('image-resolution') ? contract : id.includes('image-rendition-generation') ? generator : validation) as { prepareImageRenditions: (source: any, digest: string) => Promise<any> };
    const bytes = Uint8Array.from(atob(fixture), character => character.charCodeAt(0));
    const blob = new Blob([bytes], { type: 'image/png' });
    const digest = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', await blob.arrayBuffer())), byte => byte.toString(16).padStart(2, '0')).join('');
    const source = { id: 'image-one', sourceRevision: 'revision-one', blob };
    const pending = preparation.prepareImageRenditions(source, digest);
    source.id = 'changed'; source.sourceRevision = 'revision-two';
    const prepared = await pending;
    const originalCreate = document.createElement;
    let canvases = 0;
    Reflect.set(document, 'createElement', (tag: string) => { if (tag === 'canvas') canvases++; return originalCreate.call(document, tag); });
    let existing;
    try { existing = await preparation.prepareImageRenditions({ id: 'image-one', sourceRevision: 'revision-one', blob, imageRenditions: prepared.imageRenditions }, digest); }
    finally { Reflect.set(document, 'createElement', originalCreate); }
    let decodeCalls = 0; const originalBitmap = globalThis.createImageBitmap;
    Reflect.set(globalThis, 'createImageBitmap', (...args: Parameters<typeof createImageBitmap>) => { decodeCalls++; return Reflect.apply(originalBitmap, globalThis, args); });
    let staleRejected = false; let capRejected = false;
    try {
      try { await preparation.prepareImageRenditions({ id: 'image-one', blob }, '0'.repeat(64)); } catch (error) { staleRejected = (error as { code?: string }).code === 'conflict'; }
      const bundle = prepared.imageRenditions.bundles[0];
      const retained = { version: 1, bundles: Array.from({ length: 8 }, (_, index) => ({ ...bundle, sourceDigest: String(index + 1).padStart(64, '0') })) };
      try { await preparation.prepareImageRenditions({ id: 'image-one', blob, imageRenditions: retained }, digest); } catch (error) { capRejected = (error as { code?: string }).code === 'unavailable'; }
    } finally { Reflect.set(globalThis, 'createImageBitmap', originalBitmap); }
    const corrupted = structuredClone(prepared.imageRenditions); corrupted.bundles[0].variants[0].digest = 'f'.repeat(64);
    let corruptRejected = false;
    try { await preparation.prepareImageRenditions({ id: 'image-one', blob, imageRenditions: corrupted }, digest); } catch { corruptRejected = true; }
    const tooLarge = await preparation.prepareImageRenditions({ id: 'image-one', blob: new Blob([new Uint8Array(32 * 1024 * 1024 + 1)], { type: 'image/png' }) }, digest);
    return { status: prepared.status, id: prepared.assetId, revision: prepared.sourceRevision, sourceDigest: prepared.sourceDigest, sizes: prepared.imageRenditions.bundles[0].variants.map((variant: { width: number; height: number }) => [variant.width, variant.height]), existing: existing.status, canvases, staleRejected, capRejected, decodeCalls, corruptRejected, oversized: tooLarge.status, originalSize: blob.size };
  }, { contractSource, parserSource, generatorSource, validationSource, preparationSource, fixture: fixture.toString('base64') });
  expect(result).toEqual({ status: 'prepared', id: 'image-one', revision: 'revision-one', sourceDigest: expect.stringMatching(/^[a-f0-9]{64}$/), sizes: [[150, 84], [300, 169]], existing: 'existing', canvases: 0, staleRejected: true, capRejected: true, decodeCalls: 0, corruptRejected: true, oversized: 'original-only', originalSize: fixture.length });
});
