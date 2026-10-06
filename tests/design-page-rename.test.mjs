import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import test from "node:test";
import ts from "typescript";

const source = readFileSync(new URL("../app/studio/design-editor.tsx", import.meta.url), "utf8");
const tree = ts.createSourceFile("design-editor.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let callback;
function visit(node) {
  if (ts.isVariableDeclaration(node) && node.name.getText(tree) === "renamePageFromListener") {
    callback = node.initializer.arguments[0].getText(tree);
  }
  ts.forEachChild(node, visit);
}
visit(tree);
assert.ok(callback);
const code = ts.transpileModule(`globalThis.rename = ${callback};`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;

function fixture() {
  const updates = [];
  const scope = {
    design: { id: "design", pages: [{ id: "page", name: "Original", objects: [] }] },
    writable: true,
    updateDesign(next) { updates.push(next); },
  };
  runInNewContext(code, scope);
  return { scope, updates };
}

test("a delayed page rename preserves edits made while the title input was open", () => {
  const { scope, updates } = fixture();
  const otherPage = { id: "other", name: "Added meanwhile", objects: [] };
  scope.design = { ...scope.design, pages: [{ ...scope.design.pages[0], objects: [{ id: "new-object" }] }, otherPage] };
  scope.rename("page", "Renamed");
  assert.equal(updates.length, 1);
  assert.equal(updates[0].pages[0].name, "Renamed");
  assert.equal(updates[0].pages[0].objects, scope.design.pages[0].objects);
  assert.equal(updates[0].pages[1], otherPage);
});

test("a delayed rename stops when editing is revoked, the page is locked or removed, or the name is unchanged", () => {
  for (const change of [
    scope => { scope.writable = false; },
    scope => { scope.design.pages[0].locked = true; },
    scope => { scope.design.pages = []; },
    scope => { scope.design = null; },
    scope => { scope.design.pages[0].name = "Renamed"; },
  ]) {
    const { scope, updates } = fixture();
    change(scope);
    scope.rename("page", "Renamed");
    assert.equal(updates.length, 0);
  }
});
