import { createIsolatedModuleLoader } from "../production-module.mjs";
import assert from "node:assert/strict";

export function mediaModules(globals = {}, overrides = {}) {
  return createIsolatedModuleLoader({ overrides: {
    "./image-rendition-generation": { generateImageRenditions: async () => null },
    ...overrides,
  }, globals: { Error, Blob, File, Event, URL, crypto, structuredClone, queueMicrotask, ...globals } });
}

// This fixture models request ordering, transaction completion and rollback.
// Assertions below test production commands; the fixture has no Files policies.
export function mediaDatabase() {
  const stores = new Map(); const keyPaths = new Map();
  let version = 0; let putsUntilFailure = 0;
  const state = { opens: 0, closes: 0, commits: 0, aborts: 0 };
  const database = {
    objectStoreNames: { contains: name => stores.has(name) },
    get version() { return version; },
    createObjectStore(name, options = {}) { stores.set(name, new Map()); keyPaths.set(name, options.keyPath); return { createIndex() {} }; },
    close() { state.closes++; },
    transaction(names, mode) {
      for (const name of typeof names === "string" ? [names] : names) assert.ok(stores.has(name), `store ${name} exists`);
      const working = new Map([...stores].map(([name, rows]) => [name, new Map([...rows].map(([key, value]) => [key, structuredClone(value)]))]));
      let requests = 0; let finished = false; let scheduled = false;
      const transaction = { error: null, abort() {
        if (finished) return;
        finished = true; state.aborts++; setImmediate(() => transaction.onabort?.({ target: transaction }));
      } };
      function finish() {
        if (scheduled) return;
        scheduled = true;
        setImmediate(() => {
          scheduled = false;
          if (finished || requests) return;
          finished = true;
          if (mode === "readwrite") {
            for (const name of typeof names === "string" ? [names] : names) stores.set(name, working.get(name));
            state.commits++;
          }
          transaction.oncomplete?.();
        });
      }
      function request(operation) {
        const req = { result: undefined, error: null }; requests++;
        queueMicrotask(() => {
          if (finished) return;
          try { req.result = operation(); req.onsuccess?.(); }
          catch (error) { req.error = error; transaction.error = error; req.onerror?.(); transaction.abort(); }
          requests--; finish();
        });
        return req;
      }
      transaction.objectStore = name => {
        const rows = working.get(name); assert.ok(rows);
        return {
          get: key => request(() => structuredClone(rows.get(key))),
          getAll: () => request(() => structuredClone([...rows.values()])),
          put: (value, key) => request(() => {
            assert.equal(mode, "readwrite");
            if (putsUntilFailure && --putsUntilFailure === 0) throw Error("Injected transaction failure");
            const id = key ?? value[keyPaths.get(name)]; rows.set(id, structuredClone(value)); return id;
          }),
          delete: key => request(() => { assert.equal(mode, "readwrite"); rows.delete(key); }),
          clear: () => request(() => { assert.equal(mode, "readwrite"); rows.clear(); }),
        };
      };
      finish(); return transaction;
    },
  };
  return {
    state, rows: name => [...(stores.get(name)?.values() ?? [])], failPut(number = 1) { putsUntilFailure = number; },
    indexedDB: { open(_name, nextVersion) {
      state.opens++;
      const request = { result: database, error: null, transaction: null };
      const targetVersion = nextVersion ?? (version || 1);
      if (targetVersion > version) {
        const previousVersion = version;
        const transaction = {
          mode: "versionchange", db: database, error: null, aborted: false,
          abort() { if (this.aborted) return; this.aborted = true; state.aborts++; queueMicrotask(() => this.onabort?.({ target: this })); },
          objectStore(name) {
            assert.ok(stores.has(name), `store ${name} exists`);
            const store = {
              get name() { return name; },
              set name(nextName) {
                assert.ok(!stores.has(nextName), `store ${nextName} does not exist`);
                const rows = stores.get(name); const keyPath = keyPaths.get(name);
                stores.delete(name); keyPaths.delete(name); stores.set(nextName, rows); keyPaths.set(nextName, keyPath);
              },
              openCursor() {
                const values = [...(stores.get(name)?.values() ?? [])];
                const cursorRequest = { result: null, error: null, transaction };
                let index = 0;
                const advance = () => queueMicrotask(() => {
                  if (transaction.aborted) return;
                  cursorRequest.result = index < values.length ? { value: structuredClone(values[index]), continue() { index++; advance(); } } : null;
                  cursorRequest.onsuccess?.();
                });
                advance(); return cursorRequest;
              },
              get(key) {
                const getRequest = { result: undefined, error: null, transaction };
                queueMicrotask(() => { if (!transaction.aborted) { getRequest.result = structuredClone(stores.get(name)?.get(key)); getRequest.onsuccess?.(); } });
                return getRequest;
              },
            };
            return store;
          },
        };
        request.transaction = transaction;
        queueMicrotask(() => {
          version = targetVersion;
          request.onupgradeneeded?.({ oldVersion: previousVersion, newVersion: targetVersion });
          queueMicrotask(() => { if (!transaction.aborted) request.onsuccess?.(); else request.onerror?.(); });
        });
      } else queueMicrotask(() => request.onsuccess?.());
      return request;
    } },
  };
}

export function mediaChannelRoom() {
  const clients = new Set(); const sent = []; let drop = () => false;
  class Channel {
    constructor(name) { this.name = name; clients.add(this); }
    postMessage(message) {
      sent.push(structuredClone(message));
      if (drop(message)) return;
      for (const target of clients) if (target !== this && target.name === this.name) queueMicrotask(() => { if (clients.has(target)) target.onmessage?.({ data: structuredClone(message) }); });
    }
    close() { clients.delete(this); }
  }
  return { Channel, sent, drop(predicate) { drop = predicate; } };
}

export async function settle(predicate, message = "expected state") {
  for (let pass = 0; pass < 80; pass++) { if (predicate()) return; await new Promise(resolve => setImmediate(resolve)); }
  assert.fail(message);
}

export function mediaWindow(indexedDB) {
  const events = new EventTarget(); const timers = new Set();
  return {
    indexedDB, localStorage: { getItem() { return null; } },
    addEventListener: events.addEventListener.bind(events), removeEventListener: events.removeEventListener.bind(events), dispatchEvent: events.dispatchEvent.bind(events),
    setInterval(callback) { timers.add(callback); return callback; }, clearInterval(callback) { timers.delete(callback); },
    tick() { for (const callback of [...timers]) callback(); },
  };
}
