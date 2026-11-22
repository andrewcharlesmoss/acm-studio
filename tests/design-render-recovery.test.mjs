import test from 'node:test';
import assert from 'node:assert/strict';
import { createDesign, designMediaSources, detachRenderedMedia } from '../app/studio/design-model.ts';
import { prepareEditableDesignBackup, readEditableDesign } from '../app/studio/design-editable-backup.ts';

test('a 101-page editable design reopens through both legacy and current export formats', () => {
  const design = createDesign();
  for (let i = 1; i < 101; i++) design.pages.push({ ...design.pages[0], id: String(i), name: 'Page ' + (i + 1) });
  assert.deepEqual(readEditableDesign(JSON.stringify(design, null, 2)), design);
  const backup = prepareEditableDesignBackup(design);
  assert.equal(backup.kind, 'editable');
  assert.deepEqual(readEditableDesign(new TextDecoder().decode(backup.data)), design);
});

test('large pixel collections preserve the source and each page reopens with its image', () => {
  const design = createDesign();
  const template = design.pages[0];
  const png = Buffer.alloc(24);
  png.set([137, 80, 78, 71]);
  png.writeUInt32BE(4096, 16);
  png.writeUInt32BE(4096, 20);
  design.pages = [];
  for (let i = 0; i < 3; i++) {
    const id = 'image-' + i;
    design.assets.push({ id, name: id, width: 4096, height: 4096, type: 'image/png', dataUrl: 'data:image/png;base64,' + png.toString('base64') });
    design.pages.push({ ...template, id: 'page-' + i, objects: [{ id: 'object-' + i, type: 'image', assetId: id, x: 0, y: 0, width: 100, height: 100, rotation: 0, opacity: 1 }] });
  }
  design.activePageId = design.pages[0].id;
  const archive = prepareEditableDesignBackup(design);
  assert.equal(archive.kind, 'archive');
  assert.equal(archive.unavailable, 0);
  const decode = bytes => new TextDecoder().decode(bytes);
  assert.deepEqual(JSON.parse(decode(archive.files[0].data)), design);
  const restored = archive.files.slice(1).map(f => readEditableDesign(decode(f.data)));
  assert.deepEqual(restored.flatMap(d => d.pages), design.pages);
  assert.deepEqual(restored.flatMap(d => d.assets), design.assets);
});

test('source lookup suppresses ambiguous historical links and copies preserve page contents without file ownership', () => {
  const first = createDesign(), second = createDesign();
  first.pages[0].renderedMediaId = '__proto__';
  assert.deepEqual(designMediaSources([first])['__proto__'], { designId: first.id, pageId: first.activePageId });
  second.pages[0].renderedMediaId = '__proto__';
  assert.equal(designMediaSources([first, second])['__proto__'], undefined);
  const copy = detachRenderedMedia(second.pages[0]);
  assert.equal(copy.renderedMediaId, undefined);
  assert.equal(second.pages[0].renderedMediaId, '__proto__');
});
