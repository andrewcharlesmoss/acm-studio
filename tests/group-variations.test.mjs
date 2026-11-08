import test from "node:test";
import assert from "node:assert/strict";
import { loadProductionModule } from "./production-module.mjs";
const load = path => loadProductionModule(new URL(path, import.meta.url));
const { createBlock, blockCatalogue } = await load("../app/studio/editor-model.ts");
const { availableBlockTransforms, transformBlock } = await load("../app/studio/block-transforms.ts");
const { groupAllowsChild, blockInserterOptions } = await load("../app/studio/block-inserter-options.ts");
const { groupUsesContentWidth } = await load("../app/studio/blocks/group-layout-alignment.ts");
const { changeGroupLayout, changeGroupGridMode, groupStyleVariation, setGroupStyleVariation, updateGroupGridOptions } = await load("../app/studio/blocks/group-variations.ts");
const { GROUP_ALLOWED_BLOCK_TYPES, GROUP_SELECTABLE_BLOCK_TYPES } = await load("../app/content/model.ts");
const { validContentBlocks, validParagraphStyle, migrateStudioWorkspace, validatePublicationSnapshot } = await load("../app/studio/workspace-validation.ts");
const { createTemplateSet, emptyTemplateStore, TEMPLATE_VERSION, validateTemplateSet, validateTemplateStore } = await load("../app/studio/template-model.ts");
const { initialStudioWorkspace } = await load("../app/studio/editor-model.ts");
const { blockToHtml } = await load("../app/studio/studio-html-editor.ts");
const { BLOCK_CLIPBOARD_VERSION, blockClipboardHtml, readBlockClipboardPayload } = await load("../app/studio/block-clipboard.ts");
const { validateStudioBackup } = await load("../app/studio/backup-store.ts");
const { containsGridItemSizing, gridItemSizingStyle, gridSpanFromDelta, gridSpanFromKey, groupGridItemStyle, validGridItemSizing } = await load("../app/content/grid-child-sizing.ts");
const { BlockVisualFrame } = await load("../app/components/blocks/block-visual-frame.tsx");
const React = await import("react");
const { renderToStaticMarkup } = await import("react-dom/server");
const { flexItemSizingStyle, groupChildFlexItemStyle, layoutDataAttributes, layoutStyleProperties, validLayoutOptions } = await load("../app/content/layout.ts");
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

test("Grid to Group removes the flex-child sizing field that flow layout rejects", () => {
  const grid = { ...createBlock("grid", "grid-to-group"), allowSizingOnChildren: true, gridMode: "auto", minColumnWidth: 12, minColumnWidthUnit: "rem", children: [{ id: "child", type: "paragraph", text: "Keep" }], visualStyle: { textColor: "#123456" } };
  const group = changeGroupLayout(grid, "flow");
  assert.equal(group.layout, "flow");
  assert.equal(Object.hasOwn(group, "allowSizingOnChildren"), false);
  assert.equal(validContentBlocks([group]), true);
  assert.equal(group.children, grid.children);
  assert.equal(group.visualStyle, grid.visualStyle);
  const row = changeGroupLayout(grid, "row");
  assert.equal(row.allowSizingOnChildren, true);
  assert.equal(validContentBlocks([row]), true);
});

test("changing a legacy minimum to Grid retains its implicit pixel unit", () => {
  const legacy = { ...createBlock("group"), minColumnWidth: 192 };
  const next = transformBlock(legacy, availableBlockTransforms(legacy).find(transform => transform.layout === "grid"));
  assert.equal(next.minColumnWidth, 192); assert.equal(next.minColumnWidthUnit, "px");
});

test("editing either Grid bound converts a legacy fixed-count grid to responsive Grid settings", () => {
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

test("flex child sizing renders bounded Gutenberg-style Fit, Grow, Max width and Fixed modes", () => {
  assert.deepEqual(flexItemSizingStyle({ mode: "fit" }), { flexGrow: 0, flexShrink: 1, flexBasis: "auto" });
  assert.deepEqual(flexItemSizingStyle({ mode: "grow" }), { flexGrow: 1, flexShrink: 1, flexBasis: "0px" });
  assert.deepEqual(flexItemSizingStyle({ mode: "max", size: "320px" }), { flexGrow: 0, flexShrink: 1, flexBasis: "320px" });
  assert.deepEqual(flexItemSizingStyle({ mode: "fixed", size: "45%" }), { flexGrow: 0, flexShrink: 0, flexBasis: "45%" });
  assert.deepEqual(flexItemSizingStyle({ mode: "fixed", size: "url(javascript:alert(1))" }), {});
  assert.deepEqual(flexItemSizingStyle({ mode: "fixed", size: "0px" }), {});
  assert.deepEqual(groupChildFlexItemStyle({ type: "group", layout: "row", allowSizingOnChildren: true }, { flexItemSizing: { mode: "grow" } }), { flexGrow: 1, flexShrink: 1, flexBasis: "0px" });
  assert.deepEqual(groupChildFlexItemStyle({ type: "group", layout: "stack", allowSizingOnChildren: true }, { flexItemSizing: { mode: "fixed", size: "320px" } }), { flexGrow: 0, flexShrink: 0, flexBasis: "320px" });
  assert.equal(groupChildFlexItemStyle({ type: "group", layout: "row", allowSizingOnChildren: false }, { flexItemSizing: { mode: "grow" } }), undefined);
  assert.equal(groupChildFlexItemStyle({ type: "group", layout: "grid", allowSizingOnChildren: true }, { flexItemSizing: { mode: "grow" } }), undefined);
  assert.equal(validLayoutOptions({ layout: "row", allowSizingOnChildren: true }, true), true);
  assert.equal(validLayoutOptions({ layout: "grid", allowSizingOnChildren: true }, true), true);
  assert.equal(validLayoutOptions({ layout: "row", allowSizingOnChildren: "true" }, true), false);

  const child = { ...createBlock("paragraph", "flex-child"), visualStyle: { flexItemSizing: { mode: "fixed", size: "320px" } } };
  const row = { ...createBlock("row", "sized-row"), allowSizingOnChildren: true, children: [child] };
  assert.equal(validContentBlocks([row]), true);
  assert.equal(validContentBlocks([{ ...row, children: [{ ...child, visualStyle: { flexItemSizing: { mode: "fixed", size: "url(https://invalid)" } } }] }]), false);
  assert.equal(validParagraphStyle({ flexItemSizing: { mode: "max", size: "100%" } }), true);
  assert.equal(validParagraphStyle({ flexItemSizing: { mode: "max", size: "calc(100% - 1px)" } }), false);
  assert.equal(validParagraphStyle({ flexItemSizing: { mode: "grow", size: "320px" } }), false);
});

test("Grid child spans are bounded, persist on the shared visual frame, and validate as content styles", () => {
  assert.equal(validGridItemSizing({ columnSpan: 2, rowSpan: 3 }), true);
  assert.equal(validGridItemSizing({ columnSpan: 7 }), false);
  assert.equal(validGridItemSizing({ columnStart: 2 }), false);
  assert.deepEqual(gridItemSizingStyle({ columnSpan: 2, rowSpan: 3 }), { gridColumn: "span 2", gridRow: "span 3" });
  assert.deepEqual(groupGridItemStyle({ type: "group", layout: "grid" }, { gridItemSizing: { columnSpan: 2, rowSpan: 3 } }), { gridColumn: "span 2", gridRow: "span 3" });
  assert.deepEqual(groupGridItemStyle({ type: "group", layout: "row" }, { gridItemSizing: { columnSpan: 2 } }), {});
  assert.equal(containsGridItemSizing([{ visualStyle: { gridItemSizing: { columnSpan: 2 } } }]), true);
  assert.equal(validParagraphStyle({ gridItemSizing: { columnSpan: 2, rowSpan: 1 } }), true);
  assert.equal(validParagraphStyle({ gridItemSizing: { columnSpan: 0 } }), false);
  const block = { ...createBlock("paragraph", "grid-child"), visualStyle: { gridItemSizing: { columnSpan: 2, rowSpan: 3 } } };
  assert.equal(validContentBlocks([{ ...createBlock("grid", "grid-parent"), children: [block] }]), true);
  assert.match(renderToStaticMarkup(React.createElement(BlockVisualFrame, { block }, React.createElement("p", null, "Grid child"))), /grid-column:span 2;grid-row:span 3/);
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
