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
    assert.throws(() => backups.validateStudioBackup(incomplete), /missing file "required-photo" used by .+draft/);
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

for (const extra of [{ fallbackHeader: {} }, { parentPageId: "other-page" }]) test(`pre-v47 backups reject frozen ${Object.keys(extra)[0]} before a replacement can begin`, () => {
  const publication = { ...toLocallyPublishedArticle(draft), ...extra };
  const binned = { id: "deleted", deletedAt: now, document: draft, publication };
  assert.throws(() => backups.validateStudioBackup({ ...backup, workspace: { ...workspace, documents: [], activeDocumentId: "", bin: [binned] } }), /backup v47/);
  assert.throws(() => backups.validateStudioBackup({ ...backup, publications: JSON.stringify({ version: 57, posts: [publication] }) }), /snapshot is invalid/);
});

test("local and shared Template Bins require files from both the retained entry and the saved set", async () => {
  const { createTemplateSet, emptyTemplateStore, TEMPLATE_STORAGE_KEY } = await load("../app/studio/template-model.ts");
  const { assertTemplateMediaCanBeDeleted } = await load("../app/studio/template-store.ts");
  const active = createTemplateSet();
  const image = id => ({ id: "image", type: "image", mediaId: id, src: "", alt: "" });
  const retained = { id: "recovery-part", name: "Retained part", kind: "general", nodes: [image(photo.id)] };
  const saved = structuredClone(active);
  saved.parts.push({ ...retained, nodes: [image("snapshot-only")] });
  const templates = { ...emptyTemplateStore(), sets: [active], bin: [{
    id: "binned-part", deletedAt: now, kind: "template", setId: active.id, setName: active.name, entry: retained, setSnapshot: saved,
  }] };
  const globalTemplates = { format: "acm-global-templates", version: 49, templates,
    header: { setId: active.id, partId: active.parts.find(part => part.kind === "header").id },
    migrations: { test: { bases: [], bindings: [] }, test2: { bases: [], bindings: [] } } };
  const files = [photo, { ...photo, id: "snapshot-only" }];
  for (const contents of [{ templates }, { globalTemplates }]) {
    const complete = { ...backup, ...contents, media: { folders: [], assets: files } };
    assert.doesNotThrow(() => backups.validateStudioBackup(complete));
    for (const file of files) {
      const incomplete = { ...complete, media: { folders: [], assets: files.filter(item => item !== file) } };
      const message = new RegExp(`missing file "${file.id}" used by ${contents.templates ? "local" : "shared"} template Bin item "Retained part" `);
      assert.throws(() => backups.validateStudioBackup(incomplete), message);
      await assert.rejects(backups.prepareStudioBackupRestore(incomplete), message);
    }
  }
  const previous = globalThis.window;
  globalThis.window = { localStorage: { getItem: key => key === TEMPLATE_STORAGE_KEY ? JSON.stringify(templates) : null } };
  try {
    for (const file of files) assert.throws(() => assertTemplateMediaCanBeDeleted(file.id), /template or an item in the Bin/);
    assert.doesNotThrow(() => assertTemplateMediaCanBeDeleted("unrelated"));
  } finally {
    if (previous === undefined) delete globalThis.window;
    else globalThis.window = previous;
  }
});
