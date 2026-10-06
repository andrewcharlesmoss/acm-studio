import assert from "node:assert/strict";
import { readStudioSource } from "./studio-module-source.mjs";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { loadProductionModule } from "./production-module.mjs";

const { blockSelectionPointerTarget, markBlockSelectionHosts } = await loadProductionModule(new URL("../app/studio/block-selection-dom.ts", import.meta.url));
const bounds = (left, top, right, bottom) => ({ left, top, right, bottom, width: right - left, height: bottom - top });
const element = (id, rect, children = []) => ({ dataset: { studioBlockAnchorId: id }, isConnected: true, getBoundingClientRect: () => rect, contains: node => children.includes(node) });

test("block selection shade remains independent of focus and visible in forced colours", async () => {
  const studioCss = await readFile(new URL("../app/studio/studio.css", import.meta.url), "utf8");
  assert.match(studioCss, /\.has-multi-block-selection \[data-studio-multi-selected="true"\]::after \{[^}]*background: var\(--studio-block-selection-shade\)[^}]*pointer-events: none/);
  assert.doesNotMatch(studioCss, /data-studio-focus-visible[^{}]*data-studio-multi-selected/);
  assert.match(studioCss, /@media \(forced-colors: active\) \{[^}]*data-studio-multi-selected="true"[^}]*outline: 2px solid Highlight/);
});

test("selection paints one canonical host per root and clears duplicate Table and Quote hosts", () => {
  const hosts = [element("table"), element("table"), element("quote"), element("quote"), element("child"), element("other")];
  const canvas = { querySelectorAll: () => hosts };
  markBlockSelectionHosts(canvas, ["table", "quote"]);
  assert.deepEqual(hosts.map(host => host.dataset.studioMultiSelected), ["true", "false", "true", "false", "false", "false"]);
  markBlockSelectionHosts(canvas, ["child", "other"]);
  assert.deepEqual(hosts.map(host => host.dataset.studioMultiSelected), ["false", "false", "false", "false", "true", "true"]);
  markBlockSelectionHosts(canvas, []);
  assert.ok(hosts.every(host => host.dataset.studioMultiSelected === "false"));
});

test("block pointer hit testing includes the gutter, both directions and scaled geometry", () => {
  for (const scale of [1, 2]) {
    const first = element("first", bounds(100 * scale, 50 * scale, 300 * scale, 100 * scale));
    const last = element("last", bounds(100 * scale, 120 * scale, 300 * scale, 180 * scale));
    const canvas = { isConnected: true, getBoundingClientRect: () => bounds(50 * scale, 0, 350 * scale, 300 * scale), querySelectorAll: () => [first, last] };
    assert.equal(blockSelectionPointerTarget(canvas, 80 * scale, 80 * scale).id, "first");
    assert.equal(blockSelectionPointerTarget(canvas, 80 * scale, 160 * scale).id, "last");
    assert.equal(blockSelectionPointerTarget(canvas, 80 * scale, 110 * scale), null);
    assert.equal(blockSelectionPointerTarget(canvas, 40 * scale, 80 * scale), null);
    assert.equal(blockSelectionPointerTarget(canvas, 320 * scale, 80 * scale), null);
  }
});

test("block pointer hit testing selects the deepest owner and ignores detached or empty hosts", () => {
  const child = element("child", bounds(120, 80, 280, 100));
  child.dataset = { studioNestedBlockId: "child" };
  const parent = element("group", bounds(100, 50, 300, 150), [child]);
  const detached = { ...element("detached", bounds(100, 80, 300, 100)), isConnected: false };
  const empty = element("empty", bounds(100, 80, 100, 100));
  const canvas = { isConnected: true, getBoundingClientRect: () => bounds(50, 0, 350, 300), querySelectorAll: () => [parent, child, detached, empty] };
  assert.equal(blockSelectionPointerTarget(canvas, 80, 90).id, "child");
  canvas.isConnected = false;
  assert.equal(blockSelectionPointerTarget(canvas, 80, 90), null);
  assert.equal(blockSelectionPointerTarget(null, 80, 90), null);
});

const source = readStudioSource("app/studio/studio-canvas.tsx");
const ast = ts.createSourceFile("canvas.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const owner = ast.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === "StudioCanvasContent");
function handler(name, scope) {
  let expression;
  function visit(node) {
    if (ts.isJsxAttribute(node) && node.name.getText(ast) === name && !expression) expression = node.initializer.expression;
    ts.forEachChild(node, visit);
  }
  visit(owner);
  runInNewContext(ts.transpileModule(`globalThis.handler = ${expression.getText(ast)}`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, scope);
  return scope.handler;
}

test("actual List pointer handlers select gutter and mixed block endpoints without restoring native text", () => {
  for (const endpoint of ["upper-list", "paragraph", "image", "nested-paragraph"]) {
    const originNode = {}, originEditor = { contains: node => node === originNode };
    const origin = { dataset: { listRootId: "lower-list" }, contains: () => false };
    const gesture = { pointerId: 1, listRoot: origin, listEditor: originEditor, listText: true, blockId: "lower-list", endBlockId: "lower-list", start: { startContainer: originNode }, last: null, active: false };
    let boundary = { id: endpoint, element: { contains: () => false } };
    let selected = [], cleared = 0, focused = 0;
    const scope = { Element: class {}, activeDocument: { blocks: [] }, findBlockById: () => ({ id: endpoint }), blockSelectionPointerTarget: () => boundary, crossBlockSelectionRef: { current: gesture }, document: { elementFromPoint: () => null }, listTextEditor: () => null, listSelectionRoot: editor => editor === originEditor ? origin : null, caretRangeAtPoint: () => null, clearMultiSelection: () => assert.fail("Structural range cleared"), setListTextRange: value => assert.equal(value, null), selectBlockRange: (...ids) => selected.push(ids), applyCrossBlockSelection: () => assert.fail("Restored a native text range in structural mode"), window: { getSelection: () => ({ removeAllRanges: () => cleared++ }), requestAnimationFrame: () => assert.fail("Scheduled stale native range") } };
    const event = { pointerId: 1, buttons: 1, clientX: 80, clientY: 90, preventDefault() {}, currentTarget: { hasPointerCapture: () => true, focus: () => focused++ } };
    handler("onPointerMove", scope)(event);
    assert.equal(gesture.listText, false);
    assert.deepEqual(selected.at(-1), ["lower-list", endpoint]);
    boundary = endpoint === "nested-paragraph" ? { id: "settled-row", element: { contains: () => false } } : null;
    handler("onPointerUp", scope)(event);
    assert.deepEqual(selected.at(-1), ["lower-list", boundary?.id ?? endpoint]);
    assert.equal(scope.crossBlockSelectionRef.current, null);
    assert.equal(cleared, 2); assert.equal(focused, 1);
  }
});

test("actual List pointer handler never selects an ancestor, control or obsolete owner", () => {
  class Element { closest() { return this.control; } }
  const originEditor = {}, origin = { contains: () => false };
  const gesture = { pointerId: 1, listRoot: origin, listEditor: originEditor, listText: true, blockId: "list", endBlockId: "list", active: false };
  let currentTarget = null, valid = true;
  let boundary = { id: "group", element: { contains: node => node === origin } };
  const scope = { Element, activeDocument: { blocks: [] }, findBlockById: () => valid ? {} : null, blockSelectionPointerTarget: () => boundary, crossBlockSelectionRef: { current: gesture }, document: { elementFromPoint: () => currentTarget }, listTextEditor: () => null, listSelectionRoot: editor => editor === originEditor ? origin : null, clearMultiSelection() {}, selectBlockRange: () => assert.fail("Invalid deletion target selected") };
  const event = { pointerId: 1, buttons: 1, currentTarget: {}, clientX: 80, clientY: 90 };
  const move = handler("onPointerMove", scope);
  move(event); assert.equal(gesture.active, false);
  boundary = { id: "obsolete", element: { contains: () => false } }; valid = false;
  move(event); assert.equal(gesture.active, false);
  currentTarget = new Element(); currentTarget.control = {};
  boundary = { id: "other", element: { contains: () => false } }; valid = true;
  move(event); assert.equal(gesture.active, false);
});

test("List release promotes a moved text gesture but never a click, same owner or invalid endpoint", () => {
  for (const scenario of ["inactive", "text-active", "click", "same", "ancestor", "descendant", "obsolete", "control"]) {
    class Element { closest() { return scenario === "control" ? {} : null; } }
    const editor = {}, origin = { contains: () => scenario === "descendant" };
    const gesture = { pointerId: 1, blockId: "lower", endBlockId: "lower", listRoot: origin, listEditor: editor, listText: true, active: scenario === "text-active", pointerStart: { x: 200, y: 180 }, start: null, last: null };
    const selected = [], native = [];
    const boundary = { id: scenario === "same" ? "lower" : "upper", element: { contains: () => scenario === "ancestor" } };
    const scope = { Element, activeDocument: { blocks: [] }, findBlockById: () => scenario === "obsolete" ? null : {}, blockSelectionPointerTarget: () => boundary, crossBlockSelectionRef: { current: gesture }, document: { elementFromPoint: () => new Element() }, listSelectionRoot: candidate => candidate === editor ? origin : null, setListTextRange() {}, selectBlockRange: (...ids) => selected.push(ids), window: { getSelection: () => ({ removeAllRanges: () => native.push("clear") }) }, onSelectBlock() {}, clearMultiSelection() {}, caretRangeAtPoint: () => null, listTextEditor: () => null };
    handler("onPointerUp", scope)({ pointerId: 1, clientX: scenario === "click" ? 202 : 80, clientY: scenario === "click" ? 181 : 90, preventDefault() {}, currentTarget: { focus() {} } });
    assert.deepEqual(selected, ["inactive", "text-active"].includes(scenario) ? [["lower", "upper"]] : []);
    assert.deepEqual(native, ["inactive", "text-active"].includes(scenario) ? ["clear"] : []);
    assert.equal(scope.crossBlockSelectionRef.current, null);
  }
});

test("pending List gestures survive an internal leave and cancel on a real canvas exit", () => {
  const scope = { crossBlockSelectionRef: { current: { pointerId: 1, active: false } } };
  const leave = handler("onPointerLeave", scope);
  const event = { pointerId: 1, clientX: 80, clientY: 90, currentTarget: { getBoundingClientRect: () => bounds(50, 0, 350, 300) } };
  leave(event);
  assert.ok(scope.crossBlockSelectionRef.current);
  leave({ ...event, pointerId: 2, clientX: 40 });
  assert.ok(scope.crossBlockSelectionRef.current);
  leave({ ...event, clientX: 40 });
  assert.equal(scope.crossBlockSelectionRef.current, null);
});

test("same-List item moves followed by a final gutter release select the whole block range", () => {
  const nodes = [{}, {}], editors = nodes.map(node => ({ contains: candidate => candidate === node }));
  const origin = { dataset: { listRootId: "lower" }, contains: node => editors.includes(node) };
  const gesture = { pointerId: 1, listRoot: origin, listEditor: editors[0], listText: true, blockId: "lower", endBlockId: "lower", start: { startContainer: nodes[0] }, last: null, active: false, pointerStart: { x: 200, y: 180 } };
  let pointed = editors[1], boundary = null;
  const selected = [], ranges = [];
  const scope = { Element: class {}, activeDocument: { blocks: [] }, findBlockById: () => ({}), blockSelectionPointerTarget: () => boundary, crossBlockSelectionRef: { current: gesture }, document: { elementFromPoint: () => pointed }, listTextEditor: node => editors.includes(node) ? node : null, listSelectionRoot: candidate => editors.includes(candidate) ? origin : null, caretRangeAtPoint: () => ({ startContainer: nodes[1] }), clearMultiSelection() {}, setListTextRange() {}, selectBlockRange: (...ids) => selected.push(ids), applyCrossBlockSelection: (...range) => ranges.push(range), window: { getSelection: () => ({ removeAllRanges() {} }), requestAnimationFrame: () => assert.fail("Stale text restoration") } };
  const event = { pointerId: 1, buttons: 1, clientX: 200, clientY: 140, preventDefault() {}, currentTarget: { hasPointerCapture: () => true, focus() {} } };
  handler("onPointerMove", scope)(event);
  assert.equal(gesture.listText, true); assert.equal(ranges.length, 1);
  pointed = null;
  boundary = { id: "upper", element: { contains: () => false } };
  handler("onPointerUp", scope)({ ...event, clientX: 80, clientY: 90 });
  assert.deepEqual(selected, [["lower", "upper"]]);
  assert.equal(ranges.length, 1);
});

test("release within a nested List preserves the outer List's native text range", () => {
  const editor = {}, nestedHost = { contains: () => false };
  const origin = { dataset: { listRootId: "outer" }, contains: element => element === nestedHost };
  const start = {}, end = {}, frames = [], restored = [];
  const gesture = { pointerId: 1, listRoot: origin, listEditor: editor, listText: true, blockId: "outer", endBlockId: "outer", start, last: end, active: true, pointerStart: { x: 200, y: 180 } };
  const scope = { Element: class {}, activeDocument: { blocks: [] }, findBlockById: () => ({}), blockSelectionPointerTarget: () => ({ id: "nested", element: nestedHost }), crossBlockSelectionRef: { current: gesture }, document: { elementFromPoint: () => null }, listSelectionRoot: candidate => candidate === editor ? origin : null, listTextEditor: () => null, caretRangeAtPoint: () => null, clearMultiSelection() {}, onSelectBlock: id => assert.equal(id, "outer"), selectBlockRange: () => assert.fail("Nested text became structural"), applyCrossBlockSelection: (...range) => restored.push(range), window: { requestAnimationFrame: fn => frames.push(fn), getSelection: () => ({ removeAllRanges: () => assert.fail("Cleared native nested text") }) } };
  handler("onPointerUp", scope)({ pointerId: 1, clientX: 80, clientY: 90, preventDefault() {}, currentTarget: { focus() {} } });
  assert.equal(gesture.listText, true);
  frames.forEach(fn => fn());
  assert.deepEqual(restored, [[start, end]]);
});

test("active List selection prevents native text drag without intercepting ordinary text or block dragging", () => {
  class Node {}
  const target = new Node(), editor = {};
  let prevented = 0;
  const gesture = { active: true, listRoot: { contains: candidate => candidate === editor } };
  const scope = { Node, crossBlockSelectionRef: { current: gesture }, listTextEditor: node => node === target ? editor : null };
  const drag = handler("onDragStartCapture", scope);
  const event = { target, preventDefault: () => prevented++ };
  drag(event); assert.equal(prevented, 1);
  gesture.active = false; drag(event); assert.equal(prevented, 1);
  gesture.active = true; drag({ ...event, target: new Node() }); assert.equal(prevented, 1);
  scope.crossBlockSelectionRef.current = null; drag(event); assert.equal(prevented, 1);
});
