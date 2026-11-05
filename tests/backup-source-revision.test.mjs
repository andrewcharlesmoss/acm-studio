import assert from 'node:assert/strict';
import test, { before, after } from 'node:test';

const previousWindow = globalThis.window;
before(() => { globalThis.window = { atob: globalThis.atob }; });
after(() => { if (previousWindow === undefined) delete globalThis.window; else globalThis.window = previousWindow; });
import { loadProductionModule } from './production-module.mjs';

const { validateStudioBackup, prepareStudioBackupRestore } = await loadProductionModule(new URL('../app/studio/backup-store.ts', import.meta.url));
const { createDocument } = await loadProductionModule(new URL('../app/studio/editor-model.ts', import.meta.url));

function backup(version, sourceRevision) {
  const document = createDocument('page', 'backup-revision');
  return { format: 'acm-studio-backup', version, exportedAt: '2026-11-05T00:00:00Z',
    workspace: { version: 59, documents: [document], categories: [], bin: [], activeDocumentId: document.id },
    publications: null, media: { folders: [], assets: [{ id: 'image', name: 'Image.png', type: 'image/png', size: 1, folderId: null, altText: '', caption: '', createdAt: '2026-11-05T00:00:00Z', updatedAt: '2026-11-05T00:00:00Z', dataBase64: 'AA==', sourceRevision }] } };
}

test('every backup version from v7 validates authored media source revisions', () => {
  for (let version = 7; version <= 38; version++) {
    for (const sourceRevision of [undefined, 'revision-one', 'x'.repeat(180)]) assert.doesNotThrow(() => validateStudioBackup(backup(version, sourceRevision)));
    for (const sourceRevision of ['', false, 42, {}, 'x'.repeat(181)]) assert.throws(() => validateStudioBackup(backup(version, sourceRevision)), /invalid source revision/, `v${version}: ${JSON.stringify(sourceRevision)}`);
  }
});

test('legacy v6 foreign revision metadata remains recoverable', () => {
  const foreign = { unsupported: true };
  assert.deepEqual(validateStudioBackup(backup(6, foreign)).media.assets[0].sourceRevision, foreign);
});


test('legacy recovery keeps foreign revisions and colliding metadata without changing input', async () => {
  for (const foreign of [null, false, 42, '', { nested: ['old', null, true] }, 'x'.repeat(181)]) {
    const input = backup(6, foreign);
    input.media.assets[0].backupRecovery = { existing: [false, 0, null] };
    const original = structuredClone(input);
    const { assets } = await prepareStudioBackupRestore(input);
    assert.deepEqual(assets[0].backupRecovery, { version: 1, sourceRevision: foreign, previousValue: { existing: [false, 0, null] } });
    assert.match(assets[0].sourceRevision, /^[a-f0-9-]{36}$/);
    assert.deepEqual(input, original);
    const current = { ...input, version: 38, media: { folders: [], assets: [{ ...input.media.assets[0], sourceRevision: assets[0].sourceRevision, backupRecovery: assets[0].backupRecovery }] } };
    const repeated = await prepareStudioBackupRestore(current);
    assert.deepEqual(repeated.assets[0].backupRecovery, assets[0].backupRecovery);
    assert.equal(repeated.assets[0].sourceRevision, assets[0].sourceRevision);
  }
});

test('old recovery-field collisions are retained even with valid media revisions', async () => {
  for (const version of [1, 6, 7, 37]) {
    const input = backup(version, 'valid-revision');
    input.media.assets[0].backupRecovery = { version: 1, previousValue: 'unowned old field' };
    const prepared = await prepareStudioBackupRestore(input);
    assert.equal(prepared.assets[0].sourceRevision, 'valid-revision');
    assert.deepEqual(prepared.assets[0].backupRecovery, { version: 1, previousValue: input.media.assets[0].backupRecovery });
  }
});

test('invalid or unbounded recovery metadata is rejected before preparing a restore', async () => {
  const cyclic = {}; cyclic.child = cyclic;
  let deep = null; for (let depth = 0; depth < 34; depth++) deep = { child: deep };
  for (const foreign of [cyclic, deep, Array(10001).fill(null), new Date(), () => {}, { bad: undefined }, { bad: Infinity }]) {
    const input = backup(6, foreign);
    assert.throws(() => validateStudioBackup(input), /recovery metadata/);
    await assert.rejects(prepareStudioBackupRestore(input), /recovery metadata/);
  }
  for (const invalid of [null, {}, { version: 2, previousValue: null }, { version: 1 }, { version: 1, sourceRevision: undefined }, { version: 1, extra: true, previousValue: null }]) {
    const current = backup(38, 'valid'); current.media.assets[0].backupRecovery = invalid;
    assert.throws(() => validateStudioBackup(current), /recovery metadata/);
  }
});
