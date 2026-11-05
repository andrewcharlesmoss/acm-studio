import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
import { buildBackupPredicates } from './helpers/media-adapter';
declare global { interface Window { BackupPredicates: typeof import('./fixtures/backup-predicates') } }

test('backup v7 retains image sizes and restores them into the current media schema', async ({ page }) => {
  const paths = ['app/content/raster-dimensions.ts', 'app/content/image-resolution.ts', 'app/studio/image-rendition-generation.ts', 'app/studio/image-rendition-validation.ts', 'app/studio/media-serialization.ts', 'app/studio/image-rendition-serialization.ts', 'app/studio/image-rendition-backup.ts', 'app/studio/media-backup-recovery.ts', 'app/studio/backup-store.ts'];
  const sources = await Promise.all(paths.map(async path => ts.transpileModule(await readFile(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText));
  const fixture = await readFile('public/specimens/landscape.png');
  const predicateSource = await buildBackupPredicates();
  await page.route('**/*', route => route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>Backup test</title>' }));
  await page.goto('http://localhost:3011/');
  await page.addScriptTag({ content: predicateSource });
  const result = await page.evaluate(async ({ sources, fixture, predicateOwners }) => {
    const ids = ['raster-dimensions', 'image-resolution', 'image-rendition-generation', 'image-rendition-validation', 'media-serialization', 'image-rendition-serialization', 'image-rendition-backup', 'media-backup-recovery', 'backup-store'];
    const modules: Record<string, unknown> = {};
    const bytes = Uint8Array.from(atob(fixture), character => character.charCodeAt(0));
    const original = new Blob([bytes], { type: 'image/png' });
    type TestAsset = import('../../app/studio/media-store').MediaAsset & { imageRenditions?: import('../../app/content/image-resolution').ImageRenditions };
    type RestoredAsset = Omit<TestAsset, 'sourceRevision'> & { sourceRevision?: unknown };
    const workspace: import('../../app/studio/editor-model').StudioWorkspace = { version: 59, activeDocumentId: '', categories: [], documents: [], bin: [] };
    let restores = 0; let restoredAssets: RestoredAsset[] = [];
    function requireSizes<T>(asset: { imageRenditions?: T }): T { if (!asset.imageRenditions) throw new Error('Expected retained image sizes.'); return asset.imageRenditions; }
    function isForeignRevision(value: unknown) { return Boolean(value && typeof value === 'object' && 'unsupported' in value && value.unsupported === true); }
    const dependencies: Record<string, unknown> = {
      'featured-images': { collectSiteImages: async () => [] },
      'site-featured-image.mjs': { siteImageNames: () => [], SITE_IMAGE_MAX_BYTES: 2 * 1024 * 1024 },
      'global-template-contract': { validateGlobalTemplateLibrary: (value: unknown) => value },
      'workspace-repository': { withSavedDocumentRevisions: (value: unknown) => value },
      'write-ownership': { studioWriteOwnership: { restore: async (operation: (permit: object) => Promise<void>) => { restores++; await operation({}); } } },
      'local-publishing': { LOCAL_WORKSPACE_KEY: 'workspace', LOCAL_PUBLICATIONS_KEY: 'publications' },
      'design-model': { DESIGN_STORAGE_KEY: 'design', validateDesignProject: () => {} },
      'design-store': { loadDesigns: () => [] },
      'media-store': { listMediaLibrary: async () => ({ folders: [], assets: [asset] }), replaceMediaLibrary: async (assets: RestoredAsset[]) => { restoredAssets = assets; } },
      'workspace-validation': { isRecord: (value: unknown) => !!value && typeof value === 'object' && !Array.isArray(value), migrateStudioWorkspace: (value: unknown) => value, validateStudioWorkspace: () => {} },
      'template-model': { validateTemplateStore: (value: unknown) => value, validateWorkspacePublicationTemplates: (value: unknown) => value, validateTemplatePublicationSnapshot: (value: unknown) => value, templateMediaIds: () => [] },
      'template-store': { loadTemplates: () => undefined },
    };
    for (let index = 0; index < ids.length; index++) {
      const loadedModule = { exports: {} };
      new Function('exports', 'module', 'require', sources[index])(loadedModule.exports, loadedModule, (name: string) => {
        const id = name.split('/').at(-1)!;
        if (id in modules) return modules[id];
        const dependency = dependencies[id];
        if (dependency && typeof dependency === 'object') return { ...window.BackupPredicates, ...dependency };
        if (predicateOwners.includes(id)) return window.BackupPredicates;
        throw new Error(`Unexpected dependency: ${name}`);
      });
      modules[ids[index]] = loadedModule.exports;
    }
    const bundle = await (modules['image-rendition-generation'] as typeof import('../../app/studio/image-rendition-generation')).generateImageRenditions(original);
    if (!bundle) throw new Error('Expected generated image sizes.');
    const asset: TestAsset = { id: 'image', name: 'Image', folderId: null, type: 'image/png', size: original.size, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z', altText: '', caption: '', blob: original, imageRenditions: { version: 1, bundles: [bundle] } };
    const api = modules['backup-store'] as typeof import('../../app/studio/backup-store');
    const originalRead = FileReader.prototype.readAsDataURL;
    FileReader.prototype.readAsDataURL = function (blob: Blob) {
      asset.blob = new Blob(['changed'], { type: 'image/png' });
      requireSizes(asset).bundles[0].variants[0].digest = '0'.repeat(64);
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
      // @ts-expect-error The hostile asynchronous mutation must not enter the captured restore snapshot.
      changing.workspace.documents.push({ id: 'late-change' });
      requireSizes(changing.media.assets[0]).bundles[0].variants[0].digest = '0'.repeat(64);
      changing.media.assets[0].dataBase64 = 'AAAA';
      return Reflect.apply(bitmap, globalThis, args);
    });
    let prepared;
    try { prepared = await api.prepareStudioBackupRestore(changing); }
    finally { Reflect.set(globalThis, 'createImageBitmap', bitmap); }
    const restoreSnapshotCaptured = duringDecode && prepared.backup.workspace.documents.length === 0 && prepared.backup.media.assets[0].dataBase64 === fixture && prepared.assets[0].blob.size === original.size && requireSizes(prepared.assets[0]).bundles[0].variants[0].digest !== '0'.repeat(64);
    const imported = await api.readStudioBackup(new File([JSON.stringify(saved)], 'backup.json', { type: 'application/json' }));
    let restoreRejected = false; try { await api.restoreStudioBackup(imported); } catch { restoreRejected = true; }
    const restoredWithSizes = restoredAssets[0]?.imageRenditions?.bundles[0]?.variants.every((variant) => variant.blob instanceof Blob) === true;
    const old = structuredClone(saved); old.version = 6;
    let oldRejected = false; try { api.validateStudioBackup(old); } catch { oldRejected = true; }
    delete old.media.assets[0].imageRenditions;
    let versionReads = 0;
    const changingVersion = { ...old, get version() { return ++versionReads === 1 ? 6 : 7; } };
    let capturedVersion = 0;
    try { capturedVersion = api.validateStudioBackup(changingVersion).version; } catch { /* Invalid input stays rejected. */ }
    // @ts-expect-error Legacy foreign revision metadata is intentionally not a current-format string.
    old.media.assets[0].sourceRevision = { unsupported: true };
    const preparedLegacy = await api.prepareStudioBackupRestore(old);
    const foreignLegacyRevisionPreserved = isForeignRevision(preparedLegacy.assets[0].backupRecovery?.sourceRevision);
    const priorRestores = restores;
    const pendingRestore = api.restoreStudioBackup(old);
    const ownershipRequestedImmediately = restores === priorRestores + 1;
    await pendingRestore;
    const legacyRestorePreserved = isForeignRevision(restoredAssets[0].backupRecovery?.sourceRevision) && restoredAssets[0].blob.size === original.size;
    const corrupted = structuredClone(saved); requireSizes(corrupted.media.assets[0]).bundles[0].variants[0].digest = '0'.repeat(64);
    let corruptionRejected = false; try { await api.prepareStudioBackupRestore(corrupted); } catch { corruptionRejected = true; }
    const invalidRevision = structuredClone(saved); invalidRevision.media.assets[0].sourceRevision = '';
    let invalidRevisionRejected = false; try { await api.prepareStudioBackupRestore(invalidRevision); } catch { invalidRevisionRejected = true; }
    asset.blob = original;
    delete asset.imageRenditions;
    const legacy = await api.createStudioBackup(workspace);
    return { version: saved.version, sourceDigest: requireSizes(read.media.assets[0]).bundles[0].sourceDigest, originalData: read.media.assets[0].dataBase64 === fixture, variantCount: requireSizes(read.media.assets[0]).bundles[0].variants.length, restoreSnapshotCaptured, restoreRejected, restoredWithSizes, restores, oldRejected, capturedVersion, ownershipRequestedImmediately, foreignLegacyRevisionPreserved, legacyRestorePreserved, corruptionRejected, invalidRevisionRejected, legacyVersion: legacy.version };
  }, { sources, fixture: fixture.toString('base64'), predicateOwners: ['website-design', 'website-fonts', 'box-lengths', 'pullquote-block', 'code-runs', 'video-block', 'social-services', 'layout', 'grid-child-sizing', 'featured-image-overlay', 'details-block', 'cover-block', 'author-profile-presentation', 'image-duotone', 'image-edit', 'document-metadata', 'template-model', 'columns'] });
  expect(result).toMatchObject({ version: 38, originalData: true, variantCount: 2, restoreSnapshotCaptured: true, restoreRejected: false, restoredWithSizes: true, restores: 2, oldRejected: true, capturedVersion: 6, ownershipRequestedImmediately: true, foreignLegacyRevisionPreserved: true, legacyRestorePreserved: true, corruptionRejected: true, invalidRevisionRejected: true, legacyVersion: 38 });
  expect(result.sourceDigest).toMatch(/^[a-f0-9]{64}$/);
});
