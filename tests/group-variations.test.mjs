import test from "node:test";
import assert from "node:assert/strict";
import { compileProductionModule, loadProductionModule } from "./production-module.mjs";
const load = path => loadProductionModule(new URL(path, import.meta.url));
const { createBlock, blockCatalogue } = await load("../app/studio/editor-model.ts");
const { availableBlockTransforms, transformBlock } = await load("../app/studio/block-transforms.ts");
const { groupAllowsChild, blockInserterOptions } = await load("../app/studio/block-inserter-options.ts");
const { groupUsesContentWidth } = await load("../app/studio/blocks/group-layout-alignment.ts");
const { changeGroupLayout, changeGroupOrientation, changeGroupGridMode, createGroupVariation, groupStyleVariation, resetGroupLayout, setGroupStyleVariation, updateGroupGridOptions } = await load("../app/studio/blocks/group-variations.ts");
const { GROUP_ALLOWED_BLOCK_TYPES, GROUP_SELECTABLE_BLOCK_TYPES } = await load("../app/content/model.ts");
const { validContentBlocks, validParagraphStyle, migrateStudioWorkspace, validatePublicationSnapshot } = await load("../app/studio/workspace-validation.ts");
const { createTemplateSet, emptyTemplateStore, TEMPLATE_VERSION, validateTemplateSet, validateTemplateStore } = await load("../app/studio/template-model.ts");
const { initialStudioWorkspace } = await load("../app/studio/editor-model.ts");
const { blockToHtml } = await load("../app/studio/studio-html-editor.ts");
const { BLOCK_CLIPBOARD_VERSION, blockClipboardHtml, readBlockClipboardPayload } = await load("../app/studio/block-clipboard.ts");
const { validateStudioBackup } = await load("../app/studio/backup-store.ts");
const { validateTemplatePackage } = await load("../app/studio/template-package.ts");
const { testSiteCollection, validTestSiteDocument } = await load("../app/studio/test-site/contract.ts");
const { validateGlobalTemplateLibrary } = await load("../app/studio/global-template-contract.ts");
const { containsGridItemSizing, gridItemSizingStyle, gridSpanFromDelta, gridSpanFromKey, groupGridItemStyle, validGridItemSizing } = await load("../app/content/grid-child-sizing.ts");
const { BlockVisualFrame } = await load("../app/components/blocks/block-visual-frame.tsx");
const { BlockInspector } = await load("../app/studio/blocks/inspectors/block-inspector.tsx");
const { BlockRenderer } = await import(await compileProductionModule(new URL("../app/components/content.tsx", import.meta.url)));
const React = await import("react");
const { renderToStaticMarkup } = await import("react-dom/server");
const { blockLayoutItemStyle, flexItemSizingStyle, groupChildFlexItemStyle, layoutDataAttributes, layoutStyleProperties, resetBlockLayoutItemSizing, updateBlockLayoutItemStyle, updateFlexItemChild, validLayoutOptions } = await load("../app/content/layout.ts");
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
  assert.equal(createBlock("stack").allowWrap, true);
  assert.equal(createBlock("row").allowSizingOnChildren, true);
  assert.equal(createBlock("stack").allowSizingOnChildren, true);
  assert.equal(createBlock("grid").minColumnWidthUnit, "rem");
  assert.equal(createBlock("grid").fillAvailableSpace, false);
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

test("layout variations retain disabled legacy child sizing until an authored child sizing edit opts in", () => {
  const legacyRow = { ...createBlock("row", "legacy-row"), allowSizingOnChildren: false };
  assert.equal(changeGroupLayout(legacyRow, "stack").allowSizingOnChildren, false);
  const converted = changeGroupLayout(legacyRow, "flow");
  assert.equal(changeGroupLayout(converted, "row").allowSizingOnChildren, false);
  const sizedChild = { ...createBlock("paragraph", "sized-child"), style: { flexItemSizing: { mode: "grow" } } };
  assert.equal(groupChildFlexItemStyle(legacyRow, blockLayoutItemStyle(sizedChild)), undefined);
  const explicitlySizedChild = updateBlockLayoutItemStyle(sizedChild, style => ({ ...style, flexItemSizing: { mode: "fixed", size: "240px" } }));
  const optedIn = updateFlexItemChild({ ...legacyRow, children: [sizedChild] }, explicitlySizedChild);
  assert.equal(optedIn.allowSizingOnChildren, false);
  assert.deepEqual(groupChildFlexItemStyle(optedIn, blockLayoutItemStyle(explicitlySizedChild)), { flexGrow: 0, flexShrink: 0, flexBasis: "240px" });

  const legacyGrid = { ...createBlock("grid", "legacy-grid"), gridMode: undefined, fillAvailableSpace: undefined };
  assert.equal(changeGroupLayout(legacyGrid, "grid"), legacyGrid);
  const row = changeGroupLayout(legacyGrid, "row");
  assert.equal(row.fillAvailableSpace, undefined);
  const restoredGrid = changeGroupLayout(row, "grid");
  assert.equal(restoredGrid.fillAvailableSpace, false);
  assert.equal(restoredGrid.columns, undefined);
  assert.equal(restoredGrid.minColumnWidth, 12);
  assert.equal(restoredGrid.minColumnWidthUnit, "rem");
  const manualGrid = { ...createBlock("grid", "manual-grid"), gridMode: "manual", columns: 4, minColumnWidth: 180, minColumnWidthUnit: "px" };
  const manualRoundTrip = changeGroupLayout(changeGroupLayout(manualGrid, "row"), "grid");
  assert.equal(manualRoundTrip.gridMode, "auto");
  assert.equal(manualRoundTrip.columns, undefined);
  assert.equal(manualRoundTrip.minColumnWidth, 12);
  const newGrid = createGroupVariation("grid", "unbounded-grid");
  assert.equal(newGrid.gridMode, "auto");
  assert.equal(newGrid.fillAvailableSpace, false);
  assert.equal(newGrid.minColumnWidth, 12);
  assert.equal(newGrid.minColumnWidthUnit, "rem");
  assert.equal(layoutStyleProperties(newGrid)["--block-layout-max-column-width"], "0px");
  assert.equal(layoutStyleProperties({ ...legacyGrid, fillAvailableSpace: false })["--block-layout-grid-repeat"], "auto-fill");
  assert.equal(layoutStyleProperties({ ...legacyGrid, fillAvailableSpace: true })["--block-layout-grid-repeat"], "auto-fit");
  assert.equal(layoutStyleProperties({ type: "group", layout: "grid" })["--block-layout-min-column-width"], "192px");
  assert.equal(layoutStyleProperties({ type: "section", layout: "grid" })["--block-layout-min-column-width"], "192px");
  const reset = resetGroupLayout({ ...manualGrid, fillAvailableSpace: true, horizontalAlign: "centre", allowWrap: false });
  assert.equal(reset.gridMode, "auto");
  assert.equal(reset.fillAvailableSpace, false);
  assert.equal(reset.columns, undefined);
  assert.equal(reset.minColumnWidth, 12);
  assert.equal(reset.minColumnWidthUnit, "rem");
  assert.equal(layoutStyleProperties(reset)["--block-layout-grid-repeat"], "auto-fill");
});

test("layout item sizing uses the established style fields and resets legacy visual-style values", () => {
  for (const type of ["paragraph", "columns", "column"]) {
    const block = { ...createBlock(type, `layout-${type}`), style: { color: "#123456" }, visualStyle: { backgroundColor: "#FFFFFF", flexItemSizing: { mode: "grow" }, gridItemSizing: { columnSpan: 2 } } };
    assert.equal(blockLayoutItemStyle(block).flexItemSizing.mode, "grow");
    assert.equal(blockLayoutItemStyle(block).gridItemSizing.columnSpan, 2);
    const resized = updateBlockLayoutItemStyle(block, style => ({ ...style, flexItemSizing: { mode: "fixed", size: "240px" } }));
    assert.equal(resized.style.color, "#123456");
    assert.equal(resized.style.flexItemSizing.mode, "fixed");
    assert.equal(resized.visualStyle.backgroundColor, "#FFFFFF");
    assert.equal(resized.visualStyle.flexItemSizing, undefined);
    const reset = updateBlockLayoutItemStyle(resized, style => { const next = { ...style }; delete next.flexItemSizing; delete next.gridItemSizing; return next; });
    assert.equal(reset.style.color, "#123456");
    assert.equal(reset.style.flexItemSizing, undefined);
    const columnsReset = resetBlockLayoutItemSizing(block);
    assert.equal(columnsReset.style.color, "#123456");
    assert.equal(columnsReset.visualStyle.backgroundColor, "#FFFFFF");
    assert.equal(columnsReset.visualStyle.flexItemSizing, undefined);
    assert.equal(columnsReset.visualStyle.gridItemSizing, undefined);
    assert.equal(blockLayoutItemStyle(columnsReset).flexItemSizing, undefined);
  }
});

test("block sizing reaches the shared visual frame only in its matching parent layout", () => {
  const block = { ...createBlock("paragraph", "preview-sized-paragraph"), style: { flexItemSizing: { mode: "grow" }, gridItemSizing: { columnSpan: 2 } } };
  const child = React.createElement("p", null, "Sized content");
  const standalone = renderToStaticMarkup(BlockVisualFrame({ block, children: child }));
  assert.doesNotMatch(standalone, /flex-grow:|grid-column:/);
  const row = { ...createBlock("row", "sizing-row"), allowSizingOnChildren: false };
  const activeBlock = { ...block, style: { ...block.style, flexItemSizingActive: true } };
  const rowFrame = renderToStaticMarkup(BlockVisualFrame({ block: activeBlock, layoutParent: row, children: child }));
  assert.match(rowFrame, /flex-grow:1/);
  assert.match(rowFrame, /flex-basis:0px/);
  assert.doesNotMatch(rowFrame, /grid-column:/);
  const grid = createBlock("grid", "sizing-grid");
  const gridBlock = { ...block, style: { ...block.style, gridItemSizing: { columnSpan: 2 } } };
  const gridFrame = renderToStaticMarkup(BlockVisualFrame({ block: gridBlock, layoutParent: grid, children: child }));
  assert.doesNotMatch(gridFrame, /flex-grow:/);
  assert.match(gridFrame, /grid-column:span 2/);
});
test("Group rendering keeps dormant legacy child sizes inactive and applies authored sizing", () => {
  const child = { ...createBlock("paragraph", "rendered-flex-child"), style: { flexItemSizing: { mode: "grow" } } };
  const parent = { ...createBlock("row", "rendered-sizing-row"), allowSizingOnChildren: false, children: [child] };
  const render = block => renderToStaticMarkup(React.createElement(BlockRenderer, { blocks: [block], variant: "studio" }));
  assert.doesNotMatch(render(parent), /flex-grow:1/);
  const authoredChild = updateBlockLayoutItemStyle({ ...child, style: {} }, style => ({ ...style, flexItemSizing: { mode: "grow" } }));
  assert.equal(authoredChild.style.flexItemSizingActive, true);
  assert.match(render({ ...parent, children: [authoredChild] }), /flex-grow:1/);
  const legacyVisualChild = { ...child, style: undefined, visualStyle: { flexItemSizing: { mode: "grow" }, flexItemSizingActive: true } };
  assert.equal(blockLayoutItemStyle(legacyVisualChild).flexItemSizingActive, true);
  assert.match(render({ ...parent, children: [legacyVisualChild] }), /flex-grow:1/);
});
test("legacy visualStyle sizing remains rendered while new dormant values present their effective Fit choice", () => {
  const legacyVisualChild = { ...createBlock("paragraph", "legacy-visual-child"), visualStyle: { flexItemSizing: { mode: "grow" } } };
  const legacyRow = { ...createBlock("row", "legacy-visual-row"), allowSizingOnChildren: false, children: [legacyVisualChild] };
  const render = block => renderToStaticMarkup(React.createElement(BlockRenderer, { blocks: [block], variant: "studio" }));
  assert.match(render(legacyRow), /flex-grow:1/);
  assert.match(render({ ...createBlock("grid", "legacy-grid-sizing"), children: [{ ...createBlock("paragraph", "legacy-grid-child"), visualStyle: { gridItemSizing: { columnSpan: 2 } } }] }), /grid-column:span 2/);

  const legacyBothAxes = { ...createBlock("paragraph", "legacy-both-axes"), visualStyle: { flexItemSizing: { mode: "grow" }, gridItemSizing: { columnSpan: 2 } } };
  const editedGrid = updateBlockLayoutItemStyle(legacyBothAxes, style => ({ ...style, gridItemSizing: { columnSpan: 3 } }));
  assert.deepEqual(editedGrid.visualStyle.flexItemSizing, { mode: "grow" });
  assert.equal(editedGrid.visualStyle.gridItemSizing, undefined);
  assert.match(render({ ...createBlock("row", "legacy-cross-axis-row"), allowSizingOnChildren: false, children: [editedGrid] }), /flex-grow:1/);
  const editedFlex = updateBlockLayoutItemStyle(legacyBothAxes, style => ({ ...style, flexItemSizing: { mode: "fixed", size: "240px" } }));
  assert.deepEqual(editedFlex.visualStyle.gridItemSizing, { columnSpan: 2 });
  assert.equal(editedFlex.visualStyle.flexItemSizing, undefined);
  assert.match(render({ ...createBlock("grid", "legacy-cross-axis-grid"), children: [editedFlex] }), /grid-column:span 2/);
  const legacyHeading = { ...createBlock("heading", "legacy-heading-axes"), text: "Legacy heading", visualStyle: { flexItemSizing: { mode: "grow" }, gridItemSizing: { columnSpan: 2 } } };
  const editedHeading = updateBlockLayoutItemStyle(legacyHeading, style => ({ ...style, flexItemSizing: { mode: "fixed", size: "240px" } }));
  assert.equal(editedHeading.visualStyle.flexItemSizingActive, true);
  assert.deepEqual(editedHeading.visualStyle.gridItemSizing, { columnSpan: 2 });
  assert.match(render({ ...createBlock("row", "legacy-heading-row"), allowSizingOnChildren: false, children: [editedHeading] }), /grid-column:span 2/);

  const dormant = { ...createBlock("paragraph", "dormant-sizing"), style: { flexItemSizing: { mode: "grow" } } };
  const html = renderToStaticMarkup(React.createElement(BlockInspector, {
    block: dormant,
    flexItemParent: "row",
    flexItemSizingEnabled: false,
    onChange() {},
    onOpenFiles() {},
    canOpenFiles: false,
    fontSizeModeScope: "group-layout-test",
    fontSizeViewModes: {},
    onFontSizeViewModeChange() {},
  }));
  assert.match(html, /role="radiogroup"[\s\S]*?<legend[^>]*>Width<\/legend>[\s\S]*?<input[^>]*checked="" value="fit"/);
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
  assert.equal(layoutDataAttributes({ type: "group", layout: "stack", inheritLayout: true })["data-layout-constrained"], undefined);
  assert.equal(layoutDataAttributes({ layout: "flow", inheritLayout: true })["data-layout-constrained"], "true");
  assert.equal(layoutDataAttributes({ layout: "flow", inheritLayout: true, contentWidth: "full" })["data-layout-constrained"], undefined);
  assert.equal(layoutStyleProperties({ type: "group", layout: "grid", gridMode: "auto" })["--block-layout-max-column-width"], "0px");
  assert.equal(layoutStyleProperties({ type: "section", layout: "grid" })["--block-layout-max-column-width"], "calc((100% - 0px) / 3)");
  assert.match(layoutStyleProperties({ layout: "grid", gridMode: "auto", columns: 4 })["--block-layout-max-column-width"], /4/);
});

test("first child sizing edits create optional style carriers and remain reversible", () => {
  for (const type of ["heading", "image", "group", "list", "button", "separator"]) {
    const child = createBlock(type, `unstyled-${type}`);
    delete child.visualStyle;
    const spanned = updateBlockLayoutItemStyle(child, style => ({ ...style, gridItemSizing: { columnSpan: 16, rowSpan: 2 } }));
    assert.deepEqual(blockLayoutItemStyle(spanned).gridItemSizing, { columnSpan: 16, rowSpan: 2 });
    const sized = updateBlockLayoutItemStyle(child, style => ({ ...style, flexItemSizing: { mode: "fixed", size: "240px" } }));
    assert.deepEqual(blockLayoutItemStyle(sized).flexItemSizing, { mode: "fixed", size: "240px" });
    assert.equal(blockLayoutItemStyle(sized).flexItemSizingActive, true);
    assert.equal(child.visualStyle, undefined);
    assert.equal(blockLayoutItemStyle(resetBlockLayoutItemSizing(spanned)), undefined);
  }
});

test("flow justification is available only when a Group has a constrained content width", () => {
  const group = { ...createBlock("group"), inheritLayout: true };
  assert.equal(groupUsesContentWidth(group), true);
  assert.equal(layoutDataAttributes(group)["data-layout-justification"], "centre");
  assert.equal(layoutDataAttributes({ ...group, horizontalAlign: "left" })["data-layout-justification"], "left");
  assert.equal(layoutDataAttributes({ ...group, horizontalAlign: "right" })["data-layout-justification"], "right");
  assert.equal(groupUsesContentWidth({ ...group, contentWidth: "full" }), false);
  assert.equal(groupUsesContentWidth({ ...group, inheritLayout: undefined }), false);
});

test("Group section variations change only the owned style class and preserve other classes", () => {
  const original = { className: "authored is-style-default custom" };
  const varied = setGroupStyleVariation(original, "section-3");
  assert.equal(groupStyleVariation(varied), "section-3");
  assert.deepEqual(varied, { className: "authored custom is-style-section-3" });
  assert.equal(groupStyleVariation(setGroupStyleVariation(varied, "default")), "default");
  assert.deepEqual(setGroupStyleVariation(varied, "unknown"), { className: "authored custom" });
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

test("layout transforms retain legacy layout metadata without exposing its old controls", () => {
  const grid = { ...createBlock("grid", "grid-to-group"), allowSizingOnChildren: true, gridMode: "auto", minColumnWidth: 12, minColumnWidthUnit: "rem", children: [{ id: "child", type: "paragraph", text: "Keep" }], visualStyle: { textColor: "#123456" } };
  const group = changeGroupLayout(grid, "flow");
  assert.equal(group.layout, "flow");
  assert.equal(group.allowSizingOnChildren, true);
  assert.equal(validContentBlocks([group]), true);
  assert.equal(group.children, grid.children);
  assert.equal(group.visualStyle, grid.visualStyle);
  const row = changeGroupLayout(grid, "row");
  assert.equal(row.allowSizingOnChildren, true);
  assert.equal(validContentBlocks([row]), true);
  const defaultRow = createBlock("row", "default-row");
  assert.equal(defaultRow.allowSizingOnChildren, true);
  assert.equal(defaultRow.allowWrap, false);
  assert.equal(createGroupVariation("row", "new-row").allowSizingOnChildren, true);
  assert.equal(createGroupVariation("grid", "new-grid").fillAvailableSpace, false);
  assert.equal(createGroupVariation("grid", "new-grid").gridMode, "auto");
});

test("Grid variation transitions reset layout-owned settings while preserving source records", () => {
  const group = createBlock("group", "new-grid");
  const grid = changeGroupLayout(group, "grid");
  assert.equal(grid.fillAvailableSpace, false);
  assert.equal(layoutStyleProperties(grid)["--block-layout-grid-repeat"], "auto-fill");
  assert.equal(createBlock("grid", "inserted-grid").fillAvailableSpace, false);
  for (const value of [undefined, true, false]) {
    const previous = { ...grid, fillAvailableSpace: value };
    const restored = changeGroupLayout(changeGroupLayout(previous, "row"), "grid");
    assert.equal(restored.fillAvailableSpace, false);
    assert.equal(previous.fillAvailableSpace, value);
    assert.equal(restored.children, previous.children);
    assert.equal(validContentBlocks([restored]), true);
  }
});

test("explicit Grid variation starts from reference defaults rather than inactive legacy bounds", () => {
  const legacy = { ...createBlock("group"), minColumnWidth: 192 };
  const next = transformBlock(legacy, availableBlockTransforms(legacy).find(transform => transform.layout === "grid"));
  assert.equal(next.minColumnWidth, 12); assert.equal(next.minColumnWidthUnit, "rem");
  assert.equal(legacy.minColumnWidth, 192);
});

test("editing Grid bounds preserves stored settings while explicitly applying responsive Grid behaviour", () => {
  const legacy = { ...createBlock("grid", "legacy-grid"), gridMode: "manual", columns: 3, minColumnWidth: 160, minColumnWidthUnit: "px" };
  const changedMinimum = updateGroupGridOptions(legacy, { minColumnWidth: 220 });
  assert.equal(changedMinimum.gridMode, "auto");
  assert.equal(changedMinimum.columns, 3);
  assert.equal(changedMinimum.minColumnWidth, 220);
  assert.equal(changedMinimum.minColumnWidthUnit, "px");
  const changedMaximum = updateGroupGridOptions(legacy, { columns: 5 });
  assert.equal(changedMaximum.gridMode, "auto");
  assert.equal(changedMaximum.columns, 5);
  assert.equal(changedMaximum.minColumnWidth, 160);
});

test("Grid exposes Automatic and Manual modes without losing the other mode's settings", () => {
  const automatic = { ...createBlock("grid", "grid-mode"), columns: 4, minColumnWidth: 180, minColumnWidthUnit: "px", fillAvailableSpace: false };
  const manual = changeGroupGridMode(automatic, "manual");
  assert.equal(manual.gridMode, "manual");
  assert.equal(manual.columns, 4);
  assert.equal(manual.minColumnWidth, 180);
  assert.equal(manual.fillAvailableSpace, false);
  assert.equal(layoutDataAttributes(manual)["data-layout-grid-mode"], "manual");
  assert.equal(layoutStyleProperties(manual)["--block-layout-columns"], "4");

  const automaticAgain = changeGroupGridMode(manual, "auto");
  assert.equal(automaticAgain.gridMode, "auto");
  assert.equal(automaticAgain.columns, 4);
  assert.equal(automaticAgain.minColumnWidth, 180);
  assert.equal(automaticAgain.minColumnWidthUnit, "px");
  assert.equal(automaticAgain.fillAvailableSpace, false);
  assert.equal(layoutStyleProperties(automaticAgain)["--block-layout-grid-repeat"], "auto-fill");

  const defaultManual = changeGroupGridMode({ ...createBlock("grid", "default-mode"), columns: undefined, minColumnWidth: undefined, minColumnWidthUnit: undefined }, "manual");
  assert.equal(defaultManual.columns, 3);
});

test("Group Grid Fill available space controls whether empty auto tracks collapse", () => {
  const group = { ...createBlock("grid", "grid-fill"), allowSizingOnChildren: false, fillAvailableSpace: false };
  assert.equal(layoutStyleProperties(group)["--block-layout-grid-repeat"], "auto-fill");
  assert.equal(layoutDataAttributes(group)["data-layout-fill-available"], "false");
  assert.equal(layoutStyleProperties({ ...group, fillAvailableSpace: true })["--block-layout-grid-repeat"], "auto-fit");
  assert.equal(layoutDataAttributes({ ...group, fillAvailableSpace: true })["data-layout-fill-available"], undefined);
  assert.equal(validContentBlocks([group]), true);
  assert.equal(validContentBlocks([{ ...group, fillAvailableSpace: "false" }]), false);
  assert.equal(validLayoutOptions({ fillAvailableSpace: false }, true), true);
  assert.equal(validLayoutOptions({ fillAvailableSpace: false }), false);
  assert.equal(validContentBlocks([{ id: "section-fill", type: "section", layout: "grid", fillAvailableSpace: false, children: [] }]), false);
  assert.match(blockToHtml(group), /data-layout-fill-available="false"/);
  assert.match(blockToHtml({ ...group, fillAvailableSpace: true }), /class="[^"]*layout-grid/);
  assert.doesNotMatch(blockToHtml({ ...group, fillAvailableSpace: true }), /data-layout-fill-available/);
  const clipboard = blockClipboardHtml([group]);
  const previousParser = globalThis.DOMParser;
  try {
    const readClipboard = html => {
      const encoded = html.match(/data-acm-studio-blocks="([^"]+)"/)?.[1];
      const payload = encoded?.replaceAll("&quot;", '"').replaceAll("&amp;", "&");
      globalThis.DOMParser = class { parseFromString() { return { querySelector: () => ({ getAttribute: () => payload }) }; } };
      return readBlockClipboardPayload(html);
    };
    assert.deepEqual(readClipboard(clipboard).blocks[0].fillAvailableSpace, false);
    assert.equal(readClipboard(clipboard.replace(`&quot;version&quot;:${BLOCK_CLIPBOARD_VERSION}`, '&quot;version&quot;:12')), null);
  } finally { globalThis.DOMParser = previousParser; }
});

test("Grid Fill available space survives current workspace, publication and template formats only", () => {
  const group = { ...createBlock("grid", "fill-persist"), allowSizingOnChildren: false, fillAvailableSpace: false };
  const doc = { ...initialStudioWorkspace.documents[0], blocks: [group] };
  assert.throws(() => migrateStudioWorkspace({ ...initialStudioWorkspace, version: 35, documents: [doc] }), /unsupported version/);
  const migrated = migrateStudioWorkspace({ ...initialStudioWorkspace, version: 36, documents: [doc] });
  assert.equal(migrated.version, initialStudioWorkspace.version);
  assert.equal(migrated.documents[0].blocks[0].fillAvailableSpace, false);
  const backupInput = { format: "acm-studio-backup", exportedAt: "2026-10-28T00:00:00Z", workspace: { ...initialStudioWorkspace, version: 36, documents: [doc] }, publications: null, media: { folders: [], assets: [] } };
  assert.throws(() => validateStudioBackup({ ...backupInput, version: 7 }), /backup v8/);
  assert.equal(validateStudioBackup({ ...backupInput, version: 8 }).workspace.documents[0].blocks[0].fillAvailableSpace, false);

  const post = { localDocumentId: "fill-persist", slug: "fill-persist", title: "Grid", summary: "", displayDate: "", readingTime: "", publishedAt: "2026-01-01T00:00:00.000Z", section: "", blocks: [group], mediaIds: [] };
  assert.throws(() => validatePublicationSnapshot({ version: 27, posts: [post] }), /v28/);
  assert.equal(validatePublicationSnapshot({ version: 28, posts: [post] }).posts[0].blocks[0].fillAvailableSpace, false);

  const template = createTemplateSet("Grid Fill");
  template.parts[0].nodes = [group];
  assert.throws(() => validateTemplateStore({ ...emptyTemplateStore(), version: "0.39.0", sets: [template] }), /v0\.40\.0/);
  const templates = validateTemplateStore({ ...emptyTemplateStore(), version: TEMPLATE_VERSION, sets: [template] });
  assert.equal(templates.version, TEMPLATE_VERSION);
  assert.equal(templates.sets[0].parts[0].nodes[0].fillAvailableSpace, false);
});

test("variation selection resets layout axes while preserving independent visual styles", () => {
  const source = { ...createBlock("stack"), horizontalAlign: "right", verticalAlign: "bottom" };
  const grid = transformBlock(source, availableBlockTransforms(source).find(transform => transform.layout === "grid"));
  assert.equal(grid.horizontalAlign, undefined); assert.equal(grid.verticalAlign, undefined);
  assert.equal(source.horizontalAlign, "right"); assert.equal(source.verticalAlign, "bottom");
  const style = layoutStyleProperties(grid);
  assert.equal(style["--block-layout-horizontal-align"], "stretch");
  assert.equal(style["--block-layout-vertical-align"], "stretch");
  const stack = transformBlock(grid, availableBlockTransforms(grid).find(transform => transform.layout === "stack"));
  assert.equal(layoutStyleProperties(stack)["--block-layout-horizontal-align"], "start");
  assert.equal(layoutStyleProperties(stack)["--block-layout-vertical-align"], "start");
});

test("Section Grid retains its separately exposed alignment controls", () => {
  const section = { type: "section", layout: "grid", horizontalAlign: "right", verticalAlign: "bottom" };
  const style = layoutStyleProperties(section);
  assert.equal(style["--block-layout-horizontal-align"], "end");
  assert.equal(style["--block-layout-vertical-align"], "end");
  assert.equal(layoutDataAttributes(section)["data-layout-horizontal-align"], "right");
});

test("Row and Stack child sizing renders bounded Gutenberg-style Fit, Grow, Max width and Fixed modes", () => {
  assert.deepEqual(flexItemSizingStyle({ mode: "fit" }), { flexGrow: 0, flexShrink: 1, flexBasis: "auto" });
  assert.deepEqual(flexItemSizingStyle({ mode: "grow" }), { flexGrow: 1, flexShrink: 1, flexBasis: "0px" });
  assert.deepEqual(flexItemSizingStyle({ mode: "max", size: "320px" }), { flexGrow: 0, flexShrink: 1, flexBasis: "320px" });
  assert.deepEqual(flexItemSizingStyle({ mode: "fixed", size: "45%" }), { flexGrow: 0, flexShrink: 0, flexBasis: "45%" });
  assert.deepEqual(flexItemSizingStyle({ mode: "fixed", size: "url(javascript:alert(1))" }), {});
  assert.deepEqual(flexItemSizingStyle({ mode: "fixed", size: "0px" }), { flexGrow: 0, flexShrink: 0, flexBasis: "0px" });
  assert.deepEqual(groupChildFlexItemStyle({ type: "group", layout: "row", allowSizingOnChildren: true }, { flexItemSizing: { mode: "grow" } }), { flexGrow: 1, flexShrink: 1, flexBasis: "0px" });
  assert.deepEqual(groupChildFlexItemStyle({ type: "group", layout: "stack", allowSizingOnChildren: true }, { flexItemSizing: { mode: "fixed", size: "320px" } }), { flexGrow: 0, flexShrink: 0, flexBasis: "320px" });
  assert.equal(groupChildFlexItemStyle({ type: "group", layout: "row" }, { flexItemSizing: { mode: "grow" } }), undefined);
  assert.equal(groupChildFlexItemStyle({ type: "group", layout: "stack" }, { flexItemSizing: { mode: "fixed", size: "320px" } }), undefined);
  assert.equal(groupChildFlexItemStyle({ type: "group", layout: "row", allowSizingOnChildren: false }, { flexItemSizing: { mode: "grow" } }), undefined);
  assert.deepEqual(groupChildFlexItemStyle({ type: "group", layout: "row", allowSizingOnChildren: false }, { flexItemSizing: { mode: "grow" }, flexItemSizingActive: true }), { flexGrow: 1, flexShrink: 1, flexBasis: "0px" });
  assert.deepEqual(groupChildFlexItemStyle({ type: "group", layout: "row", allowSizingOnChildren: true }, { flexItemSizing: { mode: "grow" } }), { flexGrow: 1, flexShrink: 1, flexBasis: "0px" });
  assert.equal(groupChildFlexItemStyle({ type: "group", layout: "grid", allowSizingOnChildren: true }, { flexItemSizing: { mode: "grow" } }), undefined);
  assert.equal(validLayoutOptions({ layout: "row", allowSizingOnChildren: true }, true), true);
  assert.equal(validLayoutOptions({ layout: "grid", allowSizingOnChildren: true }, true), true);
  assert.equal(validLayoutOptions({ layout: "row", allowSizingOnChildren: "true" }, true), false);

  const child = { ...createBlock("paragraph", "flex-child"), visualStyle: { flexItemSizing: { mode: "fixed", size: "320px" } } };
  const row = { ...createBlock("row", "sized-row"), allowSizingOnChildren: true, children: [child] };
  assert.equal(validContentBlocks([row]), true);
  assert.equal(validContentBlocks([{ ...row, children: [{ ...child, visualStyle: { flexItemSizing: { mode: "fixed", size: "url(https://invalid)" } } }] }]), false);
  assert.equal(validParagraphStyle({ flexItemSizing: { mode: "max", size: "100%" } }), true);
  assert.equal(validParagraphStyle({ flexItemSizingActive: false }), false);
  assert.equal(validParagraphStyle({ flexItemSizing: { mode: "max", size: "calc(100% - 1px)" } }), false);
  assert.equal(validParagraphStyle({ flexItemSizing: { mode: "grow", size: "320px" } }), false);
});

test("editing one flex child does not activate dormant sizing on its siblings", () => {
  const parent = { ...createBlock("row", "legacy-sizing-row"), allowSizingOnChildren: false };
  const target = { ...createBlock("paragraph", "target-child"), visualStyle: { flexItemSizing: { mode: "grow" } } };
  const sibling = { ...createBlock("paragraph", "sibling-child"), visualStyle: { flexItemSizing: { mode: "fixed", size: "320px" } } };
  const editedTarget = updateBlockLayoutItemStyle(target, style => ({ ...style, flexItemSizing: { mode: "fixed", size: "240px" } }));
  const updated = updateFlexItemChild({ ...parent, children: [target, sibling] }, editedTarget);
  const activeTargetStyle = blockLayoutItemStyle(updated.children[0]);
  const dormantSiblingStyle = blockLayoutItemStyle(updated.children[1]);
  assert.equal(groupChildFlexItemStyle(updated, activeTargetStyle).flexBasis, "240px");
  assert.equal(groupChildFlexItemStyle(updated, dormantSiblingStyle), undefined);
  assert.deepEqual(updated.children[1].visualStyle.flexItemSizing, { mode: "fixed", size: "320px" });
  const resetTarget = resetBlockLayoutItemSizing(editedTarget);
  assert.equal(resetTarget.visualStyle?.flexItemSizing, undefined);
  assert.equal(resetTarget.style?.flexItemSizingActive, undefined);
});

test("Grid child spans are bounded, persist on the shared visual frame, and validate as content styles", () => {
  assert.equal(validGridItemSizing({ columnSpan: 2, rowSpan: 3 }), true);
  assert.equal(validGridItemSizing({ columnSpan: 16 }), true);
  assert.equal(validGridItemSizing({ columnSpan: 17 }), false);
  assert.equal(validGridItemSizing({ columnStart: 2 }), false);
  assert.deepEqual(gridItemSizingStyle({ columnSpan: 2, rowSpan: 3 }), { gridColumn: "span 2", gridRow: "span 3" });
  assert.deepEqual(groupGridItemStyle({ type: "group", layout: "grid" }, { gridItemSizing: { columnSpan: 2, rowSpan: 3 } }), { gridColumn: "span 2", gridRow: "span 3" });
  assert.deepEqual(groupGridItemStyle({ type: "group", layout: "row" }, { gridItemSizing: { columnSpan: 2 } }), {});
  assert.equal(containsGridItemSizing([{ visualStyle: { gridItemSizing: { columnSpan: 2 } } }]), true);
  assert.equal(validParagraphStyle({ gridItemSizing: { columnSpan: 2, rowSpan: 1 } }), true);
  assert.equal(validParagraphStyle({ gridItemSizing: { columnSpan: 0 } }), false);
  const block = { ...createBlock("paragraph", "grid-child"), visualStyle: { gridItemSizing: { columnSpan: 2, rowSpan: 3 } } };
  assert.equal(validContentBlocks([{ ...createBlock("grid", "grid-parent"), children: [block] }]), true);
  assert.match(renderToStaticMarkup(React.createElement(BlockVisualFrame, { block, layoutParent: createBlock("grid") }, React.createElement("p", null, "Grid child"))), /grid-column:span 2;grid-row:span 3/);
});

test("Grid resize geometry snaps to track strides and supports bounded keyboard changes", () => {
  assert.equal(gridSpanFromDelta(1, 94, 96, 3), 2);
  assert.equal(gridSpanFromDelta(3, -192, 96, 3), 1);
  assert.equal(gridSpanFromDelta(2, 1000, 96, 3), 3);
  assert.equal(gridSpanFromKey(1, "ArrowRight", "column", 4), 2);
  assert.equal(gridSpanFromKey(2, "ArrowLeft", "column", 4), 1);
  assert.equal(gridSpanFromKey(1, "ArrowLeft", "column", 4), 1);
  assert.equal(gridSpanFromKey(2, "ArrowDown", "row", 6), 3);
  assert.equal(gridSpanFromKey(2, "ArrowUp", "row", 6), 1);
  assert.equal(gridSpanFromKey(2, "ArrowRight", "row", 6), null);
});

test("Grid child spans require the current workspace, publication, template, clipboard and backup envelopes", () => {
  const child = { ...createBlock("paragraph", "grid-span-child"), visualStyle: { gridItemSizing: { columnSpan: 2, rowSpan: 3 } } };
  const grid = { ...createBlock("grid", "grid-span-parent"), allowSizingOnChildren: true, children: [child] };
  const doc = { ...initialStudioWorkspace.documents[0], blocks: [grid] };
  assert.throws(() => migrateStudioWorkspace({ ...initialStudioWorkspace, version: 41, documents: [doc] }), /invalid|unsupported/i);
  assert.equal(migrateStudioWorkspace({ ...initialStudioWorkspace, version: 42, documents: [doc] }).documents[0].blocks[0].children[0].visualStyle.gridItemSizing.columnSpan, 2);

  const post = { localDocumentId: "grid-spans", slug: "grid-spans", title: "Grid", summary: "", displayDate: "", readingTime: "", publishedAt: "2026-01-01T00:00:00.000Z", section: "", blocks: [grid], mediaIds: [] };
  assert.throws(() => validatePublicationSnapshot({ version: 33, posts: [post] }), /snapshot v34/);
  assert.equal(validatePublicationSnapshot({ version: 34, posts: [post] }).posts[0].blocks[0].children[0].visualStyle.gridItemSizing.rowSpan, 3);

  const template = createTemplateSet("Grid spans");
  template.parts[0].nodes = [grid];
  assert.throws(() => validateTemplateStore({ ...emptyTemplateStore(), version: "0.50.0", sets: [template] }), /v0\.51\.0/);
  assert.equal(validateTemplateStore({ ...emptyTemplateStore(), version: TEMPLATE_VERSION, sets: [template] }).version, TEMPLATE_VERSION);

  const clipboard = blockClipboardHtml([grid]);
  const previousParser = globalThis.DOMParser;
  try {
    const readClipboard = (version) => {
      const encoded = clipboard.match(/data-acm-studio-blocks="([^"]+)"/)?.[1];
      const payload = encoded?.replaceAll("&quot;", '"').replaceAll("&amp;", "&").replace(`"version":${BLOCK_CLIPBOARD_VERSION}`, `"version":${version}`);
      globalThis.DOMParser = class { parseFromString() { return { querySelector: () => ({ getAttribute: () => payload }) }; } };
      return readBlockClipboardPayload(clipboard);
    };
    assert.equal(readClipboard(20).blocks[0].children[0].visualStyle.gridItemSizing.columnSpan, 2);
    assert.equal(readClipboard(19), null);
  } finally { globalThis.DOMParser = previousParser; }

  const workspace = { ...initialStudioWorkspace, version: 42, documents: [doc] };
  const backup = { format: "acm-studio-backup", exportedAt: "2026-10-28T00:00:00Z", workspace, publications: null, media: { folders: [], assets: [] } };
  assert.throws(() => validateStudioBackup({ ...backup, version: 16 }), /backup v17/);
  assert.equal(validateStudioBackup({ ...backup, version: 17 }).workspace.documents[0].blocks[0].children[0].visualStyle.gridItemSizing.columnSpan, 2);
});

test("flex child sizing requires the current versioned workspace, publication, template, clipboard and backup envelopes", () => {
  const child = { ...createBlock("paragraph", "flex-child"), visualStyle: { flexItemSizing: { mode: "fixed", size: "320px" } } };
  const row = { ...createBlock("row", "sized-row"), allowSizingOnChildren: true, children: [child] };
  const doc = { ...initialStudioWorkspace.documents[0], blocks: [row] };
  const workspace = { ...initialStudioWorkspace, version: 37, documents: [doc] };
  assert.throws(() => migrateStudioWorkspace({ ...workspace, version: 36 }), /invalid|unsupported/i);
  assert.equal(migrateStudioWorkspace(workspace).documents[0].blocks[0].children[0].visualStyle.flexItemSizing.mode, "fixed");

  const post = { localDocumentId: "flex-sizing", slug: "flex-sizing", title: "Row", summary: "", displayDate: "", readingTime: "", publishedAt: "2026-01-01T00:00:00.000Z", section: "", blocks: [row], mediaIds: [] };
  assert.throws(() => validatePublicationSnapshot({ version: 28, posts: [post] }), /snapshot v29/);
  assert.equal(validatePublicationSnapshot({ version: 29, posts: [post] }).posts[0].blocks[0].children[0].visualStyle.flexItemSizing.size, "320px");

  const template = createTemplateSet("Flex sizing");
  template.parts[0].nodes = [row];
  assert.throws(() => validateTemplateStore({ ...emptyTemplateStore(), version: "0.42.0", sets: [template] }), /v0\.43\.0/);
  assert.equal(validateTemplateStore({ ...emptyTemplateStore(), version: TEMPLATE_VERSION, sets: [template] }).version, TEMPLATE_VERSION);

  const clipboard = blockClipboardHtml([row]);
  const previousParser = globalThis.DOMParser;
  try {
    const readClipboard = (html, version = 36) => {
      const encoded = html.match(/data-acm-studio-blocks="([^"]+)"/)?.[1];
      const payload = encoded?.replaceAll("&quot;", '"').replaceAll("&amp;", "&").replace(`"version":${BLOCK_CLIPBOARD_VERSION}`, `"version":${version}`);
      globalThis.DOMParser = class { parseFromString() { return { querySelector: () => ({ getAttribute: () => payload }) }; } };
      return readBlockClipboardPayload(html);
    };
    assert.equal(readClipboard(clipboard).blocks[0].children[0].visualStyle.flexItemSizing.mode, "fixed");
    assert.equal(readClipboard(clipboard, 14), null);
  } finally { globalThis.DOMParser = previousParser; }

  const backup = { format: "acm-studio-backup", exportedAt: "2026-10-28T00:00:00Z", workspace, publications: null, media: { folders: [], assets: [] } };
  assert.throws(() => validateStudioBackup({ ...backup, version: 8 }), /backup v9/);
  assert.equal(validateStudioBackup({ ...backup, version: 9 }).workspace.documents[0].blocks[0].children[0].visualStyle.flexItemSizing.mode, "fixed");
});

test("per-child legacy sizing opt-in is retained only by the new envelopes while older content still upgrades", () => {
  const child = { ...createBlock("paragraph", "scoped-sizing-child"), visualStyle: { flexItemSizing: { mode: "grow" }, flexItemSizingActive: true } };
  const row = { ...createBlock("row", "scoped-sizing-row"), allowSizingOnChildren: false, children: [child] };
  const document = { ...initialStudioWorkspace.documents[0], blocks: [row] };
  assert.throws(() => migrateStudioWorkspace({ ...initialStudioWorkspace, version: 63, documents: [document] }), /invalid|unsupported/i);
  const invalidMarker = { ...document, blocks: [{ ...row, children: [{ ...child, visualStyle: { flexItemSizing: { mode: "grow" }, flexItemSizingActive: false } }] }] };
  assert.throws(() => migrateStudioWorkspace({ ...initialStudioWorkspace, version: 63, documents: [invalidMarker] }), /invalid|unsupported/i);
  assert.equal(validContentBlocks(invalidMarker.blocks), false);
  const workspace = migrateStudioWorkspace({ ...initialStudioWorkspace, version: 64, documents: [document] });
  assert.equal(workspace.version, 65);
  assert.equal(workspace.documents[0].blocks[0].children[0].visualStyle.flexItemSizingActive, true);
  assert.equal(migrateStudioWorkspace({ ...initialStudioWorkspace, version: 63, documents: [{ ...document, blocks: [{ ...row, children: [{ ...child, visualStyle: { flexItemSizing: { mode: "grow" } } }] }] }] }).version, 65);

  const post = { localDocumentId: "scoped-sizing", slug: "scoped-sizing", title: "Row", summary: "", displayDate: "", readingTime: "", publishedAt: "2026-01-01T00:00:00.000Z", section: "", blocks: [row], mediaIds: [] };
  assert.throws(() => validatePublicationSnapshot({ version: 54, posts: [post] }), /snapshot v55/);
  assert.equal(validatePublicationSnapshot({ version: 55, posts: [post] }).version, 56);

  const set = createTemplateSet("Scoped sizing");
  set.parts[0].nodes = [row];
  assert.throws(() => validateTemplateStore({ ...emptyTemplateStore(), version: "0.75.0", sets: [set] }), /v0\.76\.0/);
  assert.equal(validateTemplateStore({ ...emptyTemplateStore(), version: TEMPLATE_VERSION, sets: [set] }).version, TEMPLATE_VERSION);
  assert.throws(() => validateTemplatePackage({ format: "acm-studio-template-set", version: "0.75.0", set, media: [] }), /v0\.76\.0/);

  const clipboard = blockClipboardHtml([row]);
  const previousParser = globalThis.DOMParser;
  try {
    const readAtVersion = version => {
      const encoded = clipboard.match(/data-acm-studio-blocks="([^"]+)"/)?.[1];
      const payload = encoded?.replaceAll("&quot;", '"').replaceAll("&amp;", "&").replace(`"version":${BLOCK_CLIPBOARD_VERSION}`, `"version":${version}`);
      globalThis.DOMParser = class { parseFromString() { return { querySelector: () => ({ getAttribute: () => payload }) }; } };
      return readBlockClipboardPayload(clipboard);
    };
    assert.equal(readAtVersion(40), null);
    assert.equal(readAtVersion(41).blocks[0].children[0].visualStyle.flexItemSizingActive, true);
  } finally { globalThis.DOMParser = previousParser; }

  const backup = { format: "acm-studio-backup", exportedAt: "2026-10-28T00:00:00Z", workspace, publications: null, media: { folders: [], assets: [] } };
  assert.throws(() => validateStudioBackup({ ...backup, version: 43 }), /backup v44/);
  assert.equal(validateStudioBackup({ ...backup, version: 44 }).workspace.documents[0].blocks[0].children[0].visualStyle.flexItemSizingActive, true);

  const fixtureBase = testSiteCollection({ format: "acm-test-site", version: 3, siteId: "test", documents: [initialStudioWorkspace.documents[0]], activeDocumentId: initialStudioWorkspace.documents[0].id,
    homeDocumentId: initialStudioWorkspace.documents[0].id, bin: [], categories: [], templates: emptyTemplateStore(), browserImportComplete: true });
  const fixture = { ...fixtureBase, version: 55, documents: [document], activeDocumentId: document.id, homeDocumentId: document.id };
  assert.equal(fixture.version, 55);
  assert.equal(validTestSiteDocument(fixture), true);
  const priorFixture = { ...fixture, version: 54 };
  assert.equal(validTestSiteDocument(priorFixture), false);
  assert.throws(() => testSiteCollection(priorFixture), /local site source v55/);

  set.parts[0].nodes = [{ id: "scoped-sizing-navigation", type: "element", element: "navigation" }];
  set.templates[0].nodes = [row];
  const library = { format: "acm-global-templates", version: 47, templates: { ...emptyTemplateStore(), sets: [set] },
    header: { setId: set.id, partId: set.parts[0].id }, migrations: { test: { bindings: [], bases: [] }, test2: { bindings: [], bases: [] } } };
  assert.equal(validateGlobalTemplateLibrary(library).version, 48);
  assert.throws(() => validateGlobalTemplateLibrary({ ...library, version: 46 }), /global template library v47/);
});


test("Orientation preserves compatible Flex settings while variation selection restores defaults", () => {
  const row = { ...createBlock("row"), horizontalAlign: "right", verticalAlign: "bottom", allowWrap: true, contentSize: "800px" };
  const rotated = changeGroupOrientation(row, "stack");
  assert.equal(rotated.horizontalAlign, "right");
  assert.equal(rotated.verticalAlign, "bottom");
  assert.equal(rotated.allowWrap, true);
  const varied = changeGroupLayout(row, "stack");
  assert.equal(varied.horizontalAlign, "left");
  assert.equal(varied.verticalAlign, undefined);
  assert.equal(varied.allowWrap, true);
  assert.equal(varied.contentSize, undefined);
  assert.equal(changeGroupLayout(varied, "row").allowWrap, false);
});
