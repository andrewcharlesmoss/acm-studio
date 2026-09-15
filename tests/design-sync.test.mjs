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
  const base = { protocol: sync.DESIGN_SYNC_PROTOCOL, designId: design.id, senderId: "peer", kind: "operation", requestId: "operation", brokerEpoch: "epoch", baseRevision: 0, snapshot: design };
  assert.equal(sync.validateDesignSyncMessage({ ...base, baseRevision: -1 }, design.id), null);
  assert.equal(sync.validateDesignSyncMessage({ ...base, designId: "other" }, design.id), null);
  assert.equal(sync.validateDesignSyncMessage({ ...base, snapshot: { ...design, id: "other" } }, design.id), null);
});
