import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

const source = readFileSync(new URL("../app/studio/use-studio-screen-navigation.ts", import.meta.url), "utf8");
const code = ts.transpileModule(source.replace(/^import .*;\n/gm, ""), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;

// Exercise the production hook's subscriptions with an in-memory event target.
// Native browser focus and key delivery remain a separate verification boundary.
function fixture(overrides = {}, search = "", { modal = false } = {}) {
  const listeners = new Map(), cleanups = [], microtasks = [], calls = [], historyCalls = [];
  const window = { location: { pathname: "/studio", search }, addEventListener(type, listener) { listeners.set(type, listener); },
    dispatchEvent(event) { listeners.get(event.type)?.(event); },
    history: { state: {}, replaceState(state) { this.state = state; },
      pushState(state, _title, path) { this.state = state; const url = new URL(path, "http://localhost"); window.location.search = url.search; historyCalls.push(["push", path]); },
      go(delta) { historyCalls.push(["go", delta]); } },
    removeEventListener(type, listener) { if (listeners.get(type) === listener) listeners.delete(type); } };
  const useEffect = effect => cleanups.push(effect());
  const document = { querySelector(selector) { assert.equal(selector, "dialog[open]"); return modal ? {} : null; } };
  const navigationModule = new Function("exports", "useEffect", "useEffectEvent", "useRef", "window", "document", "queueMicrotask", `${code}\nreturn exports;`)({}, useEffect, callback => callback, current => ({ current }), window, document, callback => microtasks.push(callback));
  navigationModule.useStudioScreenNavigation({ studioSection: "content", previewWindow: false, activeDocument: { kind: "post" }, confirmCodeEditorDiscard: () => true,
    publishing: { publish: () => calls.push(["publish"]) },
    ...Object.fromEntries(["setStudioSection", "setLibraryKind", "setPreviewing", "setTemplateTarget", "setShowInserter", "setDocumentFieldSelection", "setSelectedBlockId"].map(name => [name, value => calls.push([name, value])])), ...overrides });
  return { calls, historyCalls, listeners, window, write: navigationModule.writeStudioNavigation,
    pop(search, index) {
      window.location.search = search; window.history.state = index === undefined ? {} : { studioNavigationIndex: index };
      let stopped = false; listeners.get("popstate")({ state: window.history.state, stopImmediatePropagation() { stopped = true; } }); return stopped;
    },
    flush() { microtasks.splice(0).forEach(callback => callback()); },
    cleanup() { cleanups.forEach(cleanup => cleanup?.()); },
    key(key, modifiers = {}) { let prevented = false; listeners.get("keydown")({ key, ...modifiers, preventDefault() { prevented = true; } }); return prevented; } };
}

for (const modifier of ["metaKey", "ctrlKey"]) {
  test(`${modifier} Save publishes the active content post and prevents browser Save`, () => {
    const h = fixture(); assert.equal(h.key("s", { [modifier]: true }), true);
    assert.deepEqual(h.calls, [["publish"]]); h.cleanup(); assert.equal(h.listeners.size, 0);
  });
}

test("Save remains inactive in page, template, Files, Bin and read-only preview screens", () => {
  for (const overrides of [{ activeDocument: { kind: "page" } }, { studioSection: "templates" }, { studioSection: "files" }, { studioSection: "bin" }, { previewWindow: true }]) {
    const h = fixture(overrides); assert.equal(h.key("s", { metaKey: true }), false); assert.deepEqual(h.calls, []); h.cleanup();
  }
});

test("Escape dismisses content selection while Undo keys stay with the history owner", () => {
  const h = fixture(); assert.equal(h.key("z", { metaKey: true }), false); assert.deepEqual(h.calls, []);
  assert.equal(h.key("Escape"), false);
  assert.deepEqual(h.calls, [["setShowInserter", false], ["setDocumentFieldSelection", null], ["setSelectedBlockId", null]]);
});

test("claimed and composing shortcuts preserve the menu's selection and action owner", () => {
  for (const state of [{ defaultPrevented: true }, { isComposing: true }]) {
    const h = fixture();
    assert.equal(h.key("Escape", state), false);
    assert.equal(h.key("s", { metaKey: true, ...state }), false);
    assert.deepEqual(h.calls, []);
  }
});

test("native modal Escape and Save leave its draft and underlying selection intact", () => {
  const h = fixture({}, "", { modal: true });
  assert.equal(h.key("Escape"), false);
  assert.equal(h.key("s", { ctrlKey: true }), false);
  assert.deepEqual(h.calls, []);
});

test("initial template and Bin URLs select their existing screen owners", () => {
  const templates = fixture({}, "?mode=templates"); templates.flush();
  assert.deepEqual(templates.calls, [["setTemplateTarget", { setId: null, targetId: null }], ["setStudioSection", "templates"], ["setLibraryKind", "templates"]]);
  const bin = fixture({}, "?mode=bin"); bin.flush(); assert.deepEqual(bin.calls, [["setTemplateTarget", { setId: null, targetId: null }], ["setStudioSection", "bin"]]);
  const content = fixture(); content.flush(); assert.deepEqual(content.calls, [["setTemplateTarget", { setId: null, targetId: null }], ["setLibraryKind", "post"]]);
});

test("Back and Forward synchronise the screen and leave Preview", () => {
  const h = fixture(); h.pop("?mode=templates&set=example&target=one", 1);
  assert.deepEqual(h.calls, [["setStudioSection", "templates"], ["setTemplateTarget", { setId: "example", targetId: "one" }], ["setLibraryKind", "templates"], ["setPreviewing", false]]);
  h.calls.length = 0; h.pop("?mode=templates&set=example&target=two", 2);
  assert.deepEqual(h.calls[1], ["setTemplateTarget", { setId: "example", targetId: "two" }]);
  h.calls.length = 0; h.pop("", 0);
  assert.deepEqual(h.calls, [["setStudioSection", "content"], ["setTemplateTarget", { setId: null, targetId: null }], ["setLibraryKind", "post"], ["setPreviewing", false]]);
});

test("unmounted and read-only preview initialisation do not change screens", () => {
  const unmounted = fixture({}, "?mode=templates"); unmounted.cleanup(); unmounted.flush(); assert.deepEqual(unmounted.calls, []);
  const preview = fixture({ previewWindow: true }, "?mode=templates"); preview.flush(); assert.deepEqual(preview.calls, []);
  preview.pop("?mode=templates"); assert.deepEqual(preview.calls, []);
});

test("mode URLs retain encoded template targets and avoid duplicate entries", () => {
  const calls = [], location = { pathname: "/studio", search: "" };
  const window = { location, dispatchEvent() {}, history: { state: {}, replaceState(state) { this.state = state; }, pushState(state, _title, path) {
    this.state = state;
    calls.push(path); const url = new URL(path, "http://localhost"); location.pathname = url.pathname; location.search = url.search;
  } } };
  const write = new Function("exports", "window", `${code}\nreturn exports.writeStudioNavigation;`)({}, window);
  write("templates", { setId: "set / one", targetId: "part & two" });
  const query = new URLSearchParams(location.search);
  assert.equal(query.get("mode"), "templates"); assert.equal(query.get("set"), "set / one"); assert.equal(query.get("target"), "part & two");
  write("templates", { setId: "set / one", targetId: "part & two" }); assert.equal(calls.length, 1);
  write("content"); assert.equal(calls.at(-1), "/studio"); assert.equal(location.search, "");
  write("bin"); assert.equal(calls.at(-1), "/studio?mode=bin");
  write("templates"); assert.equal(calls.at(-1), "/studio?mode=templates");
});

test("refused Back and Forward keep the draft mounted and restore the accepted history entry", () => {
  for (const direction of ["back", "forward"]) {
    let confirmations = 0;
    const h = fixture({ confirmCodeEditorDiscard: () => { confirmations++; return false; } });
    h.write("templates"); h.write("content");
    h.calls.length = 0; h.historyCalls.length = 0;
    const index = direction === "back" ? 1 : 3;
    assert.equal(h.pop("?mode=templates", index), true);
    assert.deepEqual(h.calls, []);
    assert.deepEqual(h.historyCalls, [["go", 2 - index]]);
    assert.equal(h.pop("", 2), true);
    assert.deepEqual(h.calls, []);
    assert.equal(confirmations, 1, "restoration must not ask to discard again");
  }
});

test("accepted dirty-code history navigation projects the target after confirmation", () => {
  let confirmations = 0;
  const h = fixture({ confirmCodeEditorDiscard: () => { confirmations++; return true; } });
  assert.equal(h.pop("?mode=templates&set=chosen&target=header", 1), false);
  assert.equal(confirmations, 1);
  assert.deepEqual(h.calls[1], ["setTemplateTarget", { setId: "chosen", targetId: "header" }]);
  assert.deepEqual(h.historyCalls, []);
});

test("refused legacy history restores the current URL without changing draft state", () => {
  const h = fixture({ confirmCodeEditorDiscard: () => false });
  h.write("templates"); h.write("content"); h.historyCalls.length = 0;
  assert.equal(h.pop("?mode=templates"), true);
  assert.deepEqual(h.historyCalls, [["push", "/studio"]]);
  assert.deepEqual(h.calls, []);
  assert.equal(h.window.location.search, "");
});
