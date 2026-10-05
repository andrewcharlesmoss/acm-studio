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

const { GroupLayoutSelection } = loadDeclarations("../app/studio/blocks/group-layout-selection.tsx", ["layoutOptions", "GroupLayoutSelection"], { React, AcmIcon: () => null });
const { BlockField } = loadDeclarations("../app/studio/studio-canvas.tsx", ["BlockField"], { React, GroupLayoutSelection, BlockLibraryIcon: () => null });

for (const menuInitiallyOpen of [false, true]) {
  test(`empty Group layout choices preserve a ${menuInitiallyOpen ? "open" : "closed"} block menu`, () => {
    const block = { id: "empty-group", type: "group", layout: "flow", children: [], gap: 24, visualStyle: { padding: "1rem" } };
    const menu = { open: menuInitiallyOpen, parentId: "existing-target" };
    let changedBlock;
    let insertionRequests = 0;
    const field = BlockField({
      block,
      onChange: next => { changedBlock = next; },
      onOpenNestedInserter: parentId => { insertionRequests++; menu.open = true; menu.parentId = parentId; },
    });
    const chooser = React.Children.toArray(field.props.children).find(child => child.type === GroupLayoutSelection);
    assert.ok(chooser);
    const buttons = React.Children.toArray(GroupLayoutSelection(chooser.props).props.children);
    assert.deepEqual(buttons.map(button => button.props["aria-label"]), ["Group", "Row", "Stack", "Grid"]);
    for (const [index, layout] of ["flow", "row", "stack", "grid"].entries()) {
      buttons[index].props.onClick();
      assert.deepEqual(changedBlock, { ...block, layout, allowWrap: layout === "row" ? false : undefined });
      assert.equal(changedBlock.children, block.children);
      assert.equal(insertionRequests, 0);
      assert.deepEqual(menu, { open: menuInitiallyOpen, parentId: "existing-target" });
    }
  });
}

test("legacy Columns layout can return to Group without requesting insertion", () => {
  let changedBlock;
  const block = { id: "legacy-group", type: "group", layout: "columns", children: [] };
  const field = BlockField({ block, onChange: next => { changedBlock = next; }, onOpenNestedInserter: () => assert.fail("Unexpected insertion request") });
  const chooser = React.Children.toArray(field.props.children).find(child => child.type === GroupLayoutSelection);
  const columns = React.Children.toArray(GroupLayoutSelection(chooser.props).props.children).find(button => button.props["aria-label"] === "Columns");
  columns.props.onClick();
  assert.equal(changedBlock.layout, "flow");
});
