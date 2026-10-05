import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";
import test from "node:test";
import ts from "typescript";

async function componentTree(path, name) {
  const source = await readFile(new URL(path, import.meta.url), "utf8");
  const tree = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const component = tree.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === name);
  assert.ok(component, `Production ${name} exists`);
  const attributes = [];
  function visit(node) {
    if (ts.isJsxAttribute(node)) attributes.push(node);
    ts.forEachChild(node, visit);
  }
  visit(component);
  return { tree, attributes };
}

const surface = await componentTree("../app/studio/template-renderer.tsx", "TemplateSurface");
const richEditor = await componentTree("../app/studio/studio-canvas.tsx", "RichTextEditor");
function handler(component, name, scope) {
  const attribute = component.attributes.find(node => node.name.getText(component.tree) === name);
  if (!attribute) return null;
  const code = `globalThis.handler = ${attribute.initializer.expression.getText(component.tree)};`;
  runInNewContext(ts.transpileModule(code, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, scope);
  return scope.handler;
}

class ClickTarget {
  constructor(link = null) { this.link = link; }
  closest(selector) { return selector === "a" ? this.link : null; }
}
function event(target) {
  return { target, defaultPrevented: false, preventDefault() { this.defaultPrevented = true; } };
}

test("Template editing links are suppressed in bubble after the actual rich-text handler", () => {
  assert.equal(handler(surface, "onClickCapture", {}), null, "Template must not cancel the rich-text handler during capture");
  const link = {};
  const click = event(new ClickTarget(link));
  const selections = [], activations = [];
  const range = { startContainer: {}, endContainer: {}, startOffset: 0, endOffset: 16, selectNodeContents(node) { assert.equal(node, link); } };
  const child = handler(richEditor, "onClick", {
    editable: true, editorRef: { current: { contains: node => node === link } },
    document: { createRange: () => range }, window: { getSelection: () => ({ removeAllRanges() {}, addRange(selected) { assert.equal(selected, range); } }) },
    editorOffset: (_editor, _node, offset) => offset,
    onSelectionChange: selection => selections.push(selection), onLinkActivate: selection => activations.push(selection),
  });
  const parent = handler(surface, "onClick", { editing: true, Element: ClickTarget });
  assert.ok(parent, "Production Template navigation guard uses bubbling");
  child(click);
  parent(click);
  assert.deepEqual(JSON.parse(JSON.stringify(selections)), [{ start: 0, end: 16 }]);
  assert.deepEqual(JSON.parse(JSON.stringify(activations)), [{ start: 0, end: 16 }]);
  assert.equal(click.defaultPrevented, true, "Editing must not navigate");
});

test("Template static links remain non-navigating in Edit and keep Preview behaviour", () => {
  for (const editing of [true, false]) {
    const click = event(new ClickTarget({}));
    handler(surface, "onClick", { editing, Element: ClickTarget })(click);
    assert.equal(click.defaultPrevented, editing);
  }
  const ordinary = event(new ClickTarget());
  handler(surface, "onClick", { editing: true, Element: ClickTarget })(ordinary);
  assert.equal(ordinary.defaultPrevented, false);
  const nonElement = event({});
  handler(surface, "onClick", { editing: true, Element: ClickTarget })(nonElement);
  assert.equal(nonElement.defaultPrevented, false);
});

test("the shared rich-text link handler still respects cancellation by inline objects", () => {
  const click = event(new ClickTarget({}));
  click.preventDefault();
  handler(richEditor, "onClick", {})(click);
  assert.equal(click.defaultPrevented, true);
});
