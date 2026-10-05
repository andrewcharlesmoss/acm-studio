import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";
import { loadProductionModule } from "./production-module.mjs";
const commands = await loadProductionModule(new URL("../app/studio/design-media-handoff-command.ts", import.meta.url));
const source = await readFile(new URL("../app/studio/studio-design-media-handoff.tsx", import.meta.url), "utf8");
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
const tick = () => new Promise(resolve => setImmediate(resolve));
const image = { id: "image", type: "image/png", name: "Test.png", altText: "Original" };
const descendants = node => !node || typeof node !== "object" ? [] : Array.isArray(node) ? node.flatMap(descendants) : [node, ...descendants(node.props?.children)];
function harness({ secondLoad, writable = true, documentId = "one" } = {}) {
  const slots = []; let index = 0, effects = [], dirty = true, tree, loads = 0;
  const calls = [], window = { location: { search: "?designMedia=image", pathname: "/studio" }, history: { replaceState() { window.location.search = ""; } } };
  const react = {
    useState(initial) { const id = index++; if (!(id in slots)) slots[id] = initial; return [slots[id], value => { slots[id] = typeof value === "function" ? value(slots[id]) : value; dirty = true; }]; },
    useRef(initial) { const id = index++; return slots[id] ??= { current: initial }; },
    useEffect(effect, deps) { const id = index++, previous = slots[id]; if (!previous || !deps || deps.some((value, i) => value !== previous.deps?.[i])) { slots[id] = { deps }; effects.push(() => { previous?.cleanup?.(); slots[id].cleanup = effect(); }); } },
  };
  react.useLayoutEffect = react.useEffect;
  const jsx = (type, props) => ({ type, props });
  const require = id => id === "react" ? react : id === "react/jsx-runtime" ? { jsx, jsxs: jsx } : id.endsWith("design-media-handoff-command") ? commands : id.endsWith("overlays/dialog") ? { StudioDialog: "dialog", StudioDialogActions: "actions" } : id.endsWith("controls/button") ? { StudioButton: "button" } : assert.fail(id);
  const component = new Function("require", "exports", "window", `${code}\nreturn exports.StudioDesignMediaHandoff;`)(require, {}, window);
  const props = { documentId, writable, media: { loadAssetById() { loads++; return loads === 1 ? Promise.resolve(image) : secondLoad ?? Promise.resolve(image); } }, onInsert(...args) { calls.push(args); return true; } };
  return { calls, props, loads: () => loads,
    async flush() { for (let count = 0; count < 20; count++) { if (dirty) { dirty = false; index = 0; tree = component(props); const pending = effects; effects = []; pending.forEach(effect => effect()); } await tick(); if (!dirty) return tree; } assert.fail("Unsettled component"); },
    close() { slots.forEach(slot => slot?.cleanup?.()); },
  };
}
function submit(tree) { descendants(tree).find(node => node.type === "form").props.onSubmit({ preventDefault() {} }); }
for (const action of ["Cancel", "Close", "document switch", "ownership loss"]) {
  test(`${action} invalidates an actual pending handoff handler before mutation`, async () => {
    let resolve; const deferred = new Promise(done => { resolve = done; }); const h = harness({ secondLoad: deferred }); let tree = await h.flush();
    assert.equal(tree.type, "dialog"); submit(tree); tree = await h.flush();
    if (action === "Cancel") descendants(tree).find(node => node.type === "button" && node.props.children === "Cancel").props.onClick();
    else if (action === "Close") tree.props.onClose();
    else h.close(); // The production screen's document/ownership key remounts this owner.
    resolve(image); await h.flush(); assert.deepEqual(h.calls, []);
    h.close();
  });
}
test("actual handoff handler rejects duplicate submission and retains busy feedback", async () => {
  let resolve; const deferred = new Promise(done => { resolve = done; }); const h = harness({ secondLoad: deferred }); let tree = await h.flush();
  submit(tree); submit(tree); tree = await h.flush();
  assert.equal(h.loads(), 2); assert.equal(descendants(tree).find(node => node.type === "button" && node.props.type === "submit").props.disabled, true);
  resolve(image); assert.equal(await h.flush(), null); assert.equal(h.calls.length, 1);
  assert.equal(h.calls[0][0], "one"); h.close();
});
test("rejected insertion preserves the image prompt and permits retry", async () => {
  const h = harness(); h.props.onInsert = () => false; let tree = await h.flush(); submit(tree); tree = await h.flush();
  assert.equal(tree.type, "dialog"); assert.ok(descendants(tree).some(node => node.props?.role === "alert"));
  assert.equal(descendants(tree).find(node => node.type === "button" && node.props.type === "submit").props.disabled, false); h.close();
});
test("read-only mount does not load or show an editable handoff", async () => {
  const h = harness({ writable: false }); assert.equal(await h.flush(), null); assert.equal(h.loads(), 0); h.close();
});
test("screen remounts the handoff on document and ownership changes", async () => {
  const screen = await readFile(new URL("../app/studio/studio-prototype.tsx", import.meta.url), "utf8");
  assert.match(screen, /<StudioDesignMediaHandoff key=\{`\$\{activeDocument.id\}:\$\{writable\}`\}/);
  assert.match(screen, /onSelectBlock: setSelectedBlockId, onInspectorTab: setInspectorTab/);
});
