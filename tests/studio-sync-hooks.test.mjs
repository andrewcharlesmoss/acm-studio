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
    const windowListeners = new Map();
    const slots = []; const cache = new Map(); let cursor = 0; let dirty = true; let effects = []; let state; let closed = false;
    let deferEffects = false; let deferredEffects = [];
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
        navigator: { locks }, window: { localStorage: storage, dispatchEvent() {},
          addEventListener(name, listener) { const listeners = windowListeners.get(name) ?? new Set(); listeners.add(listener); windowListeners.set(name, listeners); },
          removeEventListener(name, listener) { windowListeners.get(name)?.delete(listener); },
        }, require(name) {
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
      focus() { windowListeners.get("focus")?.forEach(listener => listener()); },
      deferEffects(value) { deferEffects = value; },
      runEffects() { const pending = deferredEffects; deferredEffects = []; pending.forEach(effect => effect()); },
      render() {
        if (!dirty || closed) return;
        dirty = false; cursor = 0;
        // eslint-disable-next-line react-hooks/rules-of-hooks -- Drives the real hooks through an isolated dispatcher.
        const workspace = useStudioWorkspace();
        // eslint-disable-next-line react-hooks/rules-of-hooks -- Same mount structure as useDocumentTemplates.
        const templates = useTemplates(workspace.ownershipGeneration, workspace.writable);
        state = { workspace, templates };
        const pending = effects; effects = [];
        if (deferEffects) deferredEffects.push(...pending); else pending.forEach(effect => effect());
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
const microticks = async count => { for (let tick = 0; tick < count; tick++) await Promise.resolve(); };
async function pair(t) {
  const f = fixture(t); const owner = f.open(); await f.until(() => owner.state?.workspace.writable && owner.state?.templates.ready);
  const model = owner.load("app/studio/template-model.ts");
  owner.state.templates.commit(store => ({ ...store, sets: [model.createTemplateSet("Initial")] }));
  await f.flush();
  const peer = f.open(); await f.until(() => peer.state?.workspace.writable && peer.state?.templates.writable);
  return { ...f, owner, peer };
}

test("delayed owner effects cannot save an older heading over newer peer typing", async t => {
  const f = await pair(t);
  const headingId = active(f.peer).blocks.find(block => block.type === "heading").id;
  const heading = tab => active(tab).blocks.find(block => block.id === headingId);
  const type = text => f.peer.state.workspace.updateActiveDocument(doc => ({ ...doc,
    blocks: doc.blocks.map(block => block.id === headingId ? { ...block, text, runs: [{ text }] } : block),
  }));
  f.owner.deferEffects(true);
  type("T"); f.peer.render(); await microticks(60);
  f.owner.render(); // Capture T in a render before its passive effects run.
  f.peer.render();
  type("Te"); f.peer.render();
  await new Promise(resolve => setTimeout(resolve, 30)); await microticks(80);
  type("Test heading"); // New input is still awaiting a render/save effect.
  f.owner.runEffects(); await microticks(80);
  f.owner.deferEffects(false); await f.flush();
  assert.equal(f.peer.state.workspace.syncConflict, null);
  await f.until(() => heading(f.owner).text === "Test heading");
  assert.equal(heading(f.peer).text, "Test heading");
  assert.deepEqual(Array.from(heading(f.owner).runs, run => run.text), ["Test heading"]);
  const ownerClient = f.messages.find(message => message.kind === "update" && message.revision === 1 && message.storeKey === "workspace").senderId;
  assert.equal(f.messages.filter(message => message.kind === "update" && message.storeKey === "workspace" && message.transaction.clientId === ownerClient).length, 0,
    "receiving peer input must not turn a stale render into an owner edit");
  const reopened = f.open(); await f.until(() => reopened.state?.workspace.writable);
  assert.equal(active(reopened).blocks.find(block => block.id === headingId).text, "Test heading");
});

for (const role of ["owner", "peer"]) {
  test(`${role}: newer input supersedes a save before its submission microtask`, async t => {
    const f = await pair(t); const editor = f[role];
    const before = f.messages.length;
    editor.state.workspace.updateActiveField("subtitle", "Older render");
    editor.render(); // The effect schedules its write, which has not started.
    editor.state.workspace.updateActiveField("subtitle", "Newest input");
    await microticks(80);
    assert.equal(f.messages.slice(before).filter(message => message.storeKey === "workspace"
      && ["operation", "update"].includes(message.kind)).length, 0,
    "a superseded render must not update the pending draft or start a save");
    await f.until(() => active(f.owner).subtitle === "Newest input" && active(f.peer).subtitle === "Newest input");
    assert.equal(editor.state.workspace.syncConflict, null);
    const reopened = f.open(); await f.until(() => reopened.state?.workspace.writable);
    assert.equal(active(reopened).subtitle, "Newest input");
  });
}

for (const competing of [false, true]) {
  test(`owner input before rendering ${competing ? "retains a genuine overlap for review" : "merges an independent peer edit"}`, async t => {
    const f = await pair(t);
    f.owner.state.workspace.updateActiveField("subtitle", "Newest owner input");
    f.peer.state.workspace.updateActiveField(competing ? "subtitle" : "category", "Peer input");
    f.peer.render(); await microticks(80); await f.flush();
    assert.equal(active(f.owner).subtitle, "Newest owner input");
    if (competing) {
      assert.ok(f.owner.state.workspace.syncConflict);
      assert.equal(active(f.peer).subtitle, "Peer input");
      await f.owner.state.workspace.resolveSyncConflict("mine");
      await f.until(() => active(f.peer).subtitle === "Newest owner input");
    } else {
      await f.until(() => active(f.peer).subtitle === "Newest owner input");
      assert.equal(active(f.owner).category, "Peer input");
      assert.equal(f.owner.state.workspace.syncConflict, null);
    }
    const reopened = f.open(); await f.until(() => reopened.state?.workspace.writable);
    assert.equal(active(reopened).subtitle, "Newest owner input");
  });
}

test("a failed owner save preserves input and waits for an explicit retry", async t => {
  const f = await pair(t);
  const repository = f.owner.load("app/studio/workspace-repository.ts").browserWorkspaceRepository;
  const save = repository.save; let writes = 0; let fail = true;
  repository.save = snapshot => { writes++; if (fail) throw new Error("quota"); return save(snapshot); };
  f.owner.state.workspace.updateActiveField("subtitle", "Retain my unsaved input");
  await f.flush(); await f.flush();
  assert.equal(writes, 1, "rendering the retained draft must not repeatedly retry a failed save");
  assert.equal(active(f.owner).subtitle, "Retain my unsaved input");
  assert.match(f.owner.state.workspace.saveLabel, /quota|Could not save locally/);
  assert.doesNotMatch(f.owner.state.workspace.saveLabel, /Saved locally/);
  fail = false; await f.flush();
  assert.equal(writes, 1, "storage recovery alone must not mask the failure by silently retrying");
  assert.equal(f.owner.state.workspace.requestSave(), true);
  await f.until(() => active(f.peer).subtitle === "Retain my unsaved input");
  assert.equal(writes, 2);
  assert.match(f.owner.state.workspace.saveLabel, /Saved locally/);
});

test("retry and foreground recovery probe the existing sync session while retaining the real owner", async t => {
  const f = await pair(t);
  const helloCount = () => f.messages.filter(message => message.kind === "hello" && message.storeKey === "workspace").length;
  const beforeRetry = helloCount();
  f.peer.state.workspace.retryEditing(); await f.flush();
  assert.ok(helloCount() > beforeRetry, "retry must probe the channel, not just the writer lock");
  const beforeFocus = helloCount();
  f.peer.focus(); await f.flush();
  assert.ok(helloCount() > beforeFocus);
  assert.equal(f.peer.state.workspace.writable, true);
  assert.equal(f.peer.state.workspace.exclusiveWritable, false);
  assert.equal(f.owner.state.workspace.exclusiveWritable, true);
  f.peer.state.workspace.updateActiveField("subtitle", "Recovered foreground editing");
  await f.until(() => active(f.owner).subtitle === "Recovered foreground editing");
});

test("input arriving during a reconnect survives before React renders or runs the save effect", async t => {
  const f = await pair(t);
  f.peer.state.workspace.retryEditing();
  f.peer.state.workspace.updateActiveField("subtitle", "First keystroke");
  f.peer.state.workspace.updateActiveField("subtitle", "Newest keystrokes");
  // Deliver the welcome ahead of React's next render and passive effects.
  for (let tick = 0; tick < 40; tick++) await Promise.resolve();
  await f.until(() => active(f.owner).subtitle === "Newest keystrokes");
  assert.equal(active(f.peer).subtitle, "Newest keystrokes");
  assert.equal(f.peer.state.workspace.syncConflict, null);
  assert.equal(f.peer.state.workspace.canUndo, true);
});

for (const storeKey of ["workspace", "templates"]) {
  const edit = (tab, value) => storeKey === "workspace"
    ? tab.state.workspace.updateActiveField("subtitle", value)
    : tab.state.templates.commit(store => ({ ...store, sets: store.sets.map(set => ({ ...set, name: value })) }));
  const value = tab => storeKey === "workspace" ? active(tab).subtitle : tab.state.templates.store.sets[0].name;
  const conflict = tab => tab.state[storeKey].syncConflict;

  test(`${storeKey}: a reconnect with unchanged shared content preserves Undo and Redo`, async t => {
    const f = await pair(t); const original = value(f.peer);
    edit(f.peer, "My saved edit"); await f.until(() => value(f.owner) === "My saved edit");
    assert.equal(f.peer.state[storeKey].canUndo, true);
    f.peer.state.workspace.retryEditing(); f.peer.state.templates.retryConnection(); await f.flush();
    assert.equal(f.peer.state[storeKey].canUndo, true);
    f.peer.state[storeKey].undo(); await f.until(() => value(f.owner) === original);
    assert.equal(f.peer.state[storeKey].canRedo, true);
    f.peer.state.workspace.retryEditing(); f.peer.state.templates.retryConnection(); await f.flush();
    assert.equal(f.peer.state[storeKey].canRedo, true);
  });

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

test("reconnection recognises saved heading keystrokes before rebasing newer typing", async t => {
  const f = await pair(t);
  const headingId = active(f.peer).blocks.find(block => block.type === "heading").id;
  const heading = tab => active(tab).blocks.find(block => block.id === headingId);
  const type = text => f.peer.state.workspace.updateActiveDocument(doc => ({ ...doc,
    blocks: doc.blocks.map(block => block.id === headingId ? { ...block, text, runs: [{ text }] } : block),
  }));
  f.hold(message => message.storeKey === "workspace" && message.revision === 1
    && ["update", "ack"].includes(message.kind));
  type("A"); await f.until(() => heading(f.owner).text === "A");
  type("AB"); await f.flush();
  f.owner.state.workspace.updateActiveField("category", "Independent change");
  await f.flush(); // Revision 2 arrives before 1, causing a fresh welcome.
  assert.equal(f.peer.state.workspace.syncConflict, null);
  assert.equal(heading(f.peer).text, "AB");
  await f.until(() => heading(f.owner).text === "AB");
  f.hold(() => false); f.release(); await f.flush();
  assert.equal(f.peer.state.workspace.syncConflict, null);
  assert.equal(active(f.peer).category, "Independent change");
  const reopened = f.open(); await f.until(() => reopened.state?.workspace.writable);
  assert.equal(heading(reopened).text, "AB");
  assert.deepEqual(JSON.parse(JSON.stringify(heading(reopened).runs)), [{ text: "AB" }]);
});

test("typing after an own update but before its ACK uses the current saved revision", async t => {
  const f = await pair(t);
  f.hold(message => message.storeKey === "workspace" && message.kind === "ack" && message.revision === 1);
  f.peer.state.workspace.updateActiveField("subtitle", "A");
  await f.until(() => active(f.owner).subtitle === "A");
  f.peer.state.workspace.updateActiveField("subtitle", "AB"); await f.flush();
  f.hold(() => false); f.release();
  await f.until(() => active(f.owner).subtitle === "AB");
  assert.equal(f.peer.state.workspace.syncConflict, null);
  assert.equal(active(f.peer).subtitle, "AB");
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
