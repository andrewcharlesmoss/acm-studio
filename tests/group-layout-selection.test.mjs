import { loadProductionModule } from "./production-module.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import React from "react";
import ts from "typescript";

// Exercise the real canvas callback and layout buttons without loading the
// editor's browser stores or acquiring write ownership.
function loadDeclarations(path, names, environment) {
  const source = readFileSync(new URL(path, import.meta.url), "utf8");
  const ast = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const declarations = ast.statements.filter(node =>
    (ts.isFunctionDeclaration(node) && names.includes(node.name?.text)) ||
    (ts.isVariableStatement(node) && node.declarationList.declarations.some(item => names.includes(item.name.getText(ast))))
  );
  assert.equal(declarations.length, names.length);
  const javascript = ts.transpileModule(declarations.map(node => node.getText(ast).replace(/^export /, "")).join("\n"), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React },
  }).outputText;
  return new Function(...Object.keys(environment), `${javascript}; return { ${names.join(", ")} };`)(...Object.values(environment));
}

const { groupVariations, changeGroupLayout } = await loadProductionModule(new URL("../app/studio/blocks/group-variations.ts", import.meta.url));
const { GroupLayoutChooser } = loadDeclarations("../app/studio/blocks/group-layout-selection.tsx", ["GroupLayoutChooser"], { React, groupVariations });
const BlockFieldContent = () => null;
const { BlockField, NestedBlockAppender } = loadDeclarations("../app/studio/studio-canvas.tsx", ["BlockField", "NestedBlockAppender"], {
  React, GroupLayoutChooser, changeGroupLayout, BlockFieldContent, StudioIcon: () => null,
  paragraphStyleToCss: style => style, visualStyleClassName: () => "visual-style", paragraphStyleAnchor: () => undefined,
});

for (const menuInitiallyOpen of [false, true]) {
  test(`new Group layout choices preserve a ${menuInitiallyOpen ? "open" : "closed"} block menu`, () => {
    const block = { id: "empty-group", type: "group", layout: "flow", children: [], gap: 24, visualStyle: { padding: "1rem" } };
    const menu = { open: menuInitiallyOpen, parentId: "existing-target" };
    let changedBlock;
    let completedId;
    const field = BlockField({
      block, pendingGroupLayoutBlockId: block.id,
      onChange: next => { changedBlock = next; },
      onGroupLayoutSelected: id => { completedId = id; },
      onOpenNestedInserter: () => assert.fail("Choosing a layout must not open the child inserter"),
    });
    assert.equal(field.type, GroupLayoutChooser);
    const choices = React.Children.toArray(GroupLayoutChooser(field.props).props.children)[1];
    const buttons = React.Children.toArray(choices.props.children);
    assert.deepEqual(buttons.map(button => button.props["aria-label"]), ["Group layout", "Row layout", "Stack layout", "Grid layout"]);
    for (const [index, layout] of ["flow", "row", "stack", "grid"].entries()) {
      buttons[index].props.onClick();
      assert.equal(changedBlock.layout, layout);
      assert.equal(changedBlock.id, block.id);
      assert.deepEqual(changedBlock.visualStyle, block.visualStyle);
      assert.equal(changedBlock.gap, 24);
      assert.equal(changedBlock.children, block.children);
      assert.equal(completedId, block.id);
      assert.deepEqual(menu, { open: menuInitiallyOpen, parentId: "existing-target" });
    }
  });
}

test("an established empty Group uses the normal canvas and visual style pipeline", () => {
  const block = { id: "chosen-group", type: "group", layout: "flow", children: [], visualStyle: { padding: "1rem" } };
  const field = BlockField({ block, pendingGroupLayoutBlockId: "another-group" });
  assert.equal(field.type, "div");
  assert.deepEqual(field.props.style, block.visualStyle);
  assert.equal(field.props.children.type, BlockFieldContent);
  assert.equal(field.props.children.props.block, block);
});

test("empty Group plus opens the child inserter for its own parent", () => {
  let target;
  const button = NestedBlockAppender({ parentId: "chosen-group", compact: true, writable: true, onOpen: id => { target = id; } });
  assert.equal(button.props["aria-label"], "Add block");
  assert.match(button.props.className, /is-compact/);
  assert.equal(React.Children.toArray(button.props.children).length, 1);
  button.props.onClick();
  assert.equal(target, "chosen-group");
});

test("read-only layout choices and child appender cannot dispatch edits", () => {
  const chooser = GroupLayoutChooser({ writable: false, onSelect: () => assert.fail("Read-only layout edit") });
  for (const button of React.Children.toArray(React.Children.toArray(chooser.props.children)[1].props.children)) {
    assert.equal(button.props.disabled, true);
    button.props.onClick();
  }
  const appender = NestedBlockAppender({ parentId: "group", compact: true, writable: false, onOpen: () => assert.fail("Read-only child insertion") });
  assert.equal(appender.props.disabled, true);
  appender.props.onClick();
});
