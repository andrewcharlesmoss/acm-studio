import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";
import { loadProductionModule } from "./production-module.mjs";
const url = new URL("../app/studio/ui/styles/canonical-source-resizer.tsx", import.meta.url);
const { sourceWidthFromKey } = await loadProductionModule(url);
const drag = await loadProductionModule(new URL("../app/studio/resize-drag.ts", import.meta.url));

test("source width keyboard controls expand left, clamp bounds and preserve unrelated keys", () => {
  assert.equal(sourceWidthFromKey("ArrowLeft", 400, 320, 800), 410);
  assert.equal(sourceWidthFromKey("ArrowRight", 400, 320, 800, true), 360);
  assert.equal(sourceWidthFromKey("ArrowLeft", 790, 320, 800, true), 800);
  assert.equal(sourceWidthFromKey("Home", 400, 320, 800), 320);
  assert.equal(sourceWidthFromKey("End", 400, 320, 800), 800);
  assert.equal(sourceWidthFromKey("Tab", 400, 320, 800), null);
});

test("production source resizer supports dragging, cancellation, capture loss and reset", () => {
  const slots = []; let cursor = 0;
  const react = { useLayoutEffect() {}, useRef(value) { const i = cursor++; return slots[i] ??= { current: value }; }, useState(value) { const i = cursor++; if (!(i in slots)) slots[i] = value?.width ? { width: 400, available: 1280 } : value; return [slots[i], next => { slots[i] = next; }]; } };
  const jsx = (type, props) => ({ type, props });
  const require = name => name === "react" ? react : name === "react/jsx-runtime" ? { jsx, jsxs: jsx } : name.endsWith("resize-drag") ? drag : {};
  const code = ts.transpileModule(readFileSync(url, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const { CanonicalSourceResizer } = new Function("require", "exports", `${code}\nreturn exports;`)(require, {});
  const render = () => { cursor = 0; return CanonicalSourceResizer({ remainingWidth: 480 }).props; };
  let props = render();
  const target = { focus() {}, setPointerCapture() {} };
  const event = { button: 0, pointerId: 1, clientX: 600, preventDefault() {}, currentTarget: target };
  props.onPointerDown(event); props.onPointerMove({ ...event, clientX: 500 });
  props = render(); assert.equal(props["aria-valuenow"], 500);
  props.onKeyDown({ key: "Escape", preventDefault() {} });
  props = render(); assert.equal(props["aria-valuenow"], 400);
  props.onPointerDown(event); props.onPointerMove({ ...event, clientX: 300 }); props.onLostPointerCapture();
  props = render(); assert.equal(props["aria-valuenow"], 700);
  props.onPointerDown(event); props.onPointerMove({ ...event, clientX: 400 }); props.onPointerCancel();
  props = render(); assert.equal(props["aria-valuenow"], 700);
  props.onDoubleClick(); props = render(); assert.equal(props["aria-valuenow"], 400);
  props.onKeyDown({ key: "End", preventDefault() {} }); props = render(); assert.equal(props["aria-valuenow"], 800);
  props.onKeyDown({ key: "Enter", preventDefault() {} }); assert.equal(render()["aria-valuenow"], 400);
});
