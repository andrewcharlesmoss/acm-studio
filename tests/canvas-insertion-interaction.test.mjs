import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import test from "node:test";
import React from "react";
import ts from "typescript";
import { blockInsertionGap, nearestInsertionBoundary } from "../app/studio/block-insertion-gap.ts";

function productionFunction(path, name, scope) {
  const source = readFileSync(process.env[`STUDIO_INSERTION_${name}`] || new URL(path, import.meta.url), "utf8");
  const ast = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const fn = ast.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === name);
  assert.ok(fn);
  const code = ts.transpileModule(`${fn.getText(ast).replace(/^export /, "")}; globalThis.result=${name}`, { compilerOptions: { jsx: ts.JsxEmit.React, target: ts.ScriptTarget.ES2022 } }).outputText;
  runInNewContext(code, scope);
  return scope.result;
}

test("production gap hook activates one nearest nested boundary, holds open chooser and cleans up", () => {
  const handlers = new Map();
  const surface = { active: false, setAttribute() { this.active = true; }, removeAttribute() { this.active = false; } };
  const ownerDocument = { activeElement: null };
  const canvas = { ownerDocument, querySelector: () => surface, querySelectorAll: selector => selector === ".between-blocks" ? buttons : [],
    addEventListener: (name, callback) => handlers.set(name, callback), removeEventListener: name => handlers.delete(name) };
  const button = (y, depth) => {
    let parent = canvas;
    for (let i = 0; i < depth; i++) parent = { parentElement: parent };
    const position = { y };
    return { position, querySelector: () => ({ getBoundingClientRect: () => ({ left: 288, right: 312, top: position.y - 12, bottom: position.y + 12 }) }), dataset: {}, disabled: false, hidden: false, parentElement: parent, open: false,
      getBoundingClientRect: () => ({ left: 100, right: 500, width: 400, top: position.y - 3, height: 6 }),
      getAttribute(name) { return name === "aria-expanded" && this.open ? "true" : "false"; } };
  };
  const root = button(200, 1), nested = button(200, 4), next = button(220, 4);
  const buttons = [root, nested, next];
  let cleanup;
  const scope = { blockInsertionGap, nearestInsertionBoundary, useRef: value => ({ current: value }),
    useLayoutEffect: callback => { cleanup = callback(); }, ResizeObserver: class { observe() {} disconnect() {} } };
  productionFunction("../app/studio/use-block-insertion-gaps.ts", "useBlockInsertionGaps", scope)({ current: canvas });
  const move = (x, y) => handlers.get("pointermove")({ clientX: x, clientY: y });
  move(300, 200);
  assert.equal(nested.dataset.activeInsertion, "true");
  assert.equal(root.dataset.activeInsertion, undefined);
  assert.equal(surface.active, true);
  // Both halves of the visible24px plus remain inside the same hover corridor.
  for (const y of [189, 211]) { handlers.get("pointermove")({ clientX: 300, clientY: y, target: { closest: () => nested } }); assert.equal(nested.dataset.activeInsertion, "true"); }
  nested.position.y = 400;
  handlers.get("scroll")();
  assert.equal(nested.dataset.activeInsertion, undefined, "Scroll releases an icon that moved away from the parked pointer");
  nested.position.y = 200;
  ownerDocument.activeElement = root;
  handlers.get("focusin")();
  assert.equal(root.dataset.activeInsertion, "true", "Keyboard focus takes authority over a parked pointer");
  assert.equal(nested.dataset.activeInsertion, undefined);
  nested.open = true;
  move(300, 220);
  assert.equal(nested.dataset.activeInsertion, "true");
  assert.equal(next.dataset.activeInsertion, undefined);
  nested.open = false;
  move(300, 220);
  assert.equal(next.dataset.activeInsertion, "true");
  assert.equal(nested.dataset.activeInsertion, undefined);
  move(300, 260);
  assert.ok(buttons.every(item => item.dataset.activeInsertion === undefined));
  assert.equal(surface.active, false);
  ownerDocument.activeElement = root;
  handlers.get("pointerleave")();
  assert.equal(root.dataset.activeInsertion, "true");
  cleanup();
  assert.equal(handlers.size, 0);
  assert.equal(surface.active, false);
});

test("canonical plus owns pointer/focus/click without preventing native button activation", () => {
  const calls = [];
  const scope = { React, useId: () => "plus", useContext: () => null, CanvasInserterAnchorContext: null, InserterToggleIcon: () => null };
  const Button = productionFunction("../app/studio/controls/canvas-inserter-button.tsx", "CanvasInserterButton", scope);
  const element = Button({ frameIcon: true, onPointerDown: () => calls.push("pointer"), onFocus: () => calls.push("focus"), onClick: () => calls.push("open") });
  assert.equal(element.props["data-studio-canvas-inserter"], "true");
  let stopped = 0;
  const event = { stopPropagation() { stopped++; }, preventDefault() { assert.fail("Native focus/keyboard activation must remain available"); } };
  element.props.onPointerDown(event); element.props.onFocus(event); element.props.onClick(event);
  assert.deepEqual(calls, ["pointer", "focus", "open"]);
  assert.equal(stopped, 3);
});

test("actual canvas selection capture and block pointer/focus handlers leave inserter selection unchanged", () => {
  const source = readFileSync(process.env.STUDIO_INSERTION_CANVAS || new URL("../app/studio/studio-canvas.tsx", import.meta.url), "utf8");
  const ast = ts.createSourceFile("canvas.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const callbacks = [];
  function visit(node) {
    if (ts.isJsxAttribute(node) && ["onPointerDownCapture", "onPointerDown", "onFocusCapture"].includes(node.name.getText(ast)) && node.initializer?.expression) {
      const callback = node.initializer.expression.getText(ast);
      if (callback.includes('[data-studio-canvas-inserter]')) callbacks.push(callback);
    }
    ts.forEachChild(node, visit);
  }
  visit(ast);
  assert.equal(callbacks.length, 3);
  class Element { closest(selector) { return selector === "[data-studio-canvas-inserter]" ? this : null; } }
  const target = new Element();
  for (const callback of callbacks) {
    let selection = "existing";
    const scope = { Element, Node: Element, crossBlockSelectionRef: { current: null }, selectBlockBoundary: id => { selection = id; },
      onSelectBlock: id => { selection = id; }, event: { target, currentTarget: { contains: () => true } } };
    runInNewContext(ts.transpileModule(`(${callback})(event)`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, scope);
    assert.equal(selection, "existing");
  }
});
