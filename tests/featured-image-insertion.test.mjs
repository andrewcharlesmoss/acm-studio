import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import ts from "typescript";
import { loadProductionModule } from "./production-module.mjs";

const { contentMediaIds } = await loadProductionModule(new URL("../app/content/media-references.ts", import.meta.url));
const { setListItemBackgroundImage } = await loadProductionModule(new URL("../app/studio/list-item-background.ts", import.meta.url));
const source = await readFile(process.env.STUDIO_MEDIA_HOOK_SOURCE || new URL("../app/studio/use-studio-media.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;

function fixture({ accept = true, prepareFeaturedImage, saveFeaturedImage } = {}) {
  const slots = []; let cursor = 0; let effects = []; let dirty = true; let state;
  const updates = []; const returns = [];
  let document = { id: "post-one", kind: "post", title: "One", blocks: [], coverImage: null };
  let writable = true;
  const react = {
    useState(initial) { const key = cursor++; if (!(key in slots)) slots[key] = typeof initial === "function" ? initial() : initial; return [slots[key], value => { slots[key] = typeof value === "function" ? value(slots[key]) : value; dirty = true; }]; },
    useRef(initial) { const key = cursor++; return slots[key] ??= { current: initial }; },
    useMemo(callback) { cursor++; return callback(); },
    useLayoutEffect(callback) { cursor++; effects.push(callback); },
    useEffect(callback, deps) { const key = cursor++; const old = slots[key]; if (old && deps?.every((value, index) => Object.is(value, old.deps[index]))) return; effects.push(() => { old?.cleanup?.(); slots[key] = { deps, cleanup: callback() }; }); },
  };
  const exports = {};
  vm.runInNewContext(compiled, { exports, URL, Blob, crypto, queueMicrotask, Promise,
    require(name) {
      if (name === "react") return react;
      if (name.endsWith("media-sync")) return { useMediaSession: () => ({ revision: 0 }) };
      if (name.endsWith("media-store")) return { getMediaAsset: async () => undefined };
      if (name.endsWith("media-references")) return { contentMediaIds };
      if (name.endsWith("list-item-background")) return { setListItemBackgroundImage };
      throw new Error(`Unexpected dependency: ${name}`);
    },
  });
  function render() {
    cursor = 0; dirty = false;
    state = exports.useStudioMedia({ documents: [document], activeDocument: document, writable, prepareFeaturedImage, saveFeaturedImage,
      updateActiveDocument(update) { updates.push(update(document)); return accept; }, updateBlock() {}, onSelectBlock() {}, onReturnToDocument(target) { returns.push(target); } });
    const pending = effects; effects = []; pending.forEach(callback => callback());
  }
  render();
  return { get state() { if (dirty) render(); return state; }, updates, returns,
    target() { state.targetCoverImage(); render(); },
    switchDocument() { document = { ...document, id: "post-two" }; render(); },
    pause() { writable = false; render(); },
    async settle() { await Promise.resolve(); if (dirty) render(); },
  };
}
const asset = { id: "media-one", name: "Selected.png", type: "image/png", altText: "Selected picture", blob: new Blob(["fixture"]) };

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
