import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { createElement } from "react";
import * as jsxRuntime from "react/jsx-runtime";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";
import { loadProductionModule } from "./production-module.mjs";
import * as demo from "../app/studio/ribbon/demo-state.ts";
import { accountExample } from "../app/studio/ribbon/catalogue-model.ts";

const { CheckboxControl } = await loadProductionModule(new URL("../app/studio/controls/checkbox-control.tsx", import.meta.url));
const { RangeControl } = await loadProductionModule(new URL("../app/studio/controls/range-control.tsx", import.meta.url));
const { createTemplateSet } = await loadProductionModule(new URL("../app/studio/template-model.ts", import.meta.url));
function productionFunction(file, name, bindings = {}) {
  const source = readFileSync(new URL(`../app/studio/${file}`, import.meta.url), "utf8");
  const tree = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const scope = { exports: {}, structuredClone, require: () => jsxRuntime, ...bindings };
  for (const node of tree.statements) if (ts.isImportDeclaration(node) && node.importClause?.namedBindings && ts.isNamedImports(node.importClause.namedBindings)) {
    for (const specifier of node.importClause.namedBindings.elements) if (!(specifier.name.text in scope)) scope[specifier.name.text] = specifier.name.text;
  }
  const declaration = tree.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === name);
  assert.ok(declaration);
  const compiled = ts.transpileModule(`${declaration.getText(tree).replace(/^export /, "")}\nglobalThis.subject = ${name};`, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  runInNewContext(compiled, scope);
  return scope.subject;
}
function nodes(node) { return Array.isArray(node) ? node.flatMap(nodes) : !node?.props ? [] : [node, ...nodes(node.props.children)]; }

test("checkbox supports native IDs, accessible names, rich labels and independent uncontrolled defaults", () => {
  const rich = renderToStaticMarkup(createElement(CheckboxControl, { inputProps: { id: "choice", name: "enabled", "aria-describedby": "help" }, defaultChecked: true, label: createElement("strong", null, "Keep this") }));
  assert.match(rich, /<label for="choice"/);
  assert.match(rich, /id="choice"/);
  assert.match(rich, /name="enabled"/);
  assert.match(rich, /aria-describedby="help"/);
  assert.match(rich, /checked=""/);
  assert.match(rich, /<span><strong>Keep this<\/strong><\/span>/);
  assert.equal((rich.match(/<label/g) ?? []).length, 1);
  const hidden = renderToStaticMarkup(createElement(CheckboxControl, { label: null, checked: false, inputProps: { "aria-label": "Select page for export" }, onChange() {} }));
  assert.match(hidden, /aria-label="Select page for export"/);
  assert.doesNotMatch(hidden, /<span/);
  assert.doesNotMatch(renderToStaticMarkup(createElement(CheckboxControl, { label: "Other", defaultChecked: false })), /checked=""/);
});

test("shared checkbox owns the mixed DOM property and forwards a native change as a boolean", () => {
  const ref = { current: { indeterminate: false } };
  const effects = [], changes = [];
  const render = productionFunction("controls/checkbox-control.tsx", "CheckboxControl", {
    useRef: () => ref, useEffect: effect => effects.push(effect), useLayoutEffect: effect => effects.push(effect), controlLibraryAttributes: () => ({}),
  });
  const input = mixed => {
    const tree = render({ label: "All", checked: false, indeterminate: mixed, onChange: checked => changes.push(checked), inputProps: { name: "all" } });
    effects.splice(0).forEach(effect => effect());
    return nodes(tree).find(node => node.type === "input");
  };
  const mixed = input(true);
  assert.equal(ref.current.indeterminate, true);
  assert.equal(mixed.props.name, "all");
  mixed.props.onChange({ target: { checked: true } });
  mixed.props.onChange({ target: { checked: false } });
  assert.deepEqual(changes, [true, false]);
  input(false);
  assert.equal(ref.current.indeterminate, false);
});

test("background width uses the shared range and preserves the stored size and unrelated style", () => {
  const changes = [];
  const render = productionFunction("blocks/inspectors/paragraph-inspector.tsx", "ManagedBackgroundImageInspector", { RangeControl });
  const block = { id: "background", type: "group", children: [], visualStyle: { backgroundImageMediaId: "image", backgroundSize: "fixed", textColor: "#123456" } };
  const tree = render({ block, onChange: value => changes.push(value) });
  const range = nodes(tree).find(node => node.type === RangeControl);
  assert.ok(range);
  assert.deepEqual([range.props.min, range.props.max, range.props.step, range.props.value], ["50", "2000", "10", 200]);
  range.props.onChange({ target: { value: "350" } });
  assert.equal(changes[0].visualStyle.backgroundFixedSize, 350);
  assert.equal(changes[0].visualStyle.textColor, "#123456");
  assert.equal(block.visualStyle.backgroundFixedSize, undefined);
});

test("Ribbon compound slider preserves command values, label/output associations and disabled reason", () => {
  const render = productionFunction("ribbon/ribbon-preview.tsx", "Control", { ...demo, RangeControl, useId: () => "compound-size" });
  const controls = accountExample.tabs.flatMap(tab => tab.groups.flatMap(group => group.controls));
  const control = controls.find(item => item.kind === "compound-range");
  assert.ok(control);
  let state = demo.initialDemo(accountExample);
  const props = { control, setState: update => { state = update(state); } };
  const tree = render({ ...props, state });
  const all = nodes(tree), range = all.find(node => node.type === RangeControl);
  assert.equal(all.find(node => node.type === "label").props.htmlFor, range.props.id);
  assert.equal(all.find(node => node.type === "output").props.htmlFor, range.props.id);
  assert.deepEqual([range.props.min, range.props.max, range.props.step], [control.min, control.max, control.step]);
  const before = state;
  range.props.onChange({ target: { value: "100" } });
  assert.deepEqual(state, demo.runDemoCommand(before, control, 100));
  const locked = { ...state, locked: true };
  const disabled = nodes(render({ ...props, state: locked })).find(node => node.type === RangeControl);
  assert.equal(disabled.props.disabled, Boolean(demo.disabledReason(control, locked)));
  assert.equal(disabled.props.title, demo.disabledReason(control, locked));
});

test("template default checkbox updates only templates of its kind and retains boolean clearing", () => {
  const set = createTemplateSet();
  const target = set.templates.find(template => template.kind === "post");
  set.templates.push({ ...target, id: "other-post", isDefault: true });
  const page = set.templates.find(template => template.kind === "page");
  const changes = [];
  const render = productionFunction("template-inspector.tsx", "TemplateInspector", {
    CheckboxControl, useState: value => [value, () => {}], useEffect: effect => effect(), useId: () => "template", useSharedStylePreset: () => set.styles,
    useResponsiveStyleScope: () => ({ editingViewport: "desktop" }), templateEditorBlocks: () => [], findColumnsParent: () => null,
    templateCopyrightPlaceholders: [], TemplateTextSetting: "TemplateTextSetting", ResettableStyleSetting: "ResettableStyleSetting", LinkSettings: "LinkSettings",
  });
  const tree = render({ set, target, selectedBlock: null, writable: true, users: [], onChange: value => changes.push(value), onOpenMedia() {}, onEditPart() {} });
  const checkbox = nodes(tree).find(node => node.type === CheckboxControl);
  assert.ok(checkbox);
  checkbox.props.onChange(true);
  assert.equal(changes[0].templates.find(template => template.id === target.id).isDefault, true);
  assert.equal(changes[0].templates.find(template => template.id === "other-post").isDefault, false);
  assert.equal(changes[0].templates.find(template => template.id === page.id).isDefault, page.isDefault);
  checkbox.props.onChange(false);
  assert.ok(changes[1].templates.filter(template => template.kind === "post").every(template => !template.isDefault));
});

test("category checkboxes retain recursive hierarchy, selected ordering and removal callbacks", async () => {
  const dates = await loadProductionModule(new URL("../app/studio/publication-date.ts", import.meta.url));
  const reading = await loadProductionModule(new URL("../app/content/reading-time.ts", import.meta.url));
  const changes = [];
  const render = productionFunction("blocks/inspectors/document-inspector.tsx", "DocumentInspector", {
    ...dates, ...reading, CheckboxControl,
    useState: value => [value, () => {}], useRef: current => ({ current }), useId: () => "category-test",
    useSharedStylePreset: () => ({ palette: { accent: "#0088FF" } }),
    documentStatusLabel: status => status, InspectorSection: "InspectorSection", FieldUsageRow: "FieldUsageRow", FieldDisplaySetting: "FieldDisplaySetting", FieldSettingsRow: "FieldSettingsRow", PostTagsEditor: "PostTagsEditor", DocumentStickyControl: "DocumentStickyControl",
  });
  const document = { id: "post", kind: "post", title: "Example", status: "draft", excerpt: "", tags: [], blocks: [], categoryIds: ["root", "other"], updatedAt: "2026-10-16T00:00:00Z" };
  const categories = [{ id: "root", name: "Parent" }, { id: "child", parentId: "root", name: "Child" }, { id: "other", name: "Other" }];
  const tree = render({ document, resolvedDocument: document, categories, pages: [], tagSuggestions: [], panel: "document", onCategorySelectionChange: value => changes.push(Array.from(value)) });
  const rows = nodes(tree).filter(node => node.type === "div" && node.props.className === "post-category-option");
  assert.deepEqual(rows.map(row => row.props.style.paddingInlineStart), ["0px", "18px", "0px"]);
  const controls = nodes(tree).filter(node => node.type === CheckboxControl);
  assert.deepEqual(controls.map(control => control.props.checked), [true, false, true]);
  controls[1].props.onChange(true);
  controls[0].props.onChange(false);
  assert.deepEqual(changes, [["root", "other", "child"], ["other"]]);
  assert.deepEqual(document.categoryIds, ["root", "other"]);
});

// Structural ownership guard: dialog field layouts must leave shared choice geometry alone.
test("dialog form-field selectors exclude shared checkbox labels and focus", () => {
  const editorCss = readFileSync(new URL("../app/studio/studio.css", import.meta.url), "utf8");
  const siteCss = readFileSync(new URL("../app/studio/site-draft.css", import.meta.url), "utf8");
  assert.match(editorCss, /\.block-editorial-dialog form, \.block-editorial-dialog label:not\(\.studio-choice-control\) \{/);
  assert.match(editorCss, /\.block-editorial-dialog label:not\(\.studio-choice-control\) > span \{/);
  assert.doesNotMatch(editorCss, /\.block-editorial-dialog label(?: > span)? \{/);
  assert.match(siteCss, /\.site-settings-dialog label:not\(\.studio-choice-control\) \{/);
  assert.doesNotMatch(siteCss, /\.site-settings-dialog label \{/);
  assert.match(siteCss, /\.site-settings-dialog :not\(input\[type="checkbox"\]\):focus-visible/);
});
