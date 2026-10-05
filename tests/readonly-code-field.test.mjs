import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { loadProductionModule } from "./production-module.mjs";

const { BlockField } = await loadProductionModule(new URL("../app/studio/studio-canvas.tsx", import.meta.url));
const source = await readFile(new URL("../app/studio/studio-canvas.tsx", import.meta.url), "utf8");
const syntax = ts.createSourceFile("studio-canvas.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const handlers = [];
function inspect(node, owner = "") {
  if (ts.isFunctionDeclaration(node)) owner = node.name?.text ?? owner;
  if (ts.isJsxAttribute(node) && node.name.getText(syntax) === "onChange" && ["CodeEditor", "BlockFieldContent"].includes(owner)) {
    const callback = node.initializer?.expression;
    if (callback && callback.getText(syntax).includes("if (writable)")) handlers.push(callback.getText(syntax));
  }
  ts.forEachChild(node, child => inspect(child, owner));
}
inspect(syntax);

for (const writable of [true, false]) {
  for (const control of ["text", "select", "code"]) test(`${control} advertises writable=${writable} with native semantics`, () => {
    const block = control === "code"
      ? { id: "code", type: "code", code: "const value = 1;", language: "javascript" }
      : { id: "field", type: "field", label: "Value", control, value: "First", options: ["First", "Second"] };
    const html = renderToStaticMarkup(createElement(BlockField, { block, writable, onChange() {}, onTableCellFocus() {}, onTextSelection() {}, onLinkActivate() {} }));
    const tag = control === "code" ? "textarea" : control === "select" ? "select" : "input";
    const element = html.match(new RegExp(`<${tag}\\b[^>]*>`))?.[0];
    assert.ok(element);
    const state = control === "select" ? /disabled=""/ : /readOnly=""/i;
    if (writable) assert.doesNotMatch(element, state);
    else assert.match(element, state);
    assert.match(html, control === "code" ? /const value = 1;/ : /First/);
  });
  test(`actual Code and Field handlers enforce writable=${writable}`, () => {
    assert.equal(handlers.length, 3, "Code, select Field and text Field callbacks are included");
    for (const handler of handlers) {
      const writes = [];
      const scope = { writable, block: { id: "field", type: "field", value: "First" }, onChange(next) { writes.push(next); } };
      runInNewContext(ts.transpileModule(`const change = ${handler}; change({target:{value:"Second"}});`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, scope);
      assert.equal(writes.length, writable ? 1 : 0);
    }
  });
}
