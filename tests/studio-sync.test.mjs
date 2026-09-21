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
  return {
    factory,
    releaseInOrder() { delayed.splice(0).forEach((deliver) => deliver()); },
    releaseReverse() { delayed.splice(0).reverse().forEach((deliver) => deliver()); },
  };
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

test("inserting a block does not turn a concurrent deletion into an order conflict", () => {
  const sync = load("app/studio/studio-sync.ts");
  const base = { blocks: [{ id: "a" }, { id: "b" }, { id: "c" }] };
  const mine = { blocks: [{ id: "a" }, { id: "b" }, { id: "new" }, { id: "c" }] };
  const theirs = { blocks: [{ id: "a" }, { id: "c" }] };
  const transaction = sync.createStudioTransaction(base, mine, { transactionId: "insert", clientId: "mine", brokerEpoch: "epoch", baseRevision: 0 });
  assert.equal(transaction.changes.some(change => change.kind === "move"), false);
  const message = { protocol: sync.STUDIO_SYNC_PROTOCOL, scope: "main-studio", storeKey: "workspace", senderId: "mine", kind: "operation", requestId: "request", transaction };
  assert.ok(sync.validateStudioSyncMessage(message, "workspace", value => value));
  assert.equal(sync.validateStudioSyncMessage({ ...message, protocol: "acm-studio-sync-v1" }, "workspace", value => value), null);
  assert.equal(sync.validateStudioSyncMessage({ ...message, transaction: { ...transaction, changes: transaction.changes.map(change => change.kind === "insert" ? { ...change, nextId: undefined } : change) } }, "workspace", value => value), null);
  const result = sync.applyStudioTransaction(theirs, transaction);
  assert.equal(result.conflicts.length, 0);
  assert.deepEqual(Array.from(result.snapshot.blocks, block => block.id), ["a", "new", "c"]);
});

test("moving and deleting blocks in one edit does not conflict with its own deletion", () => {
  const sync = load("app/studio/studio-sync.ts");
  const base = { blocks: [{ id: "a" }, { id: "b" }, { id: "c" }], title: "Before" };
  const mine = { ...base, blocks: [{ id: "c" }, { id: "a" }] };
  const theirs = { ...base, title: "Other tab" };
  const transaction = sync.createStudioTransaction(base, mine, { transactionId: "move-delete", clientId: "mine", brokerEpoch: "epoch", baseRevision: 0 });
  assert.deepEqual(Array.from(transaction.changes, change => change.kind), ["delete", "move"]);
  const result = sync.applyStudioTransaction(theirs, transaction);
  assert.equal(result.conflicts.length, 0);
  assert.deepEqual(Array.from(result.snapshot.blocks, block => block.id), ["c", "a"]);
  assert.equal(result.snapshot.title, "Other tab");
});

test("reversed insertion neighbours require an explicit order choice", () => {
  const sync = load("app/studio/studio-sync.ts");
  const base = { blocks: [{ id: "a" }, { id: "b" }, { id: "c" }] };
  const inserted = { blocks: [{ id: "a" }, { id: "new" }, { id: "b" }, { id: "c" }] };
  const reordered = { blocks: [{ id: "b" }, { id: "c" }, { id: "a" }] };
  const insertion = sync.createStudioTransaction(base, inserted, { transactionId: "insert", clientId: "mine", brokerEpoch: "epoch", baseRevision: 0 });
  const move = sync.createStudioTransaction(base, reordered, { transactionId: "move", clientId: "other", brokerEpoch: "epoch", baseRevision: 0 });
  const message = { protocol: sync.STUDIO_SYNC_PROTOCOL, scope: "main-studio", storeKey: "workspace", senderId: "other", kind: "operation", requestId: "request", transaction: move };
  assert.equal(sync.validateStudioSyncMessage({ ...message, transaction: { ...move, changes: [{ kind: "move", path: ["blocks"], beforeOrder: ["a", "b", "c"], afterOrder: ["a", "a", "c"] }] } }, "workspace", value => value), null);
  assert.equal(sync.applyStudioTransaction(reordered, insertion).conflicts.some(conflict => conflict.reason === "order"), true);
  assert.equal(sync.applyStudioTransaction(inserted, move).conflicts.some(conflict => conflict.reason === "order"), true);
  const resolved = sync.applyStudioTransaction(reordered, insertion, true);
  assert.equal(resolved.conflicts.length, 0);
  assert.deepEqual(Array.from(resolved.snapshot.blocks, block => block.id), ["c", "a", "new", "b"]);
});

test("a compatible remote reorder keeps a locally inserted block between its neighbours", () => {
  const sync = load("app/studio/studio-sync.ts");
  const base = { blocks: [{ id: "a" }, { id: "b" }, { id: "c" }] };
  const inserted = { blocks: [{ id: "a" }, { id: "new" }, { id: "b" }, { id: "c" }] };
  const reordered = { blocks: [{ id: "c" }, { id: "a" }, { id: "b" }] };
  const move = sync.createStudioTransaction(base, reordered, { transactionId: "move", clientId: "other", brokerEpoch: "epoch", baseRevision: 0 });
  const result = sync.applyStudioTransaction(inserted, move);
  assert.equal(result.conflicts.length, 0);
  assert.deepEqual(Array.from(result.snapshot.blocks, block => block.id), ["c", "a", "new", "b"]);
});

test("a remote reorder keeps insertions attached to their leading or trailing neighbour", () => {
  const sync = load("app/studio/studio-sync.ts");
  const base = { blocks: [{ id: "a" }, { id: "b" }, { id: "c" }] };
  for (const [inserted, reordered, expected] of [
    [["x", "a", "b", "c"], ["b", "c", "a"], ["b", "c", "x", "a"]],
    [["a", "b", "c", "x"], ["c", "a", "b"], ["c", "x", "a", "b"]],
  ]) {
    const transaction = sync.createStudioTransaction(base, { blocks: reordered.map(id => ({ id })) }, { transactionId: "move", clientId: "other", brokerEpoch: "epoch", baseRevision: 0 });
    const result = sync.applyStudioTransaction({ blocks: inserted.map(id => ({ id })) }, transaction);
    assert.equal(result.conflicts.length, 0);
    assert.deepEqual(Array.from(result.snapshot.blocks, block => block.id), expected);
  }
});

test("choosing local order keeps remote-only blocks and respects remote deletions", () => {
  const sync = load("app/studio/studio-sync.ts");
  const base = { blocks: [{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }] };
  const mine = { blocks: [{ id: "c" }, { id: "a" }, { id: "b" }, { id: "d" }, { id: "new" }] };
  const theirs = { blocks: [{ id: "a" }, { id: "remote" }, { id: "c" }, { id: "d" }] };
  const transaction = sync.createStudioTransaction(base, mine, { transactionId: "reorder", clientId: "mine", brokerEpoch: "epoch", baseRevision: 0 });
  assert.equal(sync.applyStudioTransaction(theirs, transaction).conflicts.some(conflict => conflict.reason === "order"), true);
  const resolved = sync.applyStudioTransaction(theirs, transaction, true);
  assert.equal(resolved.conflicts.length, 0);
  assert.deepEqual(Array.from(resolved.snapshot.blocks, block => block.id), ["c", "remote", "a", "d", "new"]);
});

test("local resolution does not silently discard an edit inside a remotely deleted group", () => {
  const sync = load("app/studio/studio-sync.ts");
  const base = { blocks: [{ id: "group", children: [{ id: "child", text: "Before" }] }] };
  const mine = { blocks: [{ id: "group", children: [{ id: "child", text: "Mine" }] }] };
  const transaction = sync.createStudioTransaction(base, mine, { transactionId: "nested", clientId: "mine", brokerEpoch: "epoch", baseRevision: 0 });
  const result = sync.applyStudioTransaction({ blocks: [] }, transaction, true);
  assert.equal(result.conflicts.some(conflict => conflict.reason === "invalid"), true);
  assert.deepEqual(Array.from(result.snapshot.blocks), []);
});

test("studio sync commits peer edits once, rejects duplicates and reloads authoritative state on failover", async () => {
  const sync = load("app/studio/studio-sync.ts");
  const channelFactory = channelBus();
  let persisted = { value: "initial", records: [] };
  const primary = sync.createStudioSync({ storeKey: "workspace", clientId: "primary", initialSnapshot: persisted, role: "primary", channelFactory, loadAuthoritative: () => persisted, validateSnapshot: value => value, onSnapshot: () => {}, persistPrimary: async next => { persisted = next; } });
  const snapshots = []; const welcomeOrder = [];
  const peer = sync.createStudioSync({ storeKey: "workspace", clientId: "peer", initialSnapshot: persisted, role: "peer", channelFactory, loadAuthoritative: () => persisted, validateSnapshot: value => value, onSnapshot: (snapshot, source) => { snapshots.push(snapshot); if (source === "welcome") welcomeOrder.push("snapshot"); }, onStatus: status => { if (status === "synced") welcomeOrder.push("writable"); }, persistPrimary: async () => { throw new Error("peer wrote directly"); } });
  await settle();
  assert.equal(peer.getStatus(), "synced");
  assert.deepEqual(welcomeOrder, ["snapshot", "writable"], "the authoritative snapshot must be installed before peer editing is enabled");
  await peer.submit({ value: "changed", records: [] });
  assert.equal(persisted.value, "changed");
  assert.equal(snapshots.at(-1).value, "initial"); // Own commits must not echo over newer local edits.

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
  assert.equal(conflict.localSnapshot.title, "Second");
  await second.resolveConflict("mine");
  assert.equal(second.getConflict(), null);
  assert.equal(persisted.title, "Second");
  primary.close(); first.close(); second.close();
});

test("studio sync does not send an older local save back over newer queued edits", async () => {
  const sync = load("app/studio/studio-sync.ts");
  let releaseFirst;
  const firstSave = new Promise(resolve => { releaseFirst = resolve; });
  let persisted = { title: "Initial" };
  const snapshots = [];
  let writes = 0;
  const primary = sync.createStudioSync({ scope: "rapid-edits", storeKey: "workspace", clientId: "primary", initialSnapshot: persisted, role: "primary", channelFactory: channelBus(), validateSnapshot: value => value, onSnapshot: (snapshot, source) => snapshots.push({ title: snapshot.title, source }), persistPrimary: async next => { if (++writes === 1) await firstSave; persisted = next; } });
  const first = primary.commitPrimary({ title: "First" });
  const second = primary.commitPrimary({ title: "Second" });
  releaseFirst();
  await Promise.all([first, second]);
  assert.equal(persisted.title, "Second");
  assert.deepEqual(snapshots.filter(item => item.source === "commit").map(item => item.title), ["Second"]);
  assert.equal(primary.getConflict(), null);
  primary.close();
});

test("studio sync does not echo a peer's queued edits as stale snapshots", async () => {
  const sync = load("app/studio/studio-sync.ts");
  const channelFactory = channelBus();
  let persisted = { title: "Initial" };
  const primary = sync.createStudioSync({ scope: "rapid-peer-edits", storeKey: "workspace", clientId: "primary", initialSnapshot: persisted, role: "primary", channelFactory, validateSnapshot: value => value, onSnapshot: () => {}, persistPrimary: async next => { persisted = next; } });
  const snapshots = [];
  const peer = sync.createStudioSync({ scope: "rapid-peer-edits", storeKey: "workspace", clientId: "peer", initialSnapshot: persisted, role: "peer", channelFactory, validateSnapshot: value => value, onSnapshot: (snapshot, source) => snapshots.push({ title: snapshot.title, source }), persistPrimary: async () => { throw new Error("peer wrote directly"); } });
  await settle();
  const first = peer.submit({ title: "First" });
  const second = peer.submit({ title: "Second" });
  await Promise.all([first, second]);
  await settle();
  assert.equal(persisted.title, "Second");
  assert.equal(snapshots.some(item => item.source === "update" && item.title === "First"), false);
  assert.equal(peer.getConflict(), null);
  primary.close(); peer.close();
});

test("primary preserves queued local edits while committing an independent peer edit", async () => {
  const sync = load("app/studio/studio-sync.ts");
  const channelFactory = channelBus();
  let releaseSave;
  const pauseSave = new Promise(resolve => { releaseSave = resolve; });
  let releaseLocalSave;
  const pauseLocalSave = new Promise(resolve => { releaseLocalSave = resolve; });
  let enteredSave;
  const saving = new Promise(resolve => { enteredSave = resolve; });
  let enteredLocalSave;
  const savingLocally = new Promise(resolve => { enteredLocalSave = resolve; });
  let persisted = { title: "Initial", subtitle: "Initial" };
  const snapshots = [];
  let writes = 0;
  const primary = sync.createStudioSync({ scope: "primary-race", storeKey: "workspace", clientId: "primary", initialSnapshot: persisted, role: "primary", channelFactory, validateSnapshot: value => value, onSnapshot: (snapshot, source) => snapshots.push({ ...snapshot, source }), persistPrimary: async next => { if (++writes === 1) { enteredSave(); await pauseSave; } else { enteredLocalSave(); await pauseLocalSave; } persisted = next; } });
  const peer = sync.createStudioSync({ scope: "primary-race", storeKey: "workspace", clientId: "peer", initialSnapshot: persisted, role: "peer", channelFactory, validateSnapshot: value => value, onSnapshot: () => {}, persistPrimary: async () => {} });
  await settle();
  const remote = peer.submit({ title: "Initial", subtitle: "From peer" });
  await saving;
  const local = primary.commitPrimary({ title: "From primary", subtitle: "Initial" });
  releaseSave();
  await savingLocally;
  assert.equal(persisted.title, "Initial");
  assert.equal(snapshots.some(item => item.source === "update" && item.title === "From primary"), false, "queued local work must not be announced as saved");
  releaseLocalSave();
  await Promise.all([remote, local]);
  assert.equal(persisted.title, "From primary");
  assert.equal(persisted.subtitle, "From peer");
  assert.equal(snapshots.some(item => item.source === "update" && item.title === "Initial"), false);
  primary.close(); peer.close();
});

test("a failed conflict resolution retains the unsaved choice for a retry", async () => {
  const sync = load("app/studio/studio-sync.ts");
  const channelFactory = channelBus();
  let persisted = { title: "Initial" };
  let failResolution = true;
  const primary = sync.createStudioSync({ scope: "resolution-retry", storeKey: "workspace", clientId: "primary", initialSnapshot: persisted, role: "primary", channelFactory, validateSnapshot: value => value, onSnapshot: () => {}, persistPrimary: async next => { if (next.title === "Mine" && failResolution) { failResolution = false; throw new Error("quota"); } persisted = next; } });
  const other = sync.createStudioSync({ scope: "resolution-retry", storeKey: "workspace", clientId: "other", initialSnapshot: persisted, role: "peer", channelFactory, validateSnapshot: value => value, onSnapshot: () => {}, persistPrimary: async () => {} });
  const mine = sync.createStudioSync({ scope: "resolution-retry", storeKey: "workspace", clientId: "mine", initialSnapshot: persisted, role: "peer", channelFactory, validateSnapshot: value => value, onSnapshot: () => {}, persistPrimary: async () => {} });
  await settle();
  await Promise.allSettled([other.submit({ title: "Other" }), mine.submit({ title: "Mine" })]);
  assert.equal(mine.getConflict().localSnapshot.title, "Mine");
  await assert.rejects(mine.resolveConflict("mine"), /quota/);
  assert.equal(mine.getConflict().localSnapshot.title, "Mine");
  await mine.resolveConflict("mine");
  assert.equal(persisted.title, "Mine");
  primary.close(); other.close(); mine.close();
});

test("choosing a local conflicting field preserves unrelated peer changes", async () => {
  const sync = load("app/studio/studio-sync.ts");
  const transport = outOfOrderChannelBus();
  let persisted = { title: "Initial", subtitle: "Initial", summary: "Initial" };
  const displayed = [];
  const otherDisplayed = [];
  const primary = sync.createStudioSync({ scope: "field-resolution", storeKey: "workspace", clientId: "primary", initialSnapshot: persisted, role: "primary", channelFactory: transport.factory, validateSnapshot: value => value, onSnapshot: () => {}, persistPrimary: async next => { persisted = next; } });
  const other = sync.createStudioSync({ scope: "field-resolution", storeKey: "workspace", clientId: "other", initialSnapshot: persisted, role: "peer", channelFactory: transport.factory, validateSnapshot: value => value, onSnapshot: value => otherDisplayed.push(value), persistPrimary: async () => {} });
  const mine = sync.createStudioSync({ scope: "field-resolution", storeKey: "workspace", clientId: "mine", initialSnapshot: persisted, role: "peer", channelFactory: transport.factory, validateSnapshot: value => value, onSnapshot: value => displayed.push(value), persistPrimary: async () => {} });
  try {
    await settle();
    await other.submit({ title: "Other", subtitle: "Their subtitle", summary: "Initial" });
    await assert.rejects(mine.submit({ title: "Mine", subtitle: "Initial", summary: "Initial" }), /conflict/);
    assert.deepEqual(mine.getConflict().localSnapshot, { title: "Mine", subtitle: "Initial", summary: "Initial" });
    await primary.commitPrimary({ title: "Newest", subtitle: "Their subtitle", summary: "Latest" });
    await mine.resolveConflict("mine");
    assert.equal(persisted.title, "Mine");
    assert.equal(persisted.subtitle, "Their subtitle");
    assert.equal(persisted.summary, "Latest");
    assert.deepEqual(displayed.at(-1), persisted, "the editor must receive the merged snapshot before autosave resumes");
    transport.releaseInOrder();
    await settle();
    assert.deepEqual(otherDisplayed.at(-1), persisted, "another tab must converge on the saved resolution");
    assert.equal(other.getConflict(), null);
  } finally {
    primary.close(); other.close(); mine.close();
  }
});

test("the owner resolves a queued local conflict from the saved snapshot", async () => {
  const sync = load("app/studio/studio-sync.ts");
  const channelFactory = channelBus();
  let persisted = { title: "Initial" };
  let releaseSave;
  let signalSaving;
  const saving = new Promise(resolve => { signalSaving = resolve; });
  const pausedSave = new Promise(resolve => { releaseSave = resolve; });
  const primary = sync.createStudioSync({ scope: "owner-resolution", storeKey: "workspace", clientId: "primary", initialSnapshot: persisted, role: "primary", channelFactory, validateSnapshot: value => value, onSnapshot: () => {}, persistPrimary: async next => { if (next.title === "Other") { signalSaving(); await pausedSave; } persisted = next; } });
  const peer = sync.createStudioSync({ scope: "owner-resolution", storeKey: "workspace", clientId: "peer", initialSnapshot: persisted, role: "peer", channelFactory, validateSnapshot: value => value, onSnapshot: () => {}, persistPrimary: async () => {} });
  try {
    await settle();
    const remote = peer.submit({ title: "Other" });
    await saving;
    const local = primary.commitPrimary({ title: "Mine" });
    releaseSave();
    await remote;
    await assert.rejects(local, /conflict/);
    assert.deepEqual(primary.getConflict().remoteSnapshot, { title: "Other" });
    await primary.resolveConflict("mine");
    assert.equal(persisted.title, "Mine");
  } finally {
    releaseSave();
    primary.close(); peer.close();
  }
});

test("local resolution of a concurrent reorder and deletion retains both surviving edits", async () => {
  const sync = load("app/studio/studio-sync.ts");
  const channelFactory = channelBus();
  const base = { blocks: [{ id: "a" }, { id: "b" }, { id: "c" }] };
  let persisted = base;
  const primary = sync.createStudioSync({ scope: "block-resolution", storeKey: "workspace", clientId: "primary", initialSnapshot: base, role: "primary", channelFactory, validateSnapshot: value => value, onSnapshot: () => {}, persistPrimary: async next => { persisted = next; } });
  const other = sync.createStudioSync({ scope: "block-resolution", storeKey: "workspace", clientId: "other", initialSnapshot: base, role: "peer", channelFactory, validateSnapshot: value => value, onSnapshot: () => {}, persistPrimary: async () => {} });
  const mine = sync.createStudioSync({ scope: "block-resolution", storeKey: "workspace", clientId: "mine", initialSnapshot: base, role: "peer", channelFactory, validateSnapshot: value => value, onSnapshot: () => {}, persistPrimary: async () => {} });
  await settle();
  const results = await Promise.allSettled([
    other.submit({ blocks: [{ id: "a" }, { id: "c" }] }),
    mine.submit({ blocks: [{ id: "c" }, { id: "a" }, { id: "b" }, { id: "new" }] }),
  ]);
  assert.equal(results[0].status, "fulfilled");
  assert.equal(mine.getConflict()?.conflicts.some(conflict => conflict.reason === "order"), true);
  await mine.resolveConflict("mine");
  assert.deepEqual(Array.from(persisted.blocks, block => block.id), ["c", "a", "new"]);
  primary.close(); other.close(); mine.close();
});

test("a peer can resume an unresolved conflict after its session restarts", async () => {
  const sync = load("app/studio/studio-sync.ts");
  const channelFactory = channelBus();
  const base = { blocks: [{ id: "a" }, { id: "b" }, { id: "c" }] };
  let persisted = base;
  const primary = sync.createStudioSync({ scope: "resume-conflict", storeKey: "workspace", clientId: "primary", initialSnapshot: base, role: "primary", channelFactory, validateSnapshot: value => value, onSnapshot: () => {}, persistPrimary: async next => { persisted = next; } });
  const other = sync.createStudioSync({ scope: "resume-conflict", storeKey: "workspace", clientId: "other", initialSnapshot: base, role: "peer", channelFactory, validateSnapshot: value => value, onSnapshot: () => {}, persistPrimary: async () => {} });
  const mine = sync.createStudioSync({ scope: "resume-conflict", storeKey: "workspace", clientId: "mine", initialSnapshot: base, role: "peer", channelFactory, validateSnapshot: value => value, onSnapshot: () => {}, persistPrimary: async () => {} });
  let resumed;
  try {
    await settle();
    await Promise.allSettled([
      other.submit({ blocks: [{ id: "a" }, { id: "c" }] }),
      mine.submit({ blocks: [{ id: "c" }, { id: "a" }, { id: "b" }, { id: "new" }] }),
    ]);
    const unresolved = mine.getConflict();
    assert.ok(unresolved);
    mine.close();
    resumed = sync.createStudioSync({ scope: "resume-conflict", storeKey: "workspace", clientId: "resumed", initialSnapshot: persisted, role: "peer", channelFactory, validateSnapshot: value => value, onSnapshot: () => {}, persistPrimary: async () => {} });
    resumed.resumeConflict(unresolved);
    await settle();
    assert.equal(resumed.getStatus(), "conflict");
    assert.deepEqual(Array.from(resumed.getConflict().localSnapshot.blocks, block => block.id), ["c", "a", "new"]);
    await resumed.resolveConflict("mine");
    assert.deepEqual(Array.from(persisted.blocks, block => block.id), ["c", "a", "new"]);
  } finally {
    primary.close(); other.close(); mine.close(); resumed?.close();
  }
});

test("an unresolved conflict survives promotion to the persistence owner", async () => {
  const sync = load("app/studio/studio-sync.ts");
  const channelFactory = channelBus();
  const base = { title: "Original" };
  let persisted = base;
  const primary = sync.createStudioSync({ scope: "conflict-takeover", storeKey: "workspace", clientId: "primary", initialSnapshot: base, role: "primary", channelFactory, loadAuthoritative: () => persisted, validateSnapshot: value => value, onSnapshot: () => {}, persistPrimary: async next => { persisted = next; } });
  const other = sync.createStudioSync({ scope: "conflict-takeover", storeKey: "workspace", clientId: "other", initialSnapshot: base, role: "peer", channelFactory, validateSnapshot: value => value, onSnapshot: () => {}, persistPrimary: async () => {} });
  const mine = sync.createStudioSync({ scope: "conflict-takeover", storeKey: "workspace", clientId: "mine", initialSnapshot: base, role: "peer", channelFactory, loadAuthoritative: () => persisted, validateSnapshot: value => value, onSnapshot: () => {}, persistPrimary: async next => { persisted = next; } });
  try {
    await settle();
    await Promise.allSettled([other.submit({ title: "Other" }), mine.submit({ title: "Mine" })]);
    assert.ok(mine.getConflict());
    primary.close();
    mine.setRole("primary");
    assert.equal(mine.getStatus(), "conflict");
    assert.equal(mine.getConflict().localSnapshot.title, "Mine");
    await mine.resolveConflict("mine");
    assert.equal(persisted.title, "Mine");
  } finally {
    primary.close(); other.close(); mine.close();
  }
});
