import { createHostModuleEvaluator, evaluateProductionModule } from "./production-module.mjs";
import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

import { loadProductionModule } from "./production-module.mjs";

const { contentMediaIds } = await loadProductionModule(new URL("../app/content/media-references.ts", import.meta.url));
const { setListItemBackgroundImage } = await loadProductionModule(new URL("../app/studio/list-item-background.ts", import.meta.url));
const imageSource = await loadProductionModule(new URL("../app/content/image-source.ts", import.meta.url));
const blockTree = await loadProductionModule(new URL("../app/content/block-tree.ts", import.meta.url));
const commands = await loadProductionModule(new URL("../app/studio/studio-command-operations.mjs", import.meta.url));
const imageReplacement = await loadProductionModule(new URL("../app/studio/image-replacement.ts", import.meta.url));
const source = await readFile(process.env.STUDIO_MEDIA_HOOK_SOURCE || new URL("../app/studio/use-studio-media.ts", import.meta.url), "utf8");
const blobSource = await readFile(new URL("../app/studio/controls/use-blob-urls.ts", import.meta.url), "utf8");
const blobCompiled = (blobSource);
const compiled = (source);

function fixture({ accept = true, prepareFeaturedImage, saveFeaturedImage, blocks = [], beforeUpdate, resources, productionReader = async () => undefined, onSession = () => {} } = {}) {
  const slots = []; let cursor = 0; let effects = []; let dirty = true; let state;
  const updates = []; const returns = [];
  let document = { id: "post-one", kind: "post", title: "One", blocks, coverImage: null };
  let writable = true;
  const react = {
    useState(initial) { const key = cursor++; if (!(key in slots)) slots[key] = typeof initial === "function" ? initial() : initial; return [slots[key], value => { slots[key] = typeof value === "function" ? value(slots[key]) : value; dirty = true; }]; },
    useRef(initial) { const key = cursor++; return slots[key] ??= { current: initial }; },
    useMemo(callback) { cursor++; return callback(); },
    useLayoutEffect(callback) { cursor++; effects.push(callback); },
    useEffect(callback, deps) { const key = cursor++; const old = slots[key]; if (old && deps?.every((value, index) => Object.is(value, old.deps[index]))) return; effects.push(() => { old?.cleanup?.(); slots[key] = { deps, cleanup: callback() }; }); },
  };
  const exports = {};
  evaluateProductionModule(compiled, { exports, URL, Blob, crypto, queueMicrotask, Promise,
    require(name) {
      if (name === "react") return react;
      if (name.endsWith("content/image-source")) return imageSource;
      if (name.endsWith("use-blob-urls")) { const loaded = { exports: {} }; evaluateProductionModule(blobCompiled, { module: loaded, exports: loaded.exports, require: () => react, URL, queueMicrotask }); return loaded.exports; }
      if (name.endsWith("media-sync")) return { useMediaSession: () => { onSession(); return { revision: 0 }; } };
      if (name.endsWith("media-store")) return { getMediaAsset: productionReader };
      if (name.endsWith("media-references")) return { contentMediaIds };
      if (name.endsWith("block-tree")) return blockTree;
      if (name.endsWith("studio-command-operations.mjs")) return commands;
      if (name.endsWith("image-replacement")) return imageReplacement;
      if (name.endsWith("list-item-background")) return { setListItemBackgroundImage };
      throw new Error(`Unexpected dependency: ${name}`);
    },
  });
  function render() {
    cursor = 0; dirty = false;
    state = (resources ? exports.useStudioMediaOwner : exports.useStudioMedia)({ documents: [document], activeDocument: document, writable, prepareFeaturedImage, saveFeaturedImage,
      updateActiveDocument(update) { if (beforeUpdate) document = beforeUpdate(document); const next = update(document); if (JSON.stringify(next) !== JSON.stringify(document)) updates.push(next); if (accept) document = next; return accept; }, updateBlock() {}, onSelectBlock() {}, onReturnToDocument(target) { returns.push(target); } }, resources);
    const pending = effects; effects = []; pending.forEach(callback => callback());
  }
  render();
  return { get state() { if (dirty) render(); return state; }, get document() { return document; }, updates, returns,
    target() { state.targetCoverImage(); render(); },
    targetImage(id) { state.targetBlock(id); render(); },
    changeBlocks(blocks) { document = { ...document, blocks }; render(); },
    switchDocument() { document = { ...document, id: "post-two" }; render(); },
    pause() { writable = false; render(); },
    async settle() { await Promise.resolve(); if (dirty) render(); },
  };
}
const asset = { id: "media-one", name: "Selected.png", type: "image/png", altText: "Selected picture", blob: new Blob(["fixture"], { type: "image/png" }) };

test("rejected featured image updates keep the picker target and do not report insertion success", async () => {
  const f = fixture({ accept: false }); f.target();
  assert.equal(await f.state.insertImage(asset), false);
  await f.settle();
  assert.equal(f.state.targetCover, true);
  assert.deepEqual(f.returns, []);
});

test("a prepared portable image is applied once and returns to the document only after acceptance", async () => {
  const f = fixture({ prepareFeaturedImage: async (_asset, alt) => ({ src: "/media/portable.png", alt }) }); f.target();
  assert.equal(await f.state.insertImage(asset, undefined, "Chosen alternative text"), true);
  assert.deepEqual(JSON.parse(JSON.stringify(f.updates[0].coverImage)), { src: "/media/portable.png", alt: "Chosen alternative text" });
  assert.deepEqual(f.returns, ["document"]);
  await f.settle(); assert.equal(f.state.targetCover, false);
});

for (const change of ["switchDocument", "pause"]) {
  test(`async featured image insertion refuses a ${change} destination`, async () => {
    let finish;
    const f = fixture({ prepareFeaturedImage: () => new Promise(resolve => { finish = resolve; }) }); f.target();
    const pending = f.state.insertImage(asset); f[change](); finish({ src: "/media/portable.png", alt: "Chosen" });
    await assert.rejects(pending, /destination changed/);
    assert.deepEqual(f.updates, []); assert.deepEqual(f.returns, []);
  });
}


test("successful saving releases the staged image and failed saving preserves the picker", async () => {
  const prepareFeaturedImage = async () => ({ src: "/media/saved.png", alt: "Saved" });
  const f = fixture({ prepareFeaturedImage, saveFeaturedImage: async () => {} }); f.target();
  assert.equal(await f.state.insertImage(asset), true);
  await f.settle();
  assert.equal(f.state.blockUrls["/media/saved.png"], undefined);
  const failed = fixture({ prepareFeaturedImage, saveFeaturedImage: async () => { throw new Error("Save rejected"); } }); failed.target();
  await assert.rejects(failed.state.insertImage(asset), /Save rejected/);
  await failed.settle();
  assert.equal(failed.state.targetCover, true);
  assert.match(failed.state.blockUrls["/media/saved.png"], /^blob:/);
  assert.deepEqual(failed.returns, []);
});

test("closing the picker during preparation cancels before applying the image", async () => {
  let complete; const prepared = new Promise(resolve => { complete = resolve; });
  const f = fixture({ prepareFeaturedImage: () => prepared }); f.target();
  const attempt = new AbortController();
  const insertion = f.state.insertImage(asset, undefined, undefined, attempt.signal);
  attempt.abort(); complete({ src: "/media/cancelled.png", alt: "Cancelled" });
  assert.equal(await insertion, false);
  assert.deepEqual(f.updates, []);
  assert.deepEqual(f.returns, []);
});

test("replacing a nested image preserves authored fields and keeps a rich caption if the selected asset has none", async () => {
  const image = { id: "image", type: "image", src: "", mediaId: "old", alt: "Old", caption: "Keep", captionRuns: [{ text: "Keep", marks: ["bold"] }], title: "Title", displayWidth: 480, linkDestination: "custom", linkUrl: "https://example.com", decorative: true, editorial: { note: "Note" } };
  const f = fixture({ blocks: [{ id: "group", type: "group", layout: "flow", children: [image] }] });
  f.targetImage("image");
  assert.equal(await f.state.insertImage(asset, undefined, ""), true);
  const result = f.document.blocks[0].children[0];
  assert.deepEqual(JSON.parse(JSON.stringify(result)), { ...image, mediaId: asset.id, alt: "" });
  assert.deepEqual(f.returns, ["block"]);
});

for (const replacement of [null, { id: "image", type: "paragraph", text: "Changed" }, { id: "image", type: "image", src: "", mediaId: "other", alt: "Changed" }]) {
  test(`an unavailable or changed image target is rejected (${replacement?.type ?? "removed"})`, async () => {
    const image = { id: "image", type: "image", src: "", mediaId: "old", alt: "Old" };
    const f = fixture({ blocks: [image] }); f.targetImage("image");
    f.changeBlocks(replacement ? [replacement] : []);
    assert.equal(await f.state.insertImage(asset), false);
    assert.deepEqual(f.updates, []);
    assert.deepEqual(f.returns, []);
    assert.equal(f.state.targetBlockId, "image");
  });
}

test("replacement rejects a changed document, denied write, abort, and rejected owner update", async () => {
  const image = { id: "image", type: "image", src: "", mediaId: "old", alt: "Old" };
  const switched = fixture({ blocks: [image] }); switched.targetImage("image"); switched.switchDocument();
  assert.equal(await switched.state.insertImage(asset), false);
  const paused = fixture({ blocks: [image] }); paused.targetImage("image"); paused.pause();
  assert.equal(await paused.state.insertImage(asset), false);
  const aborted = fixture({ blocks: [image] }); aborted.targetImage("image"); const signal = new AbortController(); signal.abort();
  assert.equal(await aborted.state.insertImage(asset, undefined, "", signal.signal), false);
  const denied = fixture({ blocks: [image], accept: false }); denied.targetImage("image");
  assert.equal(await denied.state.insertImage(asset), false);
  assert.deepEqual(denied.document.blocks, [image]);
  assert.deepEqual(denied.returns, []);
});

test("reselecting the same image with unchanged metadata creates no update", async () => {
  const image = { id: "image", type: "image", src: "", mediaId: asset.id, alt: asset.altText };
  const f = fixture({ blocks: [image] }); f.targetImage("image");
  assert.equal(await f.state.insertImage(asset), true);
  assert.deepEqual(f.updates, []);
});

test("the live document is checked again inside the owning update", async () => {
  const image = { id: "image", type: "image", src: "", mediaId: "old", alt: "Old" };
  const f = fixture({ blocks: [image], beforeUpdate: document => ({ ...document, blocks: [{ ...image, mediaId: "newer" }] }) });
  f.targetImage("image");
  assert.equal(await f.state.insertImage(asset), false);
  assert.equal(f.document.blocks[0].mediaId, "newer");
  assert.deepEqual(f.returns, []);
});

test("a new image is inserted separately and uses the selected alternative text", async () => {
  const f = fixture(); f.targetImage(null);
  assert.equal(await f.state.insertImage(asset, undefined, ""), true);
  assert.equal(f.document.blocks.length, 1);
  assert.equal(f.document.blocks[0].type, "image");
  assert.equal(f.document.blocks[0].alt, "");
  assert.deepEqual(f.returns, ["block"]);
});

function navigationFixture(media, search) {
  const listeners = new Map(), tasks = [];
  const window = { location: { pathname: "/studio", search }, addEventListener(type, listener) { listeners.set(type, listener); }, removeEventListener() {}, dispatchEvent(event) { listeners.get(event.type)?.(event); },
    history: { state: {}, replaceState(state) { this.state = state; }, pushState(state, _title, path) { this.state = state; window.location.search = new URL(path, "http://localhost").search; }, go() {} } };
  const navigationSource = readFile(new URL("../app/studio/use-studio-screen-navigation.ts", import.meta.url), "utf8");
  return navigationSource.then(source => {
    const code = source.replace(/^import .*;\n/gm, "");
    const nav = createHostModuleEvaluator(["exports", "useEffect", "useEffectEvent", "useRef", "window", "document", "queueMicrotask", "isLocalFixtureSiteId"], `${code}\nreturn exports;`)({}, effect => effect(), callback => callback, current => ({ current }), window, { querySelector: () => null }, callback => tasks.push(callback), () => false);
    nav.useStudioScreenNavigation({ studioSection: "content", previewWindow: false, workspaceReady: true, activeDocument: { kind: "post" }, confirmCodeEditorDiscard: () => true, saveDocument() {}, onFilesNavigation: () => media.targetImage(null),
      ...Object.fromEntries(["setStudioSection", "setLibraryKind", "setPreviewing", "setTemplateTarget", "setShowInserter", "setDocumentFieldSelection", "setSelectedBlockId"].map(name => [name, () => {}])) });
    return { flush() { tasks.splice(0).forEach(task => task()); }, write: nav.writeStudioNavigation, pop() { window.location.search = "?mode=files"; window.history.state = { studioNavigationIndex: 1 }; listeners.get("popstate")({ state: window.history.state, stopImmediatePropagation() {} }); } };
  });
}

test("direct Files navigation establishes an owner for a new image", async () => {
  const f = fixture(); const nav = await navigationFixture(f, "?mode=files"); nav.flush();
  assert.equal(await f.state.insertImage(asset), true);
  assert.equal(f.document.blocks.length, 1);
  assert.equal(f.document.blocks[0].mediaId, asset.id);
});

test("Files history clears an old explicit target and rejects its captured callback", async () => {
  const image = { id: "image", type: "image", src: "", mediaId: "old", alt: "Old" };
  const f = fixture({ blocks: [image] }); const nav = await navigationFixture(f, ""); nav.flush();
  f.targetImage("image"); const staleInsert = f.state.insertImage;
  nav.write("files"); assert.equal(f.state.targetBlockId, "image");
  nav.pop();
  assert.equal(await staleInsert(asset), false);
  assert.equal(await f.state.insertImage(asset), true);
  assert.deepEqual(f.document.blocks[0], image);
  assert.equal(f.document.blocks[1].mediaId, asset.id);
});

test("reopening the same picker invalidates callbacks from its previous owner", async () => {
  for (const id of [null, "image"]) {
    const image = { id: "image", type: "image", src: "", mediaId: asset.id, alt: asset.altText };
    const f = fixture({ blocks: [image] }); f.targetImage(id); const staleInsert = f.state.insertImage;
    f.targetImage(id);
    assert.equal(await staleInsert(asset), false);
    assert.deepEqual(f.updates, []);
    assert.equal(await f.state.insertImage(asset), true);
    assert.equal(f.updates.length, id === null ? 1 : 0, "reselecting unchanged media remains a no-op");
  }
});

for (const owner of ["production", "isolated"]) test(`${owner} media owner uses its reader for all image entry points`, async () => {
  const reads = []; let sessions = 0;
  const reader = async id => { reads.push(id); return asset; };
  const f = fixture({ blocks: [{id: "image", type: "image", src: "", mediaId: "old", alt: "Old"}],
    ...(owner === "isolated" ? {resources: {getMediaAsset: reader, revision: 0}, productionReader: () => assert.fail("isolated owner touched product media")} : {productionReader: reader}),
    onSession: () => { sessions++; if(owner === "isolated") assert.fail("isolated owner subscribed to product media"); } });
  await f.settle(); f.targetImage("image");
  assert.equal(await f.state.loadAssetById("load"), asset);
  assert.equal(await f.state.insertImageById("insert", undefined, "Chosen"), true);
  assert.ok(reads.includes("old")); assert.ok(reads.includes("load")); assert.ok(reads.includes("insert"));
  assert.equal(f.document.blocks[0].mediaId, asset.id);
  assert.equal(owner === "production" ? sessions > 0 : sessions === 0, true);
});
