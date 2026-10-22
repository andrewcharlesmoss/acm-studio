import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";
import { loadProductionModule } from "./production-module.mjs";

const url = new URL("../app/studio/ui/styles/resizable-source-view.tsx", import.meta.url);
const drag = await loadProductionModule(new URL("../app/studio/resize-drag.ts", import.meta.url));

function loadSourceView() {
  const slots = [];
  let cursor = 0;
  const effects = [];
  const observations = [];
  class Observer {
    constructor(callback) { observations.push(callback); }
    observe() {}
    disconnect() {}
  }
  const react = {
    forwardRef: render => props => render(props, null),
    useLayoutEffect(effect) { effects.push(effect); },
    useRef(value) {
      const index = cursor++;
      return slots[index] ??= { current: value };
    },
    useState(value) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = value;
      return [slots[index], next => { slots[index] = next; }];
    },
  };
  const jsx = (type, props) => ({ type, props });
  const require = name => name === "react"
    ? react
    : name === "react/jsx-runtime"
      ? { jsx, jsxs: jsx }
      : name.endsWith("resize-drag") ? drag : {};
  const code = ts.transpileModule(readFileSync(url, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const { ResizableSourceView } = new Function("require", "exports", "ResizeObserver", "MutationObserver", `${code}\nreturn exports;`)(require, {}, Observer, Observer);
  const children = [{ type: "formatted" }, { type: "markdown" }];
  const render = () => {
    cursor = 0;
    return ResizableSourceView({ children });
  };
  return { render, slots, children, runLayout: () => effects[0](), notifyResize: () => observations.forEach(callback => callback()) };
}

function frameOf(tree) {
  return tree.props.children;
}

function handlesOf(tree) {
  return frameOf(tree).props.children[1];
}

function handleOf(tree, edge) {
  return handlesOf(tree).find(handle => handle.props.className.endsWith(`-${edge}`)).props;
}

function pointerEvent(x, y, currentTarget = { focus() {}, setPointerCapture() {} }) {
  return { button: 0, pointerId: 1, clientX: x, clientY: y, preventDefault() {}, currentTarget };
}

test("source view exposes keyboard-accessible resize targets on every edge and corner", () => {
  const { render } = loadSourceView();
  const tree = render();
  const handles = handlesOf(tree);

  assert.equal(handles.length, 8);
  assert.deepEqual(handles.map(handle => handle.props.className.split("-").at(-1)), ["n", "s", "e", "w", "nw", "ne", "sw", "se"]);
  for (const handle of handles) {
    assert.equal(handle.props.type, "button");
    assert.match(handle.props["aria-label"], /^Resize canonical source view from the /);
    assert.ok(handle.props["aria-keyshortcuts"].includes("ArrowLeft"));
  }
});

test("edge and corner pointer drags resize the complete canonical panel and keep the opposite corner anchored", () => {
  const { render, slots, children } = loadSourceView();
  let box = { left: 40, top: 60, width: 800, height: 384 };
  slots[0] = { current: { clientWidth: 900, getBoundingClientRect: () => ({ left: 40, top: 60 }) } };
  slots[1] = { current: { querySelector: () => null, getBoundingClientRect: () => box } };
  slots[3] = { x: 0, y: 0, width: 900, height: 384 };

  let tree = render();
  let props = handleOf(tree, "e");
  const target = { focus() {}, setPointerCapture() {} };
  props.onPointerDown(pointerEvent(840, 250, target));
  props.onPointerMove(pointerEvent(870, 250, target));
  tree = render();
  assert.equal(frameOf(tree).props.style["--source-view-width"], "830px");
  assert.equal(frameOf(tree).props.style["--source-view-height"], "384px");
  assert.equal(frameOf(tree).props.children[0].props.children, children);
  props.onPointerUp();
  props = handleOf(tree, "se");
  box = { left: 40, top: 60, width: 830, height: 384 };
  props.onPointerDown(pointerEvent(870, 444, target));
  props.onPointerMove(pointerEvent(900, 474, target));
  tree = render();
  assert.equal(frameOf(tree).props.style["--source-view-width"], "860px");
  assert.equal(frameOf(tree).props.style["--source-view-height"], "414px");
  assert.equal(frameOf(tree).props.style["--source-view-x"], "0px");
  assert.equal(frameOf(tree).props.style["--source-view-y"], "0px");
});

test("north and west drags clamp the frame to non-negative container coordinates", () => {
  const { render, slots } = loadSourceView();
  let box = { left: 80, top: 60, width: 800, height: 384 };
  slots[0] = { current: { clientWidth: 900, getBoundingClientRect: () => ({ left: 40, top: 60 }) } };
  slots[1] = { current: { querySelector: () => null, getBoundingClientRect: () => box } };
  slots[3] = { x: 0, y: 0, width: 900, height: 384 };
  const target = { focus() {}, setPointerCapture() {} };

  let tree = render();
  let props = handleOf(tree, "w");
  props.onPointerDown(pointerEvent(80, 200, target));
  props.onPointerMove(pointerEvent(-1000, 200, target));
  tree = render();
  assert.equal(frameOf(tree).props.style["--source-view-x"], "0px");
  assert.equal(frameOf(tree).props.style["--source-view-width"], "840px");
  props.onPointerUp();

  box = { left: 40, top: 100, width: 840, height: 384 };
  props = handleOf(tree, "n");
  props.onPointerDown(pointerEvent(400, 100, target));
  props.onPointerMove(pointerEvent(400, -1000, target));
  tree = render();
  assert.equal(frameOf(tree).props.style["--source-view-y"], "0px");
  assert.equal(frameOf(tree).props.style["--source-view-height"], "424px");
});

test("keyboard resizing follows the focused edge and Enter restores responsive sizing", () => {
  const { render, slots } = loadSourceView();
  slots[3] = { x: 0, y: 0, width: 800, height: 384 };
  let tree = render();
  handleOf(tree, "w").onKeyDown({ key: "ArrowRight", preventDefault() {} });
  tree = render();
  assert.equal(frameOf(tree).props.style["--source-view-x"], "20px");
  assert.equal(frameOf(tree).props.style["--source-view-width"], "780px");
  handleOf(tree, "w").onKeyDown({ key: "Home", preventDefault() {} });
  tree = render();
  assert.equal(frameOf(tree).props.style["--source-view-width"], "320px");
  assert.equal(frameOf(tree).props.style["--source-view-height"], "180px");
  handleOf(tree, "w").onKeyDown({ key: "Enter", preventDefault() {} });
  tree = render();
  assert.equal(frameOf(tree).props.style, undefined);
});

test("pointer cancellation restores the previous size while pointer capture loss keeps the current size", () => {
  const { render, slots } = loadSourceView();
  let box = { left: 0, top: 0, width: 800, height: 384 };
  slots[0] = { current: { clientWidth: 900, getBoundingClientRect: () => ({ left: 0, top: 0 }) } };
  slots[1] = { current: { querySelector: () => null, getBoundingClientRect: () => box } };
  const target = { focus() {}, setPointerCapture() {} };

  let tree = render();
  let props = handleOf(tree, "s");
  props.onPointerDown(pointerEvent(500, 384, target));
  props.onPointerMove(pointerEvent(500, 404, target));
  props = handleOf(render(), "s");
  assert.equal(props["aria-label"].includes("404 pixels high"), true);
  props.onPointerCancel();
  assert.equal(frameOf(render()).props.style, undefined);

  props = handleOf(render(), "s");
  props.onPointerDown(pointerEvent(500, 384, target));
  props.onPointerMove(pointerEvent(500, 414, target));
  props = handleOf(render(), "s");
  props.onLostPointerCapture();
  tree = render();
  assert.equal(frameOf(tree).props.style["--source-view-height"], "414px");
});


test("minimum panel height preserves the controls and a usable source viewport", () => {
  const { render, slots } = loadSourceView();
  slots[0] = { current: { clientWidth: 900, getBoundingClientRect: () => ({ left: 0, top: 0 }) } };
  slots[1] = { current: {
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 650 }),
    querySelector: selector => selector === ".source-view-content"
      ? { scrollHeight: 616, clientHeight: 616 }
      : { clientHeight: 384 },
  } };
  slots[3] = { x: 0, y: 0, width: 900, height: 650 };
  let tree = render();
  handleOf(tree, "s").onKeyDown({ key: "Home", preventDefault() {} });
  tree = render();
  assert.equal(frameOf(tree).props.style["--source-view-height"], "446px");
  assert.equal(frameOf(tree).props.children[0].props.className, "source-view-content");
});

test("both editors place the resize boundary around the complete canonical inspector", () => {
  for (const [file, className] of [["interface-style-inspection.tsx", "interface-style-inspector"], ["style-guide-sandbox.tsx", "sg-guide-panel"]]) {
    const source = readFileSync(new URL(`../app/studio/ui/styles/${file}`, import.meta.url), "utf8");
    assert.match(source, new RegExp(`<ResizableSourceView[^>]*className="${className}"`));
    assert.equal((source.match(/<ResizableSourceView[\s>]/g) ?? []).length, 1);
    assert.match(source, /<div className="sg-guide-views"/);
  }
});


test("layout observation raises the minimum after narrow chrome reflow and keeps resized boxes in a narrower host", () => {
  const { render, slots, runLayout, notifyResize } = loadSourceView();
  const host = { clientWidth: 979, getBoundingClientRect: () => ({ left: 0, top: 0 }) };
  const content = { scrollHeight: 687, clientHeight: 687, children: [] };
  const source = { clientHeight: 180 };
  const box = { left: 0, top: 0, width: 979, height: 721 };
  slots[0] = { current: host };
  slots[1] = { current: {
    getBoundingClientRect: () => box,
    querySelector: selector => selector === ".source-view-content" ? content : source,
  } };
  let tree = render();
  runLayout();
  tree = render();
  handleOf(tree, "s").onKeyDown({ key: "Home", preventDefault() {} });
  tree = render();
  assert.equal(frameOf(tree).props.style["--source-view-width"], "320px");
  assert.equal(frameOf(tree).props.style["--source-view-height"], "721px");
  // The same observer runs after Home, a pointer width resize, or host reflow.
  content.scrollHeight = 916;
  box.width = 320;
  notifyResize();
  tree = render();
  assert.equal(frameOf(tree).props.style["--source-view-height"], "950px");
  assert.equal(Number.parseFloat(frameOf(tree).props.style["--source-view-height"]) - 34 - (916 - 180), 180);
  slots[2] = { x: 659, y: 0, width: 320, height: 721 };
  host.clientWidth = 390;
  notifyResize();
  tree = render();
  assert.equal(frameOf(tree).props.style["--source-view-x"], "70px");
  assert.equal(frameOf(tree).props.style["--source-view-width"], "320px");
});
