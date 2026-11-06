import assert from "node:assert/strict";
import test from "node:test";
import ts from "typescript";
import { blockCapabilityProfiles, capabilityProfileFor, hasScopedStyleControls, listItemCapabilityProfile, listItemSupportedStyleFields, resetInspectorStyleFields, retainedLegacyStyleControls, scopedStyleSectionIds } from "../app/studio/blocks/capability-profiles.ts";
import { studioControlEntries, studioControlEntryById } from "../app/studio/controls/library-catalogue.ts";
import { readStudioSource } from "./studio-module-source.mjs";

const read = path => readStudioSource(path);

test("all typed blocks and template Content have complete, ordered inspector capability profiles", () => {
  const profiles = Object.values(blockCapabilityProfiles);
  const typedProfiles = profiles.filter(profile => profile.type !== "template-content");
  assert.equal(typedProfiles.length, 37);
  assert.equal(profiles.length, 38);
  assert.equal(new Set(profiles.map(profile => profile.type)).size, 33);

  for (const profile of profiles) {
    assert.ok(profile.label, profile.type);
    assert.ok(profile.mapping, profile.type);
    assert.ok(Array.isArray(profile.sections), profile.type);
    assert.ok(profile.sections.every(section => profile.controls.some(control => control.section === section.id)), profile.type);
    assert.ok(profile.controls.every(control => control.fields.length > 0), `${profile.type} has an unmapped pane control`);
    assert.ok(profile.controls.every(control => control.fields.every(field => control.resetFields.includes(field))), `${profile.type} does not reset each control's owned fields`);
    assert.ok(profile.controls.every(control => ["gutenberg", "studio"].includes(control.source)), profile.type);
    assert.ok(profile.controls.every(control => !control.availableWhen || control.dependency), `${profile.type} has an undeclared conditional dependency`);
  }

  for (const profile of profiles) assert.equal(Object.hasOwn(profile, "defaultTab"), false, `${profile.type} has no nested inspector tab`);

  const paragraph = capabilityProfileFor("paragraph");
  assert.deepEqual(paragraph.controls.find(control => control.id === "advanced")?.fields, ["anchor"]);
  assert.equal(paragraph.controls.find(control => control.id === "class-name")?.source, "gutenberg");
  assert.deepEqual(paragraph.controls.find(control => control.id === "class-name")?.fields, ["className"]);
  assert.equal(paragraph.controls.find(control => control.id === "additional-css")?.source, "gutenberg");
  assert.deepEqual(paragraph.controls.find(control => control.id === "additional-css")?.resetFields, ["additionalCss"]);
  assert.deepEqual(paragraph.inventorySections.find(section => section.id === "advanced")?.fields, ["anchor", "className", "additionalCss"]);

  const heading = capabilityProfileFor("heading");
  assert.deepEqual(heading.sections.map(section => section.id), ["styles", "content", "typography", "background", "dimensions", "border", "elements", "advanced"]);
  assert.deepEqual(scopedStyleSectionIds(heading, undefined, "gutenberg"), ["typography", "background", "dimensions", "border", "elements"]);
  assert.equal(heading.controls.find(control => control.id === "block-alignment")?.placement, "canvas");
  assert.equal(heading.sections.some(section => section.id === "canvas"), false);
  const inspectorSource = read("app/studio/studio-inspectors.tsx");
  const groupLayoutControlsSource = read("app/studio/blocks/group-layout-controls.tsx");
  const headingPaneControls = heading.controls.filter(control => control.section === "content" && control.placement !== "canvas").map(control => control.id);
  assert.deepEqual(headingPaneControls, ["level"]);

  const table = capabilityProfileFor("table");
  for (const id of ["table-alignment", "column-alignment"]) assert.equal(table.controls.find(control => control.id === id)?.placement, "canvas", `table:${id}`);
  assert.ok(!table.sections.some(section => ["table-alignment", "column-alignment"].includes(section.id)));
  const columns = capabilityProfileFor("columns");
  assert.equal(columns.controls.find(control => control.id === "outer-alignment")?.placement, "canvas");
  assert.deepEqual(columns.controls.find(control => control.id === "outer-alignment")?.fields, ["blockAlign"]);

  const content = capabilityProfileFor("template-content");
  assert.deepEqual(content.controls.find(control => control.id === "text-alignment")?.fields, ["data.align"]);
  for (const id of ["family", "letter-spacing", "decoration", "letter-case", "gaps", "heading-colour"]) {
    assert.ok(content.controls.some(control => control.id === id), `Content exposes WordPress-supported ${id}`);
  }
  assert.deepEqual(content.controls.find(control => control.id === "button-colour")?.fields, ["buttonTextColor", "buttonBackgroundColor", "buttonBackgroundGradient"]);
  assert.deepEqual(content.defaults.typography, ["size"]);
  assert.deepEqual(content.defaults.dimensions, ["gaps"]);
  assert.deepEqual(content.defaults.elements, []);
  assert.equal(content.controls.find(control => control.id === "gaps")?.section, "dimensions");
  assert.deepEqual(content.controls.find(control => control.id === "gaps")?.fields, ["gap", "columnGap", "rowGap"]);
  assert.ok(!content.unsupported.some(item => item.includes("button element colours")), "Post Content Button element colours are supported in the inspector");

  const paneOrder = type => capabilityProfileFor(type).controls
    .filter(control => control.source === "gutenberg" && control.placement !== "canvas" && control.section === "media")
    .map(control => control.id);
  assert.deepEqual(paneOrder("image"), ["source", "alternative-text", "caption", "link-destination", "resolution", "image-style", "display-dimensions", "aspect-ratio", "scale", "focal-position"]);
  const imageProfile = capabilityProfileFor("image");
  const featuredImageProfile = capabilityProfileFor("cover-image");
  assert.ok(!featuredImageProfile.unsupported.includes("Overlay"), "Featured Image overlay is supported in the inspector");
  assert.deepEqual(imageProfile.controls.find(control => control.id === "resolution")?.fields, ["imageResolution"]);
  assert.equal(imageProfile.controls.find(control => control.id === "resolution")?.dependency, "source");
  assert.match(imageProfile.controls.find(control => control.id === "resolution")?.availableWhen ?? "", /managed Image file/);
  assert.ok(!imageProfile.unsupported.includes("Resolution variants"), "generated image sizes are no longer listed as unsupported");
  const imageInspector = inspectorSource.slice(inspectorSource.indexOf("function ImageInspector"), inspectorSource.indexOf("function CoverImageInspector"));
  assert.ok(imageInspector.indexOf('<InspectorAccordionSection title="Styles">') < imageInspector.indexOf('<InspectorAccordionSection title="Dimensions">'), "Image styles render before dimensions");
  assert.ok(imageInspector.indexOf("<ImageDimensionsSetting") < imageInspector.indexOf("<FocalPositionSetting"), "Image dimensions render before focal position");
  const coverProfile = capabilityProfileFor("cover");
  assert.deepEqual(coverProfile.controls.filter(control => control.source === "gutenberg" && control.section === "media").map(control => control.id), ["crop", "source", "video-background", "native-video-source", "alternative-text", "resolution", "dim-ratio", "content", "block-alignment"]);
  assert.deepEqual(coverProfile.controls.find(control => control.id === "focal-position")?.fields, ["focalX", "focalY"]);
  assert.match(coverProfile.controls.find(control => control.id === "focal-position")?.availableWhen ?? "", /framed image/);
  assert.deepEqual(coverProfile.controls.find(control => control.id === "min-height")?.fields, ["visualStyle.minHeight"]);
  assert.equal(coverProfile.controls.find(control => control.id === "min-height")?.section, "dimensions");
  assert.equal(coverProfile.controls.find(control => control.id === "focal-position")?.section, "position");
  const coverInspector = inspectorSource.slice(inspectorSource.indexOf("function CoverInspector"), inspectorSource.indexOf("function CoverImageInspector"));
  assert.ok(coverInspector.indexOf('<InspectorAccordionSection title="Dimensions">') < coverInspector.indexOf('<InspectorAccordionSection title="Position">'), "Cover dimensions render before focal position");
  assert.match(coverInspector, /label="Minimum height" value=\{visualStyle\.minHeight\}/);
  assert.match(coverInspector, /const hasImageFrame = ratio !== "original" \|\| block\.displayHeight !== undefined/);
  assert.match(coverInspector, /block\.scale !== "contain" \? <InspectorAccordionSection title="Position"><FocalPositionSetting/);

  const columnPaneOrder = columns.controls.filter(control => control.source === "gutenberg" && control.placement !== "canvas" && control.section === "layout").map(control => control.id);
  assert.deepEqual(columnPaneOrder, ["column-count", "stack-on-mobile", "vertical-alignment", "gaps"]);
  assert.equal(columns.controls.find(control => control.id === "vertical-alignment")?.source, "gutenberg");
  assert.deepEqual(columns.controls.find(control => control.id === "column-count")?.fields, ["children"]);
  const columnsInspector = inspectorSource.slice(inspectorSource.indexOf("function ColumnsInspector"), inspectorSource.indexOf("function ColumnInspector"));
  assert.ok(columnsInspector.indexOf("column-count-controls") < columnsInspector.indexOf("Stack on mobile"), "Columns count precedes the Gutenberg stack toggle");
  assert.ok(columnsInspector.indexOf("Stack on mobile") < columnsInspector.indexOf("Vertical alignment"), "Gutenberg controls follow their rendered order");
  assert.doesNotMatch(columnsInspector, /Studio columns layout|Studio adds a tablet breakpoint/);

  const groupProfile = capabilityProfileFor("group");
  const groupPaneOrder = groupProfile.controls.filter(control => control.source === "gutenberg" && control.placement !== "canvas" && control.section === "layout").map(control => control.id);
  assert.deepEqual(groupPaneOrder, ["layout", "alignment", "wrapping", "content-width", "grid", "grid-item-sizing"]);
  assert.equal(groupProfile.controls.find(control => control.id === "sticky")?.section, "position");
  assert.equal(groupProfile.controls.find(control => control.id === "sticky")?.dependency, "root-group");
  assert.equal(groupProfile.controls.find(control => control.id === "alignment")?.dependency, "layout");
  assert.match(groupProfile.controls.find(control => control.id === "alignment")?.availableWhen ?? "", /Row or Stack/);
  assert.equal(groupProfile.controls.find(control => control.id === "gaps")?.section, "dimensions");
  assert.equal(groupProfile.controls.find(control => control.id === "gaps")?.dependency, "layout");
  assert.equal(groupProfile.controls.find(control => control.id === "content-width")?.source, "gutenberg");
  assert.equal(groupProfile.controls.find(control => control.id === "columns" && control.section === "layout")?.source, "studio");
  assert.equal(groupProfile.controls.find(control => control.id === "background-image")?.source, "studio");
  const buttonsProfile = capabilityProfileFor("buttons");
  assert.equal(buttonsProfile.controls.find(control => control.id === "background-image")?.source, "studio");
  assert.ok(buttonsProfile.controls.find(control => control.id === "background")?.fields.includes("backgroundImageMediaId"));
  assert.ok(buttonsProfile.controls.find(control => control.id === "background")?.fields.includes("backgroundSize"));
  assert.deepEqual(groupProfile.defaults.dimensions, ["padding"]);
  const sectionPaneOrder = capabilityProfileFor("section").controls.filter(control => control.source === "gutenberg" && control.placement !== "canvas" && control.section === "layout").map(control => control.id);
  assert.deepEqual(sectionPaneOrder, ["layout", "alignment", "gaps", "padding", "content-width", "columns", "grid"]);
  for (const type of ["group", "section"]) {
    const profile = capabilityProfileFor(type);
    assert.equal(profile.controls.find(control => control.id === "min-width")?.source, type === "group" ? "gutenberg" : "studio", `${type} minimum width ownership`);
    assert.deepEqual(profile.controls.find(control => control.id === "alignment")?.fields, ["horizontalAlign", "verticalAlign"], `${type} alignment fields`);
    assert.deepEqual(profile.controls.find(control => control.id === "gaps")?.fields, ["gap", "columnGap", "rowGap"], `${type} gap fields`);
    assert.deepEqual(profile.controls.find(control => control.id === "padding")?.fields, ["paddingX", "paddingY"], `${type} padding fields`);
    assert.deepEqual(profile.controls.find(control => control.id === "content-width")?.fields, type === "group" ? ["contentWidth", "inheritLayout", "contentSize", "wideSize"] : ["contentWidth"], `${type} content width fields`);
    const columnsSetting = profile.controls.find(control => control.id === "columns" && control.section === "layout");
    assert.deepEqual(columnsSetting?.fields, ["columns"], `${type} column count fields`);
    if (type === "group") assert.equal(columnsSetting?.availability, "model-only");
    else {
      assert.equal(columnsSetting?.dependency, "layout");
      assert.match(columnsSetting?.availableWhen ?? "", /layout is Columns/);
    }
    const gridSetting = profile.controls.find(control => control.id === "grid");
    assert.deepEqual(gridSetting?.fields, type === "group" ? ["gridMode", "columns", "minColumnWidth", "minColumnWidthUnit", "fillAvailableSpace"] : ["columns", "minColumnWidth"], `${type} grid fields`);
    assert.equal(gridSetting?.dependency, "layout");
    assert.match(gridSetting?.availableWhen ?? "", /layout is Grid/);
  }
  const layoutInspector = inspectorSource.slice(inspectorSource.indexOf("function LayoutInspector"), inspectorSource.indexOf("function ColumnsInspector"));
  assert.match(inspectorSource, /<p className="setting-note">\{blockDescription\}<\/p>\{block.type === "heading"[^\n]+?\}\{block.type === "group" && !contentSlot \? <GroupLayoutSelection/, "Group layout variations remain below the description after the mutually exclusive Heading control");
  assert.doesNotMatch(layoutInspector, /GroupLayoutSelection/, "Group layout variations are not repeated in Dimensions");
  assert.match(layoutInspector, /return <GroupLayoutControls key=/);
  assert.match(groupLayoutControlsSource, /if \(block\.layout === "flow"\)/);
  assert.match(groupLayoutControlsSource, /if \(block\.layout === "grid"\)/);
  const gridLayoutControls = groupLayoutControlsSource.slice(groupLayoutControlsSource.indexOf("if (block.layout === \"grid\")"));
  assert.match(gridLayoutControls, /aria-label=\{gridMode === "manual" \? "Grid columns" : "Maximum grid columns"\}[\s\S]*aria-label": "Minimum column width"/);
  assert.match(gridLayoutControls, /label="Fill available space"/);
  assert.match(gridLayoutControls, /<option value="auto">Automatic<\/option><option value="manual">Manual<\/option>/);
  assert.match(groupLayoutControlsSource, /const row = block\.layout === "row"/);
  const groupDimensions = inspectorSource.slice(inspectorSource.indexOf("function GroupDimensionsInspector"), inspectorSource.indexOf("function GroupPositionInspector"));
  assert.match(inspectorSource, /label="Padding" value=\{style.padding/);
  assert.match(groupDimensions, /block\.layout === "flow" \? <fieldset/);
  assert.match(groupDimensions, /label="Block spacing" value=\{block\.rowGap \?\? block\.gap\}/);
  assert.match(groupDimensions, /label="Horizontal gap"/);
  assert.match(groupDimensions, /label="Vertical gap"/);
  assert.match(groupDimensions, /: <fieldset className="group-layout-dimension-group"><legend>Block spacing<\/legend><div className="inspector-two-column">/);
  assert.match(groupDimensions, /<legend>Block spacing<\/legend>/);
  assert.match(inspectorSource, /resetGroupDimensionFields\(block, nextStyle, \{ padding: selectedIds.includes\("padding"\), layout: resetGroupLayout \|\| selectedIds.includes\("gaps"\) \}\)/);
  assert.match(inspectorSource, /title="Position" options=\{\[\{ id: "position", label: "Position" \}\]\}/);
  const groupPositionInspector = inspectorSource.slice(inspectorSource.indexOf("function GroupPositionInspector"), inspectorSource.indexOf("function ColumnsInspector"));
  assert.match(groupPositionInspector, /configuredPosition: block\.position, visible: Boolean\(block\.position\)/);
  assert.match(groupPositionInspector, /positionVisibility\.configuredPosition === block\.position/);
  assert.doesNotMatch(groupPositionInspector, /alwaysShow/, "Group Position stays optional until selected or already configured");
  assert.match(inspectorSource, /sectionId === "background" && !deviceScope && groupLayoutControls/);
  assert.equal(capabilityProfileFor("group").controls.some(control => control.id === "allowed-blocks"), true);
  assert.match(inspectorSource, /<GroupAllowedBlocksControl value=\{block\.allowedBlocks\}/);
  const allowedBlocksControl = read("app/studio/controls/group-allowed-blocks.tsx");
  assert.match(allowedBlocksControl, /Manage allowed blocks/);
  assert.match(allowedBlocksControl, /GROUP_SELECTABLE_BLOCK_TYPES\.filter\(type => draft\.includes\(type\)\)/);
  assert.match(allowedBlocksControl, /\(value \?\? \[\]\)\.filter\(type => !GROUP_SELECTABLE_BLOCK_TYPES\.includes\(type\)\)/);
  assert.match(allowedBlocksControl, /onChange\(\(value === undefined && allCurrentOptionsSelected\) \|\| allStoredTypesSelected \? undefined : next\)/);
  const columnPane = capabilityProfileFor("column");
  assert.deepEqual(columnPane.controls.filter(control => control.source === "gutenberg" && control.section === "layout").map(control => control.id), ["width", "vertical-alignment", "gap"]);
  assert.equal(columnPane.controls.find(control => control.id === "vertical-alignment")?.source, "gutenberg");
  assert.deepEqual(columnPane.controls.find(control => control.id === "gap")?.fields, ["rowGap", "gap"]);
  const singleColumnInspector = inspectorSource.slice(inspectorSource.indexOf("function ColumnInspector"), inspectorSource.indexOf("function ComponentInspector"));
  assert.ok(singleColumnInspector.indexOf("<span>Vertical alignment</span>") < singleColumnInspector.indexOf('label="Block gap"'), "Column inspector keeps its documented order");

  for (const [type, id] of [["quote", "attribution"], ["quote", "text-alignment"], ["list", "list-style"], ["table", "caption"], ["social-linkedin", "profile-url"], ["author-name", "alignment"], ["post-date", "alignment"], ["title", "level"], ["columns", "vertical-alignment"], ["column", "vertical-alignment"]]) {
    assert.equal(capabilityProfileFor(type).controls.find(control => control.id === id)?.source, "gutenberg", `${type}:${id} is available in the unified Block inspector`);
  }
  assert.equal(capabilityProfileFor("separator").controls.find(control => control.id === "divider-style")?.source, "gutenberg", "Separator style is part of the Gutenberg-owned Block pane");
  assert.equal(capabilityProfileFor("cover-image").controls.find(control => control.id === "focal-position")?.source, "studio", "Cover Image focal position remains a documented ACM option");
  assert.deepEqual(capabilityProfileFor("heading").attributeDefaults, { level: 2 });
  assert.deepEqual(capabilityProfileFor("table").attributeDefaults, { hasFixedLayout: true });
  assert.deepEqual(capabilityProfileFor("columns").attributeDefaults, { isStackedOnMobile: true });
  const socialColours = capabilityProfileFor("social-icons").controls;
  assert.match(socialColours.find(control => control.id === "colour")?.availableWhen ?? "", /theme supports colours or gradients/);
  assert.match(socialColours.find(control => control.id === "background")?.availableWhen ?? "", /Logos Only mode/);
  for (const profile of profiles) {
    const paneOrder = [...new Set(profile.controls.filter(control => control.placement !== "canvas").map(control => control.section))];
    assert.deepEqual(profile.sections.map(section => section.id), paneOrder, `${profile.type} pane section order`);
  }
});

test("saved style settings remain visible in Studio when a block profile does not own them", () => {
  const profile = capabilityProfileFor("author-name");
  const retained = retainedLegacyStyleControls(profile, { textColor: "#333333", borderColor: "#123456", borderWidth: "3px" });
  assert.deepEqual(retained.map(control => control.id), ["border"]);
  assert.equal(retained[0].source, "studio");
  assert.deepEqual(retained[0].fields, ["borderColor", "borderStyle", "borderWidth", "borderWidthSides"]);
  assert.deepEqual(scopedStyleSectionIds(profile, { borderColor: "#123456" }, "studio"), ["border"]);

  const current = retainedLegacyStyleControls(profile, { textColor: "#333333" });
  assert.deepEqual(current, []);

  const retainedDividerColour = retainedLegacyStyleControls(capabilityProfileFor("separator"), { textColor: "#123456" });
  assert.deepEqual(retainedDividerColour.map(control => control.id), ["colour"], "an unowned saved text colour remains available as a legacy Studio control");
  assert.equal(retainedDividerColour[0].source, "studio");
  assert.deepEqual(retainedDividerColour[0].fields, ["textColor"]);
});

test("Author capability metadata records the implemented local profile controls", () => {
  const profile = capabilityProfileFor("author-name");
  const fields = Object.fromEntries(profile.controls.map(control => [control.id, control.fields]));
  assert.deepEqual(fields["avatar-size"], ["avatarSize"]);
  assert.deepEqual(fields["profile-image"], ["profileImage.src", "profileImage.mediaId", "profileImage.alt"]);
  assert.deepEqual(fields.biography, ["biography"]);
  assert.deepEqual(fields["profile-link"], ["profileUrl", "openInNewTab"]);
  assert.deepEqual(fields.duotone, ["duotone"]);
  assert.ok(profile.sections.some(section => section.id === "filters"), "the Main Editor pane includes the Author Filters section");
  assert.ok(!profile.unsupported.some(item => /avatar size|biography|author-link|profile image/i.test(item)));

  const inspector = read("app/studio/blocks/inspectors/block-inspector.tsx");
  assert.match(inspector, /block\.type === "author-name" && block\.profileImage \? <AuthorDuotoneInspector/);
  assert.match(inspector, /function AuthorDuotoneInspector[\s\S]*?<InspectorAccordionSection title="Filters">[\s\S]*?<DuotoneControl/);

  const documentation = read("app/studio/blocks/catalogue-documentation.ts");
  const authorDocumentation = documentation.slice(documentation.indexOf('  "author-name": {'), documentation.indexOf('  "post-date": {'));
  assert.match(authorDocumentation, /managed profile image/);
  assert.match(authorDocumentation, /defaults to 96px/);
  assert.match(authorDocumentation, /safe profile URL/);
  assert.match(authorDocumentation, /Duotone applies only to profile-image pixels/);
  assert.match(authorDocumentation, /separate author sub-blocks/);
});

test("resetting one optional inspector control clears only its owned style fields", () => {
  const profile = capabilityProfileFor("paragraph");
  const style = { fontSize: "large", fontSizeCustom: "22px", borderColor: "#123456", borderWidth: "2px", borderRadius: "5px", margin: "8px" };
  const afterBorderReset = resetInspectorStyleFields(style, ["border"], profile.controls);
  assert.deepEqual(afterBorderReset, { fontSize: "large", fontSizeCustom: "22px", borderRadius: "5px", margin: "8px" });
  const afterRadiusReset = resetInspectorStyleFields(afterBorderReset, ["radius"], profile.controls);
  assert.deepEqual(afterRadiusReset, { fontSize: "large", fontSizeCustom: "22px", margin: "8px" });
  assert.notEqual(afterBorderReset, style);
});

test("conditional Inspector options declare the setting they depend on", () => {
  for (const type of ["image", "cover-image"]) {
    const profile = capabilityProfileFor(type);
    for (const id of ["scale", "focal-position"]) {
      const control = profile.controls.find(item => item.id === id);
      assert.ok(control, `${type}:${id}`);
      assert.equal(control.dependency, "aspect-ratio");
      assert.match(control.availableWhen, /non-original aspect ratio/);
    }
  }

  const images = read("app/studio/studio-inspectors.tsx");
  assert.match(images, /\(block\.src \|\| block\.mediaId\) && ratio !== "original" && block\.scale !== "contain" \? <FocalPositionSetting/);
  assert.doesNotMatch(images, /function CoverImageStudioInspector|Studio cover options/);
  assert.doesNotMatch(capabilityProfileFor("cover-image").controls.find(control => control.id === "focal-position")?.availableWhen ?? "", /source is set/);
  assert.match(images, /ManagedBackgroundImageInspector block=\{block\}/);
  assert.doesNotMatch(images, /Studio cover options|Studio divider colour|Studio spacer width/);
  assert.match(read("app/studio/controls/image-dimensions-setting.tsx"), /showScale && aspectRatio !== "original"/);
  assert.match(images, /scaleOptions=\{\["cover", "contain", "fill"\]\}/);
  assert.match(read("app/studio/workspace-validation.ts"), /case "cover-image"[\s\S]*?\["cover", "contain", "fill"\]/);
  assert.match(read("app/studio/studio-html-editor.ts"), /element\.dataset\.scale === "fill" \? "fill"/);

  const specimen = read("app/studio/ui/blocks/block-specimen-catalogue.tsx");
  assert.match(specimen, /chooseFixtureMedia/);
  assert.match(specimen, /onOpenBackgroundMedia=\{chooseFixtureMedia\}/);
  assert.match(specimen, /"library-local-image-two"/);
});

test("Spacer size is a single Gutenberg-owned parent-aware control", () => {
  const spacer = capabilityProfileFor("spacer");
  const size = spacer.controls.find(control => control.id === "size");
  assert.equal(size?.source, "gutenberg");
  assert.deepEqual(size?.fields, ["height", "heightUnit", "width", "widthUnit"]);
  assert.deepEqual(size?.resetFields, size?.fields);
  assert.match(size?.label ?? "", /Height or width according to parent orientation/);
  assert.equal(spacer.controls.some(control => control.id === "width" && control.source === "studio"), false);
  assert.deepEqual(spacer.unsupported, ["Flex-child fill and drag handle"]);

  const inspector = read("app/studio/studio-inspectors.tsx");
  assert.match(inspector, /spacerOrientation=\{selectedSpacerOrientation\}/);
  assert.match(inspector, /const dimension = orientation === "horizontal" \? "width" : "height"/);
  assert.match(inspector, /const label = orientation === "horizontal" \? "Width" : "Height"/);
  assert.match(inspector, /defaultWidthByUnit: Record<SpacerUnit, number> = \{ px: 100/);

  const canvas = read("app/studio/studio-canvas.tsx");
  assert.match(canvas, /spacerOrientation=\{spacerOrientationForChildren\(block\)\}/);
  assert.match(canvas, /spacerDimensions\(block, spacerOrientation\)/);
  const templateInspector = read("app/studio/template-inspector.tsx");
  assert.match(templateInspector, /spacerOrientation=\{selectedSpacerOrientation\}/);
  const specimen = read("app/studio/ui/blocks/block-specimen-catalogue.tsx");
  assert.match(specimen, /spacerOrientation=\{spacerOrientationFor\(data\.blocks, inspectorBlock\.id\)\}/);
});

test("the block inspector exposes only Gutenberg-owned shared style groups", () => {
  assert.equal(hasScopedStyleControls(capabilityProfileFor("paragraph"), "gutenberg"), true);
  assert.equal(hasScopedStyleControls(capabilityProfileFor("subtitle"), "gutenberg"), false);
  for (const type of ["quote", "group", "columns", "social-icons", "author-name", "post-date", "code"]) {
    assert.equal(hasScopedStyleControls(capabilityProfileFor(type), "gutenberg"), true, type);
  }

  const inspector = read("app/studio/studio-inspectors.tsx");
  assert.match(inspector, /const visibleSource = profileOverride && profileOverride\.label === "List Item" \? undefined : block\.type === "subtitle" \? "studio" : "gutenberg"/);
  assert.match(inspector, /scopedStyleSectionIds\(profile, style, visibleSource\)/);
  assert.match(inspector, /background: showBackground \? <GroupBackgroundSection group canReset=/);
});

test("List compatibility records recursive nesting and independent List Item inspection", () => {
  const unsupported = capabilityProfileFor("list").unsupported;
  const itemProfile = listItemCapabilityProfile;
  assert.equal(itemProfile.type, "list-item");
  assert.equal(itemProfile.parentType, "list");
  assert.equal(capabilityProfileFor("list").nestedProfiles?.[0], itemProfile);
  assert.ok(itemProfile.sections.every(section => itemProfile.controls.some(control => control.section === section.id)));
  assert.ok(itemProfile.controls.every(control => control.fields.every(field => control.resetFields.includes(field))));
  assert.equal(itemProfile.controls.find(control => control.id === "colour")?.source, "studio");
  assert.deepEqual(itemProfile.controls.find(control => control.id === "colour")?.fields, ["textColor"]);
  assert.ok(itemProfile.dependencies.every(dependency => studioControlEntryById[dependency.id]));
  const lineHeightControl = itemProfile.controls.find(control => control.id === "line-height");
  assert.ok(lineHeightControl);
  assert.ok(itemProfile.dependencies.some(dependency => dependency.id === lineHeightControl.id));
  assert.deepEqual([...itemProfile.resetFields].sort(), ["additionalCss", "anchor", "appearance", "backgroundColor", "backgroundGradient", "backgroundImageMediaId", "backgroundSize", "backgroundRepeat", "backgroundFixedSize", "backgroundPositionX", "backgroundPositionY", "shadow", "borderColor", "borderRadius", "borderRadiusCorners", "borderStyle", "borderWidth", "borderWidthSides", "className", "fontFamily", "fontSize", "fontSizeCustom", "letterSpacing", "lineHeight", "linkColor", "linkHoverColor", "margin", "marginSides", "padding", "paddingSides", "textColor", "textDecoration", "textTransform"].sort());
  assert.deepEqual([...listItemSupportedStyleFields].sort(), ["responsive", ...new Set(itemProfile.controls.flatMap(control => control.fields))].sort());
  assert.ok(!unsupported.includes("Nested List Item blocks"));
  assert.ok(!unsupported.some(item => item.includes("List Item anchor")));
  assert.ok(!unsupported.includes("List Item block-level indent and outdent controls"));
  assert.deepEqual(unsupported, ["Footnote and inline-image insertion across multiple List Items"]);
  assert.deepEqual(itemProfile.unsupported, unsupported);

  const compatibility = read("docs/block-inspector-compatibility.md");
  assert.match(compatibility, /Recursive List editing, ordered marker\/start\/reverse controls and item-scoped formatting/);
  assert.match(compatibility, /Selected List Items use the shared style editor for text colour, family, appearance, size, line height/);
  assert.match(compatibility, /Advanced retains anchor, classes and safe Additional CSS/);
  assert.match(compatibility, /Item text colour and CSS fields are ACM extensions to the recorded pinned List Item contract/);
  assert.match(compatibility, /Single-item Footnote and inline-image insertion preserve the item and its nested content/);
  const canvas = ts.createSourceFile("studio-canvas.tsx", read("app/studio/studio-canvas.tsx"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const listField = canvas.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === "ListField")?.getText(canvas);
  assert.ok(listField, "the production ListField owns keyboard indentation");
  assert.match(listField, /event\.key === "Tab"/);
  assert.match(listField, /event\.shiftKey/);
  assert.match(read("app/studio/studio-canvas.tsx"), /<ListToolbarControls[^>]*onChange=\{changeList\}/);
  assert.match(compatibility, /Table cells and caption support rich text; cell spanning remains unsupported/);
  assert.doesNotMatch(compatibility, /Known typed-model gaps remain nested List Items/);
  assert.match(read("app/studio/blocks/list-item-inspector.tsx"), /new Set\(listItemSupportedStyleFields\)/);
  assert.match(read("app/studio/workspace-validation.ts"), /new Set\(listItemSupportedStyleFields\)/);
  assert.match(read("app/studio/ui/blocks/block-specimen-catalogue.tsx"), /profile\.nestedProfiles/);
});

test("every reusable Controls entry has a grouped anchor specimen and compatible direct route", () => {
  assert.equal(studioControlEntries.length, 48);
  assert.equal(new Set(studioControlEntries.map(entry => entry.id)).size, 48);
  assert.equal(studioControlEntryById["drag-placement"].group, "Foundation");
  for (const entry of studioControlEntries) {
    assert.equal(studioControlEntryById[entry.id], entry);
    assert.ok(entry.purpose && entry.owner && entry.consumers.length && entry.states && entry.compatibility, entry.id);
    assert.ok((read("app/studio/ui/controls/control-specimen.tsx") + read("app/studio/ui/controls/common-field-specimens.tsx")).includes(`"${entry.id}"`), entry.id);
  }

  const route = read("app/studio/ui/controls/[id]/page.tsx");
  const reset = read("app/studio/ui/controls/control-specimen.tsx");
  const catalogue = read("app/studio/ui/controls/controls-catalogue.tsx");
  const navigation = read("app/studio/ui/controls/controls-navigation.tsx");
  assert.match(route, /studioControlEntryById\[id\]/);
  assert.match(route, /notFound\(\)/);
  assert.match(route, /redirect\(`\/studio\/ui\/controls#\$\{encodeURIComponent\(entry\.id\)\}`\)/);
  assert.match(catalogue, /id=\{controlGroupId\(group\)\}/);
  assert.match(navigation, /href: hrefForDestination\(entry\.id\)/);
  assert.match(catalogue, /<ControlSpecimen entry=\{entry\} key=\{entry\.id\}/);
  assert.match(reset, /<section id=\{entry\.id\}/);
  assert.match(reset, /function resetExample\(\)/);
  assert.match(reset, /Example block specimens/);
});

test("shared line-height setting is used by block and List Item inspectors", () => {
  const setting = read("app/studio/controls/line-height-setting.tsx");
  const inspector = read("app/studio/studio-inspectors.tsx");
  const listItemInspector = read("app/studio/blocks/list-item-inspector.tsx");
  assert.match(setting, /inputMode="decimal"/);
  assert.match(setting, /placeholder="Default"/);
  assert.match(setting, /onChange\(event\.target\.value \|\| undefined\)/);
  assert.match(inspector, /<LineHeightSetting value=\{displayedStyle\.lineHeight\} onChange=\{value => updateStyle\("lineHeight", value\)\}/);
  assert.match(listItemInspector, /import \{ ParagraphInspector, ManagedBackgroundImageInspector \} from/);
  assert.match(listItemInspector, /profileOverride=\{listItemStyleInspectorProfile\}/);
  assert.match(listItemInspector, /block=\{\{[^\n]*type: "paragraph"[^\n]*style \}\}/);
  assert.match(listItemInspector, /for \(const field of listItemSupportedStyleFields\) changes\[field as keyof ParagraphStyle\] = next\.style\?/);
  assert.ok(listItemCapabilityProfile.controls.find(control => control.id === "line-height")?.fields.includes("lineHeight"));
  assert.match(listItemInspector, /updateStyles\(changes\)/);
  assert.doesNotMatch(listItemInspector, /LineHeightSetting/);
  assert.doesNotMatch(listItemInspector, /style\.lineHeight.*input/);
});
