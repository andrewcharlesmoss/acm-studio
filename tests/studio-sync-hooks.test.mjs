import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";

const require = createRequire(import.meta.url);
const root = new URL("../", import.meta.url).pathname;

// Run the actual hooks, repositories, ownership coordinator and sync sessions.
// Only React scheduling, browser storage, Web Locks and message delivery are faked.
function fixture(t) {
  const records = new Map(); const rooms = new Map(); const tabs = [];
  const messages = []; const held = []; let hold = () => false; let lockHeld = false;
  const locks = { async request(_name, options, callback) {
    assert.equal(options.ifAvailable, true);
    if (lockHeld) return callback(null);
    lockHeld = true;
    try { return await callback({}); } finally { lockHeld = false; }
  } };
  function open() {
    const slots = []; const cache = new Map(); let cursor = 0; let dirty = true; let effects = []; let state; let closed = false;
    const react = {
      useState(initial) {
        const id = cursor++;
        if (!(id in slots)) slots[id] = typeof initial === "function" ? initial() : initial;
        return [slots[id], update => { const next = typeof update === "function" ? update(slots[id]) : update; if (!Object.is(next, slots[id])) { slots[id] = next; dirty = true; } }];
      },
      useRef(initial) { const id = cursor++; return slots[id] ??= { current: initial }; },
      useCallback(callback, deps) { const id = cursor++; if (!slots[id] || deps.some((v, i) => !Object.is(v, slots[id].deps[i]))) slots[id] = { callback, deps }; return slots[id].callback; },
      useEffect(effect, deps) {
        const id = cursor++; const previous = slots[id];
        if (!previous || deps.some((v, i) => !Object.is(v, previous.deps[i]))) {
          slots[id] = { deps }; effects.push(() => { previous?.cleanup?.(); slots[id].cleanup = effect(); });
        }
      },
    };
    class BroadcastChannel {
      constructor(name) { this.room = rooms.get(name) ?? new Set(); rooms.set(name, this.room); this.listeners = new Set(); this.room.add(this.listeners); }
      postMessage(message) {
        messages.push(structuredClone(message));
        const deliver = () => { for (const listeners of this.room) if (listeners !== this.listeners) queueMicrotask(() => listeners.forEach(listener => listener({ data: structuredClone(message) }))); };
        if (hold(message)) held.push({ message, deliver }); else deliver();
      }
      addEventListener(type, listener) { if (type === "message") this.listeners.add(listener); }
      removeEventListener(_type, listener) { this.listeners.delete(listener); }
      close() { this.room.delete(this.listeners); this.listeners.clear(); }
    }
    const storage = { getItem: key => records.get(key) ?? null, setItem(key, value) {
      assert.equal(load("app/studio/write-ownership.ts").studioWriteOwnership.canWrite(), true, "only the lock owner may persist");
      records.set(key, value);
    } };
    function load(file) {
      const filename = path.resolve(root, file);
      if (cache.has(filename)) return cache.get(filename);
      const exports = {}; cache.set(filename, exports);
      const source = ts.transpileModule(readFileSync(filename, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
      vm.runInNewContext(source, { exports, Error, Event, crypto, structuredClone, queueMicrotask, setTimeout, clearTimeout, setInterval, clearInterval, BroadcastChannel,
        navigator: { locks }, window: { localStorage: storage, dispatchEvent() {} }, require(name) {
          if (name === "react") return react;
          if (!name.startsWith(".")) return require(name);
          return load(path.resolve(path.dirname(filename), /\.(ts|mjs)$/.test(name) ? name : `${name}.ts`));
        },
      }, { filename });
      return exports;
    }
    const { useStudioWorkspace } = load("app/studio/use-studio-workspace.ts");
    const { useTemplates } = load("app/studio/use-templates.ts");
    const tab = {
      load, get state() { return state; },
      render() {
        if (!dirty || closed) return;
        dirty = false; cursor = 0;
        // eslint-disable-next-line react-hooks/rules-of-hooks -- Drives the real hooks through an isolated dispatcher.
        const workspace = useStudioWorkspace();
        // eslint-disable-next-line react-hooks/rules-of-hooks -- Same mount structure as useDocumentTemplates.
        const templates = useTemplates(workspace.ownershipGeneration, workspace.writable);
        state = { workspace, templates };
        const pending = effects; effects = []; pending.forEach(effect => effect());
      },
      close() { closed = true; slots.forEach(slot => slot?.cleanup?.()); },
    };
    tabs.push(tab); return tab;
  }
  async function flush() { for (let pass = 0; pass < 20; pass++) { tabs.forEach(tab => tab.render()); for (let tick = 0; tick < 12; tick++) await Promise.resolve(); } }
  async function until(predicate) { for (let i = 0; i < 80; i++) { await flush(); if (predicate()) return; await new Promise(resolve => setTimeout(resolve, 5)); } assert.fail(`sync did not reach expected state: ${JSON.stringify(tabs.map(tab => ({ workspace: tab.state?.workspace.saveLabel, templates: tab.state?.templates.saveLabel, error: tab.state?.templates.error, name: tab.state?.templates.store.sets[0]?.name })))}`); }
  t.after(() => tabs.forEach(tab => tab.close()));
  return { open, flush, until, records, messages, hold(predicate) { hold = predicate; }, release() { const pending = held.splice(0); pending.forEach(item => item.deliver()); }, held };
}

const active = tab => tab.state.workspace.workspace.documents.find(doc => doc.id === tab.state.workspace.workspace.activeDocumentId);
async function pair(t) {
  const f = fixture(t); const owner = f.open(); await f.until(() => owner.state?.workspace.writable && owner.state?.templates.ready);
  const model = owner.load("app/studio/template-model.ts");
  owner.state.templates.commit(store => ({ ...store, sets: [model.createTemplateSet("Initial")] }));
  await f.flush();
  const peer = f.open(); await f.until(() => peer.state?.workspace.writable && peer.state?.templates.writable);
  return { ...f, owner, peer };
}

for (const storeKey of ["workspace", "templates"]) {
  const edit = (tab, value) => storeKey === "workspace"
    ? tab.state.workspace.updateActiveField("subtitle", value)
    : tab.state.templates.commit(store => ({ ...store, sets: store.sets.map(set => ({ ...set, name: value })) }));
  const value = tab => storeKey === "workspace" ? active(tab).subtitle : tab.state.templates.store.sets[0].name;
  const conflict = tab => tab.state[storeKey].syncConflict;

  test(`${storeKey}: ACK advances baseline, overlapping edits survive handover and owner sees accepted edits`, async t => {
    const f = await pair(t);
    edit(f.peer, "First"); await f.until(() => value(f.owner) === "First");
    assert.equal(conflict(f.peer), null);
    f.hold(message => message.kind === "operation" && message.storeKey === storeKey);
    edit(f.peer, "Second"); await f.until(() => f.held.some(item => item.message.storeKey === storeKey));
    edit(f.peer, "Third"); await f.flush();
    f.release(); // Accept Second but hold the subsequently queued Third operation.
    await f.until(() => value(f.owner) === "Second");
    assert.equal(value(f.peer), "Third"); assert.equal(conflict(f.peer), null);
    f.owner.close(); await f.flush();
    f.peer.state.workspace.retryEditing();
    await f.until(() => f.peer.state.workspace.exclusiveWritable && f.peer.state.templates.exclusiveWritable);
    assert.equal(value(f.peer), "Third"); assert.equal(conflict(f.peer), null);
    const reopened = f.open(); await f.until(() => reopened.state?.workspace.writable && reopened.state?.templates.writable);
    assert.equal(value(reopened), "Third", "remaining edits must reach storage, not only the owner canvas");
  });

  test(`${storeKey}: third peer welcome cannot reset an existing peer's pending edit`, async t => {
    const f = await pair(t);
    edit(f.peer, "First"); await f.until(() => value(f.owner) === "First");
    f.hold(message => message.kind === "operation" && message.storeKey === storeKey);
    edit(f.peer, "Pending"); await f.flush();
    const third = f.open(); await f.until(() => third.state?.workspace.writable && third.state?.templates.writable);
    assert.equal(value(third), "First"); assert.equal(value(f.peer), "Pending"); assert.equal(conflict(f.peer), null);
    f.hold(() => false); f.release(); await f.until(() => value(f.owner) === "Pending" && value(third) === "Pending");
    assert.equal(conflict(f.peer), null);
  });

  test(`${storeKey}: ACK before update advances committed state and preserves newer local edits`, async t => {
    const f = await pair(t);
    f.hold(message => message.kind === "update" && message.storeKey === storeKey);
    if (storeKey === "workspace") f.owner.state.workspace.updateActiveField("title", "Remote before ACK");
    else f.owner.state.templates.commit(store => ({ ...store, sets: [...store.sets, f.owner.load("app/studio/template-model.ts").createTemplateSet("Remote before ACK")] }));
    await f.flush();
    edit(f.peer, "First"); await f.flush(); edit(f.peer, "Second");
    const remoteArrived = () => storeKey === "workspace" ? active(f.peer).title === "Remote before ACK" : f.peer.state.templates.store.sets.length === 2;
    await f.until(() => value(f.owner) === "Second" && remoteArrived());
    assert.equal(value(f.peer), "Second"); assert.equal(conflict(f.peer), null);
    f.release(); await f.flush();
    assert.equal(value(f.peer), "Second"); assert.equal(remoteArrived(), true);
    // Reconnect with the acknowledged baseline; delayed own updates are harmless.
    f.owner.close(); await f.flush(); f.peer.state.workspace.retryEditing();
    await f.until(() => f.peer.state.workspace.exclusiveWritable && f.peer.state.templates.exclusiveWritable);
    assert.equal(value(f.peer), "Second"); assert.equal(conflict(f.peer), null);
  });

  test(`${storeKey}: independent remote update leaves pending work unsaved until handover persists it`, async t => {
    const f = await pair(t);
    f.hold(message => message.kind === "operation" && message.storeKey === storeKey);
    edit(f.peer, "Pending local"); await f.flush();
    if (storeKey === "workspace") f.owner.state.workspace.updateActiveField("title", "Independent remote");
    else f.owner.state.templates.commit(store => ({ ...store, sets: [...store.sets, f.owner.load("app/studio/template-model.ts").createTemplateSet("Independent remote")] }));
    const remoteArrived = () => storeKey === "workspace" ? active(f.peer).title === "Independent remote" : f.peer.state.templates.store.sets.length === 2;
    await f.until(remoteArrived);
    assert.equal(value(f.peer), "Pending local"); assert.notEqual(value(f.owner), "Pending local"); assert.equal(conflict(f.peer), null);
    f.owner.close(); await f.flush(); f.peer.state.workspace.retryEditing();
    await f.until(() => f.peer.state.workspace.exclusiveWritable && f.peer.state.templates.exclusiveWritable);
    assert.equal(value(f.peer), "Pending local"); assert.equal(remoteArrived(), true); assert.equal(conflict(f.peer), null);
    const reopened = f.open(); await f.until(() => reopened.state?.workspace.writable && reopened.state?.templates.writable);
    assert.equal(value(reopened), "Pending local");
  });

  test(`${storeKey}: genuine competing edits remain reviewable through handover`, async t => {
    const f = await pair(t);
    f.hold(message => message.kind === "operation" && message.storeKey === storeKey);
    edit(f.peer, "Mine"); await f.flush(); edit(f.owner, "Theirs");
    await f.until(() => Boolean(conflict(f.peer)));
    assert.equal(value(f.peer), "Mine"); assert.equal(value(f.owner), "Theirs");
    f.owner.close(); await f.flush(); f.peer.state.workspace.retryEditing();
    await f.until(() => f.peer.state.workspace.exclusiveWritable);
    assert.ok(conflict(f.peer)); assert.equal(value(f.peer), "Mine");
    await f.peer.state[storeKey].resolveSyncConflict("theirs"); await f.flush();
    assert.equal(conflict(f.peer), null); assert.equal(value(f.peer), "Theirs");
  });
}

test("owner displays peer changes when selection and timestamps differ", async t => {
  const f = await pair(t);
  const originalId = active(f.owner).id;
  const otherId = f.owner.state.workspace.workspace.documents.find(doc => doc.id !== originalId).id;
  f.owner.state.workspace.setActiveDocument(otherId);
  f.owner.state.workspace.updateDocument(originalId, doc => ({ ...doc, title: "Shared title" }));
  await f.until(() => active(f.peer).title === "Shared title");
  f.peer.state.workspace.updateActiveField("subtitle", "First saved subtitle");
  await f.until(() => f.owner.state.workspace.workspace.documents.find(doc => doc.id === originalId).subtitle === "First saved subtitle");
  assert.equal(f.owner.state.workspace.workspace.activeDocumentId, otherId);
  assert.equal(f.peer.state.workspace.workspace.activeDocumentId, originalId);
  assert.equal(f.owner.state.workspace.syncConflict, null);
});

test("three tabs accept owner Category after the peer's saved Subtitle without a competing edit", async t => {
  const f = await pair(t);
  assert.equal(active(f.owner).category, undefined);
  const third = f.open(); await f.until(() => third.state?.workspace.writable);
  for (const subtitle of ["Third", "Fourth"]) {
    f.peer.state.workspace.updateActiveField("subtitle", subtitle);
    await f.until(() => active(f.owner).subtitle === subtitle && active(third).subtitle === subtitle);
  }
  f.owner.state.workspace.updateActiveField("category", "Sync QA");
  await f.until(() => active(f.peer).category === "Sync QA" && active(third).category === "Sync QA");
  for (const tab of [f.owner, f.peer, third]) {
    assert.equal(tab.state.workspace.syncConflict, null);
    assert.equal(active(tab).subtitle, "Fourth");
  }
});

test("template Author and Category defaults converge on the same target after commits", async t => {
  const f = await pair(t);
  const templateId = f.owner.state.templates.store.sets[0].templates[0].id;
  const defaults = tab => tab.state.templates.store.sets[0].templates.find(template => template.id === templateId).defaults;
  const commitDefault = (tab, field, value) => assert.equal(tab.state.templates.commit(store => ({
    ...store,
    sets: store.sets.map(set => ({ ...set, templates: set.templates.map(template => template.id === templateId
      ? { ...template, defaults: { ...template.defaults, [field]: value } } : template) })),
  })), true);
  commitDefault(f.peer, "author", "Template Example Author");
  await f.until(() => defaults(f.owner).author === "Template Example Author");
  commitDefault(f.peer, "author", "Template Example Author Two");
  commitDefault(f.owner, "category", "Template QA Category");
  await f.until(() => [f.owner, f.peer].every(tab => defaults(tab).author === "Template Example Author Two" && defaults(tab).category === "Template QA Category"));
  for (const tab of [f.owner, f.peer]) assert.equal(tab.state.templates.syncConflict, null);
  const reopened = f.open(); await f.until(() => reopened.state?.templates.writable);
  assert.equal(defaults(reopened).author, "Template Example Author Two");
  assert.equal(defaults(reopened).category, "Template QA Category");
});
