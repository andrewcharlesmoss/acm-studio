import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { loadProductionModule } from "./production-module.mjs";

const { BlockField, StudioCanvas } = await loadProductionModule(new URL("../app/studio/studio-canvas.tsx", import.meta.url));
const source = await readFile(new URL("../app/studio/studio-canvas.tsx", import.meta.url), "utf8");
const syntax = ts.createSourceFile("studio-canvas.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const callbacks = new Map();
const functions = new Map();
function inspect(node, owner = "") {
  if (ts.isFunctionDeclaration(node)) {
    owner = node.name?.text ?? owner;
    functions.set(owner, node.getText(syntax));
  }
  if (ts.isJsxAttribute(node) && node.initializer && ts.isJsxExpression(node.initializer) && node.initializer.expression) {
    const text = node.initializer.expression.getText(syntax);
    const name = node.name.getText(syntax);
    if (owner === "NestedBlockAppender" && name === "onClick" || owner === "BlockInserter" && (name === "onClick" && text.includes("onInsert") || name === "onDragStart") || owner === "StudioCanvasContent" && name === "onInsert" && text.includes("writableRef.current")) callbacks.set(`${owner}:${name}`, text);
  }
  ts.forEachChild(node, child => inspect(child, owner));
}
inspect(syntax);

function invoke(text, scope, args = []) {
  assert.ok(text, "Actual production handler must be present");
  return runInNewContext(ts.transpileModule(`(${text})(...args)`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, { ...scope, args });
}

for (const type of ["group", "section", "column"]) {
  for (const writable of [true, false]) {
    for (const callbackAvailable of [true, false]) test(`${type} appender advertises writable=${writable}, callback=${callbackAvailable}`, () => {
      const block = { id: "parent", type, layout: "stack", children: [{ id: "child", type: "paragraph", text: "Existing child" }] };
      const html = renderToStaticMarkup(createElement(BlockField, { block, writable, onOpenNestedInserter: callbackAvailable ? () => {} : undefined, onChange() {}, onTableCellFocus() {}, onTextSelection() {}, onLinkActivate() {} }));
      const button = html.match(/<button\b[^>]*class="nested-add-block"[^>]*>/)?.[0];
      assert.ok(button);
      if (writable && callbackAvailable) assert.doesNotMatch(button, /disabled/);
      else assert.match(button, /disabled=""/);
    });
  }
}

test("shared appender guards activation and retains the intended parent", () => {
  for (const writable of [true, false]) {
    const calls = [];
    invoke(callbacks.get("NestedBlockAppender:onClick"), { writable, parentId: "column-two", onOpen: id => calls.push(id) });
    assert.deepEqual(calls, writable ? ["column-two"] : []);
    invoke(callbacks.get("NestedBlockAppender:onClick"), { writable, parentId: "column-two", onOpen: undefined });
  }
});

test("move and removal locks do not disable permitted child insertion", () => {
  const block = { id: "parent", type: "group", layout: "stack", children: [], editorial: { lock: { move: true, remove: true } } };
  const html = renderToStaticMarkup(createElement(BlockField, { block, writable: true, onOpenNestedInserter() {}, onChange() {}, onTableCellFocus() {}, onTextSelection() {}, onLinkActivate() {} }));
  assert.doesNotMatch(html.match(/<button\b[^>]*class="nested-add-block"[^>]*>/)?.[0] ?? "missing", /disabled/);
});

for (const writable of [true, false]) test(`open Library retains browsing with writable=${writable}`, () => {
  const html = renderToStaticMarkup(createElement(StudioCanvas, {
    activeDocument: { id: "example", kind: "post", title: "Example", blocks: [] }, writable,
    previewing: false, showInserter: true, inserterQuery: "", selectedBlockId: null,
    filteredBlocks: [{ type: "paragraph", group: "Text", label: "Paragraph", description: "A paragraph" }],
    mediaBlockUrls: {}, linkTargets: [], wordCount: 0, characterCount: 0,
  }));
  const tile = html.match(/<button\b[^>]*title="A paragraph"[^>]*>/)?.[0];
  assert.ok(tile);
  assert.match(tile, new RegExp(`draggable="${writable}"`));
  if (writable) assert.doesNotMatch(tile, /disabled/);
  else assert.match(tile, /disabled=""/);
  assert.doesNotMatch(html.match(/<input\b[^>]*aria-label="Search blocks"[^>]*>/)?.[0] ?? "missing", /disabled/);
  assert.doesNotMatch(html.match(/<button\b[^>]*aria-label="Close block library"[^>]*>/)?.[0] ?? "missing", /disabled/);
});

test("actual Library activation and drag handlers refuse read-only events", () => {
  for (const writable of [true, false]) {
    const calls = [];
    invoke(callbacks.get("BlockInserter:onClick"), { writable, item: { type: "paragraph" }, onInsert: type => calls.push(["insert", type]) });
    const dataTransfer = { setData: (...args) => calls.push(["data", ...args]) };
    invoke(callbacks.get("BlockInserter:onDragStart"), { writable, item: { type: "paragraph" }, onDragStart: type => calls.push(["drag", type]) }, [{ dataTransfer, preventDefault: () => calls.push(["prevent"]) }]);
    assert.deepEqual(calls, writable ? [["insert", "paragraph"], ["data", "application/x-acm-studio-block", "paragraph"], ["drag", "paragraph"]] : [["prevent"]]);
  }
});

test("Canvas dispatch uses current writable availability for content and template tiles", () => {
  for (const current of [true, false]) for (const type of ["paragraph", "template-content"]) {
    const calls = [];
    invoke(callbacks.get("StudioCanvasContent:onInsert"), { writableRef: { current }, inserterParentId: "target-parent", onInsertTemplateContent: (...args) => calls.push(["template", ...args]), onInsertBlock: (...args) => calls.push(["content", ...args]) }, [type]);
    assert.equal(calls.length, current ? 1 : 0);
    if (current) assert.deepEqual(calls[0].slice(0, 3), type === "template-content" ? ["template", null, "target-parent"] : ["content", "paragraph", "target-parent"]);
  }
});

test("Canvas refuses opening, drag start and drop insertion before transient changes", () => {
  const scope = { writableRef: { current: false } };
  for (const name of ["openInserter", "beginBlockDrag", "insertLibraryBlockAt"]) {
    // No setters or commands are supplied: reaching one would fail the test.
    invoke(functions.get(name), scope, name === "openInserter" ? [null] : name === "beginBlockDrag" ? ["paragraph"] : ["paragraph", 0]);
  }
});

for (const writable of [true, false]) test(`cover and between-block appenders advertise writable=${writable}`, () => {
  const html = renderToStaticMarkup(createElement(StudioCanvas, {
    activeDocument: { id: "example", kind: "post", title: "Example", blocks: [{ id: "one", type: "paragraph", text: "First" }, { id: "two", type: "paragraph", text: "Second" }] },
    writable, previewing: false, showCoverImage: true, coverImageUrl: "/example.png", selectedBlockId: null,
    mediaBlockUrls: {}, linkTargets: [], wordCount: 0, characterCount: 0,
  }));
  const appenders = [...html.matchAll(/<button\b[^>]*class="between-blocks(?: cover-inserter)?"[^>]*>/g)].map(match => match[0]);
  assert.equal(appenders.length, 2);
  for (const button of appenders) if (writable) assert.doesNotMatch(button, /disabled/); else assert.match(button, /disabled=""/);
  const input = html.match(/<input\b[^>]*aria-label="Type \/ to choose a block"[^>]*>/)?.[0];
  assert.ok(input);
  if (writable) assert.doesNotMatch(input, /disabled/); else assert.match(input, /disabled=""/);
});

test("end-appender focus, typing and keyboard handlers refuse unavailable editing before transient changes", () => {
  let attributes;
  function visit(node) {
    if (ts.isJsxSelfClosingElement(node) && node.tagName.getText(syntax) === "input"
      && node.attributes.properties.some(attribute => ts.isJsxAttribute(attribute) && attribute.name.getText(syntax) === "aria-label" && attribute.initializer?.getText(syntax) === '"Type / to choose a block"')) attributes = node.attributes.properties;
    ts.forEachChild(node, visit);
  }
  visit(syntax);
  assert.ok(attributes);
  for (const name of ["onFocus", "onChange", "onKeyDown"]) {
    const attribute = attributes.find(node => ts.isJsxAttribute(node) && node.name.getText(syntax) === name);
    // Supplying no setters or commands makes any unguarded transient change fail.
    invoke(attribute.initializer.expression.getText(syntax), { writableRef: { current: false } }, [{}]);
  }
});

test("inactive end-appender click retains typed text when editing becomes unavailable", () => {
  let handler;
  function visit(node) {
    if (ts.isJsxOpeningElement(node) && node.attributes.properties.some(attribute => ts.isJsxAttribute(attribute) && attribute.name.getText(syntax) === "className" && attribute.initializer?.getText(syntax) === '"canvas-appender-button"')) {
      const click = node.attributes.properties.find(attribute => ts.isJsxAttribute(attribute) && attribute.name.getText(syntax) === "onClick");
      handler = click.initializer.expression.getText(syntax);
    }
    ts.forEachChild(node, visit);
  }
  visit(syntax);
  invoke(handler, { writableRef: { current: false } });
});
