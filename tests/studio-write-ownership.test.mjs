import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";

const require = createRequire(import.meta.url);
const root = new URL("../", import.meta.url).pathname;
function modules(globals = {}, overrides = {}) {
  const cache = new Map();
  return function load(file) {
    const filename = path.resolve(root, file);
    if (cache.has(filename)) return cache.get(filename);
    const exports = {}; cache.set(filename, exports);
    const source = ts.transpileModule(readFileSync(filename, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
    vm.runInNewContext(source, { exports, AggregateError, Error, Blob, File, crypto, structuredClone, queueMicrotask, ...globals, require(specifier) {
      if (specifier in overrides) return overrides[specifier];
      if (!specifier.startsWith(".")) return require(specifier);
      return load(path.resolve(path.dirname(filename), /\.(mjs|ts)$/.test(specifier) ? specifier : `${specifier}.ts`));
    } }, { filename });
    return exports;
  };
}
const tick = async () => { for (let index = 0; index < 12; index++) await Promise.resolve(); };
function locks() {
  let held = false;
  return { async request(_name, options, callback) {
    assert.equal(options.ifAvailable, true);
    if (held) return callback(null);
    held = true;
    try { return await callback({ name: "test" }); } finally { held = false; }
  }, held: () => held };
}
async function own(coordinator, manager, readable = true) {
  const release = coordinator.acquire((token) => coordinator.loaded(token, readable), manager);
  await tick(); return release;
}

async function publicationFixture(raw = null, failWrite = false) {
  let writes = 0;
  const feedback = [];
  const storage = {
    getItem: () => raw,
    setItem(_key, value) { writes++; if (failWrite) throw Error("Storage unavailable"); raw = value; },
  };
  const load = modules({ window: { localStorage: storage } }, {
    react: { useState: () => [null, (message) => feedback.push(message)] },
  });
  await own(load("app/studio/write-ownership.ts").studioWriteOwnership, locks());
  const publication = load("app/content/local-publishing.ts");
  const document = structuredClone(load("app/studio/editor-model.ts").initialStudioWorkspace.documents.find((item) => item.kind === "post"));
  return { load, publication, document, feedback, raw: () => raw, writes: () => writes };
}

test("publication mutations preserve exact unreadable bytes without any write", async () => {
  const fixture = await publicationFixture();
  const article = fixture.publication.toLocallyPublishedArticle(fixture.document);
  const malformed = ["", "{private broken bytes", "null", "[]", JSON.stringify({ version: 2, posts: [] }),
    JSON.stringify({ version: 1, posts: {} }), JSON.stringify({ version: 1, posts: [null] }),
    JSON.stringify({ version: 1, posts: [{ ...article, publishedAt: "not a date" }] }),
    JSON.stringify({ version: 1, posts: [{ ...article, blocks: [{ id: "bad", type: "paragraph", text: 42 }] }] }),
    JSON.stringify({ version: 1, posts: [{ ...article, mediaIds: [42] }] })];
  for (const raw of malformed) {
    const f = await publicationFixture(raw);
    for (const action of [() => f.publication.publishDocumentLocally(f.document), () => f.publication.unpublishDocumentLocally(f.document.id)]) {
      assert.throws(action, (error) => error instanceof f.publication.UnreadablePublicationsError && /Restore a valid backup/.test(error.message));
      assert.equal(f.raw(), raw); assert.equal(f.writes(), 0);
    }
  }
});

test("valid and absent publication stores retain, replace and unpublish posts", async () => {
  for (const raw of [null, JSON.stringify({ version: 1, posts: [] })]) {
    const f = await publicationFixture(raw);
    f.publication.publishDocumentLocally(f.document);
    const another = { ...f.document, id: "another", slug: "another-post", title: "Another post" };
    f.publication.publishDocumentLocally(another);
    f.publication.publishDocumentLocally({ ...f.document, title: "Updated title" });
    const posts = JSON.parse(f.raw()).posts;
    assert.equal(posts.length, 2);
    assert.equal(posts.find((post) => post.localDocumentId === f.document.id).title, "Updated title");
    assert.equal(posts.find((post) => post.localDocumentId === "another").title, "Another post");
    f.publication.unpublishDocumentLocally(f.document.id);
    assert.deepEqual(JSON.parse(f.raw()).posts.map((post) => post.localDocumentId), ["another"]);
  }
});

test("publish hook preserves document status and save label after corrupt-store or write failure", async () => {
  for (const [raw, failWrite] of [["{unreadable-private-value", false], [null, true]]) {
    for (const action of ["publish", "unpublish"]) {
      const f = await publicationFixture(raw, failWrite);
      const document = { ...f.document, status: action === "publish" ? "draft" : "published" };
      let updates = 0; let labels = 0;
      const hook = f.load("app/studio/use-studio-publishing.ts").useStudioPublishing({
        activeDocument: document, workspace: { documents: [document] }, reservedSlugs: [],
        updateActiveDocument() { updates++; }, setSaveLabel() { labels++; },
      });
      assert.equal(hook[action](), false);
      assert.equal(updates, 0); assert.equal(labels, 0); assert.equal(f.raw(), raw);
      assert.equal(f.writes(), failWrite ? 1 : 0);
      assert.match(f.feedback.at(-1), failWrite ? /could not/ : /Restore a valid backup/);
      assert.equal(f.feedback.at(-1).includes("unreadable-private-value"), false);
    }
  }
});

test("two tabs have one writer; losing and unsupported tabs cannot mutate any persistence surface", async () => {
  const manager = locks();
  let writes = 0; let opens = 0;
  const browser = { localStorage: { getItem: () => null, setItem: () => writes++ }, indexedDB: { open: () => { opens++; throw Error("unexpected open"); } } };
  const first = modules({ window: browser }); const second = modules({ window: browser });
  const a = first("app/studio/write-ownership.ts").studioWriteOwnership;
  const b = second("app/studio/write-ownership.ts").studioWriteOwnership;
  const close = await own(a, manager); await own(b, manager);
  assert.equal(a.canWrite(), true); assert.equal(b.canWrite(), false);
  const workspace = second("app/studio/editor-model.ts").initialStudioWorkspace;
  assert.throws(() => second("app/studio/workspace-repository.ts").browserWorkspaceRepository.save(workspace), /read-only/);
  const publication = second("app/content/local-publishing.ts");
  assert.throws(() => publication.publishDocumentLocally(workspace.documents[0]), /read-only/);
  assert.throws(() => publication.unpublishDocumentLocally("id"), /read-only/);
  const media = second("app/studio/media-store.ts");
  for (const operation of [() => media.addMediaFiles([], null), () => media.createMediaFolder("x", null), () => media.updateMediaAsset("x", {}), () => media.renameMediaFolder("x", "y"), () => media.deleteMediaAsset("x"), () => media.deleteMediaFolder("x"), () => media.replaceMediaLibrary([], [])]) await assert.rejects(operation, /read-only/);
  await assert.rejects(() => b.restore(async () => writes++));
  assert.equal(writes, 0); assert.equal(opens, 0);
  close(); await tick(); await own(b, manager); assert.equal(b.canWrite(), true);
  for (const unavailable of [undefined, { request: async () => { throw Error("denied"); } }, { request: () => { throw Error("denied"); } }]) {
    const c = new (first("app/studio/write-ownership.ts").StudioWriteOwnership)();
    c.acquire(() => assert.fail("must not acquire"), unavailable); await tick();
    assert.equal(c.canWrite(), false); assert.equal(c.getState(), "unavailable");
  }
});

test("restore pauses writes synchronously, drains media and retains lock through unmount", async () => {
  const { StudioWriteOwnership } = modules()("app/studio/write-ownership.ts");
  const manager = locks(); const owner = new StudioWriteOwnership(); const next = new StudioWriteOwnership();
  const release = await own(owner, manager);
  let finishMedia; const media = owner.write(() => new Promise((resolve) => { finishMedia = resolve; }));
  await tick();
  let capture = false; let finishRestore;
  const restore = owner.restore(async (permit) => {
    capture = true;
    await owner.write(async () => {}, permit);
    await new Promise((resolve) => { finishRestore = resolve; });
  });
  assert.equal(owner.canWrite(), false);
  await assert.rejects(() => owner.write(async () => assert.fail("new media must not start")));
  await tick(); assert.equal(capture, false);
  finishMedia(); await media; await tick(); assert.equal(capture, true);
  release(); await tick(); assert.equal(manager.held(), true);
  await own(next, manager); assert.equal(next.canWrite(), false);
  finishRestore(); await restore; await tick(); assert.equal(manager.held(), false);
  await own(next, manager); assert.equal(next.canWrite(), true);
});

test("corrupt owner may restore; success and incomplete rollback remain blocked", async () => {
  const { StudioWriteOwnership } = modules()("app/studio/write-ownership.ts");
  for (const outcome of ["success", "rollback", "failed-rollback"]) {
    const owner = new StudioWriteOwnership(); await own(owner, locks(), false);
    assert.equal(owner.canWrite(), false);
    const restoring = owner.restore(async () => {
      if (outcome === "rollback") throw Error("restored exact original");
      if (outcome === "failed-rollback") throw new AggregateError([], "rollback incomplete");
    });
    if (outcome !== "success") await assert.rejects(restoring); else await restoring;
    assert.equal(owner.getState(), outcome === "rollback" ? "unreadable" : "blocked");
  }
});

test("cancelled acquisition cannot request a stale writer lock during effect replay", async () => {
  const { StudioWriteOwnership } = modules()("app/studio/write-ownership.ts");
  let requests = 0;
  const manager = { async request(_name, _options, callback) { requests++; return callback({ name: "test" }); } };
  const owner = new StudioWriteOwnership();
  const cancelled = owner.acquire(() => assert.fail("stale load"), manager); cancelled();
  await tick();
  assert.equal(requests, 0);
  assert.equal(owner.canWrite(), false);
  const release = await own(owner, manager);
  assert.equal(requests, 1); assert.equal(owner.canWrite(), true);
  release();
});

function indexedDBFixture(mode) {
  const state = { closed: 0, opened: 0, writes: 0, aborted: 0 };
  const database = {
    close() { state.closed++; },
    transaction() {
      const transaction = { error: null, abort() { state.aborted++; queueMicrotask(() => transaction.onabort?.()); } };
      let scheduled = false;
      const result = (value) => {
        if (mode === "throw") throw Error("synchronous operation failure");
        const request = { result: value, error: null };
        queueMicrotask(() => {
          if (mode === "request-error") { request.error = Error("request failed"); request.onerror?.(); transaction.onerror?.(); return; }
          request.onsuccess?.();
        });
        if (!scheduled) {
          scheduled = true;
          queueMicrotask(() => queueMicrotask(() => {
            if (mode === "abort") transaction.onabort?.();
            else if (mode !== "request-error") transaction.oncomplete?.();
          }));
        }
        return request;
      };
      transaction.objectStore = () => ({ get: () => result({ id: "asset", name: "sample" }), getAll: () => result([]), put: () => { state.writes++; return result("saved"); }, delete: () => { state.writes++; return result(undefined); }, clear: () => { state.writes++; return result(undefined); } });
      return transaction;
    },
  };
  return { state, indexedDB: { open() { state.opened++; const request = { result: database }; queueMicrotask(() => request.onsuccess?.()); return request; } } };
}
for (const operation of ["folder", "upload", "replace", "read"]) {
  for (const mode of ["success", "abort", "request-error", "throw"]) test(`IndexedDB ${operation}: ${mode} settles on transaction and always closes`, async () => {
    const database = indexedDBFixture(mode);
    const load = modules({ window: { indexedDB: database.indexedDB } });
    await own(load("app/studio/write-ownership.ts").studioWriteOwnership, locks());
    const media = load("app/studio/media-store.ts");
    const promise = operation === "folder" ? media.createMediaFolder("folder", null)
      : operation === "upload" ? media.addMediaFiles([new File(["sample"], "sample.txt")], null)
      : operation === "replace" ? media.replaceMediaLibrary([], []) : media.getMediaAsset("asset");
    if (mode === "success") await promise;
    else await assert.rejects(promise);
    assert.equal(database.state.closed, 1);
    if (mode === "throw") assert.equal(database.state.aborted, 1);
  });
}

function hookTab(storage, manager) {
  const slots = []; let index = 0; let dirty = true; let effects = []; let result;
  const react = {
    useState(initial) {
      const id = index++;
      if (!(id in slots)) slots[id] = typeof initial === "function" ? initial() : initial;
      return [slots[id], (update) => {
        const next = typeof update === "function" ? update(slots[id]) : update;
        if (!Object.is(next, slots[id])) { slots[id] = next; dirty = true; }
      }];
    },
    useRef(initial) { const id = index++; return slots[id] ??= { current: initial }; },
    useEffect(effect, deps) {
      const id = index++; const previous = slots[id];
      if (!previous || deps.some((value, i) => !Object.is(value, previous.deps[i]))) {
        slots[id] = { deps };
        effects.push(() => { previous?.cleanup?.(); slots[id].cleanup = effect(); });
      }
    },
  };
  const load = modules({ window: { localStorage: storage }, navigator: { locks: manager } }, { react });
  const useWorkspace = load("app/studio/use-studio-workspace.ts").useStudioWorkspace;
  return {
    load,
    async flush() {
      for (let pass = 0; pass < 10; pass++) {
        if (dirty) {
          dirty = false; index = 0;
          // eslint-disable-next-line react-hooks/rules-of-hooks -- Isolated dispatcher drives the actual hook.
          result = useWorkspace();
          const pending = effects; effects = []; pending.forEach((effect) => effect());
        }
        await tick();
        if (!dirty) return result;
      }
      assert.fail("hook did not settle");
    },
    close() { slots.forEach((slot) => slot?.cleanup?.()); },
  };
}

test("read-only tab can browse; ownership retry reloads fresh content and old closures cannot save", async () => {
  const manager = locks(); let raw = null; let writes = 0;
  const storage = { getItem: () => raw, setItem: (_key, value) => { raw = value; writes++; } };
  const first = hookTab(storage, manager); const second = hookTab(storage, manager);
  const owner = await first.flush(); const stale = await second.flush();
  assert.equal(owner.writable, true); assert.equal(stale.writable, false);
  const before = writes;
  const otherId = stale.workspace.documents.find((document) => document.id !== stale.workspace.activeDocumentId).id;
  stale.setActiveDocument(otherId);
  const browsing = await second.flush();
  assert.equal(browsing.workspace.activeDocumentId, otherId); assert.equal(writes, before);
  owner.updateActiveField("title", "Fresh owner title"); await first.flush();
  const latest = raw;
  stale.commit((workspace) => ({ ...workspace, documents: [] })); await second.flush();
  assert.equal(raw, latest);
  first.close(); await tick();
  browsing.retryEditing();
  const acquired = await second.flush();
  assert.equal(acquired.writable, true);
  assert.ok(acquired.ownershipGeneration > stale.ownershipGeneration);
  assert.ok(acquired.workspace.documents.some((document) => document.title === "Fresh owner title"));
  const acquiredRaw = raw;
  owner.updateActiveField("title", "Old owner closure");
  stale.commit((workspace) => ({ ...workspace, documents: [] }));
  await second.flush();
  assert.equal(raw, acquiredRaw);
  second.close(); await tick();
});

test("missing parent folders are rejected before upload, child creation or file movement", async () => {
  let writes = 0;
  const database = { close() {}, transaction() {
    const transaction = { abort() {}, objectStore: () => ({
      get() { const request = { result: undefined }; queueMicrotask(() => { request.onsuccess?.(); transaction.oncomplete?.(); }); return request; },
      put() { writes++; assert.fail("must not create an orphan"); },
    }) };
    return transaction;
  } };
  const load = modules({ window: { indexedDB: { open() { const request = { result: database }; queueMicrotask(() => request.onsuccess?.()); return request; } } } });
  await own(load("app/studio/write-ownership.ts").studioWriteOwnership, locks());
  const media = load("app/studio/media-store.ts");
  await assert.rejects(() => media.addMediaFiles([new File(["x"], "x.txt")], "deleted-folder"), /no longer available/);
  await assert.rejects(() => media.createMediaFolder("child", "deleted-folder"), /no longer available/);
  await assert.rejects(() => media.updateMediaAsset("existing", { folderId: "deleted-folder" }), /no longer available/);
  assert.equal(writes, 0);
});

function mediaHarness(initialProps, library) {
  const slots = []; let index = 0; let dirty = true; let effects = []; let tree; let props = initialProps;
  const calls = []; const focusCalls = []; let rejectMutations = false;
  const react = {
    useState(initial) {
      const id = index++;
      if (!(id in slots)) slots[id] = typeof initial === "function" ? initial() : initial;
      return [slots[id], (update) => { const next = typeof update === "function" ? update(slots[id]) : update; if (!Object.is(next, slots[id])) { slots[id] = next; dirty = true; } }];
    },
    useRef(initial) { const id = index++; return slots[id] ??= { current: initial }; },
    useMemo(fn, deps) { const id = index++; if (!slots[id] || deps.some((value, i) => value !== slots[id].deps[i])) slots[id] = { value: fn(), deps }; return slots[id].value; },
    useEffect(effect, deps) {
      const id = index++; const prior = slots[id];
      if (!prior || deps.some((value, i) => value !== prior.deps[i])) { slots[id] = { deps }; effects.push(() => { prior?.cleanup?.(); slots[id].cleanup = effect(); }); }
    },
  };
  react.useLayoutEffect = react.useEffect;
  const prepareMediaFolderMove = modules()("app/studio/media-store.ts").prepareMediaFolderMove;
  const mutations = Object.fromEntries(["moveMediaFolder", "addMediaFiles", "createMediaFolder", "updateMediaAsset", "deleteMediaAsset", "renameMediaFolder", "deleteMediaFolder"].map((name) => [name, async (...args) => {
    calls.push({ name, args });
    if (rejectMutations) throw Error("Synthetic storage failure");
    if (name === "createMediaFolder") {
      const folder = { id: "created-folder", name: args[0], parentId: args[1], createdAt: "2026-09-02T00:00:00Z" };
      library.folders.push(folder);
      return folder;
    }
    if (name === "moveMediaFolder") {
      const next = prepareMediaFolderMove(library.folders, args[0], args[1]);
      Object.assign(library.folders.find((item) => item.id === args[0]), next);
    }
    if (name === "renameMediaFolder") {
      const folder = library.folders.find((item) => item.id === args[0]);
      if (folder) folder.name = args[1];
    }
  }]));
  const load = modules({ requestAnimationFrame: (callback) => callback(), document: { addEventListener() {}, removeEventListener() {} }, window: { innerWidth: 1200, innerHeight: 800, prompt: () => "Folder", confirm: () => true }, URL: { createObjectURL: () => "blob:synthetic", revokeObjectURL() {} } }, { react, "./studio-icons": { StudioIcon: () => null }, "./media-store": { prepareMediaFolderMove, listMediaLibrary: async () => structuredClone(library), ...mutations } });
  const Component = load("app/studio/media-manager.tsx").MediaManager;
  return {
    calls, focusCalls, fail() { rejectMutations = true; },
    async flush() {
      for (let pass = 0; pass < 12; pass++) {
        if (dirty) { dirty = false; index = 0; tree = Component(props); for (const node of descendants(tree)) { if (node.type === "input" && node.props.className?.startsWith("media-inline-name")) node.props.ref.current = { focus() { focusCalls.push("focus"); }, select() { focusCalls.push("select-all"); } }; } const pending = effects; effects = []; pending.forEach((effect) => effect()); }
        await tick(); if (!dirty) return tree;
      }
      assert.fail("media component did not settle");
    },
    props(next) { props = { ...props, ...next }; dirty = true; },
    close() { slots.forEach((slot) => slot?.cleanup?.()); },
  };
}
function descendants(node) {
  if (!node || typeof node !== "object") return [];
  if (Array.isArray(node)) return node.flatMap(descendants);
  return [node, ...descendants(node.props?.children)];
}
function textOf(node) {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join("");
  return node?.props ? textOf(node.props.children) : "";
}
const findButton = (tree, label) => descendants(tree).find((node) => node.type === "button" && textOf(node) === label);
const sampleMedia = () => ({ assets: [{ id: "image", name: "Original", folderId: null, type: "image/png", size: 1, blob: new Blob(["x"]), createdAt: "2026-09-01T00:00:00Z", updatedAt: "2026-09-01T00:00:00Z", altText: "Original alternative", caption: "" }], folders: [{ id: "folder", name: "Folder F", parentId: null, createdAt: "2026-09-01T00:00:00Z" }] });

test("read-only media exposes browsing/downloads but disables every mutation and metadata edit", async () => {
  const h = mediaHarness({ writable: false, targetLabel: "Post", onInsertImage() {} }, sampleMedia());
  let tree = await h.flush();
  assert.equal(findButton(tree, "Folder").props.disabled, true);
  assert.equal(findButton(tree, "Upload files").props.disabled, true);
  const asset = descendants(tree).find((node) => node.type === "button" && node.props.className?.includes("media-file-card"));
  asset.props.onClick(); tree = await h.flush();
  const name = descendants(tree).find((node) => node.type === "input" && node.props.value === "Original");
  assert.equal(name.props.disabled, true);
  name.props.onChange({ target: { value: "Pretend save" } }); tree = await h.flush();
  assert.ok(descendants(tree).some((node) => node.type === "input" && node.props.value === "Original"));
  for (const label of ["Delete file", "Insert into Post"]) assert.equal(findButton(tree, label).props.disabled, true);
  assert.notEqual(findButton(tree, "Download").props.disabled, true);
  await findButton(tree, "Folder").props.onClick(); await h.flush();
  assert.deepEqual(h.calls, []);
  h.close();
});

test("the Folder action creates and selects an editable local folder in the current folder", async () => {
  const h = mediaHarness({ writable: true, targetLabel: "Post", onInsertImage() {} }, sampleMedia());
  let tree = await h.flush();
  assert.equal(findButton(tree, "Folder").props.disabled, false);

  const existingFolder = descendants(tree).find((node) => node.type === "button" && node.props.className?.includes("media-folder-card"));
  existingFolder.props.onDoubleClick();
  tree = await h.flush();
  await findButton(tree, "Folder").props.onClick();
  tree = await h.flush();
  assert.deepEqual(h.calls, [{ name: "createMediaFolder", args: ["Untitled folder", "folder"] }]);
  const name = descendants(tree).find((node) => node.type === "input" && node.props.value === "Untitled folder");
  name.props.onChange({ target: { value: "Nested folder" } });
  tree = await h.flush();
  await name.props.onBlur({ target: { value: "Nested folder" } });
  tree = await h.flush();

  assert.deepEqual(h.calls, [
    { name: "createMediaFolder", args: ["Untitled folder", "folder"] },
    { name: "renameMediaFolder", args: ["created-folder", "Nested folder"] },
  ]);
  assert.match(textOf(tree), /Folder renamed/);
  h.close();
});

test("media failure restores canonical metadata, clears busy state and handles upload rejection", async () => {
  const h = mediaHarness({ writable: true, targetLabel: "Post", onInsertImage() {} }, sampleMedia());
  let tree = await h.flush(); h.fail();
  await findButton(tree, "Folder").props.onClick(); tree = await h.flush();
  assert.match(textOf(tree), /Synthetic storage failure/);
  assert.equal(findButton(tree, "Folder").props.disabled, false);
  const fileInput = descendants(tree).find((node) => node.type === "input" && node.props.type === "file");
  fileInput.props.ref.current = { value: "selected" };
  fileInput.props.onChange({ target: { files: [new File(["x"], "x.png")] } });
  tree = await h.flush();
  assert.equal(fileInput.props.ref.current.value, "");
  assert.equal(findButton(tree, "Upload files").props.disabled, false);
  descendants(tree).find((node) => node.type === "button" && node.props.className?.includes("media-file-card")).props.onClick(); tree = await h.flush();
  const name = descendants(tree).find((node) => node.type === "input" && node.props.value === "Original");
  name.props.onChange({ target: { value: "Unsaved" } }); tree = await h.flush();
  descendants(tree).find((node) => node.type === "input" && node.props.value === "Unsaved").props.onBlur({ target: { value: "Unsaved" } });
  tree = await h.flush();
  assert.ok(descendants(tree).some((node) => node.type === "input" && node.props.value === "Original"));
  assert.match(textOf(tree), /Synthetic storage failure/);
  h.close();
});

test("takeover remounts Files at root before enabling writes and cannot reuse an old folder callback", async () => {
  const source = readFileSync(path.join(root, "app/studio/studio-prototype.tsx"), "utf8");
  assert.match(source, /<MediaManager\s+key=\{ownershipGeneration\}\s+writable=\{writable\}/);
  const old = mediaHarness({ writable: false, targetLabel: "Post", onInsertImage() {} }, sampleMedia());
  let tree = await old.flush();
  descendants(tree).find((node) => node.type === "button" && node.props.className?.includes("media-folder-card")).props.onDoubleClick();
  tree = await old.flush(); const staleUpload = descendants(tree).find((node) => node.type === "input" && node.props.type === "file").props.onChange;
  old.close();
  const fresh = mediaHarness({ writable: true, targetLabel: "Post", onInsertImage() {} }, { assets: [], folders: [] });
  tree = await fresh.flush();
  staleUpload({ target: { files: [new File(["x"], "old.txt")] } }); await old.flush();
  assert.deepEqual(old.calls, []);
  const upload = descendants(tree).find((node) => node.type === "input" && node.props.type === "file");
  upload.props.onChange({ target: { files: [new File(["x"], "fresh.txt")] } }); await fresh.flush();
  assert.equal(fresh.calls[0].name, "addMediaFiles"); assert.equal(fresh.calls[0].args[1], null);
  fresh.close();
});


test("empty media entries clear file and folder selection without intercepting cards", async () => {
  const h = mediaHarness({ writable: true, targetLabel: "Post", onInsertImage() {} }, sampleMedia());
  let tree = await h.flush();
  for (const cardClass of ["media-file-card", "media-folder-card"]) {
    const card = descendants(tree).find((node) => node.type === "button" && node.props.className?.includes(cardClass));
    card.props.onClick();
    tree = await h.flush();
    assert.ok(descendants(tree).some((node) => node.props?.className?.includes(`${cardClass} is-selected`)));
    const content = descendants(tree).find((node) => node.props?.className === "media-content");
    const entries = {};
    const surface = { querySelector: () => entries };
    content.props.onPointerDown({ target: {}, currentTarget: surface });
    tree = await h.flush();
    assert.ok(descendants(tree).some((node) => node.props?.className?.includes(`${cardClass} is-selected`)));
    content.props.onPointerDown({ target: cardClass === "media-file-card" ? entries : surface, currentTarget: surface });
    tree = await h.flush();
    assert.equal(descendants(tree).some((node) => node.props?.className?.includes(" is-selected")), false);
    assert.ok(descendants(tree).some((node) => node.props?.className === "media-details-empty"));
  }
  assert.deepEqual(h.calls, []);
  h.close();
});






test("read-only file context actions remain disabled", async () => {
  const h = mediaHarness({ writable: false, targetLabel: "Post", onInsertImage() {} }, sampleMedia());
  let tree = await h.flush();
  descendants(tree).find((node) => node.props?.className?.includes("media-file-card")).props.onContextMenu({ preventDefault() {}, currentTarget: {}, clientX: 100, clientY: 100 });
  tree = await h.flush();
  assert.equal(findButton(tree, "Rename").props.disabled, true);
  assert.equal(findButton(tree, "Delete").props.disabled, true);
  assert.equal(findButton(tree, "Change colour"), undefined);
  assert.deepEqual(h.calls, []);
  h.close();
});


for (const kind of ["folder", "file"]) {
  test(`${kind} Rename edits the card inline and saves its existing storage record`, async () => {
    const h = mediaHarness({ writable: true, targetLabel: "Post", onInsertImage() {} }, sampleMedia());
    let tree = await h.flush();
    descendants(tree).find((node) => node.type === "button" && node.props?.className?.includes(`media-${kind}-card`)).props.onContextMenu({ preventDefault() {}, currentTarget: {}, clientX: 100, clientY: 100 });
    tree = await h.flush();
    findButton(tree, "Rename").props.onClick(); tree = await h.flush();
    let input = descendants(tree).find((node) => node.props?.["aria-label"] === `Rename ${kind}`);
    assert.ok(input);
    assert.equal(input.props.value, kind === "folder" ? "Folder F" : "Original");
    assert.deepEqual(h.focusCalls, ["focus", "select-all"]);
    assert.equal(descendants(tree).some((node) => node.props?.className === "media-folder-menu"), false);
    input.props.onChange({ target: { value: "New name" } }); tree = await h.flush();
    input = descendants(tree).find((node) => node.props?.["aria-label"] === `Rename ${kind}`);
    input.props.onKeyDown({ key: "Enter", preventDefault() {}, stopPropagation() {}, currentTarget: { blur() { input.props.onBlur(); } } });
    await h.flush();
    assert.equal(h.calls.length, 1);
    assert.equal(h.calls[0].name, kind === "folder" ? "renameMediaFolder" : "updateMediaAsset");
    assert.equal(h.calls[0].args[0], kind === "folder" ? "folder" : "image");
    assert.equal(kind === "folder" ? h.calls[0].args[1] : h.calls[0].args[1].name, "New name");
    h.close();
  });
}


test("Escape cancels inline rename and a following blur cannot save it", async () => {
  const h = mediaHarness({ writable: true, targetLabel: "Post", onInsertImage() {} }, sampleMedia());
  let tree = await h.flush();
  descendants(tree).find((node) => node.props?.className?.includes("media-file-card")).props.onContextMenu({ preventDefault() {}, currentTarget: {}, clientX: 100, clientY: 100 });
  tree = await h.flush(); findButton(tree, "Rename").props.onClick(); tree = await h.flush();
  const input = descendants(tree).find((node) => node.props?.["aria-label"] === "Rename file");
  input.props.onKeyDown({ key: "Escape", preventDefault() {}, stopPropagation() {} });
  input.props.onBlur(); tree = await h.flush();
  assert.equal(descendants(tree).some((node) => node.props?.["aria-label"] === "Rename file"), false);
  assert.deepEqual(h.calls, []);
  h.close();
});


test("media drop moves files into folders and ignores external/read-only drags", async () => {
  const h = mediaHarness({ writable: true, targetLabel: "Post", onInsertImage() {} }, sampleMedia());
  let tree = await h.flush();
  const folder = descendants(tree).find((node) => node.type === "button" && node.props.className?.includes("media-folder-card"));
  const file = descendants(tree).find((node) => node.type === "button" && node.props.className?.includes("media-file-card"));
  folder.props.onDrop({ preventDefault() {}, stopPropagation() {} }); await h.flush();
  assert.deepEqual(h.calls, []);
  const transfer = { setData() {} };
  file.props.onDragStart({ preventDefault() { assert.fail("writable drag rejected"); }, dataTransfer: transfer });
  assert.equal(transfer.effectAllowed, "move");
  let accepted = false;
  folder.props.onDragOver({ preventDefault() { accepted = true; }, dataTransfer: transfer });
  assert.equal(accepted, true);
  tree = await h.flush();
  assert.ok(descendants(tree).some((node) => node.props?.className?.includes("is-drop-target")));
  folder.props.onDrop({ preventDefault() {}, stopPropagation() {} }); await h.flush();
  assert.equal(h.calls[0].name, "updateMediaAsset");
  assert.equal(h.calls[0].args[0], "image");
  assert.equal(h.calls[0].args[1].folderId, "folder");
  h.props({ writable: false }); tree = await h.flush();
  assert.equal(descendants(tree).find((node) => node.type === "button" && node.props.className?.includes("media-file-card")).props.draggable, false);
  h.close();
});

test("folder drag rejects itself and moves to a valid sibling", async () => {
  const library = sampleMedia();
  library.folders.push({ id: "destination", name: "Destination", parentId: null, createdAt: "2026-09-09" });
  const h = mediaHarness({ writable: true, targetLabel: "Post", onInsertImage() {} }, library);
  let tree = await h.flush();
  const cards = descendants(tree).filter((node) => node.type === "button" && node.props.className?.includes("media-folder-card"));
  const source = cards.find((node) => textOf(node).includes("Folder F"));
  const destination = cards.find((node) => textOf(node).includes("Destination"));
  const transfer = { setData() {} };
  source.props.onDragStart({ preventDefault() {}, dataTransfer: transfer });
  source.props.onDragOver({ preventDefault() { assert.fail("self drop accepted"); }, dataTransfer: transfer });
  destination.props.onDrop({ preventDefault() {}, stopPropagation() {} });
  tree = await h.flush();
  assert.equal(h.calls[0].name, "moveMediaFolder");
  assert.equal(library.folders.find((folder) => folder.id === "folder").parentId, "destination");
  h.close();
});


for (const kind of ["file", "folder"]) {
  test(`${kind} context menu moves an item up one directory and hides the action at root`, async () => {
    const library = sampleMedia();
    library.folders.push({ id: "inner", name: "Inner", parentId: "folder", createdAt: "2026-09-09" });
    if (kind === "file") library.assets[0].folderId = "inner";
    else library.folders.push({ id: "nested", name: "Nested", parentId: "inner", createdAt: "2026-09-09" });
    const h = mediaHarness({ writable: true, targetLabel: "Post", onInsertImage() {} }, library);
    let tree = await h.flush();
    const folderCard = () => descendants(tree).find((node) => node.type === "button" && node.props.className?.includes("media-folder-card"));
    folderCard().props.onContextMenu({ preventDefault() {}, currentTarget: {}, clientX: 100, clientY: 100 });
    tree = await h.flush();
    assert.equal(findButton(tree, "Move to parent folder"), undefined);
    folderCard().props.onDoubleClick(); tree = await h.flush();
    folderCard().props.onDoubleClick(); tree = await h.flush();
    const card = descendants(tree).find((node) => node.type === "button" && node.props.className?.includes(`media-${kind}-card`));
    card.props.onContextMenu({ preventDefault() {}, currentTarget: {}, clientX: 100, clientY: 100 });
    tree = await h.flush();
    const move = findButton(tree, "Move to parent folder");
    assert.equal(move.props.disabled, false);
    move.props.onClick(); await h.flush();
    assert.equal(h.calls[0].name, kind === "file" ? "updateMediaAsset" : "moveMediaFolder");
    assert.equal(kind === "file" ? h.calls[0].args[1].folderId : h.calls[0].args[1], "folder");
    h.close();
  });
}


test("Parent folder card appears first inside folders and navigates up in read-only mode", async () => {
  const h = mediaHarness({ writable: false, targetLabel: "Post", onInsertImage() {} }, sampleMedia());
  let tree = await h.flush();
  assert.equal(descendants(tree).some((node) => node.props?.className === "media-parent-card"), false);
  descendants(tree).find((node) => node.type === "button" && node.props.className?.includes("media-folder-card")).props.onDoubleClick();
  tree = await h.flush();
  const entries = descendants(tree).find((node) => node.props?.className === "media-entries is-grid");
  const parent = descendants(entries).find((node) => node.type === "button");
  assert.equal(parent.props.className, "media-parent-card");
  assert.equal(parent.props["aria-label"], "Parent folder: All files");
  assert.notEqual(parent.props.disabled, true);
  parent.props.onClick(); tree = await h.flush();
  assert.equal(descendants(tree).some((node) => node.props?.className === "media-parent-card"), false);
  assert.ok(descendants(tree).some((node) => node.props?.className?.includes("media-folder-card")));
  assert.deepEqual(h.calls, []);
  h.close();
});


for (const kind of ["file", "folder"]) {
  test(`Parent folder drop moves a ${kind} to root with ownership gating`, async () => {
    const library = sampleMedia();
    if (kind === "file") library.assets[0].folderId = "folder";
    else library.folders.push({ id: "child", name: "Child", parentId: "folder", createdAt: "2026-09-09" });
    const h = mediaHarness({ writable: true, targetLabel: "Post", onInsertImage() {} }, library);
    let tree = await h.flush();
    descendants(tree).find((node) => node.type === "button" && node.props.className?.includes("media-folder-card")).props.onDoubleClick();
    tree = await h.flush();
    const card = descendants(tree).find((node) => node.type === "button" && node.props.className?.includes(`media-${kind}-card`));
    const parent = descendants(tree).find((node) => node.props?.className === "media-parent-card");
    const transfer = { setData() {} };
    card.props.onDragStart({ preventDefault() {}, dataTransfer: transfer });
    let accepted = false;
    parent.props.onDragOver({ preventDefault() { accepted = true; }, dataTransfer: transfer });
    tree = await h.flush();
    assert.equal(accepted, true);
    assert.ok(descendants(tree).some((node) => node.props?.className === "media-parent-card is-drop-target"));
    parent.props.onDrop({ preventDefault() {}, stopPropagation() {} }); await h.flush();
    assert.equal(h.calls[0].name, kind === "file" ? "updateMediaAsset" : "moveMediaFolder");
    assert.equal(kind === "file" ? h.calls[0].args[1].folderId : h.calls[0].args[1], null);
    h.close();
  });
}

test("Parent folder rejects a self-drop found through search", async () => {
  const library = sampleMedia();
  library.folders.push({ id: "inner", name: "Inner", parentId: "folder", createdAt: "2026-09-09" });
  const h = mediaHarness({ writable: true, targetLabel: "Post", onInsertImage() {} }, library);
  let tree = await h.flush();
  const realFolder = () => descendants(tree).find((node) => node.type === "button" && node.props.className?.includes("media-folder-card"));
  realFolder().props.onDoubleClick(); tree = await h.flush();
  realFolder().props.onDoubleClick(); tree = await h.flush();
  descendants(tree).find((node) => node.type === "input" && node.props.placeholder === "Search files and folders").props.onChange({ target: { value: "Folder F" } });
  tree = await h.flush();
  const transfer = { setData() {} };
  realFolder().props.onDragStart({ preventDefault() {}, dataTransfer: transfer });
  const parent = descendants(tree).find((node) => node.props?.className === "media-parent-card");
  parent.props.onDragOver({ preventDefault() { assert.fail("self drop accepted"); }, dataTransfer: transfer });
  tree = await h.flush();
  assert.equal(transfer.dropEffect, "none");
  assert.ok(descendants(tree).some((node) => node.props?.className === "media-parent-card is-invalid-drop"));
  parent.props.onDrop({ preventDefault() {}, stopPropagation() {} }); await h.flush();
  assert.deepEqual(h.calls, []);
  h.close();
});


for (const destination of [null, "folder"]) {
  test(`breadcrumb drop moves a file to ${destination ?? "root"} without navigating`, async () => {
    const library = sampleMedia();
    library.folders.push({ id: "inner", name: "Inner", parentId: "folder", createdAt: "2026-09-09" });
    library.assets[0].folderId = "inner";
    const h = mediaHarness({ writable: true, targetLabel: "Post", onInsertImage() {} }, library);
    let tree = await h.flush();
    const folderCard = () => descendants(tree).find((node) => node.type === "button" && node.props.className?.includes("media-folder-card"));
    folderCard().props.onDoubleClick(); tree = await h.flush();
    folderCard().props.onDoubleClick(); tree = await h.flush();
    const transfer = { setData() {} };
    descendants(tree).find((node) => node.type === "button" && node.props.className?.includes("media-file-card")).props.onDragStart({ preventDefault() {}, dataTransfer: transfer });
    const nav = descendants(tree).find((node) => node.props?.className === "media-breadcrumbs");
    const target = findButton(nav, destination ? "Folder F" : "All files");
    target.props.onDragOver({ preventDefault() {}, dataTransfer: transfer }); tree = await h.flush();
    assert.equal(transfer.dropEffect, "move");
    target.props.onDrop({ preventDefault() {}, stopPropagation() {} }); tree = await h.flush();
    assert.equal(h.calls[0].name, "updateMediaAsset");
    assert.equal(h.calls[0].args[1].folderId, destination);
    assert.ok(findButton(descendants(tree).find((node) => node.props?.className === "media-breadcrumbs"), "Inner"));
    h.close();
  });
}


test("folder single click selects and double click opens", async () => {
  const h = mediaHarness({ writable: true, targetLabel: "Post", onInsertImage() {} }, sampleMedia());
  let tree = await h.flush();
  const card = descendants(tree).find((node) => node.type === "button" && node.props.className?.includes("media-folder-card"));
  card.props.onClick(); tree = await h.flush();
  assert.ok(descendants(tree).some((node) => node.props?.className === "media-folder-card is-selected"));
  assert.equal(descendants(tree).some((node) => node.props?.className === "media-parent-card"), false);
  assert.ok(descendants(card).some((node) => node.type === "small" && textOf(node) === "Folder"));
  card.props.onDoubleClick(); tree = await h.flush();
  assert.ok(descendants(tree).some((node) => node.props?.className === "media-parent-card"));
  assert.deepEqual(h.calls, []);
  h.close();
});


test("file overflow button opens its accessible Rename and Delete menu", async () => {
  const h = mediaHarness({ writable: true, targetLabel: "Post", onInsertImage() {} }, sampleMedia());
  let tree = await h.flush();
  const trigger = descendants(tree).find((node) => node.props?.className === "media-file-menu-toggle");
  assert.equal(trigger.props["aria-label"], "Actions for Original");
  assert.equal(trigger.props["aria-expanded"], false);
  trigger.props.onClick({ currentTarget: { getBoundingClientRect: () => ({ left: 100, bottom: 120 }) } });
  tree = await h.flush();
  assert.ok(findButton(tree, "Rename")); assert.ok(findButton(tree, "Delete"));
  assert.equal(findButton(tree, "Change colour"), undefined);
  assert.equal(descendants(tree).find((node) => node.props?.className === "media-file-menu-toggle").props["aria-expanded"], true);
  assert.deepEqual(h.calls, []);
  h.close();
});


test("overflow buttons toggle their own menu and switch to another card", async () => {
  const h = mediaHarness({ writable: true, targetLabel: "Post", onInsertImage() {} }, sampleMedia());
  let tree = await h.flush();
  let restored = 0;
  const trigger = { isConnected: true, focus() { restored++; }, getBoundingClientRect: () => ({ left: 100, bottom: 120 }) };
  const click = async (className) => {
    descendants(tree).find((node) => node.props?.className === className).props.onClick({ currentTarget: trigger });
    tree = await h.flush();
  };
  for (const className of ["media-folder-menu-toggle", "media-file-menu-toggle"]) {
    await click(className);
    assert.equal(descendants(tree).find((node) => node.props?.className === className).props["aria-expanded"], true);
    await click(className);
    assert.equal(descendants(tree).some((node) => node.props?.className === "media-folder-menu"), false);
  }
  assert.equal(restored, 2);
  await click("media-folder-menu-toggle");
  await click("media-file-menu-toggle");
  assert.equal(descendants(tree).find((node) => node.props?.className === "media-file-menu-toggle").props["aria-expanded"], true);
  assert.equal(descendants(tree).find((node) => node.props?.className === "media-folder-menu-toggle").props["aria-expanded"], false);
  assert.equal(findButton(tree, "Change colour"), undefined);
  h.close();
});


for (const colour of [undefined, "#ff3b30", "#007aff"]) {
  test(`folder details uses the card colour ${colour ?? "default"}`, async () => {
    const library = sampleMedia();
    if (colour) library.folders[0].colour = colour;
    const h = mediaHarness({ writable: true, targetLabel: "Post", onInsertImage() {} }, library);
    let tree = await h.flush();
    descendants(tree).find((node) => node.type === "button" && node.props.className?.includes("media-folder-card")).props.onClick();
    tree = await h.flush();
    const details = descendants(tree).find((node) => node.props?.className === "folder-detail");
    assert.equal(details.props.children[0].props.style.color, colour);
    const cardIcon = descendants(tree).find((node) => node.props?.className === "folder-glyph");
    assert.equal(cardIcon.props.style.color, colour);
    h.close();
  });
}
