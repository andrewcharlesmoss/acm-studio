import test from "node:test";
import assert from "node:assert/strict";
import { loadProductionModule } from "./production-module.mjs";
const load = path => loadProductionModule(new URL(path, import.meta.url));
const { createBlock, blockCatalogue } = await load("../app/studio/editor-model.ts");
const { availableBlockTransforms, transformBlock } = await load("../app/studio/block-transforms.ts");
const { groupAllowsChild, blockInserterOptions } = await load("../app/studio/block-inserter-options.ts");
const { groupUsesContentWidth } = await load("../app/studio/blocks/group-layout-alignment.ts");
const { GROUP_ALLOWED_BLOCK_TYPES, GROUP_SELECTABLE_BLOCK_TYPES } = await load("../app/content/model.ts");
const { validContentBlocks } = await load("../app/studio/workspace-validation.ts");
const { createTemplateSet, validateTemplateSet } = await load("../app/studio/template-model.ts");
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
test("Group allowlists control insertion of supported child block types", () => {
  const allowed = { ...createBlock("group"), allowedBlocks: ["group"] };
  const denied = { ...allowed, allowedBlocks: ["paragraph"] };
  for (const variation of ["group", "row", "stack", "grid"]) {
    assert.equal(groupAllowsChild(allowed, variation), true);
    assert.equal(groupAllowsChild(denied, variation), false);
  }
  assert.equal(groupAllowsChild(allowed, "paragraph"), false);
  assert.equal(groupAllowsChild(denied, "paragraph"), true);
  assert.deepEqual(blockInserterOptions(blockCatalogue, allowed, "").map(item => item.type), ["group", "row", "stack", "grid"]);
  assert.deepEqual(blockInserterOptions(blockCatalogue, denied, "").map(item => item.type), ["paragraph"]);
  assert.equal(blockInserterOptions(blockCatalogue, { ...allowed, allowedBlocks: undefined }, "").length > 4, true);
});
test("full-width toggle releases constraints and explicit auto-grid caps remain honoured", () => {
  assert.equal(layoutDataAttributes({ layout: "flow", inheritLayout: true })["data-layout-constrained"], "true");
  assert.equal(layoutDataAttributes({ layout: "flow", inheritLayout: true, contentWidth: "full" })["data-layout-constrained"], undefined);
  assert.equal(layoutStyleProperties({ layout: "grid", gridMode: "auto" })["--block-layout-max-column-width"], "0px");
  assert.match(layoutStyleProperties({ layout: "grid", gridMode: "auto", columns: 4 })["--block-layout-max-column-width"], /4/);
});

test("flow justification is available only when a Group has a constrained content width", () => {
  const group = { ...createBlock("group"), inheritLayout: true };
  assert.equal(groupUsesContentWidth(group), true);
  assert.equal(groupUsesContentWidth({ ...group, contentWidth: "full" }), false);
  assert.equal(groupUsesContentWidth({ ...group, inheritLayout: undefined }), false);
});

test("Group allowed block choices match the block types its inserter can offer", () => {
  const group = { ...createBlock("group"), allowedBlocks: [...GROUP_SELECTABLE_BLOCK_TYPES] };
  const storedTypes = new Set(blockInserterOptions(blockCatalogue, group, "").map(item =>
    ["row", "stack", "grid"].includes(item.type) ? "group" : item.type
  ));
  assert.deepEqual([...storedTypes].sort(), [...GROUP_SELECTABLE_BLOCK_TYPES].sort());
  assert.deepEqual([...GROUP_ALLOWED_BLOCK_TYPES].filter(type => !GROUP_SELECTABLE_BLOCK_TYPES.includes(type)), ["button", "social-linkedin", "social-tiktok"]);
});

test("legacy Group and Column allowlists remain valid in workspace and template records", () => {
  const legacyAllowedBlocks = ["button", "social-linkedin", "social-tiktok"];
  assert.equal(validContentBlocks([{ id: "legacy-group", type: "group", layout: "flow", allowedBlocks: legacyAllowedBlocks, children: [] }]), true);
  assert.equal(validContentBlocks([{ id: "legacy-columns", type: "columns", children: [{ id: "legacy-column", type: "column", allowedBlocks: legacyAllowedBlocks, children: [] }] }]), true);

  const template = createTemplateSet("Legacy allowlist");
  template.parts[0].nodes[0].allowedBlocks = legacyAllowedBlocks;
  const restored = validateTemplateSet(JSON.parse(JSON.stringify(template)));
  assert.deepEqual(restored.parts[0].nodes[0].allowedBlocks, legacyAllowedBlocks);
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
