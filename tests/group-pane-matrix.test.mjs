import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { loadProductionModule } from "./production-module.mjs";

const load = path => loadProductionModule(new URL(path, import.meta.url));
const { createBlock } = await load("../app/studio/editor-model.ts");
const { BlockInspector } = await load("../app/studio/blocks/inspectors/block-inspector.tsx");
const { GROUP_DIMENSION_UNITS, groupChildInspectorCapabilities } = await load("../app/studio/blocks/group-layout-contract.ts");
const { GROUP_SHADOW_PRESETS } = await load("../app/studio/controls/shadow-preset-select.tsx");
const { inspectorStyleHasValues, resetSupportedInspectorStyleFields } = await load("../app/studio/blocks/inspector-style-actions.ts");
const { capabilityProfileFor } = await load("../app/studio/blocks/capability-profiles.ts");

function pane(type, parent) {
  return renderToStaticMarkup(React.createElement(BlockInspector, {
    block: createBlock(type, "selected"), canSetSticky: true,
    ...groupChildInspectorCapabilities(parent),
    onChange() {}, onOpenFiles() {}, canOpenFiles: false,
    fontSizeModeScope: "matrix", fontSizeViewModes: {}, onFontSizeViewModeChange() {},
  }));
}

for (const variation of ["group", "row", "stack", "grid"]) {
  test(`${variation} shares the complete default section order without legacy pane extras`, () => {
    const html = pane(variation);
    const headings = [...html.matchAll(/<h2[^>]*>(.*?)<\/h2>/g)].map(match => match[1].replace(/<[^>]*>/g, ""));
    assert.deepEqual(headings.slice(1), ["Styles", "Typography", "Background", "Layout", "Dimensions", "Border &amp; Shadow", "Elements", "Position", "Advanced"]);
    assert.match(html, /role="radiogroup"[^>]*aria-labelledby/);
    assert.match(html, /aria-label="Group"/);
    assert.match(html, /aria-label="Grid"/);
    assert.doesNotMatch(html, /Allow sizing on children|Link block spacing|Unlink block spacing|Font family|Grid layout mode/);
    assert.doesNotMatch(html, /aria-label="Minimum height value"|aria-label="Minimum width value"|aria-label="Drop shadow"/);
    assert.match(html, /<option value="%">%<\/option>/);
    assert.doesNotMatch(html, /<option value="ch">ch<\/option>/);
    assert.match(html, /aria-expanded="false"[^>]*>[\s\S]*?Advanced/);
  });

  test(`${variation} receives sizing only from the equivalent parent layout`, () => {
    const root = pane(variation);
    const normal = pane(variation, createBlock("group"));
    for (const html of [root, normal]) assert.doesNotMatch(html, /<legend[^>]*>(Width|Height)<\/legend>|aria-label="Column span"|aria-label="Row span"/);
    for (const [parent, label] of [["row", "Width"], ["stack", "Height"]]) {
      const html = pane(variation, createBlock(parent));
      assert.match(html, new RegExp(`<legend[^>]*>${label}</legend>`));
      for (const mode of ["fit", "grow", "max", "fixed"]) assert.match(html, new RegExp(`value="${mode}"`));
      assert.doesNotMatch(html, /aria-label="Column span"|aria-label="Row span"/);
    }
    const grid = pane(variation, createBlock("grid"));
    assert.match(grid, /aria-label="Column span"[^>]*max="16"/);
    assert.match(grid, /aria-label="Row span"[^>]*max="16"/);
    assert.doesNotMatch(grid, /<legend[^>]*>(Width|Height)<\/legend>/);
  });
}

test("Group background Reset all covers image and presentation fields without clearing unrelated styles", () => {
  const controls = capabilityProfileFor("group").controls;
  const style = { backgroundImageMediaId: "image", backgroundSize: "cover", backgroundPositionX: 30, backgroundGradient: "linear-gradient(red,blue)", textColor: "#123456", gridItemSizing: { rowSpan: 2 } };
  assert.equal(inspectorStyleHasValues(style, ["background"], controls), true);
  assert.deepEqual(resetSupportedInspectorStyleFields(style, ["background"], controls), { textColor: "#123456", gridItemSizing: { rowSpan: 2 } });
});

test("Group Dimensions has one canonical control for each reference menu row in order", () => {
  const dimensions = capabilityProfileFor("group").controls.filter(control => control.section === "dimensions");
  assert.deepEqual(dimensions.map(control => control.id), ["padding", "margin", "gaps", "min-height", "min-width"]);
  assert.deepEqual(GROUP_DIMENSION_UNITS, ["px", "%", "em", "rem", "vw", "vh"]);
});

test("Group shadow presets expose only the five reference theme presets", () => {
  assert.deepEqual(GROUP_SHADOW_PRESETS.map(preset => preset.label), ["Natural", "Deep", "Sharp", "Outlined", "Crisp"]);
  assert.equal(GROUP_SHADOW_PRESETS.every(preset => preset.css && preset.css !== "undefined"), true);
});
