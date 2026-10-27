import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import ts from 'typescript';

test('generates distinct, bounded PNG images from a real raster without changing its original', async ({ page }) => {
  const compile = async (path: string) => ts.transpileModule(await readFile(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const [parser, contract, generator, validation, mediaSerialization, serialization, backup, source, jpeg] = await Promise.all([
    compile('app/content/raster-dimensions.ts'),
    compile('app/content/image-resolution.ts'),
    compile('app/studio/image-rendition-generation.ts'),
    compile('app/studio/image-rendition-validation.ts'),
    compile('app/studio/media-serialization.ts'),
    compile('app/studio/image-rendition-serialization.ts'),
    compile('app/studio/image-rendition-backup.ts'),
    readFile('public/specimens/landscape.png'),
    readFile('public/specimens/mont-blanc.jpg'),
  ]);
  // A local secure origin enables SubtleCrypto; all requests are fulfilled in
  // this isolated context, so this check does not reach a Studio data store.
  await page.route('**/*', route => route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>Image test</title>' }));
  await page.goto('http://localhost:3011/');
  const result = await page.evaluate(async ({ parser, contract, generator, validation, mediaSerialization, serialization, backup, encoded, jpegEncoded }) => {
    const parserModule = { exports: {} };
    new Function('exports', 'module', parser)(parserModule.exports, parserModule);
    const contractModule = { exports: {} };
    new Function('exports', 'module', contract)(contractModule.exports, contractModule);
    const generatorModule = { exports: {} };
    new Function('exports', 'module', 'require', generator)(generatorModule.exports, generatorModule, (id: string) => id.includes('image-resolution') ? contractModule.exports : parserModule.exports);
    const validationModule = { exports: {} };
    new Function('exports', 'module', 'require', validation)(validationModule.exports, validationModule, (id: string) => id.includes('image-resolution') ? contractModule.exports : id.includes('raster-dimensions') ? parserModule.exports : generatorModule.exports);
    const mediaSerializationModule = { exports: {} };
    new Function('exports', 'module', mediaSerialization)(mediaSerializationModule.exports, mediaSerializationModule);
    const serializationModule = { exports: {} };
    new Function('exports', 'module', 'require', serialization)(serializationModule.exports, serializationModule, (id: string) => id.includes('image-resolution') ? contractModule.exports : id.includes('image-rendition-validation') ? validationModule.exports : id.includes('image-rendition-generation') ? generatorModule.exports : mediaSerializationModule.exports);
    const backupModule = { exports: {} };
    new Function('exports', 'module', 'require', backup)(backupModule.exports, backupModule, (id: string) => id.includes('image-rendition-validation') ? validationModule.exports : serializationModule.exports);
    const api = generatorModule.exports as { generateImageRenditions: (blob: Blob) => Promise<{ sourceDigest: string; variants: Array<{ key: string; width: number; height: number; blob: Blob; digest: string }> } | null> };
    const validator = validationModule.exports as { validateImageRenditions: (value: unknown) => Promise<unknown> };
    const serializer = serializationModule.exports as { serializeImageRenditions: (value: unknown, budget: number) => Promise<unknown>; deserializeImageRenditions: (value: unknown) => Promise<{ bundles: Array<{ variants: Array<{ digest: string; blob: Blob }> }> }> };
    const collection = backupModule.exports as { serializeRenditionCollection: (value: unknown[], budget: number) => Promise<unknown[]>; deserializeRenditionCollection: (value: unknown[], budget: number) => Promise<Array<{ bundles: Array<{ variants: Array<{ digest: string }> }> } | undefined>> };
    const bytes = Uint8Array.from(atob(encoded), character => character.charCodeAt(0));
    const original = new Blob([bytes], { type: 'image/png' });
    const bundle = await api.generateImageRenditions(original);
    if (!bundle) throw new Error('Expected generated image sizes.');
    await validator.validateImageRenditions({ version: 1, bundles: [bundle] });
    const serialized = await serializer.serializeImageRenditions({ version: 1, bundles: [bundle] }, 32 * 1024 * 1024);
    const restored = await serializer.deserializeImageRenditions(JSON.parse(JSON.stringify(serialized)));
    const serializedRoundTrip = restored.bundles[0].variants.map(item => [item.digest, item.blob.size]);
    const collectionInput = [{ version: 1, bundles: [{ ...bundle, variants: bundle.variants.map(item => ({ ...item })) }] }, undefined, { version: 1, bundles: [bundle] }];
    const savingCollection = collection.serializeRenditionCollection(collectionInput, 32 * 1024 * 1024);
    collectionInput[0]!.bundles[0].variants[0].digest = '0'.repeat(64);
    const encodedCollection = await savingCollection;
    const originalArrayBuffer = Blob.prototype.arrayBuffer;
    const originalRead = FileReader.prototype.readAsDataURL;
    let readsBeforeBudget = 0; let collectionExportRejected = false;
    Blob.prototype.arrayBuffer = function () { readsBeforeBudget++; return originalArrayBuffer.call(this); };
    FileReader.prototype.readAsDataURL = function (blob: Blob) { readsBeforeBudget++; return originalRead.call(this, blob); };
    const oneAssetEncodedSize = bundle.variants.reduce((total, item) => total + 4 * Math.ceil(item.blob.size / 3), 0);
    try { await collection.serializeRenditionCollection([{ version: 1, bundles: [bundle] }, { version: 1, bundles: [bundle] }], oneAssetEncodedSize); } catch { collectionExportRejected = true; }
    finally { Blob.prototype.arrayBuffer = originalArrayBuffer; FileReader.prototype.readAsDataURL = originalRead; }
    let activeDecodes = 0; let maximumDecodes = 0;
    const originalBitmap = globalThis.createImageBitmap;
    Reflect.set(globalThis, 'createImageBitmap', async (...args: Parameters<typeof createImageBitmap>) => {
      activeDecodes++; maximumDecodes = Math.max(maximumDecodes, activeDecodes);
      try { await new Promise(resolve => setTimeout(resolve, 0)); return await Reflect.apply(originalBitmap, globalThis, args); }
      finally { activeDecodes--; }
    });
    let restoredCollection;
    try { restoredCollection = await collection.deserializeRenditionCollection(encodedCollection, 32 * 1024 * 1024); }
    finally { Reflect.set(globalThis, 'createImageBitmap', originalBitmap); }
    let atobCalls = 0; let budgetDecodeCalls = 0; const originalAtob = window.atob;
    Reflect.set(window, 'atob', (text: string) => { atobCalls++; return originalAtob.call(window, text); });
    Reflect.set(globalThis, 'createImageBitmap', (...args: Parameters<typeof createImageBitmap>) => { budgetDecodeCalls++; return Reflect.apply(originalBitmap, globalThis, args); });
    let collectionBudgetRejected = false;
    const oneAssetDecodedSize = bundle.variants.reduce((total, item) => total + item.blob.size, 0);
    try { await collection.deserializeRenditionCollection(encodedCollection, oneAssetDecodedSize); } catch { collectionBudgetRejected = true; }
    finally { Reflect.set(window, 'atob', originalAtob); Reflect.set(globalThis, 'createImageBitmap', originalBitmap); }
    const collectionRoundTrip = restoredCollection.map(item => item?.bundles[0].variants[0].digest ?? null);
    let rejectedExportBudget = false;
    try { await serializer.serializeImageRenditions({ version: 1, bundles: [bundle] }, 0); } catch { rejectedExportBudget = true; }
    const invalidExport = structuredClone(serialized) as { bundles: Array<{ variants: Array<{ dataBase64: string }> }> };
    invalidExport.bundles[0].variants[0].dataBase64 = '!!!!';
    let rejectedInvalidBase64 = false;
    try { await serializer.deserializeImageRenditions(invalidExport); } catch { rejectedInvalidBase64 = true; }
    const corrupted = new Uint8Array(await bundle.variants[0].blob.arrayBuffer()); corrupted[corrupted.length - 1] ^= 1;
    let rejectedCorruption = false;
    try { await validator.validateImageRenditions({ version: 1, bundles: [{ ...bundle, variants: [{ ...bundle.variants[0], blob: new Blob([corrupted], { type: 'image/png' }) }] }] }); }
    catch { rejectedCorruption = true; }
    const invalidPixels = new Uint8Array(await bundle.variants[0].blob.arrayBuffer());
    const pngView = new DataView(invalidPixels.buffer);
    for (let offset = 8; offset + 12 <= invalidPixels.length;) {
      const length = pngView.getUint32(offset);
      const name = String.fromCharCode(...invalidPixels.subarray(offset + 4, offset + 8));
      if (name === 'IDAT') { invalidPixels[offset + 8] = 0; break; }
      offset += length + 12;
    }
    const invalidBlob = new Blob([invalidPixels], { type: 'image/png' });
    const invalidDigest = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', await invalidBlob.arrayBuffer())), byte => byte.toString(16).padStart(2, '0')).join('');
    let rejectedUndecodable = false;
    try { await validator.validateImageRenditions({ version: 1, bundles: [{ ...bundle, variants: [{ ...bundle.variants[0], blob: invalidBlob, digest: invalidDigest }] }] }); }
    catch { rejectedUndecodable = true; }
    const mutable = { version: 1, bundles: [{ ...bundle, variants: bundle.variants.map(variant => ({ ...variant })) }] };
    const validating = validator.validateImageRenditions(mutable);
    mutable.bundles[0].variants[0].digest = '0'.repeat(64);
    const validated = await validating as typeof mutable;
    const capturedBeforeMutation = validated !== mutable && validated.bundles[0].variants[0].digest === bundle.variants[0].digest;
    const generated = await Promise.all(bundle.variants.map(async item => {
      const bitmap = await createImageBitmap(item.blob);
      const digest = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', await item.blob.arrayBuffer())), byte => byte.toString(16).padStart(2, '0')).join('');
      try { return { key: item.key, width: item.width, height: item.height, decodedWidth: bitmap.width, decodedHeight: bitmap.height, type: item.blob.type, digest: item.digest, actualDigest: digest }; }
      finally { bitmap.close(); }
    }));
    const jpegBytes = Uint8Array.from(atob(jpegEncoded), character => character.charCodeAt(0));
    // Insert an EXIF orientation of 6 into the real JPEG without changing its pixels.
    const exif = new Uint8Array([0xff, 0xe1, 0, 34, 0x45, 0x78, 0x69, 0x66, 0, 0, 0x49, 0x49, 42, 0, 8, 0, 0, 0, 1, 0, 0x12, 1, 3, 0, 1, 0, 0, 0, 6, 0, 0, 0, 0, 0, 0, 0]);
    const rotated = await api.generateImageRenditions(new Blob([jpegBytes.slice(0, 2), exif, jpegBytes.slice(2)], { type: 'image/jpeg' }));
    const canvas = document.createElement('canvas'); canvas.width = 640; canvas.height = 360;
    const context = canvas.getContext('2d')!; context.fillStyle = '#ff0000'; context.fillRect(100, 100, 440, 160);
    const transparent = await new Promise<Blob>((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('PNG encoding failed')), 'image/png'));
    const alphaBundle = await api.generateImageRenditions(transparent);
    if (!rotated || !alphaBundle) throw new Error('Expected oriented and transparent sizes.');
    const alphaBitmap = await createImageBitmap(alphaBundle.variants[0].blob);
    const alphaCanvas = document.createElement('canvas'); alphaCanvas.width = alphaBitmap.width; alphaCanvas.height = alphaBitmap.height;
    const alphaContext = alphaCanvas.getContext('2d')!; alphaContext.drawImage(alphaBitmap, 0, 0); alphaBitmap.close();
    const alpha = [alphaContext.getImageData(0, 0, 1, 1).data[3], alphaContext.getImageData(75, 42, 1, 1).data[3]];
    const webp = await new Promise<Blob>((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('WebP encoding failed')), 'image/webp'));
    const webpBundle = await api.generateImageRenditions(webp);
    const smallCanvas = document.createElement('canvas'); smallCanvas.width = 100; smallCanvas.height = 100;
    const small = await new Promise<Blob>((resolve, reject) => smallCanvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('PNG encoding failed')), 'image/png'));
    const smallResult = await api.generateImageRenditions(small);
    const oversized = bytes.slice(); new DataView(oversized.buffer).setUint32(16, 8193);
    const originalDecode = globalThis.createImageBitmap;
    let decoded = false;
    Reflect.set(globalThis, 'createImageBitmap', (...args: Parameters<typeof createImageBitmap>) => { decoded = true; return Reflect.apply(originalDecode, globalThis, args); });
    let oversizedResult; let pixelLimitResult; let byteLimitResult;
    try {
      oversizedResult = await api.generateImageRenditions(new Blob([oversized], { type: 'image/png' }));
      const tooManyPixels = bytes.slice(); const pixelHeader = new DataView(tooManyPixels.buffer); pixelHeader.setUint32(16, 8000); pixelHeader.setUint32(20, 3000);
      pixelLimitResult = await api.generateImageRenditions(new Blob([tooManyPixels], { type: 'image/png' }));
      byteLimitResult = await api.generateImageRenditions(new Blob([new Uint8Array(32 * 1024 * 1024 + 1)], { type: 'image/png' }));
    }
    finally { Reflect.set(globalThis, 'createImageBitmap', originalDecode); }
    let closed = false; let failedCanvas: HTMLCanvasElement | undefined; let generationFailed = false;
    const originalCreateElement = document.createElement;
    Reflect.set(globalThis, 'createImageBitmap', async (...args: Parameters<typeof createImageBitmap>) => {
      const bitmap = await Reflect.apply(originalDecode, globalThis, args);
      const close = bitmap.close.bind(bitmap);
      Reflect.set(bitmap, 'close', () => { closed = true; close(); });
      return bitmap;
    });
    Reflect.set(document, 'createElement', (tag: string) => {
      const element = originalCreateElement.call(document, tag);
      if (tag === 'canvas') { failedCanvas = element as HTMLCanvasElement; Reflect.set(element, 'getContext', () => null); }
      return element;
    });
    try { await api.generateImageRenditions(original); }
    catch { generationFailed = true; }
    finally { Reflect.set(document, 'createElement', originalCreateElement); Reflect.set(globalThis, 'createImageBitmap', originalDecode); }
    return { sourceDigest: bundle.sourceDigest, originalBytes: original.size, generated, rotated: rotated.variants.map(item => [item.width, item.height]), alpha, webp: webpBundle?.variants.map(item => [item.width, item.height]), smallOriginalOnly: smallResult === null, oversizedRejectedBeforeDecode: oversizedResult === null && pixelLimitResult === null && byteLimitResult === null && !decoded, rejectedCorruption, rejectedUndecodable, capturedBeforeMutation, failureCleanedUp: generationFailed && closed && failedCanvas?.width === 0 && failedCanvas.height === 0, serializedRoundTrip, rejectedExportBudget, rejectedInvalidBase64, collectionRoundTrip, maximumDecodes, collectionBudgetRejectedBeforeDecode: collectionBudgetRejected && atobCalls === 0 && budgetDecodeCalls === 0, collectionExportRejectedBeforeRead: collectionExportRejected && readsBeforeBudget === 0 };
  }, { parser, contract, generator, validation, mediaSerialization, serialization, backup, encoded: source.toString('base64'), jpegEncoded: jpeg.toString('base64') });
  expect(result.originalBytes).toBe(source.length);
  expect(result.sourceDigest).toBe(createHash('sha256').update(source).digest('hex'));
  expect(result.generated.map(({ key, width, height }) => ({ key, width, height }))).toEqual([
    { key: 'thumbnail', width: 150, height: 84 },
    { key: 'medium', width: 300, height: 169 },
  ]);
  for (const item of result.generated) {
    expect(item.type).toBe('image/png');
    expect([item.decodedWidth, item.decodedHeight]).toEqual([item.width, item.height]);
    expect(item.digest).toBe(item.actualDigest);
  }
  expect(result.generated[0].digest).not.toBe(result.generated[1].digest);
  expect(result.rotated).toEqual([[113, 150], [225, 300]]);
  expect(result.alpha).toEqual([0, 255]);
  expect(result.webp).toEqual([[150, 84], [300, 169]]);
  expect(result.smallOriginalOnly).toBe(true);
  expect(result.oversizedRejectedBeforeDecode).toBe(true);
  expect(result.rejectedCorruption).toBe(true);
  expect(result.rejectedUndecodable).toBe(true);
  expect(result.capturedBeforeMutation).toBe(true);
  expect(result.failureCleanedUp).toBe(true);
  expect(result.serializedRoundTrip.map(item => item[0])).toEqual(result.generated.map(item => item.digest));
  expect(result.serializedRoundTrip.every(item => Number(item[1]) > 0)).toBe(true);
  expect(result.rejectedExportBudget).toBe(true);
  expect(result.rejectedInvalidBase64).toBe(true);
  expect(result.collectionRoundTrip).toEqual([result.generated[0].digest, null, result.generated[0].digest]);
  expect(result.maximumDecodes).toBe(1);
  expect(result.collectionBudgetRejectedBeforeDecode).toBe(true);
  expect(result.collectionExportRejectedBeforeRead).toBe(true);
});
