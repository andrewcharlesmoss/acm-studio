import assert from "node:assert/strict";
import { readStudioSource } from "./studio-module-source.mjs";
import test from "node:test";
import ts from "typescript";
import { capabilityProfileFor } from "../app/studio/blocks/capability-profiles.ts";
import { loadProductionModule } from "./production-module.mjs";
const { blockCatalogueDocumentation } = await loadProductionModule(new URL("../app/studio/blocks/catalogue-documentation.ts", import.meta.url));

const source = readStudioSource("app/studio/studio-inspectors.tsx");
const ast = ts.createSourceFile("studio-inspectors.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const declaration = ast.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === "DividerInspector");
assert.ok(declaration, "exercise the actual Separator inspector");
const code = ts.transpileModule(declaration.getText(ast), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
const jsx = (type, props) => ({ type, props });
const require = name => { assert.equal(name, "react/jsx-runtime"); return { jsx, jsxs: jsx, Fragment: "fragment" }; };
const inspector = new Function("require", "exports", "useState", "InspectorAccordionSection", "BackgroundSelection", "ParagraphLengthSetting", "AdvancedFieldsInspector", `${code}\nreturn DividerInspector;`)(require, {}, initial => [initial, () => {}], "section", "background", "length", "advanced");
const descendants = node => !node || typeof node !== "object" ? [] : Array.isArray(node) ? node.flatMap(descendants) : [node, ...descendants(node.props?.children)];
const render = block => { const changes = []; return { tree: inspector({ block, onChange: value => changes.push(value) }), changes }; };

// These production JSX/handler checks do not mount an accordion or prove focus.
test("Separator HTML element is a single available Gutenberg Advanced control in both inventories", () => {
  const profile = capabilityProfileFor("divider");
  const element = profile.controls.find(control => control.id === "element");
  assert.equal(element.source, "gutenberg"); assert.equal(element.section, "advanced");
  assert.equal(element.placement, "inspector");
  assert.deepEqual(element.fields, ["tagName"]); assert.deepEqual(element.resetFields, ["tagName"]);
  const projected = blockCatalogueDocumentation(profile).controls.filter(control => control.id === "element");
  assert.equal(projected.length, 1); assert.equal(projected[0].source, "gutenberg");
  assert.equal(projected[0].section, "advanced"); assert.equal(projected[0].documentationStatus, undefined);
});

test("Separator Styles retains its style choice while Advanced contains the HTML element selector", () => {
  const { tree } = render({ id: "separator", type: "divider", style: "wide" });
  const nodes = descendants(tree), styles = nodes.find(node => node.type === "section" && node.props.title === "Styles");
  assert.equal(descendants(styles).filter(node => node.type === "select").length, 1);
  const advanced = nodes.find(node => node.type === "advanced");
  assert.deepEqual(advanced.props.fields, { anchor: true, className: true, additionalCss: true });
  const selector = descendants(advanced).find(node => node.type === "select");
  assert.equal(selector.props.value, "hr");
  assert.deepEqual(descendants(selector).filter(node => node.type === "option").map(node => [node.props.value, node.props.children]), [["hr", "Default (<hr>)"], ["div", "<div>"]]);
});

for (const [initial, selected] of [[undefined, "div"], ["div", "hr"], ["hr", "div"]]) {
  test(`actual Separator handler changes ${initial ?? "default"} to ${selected} while retaining presentation and Advanced data`, () => {
    const block = { id: "separator", type: "divider", tagName: initial, style: "dots", blockAlign: "wide", visualStyle: { backgroundColor: "#123456", margin: "12px", anchor: "line", className: "example", additionalCss: "opacity: 0.8;" } };
    const { tree, changes } = render(block);
    const advanced = descendants(tree).find(node => node.type === "advanced");
    const selector = descendants(advanced).find(node => node.type === "select");
    assert.equal(selector.props.value, initial ?? "hr");
    selector.props.onChange({ target: { value: selected } });
    assert.deepEqual(changes, [{ ...block, tagName: selected }]);
    assert.equal(changes[0].visualStyle, block.visualStyle);
    assert.equal(block.tagName, initial);
  });
}
