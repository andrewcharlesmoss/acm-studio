import assert from "node:assert/strict";
import test from "node:test";
import { loadProductionModule } from "./production-module.mjs";

const load = path => loadProductionModule(new URL(path, import.meta.url));
const backups = await load("../app/studio/backup-store.ts");
const { createDocument } = await load("../app/studio/editor-model.ts");
const { revisionDocument } = await load("../app/studio/document-revisions.ts");
const { toLocallyPublishedArticle } = await load("../app/content/local-publishing.ts");
const now = "2026-11-22T00:00:00Z";
const draft = createDocument("page", "draft");
const required = { ...draft, blocks: [{ id: "photo", type: "image", src: "", mediaId: "required-photo", alt: "My photo" }] };
const workspace = { version: 66, activeDocumentId: draft.id, documents: [draft], categories: [], bin: [] };
const backup = { format: "acm-studio-backup", version: 46, exportedAt: now, workspace, publications: null, media: { folders: [], assets: [] } };
const photo = { id: "required-photo", name: "Original", size: 1, type: "image/png", folderId: null, altText: "", caption: "", createdAt: now, updatedAt: now, dataBase64: "AA==" };

for (const [owner, changes] of [
  ["active document", { workspace: { ...workspace, documents: [required] } }],
  ["featured image", { workspace: { ...workspace, documents: [{ ...draft, coverImage: { src: "", alt: "My photo", mediaId: photo.id } }] } }],
  ["revision", { workspace: { ...workspace, documentRevisions: [{ id: "revision", savedAt: now, document: revisionDocument(required) }] } }],
  ["Bin", { workspace: { ...workspace, documents: [], activeDocumentId: "", bin: [{ id: "bin", deletedAt: now, document: required }] } }],
  ["publication cover absent from the stored media index", { publications: JSON.stringify({ version: 57, posts: [{ ...toLocallyPublishedArticle(draft), coverImage: { src: "", alt: "My photo", mediaId: photo.id }, mediaIds: [] }] }) }],
  ["publication without template", { publications: JSON.stringify({ version: 57, posts: [toLocallyPublishedArticle(required)] }) }],
]) {
  test(`complete backup checks the file owned by ${owner} before restore`, async () => {
    const incomplete = { ...backup, ...changes };
    assert.throws(() => backups.validateStudioBackup(incomplete), /missing|snapshot is invalid/i);
    await assert.rejects(backups.prepareStudioBackupRestore(incomplete));
    assert.doesNotThrow(() => backups.validateStudioBackup({ ...incomplete, media: { folders: [], assets: [photo] } }));
  });
}

test("the archive rejects corrupt metadata, changed bytes, truncation and trailing data before restoring", async () => {
  const { encodeBackupArchive, decodeBackupArchive } = await load("../app/studio/backup-archive.ts");
  const file = await encodeBackupArchive({ test: "complete" }, [new Blob(["one"]), new Blob(["two"])]);
  const bytes = new Uint8Array(await file.arrayBuffer());
  for (const index of [0, 22, 40, bytes.length - 1]) {
    const damaged = bytes.slice();
    damaged[index] ^= 7;
    await assert.rejects(decodeBackupArchive(new Blob([damaged])));
  }
  await assert.rejects(decodeBackupArchive(file.slice(0, -1)));
  await assert.rejects(decodeBackupArchive(new Blob([file, "trailing data"])));
  assert.deepEqual(await Promise.all((await decodeBackupArchive(file)).blobs.map(blob => blob.text())), ["one", "two"]);
});

test("pre-v47 backups reject frozen headers before a replacement can begin", () => {
  const publication = { ...toLocallyPublishedArticle(draft), fallbackHeader: {} };
  const binned = { id: "deleted", deletedAt: now, document: draft, publication };
  assert.throws(() => backups.validateStudioBackup({ ...backup, workspace: { ...workspace, documents: [], activeDocumentId: "", bin: [binned] } }), /backup v47/);
  assert.throws(() => backups.validateStudioBackup({ ...backup, publications: JSON.stringify({ version: 57, posts: [publication] }) }), /snapshot is invalid/);
});
