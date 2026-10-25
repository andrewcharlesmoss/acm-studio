import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, realpath, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import { performance } from "node:perf_hooks";
import path from "node:path";
import test from "node:test";
import { createIsolatedModuleLoader } from "./production-module.mjs";
import { loadViteModule as runnerImport } from "./production-module.mjs";
import { createTestSiteStore, revisionOf } from "../scripts/test-site-store.mjs";
import { siteImageName } from "../app/content/site-featured-image.mjs";
import { createHash } from "node:crypto";

const projectRoot = new URL("../", import.meta.url).pathname;
const { module: contract } = await runnerImport(path.join(projectRoot, "app/studio/test-site/contract.ts"), { root: projectRoot });
const { module: templates } = await runnerImport(path.join(projectRoot, "app/studio/template-model.ts"), { root: projectRoot });
const clone = value => structuredClone(value);
const navigationLabel = document => document.templates.sets.find(set => set.id === document.siteNavigation.setId).navigation[0].label;
const editNavigation = (state, label) => state.updateDraft(document => {
  document.templates.sets.find(set => set.id === document.siteNavigation.setId).navigation[0].label = label;
  return document;
});

// Execute the production hook, sync/rebase and ownership code against the real
// file gateway. Only React scheduling, browser events/transport and timer delivery
// are controlled; sleeping tabs retain their hook state but cannot run callbacks.
async function fixture(t, siteId) {
  const root = await realpath(await mkdtemp(path.join(os.tmpdir(), "studio-lease-recovery-")));
  const page = { id: "home", kind: "page", title: "Home", slug: "", excerpt: "", status: "draft", updatedAt: "2026-10-10T00:00:00.000Z", tags: [], seoTitle: "", seoDescription: "", blocks: [{ id: "body", type: "paragraph", text: "Original body" }] };
  const initial = contract.testSiteCollection({ format: "acm-test-site", version: 3, siteId, documents: [page], categories: [], bin: [], activeDocumentId: page.id, homeDocumentId: page.id, templates: templates.emptyTemplateStore(), browserImportComplete: true });
  assert.equal(contract.validTestSiteDocument(initial), true);
  let now = 0; let expireRender = false; let renderSideEffect;
  const render = (_document, revision) => `<meta name="acm-test-revision" content="${revision}">`;
  await mkdir(path.join(root, "content")); await mkdir(path.join(root, "dist"));
  await writeFile(path.join(root, "content/site.json"), JSON.stringify(initial));
  await writeFile(path.join(root, "dist/index.html"), render(initial, revisionOf(initial)));
  const store = createTestSiteStore({ root, siteId, validate: contract.validTestSiteDocument, clock: () => now, render: (document, revision) => {
    if (expireRender) { expireRender = false; renderSideEffect?.(); renderSideEffect = undefined; now += 40000; }
    return render(document, revision);
  } });
  const rooms = new Map(); const tabs = []; const requests = []; const timers = new Map(); const assets = new Map();
  let nextTimer = 0; let lockHeld = false;
  const locks = { async request(_name, options, callback) {
    assert.equal(options.ifAvailable, true);
    if (lockHeld) return callback(null);
    lockHeld = true;
    try { return await callback({}); } finally { lockHeld = false; }
  } };
  function open({ peer = false, preview = false, brokerOnly = false } = {}) {
    const listeners = new Map(); const slots = [];
    let cursor = 0; let dirty = true; let effects = []; let layouts = []; let state;
    let suspended = false; let closed = false; let responseLost = false; let confirms = 0; let dropMessages = false;
    const queuedMessages = []; const exports = [];
    const addEventListener = (name, listener) => { const set = listeners.get(name) ?? new Set(); set.add(listener); listeners.set(name, set); };
    const removeEventListener = (name, listener) => listeners.get(name)?.delete(listener);
    const schedule = (callback, delay = 0, interval = 0) => { const id = ++nextTimer; timers.set(id, { tab, callback, due: now + delay, interval }); return id; };
    const setTimeout = (callback, delay) => schedule(callback, delay);
    const setInterval = (callback, delay) => schedule(callback, delay, delay);
    const clearTimer = id => timers.delete(id);
    const react = {
      useState(initial) {
        const id = cursor++;
        if (!(id in slots)) slots[id] = typeof initial === "function" ? initial() : initial;
        return [slots[id], update => { const next = typeof update === "function" ? update(slots[id]) : update; if (!Object.is(next, slots[id])) { slots[id] = next; dirty = true; } }];
      },
      useRef(initial) { return slots[cursor++] ??= { current: initial }; },
      useCallback(callback, deps) { return react.useMemo(() => callback, deps); },
      useMemo(factory, deps) {
        const id = cursor++;
        if (!slots[id] || deps.some((value, index) => !Object.is(value, slots[id].deps[index]))) slots[id] = { value: factory(), deps };
        return slots[id].value;
      },
      useEffect(effect, deps) { registerEffect(effect, deps, effects); },
      useLayoutEffect(effect, deps) { registerEffect(effect, deps, layouts); },
      useSyncExternalStore(subscribe, getSnapshot) {
        const [value, setValue] = react.useState(getSnapshot);
        react.useEffect(() => { const update = () => setValue(getSnapshot()); update(); return subscribe(update); }, [subscribe, getSnapshot]);
        return value;
      },
    };
    function registerEffect(effect, deps, queue) {
      const id = cursor++; const previous = slots[id];
      if (!previous || deps.some((value, index) => !Object.is(value, previous.deps[index]))) {
        slots[id] = { deps }; queue.push(() => { previous?.cleanup?.(); slots[id].cleanup = effect(); });
      }
    }
    class BroadcastChannel {
      constructor(name) { this.room = rooms.get(name) ?? new Set(); rooms.set(name, this.room); this.handlers = new Set(); this.room.add(this); }
      postMessage(message) {
        for (const channel of this.room) if (channel !== this) channel.deliver(clone(message));
      }
      deliver(message) {
        if (dropMessages) return;
        const invoke = () => { if (!closed) this.handlers.forEach(listener => listener({ data: clone(message) })); };
        if (suspended) queuedMessages.push(invoke); else queueMicrotask(invoke);
      }
      addEventListener(name, listener) { if (name === "message") this.handlers.add(listener); }
      removeEventListener(_name, listener) { this.handlers.delete(listener); }
      close() { this.room.delete(this); this.handlers.clear(); }
    }
    const document = { visibilityState: "visible", addEventListener, removeEventListener, createElement: () => ({ click() {} }) };
    async function fetch(_url, options) {
      if (_url.startsWith("/__studio/site-media/")) {
        const name = _url.split("/").at(-1);
        try { const bytes = await readFile(path.join(root, "content/media", name)); return new Response(bytes, { headers: { "Content-Length": String(bytes.length) } }); }
        catch { return new Response(null, { status: 404 }); }
      }
      const input = JSON.parse(options.body); const token = options.headers["X-Studio-Test-Token"];
      const request = { tab, action: input.action, document: input.document && clone(input.document), featuredImages: input.featuredImages }; requests.push(request);
      try {
        const result = input.action === "connect" ? await store.connect() : await store.handle(token, input);
        if (input.action === "save" && responseLost) { responseLost = false; throw new TypeError("The save response was lost."); }
        request.status = 200; return { ok: true, status: 200, json: async () => clone(result) };
      } catch (error) {
        if (!error.status) { request.failure = error.message; throw error; }
        request.status = error.status; return { ok: false, status: error.status, json: async () => ({ error: error.message, code: error.code }) };
      }
    }
    const load = createIsolatedModuleLoader({ overrides: { react },
      fileOverrides: {
        "app/studio/test-site/contract.ts": contract,
        "app/studio/media-store.ts": { getMediaAsset: async id => assets.get(id), listMediaLibrary: async () => ({ assets: [...assets.values()], folders: [] }) },
      },
      sourceOverrides: process.env.SITE_RECOVERY_SOURCE ? { "app/studio/test-site/use-test-site.ts": process.env.SITE_RECOVERY_SOURCE } : {},
      globals: { Error, Event, crypto, TextEncoder, Uint8Array, structuredClone, queueMicrotask, setTimeout, clearTimeout: clearTimer, setInterval, clearInterval: clearTimer, BroadcastChannel, Blob, btoa, atob, fetch, document,
        URL: { createObjectURL(blob) { exportsForDraft(blob); return "blob:fixture"; }, revokeObjectURL() {} },
        navigator: { locks }, window: { addEventListener, removeEventListener, setTimeout, clearTimeout: clearTimer, setInterval, clearInterval: clearTimer, confirm() { confirms++; return false; } },
      },
    });
    function exportsForDraft(blob) { exports.push(blob); }
    const { useTestSite } = load("app/studio/test-site/use-test-site.ts");
    const ownership = load("app/studio/write-ownership.ts").studioWriteOwnership;
    let releaseLock = () => {};
    // Model the owning editor's acquisition on mount and pageshow. The site
    // adapter only borrows this lock; it must never acquire one itself.
    const acquire = () => {
      if (peer || preview || ownership.canWrite()) return;
      releaseLock();
      releaseLock = ownership.acquire(token => ownership.loaded(token, true), locks);
    };
    acquire();
    const tab = {
      get state() { return state; }, get suspended() { return suspended; }, get confirms() { return confirms; }, exports,
      event(name) { listeners.get(name)?.forEach(listener => listener({})); },
      suspend({ pagehide = false } = {}) { if (pagehide) tab.event("pagehide"); suspended = true; document.visibilityState = "hidden"; },
      resume(name = "pageshow") { suspended = false; document.visibilityState = "visible"; acquire(); queuedMessages.splice(0).forEach(callback => queueMicrotask(callback)); tab.event(name); },
      loseNextSaveResponse() { responseLost = true; },
      dropSyncMessages(value) { dropMessages = value; },
      render() {
        if (!dirty || closed || suspended) return;
        dirty = false; cursor = 0;
        // eslint-disable-next-line react-hooks/rules-of-hooks -- Isolated dispatcher drives the production hook.
        state = useTestSite(!preview && !brokerOnly, !peer && ownership.canWrite(), siteId, preview);
        const pendingLayouts = layouts; layouts = []; pendingLayouts.forEach(callback => callback());
        const pendingEffects = effects; effects = []; pendingEffects.forEach(callback => callback());
      },
      close() { if (closed) return; closed = true; slots.forEach(slot => slot?.cleanup?.()); releaseLock(); for (const [id, timer] of timers) if (timer.tab === tab) timers.delete(id); },
    };
    tabs.push(tab); return tab;
  }
  function runTimers() {
    for (const [id, timer] of [...timers]) {
      if (timer.tab.suspended || timer.due > now || !timers.has(id)) continue;
      if (timer.interval) timer.due = now + timer.interval; else timers.delete(id);
      timer.callback();
    }
  }
  async function pump() {
    for (let pass = 0; pass < 8; pass++) {
      tabs.forEach(tab => tab.render()); runTimers();
      for (let tick = 0; tick < 10; tick++) await Promise.resolve();
    }
    await new Promise(resolve => setTimeout(resolve, 2));
  }
  async function until(predicate) {
    // The real file gateway can take longer under a concurrently running suite.
    // Bound elapsed monotonic time rather than the number of scheduling turns.
    const deadline = performance.now() + 15000;
    do { await pump(); if (predicate()) return; } while (performance.now() < deadline);
    assert.fail(`Recovery did not settle: ${JSON.stringify(tabs.map(tab => ({ label: tab.state?.label, failure: tab.state?.failure, writable: tab.state?.writable, conflict: Boolean(tab.state?.syncConflict), saved: tab.state?.snapshot && navigationLabel(tab.state.snapshot.document), draft: tab.state?.draft && navigationLabel(tab.state.draft) })))}, requests: ${JSON.stringify(requests.map(request => ({ action: request.action, status: request.status, failure: request.failure })))}`);
  }
  const source = async () => JSON.parse(await readFile(path.join(root, "content/site.json"), "utf8"));
  const call = (token, action, extra = {}) => store.handle(token, { siteId, action, ...extra });
  t.after(async () => { tabs.forEach(tab => tab.close()); await store.close(); await rm(root, { recursive: true, force: true }); });
  return { open, until, pump, source, store, call, requests, initial, assets, root,
    lockHeld: () => lockHeld,
    advance(milliseconds) { now += milliseconds; }, expireDuringNextRender(callback) { expireRender = true; renderSideEffect = callback; },
    saves: () => requests.filter(request => request.action === "save"),
    async checkPreview() { const document = await source(); assert.match(await readFile(path.join(root, "dist/index.html"), "utf8"), new RegExp(revisionOf(document))); },
  };
}

for (const siteId of ["test", "test2"]) {
  test(`${siteId}: a peer's featured image is copied and saved only by its existing owner`, async t => {
    const f = await fixture(t, siteId);
    const owner = f.open(); await f.until(() => owner.state?.writable);
    const peer = f.open({ peer: true }); await f.until(() => peer.state?.writable);
    const bytes = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRz8AAAAASUVORK5CYII=", "base64");
    const id = "b7f9d7c0-86a0-466d-9672-12e56898e441";
    const name = siteImageName(id, createHash("sha256").update(bytes).digest("hex"), "image/png");
    f.assets.set(id, { id, name: "Selected.png", type: "image/png", blob: new Blob([bytes]) });
    const src = `/media/${name}`;
    assert.equal(peer.state.updateDraft(document => {
      document.documents[0].coverImage = { src, alt: "Chosen featured image" }; return document;
    }), true);
    peer.render(); f.advance(600);
    await f.until(() => f.saves().some(request => request.status === 200));
    assert.equal((await f.source()).documents[0].coverImage.src, src);
    assert.equal(f.saves().some(request => request.tab === peer), false);
    assert.deepEqual(f.saves().find(request => request.status === 200).featuredImages, [{ name, dataBase64: bytes.toString("base64") }]);
    assert.deepEqual(await readFile(path.join(f.root, "content/media", name)), bytes);
    assert.deepEqual(await readFile(path.join(f.root, "dist/media", name)), bytes);
    await f.until(() => owner.state.snapshot.document.documents[0].coverImage?.src === src);
    assert.equal(peer.state.draft.documents[0].coverImage.src, src);
  });
  test(`${siteId}: read-only preview activation loads and refreshes content without claiming or saving`, async t => {
    const f = await fixture(t, siteId); const tab = f.open({ preview: true });
    await f.until(() => Boolean(tab.state?.draft));
    assert.equal(tab.state.writable, false);
    assert.equal(tab.state.canSaveGlobalTemplates, false);
    assert.equal(editNavigation(tab.state, "Preview cannot edit"), false);
    assert.equal(f.requests.some(request => request.action === "claim" || request.action === "save"), false);
    const external = await f.store.connect(); await f.call(external.token, "claim");
    const changed = clone(external.document);
    changed.templates.sets.find(set => set.id === changed.siteNavigation.setId).navigation[0].label = "Fresh external menu";
    await f.call(external.token, "save", { baseRevision: external.revision, document: changed });
    f.advance(5001); tab.event("focus");
    await f.until(() => navigationLabel(tab.state.draft) === "Fresh external menu");
    assert.equal(tab.state.writable, false);
    assert.equal(f.requests.some(request => request.action === "claim" || request.action === "save"), false);
  });
  for (const suspension of ["released lease", "expired lease", "expired session"]) {
    test(`${siteId}: ${suspension} recovery retains an unsaved Navigation edit`, async t => {
      const f = await fixture(t, siteId); const tab = f.open(); await f.until(() => tab.state?.writable);
      assert.equal(editNavigation(tab.state, "Unsaved navigation"), true);
      tab.render(); tab.suspend({ pagehide: suspension === "released lease" });
      f.advance(suspension === "expired session" ? 130001 : 40001);
      await f.pump(); assert.equal(f.saves().length, 0);
      assert.equal(navigationLabel(await f.source()), "Home");
      tab.resume(); await f.until(() => tab.state.writable);
      assert.equal(navigationLabel(tab.state.draft), "Unsaved navigation");
      assert.equal(tab.confirms, 0, "authority recovery must not ask to discard the draft");
      f.advance(600); await f.until(() => tab.state.label === "Saved locally");
      assert.equal(navigationLabel(await f.source()), "Unsaved navigation");
      assert.equal(f.saves().filter(request => request.status === 200).length, 1);
      assert.ok(f.saves().every(request => [200, 401, 423].includes(request.status))); await f.checkPreview();
    });
  }

  for (const overlaps of [false, true]) {
    test(`${siteId}: live competing session ${overlaps ? "retains overlap for review" : "rebases independent edits"}`, async t => {
      const f = await fixture(t, siteId); const tab = f.open(); await f.until(() => tab.state?.writable);
      const originalSaved = clone(tab.state.snapshot);
      editNavigation(tab.state, "My unsaved menu"); tab.render(); tab.suspend({ pagehide: true }); await f.pump();
      const other = await f.store.connect(); await f.call(other.token, "claim");
      const remote = clone(other.document);
      if (overlaps) remote.templates.sets.find(set => set.id === remote.siteNavigation.setId).navigation[0].label = "Other session menu";
      else remote.documents[0].excerpt = "Independent other-session edit";
      await f.call(other.token, "save", { baseRevision: other.revision, document: remote });
      tab.resume(); await f.until(() => tab.state.label.includes("save handover"));
      assert.equal(tab.state.writable, false);
      assert.equal(navigationLabel(tab.state.draft), "My unsaved menu");
      assert.equal(f.saves().length, 0, "blocked tab must not send saves");
      assert.deepEqual(await f.source(), remote);
      await tab.state.exportDraft(); const exported = JSON.parse(await tab.exports.at(-1).text());
      assert.equal(navigationLabel(exported.draft), "My unsaved menu");
      assert.equal(exported.baseRevision, originalSaved.revision, "export must retain the original unsaved base");
      f.advance(1000); await f.pump();
      assert.equal(tab.state.writable, false, "another live lease must not be displaced by retries");
      await f.call(other.token, "release"); f.advance(1000);
      if (overlaps) {
        await f.until(() => Boolean(tab.state.syncConflict));
        assert.equal(navigationLabel(tab.state.draft), "My unsaved menu");
        assert.equal(navigationLabel(tab.state.syncConflict.remoteSnapshot), "Other session menu");
        assert.equal(navigationLabel(tab.state.syncConflict.baseSnapshot), "Home");
        assert.equal(f.saves().length, 0);
        await tab.state.resolveSyncConflict("mine");
      } else {
        await f.until(() => tab.state.writable);
        assert.equal(tab.state.draft.documents[0].excerpt, "Independent other-session edit");
        assert.equal(navigationLabel(tab.state.draft), "My unsaved menu");
        await tab.state.exportDraft();
        assert.equal(JSON.parse(await tab.exports.at(-1).text()).baseRevision, revisionOf(remote), "a reconciled export must advance to the remote saved base");
        f.advance(600);
      }
      await f.until(() => tab.state.label === "Saved locally");
      const saved = await f.source(); assert.equal(navigationLabel(saved), "My unsaved menu");
      if (!overlaps) assert.equal(saved.documents[0].excerpt, "Independent other-session edit");
      assert.equal(tab.confirms, 0); await f.checkPreview();
    });
  }

  test(`${siteId}: a peer retains unsaved input while its saving tab is suspended`, async t => {
    const f = await fixture(t, siteId); const owner = f.open(); await f.until(() => owner.state?.writable);
    const peer = f.open({ peer: true }); await f.until(() => peer.state?.writable);
    owner.suspend({ pagehide: true }); await f.pump();
    assert.equal(editNavigation(peer.state, "Peer unsaved menu"), true); peer.render();
    const submitted = peer.state.flush().catch(error => error);
    await f.pump(); f.advance(40001); await f.pump();
    assert.equal(navigationLabel(peer.state.draft), "Peer unsaved menu");
    assert.equal(navigationLabel(await f.source()), "Home");
    assert.equal(f.saves().length, 0, "the peer must never bypass its suspended saving tab");
    owner.resume(); await f.until(() => owner.state.writable && Boolean(peer.state.syncConflict));
    assert.equal(navigationLabel(peer.state.draft), "Peer unsaved menu");
    assert.equal(f.saves().length, 0, "a replacement session cannot infer whether the timed-out request was accepted");
    await peer.state.resolveSyncConflict("mine");
    await f.until(() => peer.state.label.includes("Synced with another"));
    assert.match((await submitted).message, /stopped responding/, "the timed-out submission must retain its input until a real receipt arrives");
    assert.equal(navigationLabel(await f.source()), "Peer unsaved menu");
    assert.equal(f.saves().filter(request => request.status === 200).length, 1);
    assert.ok(f.saves().every(request => request.tab === owner), "only the lock owner writes files");
    assert.equal(peer.confirms, 0); await f.checkPreview();
  });

  test(`${siteId}: a save rejected after rendering retains the pending edit until authority is renewed`, async t => {
    const f = await fixture(t, siteId); const tab = f.open(); await f.until(() => tab.state?.writable);
    editNavigation(tab.state, "Initial rejected edit"); tab.render();
    f.expireDuringNextRender(() => assert.equal(editNavigation(tab.state, "Retained after rejection"), true));
    await assert.rejects(tab.state.flush(), /Another session owns/);
    assert.equal(navigationLabel(await f.source()), "Home");
    await f.until(() => tab.state.writable);
    assert.equal(navigationLabel(tab.state.draft), "Retained after rejection");
    f.advance(600); await f.until(() => tab.state.label === "Saved locally");
    assert.equal(navigationLabel(await f.source()), "Retained after rejection");
    assert.equal(f.saves().length, 2, "one rejected request followed by one reconciled save");
    await f.checkPreview();
  });

  test(`${siteId}: a peer recovery export uses its current saved base after earlier commits`, async t => {
    const f = await fixture(t, siteId); const owner = f.open(); await f.until(() => owner.state?.writable);
    const peer = f.open({ peer: true }); await f.until(() => peer.state?.writable);
    editNavigation(owner.state, "Committed menu"); owner.render(); await owner.state.flush();
    await f.until(() => navigationLabel(peer.state.snapshot.document) === "Committed menu");
    const saved = await f.source();
    assert.equal(editNavigation(peer.state, "New peer input"), true); peer.render();
    await peer.state.exportDraft(); const exported = JSON.parse(await peer.exports.at(-1).text());
    assert.equal(exported.baseRevision, revisionOf(saved));
    assert.equal(navigationLabel(exported.draft), "New peer input");
    assert.equal(navigationLabel(await f.source()), "Committed menu", "export must not save the new draft");
  });

  test(`${siteId}: a lost save response keeps the draft paused and never replays the uncertain write`, async t => {
    const f = await fixture(t, siteId); const tab = f.open(); await f.until(() => tab.state?.writable);
    editNavigation(tab.state, "Saved but unacknowledged"); tab.render(); tab.loseNextSaveResponse();
    await assert.rejects(tab.state.flush(), /response was lost/);
    await f.until(() => Boolean(tab.state.failure));
    assert.equal(navigationLabel(tab.state.draft), "Saved but unacknowledged");
    assert.equal(navigationLabel(await f.source()), "Saved but unacknowledged");
    for (let pass = 0; pass < 3; pass++) { f.advance(10000); tab.event("focus"); await f.pump(); }
    assert.equal(tab.state.writable, false); assert.equal(f.saves().length, 1);
    await tab.state.exportDraft(); assert.equal(navigationLabel(JSON.parse(await tab.exports.at(-1).text()).draft), "Saved but unacknowledged");
  });
}

for (const siteId of ["test", "test2"]) {
  for (const peer of [false, true]) {
    test(`${siteId}: explicit reconnect preserves a ${peer ? "peer" : "primary"} draft and saves it once`, async t => {
      const f = await fixture(t, siteId);
      const owner = f.open(); await f.until(() => owner.state?.writable);
      const tab = peer ? f.open({ peer: true }) : owner;
      await f.until(() => tab.state?.writable);
      assert.equal(editNavigation(tab.state, "Retained through Reconnect"), true); tab.render();
      await tab.state.reconnect();
      await f.until(() => tab.state.writable);
      assert.equal(navigationLabel(tab.state.draft), "Retained through Reconnect");
      assert.equal(tab.confirms, 0);
      f.advance(600); await f.until(() => f.saves().some(request => request.status === 200));
      await f.until(() => navigationLabel(owner.state.snapshot.document) === "Retained through Reconnect");
      assert.equal(navigationLabel(await f.source()), "Retained through Reconnect");
      assert.equal(f.saves().length, 1);
      assert.ok(f.saves().every(request => request.tab === owner));
      await f.checkPreview();
    });
  }

  test(`${siteId}: explicit reconnect reads back a lost save receipt without saving twice`, async t => {
    const f = await fixture(t, siteId); const tab = f.open(); await f.until(() => tab.state?.writable);
    editNavigation(tab.state, "Already saved"); tab.render(); tab.loseNextSaveResponse();
    await assert.rejects(tab.state.flush(), /response was lost/);
    await f.until(() => Boolean(tab.state.failure));
    await tab.state.reconnect(); await f.until(() => tab.state.writable);
    f.advance(600); await f.pump();
    assert.equal(navigationLabel(tab.state.draft), "Already saved");
    assert.equal(navigationLabel(await f.source()), "Already saved");
    assert.equal(f.saves().length, 1);
    assert.equal(tab.confirms, 0);
  });

  test(`${siteId}: peer reconnect retains receipts and does not undo another tab's revert`, async t => {
    const f = await fixture(t, siteId); const owner = f.open(); await f.until(() => owner.state?.writable);
    const peer = f.open({ peer: true }); await f.until(() => peer.state?.writable);
    const original = navigationLabel(peer.state.draft);
    peer.dropSyncMessages(true);
    editNavigation(peer.state, "Saved without acknowledgement"); peer.render();
    const submission = peer.state.flush().catch(error => error);
    await f.until(() => f.saves().some(request => request.status === 200));
    await f.until(() => navigationLabel(owner.state.draft) === "Saved without acknowledgement");
    editNavigation(owner.state, original); owner.render(); await owner.state.flush();
    assert.equal(navigationLabel(await f.source()), original);
    f.advance(20000); await f.pump(); await submission;
    peer.dropSyncMessages(false);
    await peer.state.reconnect(); await f.pump();
    f.advance(5000); await f.pump(); peer.event("focus");
    await f.until(() => peer.state.writable);
    f.advance(600); await f.pump();
    assert.equal(navigationLabel(peer.state.draft), original);
    assert.equal(navigationLabel(await f.source()), original);
    assert.equal(f.saves().length, 2, "reconnecting must not replay an already accepted edit");
  });

  test(`${siteId}: a non-editor owner wakes its broker and saves peer edits`, async t => {
    const f = await fixture(t, siteId); const owner = f.open({ brokerOnly: true });
    await f.pump();
    assert.equal(f.requests.length, 0, "an unused broker must not open site sessions");
    const peer = f.open({ peer: true }); await f.until(() => peer.state?.writable);
    assert.equal(owner.state.writable, false, "the background broker is not an editor");
    assert.equal(editNavigation(peer.state, "Saved through Design owner"), true); peer.render();
    await peer.state.flush(); await f.until(() => navigationLabel(owner.state.snapshot.document) === "Saved through Design owner");
    assert.equal(navigationLabel(await f.source()), "Saved through Design owner");
    assert.ok(f.saves().every(request => request.tab === owner));
  });

  test(`${siteId}: uncertain peer save requires review after the owner changes and reverts`, async t => {
    const f = await fixture(t, siteId); const owner = f.open(); await f.until(() => owner.state?.writable);
    const peer = f.open({ peer: true }); await f.until(() => peer.state?.writable);
    const original = navigationLabel(peer.state.draft); peer.dropSyncMessages(true);
    editNavigation(peer.state, "Unacknowledged peer edit"); peer.render();
    const submission = peer.state.flush().catch(error => error);
    await f.until(() => navigationLabel(owner.state.draft) === "Unacknowledged peer edit");
    editNavigation(owner.state, original); owner.render(); await owner.state.flush();
    f.advance(20000); await f.pump(); await submission;
    owner.close(); await f.until(() => !f.lockHeld()); peer.dropSyncMessages(false);
    const replacement = f.open(); await f.until(() => replacement.state?.writable);
    await peer.state.reconnect(); await f.pump(); f.advance(5000); await f.pump(); peer.event("focus");
    await f.until(() => Boolean(peer.state.syncConflict));
    assert.equal(navigationLabel(peer.state.draft), "Unacknowledged peer edit");
    assert.equal(navigationLabel(await f.source()), original);
    assert.equal(f.saves().length, 2);
    await peer.state.resolveSyncConflict("theirs"); await f.pump();
    assert.equal(navigationLabel(peer.state.draft), original);
    assert.equal(f.saves().length, 2);
  });

  test(`${siteId}: a lost gateway response followed by a remote revert requires review`, async t => {
    const f = await fixture(t, siteId); const tab = f.open(); await f.until(() => tab.state?.writable);
    const original = navigationLabel(tab.state.draft);
    editNavigation(tab.state, "Unacknowledged gateway edit"); tab.render(); tab.loseNextSaveResponse();
    await assert.rejects(tab.state.flush(), /response was lost/);
    tab.suspend({ pagehide: true }); await f.pump();
    const other = await f.store.connect(); await f.call(other.token, "claim");
    const reverted = clone(other.document);
    reverted.templates.sets.find(set => set.id === reverted.siteNavigation.setId).navigation[0].label = original;
    await f.call(other.token, "save", { baseRevision: other.revision, document: reverted });
    await f.call(other.token, "release"); tab.resume();
    await f.until(() => Boolean(tab.state.syncConflict));
    assert.equal(navigationLabel(tab.state.draft), "Unacknowledged gateway edit");
    assert.equal(navigationLabel(await f.source()), original);
    assert.equal(f.saves().length, 1);
    await tab.state.resolveSyncConflict("theirs"); await f.pump();
    assert.equal(navigationLabel(tab.state.draft), original);
    assert.equal(f.saves().length, 1);
  });
}
