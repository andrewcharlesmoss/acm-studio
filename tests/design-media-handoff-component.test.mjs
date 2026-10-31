import { createHostModuleEvaluator } from "./production-module.mjs";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { loadProductionModule } from "./production-module.mjs";
const commands = await loadProductionModule(new URL("../app/studio/design-media-handoff-command.ts", import.meta.url));
const source = await readFile(new URL("../app/studio/studio-design-media-handoff.tsx", import.meta.url), "utf8");
const code = (source);
const tick = () => new Promise(resolve => setImmediate(resolve));
const image = { id: "image", type: "image/png", name: "Test.png", altText: "Original", caption: "A sample" };
const descendants = node => !node || typeof node !== "object" ? [] : Array.isArray(node) ? node.flatMap(descendants) : [node, ...descendants(node.props?.children)];
function harness({ loadAsset = () => Promise.resolve(image), writable = true, documentId = "one", onInsert = () => true } = {}) {
  const slots = []; let index = 0, effects = [], dirty = true, tree;
  const calls = [], window = { location: { search: "?designMedia=image", pathname: "/studio" }, history: { replaceState() { window.location.search = ""; } } };
  const react = {
    useState(initial) { const id = index++; if (!(id in slots)) slots[id] = initial; return [slots[id], value => { slots[id] = typeof value === "function" ? value(slots[id]) : value; dirty = true; }]; },
    useRef(initial) { const id = index++; return slots[id] ??= { current: initial }; },
    useEffect(effect, deps) { const id = index++, previous = slots[id]; if (!previous || !deps || deps.some((value, i) => value !== previous.deps?.[i])) { slots[id] = { deps }; effects.push(() => { previous?.cleanup?.(); slots[id].cleanup = effect(); }); } },
  };
  react.useLayoutEffect = react.useEffect;
  const jsx = (type, props) => ({ type, props });
  const require = id => id === "react" ? react : id === "react/jsx-runtime" ? { jsx, jsxs: jsx } : id.endsWith("design-media-handoff-command") ? commands : assert.fail(id);
  const component = createHostModuleEvaluator(["require", "exports", "window"], `${code}\nreturn exports.StudioDesignMediaHandoff;`)(require, {}, window);
  const props = { documentId, writable, media: { loadAssetById: loadAsset }, onInsert(...args) { calls.push(args); return onInsert(...args); } };
  return { calls, props, window,
    async flush() { for (let count = 0; count < 20; count++) { if (dirty) { dirty = false; index = 0; tree = component(props); const pending = effects; effects = []; pending.forEach(effect => effect()); } await tick(); if (!dirty) return tree; } assert.fail("Unsettled component"); },
    close() { slots.forEach(slot => slot?.cleanup?.()); },
  };
}
test("Files-to-editor handoff inserts with saved file details without a description dialog", async () => {
  const h = harness(); const tree = await h.flush();
  assert.equal(h.calls.length, 1); assert.equal(h.calls[0][0], "one"); assert.equal(h.calls[0][1], image); assert.equal(h.calls[0][2], "block");
  assert.equal(h.calls[0][3], ""); assert.equal(descendants(tree).some(node => node.type === "dialog"), false);
  assert.equal(h.window.location.search, ""); h.close();
});
test("cancelling a pending handoff prevents insertion", async () => {
  let resolve; const pending = new Promise(done => { resolve = done; }); const h = harness({ loadAsset: () => pending });
  const tree = await h.flush(); assert.ok(descendants(tree).some(node => node.props?.role === "status"));
  h.close(); resolve(image); await tick(); assert.deepEqual(h.calls, []);
});
test("rejected insertion reports an alert without opening a description dialog", async () => {
  const h = harness({ onInsert: () => false }); const tree = await h.flush();
  assert.ok(descendants(tree).some(node => node.props?.role === "alert"));
  assert.equal(descendants(tree).some(node => node.type === "dialog"), false); h.close();
});
test("read-only mount does not load or show an editable handoff", async () => {
  let loads = 0; const h = harness({ writable: false, loadAsset: () => { loads++; return Promise.resolve(image); } });
  assert.equal(await h.flush(), null); assert.equal(loads, 0); h.close();
});
test("screen remounts the handoff on document and ownership changes", async () => {
  const screen = await readFile(new URL("../app/studio/studio-prototype.tsx", import.meta.url), "utf8");
  assert.match(screen, /<StudioDesignMediaHandoff key=\{`\$\{activeDocument.id\}:\$\{writable\}`\}/);
  assert.match(screen, /onSelectBlock: setSelectedBlockId, onInspectorTab: setInspectorTab/);
});
