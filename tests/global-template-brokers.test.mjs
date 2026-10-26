import { createIsolatedModuleLoader } from "./production-module.mjs";

import assert from "node:assert/strict";
import test from "node:test";

import { loadViteModule as runnerImport } from "./production-module.mjs";

const options = { root: process.cwd(), environments: { inline: { resolve: { noExternal: [/^@acm\//] } } } };
const { module: templates } = await runnerImport("app/studio/template-model.ts", options);
const { module: contracts } = await runnerImport("app/studio/global-template-contract.ts", options);
const { module: syncModule } = await runnerImport("app/studio/studio-sync.ts", options);

const { module: designContracts } = await runnerImport("app/studio/site-editor/website-design.ts",options);

function fixture(t) {
  const rooms = new Map(); const drivers = []; const sessions = []; const writes = [];
  let revision = "a".repeat(64);
  let saveGate; let waitingForSave = false;
  let source = contracts.validateGlobalTemplateLibrary({ format: "acm-global-templates", version: 1, templates: { ...templates.emptyTemplateStore(), sets: [templates.createTemplateSet("Original")] }, migrations: { test: { bindings: [], bases: [] }, test2: { bindings: [], bases: [] } } });
  class Channel {
    constructor(name) { this.name = name; this.listeners = new Map(); this.room = rooms.get(name) ?? new Set(); rooms.set(name, this.room); this.room.add(this); }
    postMessage(data) { for (const other of this.room) if (other !== this) queueMicrotask(() => other.listeners.get("message")?.forEach(listener => listener({ data: structuredClone(data) }))); }
    addEventListener(name, listener) { const group = this.listeners.get(name) ?? new Set(); group.add(listener); this.listeners.set(name, group); }
    removeEventListener(name, listener) { this.listeners.get(name)?.delete(listener); }
    close() { this.room.delete(this); this.listeners.clear(); }
  }
  function open(owner, runtime = false, { route = "/studio/designs", transport = owner, exclusiveActions = transport } = {}) {
    const slots = []; const effects = []; const events = new Map(); const intervals = new Map(); let cursor = 0; let dirty = true; let result;
    const react = {
      useState(initial) { const index = cursor++; if (!(index in slots)) slots[index] = typeof initial === "function" ? initial() : initial; return [slots[index], update => { const next = typeof update === "function" ? update(slots[index]) : update; if (!Object.is(next, slots[index])) { slots[index] = next; dirty = true; } }]; },
      useRef(initial) { const index = cursor++; return slots[index] ??= { current: initial }; },
      useEffect(effect, deps) { const index = cursor++; const old = slots[index]; if (!old || deps.some((value, i) => !Object.is(value, old.deps[i]))) { slots[index] = { deps }; effects.push(() => { old?.cleanup?.(); slots[index].cleanup = effect(); }); } },
      useSyncExternalStore() { return owner ? "writable" : "waiting"; },
    };
    const ownership = { canWrite: () => owner, write: async callback => { assert.equal(owner, true, "only the existing lock owner writes"); return callback(); } };
    async function request(input) {
      if (input.action === "global-save") {
        waitingForSave = true;
        if (saveGate) await saveGate;
        waitingForSave = false;
        assert.equal(owner, true, "peer must submit through the typed broker");
        assert.equal(input.revision, revision, "gateway CAS revision stays current");
        source = contracts.validateGlobalTemplateLibrary({ ...source, templates: input.templates, ...(input.websiteDesignDefaults ? {version:4,websiteDesignDefaults:input.websiteDesignDefaults} : {}) });
        writes.push(structuredClone(source)); revision = String(writes.length + 1).padStart(64, "0");
      }
      return { library: structuredClone(source), revision, initialised: true };
    }
    const site = { siteId: "test", requestGlobalTemplates: request, canSaveGlobalTemplates: owner };
    const load = createIsolatedModuleLoader({ globals: { Error,
Boolean,
JSON,
BroadcastChannel: Channel,
setInterval: callback => { const id = intervals.size + 1; intervals.set(id, callback); return id; },
clearInterval: id => intervals.delete(id),
window: { setInterval: callback => { const id = intervals.size + 1; intervals.set(id, callback); return id; }, clearInterval: id => intervals.delete(id), addEventListener: (name, callback) => { const group = events.get(name) ?? new Set(); group.add(callback); events.set(name, group); }, removeEventListener: (name, callback) => events.get(name)?.delete(callback), confirm: () => { throw new Error("Reconnect must not discard a draft"); } } },
      sourceOverrides: {
        ...(process.env.GLOBAL_TEMPLATE_HOOK_SOURCE ? { "app/studio/use-global-templates.ts": process.env.GLOBAL_TEMPLATE_HOOK_SOURCE } : {}),
        ...(process.env.GLOBAL_TEMPLATE_RUNTIME_SOURCE ? { "app/studio/test-site/broker-runtime.tsx": process.env.GLOBAL_TEMPLATE_RUNTIME_SOURCE } : {}),
      },
      resolveImport(name, fallback) {
          if (name === "react") return react;
    if (name.endsWith("website-design-startup-cache")) return {refreshWebsiteDesignStartup(){}};
          if (name.endsWith("site-editor/website-design")) return designContracts;
          if (name === "next/navigation") return { usePathname: () => route };
          if (name.endsWith("template-model")) return templates;
          if (name.endsWith("global-template-contract")) return contracts;
          if (name.endsWith("template-reference-gate")) return { withTemplateReferenceWrite: fn => fn(), installGlobalReferenceLibrary() {}, protectGlobalReferenceRemoval() {} };
          if (name.endsWith("browser-template-references")) return { currentBrowserTemplateReferences: () => [] };
          if (name.endsWith("write-ownership")) return { studioWriteOwnership: ownership };
          if (name.endsWith("use-test-site")) return { useTestSite: (enabled, borrowed, siteId) => ({ ...site, siteId, canSaveGlobalTemplates: enabled && borrowed && owner }) };
          if (name.endsWith("use-global-templates")) return load("app/studio/use-global-templates.ts");
          if (name.endsWith("studio-sync")) return { createStudioTransaction: syncModule.createStudioTransaction, createStudioSync: options => { const session = syncModule.createStudioSync({ ...options, channelFactory: name => new Channel(name) }); sessions.push(session); return session; } };
          return fallback();
        },
    });
    const globals = load("app/studio/use-global-templates.ts");
    const shell = runtime ? load("app/studio/test-site/broker-runtime.tsx") : null;
    const driver = {
      render() { if (!dirty) return; dirty = false; cursor = 0; result = shell ? shell.LocalSiteBrokerRuntime()?.type() ?? null : globals.useGlobalTemplates(site, true, transport, false, exclusiveActions); while (effects.length) effects.shift()(); },
      get state() { return result; },
      focus() { events.get("focus")?.forEach(callback => callback()); },
      refresh() { intervals.forEach(callback => callback()); },
      close() { slots.forEach(slot => slot?.cleanup?.()); },
    };
    drivers.push(driver); return driver;
  }
  async function settle() { for (let i = 0; i < 25; i++) { for (const driver of drivers) driver.render(); await new Promise(resolve => setTimeout(resolve, 3)); } }
  async function until(predicate) {
    const deadline = Date.now() + 2000;
    while (Date.now() < deadline) {
      for (const driver of drivers) driver.render();
      if (predicate()) return;
      await new Promise(resolve => setTimeout(resolve, 3));
    }
    assert.fail("Global template outcome did not settle before its deadline");
  }
  t.after(() => { drivers.forEach(driver => driver.close()); sessions.forEach(session => session.close()); });
  return { open, settle, until, writes, rooms, sessions, source: () => source, gate(promise) { saveGate = promise; }, waitingForSave: () => waitingForSave };
}

test("an exact late global save receipt clears the paused adapter without replaying its draft", async t => {
  const f = fixture(t); f.open(true); const peer = f.open(false);
  await f.until(() => peer.state?.session.writable);
  let finish; f.gate(new Promise(resolve => { finish = resolve; }));
  assert.equal(peer.state.session.commit(store => { store.sets[0].name = "Late acknowledged design"; return store; }), true);
  const save = peer.state.session.flush().catch(error => error);
  await f.until(f.waitingForSave);
  const peerChannel = [...f.rooms.get("acm-studio-sync-global-template-library-v2-templates")].at(-1);
  peerChannel.listeners.get("messageerror")?.forEach(callback => callback());
  await f.until(() => Boolean(peer.state.session.error));
  await save; finish();
  await f.until(() => peer.state.session.writable && !peer.state.session.error);
  assert.equal(peer.state.session.store.sets[0].name, "Late acknowledged design");
  assert.equal(f.writes.length, 1);
});

test("Design route owner wakes and serves a global template peer without another writer", async t => {
  const f = fixture(t); const owner = f.open(true, true); owner.render(); const peer = f.open(false);
  await f.until(() => peer.state?.session.writable); assert.equal(peer.state.session.writable, true);
  assert.equal(peer.state.session.commit(store => {
    const template = store.sets[0].templates[1];
    const blocks = templates.templateEditorBlocks(template.nodes);
    blocks.find(block => block.type === "cover-image").displayWidth = 360;
    template.nodes = templates.templateNodesFromBlocks(blocks, template.nodes);
    return store;
  }), true);
  await f.until(() => f.writes.length === 1 && peer.state.session.writable);
  assert.equal(f.writes.length, 1);
  assert.equal(f.source().templates.sets[0].templates[1].nodes.find(node => node.element === "cover-image").displayWidth, 360);
  assert.equal(peer.state.session.writable, true);
  assert.equal(peer.state.session.canUndo, true);
  peer.refresh(); await f.settle();
  assert.equal(peer.state.session.canUndo, true, "acknowledged own save does not erase Undo on gateway readback");
  assert.equal(peer.state.session.undo(), true); await f.until(() => f.writes.length === 2 && peer.state.session.writable);
  assert.equal(f.writes.length, 2, peer.state.session.error || peer.state.session.saveLabel);
  assert.equal(f.source().templates.sets[0].templates[1].nodes.find(node => node.element === "cover-image").displayWidth, undefined);
});

test("foreground refresh reconnects a stale global peer and reports its paused status", async t => {
  const f = fixture(t); f.open(true); const peer = f.open(false); await f.settle();
  assert.equal(peer.state.session.writable, true);
  const room = f.rooms.get("acm-studio-sync-global-template-library-v2-templates");
  // Drop the peer's handshake state using the same browser messageerror boundary.
  const peerChannel = [...room].at(-1);
  peerChannel.listeners.get("messageerror")?.forEach(callback => callback());
  peer.render(); assert.equal(peer.state.session.writable, false);
  assert.match(peer.state.session.saveLabel, /connection paused/);
  peer.focus(); await f.settle();
  assert.equal(peer.state.session.writable, true);
  assert.equal(peer.state.session.commit(store => { store.sets[0].name = "After reconnect"; return store; }), true);
  await f.settle(); assert.equal(f.source().templates.sets[0].name, "After reconnect"); assert.equal(f.writes.length, 1);
});

test("external template changes invalidate full-design Undo instead of reverting another peer", async t => {
  const f = fixture(t); f.open(true); const first = f.open(false); const second = f.open(false);
  await f.until(() => first.state?.session.writable && second.state?.session.writable);
  assert.equal(first.state.session.commit(store => { store.sets[0].templates[1].nodes.find(node => node.element === "cover-image").displayWidth = 320; return store; }), true);
  await f.until(() => f.writes.length === 1 && first.state.session.writable && second.state.session.store.sets[0].templates[1].nodes.find(node => node.element === "cover-image").displayWidth === 320);
  assert.equal(first.state.session.canUndo, true);
  assert.equal(second.state.session.commit(store => { store.sets[0].name = "Other peer's name"; return store; }), true);
  await f.until(() => f.writes.length === 2 && second.state.session.writable && first.state.session.store.sets[0].name === "Other peer's name");
  first.refresh(); await f.settle();
  assert.equal(first.state.session.canUndo, false);
  assert.equal(first.state.session.undo(), false);
  assert.equal(f.source().templates.sets[0].name, "Other peer's name");
  assert.equal(f.source().templates.sets[0].templates[1].nodes.find(node => node.element === "cover-image").displayWidth, 320);
  assert.equal(f.writes.length, 2);
});

test("library ordering saves through the owner CAS, refreshes peers and retains Undo/Redo", async t => {
  const { module: ordering } = await runnerImport("app/studio/library-reordering.ts", options);
  const { module: library } = await runnerImport("app/studio/template-library.ts", options);
  const f=fixture(t); f.open(true); const peer=f.open(false); const other=f.open(false);
  await f.until(()=>peer.state?.session.writable && other.state?.session.writable);
  const entryIds = store => library.templateLibraryEntries(store).map(({set,entry})=>`${set.id}/${entry.id}`);
  const before=entryIds(peer.state.session.store);
  assert.equal(peer.state.session.commit(store=>ordering.reorderLibraryTemplates(store,{id:before.at(-1),targetId:before[0],edge:"before",baseline:before})),true);
  await f.until(()=>f.writes.length===1 && entryIds(other.state.session.store)[0]===before.at(-1));
  assert.deepEqual(entryIds(f.source().templates),entryIds(peer.state.session.store));
  assert.equal(peer.state.session.canUndo,true);
  assert.equal(peer.state.session.undo(),true);
  await f.until(()=>f.writes.length===2 && JSON.stringify(entryIds(other.state.session.store))===JSON.stringify(before));
  assert.equal(peer.state.session.redo(),true);
  await f.until(()=>f.writes.length===3 && entryIds(other.state.session.store)[0]===before.at(-1));
  const reopened=f.open(false); await f.until(()=>reopened.state?.session.writable);
  assert.deepEqual(entryIds(reopened.state.session.store),entryIds(f.source().templates));
});

test("maximum valid legacy owner and entry IDs reorder through the typed gateway broker", async t=>{
 const {module:ordering}=await runnerImport("app/studio/library-reordering.ts",options);
 const {module:library}=await runnerImport("app/studio/template-library.ts",options);
 const f=fixture(t);const owner=f.open(true);const peer=f.open(false);await f.until(()=>owner.state?.session.writable&&peer.state?.session.writable);
 const set=templates.createTemplateSet("Long IDs");set.id="s".repeat(160);set.templates[0].id="p".repeat(160);
 assert.equal(owner.state.session.commit(store=>({...store,sets:[...store.sets,set]})),true);
 await f.until(()=>f.writes.length===1&&peer.state.session.store.sets.length===2);
 const entryIds=store=>library.templateLibraryEntries(store).map(({set,entry})=>`${set.id}/${entry.id}`);
 const baseline=entryIds(peer.state.session.store);const longId=`${set.id}/${set.templates[0].id}`;assert.equal(longId.length,321);
 assert.equal(peer.state.session.commit(store=>ordering.reorderLibraryTemplates(store,{id:longId,targetId:baseline[0],edge:"before",baseline})),true);
 await f.until(()=>f.writes.length===2&&entryIds(owner.state.session.store)[0]===longId);
 assert.equal(entryIds(f.source().templates)[0],longId);
});

test("Navigation and Page link Advanced fields save through the existing owner broker and fresh peer readback", async t => {
  const f = fixture(t); f.open(true); const peer = f.open(false); const other = f.open(false);
  await f.until(() => peer.state?.session.writable && other.state?.session.writable);
  const visualStyle = { anchor: "saved-page-link", className: "saved-link", additionalCss: "color: #123456;" };
  assert.equal(peer.state.session.commit(store => {
    store.sets[0].navigation = [{ id: "advanced-link", label: "Example", url: "/", visualStyle }];
    store.sets[0].parts[0].nodes = [{ id: "advanced-navigation", type: "element", element: "navigation", visualStyle: { ...visualStyle, anchor: "saved-navigation" } }];
    return store;
  }), true);
  await f.until(() => f.writes.length === 1 && other.state.session.store.sets[0].navigation[0]?.visualStyle?.anchor === visualStyle.anchor);
  assert.deepEqual(f.source().templates.sets[0].navigation[0].visualStyle, visualStyle);
  const reopened = f.open(false); await f.until(() => reopened.state?.session.writable);
  assert.deepEqual(reopened.state.session.store.sets[0].navigation[0].visualStyle, visualStyle);
  assert.equal(reopened.state.session.store.sets[0].parts[0].nodes[0].visualStyle.anchor, "saved-navigation");
});

for (const route of ["/studio", "/studio/site-editor"]) test(`${route}: persistent owner serves peer editor adapters and retains import permission`, async t => {
  const f = fixture(t);
  const broker = f.open(true, true, { route }); broker.render();
  const ownEditor = f.open(true, false, { transport: false, exclusiveActions: true });
  const otherEditor = f.open(false, false, { exclusiveActions: true });
  await f.until(() => ownEditor.state?.session.writable && otherEditor.state?.session.writable);
  assert.equal(ownEditor.state.session.exclusiveWritable, true, "same-document ownership retains template import actions");
  assert.equal(otherEditor.state.session.exclusiveWritable, false, "another document cannot acquire exclusive import permission");
  assert.equal(f.sessions.filter(session => session.isPrimary()).length, 1, "only the persistent runtime owns the global saving room");
  assert.equal(ownEditor.state.session.commit(store => { store.sets[0].name = "Peer editor change"; return store; }), true);
  await f.until(() => f.writes.length === 1 && ownEditor.state.session.writable);
  assert.equal(f.source().templates.sets[0].name, "Peer editor change");
  const imported = structuredClone(f.source()); imported.templates.sets[0].name = "Imported through the existing broker";
  assert.equal(ownEditor.state.restoreLibrary(imported), true);
  await f.until(() => f.writes.length === 2 && ownEditor.state.session.writable);
  assert.equal(f.source().templates.sets[0].name, "Imported through the existing broker");
  ownEditor.close(); otherEditor.close();
  const replacement = f.open(false);
  await f.until(() => replacement.state?.session.writable);
  assert.equal(replacement.state.session.store.sets[0].name, "Imported through the existing broker");
  assert.equal(f.sessions.filter(session => session.isPrimary()).length, 1, "replacing visible adapters does not replace the saving owner");
});
