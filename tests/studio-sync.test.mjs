import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";

const require = createRequire(import.meta.url);
const root = new URL("../", import.meta.url).pathname;

function load(file, globals = {}) {
  const filename = path.resolve(root, file);
  const exports = {};
  const source = ts.transpileModule(readFileSync(filename, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(source, {
    exports, Error, AggregateError, Promise, JSON, Math, Number, Object, Array, Set, Map,
    Date, String, Boolean, Symbol, structuredClone, crypto: globalThis.crypto,
    setTimeout, clearTimeout, setInterval, clearInterval, queueMicrotask, ...globals,
    require(specifier) {
      if (!specifier.startsWith(".")) return require(specifier);
      const dependency = path.resolve(path.dirname(filename), /\.(mjs|ts)$/.test(specifier) ? specifier : `${specifier}.ts`);
      return load(path.relative(root, dependency), globals);
    },
  }, { filename });
  return exports;
}

function channelBus() {
  const rooms = new Map();
  return (name) => {
    const listeners = new Set();
    const room = rooms.get(name) ?? new Set();
    room.add(listeners); rooms.set(name, room);
    return {
      postMessage(message) { for (const peer of room) if (peer !== listeners) queueMicrotask(() => peer.forEach(listener => listener({ data: structuredClone(message) }))); },
      addEventListener(type, listener) { if (type === "message") listeners.add(listener); },
      removeEventListener(type, listener) { if (type === "message") listeners.delete(listener); },
      close() { room.delete(listeners); listeners.clear(); },
    };
  };
}

function outOfOrderChannelBus() {
  const rooms = new Map();
  const delayed = [];
  const factory = (name) => {
    const listeners = new Set();
    const room = rooms.get(name) ?? new Set();
    room.add(listeners); rooms.set(name, room);
    return {
      postMessage(message) {
        for (const peer of room) if (peer !== listeners) {
          const deliver = () => peer.forEach((listener) => listener({ data: structuredClone(message) }));
          if (message.kind === "update") delayed.push(deliver); else queueMicrotask(deliver);
        }
      },
      addEventListener(type, listener) { if (type === "message") listeners.add(listener); },
      removeEventListener(type, listener) { if (type === "message") listeners.delete(listener); },
      close() { room.delete(listeners); listeners.clear(); },
    };
  };
  return { factory, releaseReverse() { delayed.splice(0).reverse().forEach((deliver) => deliver()); } };
}

async function settle() { for (let index = 0; index < 10; index += 1) await Promise.resolve(); }

test("studio sync merges stable records and exposes competing field changes", () => {
  const sync = load("app/studio/studio-sync.ts");
  const base = { records: [{ id: "one", title: "One", colour: "red" }, { id: "two", title: "Two", colour: "blue" }] };
  const mine = { records: base.records.map(item => item.id === "one" ? { ...item, title: "Mine" } : item) };
  const theirs = { records: base.records.map(item => item.id === "two" ? { ...item, colour: "green" } : item) };
  const transaction = sync.createStudioTransaction(base, mine, { transactionId: "tx", clientId: "mine", brokerEpoch: "epoch", baseRevision: 0 });
  const merged = sync.applyStudioTransaction(theirs, transaction);
  assert.equal(merged.conflicts.length, 0);
  assert.equal(merged.snapshot.records[0].title, "Mine");
  assert.equal(merged.snapshot.records[1].colour, "green");

  const conflict = sync.applyStudioTransaction({ records: base.records.map(item => item.id === "one" ? { ...item, title: "Other" } : item) }, transaction);
  assert.equal(conflict.conflicts.length, 1);
  assert.equal(conflict.conflicts[0].reason, "property");
});

test("studio sync commits peer edits once, rejects duplicates and reloads authoritative state on failover", async () => {
  const sync = load("app/studio/studio-sync.ts");
  const channelFactory = channelBus();
  let persisted = { value: "initial", records: [] };
  const primary = sync.createStudioSync({ storeKey: "workspace", clientId: "primary", initialSnapshot: persisted, role: "primary", channelFactory, loadAuthoritative: () => persisted, validateSnapshot: value => value, onSnapshot: () => {}, persistPrimary: async next => { persisted = next; } });
  const snapshots = [];
  const peer = sync.createStudioSync({ storeKey: "workspace", clientId: "peer", initialSnapshot: persisted, role: "peer", channelFactory, loadAuthoritative: () => persisted, validateSnapshot: value => value, onSnapshot: snapshot => snapshots.push(snapshot), persistPrimary: async () => { throw new Error("peer wrote directly"); } });
  await settle();
  assert.equal(peer.getStatus(), "synced");
  await peer.submit({ value: "changed", records: [] });
  assert.equal(persisted.value, "changed");
  assert.equal(snapshots.at(-1).value, "changed");

  const duplicate = sync.createStudioTransaction({ value: "changed", records: [] }, { value: "duplicate", records: [] }, { transactionId: "duplicate", clientId: "peer", brokerEpoch: "wrong", baseRevision: 0 });
  assert.ok(sync.validateStudioSyncMessage({ protocol: sync.STUDIO_SYNC_PROTOCOL, scope: "main-studio", storeKey: "workspace", senderId: "peer", kind: "operation", requestId: "request", transaction: duplicate }, "workspace", value => value));

  primary.close();
  persisted = { value: "authoritative", records: [] };
  const failover = [];
  const promoted = sync.createStudioSync({ storeKey: "workspace-failover", clientId: "promoted", initialSnapshot: { value: "stale" }, role: "peer", channelFactory, loadAuthoritative: () => persisted, validateSnapshot: value => value, onSnapshot: (snapshot, source) => failover.push({ snapshot, source }), persistPrimary: async next => { persisted = next; } });
  promoted.setRole("primary");
  assert.equal(failover.at(-1).snapshot.value, "authoritative");
  assert.equal(failover.at(-1).source, "failover");
  peer.close(); promoted.close();
});

test("studio sync scopes keep main Studio and Mini Golf rooms isolated", async () => {
  const sync = load("app/studio/studio-sync.ts");
  const channelFactory = channelBus();
  let mainPersisted = { value: "main" };
  let miniGolfPersisted = { value: "mini golf" };
  const main = sync.createStudioSync({ scope: "main-studio", storeKey: "workspace", clientId: "main-primary", initialSnapshot: mainPersisted, role: "primary", channelFactory, validateSnapshot: value => value, onSnapshot: () => {}, persistPrimary: async next => { mainPersisted = next; } });
  const miniGolf = sync.createStudioSync({ scope: "mini-golf-mini-golf-scorecard", storeKey: "workspace", clientId: "mini-primary", initialSnapshot: miniGolfPersisted, role: "primary", channelFactory, validateSnapshot: value => value, onSnapshot: () => {}, persistPrimary: async next => { miniGolfPersisted = next; } });
  const mainPeer = sync.createStudioSync({ scope: "main-studio", storeKey: "workspace", clientId: "main-peer", initialSnapshot: mainPersisted, role: "peer", channelFactory, validateSnapshot: value => value, onSnapshot: () => {}, persistPrimary: async () => {} });
  const miniGolfStagingPeer = sync.createStudioSync({ scope: "mini-golf-mini-golf-scorecard-staging", storeKey: "workspace", clientId: "staging-peer", initialSnapshot: { value: "staging" }, role: "peer", channelFactory, validateSnapshot: value => value, onSnapshot: () => {}, persistPrimary: async () => {} });
  await settle();
  assert.equal(mainPeer.getStatus(), "synced");
  assert.notEqual(miniGolfStagingPeer.getStatus(), "synced");
  assert.equal(sync.validateStudioSyncMessage({ protocol: sync.STUDIO_SYNC_PROTOCOL, scope: "mini-golf-mini-golf-scorecard", storeKey: "workspace", senderId: "peer", kind: "hello", requestId: "hello" }, "workspace", value => value, "main-studio"), null);
  main.close(); miniGolf.close(); mainPeer.close(); miniGolfStagingPeer.close();
});

test("studio sync restores the committed snapshot after persistence failure", async () => {
  const sync = load("app/studio/studio-sync.ts");
  const channelFactory = channelBus();
  let persisted = { value: "initial" };
  let fail = true;
  const recovered = [];
  const primary = sync.createStudioSync({ scope: "failure-test", storeKey: "workspace", clientId: "primary", initialSnapshot: persisted, role: "primary", channelFactory, validateSnapshot: value => value, onSnapshot: (snapshot, source) => recovered.push({ snapshot, source }), persistPrimary: async next => { if (fail) { fail = false; throw new Error("quota"); } persisted = next; } });
  const peer = sync.createStudioSync({ scope: "failure-test", storeKey: "workspace", clientId: "peer", initialSnapshot: persisted, role: "peer", channelFactory, validateSnapshot: value => value, onSnapshot: () => {}, persistPrimary: async () => {} });
  await settle();
  await assert.rejects(peer.submit({ value: "failed" }), /quota/);
  assert.equal(persisted.value, "initial");
  assert.equal(recovered.at(-1).snapshot.value, "initial");
  assert.equal(recovered.at(-1).source, "recovery");
  await peer.submit({ value: "saved later" });
  assert.equal(persisted.value, "saved later");
  primary.close(); peer.close();
});

test("studio sync resynchronises after delayed updates arrive out of order", async () => {
  const sync = load("app/studio/studio-sync.ts");
  const transport = outOfOrderChannelBus();
  let persisted = { first: "initial", second: "initial" };
  const primary = sync.createStudioSync({ scope: "ordering-test", storeKey: "workspace", clientId: "primary", initialSnapshot: persisted, role: "primary", channelFactory: transport.factory, validateSnapshot: value => value, onSnapshot: () => {}, persistPrimary: async next => { persisted = next; } });
  const snapshots = [];
  const peer = sync.createStudioSync({ scope: "ordering-test", storeKey: "workspace", clientId: "peer", initialSnapshot: persisted, role: "peer", channelFactory: transport.factory, validateSnapshot: value => value, onSnapshot: snapshot => snapshots.push(snapshot), persistPrimary: async () => {} });
  await settle();
  await primary.commitPrimary({ first: "one", second: "initial" });
  await primary.commitPrimary({ first: "one", second: "two" });
  transport.releaseReverse();
  await settle();
  assert.equal(snapshots.at(-1).first, "one");
  assert.equal(snapshots.at(-1).second, "two");
  primary.close(); peer.close();
});

test("studio sync reports a same-field conflict without overwriting saved data", async () => {
  const sync = load("app/studio/studio-sync.ts");
  const channelFactory = channelBus();
  let persisted = { title: "Initial" };
  const primary = sync.createStudioSync({ storeKey: "conflict", clientId: "primary", initialSnapshot: persisted, role: "primary", channelFactory, validateSnapshot: value => value, onSnapshot: () => {}, persistPrimary: async next => { persisted = next; } });
  let conflict;
  const first = sync.createStudioSync({ storeKey: "conflict", clientId: "first", initialSnapshot: persisted, role: "peer", channelFactory, validateSnapshot: value => value, onSnapshot: () => {}, persistPrimary: async () => {}, });
  const second = sync.createStudioSync({ storeKey: "conflict", clientId: "second", initialSnapshot: persisted, role: "peer", channelFactory, validateSnapshot: value => value, onConflict: value => { conflict = value; }, onSnapshot: () => {}, persistPrimary: async () => {}, });
  await settle();
  await Promise.allSettled([first.submit({ title: "First" }), second.submit({ title: "Second" })]);
  await settle();
  assert.ok(conflict);
  assert.equal(persisted.title === "First" || persisted.title === "Second", true);
  await second.resolveConflict("theirs");
  assert.equal(second.getConflict(), null);
  primary.close(); first.close(); second.close();
});
