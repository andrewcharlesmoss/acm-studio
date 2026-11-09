import test from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { loadProductionModule } from "./production-module.mjs";

const { GroupLayoutControls } = await loadProductionModule(new URL("../app/studio/blocks/group-layout-controls.tsx", import.meta.url));
const { GROUP_LAYOUT_CONTROL_CONTRACT, groupChildInspectorCapabilities, groupLayoutControlsFor, groupLayoutMenuActionsFor, groupLayoutRequiredMenuFor } = await loadProductionModule(new URL("../app/studio/blocks/group-layout-contract.ts", import.meta.url));

function renderRow(changes = {}, navigation = false) {
  return renderToStaticMarkup(createElement(GroupLayoutControls, {
    block: { id: "row", type: "group", layout: "row", children: [], ...changes },
    navigation,
    onChange() {},
  }));
}

function renderFlow(changes = {}) {
  return renderToStaticMarkup(createElement(GroupLayoutControls, {
    block: { id: "flow", type: "group", layout: "flow", contentWidth: "constrained", inheritLayout: true, children: [], ...changes },
    onChange() {},
  }));
}

function renderGrid(changes = {}) {
  return renderToStaticMarkup(createElement(GroupLayoutControls, {
    block: { id: "grid", type: "group", layout: "grid", children: [], ...changes },
    onChange() {},
  }));
}

test("Row layout shows the default controls without exposing optional settings", () => {
  const html = renderRow({ verticalAlign: "centre" });
  assert.match(html, /aria-label="Justification"/);
  assert.match(html, /aria-label="Orientation"/);
  assert.doesNotMatch(html, /aria-label="Alignment"/);
  assert.doesNotMatch(html, /Allow sizing on children/);
});

test("authored Row alignment remains visible without a Studio-only child sizing toggle", () => {
  const authored = renderRow({ verticalAlign: "bottom", allowSizingOnChildren: true });
  assert.match(authored, /aria-label="Alignment"/);
  assert.doesNotMatch(authored, /Allow sizing on children/);
  assert.match(renderRow({ allowWrap: false }), /Allow to wrap to multiple lines/);
});

test("flow Justification stays optional and appears once when enabled or authored", () => {
  assert.equal((renderFlow().match(/<legend>Justification<\/legend>/g) ?? []).length, 0);
  assert.equal((renderFlow({ horizontalAlign: "centre" }).match(/<legend>Justification<\/legend>/g) ?? []).length, 1);
});

test("layout options and child sizing conditions follow the shared Gutenberg contract", () => {
  assert.deepEqual(GROUP_LAYOUT_CONTROL_CONTRACT.flow.optional.map(option => option.id), ["content-width", "wide-width", "justification"]);
  assert.deepEqual(GROUP_LAYOUT_CONTROL_CONTRACT.flow.requiredMenu, []);
  assert.deepEqual(GROUP_LAYOUT_CONTROL_CONTRACT.row.requiredMenu.map(option => option.label), ["Justification", "Orientation"]);
  assert.deepEqual(GROUP_LAYOUT_CONTROL_CONTRACT.stack.optional.map(option => option.id), ["alignment", "wrapping"]);
  assert.deepEqual(GROUP_LAYOUT_CONTROL_CONTRACT.grid.requiredMenu.map(option => option.label), ["Columns and rows", "Min. column width"]);
  for (const option of [...GROUP_LAYOUT_CONTROL_CONTRACT.row.requiredMenu, ...GROUP_LAYOUT_CONTROL_CONTRACT.stack.requiredMenu, ...GROUP_LAYOUT_CONTROL_CONTRACT.grid.requiredMenu]) {
    assert.equal(option.checked, true);
    assert.equal(option.disabled, true);
  }
  assert.deepEqual(groupChildInspectorCapabilities({ type: "group", layout: "row", allowSizingOnChildren: true }), { flexItemParent: "row", flexItemSizingEnabled: true, gridItemParent: false });
  assert.deepEqual(groupChildInspectorCapabilities({ type: "group", layout: "stack", allowSizingOnChildren: true }), { flexItemParent: "stack", flexItemSizingEnabled: true, gridItemParent: false });
  assert.deepEqual(groupChildInspectorCapabilities({ type: "group", layout: "grid" }), { flexItemParent: false, flexItemSizingEnabled: false, gridItemParent: true });
  assert.deepEqual(groupChildInspectorCapabilities({ type: "group", layout: "row", allowSizingOnChildren: false }), { flexItemParent: "row", flexItemSizingEnabled: false, gridItemParent: false });
  assert.deepEqual(groupChildInspectorCapabilities({ type: "group", layout: "row" }), { flexItemParent: "row", flexItemSizingEnabled: false, gridItemParent: false });
  assert.deepEqual(groupChildInspectorCapabilities(null), { flexItemParent: false, flexItemSizingEnabled: false, gridItemParent: false });
  const rightAlignedRow = { type: "group", layout: "row", horizontalAlign: "right", children: [] };
  assert.deepEqual(groupLayoutMenuActionsFor(rightAlignedRow).map(option => option.label), ["Reset Justification"]);
  assert.deepEqual(groupLayoutRequiredMenuFor(rightAlignedRow).map(option => option.label), ["Orientation"]);
  const centredStack = { type: "group", layout: "stack", verticalAlign: "centre", children: [] };
  assert.deepEqual(groupLayoutMenuActionsFor(centredStack).map(option => option.label), ["Reset Justification"]);
  assert.deepEqual(groupLayoutRequiredMenuFor(centredStack).map(option => option.label), ["Orientation"]);
});

test("Stack shows its main-axis Justification and keeps cross-axis Alignment optional", () => {
  const html = renderToStaticMarkup(createElement(GroupLayoutControls, {
    block: { id: "stack", type: "group", layout: "stack", children: [] },
    onChange() {},
  }));
  assert.match(html, /<legend>Justification<\/legend>/);
  assert.match(html, /aria-label="Orientation: Horizontal"/);
  assert.doesNotMatch(html, /<legend>Alignment<\/legend>/);
});

test("constrained Group exposes width options and reset; full-width Group hides them without dropping saved values", () => {
  const constrained = { type: "group", layout: "flow", contentWidth: "constrained", inheritLayout: true, children: [] };
  const fullWidth = { ...constrained, contentWidth: "full", contentSize: "48rem", wideSize: "72rem", inheritLayout: false };
  assert.deepEqual(groupLayoutControlsFor("flow", constrained).map(option => option.id), ["content-width", "wide-width", "justification"]);
  assert.deepEqual(groupLayoutMenuActionsFor(constrained).map(option => option.label), ["Reset Use content width"]);
  assert.deepEqual(groupLayoutControlsFor("flow", fullWidth), []);
  assert.deepEqual(groupLayoutMenuActionsFor(fullWidth).map(option => option.label), ["Reset Use content width"]);
  const rendered = renderFlow(fullWidth);
  assert.doesNotMatch(rendered, /Content width|Wide width|Justification/);
  assert.match(rendered, /Inner blocks use content width/);
});

test("Grid shows Gutenberg's required sizing fields and keeps Fill available space optional", () => {
  const defaults = renderGrid();
  assert.match(defaults, /Max\. columns/);
  assert.match(defaults, /Min\. column width/);
  assert.doesNotMatch(defaults, /Fill available space/);
  assert.match(defaults, /<option value="px"/);
  assert.match(defaults, /<option value="rem"/);
  assert.match(defaults, /<option value="em"/);
  assert.doesNotMatch(defaults, /<option value="vw"/);
  assert.match(renderGrid({ fillAvailableSpace: true }), /Fill available space/);
});
