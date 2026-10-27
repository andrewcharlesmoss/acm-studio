import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

test('backup v7 retains image sizes and refuses restore into the old media schema', async ({ page }) => {
  const paths = ['app/content/raster-dimensions.ts', 'app/content/image-resolution.ts', 'app/studio/image-rendition-generation.ts', 'app/studio/image-rendition-validation.ts', 'app/studio/media-serialization.ts', 'app/studio/image-rendition-serialization.ts', 'app/studio/image-rendition-backup.ts', 'app/studio/backup-store.ts'];
  const sources = await Promise.all(paths.map(async path => ts.transpileModule(await readFile(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText));
  const fixture = await readFile('public/specimens/landscape.png');
  await page.route('**/*', route => route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>Backup test</title>' }));
  await page.goto('http://localhost:3011/');
  const result = await page.evaluate(async ({ sources, fixture }) => {
    const ids = ['raster-dimensions', 'image-resolution', 'image-rendition-generation', 'image-rendition-validation', 'media-serialization', 'image-rendition-serialization', 'image-rendition-backup', 'backup-store'];
    const modules: Record<string, any> = {};
    const bytes = Uint8Array.from(atob(fixture), character => character.charCodeAt(0));
    const original = new Blob([bytes], { type: 'image/png' });
    const workspace = { documents: [], bin: [] };
    let asset: any; let restores = 0;
    const dependencies: Record<string, any> = {
      'featured-images': { collectSiteImages: async () => [] },
      'site-featured-image.mjs': { siteImageNames: () => [], SITE_IMAGE_MAX_BYTES: 2 * 1024 * 1024 },
      'global-template-contract': { validateGlobalTemplateLibrary: (value: unknown) => value },
      'workspace-repository': { withSavedDocumentRevisions: (value: unknown) => value },
      'write-ownership': { studioWriteOwnership: { restore: async () => { restores++; throw new Error('unexpected restore'); } } },
      'local-publishing': { LOCAL_WORKSPACE_KEY: 'workspace', LOCAL_PUBLICATIONS_KEY: 'publications' },
      'design-model': { DESIGN_STORAGE_KEY: 'design', validateDesignProject: () => {} },
      'design-store': { loadDesigns: () => [] },
      'media-store': { listMediaLibrary: async () => ({ folders: [], assets: [asset] }) },
      'workspace-validation': { isRecord: (value: unknown) => !!value && typeof value === 'object' && !Array.isArray(value), migrateStudioWorkspace: (value: unknown) => value, validateStudioWorkspace: () => {} },
      'template-model': { validateTemplateStore: (value: unknown) => value, validateWorkspacePublicationTemplates: (value: unknown) => value, validateTemplatePublicationSnapshot: (value: unknown) => value, templateMediaIds: () => [] },
      'template-store': { loadTemplates: () => undefined },
    };
    for (let index = 0; index < ids.length; index++) {
      const module = { exports: {} };
      new Function('exports', 'module', 'require', sources[index])(module.exports, module, (name: string) => {
        const id = name.split('/').at(-1)!;
        const dependency = modules[id] ?? dependencies[id];
        if (!dependency) throw new Error(`Unexpected dependency: ${name}`);
        return dependency;
      });
      modules[ids[index]] = module.exports;
    }
    const bundle = await modules['image-rendition-generation'].generateImageRenditions(original);
    asset = { id: 'image', name: 'Image', folderId: null, type: 'image/png', size: original.size, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z', altText: '', caption: '', blob: original, imageRenditions: { version: 1, bundles: [bundle] } };
    const api = modules['backup-store'];
    const originalRead = FileReader.prototype.readAsDataURL;
    FileReader.prototype.readAsDataURL = function (blob: Blob) {
      asset.blob = new Blob(['changed'], { type: 'image/png' });
      asset.imageRenditions.bundles[0].variants[0].digest = '0'.repeat(64);
      return originalRead.call(this, blob);
    };
    let saved;
    try { saved = await api.createStudioBackup(workspace); }
    finally { FileReader.prototype.readAsDataURL = originalRead; }
    const read = api.validateStudioBackup(JSON.parse(JSON.stringify(saved)));
    const changing = structuredClone(saved);
    const bitmap = globalThis.createImageBitmap;
    let duringDecode = false;
    Reflect.set(globalThis, 'createImageBitmap', (...args: Parameters<typeof createImageBitmap>) => {
      duringDecode = true;
      changing.workspace.documents.push({ id: 'late-change' });
      changing.media.assets[0].imageRenditions.bundles[0].variants[0].digest = '0'.repeat(64);
      changing.media.assets[0].dataBase64 = 'AAAA';
      return Reflect.apply(bitmap, globalThis, args);
    });
    let prepared;
    try { prepared = await api.prepareStudioBackupRestore(changing); }
    finally { Reflect.set(globalThis, 'createImageBitmap', bitmap); }
    const restoreSnapshotCaptured = duringDecode && prepared.backup.workspace.documents.length === 0 && prepared.backup.media.assets[0].dataBase64 === fixture && prepared.assets[0].blob.size === original.size && prepared.assets[0].imageRenditions.bundles[0].variants[0].digest !== '0'.repeat(64);
    let readRejected = false;
    try { await api.readStudioBackup(new File([JSON.stringify(saved)], 'backup.json', { type: 'application/json' })); }
    catch (error) { readRejected = String(error).includes('cannot restore yet'); }
    let restoreRejected = false; try { await api.restoreStudioBackup(read); } catch { restoreRejected = true; }
    const old = structuredClone(saved); old.version = 6;
    let oldRejected = false; try { api.validateStudioBackup(old); } catch { oldRejected = true; }
    delete old.media.assets[0].imageRenditions;
    old.media.assets[0].sourceRevision = { unsupported: true };
    const preparedLegacy = await api.prepareStudioBackupRestore(old);
    const foreignLegacyRevisionOmitted = !('sourceRevision' in preparedLegacy.assets[0]);
    const corrupted = structuredClone(saved); corrupted.media.assets[0].imageRenditions.bundles[0].variants[0].digest = '0'.repeat(64);
    let corruptionRejected = false; try { await api.prepareStudioBackupRestore(corrupted); } catch { corruptionRejected = true; }
    const invalidRevision = structuredClone(saved); invalidRevision.media.assets[0].sourceRevision = '';
    let invalidRevisionRejected = false; try { await api.prepareStudioBackupRestore(invalidRevision); } catch { invalidRevisionRejected = true; }
    asset.blob = original;
    delete asset.imageRenditions;
    const legacy = await api.createStudioBackup(workspace);
    return { version: saved.version, sourceDigest: read.media.assets[0].imageRenditions.bundles[0].sourceDigest, originalData: read.media.assets[0].dataBase64 === fixture, variantCount: read.media.assets[0].imageRenditions.bundles[0].variants.length, restoreSnapshotCaptured, readRejected, restoreRejected, restores, oldRejected, foreignLegacyRevisionOmitted, corruptionRejected, invalidRevisionRejected, legacyVersion: legacy.version };
  }, { sources, fixture: fixture.toString('base64') });
  expect(result).toMatchObject({ version: 7, originalData: true, variantCount: 2, restoreSnapshotCaptured: true, readRejected: true, restoreRejected: true, restores: 0, oldRejected: true, foreignLegacyRevisionOmitted: true, corruptionRejected: true, invalidRevisionRejected: true, legacyVersion: 5 });
  expect(result.sourceDigest).toMatch(/^[a-f0-9]{64}$/);
});
