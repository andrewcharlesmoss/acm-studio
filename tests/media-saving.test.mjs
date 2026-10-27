import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import test from "node:test";
import { mediaModules, mediaDatabase, mediaChannelRoom, mediaWindow, settle } from "./support/media-browser-fixture.mjs";
import { evaluateProductionModule } from "./production-module.mjs";

const now = () => new Date().toISOString();
const folder = (id = "folder", parentId = null) => ({ id, parentId, name: "Folder", createdAt: now() });
const asset = () => ({ id: "image", name: "Original", folderId: null, type: "image/png", size: 1, blob: new Blob(["x"], { type: "image/png" }), createdAt: now(), updatedAt: now(), altText: "Original alt", caption: "" });
let legacySources;
try {
  legacySources = Object.fromEntries(["media-command", "media-sync"].map(name => [name, execFileSync("git", ["show", `3e44f4a6:app/studio/${name}.ts`], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] })]));
} catch { /* A source archive or shallow checkout may not contain the old revision. */ }

function legacyMediaSync(window, room, owner, store) {
  const globals = { window, BroadcastChannel: room.Channel, Error, Blob, File, Event, URL, crypto, structuredClone, queueMicrotask };
  function load(source, dependencies = {}) {
    const module = { exports: {} };
    evaluateProductionModule(source, { ...globals, module, exports: module.exports, require(id) {
      if (Object.hasOwn(dependencies, id)) return dependencies[id];
      throw new Error(`Unexpected legacy dependency: ${id}`);
    } });
    return module.exports;
  }
  const command = load(legacySources["media-command"]);
  return load(legacySources["media-sync"], { "./media-command": command, "./write-ownership": { studioWriteOwnership: owner }, "./media-store": store, react: { useSyncExternalStore(_subscribe, snapshot) { return snapshot(); } } });
}
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

for (const oldSide of ["peer", "owner"]) {
  test(`immutable v1 ${oldSide} remains compatible with ordinary Files actions`, { skip: legacySources ? false : "The pinned legacy revision is unavailable in this checkout." }, async () => {
    const f = await fixture(); const room = mediaChannelRoom();
    const peerWindow = mediaWindow({ open() { assert.fail("peer must not write IndexedDB"); } });
    const react = { useSyncExternalStore(_subscribe, snapshot) { return snapshot(); } };
    const dependencies = { "./media-command": f.load("app/studio/media-command.ts"), "./write-ownership": { studioWriteOwnership: f.owner }, "./media-store": f.store, react };
    const currentOwner = mediaModules({ window: f.window, BroadcastChannel: room.Channel }, dependencies)("app/studio/media-sync.ts");
    const currentPeer = mediaModules({ window: peerWindow, BroadcastChannel: room.Channel }, { ...dependencies, "./write-ownership": { studioWriteOwnership: { canWrite: () => false } } })("app/studio/media-sync.ts");
    const legacyOwner = legacyMediaSync(f.window, room, f.owner, f.store);
    const legacyPeer = legacyMediaSync(peerWindow, room, { canWrite: () => false }, f.store);
    const host = oldSide === "owner" ? legacyOwner : currentOwner;
    const peer = oldSide === "peer" ? legacyPeer : currentPeer;
    const closePeer = peer.startMediaClient();
    const closeHost = host.createMediaHost(f.generation);
    try {
      await settle(() => peer.useMediaSession().ready);
      await peer.submitMediaCommand({ kind: "create-folder", folder: folder("cross-version") });
      assert.equal((await f.store.listMediaLibrary()).folders[0].id, "cross-version");
      if (oldSide === "owner") {
        assert.equal(peer.useMediaSession().supportsImageRenditions, false);
        await assert.rejects(peer.submitMediaCommand({ kind: "generate-image-renditions", id: "image", sourceDigest: "a".repeat(64) }), error => error.code === "unavailable");
      }
    } finally { closeHost(); closePeer(); f.release(); }
  });
}

test("older Files owners explicitly reject image-size requests without sending them", async () => {
  const f = await brokerFixture();
  try {
    const command = { kind: "generate-image-renditions", id: "image", sourceDigest: "a".repeat(64) };
    assert.equal(f.peer.useMediaSession().supportsImageRenditions, false);
    const before = f.room.sent.filter(message => message.kind === "request").length;
    await assert.rejects(f.peer.submitMediaCommand(command), error => error.code === "unavailable" && /Refresh/.test(error.message));
    assert.equal(f.room.sent.filter(message => message.kind === "request").length, before);
    await assert.rejects(f.store.applyMediaRequest(f.request(command)), error => error.code === "unavailable");
    assert.equal(f.db.rows("commandReceipts").length, 0);
    const validate = f.load("app/studio/media-command.ts").validateMediaCommand;
    assert.equal(validate(command), true);
    assert.equal(validate({ ...command, sourceDigest: "A".repeat(64) }), false);
    assert.equal(validate({ ...command, extra: true }), false);
  } finally { f.close(); }
});

test("pending image-size requests are not resent to an owner without support", async () => {
  const f = await brokerFixture();
  const host = new f.room.Channel("acm-studio-media-v1");
  try {
    const available = (ownerId, capabilities) => host.postMessage({ protocol: "acm-studio-media-v1", kind: "available", ownerId, generation: f.generation, ...(capabilities ? { capabilities } : {}) });
    available("capable-owner", ["image-renditions-v1"]);
    await settle(() => f.peer.useMediaSession().supportsImageRenditions);
    const pending = f.peer.submitMediaCommand({ kind: "generate-image-renditions", id: "image", sourceDigest: "b".repeat(64) });
    const rejected = assert.rejects(pending, error => error.code === "unavailable" && /could not be confirmed/.test(error.message));
    await settle(() => f.room.sent.some(message => message.kind === "request" && message.request.command.kind === "generate-image-renditions"));
    const requests = f.room.sent.filter(message => message.kind === "request" && message.request.command.kind === "generate-image-renditions").length;
    available("legacy-owner");
    await rejected;
    assert.equal(f.peer.useMediaSession().supportsImageRenditions, false);
    assert.equal(f.room.sent.filter(message => message.kind === "request" && message.request.command.kind === "generate-image-renditions").length, requests);
  } finally { host.close(); f.close(); }
});

test("library replacement takes precedence over a lost image-size capability", async () => {
  const f = await brokerFixture();
  const host = new f.room.Channel("acm-studio-media-v1");
  try {
    host.postMessage({ protocol: "acm-studio-media-v1", kind: "available", ownerId: "capable-owner", generation: f.generation, capabilities: ["image-renditions-v1"] });
    await settle(() => f.peer.useMediaSession().supportsImageRenditions);
    const pending = f.peer.submitMediaCommand({ kind: "generate-image-renditions", id: "image", sourceDigest: "d".repeat(64) });
    const rejected = assert.rejects(pending, error => error.code === "replaced");
    await settle(() => f.room.sent.some(message => message.kind === "request" && message.request.command.kind === "generate-image-renditions"));
    host.postMessage({ protocol: "acm-studio-media-v1", kind: "available", ownerId: "capable-owner", generation: "replacement-generation" });
    await rejected;
    assert.equal(f.peer.useMediaSession().supportsImageRenditions, false);
  } finally { host.close(); f.close(); }
});

test("a capability removed by the same Files owner rejects an uncertain request", async () => {
  const f = await brokerFixture();
  const host = new f.room.Channel("acm-studio-media-v1");
  try {
    host.postMessage({ protocol: "acm-studio-media-v1", kind: "available", ownerId: "capable-owner", generation: f.generation, capabilities: ["image-renditions-v1"] });
    await settle(() => f.peer.useMediaSession().supportsImageRenditions);
    const pending = f.peer.submitMediaCommand({ kind: "generate-image-renditions", id: "image", sourceDigest: "e".repeat(64) });
    const rejected = assert.rejects(pending, error => error.code === "unavailable" && /could not be confirmed/.test(error.message));
    await settle(() => f.room.sent.some(message => message.kind === "request" && message.request.command.kind === "generate-image-renditions"));
    host.postMessage({ protocol: "acm-studio-media-v1", kind: "available", ownerId: "capable-owner", generation: f.generation });
    await rejected;
    assert.equal(f.peer.useMediaSession().supportsImageRenditions, false);
  } finally { host.close(); f.close(); }
});

test("the Files owner rejects unsupported image-size requests before touching storage", async () => {
  const f = await brokerFixture();
  const host = new f.room.Channel("acm-studio-media-v1");
  const original = f.store.applyMediaRequest;
  try {
    const owner = f.room.sent.find(message => message.kind === "available").ownerId;
    f.store.applyMediaRequest = () => assert.fail("unsupported commands must not reach storage");
    host.postMessage({ protocol: "acm-studio-media-v1", kind: "request", ownerId: owner, clientId: "direct-client", request: f.request({ kind: "generate-image-renditions", id: "image", sourceDigest: "c".repeat(64) }) });
    await settle(() => f.room.sent.some(message => message.kind === "result" && message.clientId === "direct-client"));
    const result = f.room.sent.find(message => message.kind === "result" && message.clientId === "direct-client");
    assert.equal(result.ok, false); assert.equal(result.code, "unavailable");
    assert.equal(f.db.rows("commandReceipts").length, 0);
  } finally { f.store.applyMediaRequest = original; host.close(); f.close(); }
});

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

test("Files retries retain the originally submitted command when its caller changes the input", async () => {
  const f = await brokerFixture();
  try {
    f.room.drop(message => message.kind === "result");
    const command = { kind: "create-folder", folder: folder() };
    const saved = f.peer.submitMediaCommand(command);
    await settle(() => f.db.rows("commandReceipts").length === 1);
    command.folder.name = "Changed after submission";
    f.room.drop(() => false); f.replaceHost(); await saved;
    const requests = f.room.sent.filter(message => message.kind === "request");
    assert.equal(requests.length, 2);
    assert.equal(requests[0].request.id, requests[1].request.id);
    assert.equal(requests[0].request.command.folder.name, "Folder");
    assert.equal(requests[1].request.command.folder.name, "Folder");
    assert.equal((await f.store.listMediaLibrary()).folders[0].name, "Folder");
  } finally { f.close(); }
});

test("the pinned older v1 peer demonstrates the previous mutable-retry behaviour", { skip: legacySources ? false : "The pinned legacy revision is unavailable in this checkout." }, async () => {
  const f = await fixture(); const room = mediaChannelRoom();
  const owner = mediaModules({ window: f.window, BroadcastChannel: room.Channel }, { "./media-command": f.load("app/studio/media-command.ts"), "./write-ownership": { studioWriteOwnership: f.owner }, "./media-store": f.store, react: { useSyncExternalStore(_subscribe, snapshot) { return snapshot(); } } })("app/studio/media-sync.ts");
  const peerWindow = mediaWindow({ open() { assert.fail("peer must not write IndexedDB"); } });
  const peer = legacyMediaSync(peerWindow, room, { canWrite: () => false }, f.store);
  const closePeer = peer.startMediaClient(); let closeHost = owner.createMediaHost(f.generation);
  try {
    await settle(() => peer.useMediaSession().ready);
    room.drop(message => message.kind === "result");
    const command = { kind: "create-folder", folder: folder() };
    const saved = peer.submitMediaCommand(command);
    await settle(() => f.db.rows("commandReceipts").length === 1);
    command.folder.name = "Changed after submission";
    room.drop(() => false); closeHost(); closeHost = owner.createMediaHost(f.generation); await saved;
    const requests = room.sent.filter(message => message.kind === "request");
    assert.equal(requests.length, 2);
    assert.equal(requests[0].request.id, requests[1].request.id);
    assert.equal(requests[0].request.command.folder.name, "Folder");
    assert.equal(requests[1].request.command.folder.name, "Changed after submission");
    assert.equal((await f.store.listMediaLibrary()).folders[0].name, "Folder");
  } finally { closeHost(); closePeer(); f.release(); }
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
