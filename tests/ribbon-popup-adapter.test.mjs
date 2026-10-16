import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import ts from "typescript";
import { accountExample } from "../app/studio/ribbon/catalogue-model.ts";
import * as demo from "../app/studio/ribbon/demo-state.ts";

const require = createRequire(import.meta.url);
const Menu = () => null;
const Popover = () => null;
function fixture(menu, columns = demo.fixtureColumns, showBoundaries = false) {
  const focus = [];
  const refs = [];
  const react = { ...require("react"), useRef: value => { const ref = { current: value }; refs.push(ref); return ref; } };
  const exports = {};
  const code = ts.transpileModule(readFileSync(new URL("../app/studio/ribbon/ribbon-preview.tsx", import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(code, { exports, require: name => {
    if (name === "react") return react;
    if (name === "./demo-state") return demo;
    if (name === "../overlays/anchored-menu") return { StudioAnchoredMenu: Menu };
    if (name === "../overlays/anchored-popover") return { StudioAnchoredPopover: Popover };
    if (name === "@acm/ribbon") return Object.fromEntries(["Ribbon", "RibbonPanel", "RibbonGroup", "RibbonControls"].map(key => [key, key]));
    if (name === "react/jsx-runtime" || name === "@acm/icons/react") return require(name);
    return {};
  } });
  let state = { ...demo.initialDemo(accountExample), menu, columns };
  const tree = exports.RibbonPreview({ example: accountExample, tab: "view", setTab() {}, state, setState: update => { state = update(state); }, showScenarios: false, showFixture: false, showStatus: false, showBoundaries });
  refs[2].current = { querySelector: selector => ({ focus: () => focus.push(selector) }) };
  const overlay = tree.props.children.find(child => child?.type === (menu === "columns" ? Popover : Menu));
  return { overlay, focus, state: () => state };
}

test("Ribbon popup adapters use distinct shared behaviours and honour focus restoration", () => {
  for (const menu of ["highlight", "columns"]) {
    const f = fixture(menu);
    assert.ok(f.overlay, `Expected shared ${menu} overlay`);
    assert.equal(f.overlay.props.onKeyDown, undefined, "The consumer must not install a local keyboard trap");
    f.overlay.props.onClose(false);
    assert.equal(f.state().menu, null);
    assert.deepEqual(f.focus, [], "Outside dismissal retains the clicked target's focus");
    const restored = fixture(menu);
    restored.overlay.props.onClose(true);
    assert.deepEqual(restored.focus, [menu === "columns" ? '[data-region="account.columns"]' : '[data-region="account.highlight.menu"]']);
  }
});

test("Columns retains its final column while disabled inputs are left to native navigation", () => {
  const f = fixture("columns", ["name"]);
  assert.equal(f.overlay.props.focusOnMount, true);
  const labels = f.overlay.props.children[1];
  assert.equal(labels[0].props.disabled, true);
  assert.equal(labels[1].props.disabled, false);
  labels[1].props.onChange(true);
  assert.deepEqual(f.state().columns, ["name", "username"]);
  assert.equal(f.state().menu, "columns", "Changing visibility keeps the form open");
});

test("Ribbon popup boundaries follow the owning catalogue option", () => {
  for (const menu of ["highlight", "columns"]) {
    assert.equal(fixture(menu).overlay.props.className, "rl-popup");
    assert.equal(fixture(menu, demo.fixtureColumns, true).overlay.props.className, "rl-popup rl-outlines");
  }
});
