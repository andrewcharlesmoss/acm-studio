import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";
import { loadProductionModule } from "./production-module.mjs";
const url = new URL("../app/studio/ui/styles/resizable-source-view.tsx", import.meta.url);
const { sourceHeightFromKey } = await loadProductionModule(url);
const drag = await loadProductionModule(new URL("../app/studio/resize-drag.ts", import.meta.url));

test("source height keyboard controls grow downward and clamp the supported range", () => {
  assert.equal(sourceHeightFromKey("ArrowDown", 384), 404);
  assert.equal(sourceHeightFromKey("ArrowUp", 384, true), 304);
  assert.equal(sourceHeightFromKey("ArrowDown", 1190), 1200);
  assert.equal(sourceHeightFromKey("ArrowUp", 185), 180);
  assert.equal(sourceHeightFromKey("Home", 384), 180);
  assert.equal(sourceHeightFromKey("End", 384), 1200);
  assert.equal(sourceHeightFromKey("Tab", 384), null);
});

test("production source view resizes vertically, cancels safely and retains mounted children", () => {
  const slots = []; let cursor = 0;
  const react = { useLayoutEffect() {}, useRef(value) { const i = cursor++; return slots[i] ??= { current: value }; }, useState(value) { const i = cursor++; if (!(i in slots)) slots[i] = value; return [slots[i], next => { slots[i] = next; }]; } };
  const jsx = (type, props) => ({ type, props });
  const require = name => name === "react" ? react : name === "react/jsx-runtime" ? { jsx, jsxs: jsx } : name.endsWith("resize-drag") ? drag : {};
  const code = ts.transpileModule(readFileSync(url, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const { ResizableSourceView } = new Function("require", "exports", `${code}\nreturn exports;`)(require, {});
  const children = [{ type: "formatted" }, { type: "markdown" }];
  const render = () => { cursor = 0; return ResizableSourceView({ children }); };
  const handle = tree => tree.props.children[1].props;
  let tree = render(), props = handle(tree);
  const event = { button: 0, pointerId: 1, clientY: 600, preventDefault() {}, currentTarget: { focus() {}, setPointerCapture() {} } };
  props.onPointerDown(event); props.onPointerMove({ ...event, clientY: 700 });
  tree = render(); assert.equal(handle(tree)["aria-valuenow"], 484);
  assert.equal(tree.props.style["--source-view-height"], "484px");
  assert.equal(tree.props.children[0], children);
  assert.equal(Object.hasOwn(tree.props.style, "width"), false);
  handle(tree).onKeyDown({ key: "Escape", preventDefault() {} }); assert.equal(handle(render())["aria-valuenow"], 384);
  props = handle(render()); props.onPointerDown(event); props.onPointerMove({ ...event, clientY: 750 }); props.onLostPointerCapture();
  props = handle(render()); assert.equal(props["aria-valuenow"], 534);
  props.onPointerDown(event); props.onPointerMove({ ...event, clientY: 800 }); props.onPointerCancel();
  props = handle(render()); assert.equal(props["aria-valuenow"], 534);
  props.onKeyDown({ key: "Home", preventDefault() {} }); assert.equal(handle(render())["aria-valuenow"], 180);
  handle(render()).onKeyDown({ key: "Enter", preventDefault() {} }); assert.equal(handle(render())["aria-valuenow"], 384);
});
