import test from "node:test";
import assert from "node:assert/strict";
import { loadProductionModule } from "./production-module.mjs";
const load = path => loadProductionModule(new URL(path, import.meta.url));
const { createBlock, blockCatalogue } = await load("../app/studio/editor-model.ts");
const { availableBlockTransforms, transformBlock } = await load("../app/studio/block-transforms.ts");
const { groupAllowsChild, blockInserterOptions } = await load("../app/studio/block-inserter-options.ts");
const { layoutDataAttributes, layoutStyleProperties } = await load("../app/content/layout.ts");
test("all four insertion choices use the portable Group contract and defaults", () => {
  const choices = blockCatalogue.filter(item => ["group", "row", "stack", "grid"].includes(item.type));
  assert.deepEqual(choices.map(item => item.label), ["Group", "Row", "Stack", "Grid"]);
  for (const choice of choices) {
    const block = createBlock(choice.type, "new-group");
    assert.equal(block.type, "group");
    assert.equal(block.layout, choice.type === "group" ? "flow" : choice.type);
    assert.deepEqual(block.children, []);
  }
  assert.equal(createBlock("row").allowWrap, false);
  assert.equal(createBlock("grid").minColumnWidthUnit, "rem");
});
test("every variation transforms mutually without losing nested data or presentation", () => {
  for (const variation of ["group", "row", "stack", "grid"]) {
    const block = { ...createBlock(variation, "preserved"), children: [{ id: "child", type: "paragraph", text: "Keep" }], visualStyle: { backgroundColor: "#FFFFFF" }, tagName: "header", ariaLabel: "Site", allowedBlocks: ["paragraph"] };
    const transforms = availableBlockTransforms(block);
    assert.equal(transforms.length, 3);
    for (const transform of transforms) {
      const next = transformBlock(block, transform);
      assert.equal(next.type, "group"); assert.equal(next.id, block.id);
      assert.equal(next.children, block.children); assert.equal(next.visualStyle, block.visualStyle);
      assert.equal(next.tagName, "header"); assert.equal(next.ariaLabel, "Site");
      assert.deepEqual(next.allowedBlocks, ["paragraph"]);
    }
  }
});
test("allowed-block restrictions treat every insertion alias as Group", () => {
  const allowed = { ...createBlock("group"), allowedBlocks: ["group"] };
  const denied = { ...allowed, allowedBlocks: ["paragraph"] };
  for (const variation of ["group", "row", "stack", "grid"]) { assert.equal(groupAllowsChild(allowed, variation), true); assert.equal(groupAllowsChild(denied, variation), false); }
  assert.deepEqual(blockInserterOptions(blockCatalogue, allowed, "").map(item => item.type), ["group", "row", "stack", "grid"]);
});
test("full-width toggle releases constraints and explicit auto-grid caps remain honoured", () => {
  assert.equal(layoutDataAttributes({ layout: "flow", inheritLayout: true })["data-layout-constrained"], "true");
  assert.equal(layoutDataAttributes({ layout: "flow", inheritLayout: true, contentWidth: "full" })["data-layout-constrained"], undefined);
  assert.equal(layoutStyleProperties({ layout: "grid", gridMode: "auto" })["--block-layout-max-column-width"], "0px");
  assert.match(layoutStyleProperties({ layout: "grid", gridMode: "auto", columns: 4 })["--block-layout-max-column-width"], /4/);
});

test("changing a legacy minimum to Grid retains its implicit pixel unit", () => {
  const legacy = { ...createBlock("group"), minColumnWidth: 192 };
  const next = transformBlock(legacy, availableBlockTransforms(legacy).find(transform => transform.layout === "grid"));
  assert.equal(next.minColumnWidth, 192); assert.equal(next.minColumnWidthUnit, "px");
});

test("Grid isolates inactive flex alignment and keeps it recoverable for later transforms", () => {
  const source = { ...createBlock("stack"), horizontalAlign: "right", verticalAlign: "bottom" };
  const grid = transformBlock(source, availableBlockTransforms(source).find(transform => transform.layout === "grid"));
  assert.equal(grid.horizontalAlign, "right"); assert.equal(grid.verticalAlign, "bottom");
  const style = layoutStyleProperties(grid);
  assert.equal(style["--block-layout-horizontal-align"], "stretch");
  assert.equal(style["--block-layout-vertical-align"], "stretch");
  const stack = transformBlock(grid, availableBlockTransforms(grid).find(transform => transform.layout === "stack"));
  assert.equal(layoutStyleProperties(stack)["--block-layout-horizontal-align"], "end");
  assert.equal(layoutStyleProperties(stack)["--block-layout-vertical-align"], "end");
});

test("Section Grid retains its separately exposed alignment controls", () => {
  const section = { type: "section", layout: "grid", horizontalAlign: "right", verticalAlign: "bottom" };
  const style = layoutStyleProperties(section);
  assert.equal(style["--block-layout-horizontal-align"], "end");
  assert.equal(style["--block-layout-vertical-align"], "end");
  assert.equal(layoutDataAttributes(section)["data-layout-horizontal-align"], "right");
});
