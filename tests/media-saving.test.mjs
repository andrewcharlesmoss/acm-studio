import assert from "node:assert/strict";
import test from "node:test";
import { mediaModules, mediaDatabase, mediaChannelRoom, mediaWindow, settle } from "./support/media-browser-fixture.mjs";

const now = () => new Date().toISOString();
const folder = (id = "folder", parentId = null) => ({ id, parentId, name: "Folder", createdAt: now() });
const asset = () => ({ id: "image", name: "Original", folderId: null, type: "image/png", size: 1, blob: new Blob(["x"], { type: "image/png" }), createdAt: now(), updatedAt: now(), altText: "Original alt", caption: "" });
async function fixture() {
  const db = mediaDatabase(); const window = mediaWindow(db.indexedDB);
  const load = mediaModules({ window }, { "./template-store": { assertTemplateMediaCanBeDeleted() {} } });
  const owner = load("app/studio/write-ownership.ts").studioWriteOwnership;
  const release = owner.acquire(token => owner.loaded(token, true), { async request(_name, options, callback) { assert.equal(options.ifAvailable, true); return callback({}); } });
  await settle(() => owner.canWrite());
  const store = load("app/studio/media-store.ts");
  const generation = await store.ensureMediaGeneration();
  let requestIndex = 0;
  return { db, window, owner, store, load, generation, release, request: command => ({ id: `request-${++requestIndex}`, generation, submittedAt: now(), command }) };
}

test("Files commands save content and replay receipts atomically, including upload and deletion", async () => {
  const f = await fixture();
  try {
    const upload = f.request({ kind: "upload", folderId: null, createdAt: now(), files: [{ id: "upload", name: "sample.png", type: "image/png", blob: new Blob(["bytes"], { type: "image/png" }) }] });
    await f.store.applyMediaRequest(upload); await f.store.applyMediaRequest(upload);
    assert.equal((await f.store.listMediaLibrary()).assets.length, 1);
    assert.equal(f.db.rows("commandReceipts").length, 1);
    const current = await f.store.getMediaAsset("upload");
    const remove = f.request({ kind: "delete-asset", id: "upload", before: f.load("app/studio/media-command.ts").assetBefore(current) });
    await f.store.applyMediaRequest(remove); await f.store.applyMediaRequest(remove);
    assert.equal((await f.store.listMediaLibrary()).assets.length, 0);
    assert.equal(f.db.rows("commandReceipts").length, 2);
    const failed = f.request({ kind: "create-folder", folder: folder() });
    f.db.failPut(2); // The folder write succeeds; its receipt fails before commit.
    await assert.rejects(f.store.applyMediaRequest(failed), /Injected transaction failure/);
    assert.equal((await f.store.listMediaLibrary()).folders.length, 0);
    assert.equal(f.db.rows("commandReceipts").length, 2, "failed mutation commits no receipt");
    await f.store.applyMediaRequest(failed);
    assert.equal((await f.store.listMediaLibrary()).folders.length, 1);
  } finally { f.release(); }
});

test("Files commands merge independent fields, reject overlap and protect hierarchy and non-empty folders", async () => {
  const f = await fixture();
  try {
    await f.store.replaceMediaLibrary([asset()], [folder(), folder("child", "folder")]);
    const generation = await f.store.ensureMediaGeneration();
    const command = update => ({ ...f.request(update), generation });
    await f.store.applyMediaRequest(command({ kind: "update-asset", id: "image", before: { caption: "" }, update: { caption: "Other caption" } }));
    await f.store.applyMediaRequest(command({ kind: "update-asset", id: "image", before: { name: "Original" }, update: { name: "Renamed" } }));
    const saved = await f.store.getMediaAsset("image");
    assert.equal(saved.name, "Renamed"); assert.equal(saved.caption, "Other caption");
    const receipts = f.db.rows("commandReceipts").length;
    await assert.rejects(f.store.applyMediaRequest(command({ kind: "update-asset", id: "image", before: { name: "Original" }, update: { name: "Overlapping" } })), error => error.code === "conflict");
    assert.equal((await f.store.getMediaAsset("image")).name, "Renamed");
    assert.equal(f.db.rows("commandReceipts").length, receipts);
    await assert.rejects(f.store.applyMediaRequest(command({ kind: "move-folder", id: "folder", parentId: "child", before: null })), /descendants/);
    await assert.rejects(f.store.applyMediaRequest(command({ kind: "delete-folder", id: "folder", before: { name: "Folder", parentId: null, colour: null } })), /everything inside/);
    await assert.rejects(f.store.applyMediaRequest(command({ kind: "update-asset", id: "image", before: { folderId: null }, update: { folderId: "missing" } })), /no longer available/);
  } finally { f.release(); }
});

test("Files replacement renews generation and blocks stale commands without changing restored content", async () => {
  const f = await fixture();
  try {
    const pending = f.request({ kind: "create-folder", folder: folder("stale") });
    await f.store.replaceMediaLibrary([asset()], []);
    await assert.rejects(f.store.applyMediaRequest(pending), error => error.code === "replaced");
    assert.equal((await f.store.listMediaLibrary()).assets[0].name, "Original");
    assert.equal((await f.store.listMediaLibrary()).folders.length, 0);
    assert.deepEqual(f.db.rows("commandReceipts"), []);
    f.release(); await settle(() => !f.owner.canWrite());
    await assert.rejects(f.store.applyMediaRequest(pending), /read-only/);
  } finally { f.release(); }
});

async function brokerFixture() {
  const f = await fixture(); const room = mediaChannelRoom();
  const ownerLoad = mediaModules({ window: f.window, BroadcastChannel: room.Channel }, { "./media-command": f.load("app/studio/media-command.ts"), "./write-ownership": { studioWriteOwnership: f.owner }, "./media-store": f.store, react: { useSyncExternalStore(_subscribe, snapshot) { return snapshot(); } } });
  const ownerSync = ownerLoad("app/studio/media-sync.ts");
  const peerWindow = mediaWindow({ open() { assert.fail("peer must never open IndexedDB for mutation"); } });
  const peerLoad = mediaModules({ window: peerWindow, BroadcastChannel: room.Channel }, { "./media-command": f.load("app/studio/media-command.ts"), "./write-ownership": { studioWriteOwnership: { canWrite: () => false } }, "./media-store": { ...f.store, applyMediaRequest() { assert.fail("peer must never save directly"); } }, react: { useSyncExternalStore(_subscribe, snapshot) { return snapshot(); } } });
  const peer = peerLoad("app/studio/media-sync.ts");
  const closeOwnerClient = ownerSync.startMediaClient(); const closePeer = peer.startMediaClient();
  let closeHost = ownerSync.createMediaHost(f.generation);
  await settle(() => ownerSync.useMediaSession().ready && peer.useMediaSession().ready);
  return { ...f, room, ownerSync, peer, peerWindow, replaceHost() { closeHost(); closeHost = ownerSync.createMediaHost(f.generation); }, close() { closeHost(); closePeer(); closeOwnerClient(); f.release(); } };
}

test("connected owner and peer Files commands save through one owner and notify both clients", async () => {
  const f = await brokerFixture();
  try {
    const ownerRevision = f.ownerSync.useMediaSession().revision;
    const peerRevision = f.peer.useMediaSession().revision;
    await f.peer.submitMediaCommand({ kind: "create-folder", folder: folder() });
    await f.ownerSync.submitMediaCommand({ kind: "rename-folder", id: "folder", name: "From owner", before: "Folder" });
    await settle(() => f.peer.useMediaSession().revision > peerRevision && f.ownerSync.useMediaSession().revision > ownerRevision);
    assert.equal((await f.store.listMediaLibrary()).folders[0].name, "From owner");
    assert.equal(f.db.rows("commandReceipts").length, 2);
  } finally { f.close(); }
});

test("Files owner replacement retries a lost acknowledgement with the same receipt ID without duplicate creation", async () => {
  const f = await brokerFixture();
  try {
    f.room.drop(message => message.kind === "result");
    const saved = f.peer.submitMediaCommand({ kind: "create-folder", folder: folder() });
    await settle(() => f.db.rows("commandReceipts").length === 1);
    f.room.drop(() => false); f.replaceHost(); await saved;
    const requests = f.room.sent.filter(message => message.kind === "request");
    assert.equal(requests.length, 2); assert.equal(requests[0].request.id, requests[1].request.id);
    assert.equal((await f.store.listMediaLibrary()).folders.length, 1);
    assert.equal(f.db.rows("commandReceipts").length, 1);
  } finally { f.close(); }
});

test("Files broker rejects invalid and conflicting commands and preserves saved details", async () => {
  const f = await brokerFixture();
  try {
    await assert.rejects(f.peer.submitMediaCommand({ kind: "unknown" }), /invalid/);
    await f.peer.submitMediaCommand({ kind: "create-folder", folder: folder() });
    await f.ownerSync.submitMediaCommand({ kind: "rename-folder", id: "folder", name: "First", before: "Folder" });
    await assert.rejects(f.peer.submitMediaCommand({ kind: "rename-folder", id: "folder", name: "Second", before: "Folder" }), error => error.code === "conflict");
    assert.equal((await f.store.listMediaLibrary()).folders[0].name, "First");
    assert.equal(f.db.rows("commandReceipts").length, 2);
  } finally { f.close(); }
});
