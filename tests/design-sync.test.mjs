import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";

const require = createRequire(import.meta.url);
const root = new URL("../", import.meta.url).pathname;

function modules(globals = {}) {
  const cache = new Map();
  return function load(file) {
    const filename = path.resolve(root, file);
    if (cache.has(filename)) return cache.get(filename);
    const exports = {};
    cache.set(filename, exports);
    const source = ts.transpileModule(readFileSync(filename, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
    vm.runInNewContext(source, {
      exports, Error, AggregateError, Promise, JSON, Math, Number, Object, Array, Set, Map,
      Date, String, Boolean, Symbol, structuredClone, crypto: globalThis.crypto,
      setTimeout, clearTimeout, setInterval, clearInterval, ...globals,
      require(specifier) {
        if (!specifier.startsWith(".")) return require(specifier);
        return load(path.resolve(path.dirname(filename), /.(mjs|ts)$/.test(specifier) ? specifier : `${specifier}.ts`));
      },
    }, { filename });
    return exports;
  };
}

function channelBus() {
  const rooms = new Map();
  return (name) => {
    const listeners = new Set();
    const room = rooms.get(name) ?? new Set();
    room.add(listeners); rooms.set(name, room);
    return {
      postMessage(message) {
        for (const peer of room) if (peer !== listeners) queueMicrotask(() => peer.forEach((listener) => listener({ data: structuredClone(message) })));
      },
      addEventListener(type, listener) { if (type === "message") listeners.add(listener); },
      removeEventListener(type, listener) { if (type === "message") listeners.delete(listener); },
      close() { room.delete(listeners); listeners.clear(); },
    };
  };
}

async function settle() {
  for (let index = 0; index < 8; index += 1) await Promise.resolve();
}

test("design sync validates the design room and commits peer edits through the primary", async () => {
  const load = modules();
  const model = load("app/studio/design-model.ts");
  const sync = load("app/studio/design-sync.ts");
  const design = model.createDesign();
  assert.equal(sync.validateDesignSyncMessage({ protocol: sync.DESIGN_SYNC_PROTOCOL, designId: design.id, senderId: "peer", kind: "hello", requestId: "hello" }, design.id).kind, "hello");
  assert.equal(sync.validateDesignSyncMessage({ protocol: sync.DESIGN_SYNC_PROTOCOL, designId: "other", senderId: "peer", kind: "hello", requestId: "hello" }, design.id), null);

  const channelFactory = channelBus();
  let persisted = design;
  const snapshots = [];
  const primary = sync.createDesignSync({ designId: design.id, initialSnapshot: design, role: "primary", channelFactory, onSnapshot: () => {}, persistPrimary: async (next) => { persisted = next; } });
  const peer = sync.createDesignSync({ designId: design.id, initialSnapshot: design, role: "peer", channelFactory, onSnapshot: (next) => snapshots.push(next), persistPrimary: async () => { throw new Error("peer must not persist"); } });
  await settle();
  assert.equal(peer.getStatus(), "synced");
  await peer.submit({ ...design, name: "Changed in the other tab" });
  assert.equal(persisted.name, "Changed in the other tab");
  assert.equal(snapshots.at(-1).name, "Changed in the other tab");
  primary.close(); peer.close();
});

test("design sync rejects malformed or cross-design operations before persistence", () => {
  const load = modules();
  const model = load("app/studio/design-model.ts");
  const sync = load("app/studio/design-sync.ts");
  const design = model.createDesign();
  const base = { protocol: sync.DESIGN_SYNC_PROTOCOL, designId: design.id, senderId: "peer", kind: "operation", requestId: "operation", transaction: { protocol: sync.DESIGN_SYNC_PROTOCOL, transactionId: "transaction", clientId: "peer", designId: design.id, brokerEpoch: "epoch", baseRevision: 0, updatedAt: design.updatedAt, changes: [] } };
  assert.equal(sync.validateDesignSyncMessage({ ...base, transaction: { ...base.transaction, baseRevision: -1 } }, design.id), null);
  assert.equal(sync.validateDesignSyncMessage({ ...base, designId: "other" }, design.id), null);
  assert.equal(sync.validateDesignSyncMessage({ ...base, transaction: { ...base.transaction, designId: "other" } }, design.id), null);
});

test("design merge combines independent changes and rejects competing values", () => {
  const load = modules();
  const model = load("app/studio/design-model.ts");
  const merge = load("app/studio/design-merge.ts");
  const design = model.createDesign();
  const firstObject = { id: "text-one", type: "text", x: 10, y: 20, width: 300, height: 90, rotation: 0, opacity: 1, text: "Hello", colour: "#17191c", fontFamily: "Inter", fontSize: 32, fontWeight: 600, align: "left" };
  const secondObject = { id: "text-two", type: "text", x: 30, y: 50, width: 300, height: 90, rotation: 0, opacity: 1, text: "World", colour: "#17191c", fontFamily: "Inter", fontSize: 32, fontWeight: 600, align: "left" };
  const withObjects = { ...design, pages: [{ ...design.pages[0], objects: [firstObject, secondObject] }] };
  const mine = { ...withObjects, pages: [{ ...withObjects.pages[0], objects: withObjects.pages[0].objects.map((item) => item.id === "text-one" ? { ...item, text: "Mine" } : item) }] };
  const theirs = { ...withObjects, pages: [{ ...withObjects.pages[0], objects: withObjects.pages[0].objects.map((item) => item.id === "text-two" ? { ...item, text: "Theirs" } : item) }] };
  const mineTransaction = merge.createDesignTransaction(withObjects, mine, { transactionId: "mine", clientId: "mine", brokerEpoch: "epoch", baseRevision: 0 });
  const merged = merge.applyDesignTransaction(theirs, mineTransaction);
  assert.equal(merged.conflicts.length, 0);
  assert.equal(merged.snapshot.pages[0].objects[0].text, "Mine");
  assert.equal(merged.snapshot.pages[0].objects[1].text, "Theirs");

  const competing = { ...withObjects, pages: [{ ...withObjects.pages[0], objects: withObjects.pages[0].objects.map((item) => item.id === "text-one" ? { ...item, text: "Other" } : item) }] };
  const conflict = merge.applyDesignTransaction(competing, mineTransaction);
  assert.equal(conflict.conflicts.length, 1);
  assert.equal(conflict.conflicts[0].reason, "property");
});

test("design merge preserves concurrent inserts and detects order conflicts", () => {
  const load = modules();
  const model = load("app/studio/design-model.ts");
  const merge = load("app/studio/design-merge.ts");
  const base = model.createDesign();
  const object = (id, text) => ({ id, type: "text", x: 10, y: 20, width: 300, height: 90, rotation: 0, opacity: 1, text, colour: "#17191c", fontFamily: "Inter", fontSize: 32, fontWeight: 600, align: "left" });
  const local = { ...base, pages: [{ ...base.pages[0], objects: [object("one", "One")] }] };
  const remote = { ...base, pages: [{ ...base.pages[0], objects: [object("two", "Two")] }] };
  const insert = merge.createDesignTransaction(base, local, { transactionId: "insert", clientId: "local", brokerEpoch: "epoch", baseRevision: 0 });
  const merged = merge.applyDesignTransaction(remote, insert);
  assert.equal(merged.conflicts.length, 0);
  assert.equal(JSON.stringify(merged.snapshot.pages[0].objects.map((item) => item.id).sort()), JSON.stringify(["one", "two"]));

  const sameIdRemote = { ...base, pages: [{ ...base.pages[0], objects: [object("one", "Remote")] }] };
  const sameIdResult = merge.applyDesignTransaction(sameIdRemote, insert);
  assert.equal(sameIdResult.conflicts.length, 1);
  assert.equal(merge.resolveDesignConflicts(sameIdRemote, insert, sameIdResult, "mine").pages[0].objects[0].text, "One");

  const deleted = { ...base, pages: [{ ...base.pages[0], objects: [object("deleted", "Keep me")] }] };
  const deleteTarget = { ...deleted, pages: [{ ...deleted.pages[0], objects: [] }] };
  const edited = { ...deleted, pages: [{ ...deleted.pages[0], objects: [object("deleted", "Edited elsewhere")] }] };
  const deleteTransaction = merge.createDesignTransaction(deleted, deleteTarget, { transactionId: "delete", clientId: "local", brokerEpoch: "epoch", baseRevision: 0 });
  const deleteResult = merge.applyDesignTransaction(edited, deleteTransaction);
  assert.equal(deleteResult.conflicts.some((item) => item.reason === "delete"), true);
  assert.equal(deleteResult.snapshot.pages[0].objects[0].text, "Edited elsewhere");
  assert.equal(merge.resolveDesignConflicts(edited, deleteTransaction, deleteResult, "theirs").pages[0].objects[0].text, "Edited elsewhere");

  const ordered = { ...local, pages: [{ ...local.pages[0], objects: [local.pages[0].objects[0], object("three", "Three"), object("four", "Four")] }] };
  const reordered = { ...ordered, pages: [{ ...ordered.pages[0], objects: [ordered.pages[0].objects[1], ordered.pages[0].objects[0], ordered.pages[0].objects[2]] }] };
  const orderTransaction = merge.createDesignTransaction(ordered, reordered, { transactionId: "order", clientId: "local", brokerEpoch: "epoch", baseRevision: 0 });
  const otherOrder = { ...ordered, pages: [{ ...ordered.pages[0], objects: [ordered.pages[0].objects[0], ordered.pages[0].objects[1], ordered.pages[0].objects[2]] }] };
  const orderResult = merge.applyDesignTransaction(otherOrder, orderTransaction);
  assert.equal(orderResult.conflicts.length, 0);
  const conflictingOrder = { ...ordered, pages: [{ ...ordered.pages[0], objects: [ordered.pages[0].objects[0], ordered.pages[0].objects[2], ordered.pages[0].objects[1]] }] };
  const conflictResult = merge.applyDesignTransaction(conflictingOrder, orderTransaction);
  assert.equal(conflictResult.conflicts.some((item) => item.reason === "order"), true);
});

test("design sync merges simultaneous compatible peer edits", async () => {
  const load = modules();
  const model = load("app/studio/design-model.ts");
  const sync = load("app/studio/design-sync.ts");
  const design = model.createDesign();
  const channelFactory = channelBus();
  let persisted = design;
  const primary = sync.createDesignSync({ designId: design.id, initialSnapshot: design, role: "primary", clientId: "primary", channelFactory, onSnapshot: () => {}, persistPrimary: async (next) => { persisted = next; } });
  const peerA = sync.createDesignSync({ designId: design.id, initialSnapshot: design, role: "peer", clientId: "peer-a", channelFactory, onSnapshot: () => {}, persistPrimary: async () => { throw new Error("peer must not persist"); } });
  const peerB = sync.createDesignSync({ designId: design.id, initialSnapshot: design, role: "peer", clientId: "peer-b", channelFactory, onSnapshot: () => {}, persistPrimary: async () => { throw new Error("peer must not persist"); } });
  await settle();
  const first = { ...design, name: "Name from A" };
  const second = { ...design, pages: [{ ...design.pages[0], name: "Page from B" }] };
  const results = await Promise.all([peerA.submit(first), peerB.submit(second)]);
  assert.equal(results.length, 2);
  assert.equal(persisted.name, "Name from A");
  assert.equal(persisted.pages[0].name, "Page from B");
  primary.close(); peerA.close(); peerB.close();
});

test("design sync exposes a same-property conflict and accepts a local resolution", async () => {
  const load = modules();
  const model = load("app/studio/design-model.ts");
  const sync = load("app/studio/design-sync.ts");
  const design = model.createDesign();
  const channelFactory = channelBus();
  let persisted = design;
  let conflict = null;
  let conflictPeer = null;
  const primary = sync.createDesignSync({ designId: design.id, initialSnapshot: design, role: "primary", clientId: "primary", channelFactory, onSnapshot: () => {}, persistPrimary: async (next) => { persisted = next; } });
  const peerA = sync.createDesignSync({ designId: design.id, initialSnapshot: design, role: "peer", clientId: "peer-a", channelFactory, onSnapshot: () => {}, persistPrimary: async () => { throw new Error("peer must not persist"); } });
  const peerB = sync.createDesignSync({ designId: design.id, initialSnapshot: design, role: "peer", clientId: "peer-b", channelFactory, onConflict: (next) => { conflict = next; conflictPeer = peerB; }, onSnapshot: () => {}, persistPrimary: async () => { throw new Error("peer must not persist"); } });
  await settle();
  const first = { ...design, name: "First name" };
  const second = { ...design, name: "Second name" };
  const results = await Promise.allSettled([peerA.submit(first), peerB.submit(second)]);
  assert.equal(results.filter((result) => result.status === "rejected").length, 1);
  await settle();
  assert.ok(conflict);
  await conflictPeer.resolveConflict("mine").catch(() => undefined);
  await settle();
  assert.ok(["First name", "Second name"].includes(persisted.name));
  primary.close(); peerA.close(); peerB.close();
});
