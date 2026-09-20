import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";

const require = createRequire(import.meta.url);
const root = new URL("../", import.meta.url).pathname;

function modules(overrides = {}, globals = {}) {
  const cache = new Map();
  // These existing tests isolate loading/rollback behaviour. Cross-tab
  // ownership and fail-closed persistence are exercised with real coordinators
  // in studio-write-ownership.test.mjs.
  let ownershipState = "writable";
  const writer = {
    getState: () => ownershipState, subscribe: () => () => {},
    acquire: (onLoad) => { onLoad(Symbol("test writer")); return () => {}; },
    loaded: (_token, readable) => { ownershipState = readable ? "writable" : "unreadable"; },
    canWrite: () => ownershipState === "writable", assertWritable: () => {},
    restore: (operation) => operation({}),
  };
  function load(file) {
    const filename = path.resolve(root, file);
    if (cache.has(filename)) return cache.get(filename);
    const exports = {};
    cache.set(filename, exports);
    const source = ts.transpileModule(readFileSync(filename, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
    }).outputText;
    vm.runInNewContext(source, { exports, structuredClone, ...globals, require: (specifier) => {
      if (specifier in overrides) return overrides[specifier];
      if (specifier.endsWith("write-ownership")) return { studioWriteOwnership: writer, ownershipMessage: () => null };
      if (!specifier.startsWith(".")) return require(specifier);
      return load(path.resolve(path.dirname(filename), specifier.endsWith(".mjs") ? specifier : `${specifier}.ts`));
    } }, { filename });
    return exports;
  }
  return load;
}

function storage(initial = null) {
  let raw = initial;
  const writes = [];
  return { getItem: () => raw, setItem: (_key, value) => { writes.push(value); raw = value; }, writes, raw: () => raw };
}

// Run the actual hook's effects and dependency changes, with persistence injected.
function hookHarness(repository, load, syncOverride = null) {
  const slots = [];
  let index = 0;
  let effects = [];
  let microtasks = [];
  let dirty = true;
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
      const id = index++;
      const prior = slots[id];
      if (!prior || deps.some((value, i) => !Object.is(value, prior.deps[i]))) {
        slots[id] = { deps };
        effects.push(() => { prior?.cleanup?.(); slots[id].cleanup = effect(); });
      }
    },
  };
  const useWorkspace = modules({ react, "./editor-model": load("app/studio/editor-model.ts"), "./workspace-repository": { browserWorkspaceRepository: repository }, ...(syncOverride ? { "./studio-sync": syncOverride } : {}) }, {
    queueMicrotask: (fn) => microtasks.push(fn),
  })("app/studio/use-studio-workspace.ts").useStudioWorkspace;
  let result;
  return {
    flush() {
      let renders = 0;
      while (dirty) {
        assert.ok(++renders < 20, "hook should settle");
        dirty = false; index = 0;
        // eslint-disable-next-line react-hooks/rules-of-hooks -- This harness supplies an isolated dispatcher for each render.
        result = useWorkspace(repository);
        const pending = effects; effects = []; pending.forEach((fn) => fn());
        const queued = microtasks; microtasks = []; queued.forEach((fn) => fn());
      }
      return result;
    },
  };
}

for (const raw of ["{broken", "", JSON.stringify({ version: 1, documents: [] }), JSON.stringify({ version: 2, activeDocumentId: "bad", documents: [{ id: "bad", kind: "post" }] })]) {
  test(`unreadable workspace is preserved without autosaving: ${raw.slice(0, 25)}`, () => {
    const localStorage = storage(raw);
    const load = modules({}, { window: { localStorage } });
    const hook = hookHarness(load("app/studio/workspace-repository.ts").browserWorkspaceRepository, load);
    const state = hook.flush();
    assert.equal(state.ready, true);
    assert.match(state.saveLabel, /not being saved/);
    state.commit((workspace) => ({ ...workspace }));
    state.setSaveLabel("Saved locally");
    assert.match(hook.flush().saveLabel, /not being saved/);
    assert.equal(localStorage.raw(), raw);
    assert.equal(localStorage.writes.length, 0);
  });
}

test("a genuinely absent workspace may initialise and save", () => {
  const localStorage = storage();
  const load = modules({}, { window: { localStorage } });
  const state = hookHarness(load("app/studio/workspace-repository.ts").browserWorkspaceRepository, load).flush();
  assert.match(state.saveLabel, /Saved locally/);
  assert.equal(localStorage.writes.length, 1);
  assert.equal(JSON.parse(localStorage.raw()).version, 2);
});

test("autosave status reports persistence time rather than a stale document timestamp", () => {
  const localStorage = storage();
  const load = modules({}, { window: { localStorage } });
  const hook = hookHarness(load("app/studio/workspace-repository.ts").browserWorkspaceRepository, load);
  const state = hook.flush();
  const expectedMinute = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  state.commit((workspace) => ({ ...workspace, documents: workspace.documents.map((document, index) => index === 0 ? { ...document, title: "Changed locally" } : document) }));
  const saved = hook.flush();
  assert.equal(saved.saveLabel, `Saved locally ${expectedMinute}`);
});

test("denied reads never trigger writes; quota errors are not reported as saved", () => {
  const load = modules();
  let writes = 0;
  const denied = hookHarness({ load() { throw Error("denied"); }, save() { writes++; } }, load).flush();
  assert.match(denied.saveLabel, /not being saved/);
  assert.equal(writes, 0);
  const full = hookHarness({ load: () => null, save() { throw Error("quota"); } }, load).flush();
  assert.equal(full.saveLabel, "Could not save locally");
});

test("Save feedback cannot hide a quota failure; a successful persistence retry clears it", () => {
  let quota = true;
  const h = hookHarness({ load: () => null, save() { if (quota) throw Error("quota"); } }, modules());
  h.flush().setSaveLabel("Saved locally just now");
  assert.equal(h.flush().saveLabel, "Could not save locally");
  quota = false;
  h.flush().commit((workspace) => ({ ...workspace }));
  assert.match(h.flush().saveLabel, /Saved locally/);
});

test("a conflict pauses autosave and reports a failed resolution without losing the local canvas", async () => {
  let syncOptions;
  let commits = 0;
  const sync = { createStudioSync(options) {
    syncOptions = options;
    return { getStatus: () => "primary", isAvailable: () => true, isPrimary: () => true, commitPrimary: async () => { commits++; }, resolveConflict: async () => { throw Error("quota"); }, close() {} };
  } };
  const h = hookHarness({ load: () => null, save() {} }, modules(), sync);
  const initial = h.flush();
  syncOptions.onConflict({ reason: "Concurrent edit", localSnapshot: { ...initial.workspace, documents: initial.workspace.documents.map((document, index) => index === 0 ? { ...document, title: "Unsaved title" } : document) } });
  const before = commits;
  const conflicted = h.flush();
  assert.equal(conflicted.workspace.documents[0].title, "Unsaved title");
  assert.equal(conflicted.writable, false);
  assert.equal(commits, before);
  await conflicted.resolveSyncConflict("mine");
  const failed = h.flush();
  assert.match(failed.syncResolutionError, /could not be saved|quota/);
  assert.equal(failed.workspace.documents[0].title, "Unsaved title");
});

test("authoritative workspace updates clear local undo and redo history", async () => {
  let syncOptions;
  const sync = {
    createStudioSync(options) {
      syncOptions = options;
      return { getStatus: () => "primary", isAvailable: () => true, isPrimary: () => true, commitPrimary: async () => {}, close() {} };
    },
  };
  const h = hookHarness({ load: () => null, save() {} }, modules(), sync);
  let state = h.flush();
  state.commit(workspace => ({ ...workspace, documents: workspace.documents.map((document, index) => index === 0 ? { ...document, title: "Local edit" } : document) }));
  state = h.flush(); assert.equal(state.canUndo, true); assert.ok(syncOptions);
  const remote = structuredClone(state.workspace);
  remote.documents[0].title = "Remote edit";
  syncOptions.onSnapshot(remote, "update");
  state = h.flush();
  assert.equal(state.workspace.documents[0].title, "Remote edit");
  assert.equal(state.canUndo, false); assert.equal(state.canRedo, false);
});

const load = modules();
const { initialStudioWorkspace } = load("app/studio/editor-model.ts");
const backupStore = load("app/studio/backup-store.ts");
const validBackup = () => ({ format: "acm-studio-backup", version: 1, exportedAt: "2026-08-31T00:00:00Z", workspace: structuredClone(initialStudioWorkspace), publications: null, media: { folders: [], assets: [] } });

test("current workspace and publication snapshots round-trip validation", () => {
  const backup = validBackup();
  const { toLocallyPublishedArticle } = load("app/content/local-publishing.ts");
  backup.publications = JSON.stringify({ version: 1, posts: [toLocallyPublishedArticle(backup.workspace.documents.find((document) => document.kind === "post"))] });
  assert.equal(backupStore.validateStudioBackup(backup), backup);
});

for (const [name, corrupt] of [
  ["missing blocks", (backup) => { delete backup.workspace.documents[0].blocks; }],
  ["invalid block", (backup) => { backup.workspace.documents[0].blocks = [{ id: "bad", type: "table", rows: [null] }]; }],
  ["duplicate document IDs", (backup) => { backup.workspace.documents.push(backup.workspace.documents[0]); }],
  ["missing active document", (backup) => { backup.workspace.activeDocumentId = "absent"; }],
  ["malformed publication", (backup) => { backup.publications = JSON.stringify({ version: 1, posts: [null] }); }],
  ["invalid folder", (backup) => { backup.media.folders = [null]; }],
  ["cyclic folders", (backup) => { backup.media.folders = [{ id: "a", name: "A", parentId: "a", createdAt: backup.exportedAt }]; }],
  ["malformed asset", (backup) => { backup.media.assets = [{ id: "a", name: "A", type: "image/png", size: 1, dataBase64: "AA==" }]; }],
]) {
  test(`rejects ${name} before restore can access storage`, async () => {
    const backup = validBackup(); corrupt(backup);
    assert.throws(() => backupStore.validateStudioBackup(backup));
    await assert.rejects(backupStore.restoreStudioBackup(backup));
  });
}

test("oversized backup is rejected before reading its contents", async () => {
  await assert.rejects(backupStore.readStudioBackup({ size: 101 * 1024 * 1024, text() { assert.fail("must not read oversized file"); } }), /100 MB/);
});

test("failed restore preserves even empty original values", async () => {
  const { LOCAL_WORKSPACE_KEY, LOCAL_PUBLICATIONS_KEY } = load("app/content/local-publishing.ts");
  const original = new Map([[LOCAL_WORKSPACE_KEY, ""], [LOCAL_PUBLICATIONS_KEY, ""]]);
  let restoredMedia = 0;
  const restore = modules({ "./media-store": {
    listMediaLibrary: async () => ({ assets: [], folders: [] }),
    replaceMediaLibrary: async () => { restoredMedia++; },
  } }, { window: { localStorage: {
    getItem: (key) => original.get(key) ?? null,
    setItem: (key, value) => original.set(key, value),
    removeItem() { throw Error("storage write failed"); },
  } } })("app/studio/backup-store.ts").restoreStudioBackup;
  await assert.rejects(restore(validBackup()), /storage write failed/);
  assert.equal(original.get(LOCAL_WORKSPACE_KEY), "");
  assert.equal(original.get(LOCAL_PUBLICATIONS_KEY), "");
  assert.equal(restoredMedia, 2);
});

test("backup export rejects encoded media over its limit before reading blobs", async () => {
  const size = 76 * 1024 * 1024;
  const create = modules({ "./media-store": {
    listMediaLibrary: async () => ({ folders: [], assets: [{ id: "large", size, blob: { size } }] }),
  } }, { Blob, window: { localStorage: { getItem: () => null } }, FileReader: class {
    constructor() { assert.fail("oversized media must not be read"); }
  } })("app/studio/backup-store.ts").createStudioBackup;
  await assert.rejects(create(initialStudioWorkspace), /100 MB/);
});

test("restore attempts every original store even when media rollback fails", async () => {
  const { LOCAL_WORKSPACE_KEY, LOCAL_PUBLICATIONS_KEY } = load("app/content/local-publishing.ts");
  const originals = new Map([[LOCAL_WORKSPACE_KEY, "original workspace"], [LOCAL_PUBLICATIONS_KEY, "original publications"]]);
  let mediaWrites = 0;
  const restoredKeys = [];
  const restore = modules({ "./media-store": {
    listMediaLibrary: async () => ({ assets: [], folders: [] }),
    replaceMediaLibrary: async () => { if (++mediaWrites === 2) throw Error("media rollback failed"); },
  } }, { window: { localStorage: {
    getItem: (key) => originals.get(key),
    setItem: (key, value) => { if (value.startsWith("original")) restoredKeys.push(key); },
    removeItem: () => { throw Error("publication write failed"); },
  } } })("app/studio/backup-store.ts").restoreStudioBackup;
  await assert.rejects(restore(validBackup()), /could not be fully recovered/);
  assert.deepEqual(restoredKeys, [LOCAL_WORKSPACE_KEY, LOCAL_PUBLICATIONS_KEY]);
});

test("the backup interface exposes incomplete recovery instead of suggesting a simple retry", async () => {
  const manager = readFileSync(path.join(root, "app/studio/backup-manager.tsx"), "utf8");
  const start = manager.indexOf("  async function restoreBackup()");
  const end = manager.indexOf("\n  return (", start);
  assert.ok(start >= 0 && end > start);
  const statuses = [];
  const context = vm.createContext({
    selectedBackup: validBackup(), confirmed: true, AggregateError,
    window: { confirm: () => true, location: { reload: () => assert.fail("failed restore must not reload") } },
    restoreStudioBackup: async () => { throw new AggregateError([], "private implementation detail"); },
    setBusy() {}, setStatus: (status) => statuses.push(status),
  });
  vm.runInContext(manager.slice(start, end), context);
  await context.restoreBackup();
  assert.match(statuses.at(-1), /could not be fully recovered.*Keep this page open/);
  assert.doesNotMatch(statuses.at(-1), /private implementation detail|try again/);
});


test("optional folder colour survives backup validation and rejects unsafe values", () => {
  const backup = validBackup();
  backup.media.folders = [{ id: "coloured-folder", name: "Images", parentId: null, createdAt: backup.exportedAt, colour: "#3158c9" }];
  assert.equal(backupStore.validateStudioBackup(backup).media.folders[0].colour, "#3158c9");
  delete backup.media.folders[0].colour;
  assert.doesNotThrow(() => backupStore.validateStudioBackup(backup));
  backup.media.folders[0].colour = "url(https://example.com/image)";
  assert.throws(() => backupStore.validateStudioBackup(backup), /folders are invalid/);
});


test("folder moves preserve metadata and reject missing or cyclic destinations", () => {
  const { prepareMediaFolderMove } = load("app/studio/media-store.ts");
  const folders = [
    { id: "a", name: "A", parentId: null, colour: "#ff3b30", createdAt: "2026-09-09" },
    { id: "b", name: "B", parentId: "a", createdAt: "2026-09-09" },
    { id: "c", name: "C", parentId: null, createdAt: "2026-09-09" },
  ];
  const moved = prepareMediaFolderMove(folders, "a", "c");
  assert.equal(moved.parentId, "c"); assert.equal(moved.colour, "#ff3b30");
  assert.equal(folders[0].parentId, null);
  assert.equal(prepareMediaFolderMove(folders, "b", null).parentId, null);
  for (const destination of ["a", "b"]) assert.throws(() => prepareMediaFolderMove(folders, "a", destination), /itself or one of its descendants/);
  assert.throws(() => prepareMediaFolderMove(folders, "a", "missing"), /destination folder could not be found/);
  assert.throws(() => prepareMediaFolderMove(folders, "missing", null), /selected folder could not be found/);
  const cyclic = [...folders, { id: "x", parentId: "y" }, { id: "y", parentId: "x" }];
  assert.throws(() => prepareMediaFolderMove(cyclic, "a", "x"), /hierarchy is invalid/);
});
