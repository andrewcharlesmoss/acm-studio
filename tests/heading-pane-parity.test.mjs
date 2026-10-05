import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { createRequire } from "node:module";
import vm from "node:vm";
import ts from "typescript";
import { capabilityProfileFor } from "../app/studio/blocks/capability-profiles.ts";
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

function nodes(element) { return element && typeof element === "object" ? [element, ...[element.props?.children].flat(Infinity).flatMap(nodes)] : []; }
const { HeadingLevelIcon, HeadingLevelSetting } = load("app/studio/controls/heading-level-setting.tsx");
const { BlockInspector } = load("app/studio/studio-inspectors.tsx", {
  react: { ...require("react"), useId: () => "heading-inspector-fixture", useState: value => [typeof value === "function" ? value() : value, () => {}], useEffect: () => {} },
});
function inspector(block, onChange = () => {}) {
  return BlockInspector({ block, onChange, onOpenFiles: () => {}, canOpenFiles: false, fontSizeModeScope: "fixture", fontSizeViewModes: {}, onFontSizeViewModeChange: () => {} });
}

test("Heading level buttons retain a single semantic selection, including disabled native buttons", () => {
  for (const level of [1, 2, 3, 4, 5, 6]) {
    const writes = [];
    const buttons = nodes(HeadingLevelSetting({ value: level, onChange: value => writes.push(value) })).filter(node => node.type === "button");
    assert.equal(buttons.length, 6);
    assert.equal(buttons.filter(button => button.props["aria-pressed"]).length, 1);
    assert.equal(buttons[level - 1].props["aria-pressed"], true);
    buttons[level - 1].props.onClick();
    assert.deepEqual(writes, [level]);
  }
  assert.ok(nodes(HeadingLevelSetting({ value: 2, disabled: true, onChange() {} })).filter(node => node.type === "button").every(button => button.props.disabled && button.props.type === "button"));
});

test("real Heading inspector changes only level and keeps header and selector in sync", () => {
  let block = { id: "heading", type: "heading", level: 2, text: "Keep the content", align: "centre", runs: [{ text: "Keep", marks: ["bold"] }], visualStyle: { textColor: "#123456", padding: "1rem" } };
  const original = structuredClone(block);
  for (const level of [1, 3, 6, 2]) {
    const tree = nodes(inspector(block, next => { block = next; }));
    const chooser = tree.find(node => node.type.name === "HeadingLevelSetting");
    assert.ok(chooser);
    chooser.props.onChange(level);
    assert.deepEqual(JSON.parse(JSON.stringify(block)), { ...original, level });
    const updated = nodes(inspector(block));
    assert.ok(updated.some(node => node.type === "h2" && node.props.children === `Heading ${level}`));
    assert.equal(updated.find(node => node.type.name === "HeadingLevelSetting").props.value, level);
    assert.ok(!updated.some(node => node.type.name === "InspectorAccordionSection" && node.props.title?.props?.children === "Text"));
  }
});

test("default Heading hides image chooser but retained image backgrounds keep editing and reset support", () => {
  const base = { id: "heading", type: "heading", level: 2, text: "Heading" };
  const defaultStyle = nodes(inspector(base)).find(node => node.type.name === "ParagraphInspector");
  assert.equal(defaultStyle.props.backgroundImageControls, undefined);
  const image = { ...base, visualStyle: { backgroundImageMediaId: "saved", backgroundSize: "cover", backgroundPositionX: 20 } };
  const retained = nodes(inspector(image)).find(node => node.type.name === "ParagraphInspector");
  assert.equal(retained.props.backgroundImageControls.props.block, image);
  assert.equal(retained.props.backgroundImageOptions.props.block, image);
  assert.ok(capabilityProfileFor("heading").controls.find(control => control.id === "background").resetFields.includes("backgroundImageMediaId"));
});

test("Heading catalogue dependency resolves to the shared level control and alignment stays on the canvas", () => {
  assert.ok(studioControlEntryById["heading-level"]);
  const profile = capabilityProfileFor("heading");
  assert.ok(profile.dependencies.some(entry => entry.id === "heading-level"));
  assert.equal(profile.controls.find(control => control.id === "text-alignment").placement, "canvas");
  assert.equal(profile.controls.find(control => control.id === "level").placement, "inspector");
});

test("all Heading level marks resolve to shared catalogue SVG geometry", () => {
  const { iconMetadata, iconGeometry } = require("@acm/icons");
  for (const [index, word] of ["one", "two", "three", "four", "five", "six"].entries()) {
    const name = `text.heading-${word}`;
    const icon = HeadingLevelIcon({ level: index + 1 });
    assert.equal(icon.props.name, name);
    assert.equal(iconMetadata[name].label, `Heading ${index + 1}`);
    const svg = icon.type(icon.props);
    assert.equal(svg.type, "svg");
    assert.equal(svg.props["aria-hidden"], true);
    assert.deepEqual(JSON.parse(JSON.stringify(nodes(svg).filter(node => node.type === "path").map(node => node.props.d))), iconGeometry[name]["Regular-M"].paths.map(path => path.d));
  }
});
