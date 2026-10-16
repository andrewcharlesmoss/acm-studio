import assert from "node:assert/strict";
import test from "node:test";
import { createTemplatePartViewRepository } from "../app/studio/template-part-view-repository.mjs";
import { startStudioPreferenceHost, saveStudioPreferenceThroughOwner } from "../app/studio/studio-preference-broker.mjs";
import { templatePartViewKeys } from "../app/studio/template-part-view-contract.mjs";
import { sitesDisclosureKey } from "../app/studio/sites-disclosure-contract.mjs";

function fixture() {
  const values = new Map();
  const writes = [];
  const storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => { writes.push([key, value]); values.set(key, value); } };
  let writable = true;
  let token = Symbol("owner");
  const ownership = { captureWriteToken: () => token, canWrite: expected => writable && (expected === undefined || expected === token), write: async operation => { assert.equal(writable, true); return operation(); } };
  return { storage, writes, ownership, setWritable: next => { writable = next; }, replaceOwner: () => { token = Symbol("new owner"); } };
}
const peer = { ownership: { canWrite: () => false }, locks: { request: async (_name, _options, callback) => callback(null) } };

test("peer Header and Footer saves are acknowledged by the owner and survive repository recreation independently", async () => {
  const f = fixture();
  const stop = startStudioPreferenceHost({ ...f, notify: () => {} });
  try {
    const header = createTemplatePartViewRepository({ kind: "header", storage: f.storage, ...peer });
    const footer = createTemplatePartViewRepository({ kind: "footer", storage: f.storage, ...peer });
    assert.equal(header.read(), "full");
    assert.deepEqual(await header.save("fit"), { saved: true });
    assert.equal(createTemplatePartViewRepository({ kind: "header", storage: f.storage, ...peer }).read(), "fit");
    assert.equal(footer.read(), "full");
    assert.deepEqual(await footer.save("fit"), { saved: true });
    assert.deepEqual(await header.save("full"), { saved: true });
    assert.equal(header.read(), "full");
    assert.equal(createTemplatePartViewRepository({ kind: "footer", storage: f.storage, ...peer }).read(), "fit");
    assert.deepEqual(f.writes.map(([key]) => key), [templatePartViewKeys.header, templatePartViewKeys.footer, templatePartViewKeys.header]);
  } finally { stop(); }
});

test("shared preference host preserves disclosure commands and rejects arbitrary keys and invalid values", async () => {
  const f = fixture();
  const stop = startStudioPreferenceHost({ ...f, notify: () => {} });
  try {
    assert.deepEqual(await saveStudioPreferenceThroughOwner("sites", "collapsed"), { saved: true });
    assert.equal(f.storage.getItem(sitesDisclosureKey), "collapsed");
    assert.equal((await saveStudioPreferenceThroughOwner("arbitrary-key", "fit")).saved, false);
    assert.equal((await saveStudioPreferenceThroughOwner("header", "giant")).saved, false);
    assert.equal(f.writes.length, 1);
  } finally { stop(); }
});

test("unavailable owner fails explicitly without an unlocked write", async () => {
  const f = fixture();
  f.setWritable(false);
  const stop = startStudioPreferenceHost({ ...f, notify: () => {} });
  try {
    assert.deepEqual(await saveStudioPreferenceThroughOwner("footer", "fit", { timeoutMs: 30 }), { saved: false, reason: "owner-unavailable" });
    assert.equal(f.writes.length, 0);
  } finally { stop(); }
});

test("readback failure never acknowledges a successful preference save", async () => {
  const f = fixture();
  const storage = { getItem: () => null, setItem: () => {} };
  const stop = startStudioPreferenceHost({ ...f, storage, notify: () => {} });
  try {
    assert.deepEqual(await saveStudioPreferenceThroughOwner("header", "fit"), { saved: false, reason: "storage" });
  } finally { stop(); }
});

test("expired, oversized-future and conflicting replay commands cannot mutate a preference", async () => {
  const f = fixture();
  const channel = { close() {}, postMessage() {}, onmessage: null };
  const stop = startStudioPreferenceHost({ ...f, createChannel: () => channel, notify: () => {} });
  const id = crypto.randomUUID();
  const command = { version: 1, type: "save", id, preference: "header", mode: "fit", expiresAt: Date.now() + 5000 };
  try {
    channel.onmessage({ data: { ...command, expiresAt: Date.now() - 1 } });
    channel.onmessage({ data: { ...command, expiresAt: Date.now() + 10000 } });
    channel.onmessage({ data: command });
    channel.onmessage({ data: command });
    channel.onmessage({ data: { ...command, mode: "full" } });
    await new Promise(resolve => setImmediate(resolve));
    assert.deepEqual(f.writes, [[templatePartViewKeys.header, "fit"]]);
  } finally { stop(); }
});

test("owner storage exceptions return failure and leave the other part untouched", async () => {
  const f = fixture();
  f.storage.setItem(templatePartViewKeys.footer, "fit");
  const storage = { getItem: f.storage.getItem, setItem: () => { throw new Error("Storage denied"); } };
  const stop = startStudioPreferenceHost({ ...f, storage, notify: () => {} });
  try {
    assert.deepEqual(await saveStudioPreferenceThroughOwner("header", "fit"), { saved: false, reason: "storage" });
    assert.equal(f.storage.getItem(templatePartViewKeys.footer), "fit");
    assert.equal(f.storage.getItem(templatePartViewKeys.header), null);
  } finally { stop(); }
});

test("host stopping before a queued command executes prevents its write", async () => {
  const f = fixture();
  const channel = { close() {}, postMessage() {}, onmessage: null };
  const stop = startStudioPreferenceHost({ ...f, createChannel: () => channel, notify: () => {} });
  channel.onmessage({ data: { version: 1, type: "save", id: crypto.randomUUID(), preference: "footer", mode: "fit", expiresAt: Date.now() + 5000 } });
  stop();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(f.writes.length, 0);
});


test("queued commands cannot cross owner replacement or restore suspension", async () => {
  for (const suspend of [f => f.replaceOwner(), f => f.setWritable(false)]) {
    const f = fixture();
    const channel = { close() {}, postMessage() {}, onmessage: null };
    const stop = startStudioPreferenceHost({ ...f, createChannel: () => channel, notify: () => {} });
    channel.onmessage({ data: { version: 1, type: "save", id: crypto.randomUUID(), preference: "header", mode: "fit", expiresAt: Date.now() + 5000 } });
    suspend(f);
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(f.writes.length, 0);
    stop();
  }
});


test("denied localStorage access does not crash host startup and fails saving explicitly", async () => {
  const previousWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  Object.defineProperty(globalThis, "window", { configurable: true, value: { get localStorage() { throw new Error("Storage denied"); } } });
  const f = fixture();
  let stop;
  try {
    stop = startStudioPreferenceHost({ ownership: f.ownership, notify: () => {} });
    assert.deepEqual(await saveStudioPreferenceThroughOwner("header", "fit"), { saved: false, reason: "storage" });
  } finally {
    stop?.();
    if (previousWindow) Object.defineProperty(globalThis, "window", previousWindow);
    else delete globalThis.window;
  }
});
