import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { readFileSync } from "node:fs";
import test from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { loadProductionModule } from "./production-module.mjs";
import { studioHistoryShortcut, handleStudioHistoryShortcut } from "../app/studio/studio-history-shortcuts.mjs";
import { moveDesignLayer, reorderDesignLayers } from "../app/studio/design-layer-operations.mjs";
import { blockCapabilityProfiles, capabilityProfileFor } from "../app/studio/blocks/capability-profiles.ts";
import { groupAllowsChild, parentOfNestedBlock, blockInserterOptions } from "../app/studio/block-inserter-options.ts";
import {
  addDocumentToWorkspace,
  commitHistory,
  deleteDocumentFromWorkspace,
  duplicateBlockAt,
  duplicateDocumentWithIds,
  duplicateNestedBlockById,
  findBlockById,
  insertBlockAt,
  moveBlockAt,
  redoHistory,
  removeBlockById,
  removeNestedBlockById,
  updateBlockById,
  undoHistory,
} from "../app/studio/studio-command-operations.mjs";

function document() {
  return { id: "post-1", kind: "post", title: "Post", blocks: [{ id: "a", type: "paragraph" }, { id: "b", type: "heading" }] };
}

test("design layer operations preserve visible order and reject locked layers", () => {
  const objects = [{ id: "back" }, { id: "middle" }, { id: "front" }];
  assert.deepEqual(moveDesignLayer(objects, "middle", "forward").map((object) => object.id), ["back", "front", "middle"]);
  assert.deepEqual(moveDesignLayer(objects, "middle", "backward").map((object) => object.id), ["middle", "back", "front"]);
  assert.deepEqual(reorderDesignLayers(objects, "front", "back", "before").map((object) => object.id), ["back", "front", "middle"]);
  const locked = [{ id: "back", locked: true }, { id: "front" }];
  assert.equal(moveDesignLayer(locked, "back", "forward"), locked);
  assert.equal(reorderDesignLayers(locked, "front", "back", "before"), locked);
});

test("block commands preserve order while inserting, moving, duplicating and removing", () => {
  const inserted = insertBlockAt(document(), { id: "c", type: "quote" }, 0);
  assert.deepEqual(inserted.blocks.map((block) => block.id), ["a", "c", "b"]);
  const moved = moveBlockAt(inserted, 2, 0);
  assert.deepEqual(moved.blocks.map((block) => block.id), ["b", "a", "c"]);
  const duplicated = duplicateBlockAt(moved, 1, (type) => `${type}-copy`);
  assert.deepEqual(duplicated.blocks.map((block) => block.id), ["b", "a", "paragraph-copy", "c"]);
  assert.deepEqual(removeBlockById(duplicated, "a").blocks.map((block) => block.id), ["b", "paragraph-copy", "c"]);
});

test("nested blocks support lookup, update, removal and deep duplication", () => {
  const nested = { ...document(), blocks: [{ id: "group", type: "group", layout: "stack", children: [{ id: "table", type: "table", rows: [["A"]] }] }] };
  assert.equal(findBlockById(nested.blocks, "table").type, "table");
  const updated = updateBlockById(nested, "table", (block) => ({ ...block, rows: [["B"]] }));
  assert.equal(findBlockById(updated.blocks, "table").rows[0][0], "B");
  const duplicated = duplicateNestedBlockById(updated, "group", (type) => `${type}-copy`);
  assert.deepEqual(duplicated.blocks.map((block) => block.id), ["group", "group-copy"]);
  assert.equal(duplicated.blocks[1].children[0].id, "table-copy");
  assert.equal(findBlockById(removeNestedBlockById(updated, "table").blocks, "table"), null);
});

test("Group allowed block choices constrain nested insertion and paragraph splitting eligibility", async () => {
  const items = [
    { type: "paragraph", label: "Paragraph", description: "Text" },
    { type: "heading", label: "Heading", description: "Title" },
    { type: "image", label: "Image", description: "Media" },
    { type: "social-icons", label: "Social Icons", description: "Social links" },
    { type: "social-linkedin", label: "LinkedIn", description: "A social link" },
    { type: "social-tiktok", label: "TikTok", description: "A social link" },
    { type: "template-content", label: "Content", description: "Template content" },
  ];
  const group = { id: "group", type: "group", layout: "flow", allowedBlocks: ["paragraph", "image", "social-icons"], children: [] };
  assert.deepEqual(blockInserterOptions(items, group, "").map(item => item.type), ["paragraph", "image", "social-icons"]);
  assert.deepEqual(blockInserterOptions(items, group, "media").map(item => item.type), ["image"]);
  assert.deepEqual(blockInserterOptions(items, undefined, "").map(item => item.type), ["paragraph", "heading", "image", "social-icons", "social-linkedin", "social-tiktok"]);
  assert.deepEqual(blockInserterOptions(items, { id: "social", type: "social-icons", children: [] }, "", [items[1], items[4], items[5]]).map(item => item.type), ["social-linkedin", "social-tiktok"]);

  assert.equal(groupAllowsChild(group, "heading"), false);
  assert.equal(groupAllowsChild(group, "paragraph"), true);
  assert.equal(groupAllowsChild(group, "social-linkedin"), true);
  assert.equal(groupAllowsChild({ ...group, allowedBlocks: ["paragraph"] }, "social-tiktok"), false);
  assert.equal(groupAllowsChild({ ...group, allowedBlocks: undefined }, "heading"), true);
  const paragraph = { id: "existing-paragraph", type: "paragraph" };
  const restrictiveGroup = { ...group, allowedBlocks: ["image"] , children: [paragraph] };
  assert.equal(parentOfNestedBlock([restrictiveGroup], paragraph.id)?.id, group.id);
  assert.equal(groupAllowsChild(parentOfNestedBlock([restrictiveGroup], paragraph.id), "paragraph"), false);
  const commands = await readFile(new URL("../app/studio/use-studio-block-commands.ts", import.meta.url), "utf8");
  assert.equal((commands.match(/parentOfNestedBlock\(activeDocument\.blocks, blockId\)/g) ?? []).length, 4, "duplication, both paragraph split paths and List exit check their parent");
  const templateEditor = await readFile(new URL("../app/studio/template-editor.tsx", import.meta.url), "utf8");
  assert.match(templateEditor, /const parent = parentId \? findBlockById\(templateEditorBlocks\(nodesRef\.current\), parentId\) : undefined/);
  assert.match(templateEditor, /if \(parentId && !parent\) return null/);
  assert.match(templateEditor, /parent && !groupAllowsChild\(parent, type\)/);
  assert.match(templateEditor, /const currentSelected = selectedBlock \? findBlockById\(templateEditorBlocks\(nodesRef\.current\), selectedBlock\.id\) : null/);
  assert.match(templateEditor, /if \(!atRoot && \(selectedBlock\?\.type === "group" \|\| selectedBlock\?\.type === "column"\) && !currentSelected\) return null/);
  assert.match(templateEditor, /if \(!groupAllowsChild\(currentSelected, projected\.type\)\) return null/);
});

test("duplicating a List assigns fresh IDs to every nested List", () => {
  let nextId = 0;
  const source = { ...document(), blocks: [{ id: "list-root", type: "list", style: "unordered", items: [
    { text: "Parent", children: [{ id: "list-child", type: "list", style: "ordered", items: [
      { text: "Nested parent", children: [{ id: "list-grandchild", type: "list", style: "unordered", items: ["Deep item"] }] },
    ] }] },
  ] }] };
  const duplicated = duplicateBlockAt(source, 0, type => `${type}-${++nextId}`);
  const ids = [];
  function collect(list) {
    ids.push(list.id);
    for (const item of list.items) if (typeof item !== "string") for (const child of item.children ?? []) collect(child);
  }
  collect(duplicated.blocks[1]);
  assert.equal(new Set(ids).size, ids.length);
  assert.notDeepEqual(ids, ["list-root", "list-child", "list-grandchild"]);
  assert.deepEqual(duplicated.blocks[1].items[0].children[0].items[0].children[0].items, ["Deep item"]);
});

test("new code blocks start empty for the editor placeholder", async () => {
  const source = await readFile(new URL("../app/studio/editor-model.ts", import.meta.url), "utf8");
  assert.match(source, /if \(type === "code"\) return \{ id, type, language: "text", code: "" \};/);
});

test("new table blocks start with the creation placeholder", async () => {
  const source = await readFile(new URL("../app/studio/editor-model.ts", import.meta.url), "utf8");
  assert.match(source, /if \(type === "table"\) return \{ id, type, rows: \[\] \};/);
});

test("custom font size stays selected and updates continuously while its slider moves", async () => {
  const source = await readFile(new URL("../app/studio/studio-inspectors.tsx", import.meta.url), "utf8");
  const customFontSize = await readFile(new URL("../app/studio/controls/custom-font-size-setting.tsx", import.meta.url), "utf8");
  const fontSizeAppearance = await readFile(new URL("../app/studio/controls/font-size-appearance-setting.tsx", import.meta.url), "utf8");
  const templateSource = await readFile(new URL("../app/studio/template-inspector.tsx", import.meta.url), "utf8");
  assert.match(source, /type FontSizeViewMode = "presets" \| "custom"/);
  assert.match(source, /function fontSizeModeKey\(scope: string, block: ContentBlock\) \{\s*return JSON\.stringify\(\[scope, block\.id, block\.type\]\)/);
  assert.match(source, /const \[fontSizeViewModes, setFontSizeViewModes\] = useState<Record<string, FontSizeViewMode>>\(\{\}\)/);
  assert.match(source, /fontSizeModeScope=\{activeDocument\.id\} fontSizeViewModes=\{fontSizeViewModes\} onFontSizeViewModeChange=\{\(key, mode\) => setFontSizeViewModes\(current => \(\{ \.\.\.current, \[key\]: mode \}\)\)\}/);
  assert.match(source, /fontSizeViewMode\s*\?\s*fontSizeViewMode\s*:\s*style\.fontSizeCustom\s*\?\s*"custom"\s*:\s*"presets"/);
  assert.match(customFontSize, /const \[unitWhenValueIsEmpty, setUnitWhenValueIsEmpty\] = useState<CustomFontSizeUnit>\("px"\)/);
  assert.match(customFontSize, /const unit = \(match\?\.\[2\] as CustomFontSizeUnit\) \?\? unitWhenValueIsEmpty/);
  assert.match(customFontSize, /function selectUnit\(nextUnit: CustomFontSizeUnit\) \{\s*setUnitWhenValueIsEmpty\(nextUnit\)/);
  assert.match(source, /const selectedFontSizeModeKey = fontSizeModeKey\(fontSizeModeScope, block\)/);
  assert.match(source, /fontSizeViewMode=\{fontSizeViewModes\[selectedFontSizeModeKey\] \?\? null\}/);
  assert.match(source, /onFontSizeViewModeChange=\{mode => onFontSizeViewModeChange\(selectedFontSizeModeKey, mode\)\}/);
  assert.match(templateSource, /const \[fontSizeViewModes, setFontSizeViewModes\] = useState<Record<string, "presets" \| "custom">>\(\{\}\)/);
  assert.match(templateSource, /fontSizeModeScope=\{`\$\{set\.id\}:\$\{target\.id\}`\} fontSizeViewModes=\{fontSizeViewModes\} onFontSizeViewModeChange=\{\(key, mode\) => setFontSizeViewModes\(current => \(\{ \.\.\.current, \[key\]: mode \}\)\)\}/);
  assert.match(source, /onFontSizeViewModeChange\(mode\)/);
  assert.match(fontSizeAppearance, /onModeChange\(mode === "custom" \? "presets" : "custom"\)/);
  assert.match(customFontSize, /const \[sliderDraft, setSliderDraft\] = useState<string \| null>\(null\)/);
  assert.match(customFontSize, /const sliderDraggingRef = useRef\(false\)/);
  assert.match(customFontSize, /const sliderPointerIdRef = useRef<number \| null>\(null\)/);
  assert.match(customFontSize, /function startSliderDrag\(pointerId: number\) \{\s*if \(sliderDraggingRef\.current\) return;[\s\S]*?sliderDraggingRef\.current = true;\s*sliderPointerIdRef\.current = pointerId;\s*\}/);
  assert.match(customFontSize, /onPointerDown=\{event => startSliderDrag\(event\.pointerId\)\}/);
  assert.doesNotMatch(customFontSize, /onInteractionStart/);
  assert.doesNotMatch(customFontSize, /setPointerCapture\(event\.pointerId\)/);
  assert.match(customFontSize, /function finishSliderDrag\(pointerId\?: number\)/);
  assert.match(customFontSize, /sliderDraggingRef\.current = false;\s*sliderPointerIdRef\.current = null;\s*setSliderDraft\(null\)/);
  assert.match(customFontSize, /window\.addEventListener\("pointerup", finishPointerInteraction\)/);
  assert.match(customFontSize, /window\.addEventListener\("pointercancel", finishPointerInteraction\)/);
  assert.match(customFontSize, /onPointerUp=\{event => finishSliderDrag\(event\.pointerId\)\}/);
  assert.match(customFontSize, /onLostPointerCapture=\{event => finishSliderDrag\(event\.pointerId\)\}/);
  assert.match(customFontSize, /onChange=\{event => \{ const nextValue = event\.currentTarget\.value; if \(sliderDraggingRef\.current\) setSliderDraft\(nextValue\); commit\(nextValue\); \}\}/);
  assert.match(customFontSize, /const sliderMinimum = relativeUnit \? 0\.1 : 1/);
  assert.match(customFontSize, /const sliderMaximum = customFontSizeMaximum\(unit\)/);
  assert.match(customFontSize, /type="range" min=\{sliderMinimum\} max=\{sliderMaximum\}/);
  assert.match(customFontSize, /aria-label="Custom font size slider"[^>]*value=\{sliderValue\}/);
  assert.doesNotMatch(customFontSize, /fontSizeSource/);
  const styles = await readFile(new URL("../app/studio/studio.css", import.meta.url), "utf8");
  assert.match(customFontSize, /className="studio-range-control paragraph-custom-font-size-slider"/);
  assert.match(styles, /\.studio-range-control\[type="range"\] \{ accent-color: var\(--studio-range-accent, var\(--gutenberg-accent\)\); appearance: auto; -webkit-appearance: auto;/);
  assert.match(styles, /\.studio-range-control\[type="range"\]:not\(:disabled\):hover \{ accent-color: var\(--studio-range-hover-accent/);
  assert.match(styles, /\.studio-range-control\[type="range"\]:not\(:disabled\):active \{ accent-color: var\(--studio-range-pressed-accent/);
  assert.match(styles, /\.studio-range-control:focus-visible \{ outline: var\(--focus-ring-width\) solid var\(--studio-range-accent, var\(--gutenberg-accent\)\);/);
});

test("Studio range controls share the Gutenberg-accented slider style", async () => {
  const controls = [
    "../app/studio/box-length-setting.tsx",
    "../app/studio/controls/focal-position-setting.tsx",
    "../app/studio/controls/paragraph-length-setting.tsx",
    "../app/studio/design-editor.tsx",
    "../app/studio/ribbon/ribbon-preview.tsx",
    "../app/studio/studio-inspectors.tsx",
  ];
  for (const path of controls) {
    const source = await readFile(new URL(path, import.meta.url), "utf8");
    assert.match(source, /studio-range-control/, `${path} should use the shared slider style`);
  }
});

test("shared inspector control defaults follow each Gutenberg block declaration", async () => {
  const source = await readFile(new URL("../app/studio/studio-inspectors.tsx", import.meta.url), "utf8");
  const expectedDefaults = {
    heading: { typography: ["colour", "size"] },
    quote: { typography: ["colour", "size"], border: ["border", "radius"] },
    list: { typography: ["colour", "size"] },
    table: { typography: ["colour", "size"], border: ["border"] },
    code: { typography: ["colour", "size"], border: ["border"] },
    button: { typography: ["colour", "size"], dimensions: ["padding", "width"], border: ["border", "radius"] },
    footnotes: { typography: ["colour", "size"], elements: ["link-colour"] },
    "document-title": { typography: ["colour", "size"], elements: ["link-colour"] },
    "post-date": { typography: ["colour", "size"], border: ["border", "radius"], elements: ["link-colour"] },
    "social-icons": { dimensions: ["margin"], border: ["border", "radius"] },
    group: { typography: ["colour", "size"], dimensions: ["padding"], border: ["border", "radius"] },
    section: { typography: ["colour", "size"], dimensions: ["padding"], border: ["border", "radius"] },
    columns: { typography: ["colour", "size"], dimensions: ["padding"], border: ["border", "radius"] },
    column: { typography: ["colour", "size"], dimensions: ["padding"], border: ["border", "radius"] },
  };
  for (const [type, expected] of Object.entries(expectedDefaults)) {
    const profile = blockCapabilityProfiles[type];
    for (const [section, controls] of Object.entries(expected)) assert.deepEqual(profile.defaults[section], controls, `${type}:${section}`);
  }
  assert.deepEqual(capabilityProfileFor("paragraph").defaults.typography, ["colour", "size"]);
  assert.match(source, /const styleControls = \[\.\.\.profile\.controls, \.\.\.retainedLegacyStyleControls/);
  assert.match(source, /const optionalTypographyOptions = scopedTypographyOptions\.filter\(option => !defaultTypography\.has\(option\.id\)\)/);
  assert.match(source, /const optionalDimensionOptions = scopedDimensionOptions\.filter\(option => !defaultDimensions\.has\(option\.id\)\)/);
  assert.match(source, /const optionalBorderOptions = scopedBorderOptions\.filter\(option => !defaultBorder\.has\(option\.id\)\)/);
  assert.match(source, /const optionalElementOptions = scopedElementOptions\.filter\(option => !defaultElements\.has\(option\.id\)\)/);
});

test("Advanced exposes Gutenberg anchor, class and safe CSS fields for mapped paths", async () => {
  const source = await readFile(new URL("../app/studio/studio-inspectors.tsx", import.meta.url), "utf8");
  const advancedControl = await readFile(new URL("../app/studio/controls/advanced-fields-control.tsx", import.meta.url), "utf8");
  const stylesheet = await readFile(new URL("../app/studio/studio.css", import.meta.url), "utf8");
  const advancedFields = source.slice(source.indexOf("function advancedFieldsForBlock"), source.indexOf("function AdvancedFieldsInspector"));
  const advancedInspector = source.slice(source.indexOf("function AdvancedFieldsInspector"), source.indexOf("function ParagraphInspector"));
  const inspectorStart = source.indexOf("export function BlockInspector");
  const blockSettings = source.slice(source.indexOf("const blockSettings = (", inspectorStart), source.indexOf("const requiredSettings = (", inspectorStart));
  const paragraph = capabilityProfileFor("paragraph");
  assert.deepEqual(paragraph.controls.find(control => control.id === "advanced")?.fields, ["anchor"]);
  assert.equal(paragraph.controls.find(control => control.id === "class-name")?.source, "gutenberg");
  assert.deepEqual(paragraph.controls.find(control => control.id === "class-name")?.fields, ["className"]);
  assert.equal(paragraph.controls.find(control => control.id === "additional-css")?.source, "gutenberg");
  assert.match(advancedFields, /const controls = profile\.controls\.filter\(item => item\.section === "advanced" && item\.source === source\)/);
  assert.match(advancedFields, /const fields = controls\.flatMap\(control => control\.fields\)/);
  assert.match(advancedFields, /anchor: fields\.some\(field => field\.endsWith\("anchor"\)\)/);
  assert.match(advancedFields, /className: fields\.some\(field => field\.endsWith\("className"\)\)/);
  assert.match(advancedFields, /additionalCss: fields\.some\(field => field\.endsWith\("additionalCss"\)\)/);
  const heading = capabilityProfileFor("heading");
  assert.ok(heading.controls.find(control => control.id === "advanced")?.fields.some(field => field.endsWith("additionalCss")));
  const dividerInspector = source.slice(source.indexOf("function DividerInspector"), source.indexOf("function LayoutInspector"));
  assert.match(dividerInspector, /fields=\{\{ anchor: true, className: true, additionalCss: true \}\}/);
  assert.match(advancedInspector, /paragraph-advanced-fields/);
  assert.match(blockSettings, /<AdvancedFieldsInspector semanticElement=\{!contentSlot\} block=\{block\} onChange=\{onChange\} fields=\{advanced\} \/>/);
  assert.match(blockSettings, /fields=\{advanced\}/);
  assert.match(stylesheet, /\.paragraph-advanced-fields \.advanced-field > label \{ text-transform: uppercase; \}/);
  assert.match(advancedControl, /const fieldId = useId\(\)/);
  assert.match(advancedInspector, /placeholders=\{block\.type !== "paragraph" && block\.type !== "embed"\}/);
  assert.match(advancedControl, /fields\.className \? <div className="advanced-field"><label htmlFor=\{`\$\{fieldId\}-class-name`\}><span>Additional CSS class\(es\)<\/span><\/label><input id=\{`\$\{fieldId\}-class-name`\} aria-describedby=\{`\$\{fieldId\}-class-name-help`\} value=\{style\.className \?\? ""\}/);
  assert.match(advancedControl, /fields\.additionalCss \? <div className="advanced-field"><label htmlFor=\{`\$\{fieldId\}-additional-css`\}><span>Additional CSS<\/span><\/label><textarea id=\{`\$\{fieldId\}-additional-css`\} aria-describedby=/);
  assert.match(advancedControl, /placeholder=\{!placeholders \? undefined : "section-name"\}/);
  assert.match(advancedControl, /placeholder=\{!placeholders \? undefined : "custom-class"\}/);
  assert.doesNotMatch(advancedControl, /<textarea[^>]*placeholder=/);
  assert.match(advancedControl, /Enter a word or two, without spaces, to make a unique web address just for this block/);
  assert.match(advancedControl, /Learn more about anchors/);
  assert.match(advancedControl, /Separate multiple classes with spaces\./);
  assert.match(advancedControl, /Add your own CSS to customise the appearance of the \{blockName\} block/);
  assert.match(advancedControl, /e\.g\. <code>colour: red;<\/code>/);
  assert.doesNotMatch(advancedControl, /Studio applies safe declarations to this block/);
  assert.match(advancedInspector, /block\.type === "paragraph" \|\| block\.type === "columns" \|\| block\.type === "column"\) onChange\(\{ \.\.\.block, style:/);
});

test("minimum dimension controls match mapped Gutenberg block support", async () => {
  for (const type of ["quote", "group", "section"]) assert.ok(capabilityProfileFor(type).controls.some(control => control.fields.includes("minHeight")), `${type}:minHeight`);
  for (const type of ["group", "section"]) assert.ok(capabilityProfileFor(type).controls.some(control => control.fields.includes("minWidth")), `${type}:minWidth`);
  assert.ok(!capabilityProfileFor("heading").controls.some(control => control.fields.includes("minHeight")));
});

test("shadow controls match mapped Gutenberg block support", async () => {
  const shadowTypes = ["heading", "quote", "button", "code", "group", "section", "columns", "column", "image", "cover-image", "document-title"];
  for (const type of shadowTypes) assert.ok(capabilityProfileFor(type).controls.some(control => control.id === "shadow"), `${type}:shadow`);
  assert.equal(capabilityProfileFor("paragraph").controls.find(control => control.id === "shadow")?.source, "studio");
  assert.equal(capabilityProfileFor("paragraph").controls.some(control => control.id === "text-shadow"), false);
});

test("Cover Image exposes Gutenberg shared border, radius and shadow styling", async () => {
  const source = await readFile(new URL("../app/studio/studio-inspectors.tsx", import.meta.url), "utf8");
  const profile = capabilityProfileFor("cover-image");
  const inspector = source.slice(source.indexOf("const sharedStyleSectionContent"), source.indexOf("const orderedSharedStyleSections"));
  const borderSettings = await readFile(new URL("../app/studio/controls/border-settings.tsx", import.meta.url), "utf8");
  assert.equal(profile.controls.find(control => control.id === "border")?.source, "gutenberg");
  assert.equal(profile.controls.find(control => control.id === "radius")?.source, "gutenberg");
  assert.equal(profile.controls.find(control => control.id === "shadow")?.source, "gutenberg");
  assert.match(inspector, /border: <InspectorToolsSection title="Border"[\s\S]*?<BorderSettings style=\{style\}/);
  assert.match(borderSettings, /includeRadius/);
  assert.match(borderSettings, /includeShadow/);
  assert.match(borderSettings, /BoxLengthSetting/);
});

test("the block inspector has one settings panel while document tabs and popovers remain", async () => {
  const source = await readFile(new URL("../app/studio/studio-inspectors.tsx", import.meta.url), "utf8");
  const blockInspector = source.slice(source.indexOf("export function BlockInspector"), source.indexOf("type AdvancedFields"));
  assert.match(source, /<div className="inspector-sections">\{blockSettings\}\{requiredSettings\}<\/div>/);
  assert.doesNotMatch(blockInspector, /<PaneTabs|<PaneTabPanel|hasStudioOptions|studioSettings|defaultTab/);
  assert.match(source, /const tabs = \["document", "studio", "block", "styles"\] as const/);
  assert.match(source, /function usePortalRoot\(\)/);
  assert.match(source, /excerptOpen && portalRoot \? createPortal/);
  assert.match(source, /statusOpen && portalRoot \? createPortal/);
  assert.match(source, /publishOpen && portalRoot \? createPortal/);
});

test("table editing exposes row and column actions from the toolbar menu", async () => {
  const source = await readFile(new URL("../app/studio/studio-canvas.tsx", import.meta.url), "utf8");
  assert.match(source, /aria-label="Table options"/);
  assert.match(source, /Insert row before/);
  assert.match(source, /Delete column/);
});

test("block options expose a safe Gutenberg-style Edit as HTML action", async () => {
  const [canvas, htmlEditor, styles, blockMenu, anchoredMenu, menu] = await Promise.all([
    readFile(new URL("../app/studio/studio-canvas.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/studio/studio-html-editor.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/studio/studio.css", import.meta.url), "utf8"),
    readFile(new URL("../app/studio/block-options-menu.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/studio/overlays/anchored-menu.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/studio/overlays/menu.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(canvas, /aria-label="More block options"/);
  assert.match(canvas, /action: "html", label: "Edit as HTML", disabled: !writable \|\| !allowHtmlEditing/);
  assert.match(canvas, /if \(action === "html"\) \{ openHtmlEditor\(block\); return; \}/);
  assert.match(canvas, /<BlockOptionsMenu items=\{blockMenuItems\(block\)\} trigger=\{htmlEditorTriggerRef\} onClose=\{closeBlockMenu\} onAction=\{action => \{ void runBlockMenuAction\(action, block\); \}\}/);
  assert.match(blockMenu, /<StudioMenuItem[^>]*onClick=\{\(\) => onAction\(item\.action\)\}/);
  assert.match(menu, /role="menuitem"/);
  assert.match(canvas, /<strong>Edit as HTML<\/strong>/);
  assert.match(canvas, /parseHtmlToBlock\(htmlEditor\.draft, block, activeDocument\.blocks\)/);
  assert.match(htmlEditor, /export function blockToHtml/);
  assert.match(htmlEditor, /export function parseHtmlToBlock/);
  assert.match(htmlEditor, /Component blocks are code-backed/);
  assert.match(htmlEditor, /Scripts, event handlers and unsafe elements are not supported/);
  assert.match(htmlEditor, /Each block must have a unique data-block-id/);
  assert.match(canvas, /That edit would duplicate another block ID/);
  assert.match(htmlEditor, /Each block must have a unique block ID/);
  assert.match(htmlEditor, /This HTML would create an invalid block/);
  assert.match(htmlEditor, /Table rows must all contain the same number of cells/);
  assert.match(htmlEditor, /plainTextFromRuns/);
  assert.match(styles, /\.block-options-menu \{[^}]*background: white[^}]*position: absolute/);
  assert.match(styles, /\.html-editor-popover textarea \{[^}]*font-family: ui-monospace[^}]*font-size: 13px/);
  assert.match(blockMenu, /<StudioAnchoredMenu anchor=\{\(\) => trigger\.current\} align="end" className="block-options-menu studio-block-options-menu"/);
  assert.match(anchoredMenu, /role="menu" tabIndex=\{-1\}/);
});

test("the shared canvas exposes a recursive List View for block structure", async () => {
  const [canvas, styles, presentation] = await Promise.all([
    readFile(new URL("../app/studio/studio-canvas.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/studio/studio.css", import.meta.url), "utf8"),
    readFile(new URL("../app/studio/mini-golf-presentation.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(canvas, /aria-label="List View"/);
  assert.match(canvas, /function StudioListView/);
  assert.match(canvas, /blockChildren\(block\)/);
  assert.match(canvas, /aria-expanded={expanded}/);
  assert.match(canvas, /scrollIntoView\({ block: "nearest"/);
  assert.match(canvas, /data-studio-block-anchor-id={block\.id}/);
  assert.match(canvas, /data-studio-nested-block-id={block\.id}/);
  assert.match(presentation, /data-studio-nested-block-id={child\.id}/);
  assert.match(styles, /\.studio-list-view \{/);
  assert.match(styles, /\.studio-list-item\.is-selected/);
});

test("the shared canvas exposes a document-level Gutenberg-style code editor", async () => {
  const [canvas, htmlEditor, styles, prototype, siteEditor] = await Promise.all([
    readFile(new URL("../app/studio/studio-canvas.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/studio/studio-html-editor.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/studio/studio.css", import.meta.url), "utf8"),
    readFile(new URL("../app/studio/studio-prototype.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/studio/mini-golf-site-editor.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(canvas, /aria-label="Code editor"/);
  assert.match(canvas, /function StudioCodeEditor/);
  assert.match(canvas, /blocksToHtml\(activeDocument\.blocks\)/);
  assert.match(canvas, /initialDraft/);
  assert.match(canvas, /initialBlocksSnapshot/);
  assert.match(canvas, /draft !== current\.initialDraft/);
  assert.match(canvas, /parseHtmlToBlocks\(codeEditor\.draft, activeDocument\.blocks\)/);
  assert.match(canvas, /codeEditor\.documentId !== activeDocument\.id/);
  assert.match(canvas, /JSON\.stringify\(activeDocument\.blocks\) !== codeEditor\.initialBlocksSnapshot/);
  assert.match(canvas, /This document changed outside the code editor/);
  assert.match(canvas, /Discard unsaved code changes\?/);
  assert.match(canvas, /Exit code editor/);
  assert.match(canvas, /id="studio-code-source"/);
  assert.match(canvas, /Wrap text/);
  assert.match(canvas, /Format code/);
  assert.match(canvas, /Code is already formatted/);
  assert.match(canvas, /Formatting unavailable while another Studio tab owns editing/);
  assert.match(canvas, /aria-pressed={wrapText}/);
  assert.match(canvas, /wrap={wrapText \? "soft" : "off"}/);
  assert.match(canvas, /highlightCode\(state\.draft, "html"\)/);
  assert.match(canvas, /className="studio-code-highlight" aria-hidden="true"/);
  assert.match(canvas, /onScroll={syncHighlightScroll}/);
  assert.match(htmlEditor, /export function blocksToHtml/);
  assert.match(htmlEditor, /export function formatHtml/);
  assert.match(htmlEditor, /textContainers/);
  assert.match(htmlEditor, /tagStack/);
  assert.match(htmlEditor, /export function parseHtmlToBlocks/);
  assert.match(htmlEditor, /Component blocks are code-backed/);
  assert.match(styles, /\.studio-code-source, \.studio-code-highlight \{[^}]*font-family: ui-monospace[^}]*width: 100%/);
  assert.match(styles, /\.studio-code-source-wrap \{[^}]*position: relative/);
  assert.match(styles, /\.studio-code-highlight \{[^}]*pointer-events: none[^}]*position: absolute/);
  assert.match(styles, /\.studio-code-source-wrap\.is-wrapped \.studio-code-source, \.studio-code-source-wrap\.is-wrapped \.studio-code-highlight/);
  assert.match(styles, /\.studio-code-source\.is-wrapped \{[^}]*white-space: pre-wrap/);
  assert.match(prototype, /function confirmCodeEditorDiscard/);
  assert.match(siteEditor, /function confirmCodeEditorDiscard/);
});

test("the block appender exposes Gutenberg's slash prompt and add control", async () => {
  const source = await readFile(new URL("../app/studio/studio-canvas.tsx", import.meta.url), "utf8");
  assert.match(source, /placeholder="Type \/ to choose a block"/);
  assert.match(source, /aria-label="Add block"/);
});

test("the cover image exposes a between-block inserter", async () => {
  const source = await readFile(new URL("../app/studio/studio-canvas.tsx", import.meta.url), "utf8");
  assert.match(source, /aria-label="Add block below cover image"/);
  assert.match(source, /toggleInserter\(-1\)/);
});

test("dynamic cover blocks keep selection borders tight to the image", async () => {
  const styles = await readFile(new URL("../app/studio/studio.css", import.meta.url), "utf8");
  assert.match(styles, /\.canvas-block > \.canvas-cover-wrap\.document-dynamic-cover \{ margin: 0; \}/);
  assert.match(styles, /\.canvas-block > \.canvas-cover-wrap\.document-dynamic-cover > \.canvas-cover-image \{ margin: 0; \}/);
  assert.match(styles, /\.cover-image-visual-style-frame > \.document-dynamic-cover \{ margin: 0; \}/);
  assert.match(styles, /\.canvas-block > \.cover-image-visual-style-frame > \.canvas-cover-wrap\.document-dynamic-cover \{ margin: 0; \}/);
  assert.match(styles, /\.canvas-block > \.cover-image-visual-style-frame > \.canvas-cover-wrap\.document-dynamic-cover > \.canvas-cover-image \{ margin: 0; \}/);
  assert.match(styles, /\.canvas-block > \.cover-image-visual-style-frame\.has-cover-image-frame-override > \.canvas-cover-wrap\.document-dynamic-cover > \.canvas-cover-image \{ border: 0; border-radius: 0; \}/);
  assert.match(styles, /\.template-editing \.canvas-block\.is-cover-image \.canvas-cover-wrap\.document-dynamic-cover \{ margin: 0; \}/);
  assert.match(styles, /\.template-editing \.canvas-block\.is-cover-image \.canvas-cover-wrap\.document-dynamic-cover > \.canvas-cover-image \{ margin: 0; \}/);
  assert.match(styles, /\.template-editing \.canvas-block\.is-cover-image \.template-node-selectable \.cover-image-visual-style-frame\.has-cover-image-frame-override \.canvas-cover-wrap\.document-dynamic-cover > \.canvas-cover-image \{ border: 0; border-radius: 0; \}/);
});

test("template cover editing uses the shared hover actions", async () => {
  const source = await readFile(new URL("../app/studio/template-renderer.tsx", import.meta.url), "utf8");
  assert.match(source, /className=\{`canvas-cover-wrap document-dynamic-cover\$\{fieldVisualClassName \? ` \$\{fieldVisualClassName\}` : ""\}`\}/);
  assert.match(source, /className="canvas-cover-actions"/);
  assert.match(source, /aria-label="Choose fixed cover image"/);
  assert.match(source, /aria-label="Remove cover image"/);
  assert.match(source, /aria-label="Delete cover image block"/);
  assert.doesNotMatch(source, />Change Cover Image<\/button>/);
});

test("dynamic subtitle blocks use compact body sizing", async () => {
  const styles = await readFile(new URL("../app/studio/studio.css", import.meta.url), "utf8");
  assert.match(styles, /\.canvas-block > \.metadata-block-editor\.document-dynamic-field\.template-subtitle \{ font: var\(--template-font-size, 1rem\)\/1\.45 var\(--template-font, var\(--font-sans\)\); margin: 0; max-width: 42em; \}/);
});

test("template dynamic fields use neutral placeholders", async () => {
  const [canvas, editor, renderer, styles] = await Promise.all([
    readFile(new URL("../app/studio/studio-canvas.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/studio/template-editor.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/studio/template-renderer.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/studio/templates.css", import.meta.url), "utf8"),
  ]);
  assert.match(canvas, /templatePlaceholder \? "Title" : document\?\.title \|\| "Add a title in Document settings\."/);
  assert.match(canvas, /templatePlaceholder \? "Subtitle" : document\?\.subtitle \|\| "Add a subtitle in Document settings\."/);
  assert.match(editor, /const contentSlot = <TemplateContentSlot \/>/);
  assert.match(editor, /templatePreview=\{context\.mode === "preview"\}/);
  assert.ok(renderer.includes("templatePreview ? <TitleElement id={fieldVisualId} className={titleClassName} style={titleStyle}>Title</TitleElement>"));
  assert.ok(renderer.includes("templatePreview ? <p id={fieldVisualId} className={`template-subtitle template-dynamic-placeholder${subtitleClass}`} style={subtitleStyle}>Subtitle</p>"));
  assert.match(styles, /\.template-dynamic-placeholder \{ color: #7b8088; \}/);
});

test("template footer selection removes duplicate top spacing", async () => {
  const styles = await readFile(new URL("../app/studio/templates.css", import.meta.url), "utf8");
  assert.match(styles, /\.template-editing \.template-node:has\(> \.template-node-selectable > \.template-footer\), \.template-editing \.template-footer \{ margin-top: 0; \}/);
});

test("Studio environment badges use the neutral LOCAL label", async () => {
  const [dashboard, prototype, workspace, styles] = await Promise.all([
    readFile(new URL("../app/studio/studio-dashboard.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/studio/studio-header.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/studio/template-workspace.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/studio/studio.css", import.meta.url), "utf8"),
  ]);
  for (const source of [dashboard, prototype, workspace]) assert.match(source, /className="prototype-pill">LOCAL<\/span>/);
  const coordinator = await readFile(new URL("../app/studio/studio-prototype.tsx", import.meta.url), "utf8");
  assert.match(coordinator, /<StudioHeader studioSection=\{studioSection\}/);
  assert.match(styles, /\.prototype-pill \{\s*background: #e7e7e7;\s*border-radius: 999px;\s*color: #1c1c1e;/);
});

test("template cover actions only render when handlers are available", async () => {
  const [renderer, styles] = await Promise.all([
    readFile(new URL("../app/studio/template-renderer.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/studio/studio.css", import.meta.url), "utf8"),
  ]);
  assert.match(renderer, /const actions = onChangeCover \? <div className="canvas-cover-actions">/);
  assert.match(renderer, /onRemoveCoverImage \? <button className="cover-action-button"/);
  assert.match(renderer, /onRemoveCoverBlock \? <button className="cover-action-button is-destructive"/);
  assert.match(styles, /\.canvas-cover-wrap:hover \.canvas-cover-actions, \.canvas-cover-wrap:focus-within \.canvas-cover-actions \{[^}]*pointer-events: auto/);
});

test("document cover actions only render when handlers are available", async () => {
  const source = await readFile(new URL("../app/studio/studio-canvas.tsx", import.meta.url), "utf8");
  assert.match(source, /\{onOpenCoverMediaLibrary \|\| onRemoveCoverImage \? <div className="canvas-cover-actions">/);
  assert.match(source, /onOpenCoverMediaLibrary \? <button className="cover-action-button"/);
  assert.match(source, /onRemoveCoverImage \? <button className="cover-action-button is-destructive"/);
});

test("block hover controls use the shared ACM move chevrons vertically", async () => {
  const [canvas, styles] = await Promise.all([
    readFile(new URL("../app/studio/studio-canvas.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/studio/studio.css", import.meta.url), "utf8"),
  ]);
  assert.match(canvas, /className="block-move-controls" role="group" aria-label="Move block"/);
  assert.match(canvas, /StudioHoverIcon name="arrange\.move-up"/);
  assert.match(canvas, /StudioHoverIcon name="arrange\.move-down"/);
  assert.match(styles, /\.block-move-controls \{[^}]*grid-template-rows: repeat\(2, 18px\)/);
  assert.match(styles, /\.canvas-block-toolbar \{[^}]*background: var\(--studio-toolbar-background\)/s);
  assert.match(styles, /\.canvas-block-toolbar \{[^}]*border: 1px solid var\(--studio-toolbar-border\)/s);
  assert.match(styles, /\.canvas-block-toolbar button:not\(\.acm-button\):where\(:not\(\[role\^="menuitem"\]\)\) \{[^}]*height: 30px[^}]*width: 30px/);
  assert.match(styles, /\.canvas-block-toolbar button:focus-visible \{[^}]*outline:/);
  assert.match(styles, /\.canvas-block-actions \{[^}]*align-items: center[^}]*display: flex/);
  const order = [
    canvas.indexOf("<BlockTransformControl"),
    canvas.indexOf('className="drag-handle"'),
    canvas.indexOf('className="block-move-controls"'),
    canvas.indexOf('className="canvas-format-actions"'),
    canvas.indexOf('className="canvas-block-actions"'),
    canvas.indexOf('aria-label="Duplicate block"'),
    canvas.indexOf('aria-label="Remove block"'),
  ];
  assert.equal(order.every((position) => position >= 0), true);
  assert.deepEqual([...order].sort((a, b) => a - b), order);
});

test("Files view controls centre their source-faithful icons", async () => {
  const styles = await readFile(new URL("../app/studio/media.css", import.meta.url), "utf8");
  assert.match(styles, /\.media-view-switcher button \{[^}]*align-items: center[^}]*display: inline-flex[^}]*justify-content: center[^}]*padding: 0/);
});

test("double-clicking a local image opens an accessible media preview", async () => {
  const [manager, styles] = await Promise.all([
    readFile(new URL("../app/studio/media-manager.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/studio/media.css", import.meta.url), "utf8"),
  ]);
  assert.match(manager, /onDoubleClick=\{\(event\) => openImagePreview\(asset, event\.currentTarget\)\}/);
  assert.match(manager, /<dialog ref=\{previewDialogRef\} className="media-preview-dialog" aria-labelledby="media-preview-title"/);
  assert.match(manager, /aria-label="Close image preview"/);
  assert.match(manager, /dialog\.showModal\(\)/);
  assert.match(manager, /previewTriggerRef\.current\?\.focus\(\)/);
  assert.match(styles, /\.media-preview-dialog::backdrop \{ background: rgba\(25, 26, 28, \.72\); \}/);
});

test("the document bar keeps a fixed, vertically centred layout", async () => {
  const source = await readFile(new URL("../app/studio/studio.css", import.meta.url), "utf8");
  assert.match(source, /\.editor-document-bar \{[^}]*height: 64px[^}]*min-height: 64px/);
  assert.match(source, /\.editor-document-counts strong \{[^}]*text-overflow: ellipsis[^}]*white-space: nowrap/);
  assert.match(source, /\.editor-document-actions button \{[^}]*height: 40px[^}]*justify-content: center/);
});

test("the document inspector exposes Gutenberg-style status and publish date controls", async () => {
  const [source, styles] = await Promise.all([
    readFile(new URL("../app/studio/studio-inspectors.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/studio/studio.css", import.meta.url), "utf8"),
  ]);
  assert.match(source, /Status &amp; visibility/);
  assert.match(source, /publish-calendar-grid/);
  assert.match(source, /aria-label="Previous month"/);
  assert.match(source, /aria-label="Next month"/);
  assert.match(source, /formatPublicationTimezone\(selectedDate\)/);
  assert.match(source, /Times use this device’s local time zone/);
  assert.match(source, /Now/);
  assert.match(source, /const publishDate = document\.publishAt \? formatPublishDate\(document\.publishAt\) : "Immediately";/);
  assert.match(source, /function publishImmediately\(\) \{\s*const now = new Date\(\)\.toISOString\(\);\s*onChange\("publishAt", undefined\);/);
  assert.doesNotMatch(source, /Use immediately/);
  assert.match(source, /documentStatusDescription/);
  assert.match(source, /onChange\("publishAt"/);
  assert.match(source, /aria-haspopup="dialog" aria-controls="publish-date-popover"/);
  assert.match(source, /publishOpen && portalRoot \? createPortal\(<div ref=\{publishPopoverRef\} id="publish-date-popover"[\s\S]*?portalRoot\) : null\}/);
  assert.match(source, /className="post-excerpt-control"[\s\S]*?post-content-summary[\s\S]*?title="Publishing"[\s\S]*?title="Address"[\s\S]*?title="Author"/);
  assert.match(source, /document\.kind === "post" \? <div className="post-summary-block">[\s\S]*?className="post-excerpt-control"[\s\S]*?className="post-content-summary"/);
  assert.match(source, /watchInspectorPopover\(publishTriggerRef\.current, publishPopoverRef\.current, 320, setPublishPopoverPosition, \{ topOffset: -12 \}\)/);
  assert.match(source, /globalThis\.document\.addEventListener\("pointerdown", closePublishPopover\)/);
  assert.match(source, /event\.target\.closest\("button, input, select, textarea, a\[href\], \[tabindex\]:not\(\[tabindex='-1'\]\)"\)/);
  assert.match(source, /event\.key !== "Escape"/);
  assert.match(styles, /\.publish-date-popover \{[^}]*position: fixed[^}]*z-index: 80/);
});

test("post excerpts open in a Gutenberg-style pane beside the inspector", async () => {
  const [source, styles] = await Promise.all([
    readFile(new URL("../app/studio/studio-inspectors.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/studio/studio.css", import.meta.url), "utf8"),
  ]);
  assert.match(source, /document\.excerpt\.trim\(\) \? "Edit excerpt" : "Add an excerpt…"/);
  assert.match(source, /excerptOpen && portalRoot \? createPortal\(<section ref=\{excerptPopoverRef\} id=\{excerptPopoverId\}[^\n]*role="dialog" aria-label="Excerpt"/);
  assert.match(source, /className="inspector-popover post-excerpt-popover"[\s\S]*?portalRoot\) : null\}/);
  assert.match(source, /statusOpen && portalRoot \? createPortal\(<div ref=\{statusPopoverRef\}[\s\S]*?portalRoot\) : null\}/);
  assert.match(source, /function usePortalRoot\(\)[\s\S]*?setPortalRoot\(globalThis\.document\?\.body \?\? null\)/);
  assert.match(source, /aria-label="Close excerpt"/);
  assert.match(source, /Learn more about manual excerpts/);
  assert.match(source, /function closeWithEscape\(event: globalThis\.KeyboardEvent\)[\s\S]*?setExcerptOpen\(false\)[\s\S]*?excerptTriggerRef\.current\?\.focus\(\)/);
  assert.match(source, /watchInspectorPopover\(excerptTriggerRef\.current, excerptPopoverRef\.current, 640, setExcerptPopoverPosition, \{ topOffset: -12 \}\)/);
  const positioning = await readFile(new URL("../app/studio/panes/inspector-popover-geometry.mjs", import.meta.url), "utf8");
  assert.match(positioning, /Math\.min\(ownerLeft, boundaryLeft\) - width - 12/, "the shared owner positions the excerpt to the pane's left");
  assert.match(styles, /\.post-excerpt-popover \{[^}]*position: fixed[^}]*z-index: 80/);
  assert.match(styles, /\.post-document-inspector > \.post-summary-block \{[^}]*display: grid[^}]*gap: 12px[^}]*padding: 14px 18px 18px/);
  assert.match(styles, /\.post-document-inspector \.post-excerpt-trigger \{[^}]*color: var\(--accent-strong\)[^}]*display: inline-flex/);
  assert.match(styles, /\.post-document-inspector \.post-content-summary \{[^}]*display: grid[^}]*gap: 6px/);
});

test("Gutenberg controls use the single block inspector and nonessential ACM options stay hidden", async () => {
  const source = await readFile(new URL("../app/studio/studio-inspectors.tsx", import.meta.url), "utf8");
  const inspectorStart = source.indexOf("export function BlockInspector");
  const blockStart = source.indexOf("const blockSettings", inspectorStart);
  const requiredStart = source.indexOf("const requiredSettings", blockStart);
  const blockSettings = source.slice(blockStart, requiredStart);
  const requiredSettings = source.slice(requiredStart, source.indexOf("\n  return <div", requiredStart));
  const socialLinkSettings = requiredSettings.slice(requiredSettings.indexOf('block.type === "social-linkedin"'));
  assert.match(source, /const alignedBlock = block\.type === "document-title" \? block : null/);
  assert.match(blockSettings, /title="Social Icons"[\s\S]*?<span>Style<\/span>[\s\S]*?logos-only[\s\S]*?<LayoutSpacingSetting[^>]*label=\{index \? "Vertical gap" : "Horizontal gap"\}/);
  assert.doesNotMatch(blockSettings, /Horizontal gap \(px\)|Vertical gap \(px\)/);
  assert.match(socialLinkSettings, /Profile URL[\s\S]*Text label[\s\S]*Link rel/, "standalone social link attributes share one section with its profile URL");
  assert.equal((socialLinkSettings.match(/<span>Text label<\/span>/g) ?? []).length, 1, "standalone social links render one editable label field");
  assert.equal((socialLinkSettings.match(/<span>Link rel<\/span>/g) ?? []).length, 1, "standalone social links render one rel field");
  assert.doesNotMatch(blockSettings, /Code language|Divider colour|Studio cover options|Studio responsive layout|Studio spacer width/);
  assert.match(requiredSettings, /<span>Profile URL<\/span>/, "standalone social links remain editable");
  const canvas = await readFile(new URL("../app/studio/studio-canvas.tsx", import.meta.url), "utf8");
  assert.match(canvas, /aria-label="Embed player title"[^>]*value=\{block\.title\}[^>]*onChange=\{event => onChange\(\{ \.\.\.block, title: event\.target\.value \}\)\}/, "safe Embed player title remains editable on the canvas");
  assert.match(canvas, /function EmbedUrlField\(\{ block, rootBlocks, selected, writable, mediaUrls, onTextSelection, onLinkActivate, onChange \}/, "Embed editing receives the canvas parent policy, write permission and shared rich-text handlers");
  assert.match(canvas, /EmbedUrlField key=\{`\$\{block\.id\}-\$\{block\.url\}`\}/, "undo and redo remount the URL form from saved block state");
  assert.match(canvas, /event\.preventDefault\(\);\s*if \(!writable\) return;/, "URL submission enforces read-only mode in its handler");
  assert.match(canvas, /disabled=\{!writable\}/, "read-only canvases disable Embed URL submission");
  assert.doesNotMatch(requiredSettings, /Studio spacing|Additional CSS declarations|Reading Time|<span>Presentation<\/span>|<span>Prefix<\/span>|document-subtitle/);
  const dividerInspector = source.slice(source.indexOf("function DividerInspector"), source.indexOf("function LayoutInspector"));
  assert.match(dividerInspector, /<AdvancedFieldsInspector[^>]*>[\s\S]*<span>HTML element<\/span>[\s\S]*<\/AdvancedFieldsInspector>/, "the Gutenberg hr/div selector belongs in Advanced");
  assert.equal(capabilityProfileFor("divider").controls.find(control => control.id === "element")?.source, "gutenberg");
  assert.equal(capabilityProfileFor("divider").controls.find(control => control.id === "element")?.section, "advanced");
  assert.deepEqual(capabilityProfileFor("divider").controls.find(control => control.id === "background")?.fields, ["backgroundColor", "backgroundGradient"]);
  assert.equal(capabilityProfileFor("divider").controls.find(control => control.id === "background")?.source, "gutenberg");
  assert.deepEqual(capabilityProfileFor("divider").sections.map(section => [section.id, section.label]), [["layout", "Styles"], ["background", "Background"], ["dimensions", "Dimensions"], ["advanced", "Advanced"]]);
});

test("Paragraph Typography follows Gutenberg options and hides ACM-only controls", async () => {
  const inspector = await readFile(new URL("../app/studio/studio-inspectors.tsx", import.meta.url), "utf8");
  const profileSource = await readFile(new URL("../app/studio/blocks/capability-profiles.ts", import.meta.url), "utf8");
  const colourControl = await readFile(new URL("../app/studio/controls/colour-picker.tsx", import.meta.url), "utf8");
  const toolsSection = await readFile(new URL("../app/studio/inspector-tools-section.tsx", import.meta.url), "utf8");
  const studioTypography = capabilityProfileFor("paragraph").controls.filter(control => control.section === "typography" && control.source === "studio").map(control => control.id);
  const enabledBlockTypography = capabilityProfileFor("paragraph").controls.filter(control => control.section === "typography" && control.source === "gutenberg" && control.enabled !== false).map(control => control.id);
  assert.deepEqual(enabledBlockTypography, ["colour", "size", "appearance", "line-height", "letter-spacing", "line-indent", "columns", "decoration", "letter-case", "drop-cap", "fit-text"]);
  assert.equal(capabilityProfileFor("paragraph").controls.some(control => control.id === "text-shadow"), false, "Paragraph has no Text shadow Typography option");
  assert.deepEqual(studioTypography, []);
  for (const id of ["family", "orientation"]) {
    const control = capabilityProfileFor("paragraph").controls.find(item => item.id === id);
    assert.equal(control?.source, "gutenberg", `${id} is a Gutenberg capability`);
    assert.equal(control?.enabled, false, `${id} is gated out of the current Gutenberg reference profile`);
  }
  assert.match(profileSource, /paragraph: paragraphInspectorProfile/);
  assert.match(inspector, /const profile = capabilityProfileFor\(block\.type\)/);
  assert.match(inspector, /const styleControls = \[\.\.\.profile\.controls, \.\.\.retainedLegacyStyleControls/);
  assert.match(inspector, /const scopedTypographyOptions = typographyOptions\.filter\(option => \(visibleSource === undefined \|\| \(option\.source \?\? "gutenberg"\) === visibleSource\)\)/);
  assert.match(inspector, /function clearTools\(ids: Iterable<string>, resetGroupLayout = false\) \{\s*const selectedIds = \[\.\.\.ids\];\s*const nextStyle = resetSupportedInspectorStyleFields\(style, selectedIds, styleControls\)/);
  assert.match(inspector, /<FontSizeAppearanceSetting/);
  assert.match(inspector, /<BackgroundSelection/);
  assert.doesNotMatch(inspector.slice(inspector.indexOf("export function BlockInspector"), inspector.indexOf("type AdvancedFields")), /<PaneTabs/);
  assert.match(inspector, /paragraphLinkColourHasPoorContrast\(defaultValue, style/);
  assert.match(inspector, /paragraphLinkColourHasPoorContrast\(hoverValue, style/);
  assert.match(inspector, /return <PaletteColourSetting row label="Link" value=\{defaultValue\} onChange=\{onDefaultChange\} hoverValue=\{hoverValue\}/);
  const paletteSetting = await readFile(new URL("../app/studio/controls/palette-colour-setting.tsx", import.meta.url), "utf8");
  assert.match(inspector, /import \{ PaletteColourSetting \} from "\.\/controls\/palette-colour-setting"/);
  assert.match(paletteSetting, /return <ColourPicker label=\{label\}[\s\S]*value=\{value\} onChange=\{onChange\} hoverValue=\{hoverValue\} onHoverChange=\{onHoverChange\}/);
  assert.match(colourControl, /Escape/);
  assert.match(colourControl, /onHoverChange/);
  assert.match(colourControl, /ColourValueSwatch/);
  assert.match(colourControl, /useOverlayDismiss\(/);
  const overlayDismiss = await readFile(new URL("../app/studio/overlays/use-overlay-dismiss.ts", import.meta.url), "utf8");
  assert.match(overlayDismiss, /document\.addEventListener\("keydown", keydown\)/);
  assert.match(overlayDismiss, /event\.key !== "Escape"[^\n]*!isTopmost\(\)/);
  assert.match(toolsSection, /className="inspector-tools-menu-divider" role="separator"/);
  assert.match(toolsSection, /aria-label="Studio options"/);
  assert.match(toolsSection, /gutenbergOptions\.map\(option => <button/);
});

test("Background colour row exposes Gutenberg-style reset and contrast actions only when applicable", async () => {
  const backgroundControl = await readFile(new URL("../app/studio/controls/background-selection.tsx", import.meta.url), "utf8");
  const styles = await readFile(new URL("../app/studio/studio.css", import.meta.url), "utf8");
  assert.match(backgroundControl, /\{colour \? <button type="button" className="paragraph-background-reset-button"/);
  assert.match(backgroundControl, /aria-label="Reset background colour"/);
  assert.match(backgroundControl, /name="action\.remove"/);
  assert.match(backgroundControl, /\{lowContrast \? <button type="button" className="paragraph-background-contrast-button"/);
  assert.match(backgroundControl, /assessTextContrast && colour && !hasBackgroundImage/);
  assert.match(backgroundControl, /paragraphTextColourHasPoorContrast\(textColour \?\? UNIVERSAL_STYLE_PRESET\.palette\.textPrimary, colour, fontSize, fontWeight\)/);
  assert.match(backgroundControl, /aria-expanded=\{showContrastHelp\}/);
  assert.match(backgroundControl, /role="status" hidden=\{!showContrastHelp\}/);
  assert.match(styles, /\.paragraph-background-option-actions button:hover/);
  assert.match(styles, /\.paragraph-background-option-actions button:focus-visible/);
  const inspector = await readFile(new URL("../app/studio/studio-inspectors.tsx", import.meta.url), "utf8");
  assert.match(inspector, /const contrastStyle = block\.type === "button" && interactionState !== "default" \? \{ \.\.\.baseVisualStyle, \.\.\.style \} : style/);
  assert.match(inspector, /assessTextContrast=\{\["paragraph", "heading"/);
});

test("the selected block summary stays above the single inspector panel", async () => {
  const source = await readFile(new URL("../app/studio/studio-inspectors.tsx", import.meta.url), "utf8");
  const inspectorStart = source.indexOf("export function BlockInspector");
  const summaryStart = source.indexOf("className=\"inspector-block-summary\"", inspectorStart);
  const settingsStart = source.indexOf("{blockSettings}{requiredSettings}", summaryStart);
  assert.ok(summaryStart > inspectorStart);
  assert.ok(settingsStart > summaryStart);
  const summary = source.slice(summaryStart, settingsStart);
  assert.match(summary, /<BlockLibraryIcon type=\{block\.type\} \/>/);
  assert.match(summary, /<h2>\{blockName\}<\/h2>/);
  assert.match(summary, /<p className="setting-note">\{blockDescription\}<\/p>/);
  assert.match(source, /blockCatalogue\.find\(\(item\) => item\.type === block\.type\)/);
  assert.match(source, /blockDescription = contentSlot \? "Displays the current document body in this template\." : blockInfo\?\.description \?\? profile\.description/);
});

test("selected document title and subtitle show their block summary in the Block tab", async () => {
  const source = await readFile(new URL("../app/studio/studio-inspectors.tsx", import.meta.url), "utf8");
  assert.match(source, /selectedDocumentField === "title" \? "document-title" : "document-subtitle"/);
  assert.match(source, /selectedDocumentFieldInfo\?\.label \?\? `Document \$\{selectedDocumentField\}`/);
  assert.match(source, /<BlockLibraryIcon type=\{selectedDocumentFieldBlockType\} \/>/);
  assert.match(source, /selectedDocumentField \? \([\s\S]*?<section className="inspector-block-summary">[\s\S]*?<h2>\{selectedDocumentFieldInfo\?\.label/);
  assert.match(source, /<p className="setting-note">\{selectedDocumentFieldInfo\?\.description\}<\/p>/);
});

test("document settings keep WordPress-like fields separate from Studio-specific controls", async () => {
  const [source, styles, paneComponents] = await Promise.all([
    readFile(new URL("../app/studio/studio-inspectors.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/studio/studio.css", import.meta.url), "utf8"),
    readFile(new URL("../app/studio/panes/pane-components.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(source, /activeDocument\.kind === "page" \? "Page" : "Post"/);
  for (const key of ["ArrowRight", "ArrowLeft", "Home", "End"]) assert.ok(paneComponents.includes(`case "${key}"`), `${key} tab navigation`);
  assert.match(paneComponents, /tabIndex=\{active === tab\.id && !tab\.disabled \? 0 : -1\}/);
  assert.match(paneComponents, /role="tabpanel" id=\{paneTabTarget\(id, tab, "panel"\)\} aria-labelledby=\{paneTabTarget\(id, tab, "tab"\)\}/);
  assert.equal((source.match(/title="Content fields"/g) ?? []).length, 1);
  assert.match(source, /documentControls=\{documentControls\}/);
  assert.match(source, /panel === "document" \|\| panel === "studio"/);
  assert.match(source, /const isDocumentPanel = panel === "document"/);
  assert.match(source, /<span>Slug<\/span>/);
  assert.match(source, /className="post-tags-section inspector-accordion-section"/);
  assert.match(source, /title="Studio template presentation"/);
  assert.match(source, /"Search preview"/);
  assert.match(styles, /\.inspector-tabs \{[^}]*grid-template-columns: repeat\(4, minmax\(0, 1fr\)\)/);
});

test("text block hover controls use shared ACM icons", async () => {
  const [canvas, transforms, styles, blockIcons] = await Promise.all([
    readFile(new URL("../app/studio/studio-canvas.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/studio/block-transforms.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/studio/studio.css", import.meta.url), "utf8"),
    readFile(new URL("../app/studio/block-library-icons.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(canvas, /aria-label=\{`Transform \$\{blockLabel\(block\.type\)\} block`\}/);
  assert.match(canvas, /import \{ AcmIcon \} from "@acm\/icons\/react"/);
  assert.match(canvas, /import type \{ IconName \} from "@acm\/icons"/);
  assert.match(canvas, /<HoverBlockTypeIcon type=\{block\.type\}/);
  assert.match(canvas, /return <BlockTypeIcon type=\{type\} \/>/);
  assert.match(canvas, /return <BlockLibraryIcon type=\{type\} \/>/);
  assert.match(blockIcons, /paragraph: \{ source: "ACM Icons", symbol: "text\.paragraph" \}/);
  assert.match(canvas, /StudioHoverIcon name="text\.bold"/);
  assert.match(canvas, /StudioHoverIcon name="text\.italic"/);
  assert.match(canvas, /StudioHoverIcon name="action\.link"/);
  assert.match(canvas, /StudioHoverIcon name="text\.footnote"/);
  assert.match(canvas, /formatMarkButton\(block, "keyboard", "Keyboard input", "text\.keyboard"\)/);
  assert.match(canvas, /StudioHoverIcon name="text\.language"/);
  assert.match(canvas, /StudioHoverIcon name="text\.math"/);
  assert.match(canvas, /formatMarkButton\(block, "subscript", "Subscript", "text\.subscript"\)/);
  assert.match(canvas, /formatMarkButton\(block, "superscript", "Superscript", "text\.superscript"\)/);
  assert.match(canvas, /Transform to/);
  assert.match(transforms, /availableBlockTransforms/);
  assert.match(transforms, /transformBlock/);
  assert.match(styles, /\.canvas-block-toolbar > div \{ align-items: center; display: flex; \}/);
  assert.match(styles, /\.canvas-block-toolbar button > svg \{ display: block; flex: 0 0 auto; \}/);
  assert.match(styles, /\.canvas-format-actions \.alignment-button \{ flex: 0 0 38px; width: 38px; \}/);
});

test("List View uses direction-specific shared movement icons and catalogue links", async () => {
  const [canvas, studioIcons, catalogue, styles] = await Promise.all([
    readFile(new URL("../app/studio/studio-canvas.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/studio/studio-icons.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/studio/ui/icons-catalogue.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/studio/site-draft.css", import.meta.url), "utf8"),
  ]);
  assert.ok(canvas.includes('disabled={!canMoveItem(block.id, -1)} onClick={() => onMoveItem(block.id, -1)}><StudioHoverIcon name="arrange.move-up" size={16} /></button>'));
  assert.ok(canvas.includes('disabled={!canMoveItem(block.id, 1)} onClick={() => onMoveItem(block.id, 1)}><StudioHoverIcon name="arrange.move-down" size={16} /></button>'));
  assert.match(studioIcons, /seen: "view\.show"/);
  assert.match(studioIcons, /"seen-off": "view\.hide"/);
  assert.match(studioIcons, /visibility: "view\.show"/);
  assert.match(studioIcons, /"visibility-off": "view\.hide"/);
  assert.match(catalogue, /"view\.show": \[\{ label: "Show a hidden page on the design canvas"/);
  assert.match(catalogue, /"view\.hide": \[\{ label: "Hide a page on the design canvas"/);
  assert.match(styles, /\.studio-list-actions button \{[^}]*display:grid/);
  assert.doesNotMatch(styles, /\.studio-list-actions button:first-child svg \{ transform:rotate\(180deg\); \}/);
});

test("Studio globe and zoom controls use catalogue symbols with recorded consumers", async () => {
  const [icons, catalogue] = await Promise.all([
    readFile(new URL("../app/studio/studio-icons.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/studio/ui/icons-catalogue.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(icons, /globe: "text\.language"/);
  assert.match(icons, /"zoom-in": "view\.zoom-in"/);
  assert.match(icons, /"zoom-out": "view\.zoom-out"/);
  assert.match(catalogue, /"text\.language": \[[^\]]*Show the destination of a selected external link/);
  assert.match(catalogue, /"view\.zoom-in": \[\{ label: "Zoom in on the Design Canvas"/);
  assert.match(catalogue, /"view\.zoom-out": \[\{ label: "Zoom out on the Design Canvas"/);
  assert.match(catalogue, /Zoom in on a template canvas/);
  assert.match(catalogue, /Zoom out on a template canvas/);
});

test("auto-height fields avoid observing the element they resize", async () => {
  const source = await readFile(new URL("../app/studio/studio-canvas.tsx", import.meta.url), "utf8");
  assert.equal((source.match(/observer\.observe\(observedElement\)/g) ?? []).length, 2);
  assert.ok((source.match(/requestAnimationFrame\(/g) ?? []).length >= 2);
  assert.match(source, /cancelAnimationFrame\(animationFrame\)/);
});

test("document commands add, duplicate and delete documents without losing the active selection", () => {
  const workspace = { activeDocumentId: "post-1", documents: [document()] };
  const copy = duplicateDocumentWithIds(document(), (kind) => `${kind}-2`, (type) => `${type}-2`);
  const withCopy = addDocumentToWorkspace(workspace, copy);
  assert.equal(withCopy.activeDocumentId, "post-2");
  assert.equal(withCopy.documents.length, 2);
  const afterDelete = deleteDocumentFromWorkspace(withCopy, "post-2");
  assert.equal(afterDelete.activeDocumentId, "post-1");
  assert.equal(afterDelete.documents.length, 1);
});

test("deleting a non-active document preserves the active document and adjacent deletion selects deterministically", () => {
  const page = { id: "page-1", kind: "page", title: "Page", blocks: [] };
  const post = { id: "post-1", kind: "post", title: "Post", blocks: [] };
  const otherPost = { id: "post-2", kind: "post", title: "Other post", blocks: [] };
  const workspace = { activeDocumentId: "post-1", documents: [page, post, otherPost] };
  const afterInactiveDelete = deleteDocumentFromWorkspace(workspace, "page-1");
  assert.equal(afterInactiveDelete.activeDocumentId, "post-1");
  const afterActiveDelete = deleteDocumentFromWorkspace(afterInactiveDelete, "post-1");
  assert.equal(afterActiveDelete.activeDocumentId, "post-2");
});

test("content and template list rows expose keyboard and pointer context menus", async () => {
  const [studio, templateWorkspace, menu, styles, sharedMenu, documentCommands] = await Promise.all([
    readFile(new URL("../app/studio/studio-navigation-pane.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/studio/template-workspace.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/studio/studio-list-context-menu.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/studio/studio.css", import.meta.url), "utf8"),
    readFile(new URL("../app/studio/overlays/menu.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/studio/use-studio-document-commands.ts", import.meta.url), "utf8"),
  ]);
  for (const source of [studio, templateWorkspace]) {
    assert.match(source, /onContextMenu=\{/);
    assert.match(source, /event\.key === "ContextMenu"/);
    assert.match(source, /event\.key === "F10" && event\.shiftKey/);
    assert.match(source, /aria-haspopup="menu"/);
  }
  assert.match(menu, /role="menu"/);
  assert.match(menu, /<StudioMenuItem/);
  assert.match(sharedMenu, /role="menuitem"/);
  assert.match(menu, /navigateStudioMenu\(event, \(\) => \{ onClose\(\); requestAnimationFrame/);
  assert.match(sharedMenu, /event\.key === "Escape"/);
  assert.match(menu, /returnFocusRef/);
  assert.match(menu, /disabledReason/);
  assert.match(menu, /actions = \[\]/);
  assert.match(menu, /getBoundingClientRect\(\)/);
  assert.match(menu, /viewportHeight - menuHeight - 8/);
  assert.match(menu, /is-destructive/);
  assert.match(styles, /\.studio-list-context-menu \{/);
  assert.match(templateWorkspace, /function renderTemplateSetCard/);
  assert.match(templateWorkspace, /template-set-context-trigger/);
  assert.match(templateWorkspace, /setTemplateSetContextMenu\(\{ setId: item\.id, label: item\.name/);
  assert.match(templateWorkspace, /function renameTemplateEntry\(setId: string, targetId: string\)/);
  assert.match(templateWorkspace, /function duplicateTemplateEntry\(setId: string, targetId: string\)/);
  assert.match(templateWorkspace, /icon: "pencil"/);
  assert.match(templateWorkspace, /icon: "copy"/);
  assert.doesNotMatch(templateWorkspace, /function duplicateTarget\(\)/);
  assert.doesNotMatch(templateWorkspace, /function deleteTarget\(\)/);
  assert.match(documentCommands, /bin: \[\.\.\.current\.bin, \{[^\n]*document,/);
  assert.match(documentCommands, /\.\.\.\(assignment \? \{ assignment \} : \{\}\)/, "recoverable deletion retains its assignment in the Bin");
});

test("history supports undo and redo and clears redo after a new commit", () => {
  const first = { value: 1 };
  const second = { value: 2 };
  const third = { value: 3 };
  const committed = commitHistory(first, [], 60);
  const undone = undoHistory(second, committed.history, committed.future, 60);
  assert.equal(undone.workspace.value, 1);
  const redone = redoHistory(undone.workspace, undone.history, undone.future, 60);
  assert.equal(redone.workspace.value, 2);
  const newCommit = commitHistory(third, redone.history, 60);
  assert.deepEqual(newCommit.future, []);
});


test("List View stays blue while hovered and selected canvas blocks use red outlines", () => {
  const css = readFileSync(new URL("../app/studio/studio.css", import.meta.url), "utf8");
  assert.match(css, /\.studio-list-item:not\(\.is-selected\):hover\s*\{[^}]*background: var\(--accent-soft\);[^}]*border-color: var\(--accent\)/);
  assert.match(css, /\.canvas-block:not\(\.is-selected\):is\(:hover, \[data-studio-hovered="true"\]\)\s*\{\s*border-color: #8f8f8f;/);
  assert.match(css, /\.canvas-block:not\(\.is-selected\):is\(:hover, \[data-studio-hovered="true"\]\)\s*\{[^}]*outline: 1px solid #8f8f8f;[^}]*outline-offset: -1px;/);
  assert.match(css, /\.canvas-block\.is-selected\s*\{[^}]*border-color: var\(--acm-color-alert, #FF383C\);[^}]*outline: 1px solid var\(--acm-color-alert, #FF383C\);[^}]*outline-offset: -1px;/);
  assert.match(css, /\.studio-list-item\.is-selected\s*\{[^}]*border-color: var\(--accent\)/);
  assert.match(css, /\.canvas-block\.is-table\.is-selected \.table-field-grid \{ border-color: #8f8f8f;/);
});


test("nested editor hover and selection use red inset outlines", () => {
  const css = readFileSync(new URL("../app/studio/studio.css", import.meta.url), "utf8");
  const canvas = readFileSync(new URL("../app/studio/studio-canvas.tsx", import.meta.url), "utf8");
  const presentation = readFileSync(new URL("../app/studio/mini-golf-presentation.tsx", import.meta.url), "utf8");
  assert.match(css, /\.block-canvas :is\(\.studio-nested-block, \[data-studio-selected\]\):not\(\[data-studio-selected="true"\]\):is\(:hover, \[data-studio-hovered="true"\]\) \{ outline: 1px solid #8f8f8f; outline-offset: -1px;/);
  assert.match(css, /\[data-studio-selected="true"\] \{ outline: 1px solid var\(--acm-color-alert, #FF383C\); outline-offset: -1px;/);
  assert.match(canvas, /data-studio-selected=\{selectedBlockId === child.id\}/);
  assert.match(presentation, /"data-studio-selected": context.selectedBlockId === block.id/);
  assert.match(presentation, /<BlockField block=\{block\} selectedBlockId=\{context.selectedBlockId\}/);
});


test("List View pointer hover marks its matching top-level or nested canvas block", () => {
  const canvas = readFileSync(new URL("../app/studio/studio-canvas.tsx", import.meta.url), "utf8");
  const presentation = readFileSync(new URL("../app/studio/mini-golf-presentation.tsx", import.meta.url), "utf8");
  assert.match(canvas, /onPointerEnter=\{\(\) => onHoverBlock\(block.id\)\}/);
  assert.match(canvas, /onPointerLeave=\{\(\) => onHoverBlock\(null\)\}/);
  assert.match(canvas, /data-studio-hovered=\{hoveredBlockId === block.id\}/);
  assert.match(canvas, /data-studio-hovered=\{hoveredBlockId === child.id\}/);
  assert.match(presentation, /"data-studio-hovered": context.hoveredBlockId === block.id/);
  assert.match(presentation, /hoveredBlockId=\{context.hoveredBlockId\}/);
});


test("closing List View clears cross-highlighting on toggle, Preview, Code and unmount", () => {
  const canvas = readFileSync(new URL("../app/studio/studio-canvas.tsx", import.meta.url), "utf8");
  assert.match(canvas, /setHoveredBlockId\(null\); onSetShowInserter\(false\); setListViewOpen\(\(current\) => !current\)/);
  assert.match(canvas, /setHoveredBlockId\(null\); setListViewOpen\(false\); onSetShowInserter\(false\); onPreviewChange\(true\)/);
  assert.match(canvas, /function openCodeEditor[\s\S]*?setHoveredBlockId\(null\);\s*setListViewOpen\(false\)/);
  assert.match(canvas, /function closeListView\(\) \{\s*setHoveredBlockId\(null\)/);
  assert.match(canvas, /useLayoutEffect\(\(\) => \(\) => onHoverBlock\(null\), \[onHoverBlock\]\)/);
});


test("between-block and drag insertion cues stay centred in the reserved gap", () => {
  const css = readFileSync(new URL("../app/studio/studio.css", import.meta.url), "utf8");
  const canvas = readFileSync(new URL("../app/studio/studio-canvas.tsx", import.meta.url), "utf8");
  assert.match(css, /\.block-position \{ display: flow-root; position: relative; \}/);
  assert.match(css, /\.block-position \+ \.block-position \.canvas-block \{ margin-top: var\(--studio-block-gap\); \}/);
  assert.match(css, /\.block-position \+ \.block-position \.between-blocks \{ top: calc\(\(\(var\(--studio-block-gap\) - var\(--studio-block-grid-gap, 0px\)\) \/ 2\) - 15px\); \}/);
  assert.match(css, /\.block-position \+ \.block-position \.drop-indicator \{ top: calc\(\(\(var\(--studio-block-gap\) - var\(--studio-block-grid-gap, 0px\)\) \/ 2\) - 2px\); \}/);
  assert.match(css, /\.block-position:has\(\+ \.block-position \.canvas-block\.is-selected\) \+ \.block-position \.drop-indicator:not\(\.is-after\) \{ top: calc\(\(\(var\(--studio-block-gap\) - var\(--studio-block-grid-gap, 0px\)\) \/ 2\) - 21px\); \}/);
  assert.match(canvas, /function canvasInsertionIndex\(event: DragEvent<HTMLDivElement>\)/);
  assert.match(canvas, /onMoveBlockTo\(from, index > from \? index - 1 : index\)/);
  assert.match(canvas, /onDragOver=\{handleCanvasDragOver\} onDrop=\{handleCanvasDrop\}/);
  assert.match(css, /\.canvas-appender > \.drop-indicator\.is-at-end \{[^}]*top: 50%; transform: translateY\(-50%\);/);
  assert.match(css, /\.cover-inserter-position \{ height: 30px; position: relative; \}/);
  assert.match(css, /\.cover-inserter-position \.between-blocks \{ top: 0; \}/);
});


test("Mini Golf centres insertion cues in source spacing without adding a layout gap", () => {
  const css = readFileSync(new URL("../app/studio/site-draft.css", import.meta.url), "utf8");
  assert.match(css, /\.mini-golf-editor-surface \.block-position \{ display: block; \}/);
  assert.match(css, /\.mini-golf-editor-surface \.block-position > \.between-blocks \{ top: -23px; \}/);
  assert.match(css, /\.mini-golf-editor-surface \.block-position \+ \.block-position \.canvas-block \{ margin-top:0; \}/);
});


test("history shortcuts follow Mac and Windows/Linux conventions and prevent native history", () => {
  const event = (key, modifiers = {}) => ({ key, metaKey: false, ctrlKey: false, shiftKey: false, altKey: false, defaultPrevented: false, ...modifiers });
  for (const [platform, key, modifiers, expected] of [
    ["MacIntel", "z", { metaKey: true }, "undo"],
    ["MacIntel", "Z", { metaKey: true, shiftKey: true }, "redo"],
    ["Win32", "z", { ctrlKey: true }, "undo"],
    ["Win32", "y", { ctrlKey: true }, "redo"],
    ["Linux x86_64", "y", { ctrlKey: true }, "redo"],
    ["Linux x86_64", "z", { ctrlKey: true, shiftKey: true }, "redo"],
  ]) {
    let calls = "";
    let prevented = false;
    assert.equal(handleStudioHistoryShortcut({ ...event(key, modifiers), preventDefault() { prevented = true; } }, platform, () => { calls += "undo"; }, () => { calls += "redo"; }), true);
    assert.equal(calls, expected);
    assert.equal(prevented, true);
  }
  for (const [platform, key, modifiers] of [
    ["MacIntel", "z", { ctrlKey: true }], ["MacIntel", "y", { metaKey: true }],
    ["Win32", "z", { metaKey: true }], ["Win32", "y", { ctrlKey: true, shiftKey: true }],
    ["Win32", "s", { ctrlKey: true }], ["MacIntel", "Escape", {}],
    ["Win32", "z", { ctrlKey: true, altKey: true }], ["MacIntel", "z", { metaKey: true, defaultPrevented: true }],
  ]) assert.equal(studioHistoryShortcut(event(key, modifiers), platform), null);
});

test("both editors share history shortcuts without replacing save or Escape handling", () => {
  const studio = readFileSync(new URL("../app/studio/studio-prototype.tsx", import.meta.url), "utf8");
  const screen = readFileSync(new URL("../app/studio/use-studio-screen-navigation.ts", import.meta.url), "utf8");
  const miniGolf = readFileSync(new URL("../app/studio/mini-golf-site-editor.tsx", import.meta.url), "utf8");
  const hook = readFileSync(new URL("../app/studio/use-studio-history-shortcuts.ts", import.meta.url), "utf8");
  assert.match(studio, /useStudioHistoryShortcuts\(studioSection === "templates" \? templateSession\.undo : undoStudio, studioSection === "templates" \? templateSession\.redo : redoStudio, \(studioSection === "content" \|\| studioSection === "templates"\) && !previewWindow\)/);
  assert.match(studio, /function undoStudio\(\) \{\s*undo\(\);\s*setDocumentFieldSelection\(null\);\s*setSelectedBlockId\(null\)/);
  assert.match(studio, /function redoStudio\(\) \{\s*redo\(\);\s*setDocumentFieldSelection\(null\);\s*setSelectedBlockId\(null\)/);
  assert.match(miniGolf, /useStudioHistoryShortcuts\(undo, redo, view === "page"\)/);
  assert.doesNotMatch(studio, /event.key.toLowerCase\(\) === "z"/);
  assert.match(studio, /useStudioScreenNavigation\(\{ setStudioSection/);
  assert.match(screen, /event.key.toLowerCase\(\) === "s"/);
  assert.match(screen, /event.key === "Escape"/);
  assert.match(screen, /event.defaultPrevented \|\| event.isComposing \|\| document.querySelector\("dialog\[open\]"\)/);
  assert.match(hook, /removeEventListener\("keydown", handleKeyDown\)/);
});

test("template inspector keeps controls compact and checkbox sizing independent", () => {
  const templateStyles = readFileSync(new URL("../app/studio/templates.css", import.meta.url), "utf8");
  assert.match(templateStyles, /\.template-inspector \.inspector-scroll button:not\(\.inspector-accordion-heading\)/);
  assert.match(templateStyles, /\.template-inspector \.checkbox-setting input\[type="checkbox"\] \{[^}]*height: 18px;[^}]*width: 18px;/);
  assert.match(templateStyles, /\.template-inspector > \.inspector-scroll > \.inspector-accordion-section \{[^}]*border-bottom: 1px solid #dddbd4; padding: 12px 16px;/);
  assert.match(templateStyles, /\.template-inspector \.inspector-accordion-heading \{ min-height: 40px;/);
  assert.match(templateStyles, /\.template-inspector label \{ display: grid; gap: 5px; margin: 4px 0;/);
});

test("templates use the shared resizable panes and readable document status labels", () => {
  const workspace = readFileSync(new URL("../app/studio/template-workspace.tsx", import.meta.url), "utf8");
  const inspector = readFileSync(new URL("../app/studio/template-inspector.tsx", import.meta.url), "utf8");
  const prototype = readFileSync(new URL("../app/studio/studio-prototype.tsx", import.meta.url), "utf8");
  const styles = readFileSync(new URL("../app/studio/studio.css", import.meta.url), "utf8");
  assert.match(workspace, /<Pane trackClassName="studio-library-track" className="studio-library"/);
  assert.match(inspector, /<Pane trackClassName="studio-inspector-track" className="studio-inspector template-inspector"/);
  assert.match(prototype, /libraryPaneWidth=\{libraryPaneWidth\}[\s\S]*inspectorPaneWidth=\{inspectorPaneWidth\}/);
  assert.match(styles, /\.document-item \.document-status \{[^}]*min-width: 42px;/);
  assert.match(workspace, /<span className=\{`document-status is-\$\{document\.status\}`\}>\{document\.status\.charAt\(0\)\.toUpperCase\(\) \+ document\.status\.slice\(1\)\}<\/span>/);
});

test("content navigation presents Templates as a sibling authoring mode", () => {
  const studio = readFileSync(new URL("../app/studio/studio-prototype.tsx", import.meta.url), "utf8");
  const navigation = readFileSync(new URL("../app/studio/studio-navigation-pane.tsx", import.meta.url), "utf8");
  const screen = readFileSync(new URL("../app/studio/use-studio-screen-navigation.ts", import.meta.url), "utf8");
  const styles = readFileSync(new URL("../app/studio/studio.css", import.meta.url), "utf8");
  const templateStyles = readFileSync(new URL("../app/studio/templates.css", import.meta.url), "utf8");
  assert.match(studio, /<StudioNavigationPane[\s\S]*onSelectLibraryKind=\{selectLibraryKind\}/);
  assert.match(navigation, /<PaneTabs[^>]*label="Content type"[\s\S]*\{ id: "templates", label: "Templates" \}/);
  assert.match(navigation, /templateSession\.store\.sets\.reduce\(\(count, item\) => count \+ item\.templates\.length \+ item\.parts\.length, 0\)/);
  assert.match(studio, /const \[studioSection, setStudioSection\] = useState<"content" \| "templates" \| "files" \| "backup" \| "bin">\("content"\)/);
  assert.match(screen, /queueMicrotask\(\(\) => \{[\s\S]*navigation.section === "templates"[\s\S]*setStudioSection\("templates"\)/);
  assert.match(screen, /window\.addEventListener\("popstate", syncModeFromLocation, true\)/);
  assert.match(screen, /if \(currentPath !== nextPath\) \{[\s\S]*window\.history\.pushState/);
  assert.doesNotMatch(navigation, /<a className="library-tool-button" href="\/studio\/templates">/);
  assert.match(styles, /\.library-tabs \{[^}]*grid-template-columns: repeat\(3, minmax\(0, 1fr\)\)/);
  assert.match(styles, /\.library-tabs button/);
  const templateWorkspace = readFileSync(new URL("../app/studio/template-workspace.tsx", import.meta.url), "utf8");
  assert.match(templateWorkspace, /<div className="library-tabs" aria-label="Content type">[\s\S]*Templates<span>\{templateEntryCount}<\/span>/);
  assert.match(templateWorkspace, /<div className="library-create">\s*<button type="button" onClick=\{\(\) => importRef\.current\?\.click\(\)\}>Import<\/button>/);
  assert.match(templateWorkspace, /const templateEntries = templates\.store\.sets\.flatMap/);
  assert.match(templateWorkspace, /className=\{`document-item template-target-item/);
  assert.match(styles, /\.template-target-item\.is-active \.document-kind-mark \{ background: #e4e3dd; color: inherit; \}/);
  assert.match(templateWorkspace, /<TemplateEditor key=\{target\.id\}/);
  assert.match(templateWorkspace, /: standalone \? <section className="template-library"/);
  assert.match(templateWorkspace, /className="template-status template-inline-status"[^>]*role="alert"[^>]*>.*template-status-actions/s);
  assert.match(templateWorkspace, /Another Studio tab changed this template while you were editing/);
  assert.match(templateWorkspace, /import \{ studioConflictDetails \} from "\.\/studio-sync-description"/);
  assert.match(templateWorkspace, /studioConflictDetails\(templates\.syncConflict\)/);
  assert.match(studio, /import \{ studioConflictDetails \} from "\.\/studio-sync-description"/);
  assert.match(studio, /studioConflictDetails\(syncConflict\)/);
  assert.match(templateWorkspace, /<span role="status">\{templates\.saveLabel\}<\/span>/);
  assert.match(templateWorkspace, /!templates\.syncConflict && \(templates\.error/);
  const templateRenderer = readFileSync(new URL("../app/studio/template-renderer.tsx", import.meta.url), "utf8");
  assert.match(templateRenderer, /className="template-part-content">\{children\}<\/div>/);
  assert.match(templateStyles, /\.template-part \{ display: block; min-width: 0; \}/);
  assert.match(templateStyles, /\.template-edit-part \{[^}]*position: absolute; right: calc\(100% \+ 12px\); top: 0;/);
  assert.match(templateStyles, /\.template-workspace \.studio-library \{ padding: 0; overflow-y: auto; gap: 0; \}/);
  assert.match(templateStyles, /\.template-workspace \.studio-library fieldset \{ border: 0; padding: 12px; margin: 0; \}/);
  assert.match(templateStyles, /\.template-workspace \.studio-library \.template-document-list \{[^}]*padding: 10px;/);
  assert.match(templateStyles, /\.template-inspector \.inspector-scroll button:not\(\.inspector-accordion-heading\)/);
  assert.doesNotMatch(templateStyles, /\.template-inspector button \{/);
  assert.match(templateStyles, /\.template-status-actions button \{ background: #fff; border: 1px solid #c8c6be; border-radius: 7px;/);
});

test("ordinary Studio blocks use content-fitting dimensions", () => {
  const instructions = readFileSync(new URL("../AGENTS.md", import.meta.url), "utf8");
  const css = readFileSync(new URL("../app/studio/studio.css", import.meta.url), "utf8");
  assert.match(instructions, /Every block must be content-fitting by default/);
  assert.match(instructions, /narrow\s+layouts and 200% zoom/);
  assert.match(css, /\.studio-block-preview :is\(\.document-dynamic-field, \.metadata-block, \.metadata-block-editor/);
  assert.match(css, /\.studio-block-preview :is\(\.document-dynamic-field h1, \.document-dynamic-field p/);
});


test("history shortcuts leave independent text editing surfaces to native undo", () => {
  const target = (contexts, editable = true) => ({
    isContentEditable: false,
    matches: () => editable,
    closest(selector) { return selector.split(",").some(part => contexts.includes(part.trim())) ? this : null; },
  });
  for (const surface of [".site-settings", ".site-codex", ".studio-code-editor", ".html-editor-popover", ".link-editor-popover", ".block-inserter", ".mini-golf-runtime-table", ".mini-golf-editor-surface .setup", ".mini-golf-editor-surface .table-size-control"]) {
    let prevented = false;
    let changed = false;
    const handled = handleStudioHistoryShortcut({ key: "z", metaKey: true, target: target([surface, ".block-canvas"]), preventDefault() { prevented = true; } }, "MacIntel", () => { changed = true; }, () => { changed = true; });
    assert.equal(handled, false, surface);
    assert.equal(prevented, false, surface);
    assert.equal(changed, false, surface);
  }
  assert.equal(studioHistoryShortcut({ key: "y", ctrlKey: true, target: target([]) }, "Win32"), null);
  for (const surface of [".document-heading", ".table-field", ".rich-text-editor"]) {
    assert.equal(studioHistoryShortcut({ key: "z", metaKey: true, target: target([surface, ".block-canvas"]) }, "MacIntel"), "undo");
  }
  assert.equal(studioHistoryShortcut({ key: "z", metaKey: true, target: target(["[data-studio-table-authoring]", ".mini-golf-runtime-table", ".block-canvas"]) }, "MacIntel"), "undo");
  const hook = readFileSync(new URL("../app/studio/use-studio-history-shortcuts.ts", import.meta.url), "utf8");
  assert.match(hook, /if \(!enabled\) return;/);
  assert.match(hook, /\[undo, redo, enabled\]/);
});

test("design canvas resets zoom with the platform zero shortcut", () => {
  const editor = readFileSync(new URL("../app/studio/design-editor.tsx", import.meta.url), "utf8");
  assert.match(editor, /const ZOOM_OPTIONS = Array\.from\(\{ length: 491 \}, \(_, index\) => 10 \+ index\)/);
  assert.match(editor, /const ZOOM_SHORTCUT_STEPS = \[10, 25, 50, 75, 100, 125, 200, 300, 500\] as const/);
  assert.match(editor, /event\.target instanceof HTMLSelectElement/);
  assert.doesNotMatch(editor, /event\.target instanceof HTMLButtonElement/);
  assert.match(editor, /const zoomReset = event\.key === "0" \|\| event\.code === "Digit0" \|\| event\.code === "Numpad0"/);
  assert.match(editor, /const zoomIn = event\.key === "\+" \|\| event\.key === "=" \|\| event\.code === "Equal" \|\| event\.code === "NumpadAdd"/);
  assert.match(editor, /const zoomOut = event\.key === "-" \|\| event\.key === "_" \|\| event\.code === "Minus" \|\| event\.code === "NumpadSubtract"/);
  assert.match(editor, /const commandOrControl = event\.metaKey \|\| event\.ctrlKey/);
  assert.match(editor, /if \(commandOrControl && zoomReset\) \{ event\.preventDefault\(\); fitCanvasToView\(\); \}/);
  assert.match(editor, /else if \(commandOrControl && zoomIn\) \{ event\.preventDefault\(\); changeZoomByKeyboard\(1\); \}/);
  assert.match(editor, /else if \(commandOrControl && zoomOut\) \{ event\.preventDefault\(\); changeZoomByKeyboard\(-1\); \}/);
  assert.match(editor, /function changeZoomByKeyboard\(direction: 1 \| -1\) \{\s*setZoom\(\(value\) => Math\.max\(ZOOM_OPTIONS\[0\], Math\.min\(ZOOM_OPTIONS\.at\(-1\) \?\? 500, value \+ direction \* 10\)\)\);\s*\}/);
  assert.match(editor, /ZOOM_SHORTCUT_STEPS\.find\(\(option\) => option > value\)/);
  assert.match(editor, /ZOOM_SHORTCUT_STEPS\.findLast\(\(option\) => option < value\)/);
});

test("design canvas history shortcuts survive page and layer button focus", () => {
  const editor = readFileSync(new URL("../app/studio/design-editor.tsx", import.meta.url), "utf8");
  assert.match(editor, /else if \(commandOrControl && event\.key\.toLowerCase\(\) === "z"\) \{ event\.preventDefault\(\); if \(event\.shiftKey\) redo\(\); else undo\(\); \}/);
  assert.match(editor, /else if \(\(event\.ctrlKey && event\.key\.toLowerCase\(\) === "y"\)\) \{ event\.preventDefault\(\); redo\(\); \}/);
  assert.doesNotMatch(editor, /event\.target instanceof HTMLButtonElement/);
});

test("design undo and redo preserve a still-existing object selection", () => {
  const editor = readFileSync(new URL("../app/studio/design-editor.tsx", import.meta.url), "utf8");
  assert.match(editor, /function restoreSelection\(next: DesignProject\)/);
  assert.match(editor, /restoreSelection\(previous\)/);
  assert.match(editor, /restoreSelection\(next\)/);
});

test("design canvas keeps layers in the left pane and offers an all-pages view", async () => {
  const editor = readFileSync(new URL("../app/studio/design-editor.tsx", import.meta.url), "utf8");
  const css = readFileSync(new URL("../app/studio/design.css", import.meta.url), "utf8");
  assert.match(editor, /<Pane[^\n]*label="Design pages and layers" side="left"/);
  assert.match(editor, /const \[leftPaneTab, setLeftPaneTab\] = useState<"pages" \| "layers">\("pages"\)/);
  assert.match(editor, /type StudioRibbonTab = "file" \| "home" \| "insert" \| "arrange" \| "view" \| "export"/);
  assert.match(editor, /\{ id: "file", label: "File" \}/);
  assert.match(editor, /if \(tab === "file"\) \{\s*window\.location\.href = "\/studio\/designs\/library";/);
  assert.match(editor, /<StudioRibbonPanel tab="file">[\s\S]*All designs/);
  assert.match(editor, /<PaneTabs id=\{designNavigationTabsId\} label="Design navigation"[^\n]*tabs=\{\[\{ id: "pages", label: "Pages" \}, \{ id: "layers", label: "Layers" \}\]\} active=\{leftPaneTab\}/);
  assert.match(editor, /<PaneTabPanel className="design-page-list" id=\{designNavigationTabsId\} tab="pages" active=\{leftPaneTab\}/);
  assert.match(editor, /<PaneTabPanel className="design-pages-layers" id=\{designNavigationTabsId\} tab="layers" active=\{leftPaneTab\}>\s*<LayerList/);
  const { PaneTabs, PaneTabPanel } = await loadProductionModule(new URL("../app/studio/panes/pane-components.tsx", import.meta.url));
  const tabs = [{ id: "pages", label: "Pages" }, { id: "layers", label: "Layers" }];
  for (const active of ["pages", "layers"]) {
    const markup = renderToStaticMarkup(createElement(PaneTabs, { id: "design", label: "Design navigation", tabs, active, onChange() {} }));
    assert.match(markup, /role="tablist" aria-label="Design navigation"/);
    for (const tab of tabs) {
      assert.ok(markup.includes(`id="design-tab-${tab.id}" aria-controls="design-panel-${tab.id}" aria-selected="${active === tab.id}" tabindex="${active === tab.id ? 0 : -1}"`));
      const panel = renderToStaticMarkup(createElement(PaneTabPanel, { id: "design", tab: tab.id, active }, tab.label));
      assert.ok(panel.includes(`role="tabpanel" id="design-panel-${tab.id}" aria-labelledby="design-tab-${tab.id}"`));
      assert.equal(panel.includes('hidden=""'), active !== tab.id);
    }
  }
  assert.match(editor, /<LayerList page=\{activePage\} selectedIds=\{selectedIds\} writable=\{writable\} onSelect=\{\(id\) => selectObjects\(\[id\]\)\} onReorder=\{reorderLayer\}/);
  assert.match(editor, /function moveLayer\(objectId: string, direction: LayerMoveDirection\)/);
  assert.match(editor, /function reorderLayer\(sourceId: string, targetId: string, position: LayerDropPosition\)/);
  assert.match(editor, /const dropTolerance = 64/);
  assert.match(editor, /function reorderedPages\(pages: DesignPage\[\], sourceId: string, targetId: string, position: "before" \| "after"\)/);
  assert.match(editor, /const gapPositions = \[/);
  assert.match(editor, /if \(!reorderedPages\(pages, draggedPageId, targetPage\.id, position\)\) \{\s*clearDropGuide\(\);\s*return;/);
  assert.match(editor, /gapPositions\[gapIndex\] - panelBounds\.top \+ panel\.scrollTop - PAGE_DROP_GUIDE_HEIGHT \/ 2/);
  assert.match(editor, /Math\.max\(\s*0,\s*Math\.min\(\s*panel\.scrollHeight - PAGE_DROP_GUIDE_HEIGHT,/);
  assert.match(editor, /const pages = reorderedPages\(design\.pages, sourceId, targetId, dropPosition\);/);
  assert.match(editor, /event\.preventDefault\(\);\s*event\.stopPropagation\(\);\s*if \(!dropTarget\)/);
  assert.match(editor, /document\.addEventListener\("drop", handlePageDrop, true\)/);
  assert.match(editor, /const layers = \[\.\.\.page\.objects\]\.reverse\(\)/);
  assert.match(editor, /draggable=\{canMove\}/);
  assert.doesNotMatch(editor, /aria-label=\{`Move \$\{label\} up`\}/);
  assert.doesNotMatch(editor, /aria-label=\{`Move \$\{label\} down`\}/);
  assert.match(editor, /onReorder\(sourceId, object\.id, event\.clientY < bounds\.top \+ bounds\.height \/ 2 \? "before" : "after"\)/);
  assert.match(editor, /<StudioIcon name="drag-handle" size=\{16\}/);
  assert.match(editor, /className=\{`design-canvas-scroll\$\{allPagesVisible/);
  assert.match(css, /\.design-canvas-scroll \{ align-items: safe center; display: flex; justify-content: safe center; min-height: 0; overflow: auto; padding: 25px 25px 89px; \}/);
  assert.match(css, /@media \(max-width: 980px\) \{\s*\.design-workspace \{ grid-template-columns: var\(--design-pages-width\) minmax\(0, 1fr\) var\(--design-inspector-width\); \}/);
  assert.doesNotMatch(css, /@media \(max-width: 980px\) \{\s*\.design-workspace \{ --design-pages-width: 180px;/);
  assert.match(editor, /className=\{`design-all-page\$\{isActive/);
  assert.match(editor, /className="design-all-page-heading" style=\{\{ width: `\$\{page\.width \* zoom \/ 100\}px` \}\}/);
  assert.match(editor, /const title = page\.name === `Page \$\{index \+ 1\}` \? "" : page\.name/);
  assert.match(editor, /<strong>Page \{index \+ 1\}<\/strong><span aria-hidden="true">-<\/span>/);
  assert.match(editor, /className=\{title \? "has-title" : "is-placeholder"\} value=\{isActive \? \(pageName === `Page \$\{index \+ 1\}` \? "" : pageName\) : title\}/);
  assert.match(editor, /placeholder="Add page title"/);
  assert.match(editor, /aria-label=\{title \? `Edit page title: \$\{title\}` : "Add page title"\}/);
  assert.match(editor, /className="design-all-page-actions"/);
  assert.match(editor, /className="design-canvas-heading-actions" aria-label=\{`Page \$\{activePageIndex \+ 1\} actions`\}/);
  assert.match(editor, /onClick=\{\(\) => togglePageHidden\(activePage\.id\)\}/);
  assert.match(editor, /onClick=\{\(\) => togglePageLocked\(activePage\.id\)\}/);
  assert.match(editor, /onClick=\{\(\) => addPage\(false, activePage\.id\)\}/);
  assert.match(editor, /aria-label=\{`Move page \$\{index \+ 1\} earlier`\}/);
  assert.match(editor, /aria-label=\{page\.hidden \? `Show page \$\{index \+ 1\}` : `Hide page \$\{index \+ 1\}`\}/);
  assert.match(editor, /name=\{page\.hidden \? "visibility-off" : "visibility"\} size=\{24\}/);
  assert.match(editor, /aria-label=\{page\.locked \? `Unlock page \$\{index \+ 1\}` : `Lock page \$\{index \+ 1\}`\}/);
  assert.match(editor, /name=\{page\.locked \? "lock" : "lock-open"\} size=\{24\}/);
  assert.match(editor, /<StudioIcon name="copy" size=\{24\} \/>/);
  assert.match(editor, /<StudioIcon name="trash" size=\{24\} \/>/);
  assert.match(editor, /onClick=\{\(\) => addPage\(false, page\.id\)\}/);
  assert.match(editor, /function deletePage\(\) \{[\s\S]*const requestedIds = selectedPageIds\.length \? selectedPageIds : \[activePage\.id\];[\s\S]*const idsToDelete = new Set\(requestedIds\.filter/);
  assert.match(editor, /if \(idsToDelete\.size === design\.pages\.length\) idsToDelete\.delete\(activePage\.id\);/);
  assert.match(editor, /updateDesign\(\{ \.\.\.design, pages: remainingPages, activePageId: nextPage\.id \}\);/);
  assert.match(editor, /setSelectedPageIds\(\[\]\);/);
  assert.match(editor, /function selectPageSet\(pageId: string/);
  assert.match(editor, /event\.metaKey \|\| event\.ctrlKey \|\| event\.shiftKey/);
  assert.match(editor, /pageIds\.slice\(Math\.min\(start, end\), Math\.max\(start, end\) \+ 1\)/);
  assert.match(editor, /else if \(event\.checked\) \{\n\s+next = selectedPageIds\.includes\(pageId\) \? selectedPageIds : \[\.\.\.selectedPageIds, pageId\];\n\s+\} else if \(!event\.checked\)/);
  assert.match(editor, /<div className="design-page-item-actions">[\s\S]*<label className="design-page-select">[\s\S]*<button type="button" className="design-thumbnail-button"/);
  assert.match(editor, /const handlePageSelectionChange = \(event: Event\)/);
  assert.match(editor, /panel\.addEventListener\("change", handlePageSelectionChange, true\)/);
  assert.match(editor, /handlePageTitleDoubleClick/);
  assert.match(editor, /\.design-thumbnail-button > span/);
  assert.match(editor, /input\.className = "design-page-title-input"/);
  assert.match(editor, /keyEvent\.key === "Escape"/);
  assert.match(editor, /updateDesign\(\{ \.\.\.design, pages: design\.pages\.map/);
  assert.match(editor, /className="design-canvas-frame" style=\{\{ width: `\$\{activePage\.width \* zoom \/ 100\}px` \}\}/);
  assert.doesNotMatch(editor, />Edit Page<\/button>/);
  assert.match(editor, /event\.stopPropagation\(\); selectPage\(page\.id\)/);
  assert.match(editor, /aria-label=\{allPagesVisible \? "View single page" : "View all pages"\}/);
  assert.match(editor, /\{allPagesVisible \? "View single page" : "View all pages"\}/);
  assert.match(css, /\.design-page-list \{ align-content: start;/);
  assert.match(css, /\.design-page-list, \.design-pages-layers \{ scrollbar-width: none; \}/);
  assert.match(css, /\.design-page-list::-webkit-scrollbar, \.design-pages-layers::-webkit-scrollbar \{ display: none; height: 0; width: 0; \}/);
  assert.match(css, /\.design-page-item \{ background: transparent; border: 1px solid transparent; border-radius: 7px; display: grid; grid-template-columns: auto minmax\(0, 1fr\); padding: 5px; \}/);
  assert.match(css, /\.design-page-select \{ align-items: center; display: flex; grid-column: 1; grid-row: 1; min-height: 34px; \}/);
  assert.match(css, /\.design-page-item-actions \{ align-items: center; display: flex; gap: 3px; grid-column: 2; grid-row: 1; justify-content: flex-end; min-height: 34px; opacity: 1; pointer-events: auto;/);
  assert.match(css, /\.design-thumbnail-button \{ grid-column: 1 \/ -1; grid-row: 2; \}/);
  assert.match(css, /\.design-thumbnail-button > span \{ align-items: center; display: flex;/);
  assert.match(css, /\.design-page-title-input \{ background: transparent; border: 0; border-radius: 0;[^}]*height: 24px;[^}]*min-height: 0;/);
  assert.match(css, /\.design-page-title-input:focus-visible \{ box-shadow: 0 2px 0 var\(--accent\); \}/);
  assert.match(css, /\.design-page-item\.is-active \.design-page-item-actions \{ opacity: 1; pointer-events: auto; \}/);
  assert.match(css, /\.design-page-item\.is-active \{ background: #fff; border-color: #6b7075; \}/);
  assert.match(css, /\.design-page-item:has\(\.design-page-select input:checked\) \{ box-shadow: none; \}/);
  assert.match(css, /\.design-layer-row \{ align-items: center; display: flex; gap: 4px; position: relative; \}/);
  assert.doesNotMatch(css, /\.design-layer-order-actions/);
  assert.match(css, /\.design-all-page-heading \{ align-items: center; box-sizing: border-box; display: flex; gap: 12px; justify-content: space-between; margin-inline: auto; min-height: 40px; padding: 0 4px; \}/);
  assert.match(css, /\.design-all-page-title \{ align-items: center; display: flex; flex: 1 1 auto; gap: 6px; min-width: 0; \}/);
  assert.match(css, /\.design-all-page-title input \{ background: transparent; border: 0; border-radius: 0;/);
  assert.match(css, /\.design-canvas-heading input \{ background: transparent; border: 0; border-radius: 0;/);
  assert.match(css, /\.design-canvas-heading input:focus-visible \{ box-shadow: 0 2px 0 #6b707599; outline: none; \}/);
  assert.match(css, /\.design-canvas-heading \.design-zoom \{ display: none; \}/);
  assert.match(css, /\.design-canvas-heading-actions \{ align-items: center; display: flex; flex: 0 0 auto; gap: 3px; \}/);
  assert.match(css, /\.design-canvas-heading-actions button \{ align-items: center; background: transparent; border: 0; border-radius: 5px; color: var\(--muted\); cursor: pointer; display: inline-flex; justify-content: center; min-height: 38px; min-width: 38px; padding: 7px; \}/);
  assert.match(css, /\.design-all-page-title input:focus-visible \{ box-shadow: 0 2px 0 #6b707599; color: var\(--ink\); outline: none; \}/);
  assert.doesNotMatch(css, /\.design-all-page-title input:hover, \.design-all-page-title input:focus-visible \{ background: #fff;/);
  assert.match(css, /\.design-all-page-actions \{ align-items: center; display: flex; flex: 0 0 auto; gap: 3px; \}/);
  assert.match(css, /\.design-all-page-actions button \{ align-items: center; background: transparent; border: 0; border-radius: 5px; color: var\(--muted\); cursor: pointer; display: inline-flex; justify-content: center; min-height: 38px; min-width: 38px; padding: 7px; \}/);
  assert.match(css, /\.design-all-page\.is-hidden \.design-canvas-frame \{ opacity: \.48; \}/);
  assert.doesNotMatch(css, /design-canvas-help/);
  assert.match(css, /\.design-main \{ display: grid; grid-column: 2; grid-template-columns: minmax\(0, 1fr\); grid-template-rows: minmax\(0, 1fr\); min-height: 0; min-width: 0; \}/);
  assert.match(css, /\.design-canvas-area \{ display: grid; grid-template-rows: auto minmax\(0, 1fr\) auto; min-height: 0; min-width: 0; \}/);
  assert.doesNotMatch(editor, /design-selection-box/);
  assert.match(editor, /const resizeHandleRadius = 8 \* controlScale/);
  assert.equal((editor.match(/r=\{resizeHandleRadius\}/g) ?? []).length, 4);
  assert.doesNotMatch(css, /design-selection-box/);
  assert.match(css, /\.design-rotate-handle:hover \{ fill: #6b7075 !important; stroke: #6b7075; \}/);
  assert.match(css, /\.design-rotate-handle:hover \+ \.design-rotate-icon \{ color: #fff; \}/);
  assert.match(css, /\.design-resize-handle, \.design-endpoint-handle, \.design-arrow-bend-handle, \.design-rotate-handle \{ fill: #fff !important/);
  assert.match(css, /\.design-resize-handle \{ stroke: #aeb3bf/);
  assert.match(css, /\.design-endpoint-handle \{ stroke: #aeb3bf; stroke-width: 1\.5; cursor: crosshair; \}/);
  assert.match(css, /\.design-resize-handle:hover, \.design-endpoint-handle:hover \{ fill: #6b7075 !important; stroke: #6b7075; stroke-width: 2; \}/);
  assert.match(css, /\.design-arrow-bend-handle:hover, \.design-arrow-bend-handle:active \{ fill: #6b7075 !important; stroke: #6b7075; stroke-width: 2; \}/);
  assert.match(css, /\.design-resize-handle:active, \.design-endpoint-handle:active, \.design-rotate-handle:active \{ fill: #6b7075 !important; stroke: #6b7075; stroke-width: 2; \}/);
  assert.match(css, /\.design-resize-handle:focus, \.design-endpoint-handle:focus \{ outline: none; \}/);
  assert.match(css, /\.design-resize-handle:focus-visible, \.design-endpoint-handle:focus-visible \{ outline: none; stroke: #6b7075; stroke-width: 2; filter: none; \}/);
  assert.match(css, /\.design-arrow-bend-handle:focus-visible \{ outline: none; stroke: #6b7075; stroke-width: 2; \}/);
  assert.doesNotMatch(css, /\.design-endpoint-handle:focus-visible \{ outline: none; stroke: #284aa9/);
  assert.match(css, /\.design-pane-tabs \{ --pane-tab-label-inset: 8px;/);
  const paneCss = readFileSync(new URL("../app/studio/panes/pane-components.css", import.meta.url), "utf8");
  assert.match(paneCss, /\.pane-tabs \.pane-tab-label::after \{[^}]*height: 3px;[^}]*background: transparent;/);
  assert.match(paneCss, /\[aria-selected="true"\] \.pane-tab-label::after \{ background: #555;/);
  assert.match(paneCss, /button\[aria-selected="true"\]:not\(:disabled\):hover \.pane-tab-label::after \{ right: 6px; left: 6px;/);
  assert.match(paneCss, /button:not\(:disabled\):not\(\[aria-selected="true"\]\):is\(:hover, :focus-visible\) \.pane-tab-label::after \{ background: var\(--pane-tab-hover-indicator, #b8b6ae\);/);
});

test("the File tab provides a local design library", () => {
  const library = readFileSync(new URL("../app/studio/design-library.tsx", import.meta.url), "utf8");
  const route = readFileSync(new URL("../app/studio/designs/library/page.tsx", import.meta.url), "utf8");
  const css = readFileSync(new URL("../app/studio/design.css", import.meta.url), "utf8");
  assert.match(route, /<DesignLibrary \/>/);
  assert.match(library, /window\.setTimeout\(\(\) => \{[\s\S]*loadDesigns\(\)\.sort/);
  assert.match(library, /<PageSvg page=\{page\} assets=\{design\.assets\}/);
  assert.match(library, /onObjectPointerDown=\{\(\) => undefined\}/);
  assert.match(library, /aria-label="Saved Studio designs"/);
  assert.match(library, /\/studio\/designs\?designId=\$\{encodeURIComponent\(design\.id\)\}/);
  assert.match(css, /\.design-library-grid \{ display: grid;/);
});

test("layers use the full pane and keep scrolling on the outer panel", () => {
  const css = readFileSync(new URL("../app/studio/design.css", import.meta.url), "utf8");
  assert.match(css, /\.design-pages-body \{ overflow-y: auto;/);
  assert.match(css, /\.design-pages-layers \{[^}]*min-height: 0;[^}]*overflow: visible;/);
  assert.match(css, /\.design-pages-layers \.design-layer-list \{ margin-inline: -64px; max-height: none; overflow: visible; padding-inline: 64px; \}/);
  assert.match(css, /\.design-pages-layers \.design-layer-list \{ padding-right: 160px; \}/);
});

test("layer dragging shows a blue insertion line and clears it", () => {
  const editor = readFileSync(new URL("../app/studio/design-editor.tsx", import.meta.url), "utf8");
  const css = readFileSync(new URL("../app/studio/design.css", import.meta.url), "utf8");
  assert.match(editor, /const \[dropTarget, setDropTarget\] = useState<\{ id: string; position: LayerDropPosition \} \| null>\(null\)/);
  assert.match(editor, /const dropTolerance = 64/);
  assert.match(editor, /clientY >= bounds\.top - dropTolerance && clientY <= bounds\.bottom \+ dropTolerance/);
  assert.match(editor, /\.sort\(\(a, b\) => \{[\s\S]*Math\.abs\(clientY - \(aBounds\.top \+ aBounds\.height \/ 2\)\)/);
  assert.match(editor, /onDragOver=\{updateDropTarget\}/);
  assert.match(editor, /data-layer-droppable=\{canMove \? "true" : "false"\}/);
  assert.match(editor, /is-drop-\$\{dropPosition\}/);
  assert.match(editor, /onDragEnd=\{\(\) => \{ setDraggedId\(null\); setDropTarget\(null\); \}\}/);
  assert.match(editor, /onDragLeave=\{\(event\) => \{ const relatedTarget = event\.relatedTarget;/);
  assert.match(css, /\.design-layer-row \{ align-items: center; display: flex; gap: 4px; position: relative; \}/);
  assert.match(css, /\.design-layer-row\.is-drop-before::before, \.design-layer-row\.is-drop-after::after \{ background: var\(--accent\);[^}]*height: 3px;/);
  assert.match(css, /\.design-layer-row\.is-drop-before::before \{ top: -4px; \}/);
  assert.match(css, /\.design-layer-row\.is-drop-after::after \{ bottom: -4px; \}/);
  assert.match(css, /\.design-layer-select\.is-selected \{ border-color: #555; box-shadow: inset 3px 0 #555; \}/);
  assert.doesNotMatch(css, /\.design-layer-row\.is-dragging/);
  assert.match(editor, /opacity=\{object\.opacity\}/);
  assert.doesNotMatch(editor, /Math\.min\(object\.opacity, \.15\)/);
  assert.match(editor, /rotatingObjectId=\{interactionRef\.current\?\.mode === "rotate" \|\| interactionRef\.current\?\.mode === "move"/);
  assert.doesNotMatch(css, /\.design-layer-row\.is-drop-before \{ margin-top/);
  assert.doesNotMatch(css, /\.design-layer-row\.is-drop-after \{ margin-bottom/);
});

test("design tool selection uses a neutral active colour", () => {
  const css = readFileSync(new URL("../../acm-ribbon/src/styles.css", import.meta.url), "utf8");
  assert.match(css, /\.acm-ribbon-button:hover:not\(:disabled\), \.acm-ribbon-button:focus-visible, \.acm-ribbon-button\.is-active \{ background: var\(--acm-ribbon-hover\); border-color: var\(--acm-ribbon-border\); outline: none; \}/);
  assert.doesNotMatch(css, /#f9e1e1|#d89b9b|#9c2525/);
});

test("design surfaces use the current neutral theme", () => {
  const css = readFileSync(new URL("../app/studio/design.css", import.meta.url), "utf8");
  assert.match(css, /\.design-shell \{ --accent: #1e1e1e; --accent-soft: #e7e7e5; --ink: #3f3f3f; --line: #d8d8d8; --muted: #707070; background: #fafafa;/);
  assert.match(css, /\.design-ribbon-panel \{ --acm-ribbon-accent: #777; --acm-ribbon-border: #d8d8d8; --acm-ribbon-hover: #e7e7e7; --acm-ribbon-muted: #707070; --acm-ribbon-surface: #f7f7f7; --acm-ribbon-text: #3f3f3f; background: #f7f7f7; border: 1px solid #d8d8d8;/);
  assert.match(css, /\.design-pages\.pane \{ background: #f7f7f7; border-right: 0;/);
  assert.match(css, /\.design-inspector\.pane \{ background: #f7f7f7; border-left: 0;/);
  assert.match(css, /\.design-workspace \.pane-track \{ --pane-border: #d8d8d8;/);
  const paneCss = readFileSync(new URL("../app/studio/panes/pane-components.css", import.meta.url), "utf8");
  assert.match(paneCss, /\.pane-track\[data-side="left"\] \.pane \{ border-right: 1px solid var\(--pane-border\);/);
  assert.match(paneCss, /\.pane-track\[data-side="right"\] \.pane \{ border-left: 1px solid var\(--pane-border\);/);
});

test("design name uses a neutral grey focus outline", () => {
  const css = readFileSync(new URL("../app/studio/design.css", import.meta.url), "utf8");
  assert.match(css, /\.acm-ribbon-brand input:focus \{[^}]*border-color: #6b7075; outline: 2px solid #6b707566; outline-offset: 1px; \}/);
  assert.doesNotMatch(css, /\.acm-ribbon-brand input:focus \{[^}]*var\(--accent\)|\.acm-ribbon-brand input:focus \{[^}]*#cc181833/);
});

test("page action focus outlines use neutral grey", () => {
  const css = readFileSync(new URL("../app/studio/design.css", import.meta.url), "utf8");
  assert.match(css, /\.design-canvas-heading-actions button:hover[^}]*outline: 2px solid #6b707566; outline-offset: -1px;/);
  assert.match(css, /\.design-all-page-actions button:hover[^}]*outline: 2px solid #6b707566; outline-offset: -1px;/);
  assert.doesNotMatch(css, /\.design-(?:canvas-heading|all-page)-actions button:hover[^}]*#8b3dff66/);
});

test("page inspector stays beside the canvas at tablet widths", () => {
  const css = readFileSync(new URL("../app/studio/design.css", import.meta.url), "utf8");
  assert.match(css, /\.design-workspace \{ --design-inspector-width: 260px; --design-pages-width: 224px;/);
  assert.match(css, /@media \(max-width: 980px\) \{[\s\S]*\.design-workspace \{ grid-template-columns: var\(--design-pages-width\) minmax\(0, 1fr\) var\(--design-inspector-width\); \}/);
  assert.match(css, /\.design-inspector \{ border-left: 1px solid #d8d8d8; border-top: 0; grid-column: 3; max-height: none; \}/);
  assert.match(css, /\.design-zoom-dock \{ left: var\(--design-pages-width\); right: var\(--design-inspector-width\); \}/);
});

test("narrow workspaces preserve the three-column design", () => {
  const css = readFileSync(new URL("../app/studio/design.css", import.meta.url), "utf8");
  assert.match(css, /@media \(max-width: 720px\) \{[\s\S]*\.design-shell \{ min-height: 100dvh; min-width: 700px; \}/);
  assert.match(css, /\.design-workspace \{[^}]*grid-template-columns: var\(--design-pages-width\) minmax\(240px, 1fr\) var\(--design-inspector-width\);/);
  assert.match(css, /min-width: max\(700px, calc\(var\(--design-pages-width\) \+ var\(--design-inspector-width\) \+ 240px\)\)/);
  assert.doesNotMatch(css, /@media \(max-width: 720px\) \{[\s\S]*\.design-workspace \{ display: block; \}/);
});

test("design ribbon keeps tab targets mounted and supports keyboard navigation", () => {
  const [ribbon, editor] = [
    readFileSync(new URL("../../acm-ribbon/src/index.tsx", import.meta.url), "utf8"),
    readFileSync(new URL("../app/studio/design-editor.tsx", import.meta.url), "utf8"),
  ];
  const ribbonCss = readFileSync(new URL("../../acm-ribbon/src/styles.css", import.meta.url), "utf8");
  const designCss = readFileSync(new URL("../app/studio/design.css", import.meta.url), "utf8");
  assert.match(ribbon, /onKeyDown=\{\(event\) => handleTabKeyDown\(event, index\)\}/);
  assert.match(ribbon, /event\.key !== "ArrowRight" && event\.key !== "ArrowLeft" && event\.key !== "Home" && event\.key !== "End"/);
  assert.match(ribbon, /hidden=\{!effectiveActive\} aria-hidden=\{!effectiveActive\}/);
  assert.match(ribbon, /useId\(\)\.replace\(\/:\/g, ""\)/);
  assert.match(ribbonCss, /\.acm-ribbon-content \{ box-sizing: border-box; height: var\(--acm-ribbon-panel-height\); min-height: var\(--acm-ribbon-panel-height\); overflow: auto; \}/);
  assert.match(ribbonCss, /\.acm-ribbon-content > \.acm-ribbon-panel \{ align-items: stretch; box-sizing: border-box; display: flex; gap: 2px; height: var\(--acm-ribbon-panel-height\); min-height: var\(--acm-ribbon-panel-height\);/);
  assert.match(editor, /<StudioRibbon\s+className="design-ribbon-panel"/);
  assert.match(designCss, /\.design-ribbon-panel \{ --acm-ribbon-accent: #777; --acm-ribbon-border: #d8d8d8; --acm-ribbon-hover: #e7e7e7; --acm-ribbon-muted: #707070; --acm-ribbon-surface: #f7f7f7; --acm-ribbon-text: #3f3f3f; background: #f7f7f7; border: 1px solid #d8d8d8; border-radius: 14px; margin: 16px; overflow: visible; \}/);
  assert.match(designCss, /\.design-ribbon-panel \.acm-ribbon-tabs > button, \.design-ribbon-panel \.acm-ribbon-group-label, \.design-ribbon-panel \.acm-ribbon-brand a, \.design-ribbon-panel \.acm-ribbon-brand input \{ font-weight: 400; \}/);
  assert.match(designCss, /\.design-ribbon-panel \.acm-ribbon-tabs \{ border-top: 0; border-bottom: 1px solid #d8d8d8; \}/);
  assert.match(ribbonCss, /\.acm-ribbon-tabs > button::after \{[^}]*height: 3px;[^}]*left: var\(--acm-ribbon-tab-inline-padding\)/);
  assert.match(ribbonCss, /\.acm-ribbon-tabs > button\.is-active::after \{ background: var\(--acm-ribbon-accent\);/);
  assert.match(ribbonCss, /button\.is-active:not\(:disabled\):hover::after \{ left: 6px; right: 6px;/);
  assert.match(designCss, /\.design-ribbon-panel \.acm-ribbon-content \{ border-top: 0; \}/);
  assert.match(editor, /className=\{`design-zoom-dock\$\{pagesCollapsed \? " is-pages-collapsed" : ""\}`\}/);
  assert.match(editor, /className="design-zoom-slider" aria-label="Canvas zoom control"/);
  assert.match(editor, /id="design-canvas-zoom" className="studio-range-control" type="range" min="10" max="500" step="1" value=\{zoom\}/);
  assert.match(designCss, /\.design-zoom-dock \{ align-items: center; background: #f7f7f7; border-top: 1px solid #d8d8d8; bottom: 0;[^}]*left: var\(--design-pages-width\);[^}]*position: absolute; right: var\(--design-inspector-width\);[^}]*z-index: 30;/);
  assert.match(designCss, /\.design-zoom-dock\.is-pages-collapsed \{ left: 0; \}/);
});

test("design canvas exposes a selection-aware context menu", () => {
  const editor = readFileSync(new URL("../app/studio/design-editor.tsx", import.meta.url), "utf8");
  const css = readFileSync(new URL("../app/studio/design.css", import.meta.url), "utf8");
  assert.match(editor, /data-object-id=\{object\.id\}/);
  assert.match(editor, /document\.addEventListener\("contextmenu", handleCanvasContextMenu\)/);
  assert.match(editor, /role="menu" tabIndex=\{-1\} aria-label="Canvas actions"/);
  assert.match(editor, /<span>Copy<\/span>/);
  assert.match(editor, /<span>Paste<\/span>/);
  assert.match(editor, /<span>Align to page<\/span>/);
  assert.match(editor, /<span>\{selectionLocked \? "Unlock" : "Lock"\}<\/span>/);
  assert.match(editor, /<span>Link<\/span>/);
  assert.match(editor, /event\.key === "Escape"/);
  assert.match(editor, /target\.closest\("\.design-context-menu"\)/);
  assert.match(css, /\.design-context-menu \{/);
  assert.match(css, /\.design-context-submenu \{/);
  assert.match(css, /\.design-context-menu button:hover:not\(:disabled\), \.design-context-menu button:focus-visible/);
});

test("design workspace exposes centred collapse controls for both side panes", () => {
  const editor = readFileSync(new URL("../app/studio/design-editor.tsx", import.meta.url), "utf8");
  const css = readFileSync(new URL("../app/studio/design.css", import.meta.url), "utf8");
  assert.match(editor, /const \[inspectorCollapsed, setInspectorCollapsed\] = useState\(false\)/);
  assert.match(editor, /<Pane[^>]*className="design-pages"[^>]*side="left"[^>]*collapsed=\{pagesCollapsed\} onCollapsedChange=\{setPagesCollapsed\}/);
  assert.match(editor, /<Pane[^>]*className="design-inspector"[^>]*side="right"[^>]*collapsed=\{inspectorCollapsed\} onCollapsedChange=\{setInspectorCollapsed\}/);
  assert.match(css, /\.design-main \{ display: grid; grid-column: 2;/);
  assert.match(css, /\.design-workspace\.inspector-collapsed \.design-zoom-dock \{ right: 0; \}/);
  const panes = readFileSync(new URL("../app/studio/panes/pane-components.tsx", import.meta.url), "utf8");
  assert.match(panes, /const action = `\$\{collapsed \? "Show" : "Hide"\} \$\{label\}`/);
  assert.match(panes, /aria-label=\{action\}/);
  assert.match(panes, /hidden=\{collapsed\}/);
});

test("design editor exposes the ACM Studio local identity bar", () => {
  const [editor, css] = [
    readFileSync(new URL("../app/studio/design-editor.tsx", import.meta.url), "utf8"),
    readFileSync(new URL("../app/studio/design.css", import.meta.url), "utf8"),
  ];
  assert.match(editor, /<header className="design-topbar">/);
  assert.match(editor, /<span className="design-topbar-mark" aria-hidden="true">A<\/span>/);
  assert.match(editor, /<a href="\/studio" aria-label="ACM Studio home">ACM Studio<\/a>/);
  assert.match(editor, /<strong>Designs<\/strong>/);
  assert.match(editor, /<span className="design-environment" aria-label="Environment: local">LOCAL<\/span>/);
  assert.doesNotMatch(editor, /Return to Account|Sign Out/);
  assert.match(css, /\.design-shell \{[^}]*grid-template-rows: auto auto auto auto minmax\(0, 1fr\);/);
  assert.match(css, /\.design-topbar \{ align-items: center; background: #fff; border-bottom: 1px solid #d8d8d8; display: flex; grid-column: 1; grid-row: 1; height: 76px; justify-content: space-between; padding: 0 clamp\(22px, 5vw, 76px\); \}/);
  assert.match(css, /\.design-topbar-mark \{[^}]*height: 34px;[^}]*width: 34px; \}/);
  assert.match(css, /\.design-environment \{ background: #f1f1f1; border: 1px solid #d0d0d0; border-radius: 999px; color: #666; font-size: \.875rem; font-weight: 800; letter-spacing: \.06em; padding: 5px 10px; text-transform: uppercase; \}/);
});

test("design canvas offers an optional purple selection border", () => {
  const [editor, css] = [
    readFileSync(new URL("../app/studio/design-editor.tsx", import.meta.url), "utf8"),
    readFileSync(new URL("../app/studio/design.css", import.meta.url), "utf8"),
  ];
  assert.match(editor, /const \[purpleSelectionBorder, setPurpleSelectionBorder\] = useState\(false\)/);
  assert.match(editor, /aria-label="Purple selection border"/);
  assert.match(editor, /active=\{purpleSelectionBorder\}/);
  assert.match(editor, /aria-label="Purple selection border"/);
  assert.match(editor, /<StudioIcon name="block" size=\{24\} \/><span>Purple border<\/span>/);
  assert.match(editor, /purpleSelectionBorder && \(selectedIds\.includes\(object\.id\) \|\| \(showHoverHandles && hoveredObjectId === object\.id && !object\.locked\)\)/);
  assert.match(editor, /className="design-selection-border"/);
  assert.match(css, /\.design-selection-border \{ fill: none; stroke: #8b3dff; stroke-width: 2; pointer-events: none; vector-effect: non-scaling-stroke; \}/);
  assert.match(css, /\.design-ribbon-shape-picker \{ align-items: center;/);
});

test("design image resizing keeps proportions by default and uses Shift for freeform sizing", () => {
  const editor = readFileSync(new URL("../app/studio/design-editor.tsx", import.meta.url), "utf8");
  assert.match(editor, /function shouldKeepResizeRatio\(object: DesignObject, shiftKey: boolean\)/);
  assert.match(editor, /keepRatio: shouldKeepResizeRatio\(object, event\.shiftKey\)/);
  assert.match(editor, /resizeObject\(item, handle, dx, dy, page, shouldKeepResizeRatio\(item, event\.shiftKey\), false\)/);
});

test("design page resizing keeps proportions by default and uses Shift for freeform sizing", () => {
  const editor = readFileSync(new URL("../app/studio/design-editor.tsx", import.meta.url), "utf8");
  assert.match(editor, /resizePage\(page, handle, dx, dy, !event\.shiftKey\)/);
  assert.match(editor, /keepRatio: !event\.shiftKey/);
});

test("design page presets include a 1080 by 1920 portrait format", () => {
  const editor = readFileSync(new URL("../app/studio/design-editor.tsx", import.meta.url), "utf8");
  assert.match(editor, /portraitStory: \[1080, 1920\]/);
  assert.match(editor, /<option value="portraitStory">1080 × 1920 portrait<\/option>/);
});

test("design saves compact unused image assets and explain storage quota failures", () => {
  const store = readFileSync(new URL("../app/studio/design-store.ts", import.meta.url), "utf8");
  const editor = readFileSync(new URL("../app/studio/design-editor.tsx", import.meta.url), "utf8");
  // Behavioural compaction/provenance coverage lives in background-removal.test.mjs.
  assert.match(store, /designs\.map\(compactDesignAssets\)/);
  assert.match(editor, /function designSaveErrorMessage\(error: unknown, fallback = "The design could not be saved\."\)/);
  assert.match(editor, /designSaveErrorMessage\(saveError\)/);
  assert.match(editor, /designSaveErrorMessage\(importError, "The design file could not be imported\."\)/);
  assert.match(editor, /setStatus\(isDesignStorageQuotaError\(importError\) \? "Save failed — export an editable backup" : "Import failed"\)/);
  assert.match(editor, /catch \(saveError\) \{[\s\S]{0,240}designSaveErrorMessage\(saveError\)/);
});

test("design save status settles on a local storage label", () => {
  const editor = readFileSync(new URL("../app/studio/design-editor.tsx", import.meta.url), "utf8");
  assert.match(editor, /if \(primaryWritable\) setStatus\("Saving…"\);/);
  assert.match(editor, /SAVE_STATUS_MINIMUM_MS - \(Date\.now\(\) - saveStartedAt\)/);
  assert.match(editor, /saveSequence === saveStatusSequenceRef\.current/);
  assert.match(editor, /setStatus\("Saved locally"\); setError\(""\);/);
  assert.doesNotMatch(editor, /setStatus\("Changes saved"\)/);
});

test("background removal keeps the inspector guidance compact", () => {
  const editor = readFileSync(new URL("../app/studio/design-editor.tsx", import.meta.url), "utf8");
  assert.match(editor, /<small>Adjust cleanup, then run again\.<\/small>/);
  assert.doesNotMatch(editor, /Higher cleanup reduces soft fringes/);
  assert.doesNotMatch(editor, /Downloads a 176 MB model/);
  assert.doesNotMatch(editor, /Your image stays in this browser/);
});

test("design objects expose corner and side-centre handles for direct resizing", () => {
  const editor = readFileSync(new URL("../app/studio/design-editor.tsx", import.meta.url), "utf8");
  assert.match(editor, /function resizePage\(page: DesignPage, handle: ResizeHandle, dx: number, dy: number, keepRatio: boolean\)/);
  assert.match(editor, /const pageResizeRef = useRef<PageResizeInteraction \| null>\(null\)/);
  assert.match(editor, /showPageResizeHandles={tool === "select" && selectedIds.length === 0}/);
  assert.match(editor, /\{ handle: "n", label: "Resize selected object from top middle" \}/);
  assert.match(editor, /\{ handle: "e", label: "Resize selected object from right middle" \}/);
  assert.match(editor, /\{ handle: "s", label: "Resize selected object from bottom middle" \}/);
  assert.match(editor, /\{ handle: "w", label: "Resize selected object from left middle" \}/);
  assert.match(editor, /\{ handle: "n", label: "Resize page from top middle" \}/);
  assert.match(editor, /\{ handle: "e", label: "Resize page from right middle" \}/);
  assert.match(editor, /\{ handle: "s", label: "Resize page from bottom middle" \}/);
  assert.match(editor, /\{ handle: "w", label: "Resize page from left middle" \}/);
  assert.match(editor, /const widthDelta = handle\.includes\("e"\) \? dx : handle\.includes\("w"\) \? -dx : 0/);
  assert.match(editor, /const heightDelta = handle\.includes\("s"\) \? dy : handle\.includes\("n"\) \? -dy : 0/);
  assert.match(editor, /cx=\{handle\.includes\("e"\) \? page\.width : handle\.includes\("w"\) \? 0 : page\.width \/ 2\}/);
  assert.match(editor, /cy=\{handle\.includes\("s"\) \? page\.height : handle\.includes\("n"\) \? 0 : page\.height \/ 2\}/);
  assert.match(editor, /aria-label={label} className={`design-resize-handle handle-\$\{handle\}`}/);
  assert.match(editor, /function onPageResizePointerDown\(event: PointerEvent<SVGCircleElement>, handle: ResizeHandle\)/);
  assert.match(editor, /function onPageResizeKeyDown\(event: ReactKeyboardEvent<SVGCircleElement>, handle: ResizeHandle\)/);
});

test("design snapping uses Canva-style solid page guides and dotted object guides", () => {
  const editor = readFileSync(new URL("../app/studio/design-editor.tsx", import.meta.url), "utf8");
  const css = readFileSync(new URL("../app/studio/design.css", import.meta.url), "utf8");
  assert.match(editor, /type Guide = \{ axis: "x" \| "y"; position: number; style: "solid" \| "dotted" \}/);
  assert.match(editor, /position: activePage\.width \/ 2, style: "solid"/);
  assert.match(editor, /position: item\.x \+ item\.width \/ 2, style: "dotted"/);
  assert.match(editor, /function snapArrowEndpoint\(object: DesignArrowObject, endpoint: "start" \| "end", point: \{ x: number; y: number \}\)/);
  assert.match(editor, /const endpointSnap = snapArrowEndpoint\(interaction\.original, interaction\.endpoint \?\? "end", point\)/);
  assert.match(editor, /setGuides\(endpointSnap\.guides\)/);
  assert.match(editor, /className=\{`design-guide design-guide-\$\{guide\.style\}`\}/);
  assert.ok(editor.indexOf('<g className="design-guides-overlay"') > editor.indexOf('{page.objects.map('), "guides render above page objects");
  assert.match(css, /\.design-guide \{ filter: drop-shadow\(0 0 1px rgba\(255, 255, 255, \.95\)\); opacity: \.95; pointer-events: none; shape-rendering: geometricPrecision; stroke: #555; stroke-width: 1\.5;/);
  assert.match(css, /\.design-guide-solid \{ stroke-dasharray: none; stroke-linecap: butt; \}/);
  assert.match(css, /\.design-guide-dotted \{ stroke-dasharray: 1 5; stroke-linecap: round; \}/);
});

test("design rotation handle uses one dedicated SVG glyph", () => {
  const editor = readFileSync(new URL("../app/studio/design-editor.tsx", import.meta.url), "utf8");
  const icons = readFileSync(new URL("../app/studio/studio-icons.tsx", import.meta.url), "utf8");
  assert.match(editor, /<StudioIcon name="rotate" size=\{28 \* controlScale\}/);
  assert.doesNotMatch(editor, /design-rotate-connector/);
  assert.doesNotMatch(editor, /<StudioIcon name="undo" size=\{13\}.*<StudioIcon name="redo" size=\{13\}/);
  assert.match(icons, /rotate: "arrange\.rotate"/);
  assert.doesNotMatch(icons, /case "rotate": return <svg/);
});

test("design rotation control hides during drag and keeps the rotation cursor", () => {
  const editor = readFileSync(new URL("../app/studio/design-editor.tsx", import.meta.url), "utf8");
  const css = readFileSync(new URL("../app/studio/design.css", import.meta.url), "utf8");
  const cursor = readFileSync(new URL("../app/studio/design-transform.ts", import.meta.url), "utf8");
  assert.match(editor, /const \[isRotating, setIsRotating\] = useState\(false\)/);
  assert.match(editor, /!isRotating && \(!objectActiveHandle \|\| objectActiveHandle\.kind === "rotate"\) \? <><circle role="button"/);
  assert.match(editor, /setIsRotating\(true\)/);
  assert.match(editor, /setIsRotating\(false\)/);
  assert.match(editor, /function rotationBadgePoint\(/);
  assert.match(editor, /if \(interaction\.mode === "rotate" \|\| interaction\.mode === "move"\) setRotationCursor\(point\)/);
  assert.doesNotMatch(editor, /setDraggingObjectId/);
  assert.match(editor, /rotationCursor=\{isActive \? rotationCursor : null\}/);
  assert.match(css, /\.design-rotate-handle \{[^}]*cursor: var\(--rotation-cursor\)/);
  assert.match(css, /\.design-rotate-handle:focus-visible \{ outline: none !important; stroke: #6b7075/);
  assert.match(css, /\.design-page-svg\.is-rotating, \.design-page-svg\.is-rotating \* \{ cursor: var\(--rotation-cursor\) !important; \}/);
  assert.match(editor, /rotationCursorCss\(object.rotation\)/);
  assert.match(editor, /rotationCursorCss\(activeRotation\)/);
  assert.match(cursor, /viewBox="0 0 32 32"/);
  assert.match(cursor, /C10\.5 10\.5 21\.5 10\.5 25\.5 18\.5/);
  assert.match(cursor, /stroke="#17191c"/);
  assert.match(editor, /rx=\{7 \* controlScale\}/);
  assert.match(editor, /cursor\.x \+ 44 \* controlScale/);
});

test("design resize cursors follow the selected object's rotation", () => {
  const editor = readFileSync(new URL("../app/studio/design-editor.tsx", import.meta.url), "utf8");
  assert.match(editor, /function resizeCursor\(handle: ResizeHandle, rotation: number\)/);
  assert.match(editor, /style=\{\{ cursor: resizeCursor\(handle, object\.rotation\) \}\}/);
  assert.match(editor, /const axis = \(\(handleAngles\[handle\] \+ rotation\) % 180 \+ 180\) % 180/);
});

test("design objects use a four-way cursor while moving", () => {
  const editor = readFileSync(new URL("../app/studio/design-editor.tsx", import.meta.url), "utf8");
  const css = readFileSync(new URL("../app/studio/design.css", import.meta.url), "utf8");
  assert.match(editor, /function onObjectPointerDown\(event: PointerEvent<SVGGElement>, object: DesignObject\) \{\s+event\.preventDefault\(\);/);
  assert.match(editor, /function onResizePointerDown\([\s\S]*?\) \{\s+event\.preventDefault\(\);\s+event\.stopPropagation\(\);\s+event\.currentTarget\.focus\(\);/);
  assert.match(editor, /function onPageResizePointerDown\([\s\S]*?\) \{\s+event\.preventDefault\(\);\s+event\.stopPropagation\(\);\s+event\.currentTarget\.focus\(\);/);
  assert.match(editor, /function onRotatePointerDown\([\s\S]*?\) \{\s+event\.preventDefault\(\);\s+event\.stopPropagation\(\);\s+event\.currentTarget\.focus\(\);/);
  assert.match(editor, /function onArrowEndpointPointerDown\([\s\S]*?\) \{\s+event\.preventDefault\(\);\s+event\.stopPropagation\(\);\s+event\.currentTarget\.focus\(\);/);
  assert.match(editor, /function onArrowBendPointerDown\([\s\S]*?\) \{\s+event\.preventDefault\(\);\s+event\.stopPropagation\(\);\s+event\.currentTarget\.focus\(\);/);
  assert.doesNotMatch(editor, /activeMovingObjectId/);
  assert.match(editor, /if \(interaction\.mode === "rotate" \|\| interaction\.mode === "move"\) setRotationCursor\(point\)/);
  assert.match(css, /\.design-page-svg\.is-select-mode \.design-object:active \{ cursor: move; \}/);
  assert.match(css, /\.design-page-svg\.is-select-mode \.design-object\.is-locked:active \{ cursor: default; \}/);
  assert.match(css, /\.design-page-svg \{ -webkit-user-select: none;[^}]*user-select: none;/);
  assert.match(css, /\.design-inline-text-editor \{ -webkit-user-select: text; user-select: text; \}/);
});

test("design canvas controls keep a constant screen size as zoom changes", () => {
  const editor = readFileSync(new URL("../app/studio/design-editor.tsx", import.meta.url), "utf8");
  assert.match(editor, /const controlScale = 100 \/ Math\.max\(1, zoom\)/);
  assert.match(editor, /r=\{resizeHandleRadius\}/);
  assert.match(editor, /r=\{18 \* controlScale\}/);
  assert.match(editor, /width=\{50 \* controlScale\}/);
  assert.match(editor, /height=\{30 \* controlScale\}/);
  assert.match(editor, /fontSize: `\$\{13 \* controlScale\}px`/);
  assert.match(editor, /zoom=\{zoom\} page=\{activePage\}/);
});

test("fit canvas uses both viewport dimensions and never chooses an overflowing zoom", () => {
  const editor = readFileSync(new URL("../app/studio/design-editor.tsx", import.meta.url), "utf8");
  assert.match(editor, /getComputedStyle\(scroll\)/);
  assert.match(editor, /const dockOverlap = dockRect \? Math\.max\(0, Math\.min\(scrollRect\.bottom, dockRect\.bottom\) - Math\.max\(scrollRect\.top, dockRect\.top\)\) : 0/);
  assert.match(editor, /Math\.min\(availableWidth \/ activePage\.width, availableHeight \/ activePage\.height\) \* 100/);
  assert.doesNotMatch(editor, /Math\.min\(100,/);
  assert.match(editor, /Math\.floor\(fitPercent\)/);
});

test("zoom keeps the active page centred in the canvas viewport", () => {
  const editor = readFileSync(new URL("../app/studio/design-editor.tsx", import.meta.url), "utf8");
  assert.match(editor, /function centredScrollOffset\(contentCentre: number, viewportSize: number, scrollSize: number, clientSize: number\)/);
  assert.match(editor, /useLayoutEffect\(\(\) => \{[\s\S]*?design-all-page\.is-active \.design-canvas-frame[\s\S]*?contentCentreX[\s\S]*?contentCentreY[\s\S]*?centredScrollOffset\(contentCentreX[\s\S]*?centredScrollOffset\(contentCentreY/);
  assert.match(editor, /\}, \[activePage\?\.id, allPagesVisible, zoom\]\);/);
});

test("selected arrows expose endpoint controls instead of corner and rotate controls", () => {
  const editor = readFileSync(new URL("../app/studio/design-editor.tsx", import.meta.url), "utf8");
  assert.match(editor, /\(selectedIds\.includes\(object\.id\) \|\| \(showHoverHandles && hoveredObjectId === object\.id && !object\.locked\)\) && object\.type !== "arrow"/);
  assert.match(editor, /const \[hoveredObjectId, setHoveredObjectId\] = useState<string \| null>\(null\)/);
  assert.match(editor, /onPointerEnter=\{\(\) => showHoverHandles && !object\.locked && setHoveredObjectId\(object\.id\)\}/);
  assert.match(editor, /\(selectedIds\.includes\(object\.id\) \|\| \(showHoverHandles && hoveredObjectId === object\.id && !object\.locked\)\) && object\.type === "arrow" && showObjectHandles \? \(\(\) => \{ const \{ start, end, bends \} = arrowPoints\(object\)/);
  assert.match(editor, /const \[activeHandle, setActiveHandle\] = useState<ActiveHandle \| null>\(null\)/);
  assert.match(editor, /if \(objectActiveHandle && \(objectActiveHandle\.kind !== "resize" \|\| objectActiveHandle\.handle !== handle\)\) return null/);
  assert.match(editor, /setActiveHandle\(\{ objectId: object\.id, kind: "endpoint", endpoint \}\)/);
  assert.match(editor, /setActiveHandle\(null\);/);
  assert.match(editor, /useEffect\(\(\) => \{ queueMicrotask\(\(\) => setHoveredObjectId\(null\)\); \}, \[page\.id, showHoverHandles\]\)/);
  assert.match(editor, /showHoverHandles=\{tool === "select"\}/);
  assert.match(editor, /showHoverHandles=\{isActive && tool === "select"\}/);
  assert.match(editor, /aria-label="Resize arrow from start point"/);
  assert.match(editor, /aria-label="Resize arrow from end point"/);
  assert.match(editor, /function arrowLocalPagePoint\(object: DesignArrowObject, local: \{ x: number; y: number \}\)/);
  assert.match(editor, /function resizeArrowEndpoint\(/);
  assert.match(editor, /function mapArrowBendForEndpointMove\(bend: \{ x: number; y: number \}, oldStart: \{ x: number; y: number \}, oldEnd: \{ x: number; y: number \}, nextStart: \{ x: number; y: number \}, nextEnd: \{ x: number; y: number \}\)/);
  assert.match(editor, /const bends = oldBends\.map\(\(bend\) => mapArrowBendForEndpointMove\(bend, oldStart, oldEnd, start, end\)\)/);
  assert.match(editor, /nextObject = resizeArrowEndpoint\(interaction\.original, interaction\.endpoint \?\? "end", endpointSnap\.point, activePage\)/);
  assert.match(editor, /return resizeArrowEndpoint\(item, endpoint, \{ x: current\.x \+ dx, y: current\.y \+ dy \}, page\)/);
  assert.match(editor, /mapArrowBendForEndpointMove\(bend, oldStart, oldEnd, start, end\)/);
  assert.match(editor, /className="design-arrow-bend-handle"/);
  assert.match(editor, /const resizeHandleRadius = 8 \* controlScale/);
  assert.match(editor, /const arrowBendHandleSize = 12 \* controlScale/);
  assert.match(editor, /className="design-endpoint-handle"[^>]*r=\{resizeHandleRadius\}/g);
  assert.equal((editor.match(/className="design-endpoint-handle"[^>]*r=\{resizeHandleRadius\}/g) ?? []).length, 2);
  assert.match(editor, /x=\{bend\.x - arrowBendHandleSize \/ 2\} y=\{bend\.y - arrowBendHandleSize \/ 2\} width=\{arrowBendHandleSize\} height=\{arrowBendHandleSize\}/);
  assert.match(editor, /function onArrowBendPointerDown\(/);
  assert.match(editor, /function onArrowBendPointerDown\([\s\S]*?if \(!designEditable \|\| object\.locked \|\| !design\) return;\s+selectObjects\(\[object\.id\]\);/);
  assert.match(editor, /function onArrowBendKeyDown\(/);
  assert.match(editor, /onKeyDown=\{\(event\) => onArrowBendKeyDown\?\.\(event, object, index\)\}/);
  assert.match(editor, /event\.preventDefault\(\); event\.stopPropagation\(\)/);
  assert.match(editor, /\["Enter", " "\]\.includes\(event\.key\)/);
  assert.match(editor, /const control = bends\.length === 1 \? \{ x: 2 \* bends\[0\]\.x - midpoint\.x, y: 2 \* bends\[0\]\.y - midpoint\.y \} : null/);
  assert.match(editor, /function constrainArrowBend\(object: DesignArrowObject, page: DesignPage, bend: \{ x: number; y: number \}\)/);
  assert.match(editor, /page\.width \* 2 - object\.x/);
  assert.doesNotMatch(editor, /Arrows resize through their two endpoints instead of corner handles/);
});

test("arrowheads use shared base-trimmed geometry in live SVG and export SVG", () => {
  const editor = readFileSync(new URL("../app/studio/design-editor.tsx", import.meta.url), "utf8");
  assert.match(editor, /function arrowGeometry\(object: DesignArrowObject\)/);
  assert.match(editor, /const startDirection = normaliseArrowDirection\(/);
  assert.match(editor, /const endDirection = normaliseArrowDirection\(/);
  assert.match(editor, /const requestedHeadLength = Math\.max\(12, object\.strokeWidth \* 2\.5\) \* arrowheadScale\(object\)/);
  assert.match(editor, /const headLengthLimit = length \* \(startArrowhead && endArrowhead \? 0\.4 : 0\.48\)/);
  assert.match(editor, /const startBase = \{ x: start\.x \+ startDirection\.x \* startHeadLength, y: start\.y \+ startDirection\.y \* startHeadLength \}/);
  assert.match(editor, /const endBase = \{ x: end\.x - endDirection\.x \* endHeadLength, y: end\.y - endDirection\.y \* endHeadLength \}/);
  assert.match(editor, /const path = bends\.length === 1/);
  assert.match(editor, /geometry\.startArrowhead/);
  assert.match(editor, /geometry\.endArrowhead/);
  assert.match(editor, /strokeDasharray=\{dotted \?/);
  assert.match(editor, /stroke-dasharray="\$\{Math\.max\(1, object\.strokeWidth\)\}/);
  assert.match(editor, /selectedObject\.startArrowhead \? "yes" : "no"/);
  assert.match(editor, /End arrowhead/);
  assert.match(editor, /Arrowhead size/);
  assert.match(editor, /Line style/);
  assert.doesNotMatch(editor, /marker-end=/);
  assert.doesNotMatch(editor, /<marker id=/);
});

test("duplicate design tabs keep the global writer lock and route peer edits through sync", () => {
  const editor = readFileSync(new URL("../app/studio/design-editor.tsx", import.meta.url), "utf8");
  const sync = readFileSync(new URL("../app/studio/design-sync.ts", import.meta.url), "utf8");
  assert.match(editor, /createDesignSync\(/);
  assert.match(editor, /source === "welcome" \|\| source === "failover"/);
  assert.match(editor, /const primaryWritable = ownershipState === "writable"/);
  assert.match(editor, /const peerWritable = ownershipState === "waiting" && syncStatus === "synced"/);
  assert.match(editor, /syncRef\.current\.submit\(next\)/);
  assert.match(editor, /if \(!primaryWritable\) \{ setError\("Only the primary Studio tab can write to Studio media\."\)/);
  assert.match(sync, /BroadcastChannel/);
  assert.match(sync, /baseRevision/);
  assert.match(sync, /kind: "reject"/);
  assert.match(sync, /snapshot: message\.snapshot/);
});

test("design shapes dropdown includes common geometric shapes and text boxes edit inline", () => {
  const editor = readFileSync(new URL("../app/studio/design-editor.tsx", import.meta.url), "utf8");
  const model = readFileSync(new URL("../app/studio/design-model.ts", import.meta.url), "utf8");
  const css = readFileSync(new URL("../app/studio/design.css", import.meta.url), "utf8");
  assert.match(model, /export type DesignShapeKind = "rectangle" \| "roundedRectangle" \| "circle" \| "triangle" \| "triangleDown" \| "diamond" \| "pentagon" \| "hexagon" \| "octagon"/);
  assert.match(editor, /const shapeOptions: Array<\{ value: DesignShapeKind; label: string \}>/);
  assert.match(editor, /aria-label="Shapes"/);
  assert.match(editor, /function polygonPoints\(kind: DesignShapeKind/);
  assert.match(editor, /<polygon points=\{points\}/);
  assert.match(editor, /event\.detail > 1/);
  assert.match(editor, /isTextDoubleClick = object\.type === "text" && \(event\.detail > 1 \|\|/);
  assert.match(editor, /lastTextPointerRef\.current\?\.id === object\.id/);
  assert.match(editor, /else lastTextPointerRef\.current = null/);
  assert.match(editor, /function beginTextEditing\(object: DesignTextObject\)/);
  assert.match(editor, /className="design-inline-text-editor"/);
  assert.match(editor, /aria-label="Edit text"/);
  assert.match(editor, /const fontOptions = \[/);
  assert.match(editor, /\{ value: "Inter, Arial, sans-serif", label: "Inter" \}/);
  assert.match(editor, /<label>Font<select/);
  assert.match(editor, /className="design-text-wrap-setting"/);
  assert.match(editor, /function ColourControl\(\{ label, value, opacity = 1/);
  assert.match(editor, /const opacityLabel = label === "Text colour" \? "Text" : label === "Line colour" \? "Line" : label/);
  assert.match(editor, /\{opacityLabel\} opacity \(\{visibleOpacity\}%\)[^>]*min="0" max="100" step="1" value=\{visibleOpacity\}/);
  assert.match(editor, /Opacity \(\{Math\.round\(selectedObject\.opacity \* 100\)\}%\).*min="0" max="100" step="1"/);
  assert.match(editor, /Arrowhead size.*min=\{DESIGN_ARROWHEAD_SCALE_MIN \* 100\} max=\{DESIGN_ARROWHEAD_SCALE_MAX \* 100\} step="1"/);
  assert.match(editor, /aria-label=\{`\$\{opacityLabel\} opacity`\}/);
  assert.match(editor, /const fillOpacity = shape\.fillOpacity \?\? 1/);
  assert.match(editor, /const strokeOpacity = shape\.strokeOpacity \?\? 1/);
  assert.match(editor, /strokeOpacity=\{object\.strokeOpacity \?\? 1\}/);
  assert.match(editor, /fillOpacity=\{object\.fillOpacity \?\? 1\}/);
  assert.match(editor, /checked=\{selectedObject\.wordWrap !== false\}/);
  assert.match(editor, /wordWrap: event\.target\.checked/);
  assert.doesNotMatch(editor, /<label>Font family<select/);
  assert.match(editor, /onDoubleClick=\{\(event\) => \{ if \(object\.type === "text"\)/);
  assert.match(editor, /const cancelTextEditRef = useRef\(false\)/);
  assert.match(editor, /cancelTextEditRef\.current = true/);
  assert.match(editor, /onEditingTextCommit/);
  assert.match(css, /\.design-inline-text-editor \{/);
  assert.match(css, /\.design-text-wrap-setting input\[type="checkbox"\]/);
  assert.match(css, /\.design-colour-control \{ display: grid; gap: 8px; \}/);
  assert.match(editor, /className="studio-range-control" type="range"/);
  const shared = readFileSync(new URL("../app/studio/studio.css", import.meta.url), "utf8");
  assert.match(shared, /\.studio-range-control/);
  assert.match(css, /\.design-inspector input\[type="color"\]:focus-visible \{ border-color: var\(--accent\); outline: 2px solid var\(--focus-ring-colour\); outline-offset: var\(--focus-ring-offset\); \}/);
  assert.match(css, /\.design-colour-control input\[type="range"\] \{ width: 100%; \}/);
});

test("shared editor toolbar owns history controls and docks a dismissible List View", () => {
  const read = (name) => readFileSync(new URL(`../app/studio/${name}`, import.meta.url), "utf8");
  const canvas = read("studio-canvas.tsx");
  const toolbar = canvas.slice(canvas.indexOf('className="editor-history-actions"'), canvas.indexOf('className="editor-mode-control"'));
  assert.ok(toolbar.indexOf('aria-label="Add block"') < toolbar.indexOf('aria-label="Undo"'));
  assert.ok(toolbar.indexOf('aria-label="Undo"') < toolbar.indexOf('aria-label="Redo"'));
  assert.ok(toolbar.indexOf('aria-label="Redo"') < toolbar.indexOf('aria-label="List View"'));
  assert.match(toolbar, /disabled=\{!writable \|\| !canUndo\}/);
  assert.match(toolbar, /disabled=\{!writable \|\| !canRedo\}/);
  for (const name of ["studio-prototype.tsx", "mini-golf-site-editor.tsx"]) {
    const source = read(name);
    assert.doesNotMatch(source, /aria-label="(?:Undo|Redo)"/);
    assert.match(source, /canUndo=\{canUndo\}/);
    assert.match(source, /canRedo=\{canRedo\}/);
  }
  assert.match(read("use-studio-workspace.ts"), /canUndo: editable && !syncConflict && historyAvailability.undo/);
  assert.match(read("use-studio-workspace.ts"), /canRedo: editable && !syncConflict && historyAvailability.redo/);
  assert.match(read("use-studio-workspace.ts"), /source === "update" \|\| source === "welcome"/);
  assert.match(read("use-templates.ts"), /source === "update" \|\| source === "welcome"/);
  assert.match(canvas, /className="editor-work-area"/);
  assert.match(canvas, /className="studio-list-backdrop"[^>]*aria-label="Close List View"/);
  assert.match(canvas, /event.key !== "Escape" \|\| event.defaultPrevented/);
  assert.match(canvas, /requestAnimationFrame\(\(\) => listViewToggleRef.current\?\.focus\(\)\)/);
  const css = read("studio.css");
  assert.match(css, /\.editor-work-area \{[^}]*display: flex[^}]*min-height: 0/);
  assert.match(css, /\.studio-list-view \{[^}]*flex: 0 0 280px[^}]*position: static/);
  assert.match(css, /\.studio-list-view nav \{ flex: 1; min-height: 0; overflow: auto/);
  assert.match(css, /@container \(max-width: 680px\) \{\s*\.studio-list-view \{[^}]*position: absolute; top: 0/);
});

test("list items split their rich text on Return without a permanent Add item control", () => {
  const canvas = readFileSync(new URL("../app/studio/studio-canvas.tsx", import.meta.url), "utf8");
  const listField = canvas.slice(canvas.indexOf("function ListField"), canvas.indexOf("export function TableField"));
  assert.match(listField, /onSplitParagraph=\{\(beforeRuns, afterRuns\) =>/);
  assert.match(listField, /nextItems\.splice\(index \+ 1, 0, listItemAfterSplit\(item, plainTextFromRuns\(afterRuns\), afterRuns\)\)/);
  assert.match(listField, /replaceListItems\(block, list\.id, nextItems\)/);
  assert.match(listField, /focusItem\(list\.id, index \+ 1\)/);
  assert.doesNotMatch(listField, /Add item/);
  const css = readFileSync(new URL("../app/studio/studio.css", import.meta.url), "utf8");
  assert.doesNotMatch(css, /\.list-item-add\s*\{/);
});

test("Backspace removes an empty list item and keeps text editing intact", () => {
  const canvas = readFileSync(new URL("../app/studio/studio-canvas.tsx", import.meta.url), "utf8");
  const listField = canvas.slice(canvas.indexOf("function ListField"), canvas.indexOf("export function TableField"));
  assert.match(listField, /const backward = event\.key === "Backspace"/);
  assert.match(listField, /mergeListItemBoundary\(block, list\.id, index, backward \? "backward" : "forward", rootBlocks\)/);
  assert.match(listField, /scheduleBlockCommandFocus\(editor, \{ blockId: merged\.listId, listItemIndex: merged\.itemIndex/);
  assert.match(listField, /if \(!writable \|\| event\.defaultPrevented \|\| event\.nativeEvent\?\.isComposing\) return/);
  assert.doesNotMatch(listField, /list-item-remove/);
  const css = readFileSync(new URL("../app/studio/studio.css", import.meta.url), "utf8");
  assert.doesNotMatch(css, /\.list-field-row textarea:focus\s*\{/);
});

test("selected List Items expose accessible indent and outdent actions backed by the shared structure operations", () => {
  const canvas = readFileSync(new URL("../app/studio/studio-canvas.tsx", import.meta.url), "utf8");
  const controls = canvas.slice(canvas.indexOf("function ListItemIndentControls"), canvas.indexOf("function caretRangeAtPoint"));
  const profiles = readFileSync(new URL("../app/studio/blocks/capability-profiles.ts", import.meta.url), "utf8");
  const compatibility = readFileSync(new URL("../docs/block-inspector-compatibility.md", import.meta.url), "utf8");
  const icons = readFileSync(new URL("../app/studio/ui/icons-catalogue.tsx", import.meta.url), "utf8");
  const listField = canvas.slice(canvas.indexOf("function ListField"), canvas.indexOf("export function TableField"));
  assert.match(controls, /role="group" aria-label="List item indentation"/);
  assert.match(controls, /aria-label="Outdent list item"/);
  assert.match(controls, /aria-label="Indent list item"/);
  assert.match(controls, /outdentListItem\(block, list\.id, selection\.itemIndex, rootBlocks\)/);
  assert.match(controls, /indentListItem\(block, list\.id, selection\.itemIndex/);
  assert.match(controls, /onMouseDown=\{preserveTextSelection\}/);
  assert.match(controls, /item\?\.focus\(\)/);
  assert.match(listField, /activeItem\?\.listId === list\.id && activeItem\.itemIndex === index \? <ListItemIndentControls/);
  assert.doesNotMatch(profiles, /Block-level indent and outdent controls/);
  assert.match(compatibility, /List Item outdent carries the following items/);
  assert.match(icons, /"arrange\.indent": \[\{ label: "Indent selected List Item", href: "\/studio\/ui\/blocks\/list" \}\]/);
  assert.match(icons, /"arrange\.outdent": \[\{ label: "Outdent selected List Item", href: "\/studio\/ui\/blocks\/list" \}\]/);
});

test("template targets appear as separate library entries", () => {
  const workspace = readFileSync(new URL("../app/studio/template-workspace.tsx", import.meta.url), "utf8");
  const css = readFileSync(new URL("../app/studio/templates.css", import.meta.url), "utf8");
  assert.match(css, /\.template-workspace \.studio-library \.template-document-list \{[^}]*flex: 0 0 auto;[^}]*overflow: visible;/);
  assert.match(workspace, /const templateEntries = templates\.store\.sets\.flatMap/);
  assert.match(workspace, /templateEntries\.map\(\(\{ set: item, entry \}\)/);
  assert.doesNotMatch(workspace, /className="template-target-list"/);
});

test("content type tabs stay horizontal in the template sidebar, including narrow viewports", () => {
  const css = readFileSync(new URL("../app/studio/studio.css", import.meta.url), "utf8");
  const templates = readFileSync(new URL("../app/studio/templates.css", import.meta.url), "utf8");
  assert.match(css, /\.studio-library \.library-tabs \{[^}]*display: grid;[^}]*grid-template-columns: repeat\(3, minmax\(0, 1fr\)\);/);
  assert.match(templates, /\.template-workspace \.studio-library \{ display: flex; flex-direction: column; width: auto;[^}]*border-bottom: 1px solid/);
});

test("main editor tabs use the full library width and show document status labels", () => {
  const css = readFileSync(new URL("../app/studio/studio.css", import.meta.url), "utf8");
  const prototype = readFileSync(new URL("../app/studio/studio-navigation-pane.tsx", import.meta.url), "utf8");
  const coordinator = readFileSync(new URL("../app/studio/studio-prototype.tsx", import.meta.url), "utf8");
  assert.match(coordinator, /<StudioNavigationPane workspace=\{workspace\}/);
  assert.match(css, /\.studio-library \.library-tabs \.pane-tabs \{[^}]*grid-column: 1 \/ -1;/);
  assert.match(css, /\.document-item \{[^}]*grid-template-columns: 28px minmax\(0, 1fr\) auto;/);
  assert.match(css, /\.document-item \.document-status \{[^}]*border-radius: 999px;[^}]*width: fit-content;/);
  assert.match(prototype, /<span className=\{`document-status is-\$\{document\.status\}`\}>\{document\.status\.charAt\(0\)\.toUpperCase\(\) \+ document\.status\.slice\(1\)\}<\/span>/);
});

test("successful publication feedback dismisses itself", () => {
  const publishing = readFileSync(new URL("../app/studio/use-studio-publishing.ts", import.meta.url), "utf8");
  assert.match(publishing, /useEffect, useState/);
  assert.match(publishing, /publishFeedback\?\.startsWith\("Published locally"\).*Published post updated locally/);
  assert.match(publishing, /setTimeout\(\(\) => setPublishFeedback\(null\), 4000\)/);
  assert.match(publishing, /clearTimeout\(timeout\)/);
});

test("the main Add block control uses the black primary treatment", () => {
  const css = readFileSync(new URL("../app/studio/studio.css", import.meta.url), "utf8");
  assert.match(css, /\.editor-history-actions button\.editor-add-block \{ background: var\(--ink\); border-color: var\(--ink\); color: white; \}/);
});

test("text alignment controls use neutral selected states", () => {
  const css = readFileSync(new URL("../app/studio/studio.css", import.meta.url), "utf8");
  assert.match(css, /\.alignment-menu button:hover, \.alignment-menu button\.is-active,[^{]*\{ background: #f0f0f0 !important; color: #1e1e1e !important; \}/);
  assert.match(css, /\.canvas-format-actions \.alignment-button\.is-active \{ background: #f0f0f0; color: #1e1e1e; \}/);
});

test("Command or Control-S publishes the active post like Update", () => {
  const prototype = readFileSync(new URL("../app/studio/use-studio-screen-navigation.ts", import.meta.url), "utf8");
  const coordinator = readFileSync(new URL("../app/studio/studio-prototype.tsx", import.meta.url), "utf8");
  assert.match(coordinator, /useStudioScreenNavigation\(\{ setStudioSection/);
  assert.match(prototype, /event\.key\.toLowerCase\(\) === "s" && studioSection === "content" && activeDocument\.kind === "post"/);
  assert.match(prototype, /event\.preventDefault\(\);\s*publishing\.publish\(\);/);
});


test("full document counts sit beside Code and collapse before crowding the toolbar", () => {
  const canvas = readFileSync(new URL("../app/studio/studio-canvas.tsx", import.meta.url), "utf8");
  const actions = canvas.slice(canvas.indexOf('className="editor-document-actions"'), canvas.indexOf('{publishFeedback ?'));
  assert.match(actions, /Code<\/button>[\s\S]*className="editor-document-counts"/);
  assert.match(actions, /<strong>\{displayedWordCount\} words · \{displayedCharacterCount\} characters · \{displayedBlockCount\} blocks<\/strong>/);
  const calculations = canvas.slice(canvas.indexOf("const hasAppenderDraft"), canvas.indexOf("\n\n  useLayoutEffect", canvas.indexOf("const hasAppenderDraft")));
  for (const [draft, words, characters, blocks] of [["", 4, 10, 2], ["  ", 4, 12, 2], ["New words", 6, 20, 3]]) {
    const scope = { appenderValue: draft, wordCount: 4, characterCount: 10, activeDocument: { blocks: [{}, {}] } };
    runInNewContext(ts.transpileModule(`${calculations}\nglobalThis.counts = [displayedWordCount, displayedCharacterCount, displayedBlockCount];`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, scope);
    assert.deepEqual(Array.from(scope.counts), [words, characters, blocks]);
  }
  const css = readFileSync(new URL("../app/studio/studio.css", import.meta.url), "utf8");
  assert.match(css, /@container \(max-width: 1000px\) \{\s*\.editor-document-counts \{ display: none; \}/);
});


test("block library shares the docked work area and excludes List View", () => {
  const canvas = readFileSync(new URL("../app/studio/studio-canvas.tsx", import.meta.url), "utf8");
  assert.match(canvas, /className="editor-work-area">\s*\{showInserter && !previewing && !codeEditor \? <BlockInserter/);
  assert.match(canvas, /!previewing && !showInserter && listViewOpen \? <StudioListView/);
  assert.match(canvas, /function openInserter[^}]*setListViewOpen\(false\);[^}]*onOpenInserter\(afterIndex, query, parentId \?\? undefined\)/);
  assert.match(canvas, /<Pane[^>]*className=\{`block-inserter[^>]*label="Block Library"/);
  assert.doesNotMatch(canvas, /className="block-inserter"[^>]*aria-modal/);
  assert.match(canvas, /openerRef.current\?\.isConnected/);
  const css = readFileSync(new URL("../app/studio/studio.css", import.meta.url), "utf8");
  assert.match(css, /\.inserter-backdrop \{[^}]*flex: 0 0 320px[^}]*position: relative/);
  assert.match(css, /\.inserter-results \{[^}]*min-height: 0; overflow: auto/);
  assert.match(css, /@container \(max-width: 680px\) \{\s*\.inserter-backdrop \{ inset: 0; position: absolute/);
});


test("editor shells retain the desktop workspace when the browser is narrow", () => {
  const prototype = readFileSync(new URL("../app/studio/studio-prototype.tsx", import.meta.url), "utf8");
  const templates = readFileSync(new URL("../app/studio/template-workspace.tsx", import.meta.url), "utf8");
  const styles = readFileSync(new URL("../app/studio/templates.css", import.meta.url), "utf8");
  assert.match(prototype, /className=\{`studio-shell studio-desktop-only/);
  assert.match(templates, /className="studio-shell studio-desktop-only template-shell"/);
  assert.match(styles, /\.studio-desktop-only \{ min-width: 1130px; \}/);
  assert.match(styles, /\.studio-desktop-only \.studio-workspace \{ display: grid; grid-template-columns: var\(--studio-library-width\) minmax\(540px, 1fr\) var\(--studio-inspector-width\);/);
  assert.match(styles, /\.studio-desktop-only \.studio-library, \.studio-desktop-only \.studio-inspector \{ display: flex;/);
});


test("template editing shows an empty Content slot instead of sample document body", () => {
  const editor = readFileSync(new URL("../app/studio/template-editor.tsx", import.meta.url), "utf8");
  const styles = readFileSync(new URL("../app/studio/templates.css", import.meta.url), "utf8");
  assert.match(editor, /const contentSlot = <TemplateContentSlot/);
  const slot = readFileSync(new URL("../app/studio/template-content-slot.tsx", import.meta.url), "utf8");
  assert.match(slot, /className="template-content-slot"[^>]*aria-label="Content slot"/);
  assert.match(slot, /Supplied by each document/);
  assert.match(styles, /\.template-content-slot \{[^}]*min-height: 132px;[^}]*text-align: center;/);
});

test("template Content is available only through its explicit template capability", async () => {
  const [editor, model, inspector] = [
    readFileSync(new URL("../app/studio/template-editor.tsx", import.meta.url), "utf8"),
    readFileSync(new URL("../app/studio/template-model.ts", import.meta.url), "utf8"),
    readFileSync(new URL("../app/studio/template-inspector.tsx", import.meta.url), "utf8"),
  ];
  const { templateContentAvailable } = await loadProductionModule(new URL("../app/studio/template-content-insertion.ts", import.meta.url));
  const item = { type: "template-content", label: "Content", description: "Template Content" };
  assert.equal(blockInserterOptions([item], undefined, "").length, 0);
  assert.equal(blockInserterOptions([item], undefined, "", [], { allowTemplateContent: true }).length, 1);
  assert.equal(templateContentAvailable({ kind: "page", nodes: [] }), true);
  assert.equal(templateContentAvailable({ kind: "header", nodes: [] }), false);
  assert.equal(templateContentAvailable({ kind: "post", nodes: [{ id: "slot", type: "element", element: "content" }] }), false);
  assert.match(editor, /onInsertTemplateContent: allowTemplateContent/);
  assert.match(model, /countContent\(template\.nodes, new Set\(\)\) > 1/);
  assert.match(inspector, /Content is optional while exploring; add at most one Content element/);
});


test("template body appender does not add a blue focus border", () => {
  const styles = readFileSync(new URL("../app/studio/templates.css", import.meta.url), "utf8");
  assert.match(styles, /\.template-workspace \.canvas-appender input:focus-visible \{ box-shadow: none; \}/);
  assert.doesNotMatch(styles, /\.template-workspace \.canvas-appender input:focus-visible[^}]*outline: 0/);
  const policy = readFileSync(new URL("../app/studio/focus-outline.css", import.meta.url), "utf8");
  assert.match(policy, /html\[data-studio-focus-visible="false"\] body :focus \{ outline: none !important;/);
  assert.match(policy, /forced-colors: active/);
});


test("block library icons inherit the interface ink colour", () => {
  const styles = readFileSync(new URL("../app/studio/studio.css", import.meta.url), "utf8");
  assert.match(styles, /\.inserter-group button > span \{ color: var\(--ink\); display: flex; \}/);
});


test("between-block inserters use a grey line and black add control", () => {
  const styles = readFileSync(new URL("../app/studio/studio.css", import.meta.url), "utf8");
  assert.match(styles, /\.between-blocks::before \{ background: #8f8f8f;/);
  assert.match(styles, /\.between-blocks > span \{[^}]*background: #1c1c1e;[^}]*color: white;/);
});


test("Preview and Code transitions dismiss the block library", () => {
  const canvas = readFileSync(new URL("../app/studio/studio-canvas.tsx", import.meta.url), "utf8");
  assert.match(canvas, /onSetShowInserter\(false\); onPreviewChange\(true\)/);
  assert.match(canvas, /function openCodeEditor\(\) \{[\s\S]*?onSetShowInserter\(false\)/);
  assert.match(canvas, /showInserter && !previewing && !codeEditor \? <BlockInserter/);
});


test("the block library slides in on each mount and respects reduced motion", () => {
  const css = readFileSync(new URL("../app/studio/studio.css", import.meta.url), "utf8");
  assert.match(css, /\.block-inserter\.pane \{ animation: studio-inserter-enter 180ms ease-out/);
  assert.match(css, /@keyframes studio-inserter-enter \{\s*from \{ opacity: 0; transform: translateX\(-100%\); \}\s*to \{ opacity: 1; transform: translateX\(0\); \}/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\) \{\s*\.block-inserter\.pane, \.block-inserter\.is-closing \{ animation: none; \}/);
  const canvas = readFileSync(new URL("../app/studio/studio-canvas.tsx", import.meta.url), "utf8");
  assert.match(canvas, /onClick=\{\(\) => showInserter && !inserterClosing \? dismissInserter\(\) : openInserter\(null\)\}/);
  assert.match(canvas, /showInserter && !previewing && !codeEditor \? <BlockInserter/);
});


test("Add block toggles the library so reopening remounts its slide-in", () => {
  const canvas = readFileSync(new URL("../app/studio/studio-canvas.tsx", import.meta.url), "utf8");
  const button = canvas.slice(canvas.indexOf('className="editor-add-block"'), canvas.indexOf('name="add" size={20}'));
  assert.match(button, /onClick=\{\(\) => showInserter && !inserterClosing \? dismissInserter\(\) : openInserter\(null\)\}/);
  assert.match(button, /aria-pressed=\{showInserter && !inserterClosing && !previewing && !codeEditor\}/);
  assert.match(canvas, /showInserter && !previewing && !codeEditor \? <BlockInserter/);
});


test("library dismissal waits for its own exit animation except with reduced motion", () => {
  const canvas = readFileSync(new URL("../app/studio/studio-canvas.tsx", import.meta.url), "utf8");
  assert.match(canvas, /function dismissInserter\(\) \{\s*if \(window.matchMedia\("\(prefers-reduced-motion: reduce\)"\).matches\) finishInserterClose\(\);\s*else setInserterClosing\(true\)/);
  assert.match(canvas, /onDismiss=\{dismissInserter\}/);
  assert.match(canvas, /event.target instanceof HTMLElement && event.target.classList.contains\("block-inserter"\) && event.animationName === "studio-inserter-exit"\) onCloseAnimationEnd\(\)/);
  assert.match(canvas, /inert=\{closing\}/);
  const css = readFileSync(new URL("../app/studio/studio.css", import.meta.url), "utf8");
  assert.match(css, /\.block-inserter\.is-closing \{ animation: studio-inserter-exit 180ms ease-in forwards/);
  assert.match(canvas, /onClick=\{\(\) => \{ dismiss\(\); onCloseAnimationEnd\(\); \}\}/);
});


test("Add block cancels an exit in progress and restores the entry animation", () => {
  const canvas = readFileSync(new URL("../app/studio/studio-canvas.tsx", import.meta.url), "utf8");
  assert.match(canvas, /showInserter && !inserterClosing \? dismissInserter\(\) : openInserter\(null\)/);
  assert.match(canvas, /function openInserter[^}]*setInserterClosing\(false\)/);
  assert.match(canvas, /className=\{`block-inserter\$\{closing \? " is-closing" : ""\}`\}/);
  assert.match(canvas, /if \(closing && event.target instanceof HTMLElement/);
});


test("between-block add controls toggle the shared block library", () => {
  const canvas = readFileSync(new URL("../app/studio/studio-canvas.tsx", import.meta.url), "utf8");
  assert.match(canvas, /function toggleInserter\(afterIndex: number \| null, query\?: string\) \{\s*if \(showInserter && !inserterClosing\) \{\s*dismissInserter\(\);/);
  assert.match(canvas, /className="between-blocks cover-inserter"[^>]*onClick=\{\(\) => toggleInserter\(-1\)\}/);
  assert.match(canvas, /className="between-blocks"[^>]*onClick=\{\(\) => toggleInserter\(index - 1\)\}/);
  assert.match(canvas, /className="canvas-appender-button"[^>]*onClick=\{\(\) => \{ if \(!writableRef.current\) return; setAppenderValue\(""\); setAppenderActive\(false\); toggleInserter\(activeDocument\.blocks\.length - 1\); \}\}/);
});


test("folder menus offer keyboard-accessible owner-gated actions and persistent colours", () => {
  const manager = readFileSync(new URL("../app/studio/media-manager.tsx", import.meta.url), "utf8");
  assert.match(manager, /onContextMenu=\{/);
  assert.match(manager, /event.key === "ContextMenu" \|\| \(event.shiftKey && event.key === "F10"\)/);
  assert.match(manager, /onClick=\{\(\) => openFolder\(folder\)\}/);
  assert.match(manager, /aria-haspopup="menu"/);
  assert.doesNotMatch(manager, /aria-label="Close folder actions"/);
  assert.match(manager, /event.key === "Escape"/);
  assert.match(manager, /disabled=\{!canMutate\}[\s\S]*?>Rename/);
  assert.match(manager, /void removeFolder\(\)/);
  assert.match(manager, /await mutate\(async \(\) => \{\s*await colourMediaFolder\(id, colour \|\| null\)/);
  const store = readFileSync(new URL("../app/studio/media-store.ts", import.meta.url), "utf8");
  assert.match(store, /colour\?: string/);
  assert.match(store, /function colourMediaFolder[^}]*studioWriteOwnership.write/);
  assert.match(store, /if \(colour === null\) delete next.colour;\s*else next.colour = colour/);
  const css = readFileSync(new URL("../app/studio/media.css", import.meta.url), "utf8");
  assert.match(css, /\.folder-glyph svg \{ height: 64px; width: 64px/);
});


test("media folders use a folder silhouette, hoverable colour choices and aligned list icons", () => {
  const manager = readFileSync(new URL("../app/studio/media-manager.tsx", import.meta.url), "utf8");
  assert.match(manager, /StudioIcon name="folder" size=\{64\}/);
  assert.doesNotMatch(manager, /StudioIcon name="archive"/);
  assert.match(manager, /onMouseEnter=\{\(event\) => openColourMenu\(event.currentTarget\)/);
  assert.match(manager, /event.key === "ArrowRight"/);
  assert.match(manager, /\}, \[folderMenuId\]\)/);
  const css = readFileSync(new URL("../app/studio/media.css", import.meta.url), "utf8");
  assert.match(css, /\.media-entries.is-list \.folder-glyph \{[^}]*height: 44px;[^}]*margin: 0; width: 46px/);
  assert.match(css, /\.media-entries.is-list \.media-thumbnail \{ height: 44px; width: 46px/);
  assert.match(manager, /<span className="folder-glyph"[\s\S]*<span className="media-card-copy"><strong className=\{inlineRename\?\.id === folder\.id/);
  assert.match(css, /\.media-entries.is-grid \.media-folder-card \{ align-content: start; grid-template-rows: 105px min-content; padding: 0; \}/);
});


test("folder palette offers exactly the requested colours and can clear a saved choice", () => {
  const manager = readFileSync(new URL("../app/studio/media-manager.tsx", import.meta.url), "utf8");
  const palette = manager.match(/(\[ \["No Colour".*?\] \])\.map/)[1];
  assert.deepEqual(JSON.parse(palette).map(([label]) => label), ["No Colour", "Red", "Orange", "Yellow", "Green", "Blue", "Purple", "Grey"]);
  assert.match(manager, /if \(colour !== undefined\) void changeFolderColour/);
  assert.match(manager, /aria-checked=\{\(selectedFolder\?\.colour \?\? ""\) === colour\}/);
  const store = readFileSync(new URL("../app/studio/media-store.ts", import.meta.url), "utf8");
  assert.match(store, /colourMediaFolder\(id: string, colour: string \| null\)/);
  assert.match(store, /if \(colour === null\) delete next.colour/);
});


test("folder colours open in a labelled side submenu with return navigation", () => {
  const manager = readFileSync(new URL("../app/studio/media-manager.tsx", import.meta.url), "utf8");
  assert.match(manager, /className="folder-colour-icon" aria-hidden="true"/);
  assert.match(manager, /className="folder-colour-menu"[^>]*role="menu" aria-label="Folder colour"/);
  assert.match(manager, /aria-controls="folder-colour-menu" aria-expanded=\{folderMenu.colours\}/);
  assert.match(manager, /rect.right \+ 4/);
  assert.match(manager, /event.key === "Escape" \|\| event.key === "ArrowLeft"/);
  assert.match(manager, /colourMenuTriggerRef.current\?\.focus\(\)/);
  assert.match(manager, /item.closest\("\[role=menu\]"\) === event.currentTarget/);
});


test("folder context menu omits Close while retaining dismissal and read-only focus", () => {
  const manager = readFileSync(new URL("../app/studio/media-manager.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(manager, />Close<\/button>/);
  assert.match(manager, /if \(event.key === "Escape"\)/);
  assert.match(manager, /document.addEventListener\("pointerdown", outside\)/);
  assert.match(manager, /\?\? folderMenuRef.current\)\?\.focus\(\)/);
});


test("folder rename focus waits for a writable rendered input and is retried after refresh", () => {
  const source = readFileSync(new URL("../app/studio/media-manager.tsx", import.meta.url), "utf8");
  assert.match(source, /if \(!canMutate \|\| folderMenu \|\| folderNameFocusTargetIdRef.current !== selectedFolder\?\.id \|\| !folderNameInputRef.current\) return/);
  assert.match(source, /\[selectedFolder\?\.id, folders, folderMenu, canMutate\]/);
  assert.match(source, /setInlineRename\(\{ id: item.id, kind: folderMenu.kind, name: item.name \}\);[\s\S]*?closeFolderMenu\(false\)/);
});


test("folder Rename and Delete use the shared menu icons", () => {
  const source = readFileSync(new URL("../app/studio/media-manager.tsx", import.meta.url), "utf8");
  assert.match(source, /<StudioIcon name="pencil" size=\{16\} \/>Rename<\/button>/);
  assert.match(source, /<StudioIcon name="trash" size=\{16\} \/>Delete<\/button>/);
});


test("colour hover dismissal bridges the submenu gap and preserves keyboard focus", () => {
  const source = readFileSync(new URL("../app/studio/media-manager.tsx", import.meta.url), "utf8");
  assert.equal((source.match(/onMouseLeave=\{scheduleColourMenuClose\}/g) ?? []).length, 2);
  assert.match(source, /onMouseEnter=\{cancelColourMenuClose\}/);
  assert.match(source, /function openColourMenu[^}]*cancelColourMenuClose\(\)/);
  assert.match(source, /focused.matches\(":focus-visible"\)/);
  assert.match(source, /colourSubmenuRef.current\?\.contains\(focused\)/);
  assert.match(source, /window.setTimeout\([\s\S]*?\}, 150\)/);
  assert.match(source, /removeEventListener\("pointerdown", outside\); cancelColourMenuClose\(\)/);
});


test("file cards share Rename and Delete menus without folder colour controls", () => {
  const source = readFileSync(new URL("../app/studio/media-manager.tsx", import.meta.url), "utf8");
  assert.match(source, /showFileMenu\(asset, event.currentTarget, event.clientX, event.clientY\)/);
  assert.match(source, /showFileMenu\(asset, event.currentTarget, rect.left, rect.bottom\)/);
  assert.match(source, /folderMenu.kind === "folder" \? <button ref=\{colourMenuTriggerRef\}/);
  assert.match(source, /if \(folderMenu.kind === "file"\) void removeAsset\(\); else void removeFolder\(\)/);
  assert.match(source, /setInlineRename\(\{ id: item.id, kind: folderMenu.kind, name: item.name/);
  assert.match(source, /inlineRenameRef.current\?\.focus\(\);\s*inlineRenameRef.current\?\.select\(\)/);
});


test("inline card rename cancels before blur can save and preserves the details panel", () => {
  const source = readFileSync(new URL("../app/studio/media-manager.tsx", import.meta.url), "utf8");
  assert.match(source, /inlineRenameFinishedRef.current = true; setInlineRename\(null\)/);
  assert.match(source, /if \(!inlineRename \|\| inlineRenameFinishedRef.current \|\| !canMutate\) return/);
  assert.match(source, /await saveAsset\(\{ name \}, inlineRename.id\)/);
  assert.match(source, /inlineRename\?\.id === folder.id \? inlineNameEditor/);
  assert.match(source, /inlineRename\?\.id === asset.id \? inlineNameEditor/);
  assert.match(source, /<h2>File details<\/h2>/);
});


test("inline rename matches the name rectangle without changing card flow", () => {
  const source = readFileSync(new URL("../app/studio/media-manager.tsx", import.meta.url), "utf8");
  assert.match(source, /const nameRect = label.getBoundingClientRect\(\)/);
  assert.match(source, /width: `\$\{nameRect.width\}px`, height: `\$\{nameRect.height\}px`/);
  assert.match(source, /\[inlineRenameId, inlineRenameKind, view\]/);
  assert.match(source, /observer\?\.observe\(label\)/);
  assert.match(source, /observer\?\.disconnect\(\)/);
  const css = readFileSync(new URL("../app/studio/media.css", import.meta.url), "utf8");
  assert.match(css, /\.media-card-name.is-renaming \{ visibility: hidden; \}/);
  assert.match(css, /\.media-inline-name \{[^}]*padding: 0; position: absolute/);
  assert.doesNotMatch(css, /\.media-inline-name[^}]*bottom:|\.media-inline-name[^}]*top: 5px/);
});


test("media drag-and-drop is owner-gated and folders have a keyboard move equivalent", () => {
  const source = readFileSync(new URL("../app/studio/media-manager.tsx", import.meta.url), "utf8");
  assert.match(source, /draggable=\{canMutate && !inlineRename\}/);
  assert.match(source, /onDrop=\{\(event\) => dropIntoFolder\(event, folder.id\)\}/);
  assert.match(source, /if \(canMutate && entry\) void moveMediaEntry\(entry, id\)/);
  assert.match(source, /entry.kind === "folder" && !allowedFolderDestination\(entry.id, id\)/);
  assert.match(source, /await updateMediaAsset\(entry.id, \{ folderId: parentId \}\)/);
  assert.match(source, /<span>Move to folder<\/span>/);
  const store = readFileSync(new URL("../app/studio/media-store.ts", import.meta.url), "utf8");
  assert.match(store, /function moveMediaFolder[^}]*studioWriteOwnership.write/);
  assert.match(store, /runTransaction\(database, FOLDER_STORE, "readwrite"/);
});


test("move to parent uses the containing folder parent and respects write ownership", () => {
  const source = readFileSync(new URL("../app/studio/media-manager.tsx", import.meta.url), "utf8");
  assert.match(source, /selectedAsset\?\.folderId \?\? selectedFolder\?\.parentId \?\? null/);
  assert.match(source, /selectedContainer \? <button type="button" role="menuitem" disabled=\{!canMutate\}/);
  assert.match(source, /moveMediaEntry\(\{ id: folderMenu.id, kind: folderMenu.kind \}, selectedContainer.parentId\)/);
  assert.match(source, /<StudioIcon name="arrow-up" size=\{16\} \/>Move to parent folder/);
});


test("parent navigation is separate from searchable sortable folder records", () => {
  const source = readFileSync(new URL("../app/studio/media-manager.tsx", import.meta.url), "utf8");
  assert.ok(source.indexOf('media-parent-card') < source.indexOf("{visibleFolders.map"));
  assert.match(source, /setCurrentFolderId\(currentFolder.parentId\)/);
  assert.match(source, /className="folder-up-arrow" name="arrow-up"/);
  const css = readFileSync(new URL("../app/studio/media.css", import.meta.url), "utf8");
  assert.match(css, /\.media-entries.is-list \.media-parent-card \{[^}]*grid-template-columns: 46px 1fr/);
});


test("Parent folder drops validate destinations and show accepted/rejected hover states", () => {
  const source = readFileSync(new URL("../app/studio/media-manager.tsx", import.meta.url), "utf8");
  assert.match(source, /onDragOver=\{dragOverParent\}/);
  assert.match(source, /onDrop=\{dropIntoParent\}/);
  assert.match(source, /allowedFolderDestination\(entry.id, currentFolder.parentId\)/);
  assert.match(source, /if \(valid && entry && currentFolder\) void moveMediaEntry\(entry, currentFolder.parentId\)/);
  assert.match(source, /setParentDropState\(valid \? "valid" : "invalid"\)/);
  const css = readFileSync(new URL("../app/studio/media.css", import.meta.url), "utf8");
  assert.match(css, /\.media-parent-card.is-drop-target/);
  assert.match(css, /\.media-parent-card.is-invalid-drop/);
});


test("media breadcrumbs accept validated drops without invoking navigation", () => {
  const source = readFileSync(new URL("../app/studio/media-manager.tsx", import.meta.url), "utf8");
  assert.match(source, /onDrop=\{\(event\) => dropIntoBreadcrumb\(event, null\)\}/);
  assert.match(source, /onDrop=\{\(event\) => dropIntoBreadcrumb\(event, folder.id\)\}/);
  assert.match(source, /allowedFolderDestination\(entry.id, folderId\)/);
  const drop = source.slice(source.indexOf("function dropIntoBreadcrumb"), source.indexOf("function leaveBreadcrumb"));
  assert.match(drop, /event.preventDefault\(\); event.stopPropagation\(\)/);
  assert.match(drop, /if \(valid && entry\) void moveMediaEntry\(entry, folderId\)/);
  assert.doesNotMatch(drop, /setCurrentFolderId|openFolder/);
});


test("folder cards retain keyboard opening and concise Folder metadata", () => {
  const source = readFileSync(new URL("../app/studio/media-manager.tsx", import.meta.url), "utf8");
  assert.match(source, /onDoubleClick=\{\(\) => openFolder\(folder\)\}/);
  assert.match(source, /<small>Folder<\/small>/);
  assert.doesNotMatch(source, /Folder · double-click to open/);
  assert.match(source, /if \(event.key === "Enter"\) \{ event.preventDefault\(\); openFolder\(folder\)/);
});


test("grid folder labels align with file thumbnail and copy spacing", () => {
  const css = readFileSync(new URL("../app/studio/media.css", import.meta.url), "utf8");
  assert.match(css, /\.media-thumbnail \{[^}]*height: 105px/);
  assert.match(css, /\.media-entries.is-grid \.media-folder-card \{[^}]*grid-template-rows: 105px min-content; padding: 0/);
  assert.match(css, /\.media-card-copy \{ display: grid; padding: 9px/);
  assert.match(css, /\.media-entries.is-grid \.media-folder-card \.media-card-copy \{ padding: 9px/);
  assert.match(css, /\.media-entries.is-list \.folder-glyph \{[^}]*height: 44px/);
});


test("grid folders use larger icons without changing their track or list icons", () => {
  const css = readFileSync(new URL("../app/studio/media.css", import.meta.url), "utf8");
  assert.match(css, /\.media-entries.is-grid \.media-folder-card \.folder-glyph svg \{ height: 88px; transform: translateY\(16px\); width: 88px/);
  assert.match(css, /grid-template-rows: 105px min-content/);
  assert.match(css, /\.media-entries.is-list \.folder-glyph svg \{ height: 26px; width: 26px/);
});


test("file and folder cards share horizontal overflow controls and centred larger grid icons", () => {
  const source = readFileSync(new URL("../app/studio/media-manager.tsx", import.meta.url), "utf8");
  assert.match(source, /className="media-folder-menu-toggle"[^>]*aria-haspopup="menu"/);
  assert.match(source, /className="media-file-menu-toggle"[^>]*aria-haspopup="menu"/);
  assert.equal((source.match(/className="media-card-menu-icon" name="more-vertical"/g) ?? []).length, 2);
  assert.match(source, /showFileMenu\(asset, event.currentTarget, rect.left, rect.bottom\)/);
  const css = readFileSync(new URL("../app/studio/media.css", import.meta.url), "utf8");
  assert.match(css, /\.media-folder-menu-toggle, \.media-file-menu-toggle \{[^}]*right: 4px; top: 4px/);
  assert.match(css, /\.media-card-menu-icon \{ transform: rotate\(90deg\)/);
  assert.match(css, /\.media-entries.is-grid \.media-folder-card \.folder-glyph \{ align-self: center; justify-self: center/);
  assert.match(css, /\.media-entries.is-list \.folder-glyph svg \{ height: 26px; width: 26px/);
});


test("list file names shrink and reserve space for their overflow control", () => {
  const css = readFileSync(new URL("../app/studio/media.css", import.meta.url), "utf8");
  assert.match(css, /\.media-entries.is-list \.media-folder-card, \.media-entries.is-list \.media-file-card \{ padding-right: 40px/);
  assert.match(css, /\.media-entries.is-list \.media-file-card, \.media-entries.is-list \.media-folder-card \{[^}]*grid-template-columns: 46px minmax\(0, 1fr\)/);
  assert.match(css, /\.media-entries.is-list \.media-file-entry \{ min-height: 54px; \}/);
  assert.match(css, /\.media-entries.is-list \.media-file-entry\.has-source-design \.media-file-card \{ padding-right: 150px; \}/);
  assert.match(css, /\.media-entries.is-list \.media-file-entry \.media-source-design-link \{ align-items: center; display: flex; height: 100%;/);
});


test("grid folder icons sit lower without moving labels or list icons", () => {
  const css = readFileSync(new URL("../app/studio/media.css", import.meta.url), "utf8");
  assert.match(css, /\.media-entries.is-grid \.media-folder-card \.folder-glyph svg \{ height: 88px; transform: translateY\(16px\); width: 88px/);
  assert.match(css, /grid-template-rows: 105px min-content/);
  assert.match(css, /\.media-entries.is-list \.folder-glyph svg \{ height: 26px; width: 26px; \}/);
});


test("overflow pointer and focus transitions reach toggle handlers before dismissal", () => {
  const source = readFileSync(new URL("../app/studio/media-manager.tsx", import.meta.url), "utf8");
  assert.match(source, /event.target.closest\("\.media-folder-menu-toggle, \.media-file-menu-toggle"\)\) return/);
  assert.match(source, /event.relatedTarget.closest\("\.media-folder-menu-toggle, \.media-file-menu-toggle"\)\) return/);
  assert.match(source, /folderMenu\?\.kind === "folder" && folderMenu.id === folder.id\) \{ closeFolderMenu\(\); return/);
  assert.match(source, /folderMenu\?\.kind === "file" && folderMenu.id === asset.id\) \{ closeFolderMenu\(\); return/);
});


test("content type tabs follow the shared Studio tool menu", () => {
  const prototype = readFileSync(new URL("../app/studio/studio-navigation-pane.tsx", import.meta.url), "utf8");
  const prototypeLibrary = prototype.slice(prototype.indexOf('<Pane trackClassName="studio-library-track"'), prototype.indexOf('<div className="document-list">'));
  assert.ok(prototypeLibrary.includes('className="library-tool-button"'));
  assert.ok(prototypeLibrary.includes('className="library-tabs"'));
  assert.ok(prototypeLibrary.indexOf('className="library-tool-button"') < prototypeLibrary.indexOf('className="library-tabs"'));

  const templates = readFileSync(new URL("../app/studio/template-workspace.tsx", import.meta.url), "utf8");
  const templateLibrary = templates.slice(templates.indexOf('<Pane trackClassName="studio-library-track"'), templates.indexOf('<div className="document-list template-document-list">'));
  assert.ok(templateLibrary.includes('className="library-tool-button"'));
  assert.ok(templateLibrary.includes('className="library-tabs"'));
  assert.ok(templateLibrary.indexOf('className="library-tool-button"') < templateLibrary.indexOf('className="library-tabs"'));
});

test("Studio View menu exposes viewport, template and read-only preview actions", async () => {
  const menu = readFileSync(new URL("../app/studio/studio-view-menu.tsx", import.meta.url), "utf8");
  const prototype = readFileSync(new URL("../app/studio/studio-prototype.tsx", import.meta.url), "utf8");
  const header = readFileSync(new URL("../app/studio/studio-header.tsx", import.meta.url), "utf8");
  const page = readFileSync(new URL("../app/studio/page.tsx", import.meta.url), "utf8");
  const workspace = readFileSync(new URL("../app/studio/use-studio-workspace.ts", import.meta.url), "utf8");
  const css = readFileSync(new URL("../app/studio/studio.css", import.meta.url), "utf8");
  assert.match(menu, /\{ id: "desktop", label: "Desktop", width: 1200 \}/);
  assert.match(menu, /\{ id: "tablet", label: "Tablet", width: 768 \}/);
  assert.match(menu, /\{ id: "mobile", label: "Mobile", width: 390 \}/);
  assert.match(menu, /role="menuitemradio" aria-checked=\{viewport === item\.id\}/);
  assert.match(menu, /role="menuitemcheckbox" aria-checked=\{showTemplate\}/);
  assert.match(menu, /Viewport-specific style editing is not available in Studio yet/);
  assert.match(menu, /event\.key === "Escape"/);
  assert.match(prototype, /<StudioHeader studioSection=\{studioSection\}/);
  assert.match(header, /window\.open\(`\/studio\?\$\{query\.toString\(\)\}`, "_blank", "noopener,noreferrer"\)/);
  assert.match(page, /return <StudioPrototype initialView=\{/);
  assert.match(page, /export const dynamic = "force-dynamic"/);
  assert.match(prototype, /export function StudioPrototype\(\{ initialView \}: \{ initialView: StudioInitialView \}\)/);
  assert.match(prototype, /if \(previewWindow && \(studioSession\.loadError \|\| !previewDocumentId \|\| !workspace\.documents\.some\(document => document\.id === previewDocumentId\)\)\)[\s\S]*?Document unavailable/);
  assert.match(workspace, /return \{ workspace, ready, loadError,/);
  assert.match(prototype, /useStudioWorkspace\(undefined, undefined, undefined, undefined, undefined, \{ readOnly: previewWindow, activeDocumentId: previewDocumentId \?\? undefined \}\)/);
  assert.match(prototype, /writable=\{writable && !previewWindow\}/);
  assert.match(prototype, /viewportWidth: viewportWidthFor\(viewViewport\)/);
  assert.match(css, /\.studio-preview-window \.editor-document-bar \{ display: none; \}/);
  assert.match(css, /\.studio-preview-window\.studio-desktop-only \{ min-width: 0; width: 100%; \}/);
  assert.match(css, /\.studio-preview-window\.studio-desktop-only > \.studio-workspace \{ display: block; min-width: 0; width: 100%; \}/);
});

test("Embed catalogue places content on the canvas and lists only Dimensions and Advanced in the pane", () => {
  const profile = capabilityProfileFor("embed");
  assert.deepEqual(profile.sections.map(section => section.id), ["dimensions", "advanced"]);
  assert.deepEqual(profile.defaults.dimensions, ["margin"]);
  for (const id of ["url", "caption", "card-title", "block-alignment"]) {
    assert.equal(profile.controls.find(control => control.id === id)?.placement, "canvas");
  }
  assert.deepEqual(profile.controls.find(control => control.id === "advanced")?.fields, ["visualStyle.anchor", "visualStyle.className", "visualStyle.additionalCss"]);
  assert.ok(profile.dependencies.some(dependency => dependency.id === "box-length"));
  assert.ok(profile.dependencies.some(dependency => dependency.id === "inspector-tools"));
});
