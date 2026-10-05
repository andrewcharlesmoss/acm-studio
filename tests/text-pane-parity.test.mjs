import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { createRequire } from "node:module";
import vm from "node:vm";
import ts from "typescript";
import { capabilityProfileFor, listItemCapabilityProfile } from "../app/studio/blocks/capability-profiles.ts";
import { studioControlEntryById } from "../app/studio/controls/library-catalogue.ts";

const require = createRequire(import.meta.url);
function load(file, overrides = {}, cache = new Map()) {
  file = resolve(file);
  if (cache.has(file)) return cache.get(file);
  const exports = {}; cache.set(file, exports);
  const source = ts.transpileModule(readFileSync(file, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const dependency = id => {
    if (Object.hasOwn(overrides, id)) return overrides[id];
    if (id.endsWith(".css")) return {};
    if (!id.startsWith(".")) return require(id);
    const base = resolve(dirname(file), id);
    const path = [base, `${base}.ts`, `${base}.tsx`].find(existsSync);
    return load(path, overrides, cache);
  };
  vm.runInNewContext(source, { exports, require: dependency, console, URL, Map, Set });
  return exports;
}
const actions = load("app/studio/blocks/inspector-style-actions.ts");
const plain = value => JSON.parse(JSON.stringify(value));
const types = ["paragraph", "heading", "list", "quote", "table", "code"];

const { ParagraphInspector } = load("app/studio/studio-inspectors.tsx", {
  react: { ...require("react"), useId: () => "layout-inspector-fixture", useState: value => [typeof value === "function" ? value() : value, () => {}], useRef: value => ({ current: value }), useEffect: () => {}, useLayoutEffect: () => {} },
});
function layoutInspector(block, onChange = () => {}) {
  return nodes(ParagraphInspector({ block, onChange, fontSizeViewMode: "presets", onFontSizeViewModeChange() {} }));
}

test("Group and Buttons fresh inspector defaults follow the pinned block declarations", () => {
  const group = capabilityProfileFor("group");
  const buttons = capabilityProfileFor("buttons");
  assert.deepEqual(group.defaults.dimensions, ["padding"]);
  assert.deepEqual(buttons.defaults.typography, ["size"]);
  assert.deepEqual(buttons.defaults.dimensions, []);
  assert.deepEqual(buttons.defaults.border, ["border", "radius"]);
  for (const block of [{ id: "group", type: "group", layout: "flow", children: [] }, { id: "buttons", type: "buttons", children: [] }]) {
    const tree = layoutInspector(block);
    const dimensions = tree.find(node => node.type.name === "InspectorToolsSection" && node.props.title === "Dimensions");
    assert.ok(dimensions);
    assert.equal(dimensions.props.visible.has("padding"), block.type === "group");
    assert.equal(dimensions.props.visible.has("margin"), false);
    assert.ok(dimensions.props.options.some(option => option.id === "margin"));
    if (block.type === "buttons") {
      const typography = tree.find(node => node.type.name === "InspectorToolsSection" && node.props.title === "Typography");
      const border = tree.find(node => node.type.name === "InspectorToolsSection" && node.props.title === "Border");
      assert.equal(typography.props.visible.has("size"), true);
      assert.equal(border.props.visible.has("border"), true);
      assert.equal(border.props.visible.has("radius"), true);
    }
  }
});

test("saved layout margins stay editable and reset without changing parent or child appearance", () => {
  for (const type of ["group", "buttons"]) {
    for (const marginValue of ["8px", "0"]) {
    let block = { id: type, type, children: [{ id: "child", type: "button", label: "Keep", url: "/keep", visualStyle: { margin: "3px", textColor: "#123456" } }], visualStyle: { margin: marginValue, padding: "12px", fontSizeCustom: "2rem", backgroundColor: "#ffffff" } };
    const original = structuredClone(block);
    const tree = layoutInspector(block, next => { block = plain(next); });
    const dimensions = tree.find(node => node.type.name === "InspectorToolsSection" && node.props.title === "Dimensions");
    assert.equal(dimensions.props.visible.has("margin"), true);
    const margin = tree.find(node => node.type.name === "BoxLengthSetting" && node.props.label === "Margin");
    assert.ok(margin);
    margin.props.onChange(undefined);
    assert.deepEqual(block.visualStyle, { padding: "12px", fontSizeCustom: "2rem", backgroundColor: "#ffffff" });
    assert.deepEqual(block.children, original.children);
    assert.equal(original.visualStyle.margin, marginValue);
    }
  }
});

test("Group Padding reset and whole Dimensions reset own distinct layout fields", () => {
  const original = { id: "group", type: "group", layout: "flow", children: [{ id: "p", type: "paragraph", text: "Keep" }], paddingX: 10, paddingY: 20, gap: 15, columnGap: 25, rowGap: 30, visualStyle: { padding: "8px", margin: "10px", textColor: "#123456", backgroundColor: "#ffffff" } };
  let block = structuredClone(original);
  let tree = layoutInspector(block, next => { block = plain(next); });
  tree.find(node => node.type.name === "BoxLengthSetting" && node.props.label === "Padding").props.onChange(undefined);
  assert.deepEqual(block.visualStyle, { margin: "10px", textColor: "#123456", backgroundColor: "#ffffff" });
  assert.equal(block.paddingX, undefined);
  assert.equal(block.paddingY, undefined);
  assert.deepEqual([block.gap, block.columnGap, block.rowGap], [15, 25, 30]);
  block = structuredClone(original);
  tree = layoutInspector(block, next => { block = plain(next); });
  tree.find(node => node.type.name === "InspectorToolsSection" && node.props.title === "Dimensions").props.onReset();
  assert.deepEqual(block.visualStyle, { textColor: "#123456", backgroundColor: "#ffffff" });
  for (const field of ["paddingX", "paddingY", "gap", "columnGap", "rowGap"]) assert.equal(block[field], undefined, field);
  assert.deepEqual(block.children, original.children);
});

test("Buttons default size and border resets retain unrelated parent fields and child styles", () => {
  const controls = capabilityProfileFor("buttons").controls;
  const style = { fontSizeCustom: "2rem", borderWidth: "2px", borderColor: "#123456", borderRadius: "4px", margin: "8px", padding: "12px", backgroundColor: "#ffffff" };
  assert.deepEqual(plain(actions.resetSupportedInspectorStyleFields(style, ["size", "border", "radius"], controls)), { margin: "8px", padding: "12px", backgroundColor: "#ffffff" });
});

test("default typography values make Reset eligible and reset only supported fields", () => {
  for (const type of types) {
    const controls = capabilityProfileFor(type).controls;
    assert.equal(actions.inspectorStyleHasValues({}, ["colour", "size"], controls), false, type);
    const style = { fontSize: "large", textColor: "#112233", fontFamily: "retained", orientation: "vertical-rl", margin: "8px", backgroundColor: "#ffffff" };
    assert.equal(actions.inspectorStyleHasValues(style, ["colour", "size"], controls), true, type);
    assert.deepEqual(plain(actions.resetSupportedInspectorStyleFields(style, ["colour", "size", "family", "orientation"], controls)), { ...(type === "paragraph" ? {} : { fontFamily: "retained" }), orientation: "vertical-rl", margin: "8px", backgroundColor: "#ffffff" });
    assert.equal(style.fontSize, "large");
  }
});

test("Fit text clears sizes and choosing either preset or custom size clears Fit text atomically", () => {
  const original = { fontSize: "large", fontSizeCustom: "2rem", textColor: "#112233" };
  const fit = actions.setInspectorFitText(original, true);
  assert.deepEqual(plain(fit), { fitText: true, textColor: "#112233" });
  assert.deepEqual(plain(actions.setInspectorFontSize(fit, "small", "presets")), { fontSize: "small", textColor: "#112233" });
  assert.deepEqual(plain(actions.setInspectorFontSize(fit, "3em", "custom")), { fontSizeCustom: "3em", textColor: "#112233" });
  assert.equal(original.fontSizeCustom, "2rem");
});

test("all six expose the captured common typography; Code/Table and Quote supports are precise", () => {
  for (const type of types) {
    const profile = capabilityProfileFor(type);
    for (const id of ["colour", "size", "appearance", "line-height", "letter-spacing", "decoration", "letter-case"]) assert.ok(profile.controls.some(control => control.id === id && control.source === "gutenberg" && control.enabled !== false), `${type}:${id}`);
    assert.deepEqual(profile.defaults.typography, ["colour", "size"]);
  }
  assert.deepEqual(capabilityProfileFor("quote").defaults.dimensions, ["padding", "margin"]);
  assert.equal(capabilityProfileFor("quote").controls.find(control => control.id === "min-height").source, "gutenberg");
  assert.ok(capabilityProfileFor("code").controls.some(control => control.id === "radius"));
  assert.ok(!capabilityProfileFor("table").controls.some(control => control.id === "radius"));
});

test("Background reset owns image configuration while preserving foreground and Elements", () => {
  for (const type of ["heading", "quote", "code"]) {
    const style = { backgroundColor: "#fff", backgroundGradient: "ocean", backgroundImageMediaId: "media", backgroundSize: "fixed", backgroundFixedSize: 300, backgroundRepeat: "repeat", backgroundPositionX: 10, backgroundPositionY: 80, textColor: "#112233", linkColor: "#224466", linkHoverColor: "#445566" };
    assert.deepEqual(plain(actions.resetSupportedInspectorStyleFields(style, ["background"], capabilityProfileFor(type).controls)), { textColor: "#112233", linkColor: "#224466", linkHoverColor: "#445566" });
  }
  const style = { borderWidth: "2px", borderColor: "#112233", shadow: "soft", textColor: "#222" };
  assert.deepEqual(plain(actions.resetSupportedInspectorStyleFields(style, ["border", "shadow"], capabilityProfileFor("list").controls)), { shadow: "soft", textColor: "#222" });
});

test("List Item reset remains item-scoped and uses the same registered controls", () => {
  assert.deepEqual(plain(actions.resetSupportedInspectorStyleFields({ fontSize: "large", lineHeight: "1.4", margin: "8px", anchor: "item" }, ["size", "line-height"], listItemCapabilityProfile.controls)), { margin: "8px", anchor: "item" });
  for (const id of ["toggle", "style-variation", "background-selection", "box-length"]) assert.ok(studioControlEntryById[id]);
});

function nodes(element) { return element && typeof element === "object" ? [element, ...[element.props?.children].flat(Infinity).flatMap(nodes)] : []; }

test("shared toggles retain native keyboard/disabled semantics and style choices change the requested variation", () => {
  const changed = [];
  const { ToggleSetting } = load("app/studio/controls/toggle-setting.tsx");
  const toggle = ToggleSetting({ label: "Reverse order", checked: false, disabled: true, onChange: value => changed.push(value) });
  const input = nodes(toggle).find(node => node.type === "input");
  assert.equal(input.props.type, "checkbox"); assert.equal(input.props.disabled, true); assert.equal(input.props.checked, false);
  input.props.onChange({ target: { checked: true } }); assert.deepEqual(changed, [true]);
  const { StyleVariationSetting } = load("app/studio/controls/style-variation-setting.tsx");
  for (const [kind, alternative] of [["quote", "plain"], ["table", "stripes"]]) {
    const choices = nodes(StyleVariationSetting({ kind, value: alternative, onChange: value => changed.push(value) })).filter(node => node.type === "button");
    assert.equal(choices.length, 2); assert.equal(choices[1].props["aria-pressed"], true); assert.equal(choices[0].props["aria-pressed"], false);
    choices[0].props.onClick(); assert.equal(changed.at(-1), "default");
  }
});

function box(value, layout, state = null) {
  const writes = [], stateChanges = [];
  const { BoxLengthSetting } = load("app/studio/box-length-setting.tsx", {
    react: { useState: initial => [state ?? (typeof initial === "function" ? initial() : initial), next => stateChanges.push(next)] },
    "@acm/icons/react": { AcmIcon() {} }, "./studio-icons": { StudioIcon() {} },
  });
  const tree = BoxLengthSetting({ label: "Margin", value, layout, min: -100, max: 200, onChange: value => writes.push(value) });
  return { tree, writes, stateChanges, rows: nodes(tree).filter(node => typeof node.type === "function" && node.type.name === "BoxLengthRow") };
}

test("unlinking untouched spacing changes UI only; Code exposes independent Top/Bottom without horizontal controls", () => {
  const initial = box(undefined, "vertical");
  nodes(initial.tree).find(node => node.type === "button").props.onClick();
  assert.deepEqual(initial.writes, []); assert.deepEqual(initial.stateChanges, [true]);
  const split = box("1rem 8px 2rem 12px", "vertical");
  assert.deepEqual(split.rows.map(row => row.props.label), ["Top", "Bottom"]);
  split.rows[1].props.onChange("-3rem"); assert.deepEqual(split.writes, ["1rem 8px -3rem 12px"]);
  const linked = box("1rem 8px 1rem 12px", "vertical");
  linked.rows[0].props.onChange("2rem"); assert.deepEqual(linked.writes, ["2rem 8px 2rem 12px"]);
  linked.rows[0].props.onChange(undefined); assert.equal(linked.writes.at(-1), "0px 8px 0px 12px");
  const axes = box("1rem 8px", "axes"); axes.rows[0].props.onChange(undefined); assert.equal(axes.writes.at(-1), "0px 8px");
});

test("axis views retain unequal sides until edited and never rewrite values on linking", () => {
  const initial = box("16px 24px", "all");
  assert.deepEqual(initial.rows.map(row => row.props.label), ["Vertical", "Horizontal"]);
  initial.rows[0].props.onChange("32px");
  assert.equal(initial.writes.at(-1), "32px 24px");
  const mixed = box("32px 24px 48px", "all", false);
  assert.equal(mixed.rows[0].props.mixed, true);
  nodes(mixed.tree).find(node => node.type === "button").props.onClick();
  assert.deepEqual(mixed.writes, []);
  mixed.rows[0].props.onChange("16px");
  assert.equal(mixed.writes.at(-1), "16px 24px");
});

test("blank custom measurement clears rather than storing an explicit zero; explicit zero remains valid", () => {
  for (const draft of ["", "0"]) {
    const setup = box("8px", "all"); let index = 0; let renderDraft = draft;
    const writes = [];
    const source = readFileSync("app/studio/box-length-setting.tsx", "utf8").replace("function BoxLengthRow(", "export function BoxLengthRow(");
    const exports = {};
    vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText, { exports, require: id => id === "react" ? { useId: () => "test-box-value", useState: () => [index++ === 0 ? true : renderDraft, () => {}] } : id === "../content/box-lengths" ? {} : id === "@acm/icons/react" ? {} : id.startsWith(".") ? {} : require(id) });
    const row = exports.BoxLengthRow({ label: "All", settingLabel: "Padding", value: "8px", min: 0, max: 160, allowPercent: true, onChange: value => writes.push(value) });
    nodes(row).find(node => node.type === "input" && node.props.type === "number").props.onBlur();
    assert.deepEqual(writes, [draft === "" ? undefined : "0px"]);
    index = 0; renderDraft = null;
    const blankRow = exports.BoxLengthRow({ label: "All", settingLabel: "Padding", value: "", min: 0, max: 160, allowPercent: true, onChange() {} });
    assert.equal(nodes(blankRow).find(node => node.type === "input" && node.props.type === "number").props.value, "");
    assert.ok(setup.tree);
  }
});

test("signed ordered starts validate, render in semantic HTML, and reject out-of-range/fractional values", () => {
  const { validContentBlocks } = load("app/studio/workspace-validation.ts");
  const { blockToHtml } = load("app/studio/studio-html-editor.ts");
  for (const start of [-100000, -2, 0, 100000, undefined]) {
    const list = { id: "list", type: "list", style: "ordered", items: [{ text: "Marked", runs: [{ text: "Marked", marks: ["bold"] }] }], start, reversed: true, marker: "a" };
    assert.equal(validContentBlocks([list]), true, String(start));
    const html = blockToHtml(list); assert.match(html, /reversed/); assert.match(html, /<strong>Marked<\/strong>/);
    if (start !== undefined) assert.match(html, new RegExp(`start="${start}"`));
  }
  for (const start of [-100001, 100001, 1.5]) assert.equal(validContentBlocks([{ id: "list", type: "list", style: "ordered", items: ["item"], start }]), false);
});

test("newly exposed typography, Quote size and link styles produce shared Edit/Preview CSS", () => {
  const { paragraphStyleToCss } = load("app/content/paragraph-styles.ts");
  const css = paragraphStyleToCss({ letterSpacing: "2px", textDecoration: "underline", textTransform: "uppercase", minHeight: "120px", linkColor: "#123456", linkHoverColor: "#654321" });
  assert.equal(css.letterSpacing, "2px"); assert.equal(css.textDecoration, "underline"); assert.equal(css.textTransform, "uppercase"); assert.equal(css.minHeight, "120px");
  assert.equal(css["--studio-paragraph-link-color"], "#123456"); assert.equal(css["--studio-paragraph-link-hover-color"], "#654321");
});

test("Table presentation routes spacing to its figure and colour/typography/border to the table", () => {
  const { tablePresentation } = load("app/content/table-presentation.ts");
  const presentation = tablePresentation({ padding: "8px", margin: "12px", borderStyle: "solid", borderWidth: "2px", borderColor: "#112233", textColor: "#445566", letterSpacing: "2px", backgroundColor: "#ffffff", additionalCss: "text-transform: uppercase;" });
  assert.deepEqual(plain(presentation.wrapper), { padding: "8px", margin: "12px" });
  assert.equal(presentation.table.borderWidth, "2px"); assert.equal(presentation.table.borderColor, "#112233"); assert.equal(presentation.table.letterSpacing, "2px"); assert.equal(presentation.table.color, "#445566"); assert.equal(presentation.table.textTransform, "uppercase");
  assert.equal(presentation.table.margin, undefined); assert.equal(presentation.wrapper.borderWidth, undefined);
});

test("Settings resets are atomic and preserve List items and Table row/cell contracts", () => {
  const { resetListSettings, resetTableSettings } = load("app/studio/blocks/text-block-settings.ts");
  const list = { id: "list", type: "list", style: "ordered", marker: "a", start: -2, reversed: true, items: [{ text: "Item", children: [{ id: "nested", type: "list", style: "unordered", items: ["Nested"] }] }], visualStyle: { textColor: "#123456" } };
  const resetList = resetListSettings(list);
  assert.equal(resetList.style, "ordered"); assert.equal(resetList.items, list.items); assert.equal(resetList.visualStyle, list.visualStyle);
  for (const field of ["marker", "start", "reversed"]) assert.equal(resetList[field], undefined);
  assert.equal(resetListSettings(list, ["start"]).marker, "a"); assert.equal(list.start, -2);
  const table = { id: "table", type: "table", rows: [["Header"], ["Body"], ["Footer"]], hasHeader: true, hasFooter: true, fixedWidth: false, cellRuns: [[[{ text: "Header", marks: ["bold"] }]], [[{ text: "Body" }]], [[{ text: "Footer" }]]], columnWidths: [100], rowHeights: [30, 40, 50], caption: "Caption", tableStyle: "stripes" };
  const resetTable = resetTableSettings(table);
  for (const field of ["fixedWidth", "hasHeader", "hasFooter"]) assert.equal(resetTable[field], undefined);
  assert.deepEqual(plain(resetTable.rows), [["Body"]]);
  assert.deepEqual(plain(resetTable.cellRuns), [table.cellRuns[1]]);
  assert.deepEqual(plain(resetTable.rowHeights), [40]);
  for (const field of ["columnWidths", "caption", "tableStyle"]) assert.equal(resetTable[field], table[field]);
  assert.equal(resetTableSettings(table, ["hasHeader"]).hasFooter, true); assert.equal(table.hasHeader, true);
});

test("default Settings controls remain visible while customised controls expose reset actions", () => {
  const { ListSettingsInspector, TableSettingsInspector } = load("app/studio/blocks/text-block-settings-inspector.tsx", { "../inspector-tools-section": { InspectorToolsSection() {} }, "../controls/toggle-setting": { ToggleSetting() {} } });
  const original = { id: "list", type: "list", style: "ordered", items: ["Item"] };
  const writes = [];
  const defaults = ListSettingsInspector({ block: original, onChange: value => writes.push(value) });
  assert.equal(defaults.props.canReset, false); assert.equal(defaults.props.options.length, 0); assert.ok(defaults.props.menuOptions.every(option => option.checked && option.disabled));
  const custom = ListSettingsInspector({ block: { ...original, start: -2, reversed: true }, onChange: value => writes.push(value) });
  assert.equal(custom.props.canReset, true); assert.equal(custom.props.menuOptions.find(option => option.id === "start").label, "Reset Start value");
  custom.props.onReset(); assert.equal(writes.length, 1); assert.equal(writes[0].items, original.items);
  const empty = TableSettingsInspector({ block: { id: "table", type: "table", rows: [] }, onChange() {} });
  assert.deepEqual(plain(empty.props.menuOptions.map(option => option.id)), ["fixedWidth"]);
});
