import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { blockCapabilityProfiles, capabilityProfileFor, hasScopedStyleControls, resetInspectorStyleFields, retainedLegacyStyleControls, scopedStyleSectionIds } from "../app/studio/blocks/capability-profiles.ts";
import { studioControlEntries, studioControlEntryById } from "../app/studio/controls/library-catalogue.ts";

const read = path => readFileSync(resolve(path), "utf8");

test("all typed blocks and template Content have complete, ordered pane capability profiles", () => {
  const profiles = Object.values(blockCapabilityProfiles);
  const typedProfiles = profiles.filter(profile => profile.type !== "template-content");
  assert.equal(typedProfiles.length, 27);
  assert.equal(profiles.length, 28);
  assert.equal(new Set(profiles.map(profile => profile.type)).size, 28);

  for (const profile of profiles) {
    assert.ok(profile.label, profile.type);
    assert.ok(profile.mapping, profile.type);
    assert.ok(profile.sections.length || profile.defaultTab === "studio", profile.type);
    assert.ok(profile.sections.every(section => profile.controls.some(control => control.section === section.id)), profile.type);
    assert.ok(profile.controls.every(control => control.fields.length > 0), `${profile.type} has an unmapped pane control`);
    assert.ok(profile.controls.every(control => control.fields.every(field => control.resetFields.includes(field))), `${profile.type} does not reset each control's owned fields`);
    assert.ok(profile.controls.every(control => ["gutenberg", "studio"].includes(control.source)), profile.type);
    assert.ok(profile.controls.every(control => !control.availableWhen || control.dependency), `${profile.type} has an undeclared conditional dependency`);
  }

  assert.equal(capabilityProfileFor("template-content").defaultTab, "studio");
  assert.equal(capabilityProfileFor("component").defaultTab, "studio");
  assert.equal(capabilityProfileFor("field").defaultTab, "studio");
  assert.equal(capabilityProfileFor("section").defaultTab, "studio");
  assert.equal(capabilityProfileFor("footnotes").defaultTab, "block");

  const paragraph = capabilityProfileFor("paragraph");
  assert.deepEqual(paragraph.controls.find(control => control.id === "advanced")?.fields, ["anchor"]);
  assert.equal(paragraph.controls.find(control => control.id === "class-name")?.source, "studio");
  assert.deepEqual(paragraph.controls.find(control => control.id === "class-name")?.fields, ["className"]);
  assert.equal(paragraph.controls.find(control => control.id === "additional-css")?.source, "studio");
  assert.deepEqual(paragraph.controls.find(control => control.id === "additional-css")?.resetFields, ["additionalCss"]);

  const heading = capabilityProfileFor("heading");
  assert.deepEqual(heading.sections.map(section => section.id), ["text", "typography", "background", "dimensions", "border", "elements", "advanced"]);
  assert.deepEqual(scopedStyleSectionIds(heading, undefined, "gutenberg"), ["typography", "background", "dimensions", "border", "elements"]);
  assert.equal(heading.controls.find(control => control.id === "block-alignment")?.placement, "canvas");
  assert.equal(heading.sections.some(section => section.id === "canvas"), false);
  const headingPaneControls = heading.controls.filter(control => control.section === "text" && control.placement !== "canvas").map(control => control.id);
  assert.deepEqual(headingPaneControls, ["text-alignment", "level"]);
  const inspectorSource = read("app/studio/studio-inspectors.tsx");
  const headingMarkup = inspectorSource.slice(inspectorSource.indexOf("const blockSettings = ("), inspectorSource.indexOf("const studioSettings = ("));
  assert.ok(headingMarkup.indexOf('<span>Alignment</span>') < headingMarkup.indexOf('<span>Level</span>'), "Heading pane renders Alignment before Level");
  const table = capabilityProfileFor("table");
  for (const id of ["table-alignment", "column-alignment"]) assert.equal(table.controls.find(control => control.id === id)?.placement, "canvas", `table:${id}`);
  assert.ok(!table.sections.some(section => ["table-alignment", "column-alignment"].includes(section.id)));
  const columns = capabilityProfileFor("columns");
  assert.equal(columns.controls.find(control => control.id === "outer-alignment")?.placement, "canvas");
  assert.deepEqual(columns.controls.find(control => control.id === "outer-alignment")?.fields, ["blockAlign"]);

  const paneOrder = type => capabilityProfileFor(type).controls
    .filter(control => control.source === "gutenberg" && control.placement !== "canvas" && control.section === "media")
    .map(control => control.id);
  assert.deepEqual(paneOrder("image"), ["source", "alternative-text", "caption", "link-destination", "image-style", "display-dimensions", "aspect-ratio", "scale", "focal-position"]);
  const imageInspector = inspectorSource.slice(inspectorSource.indexOf("function ImageInspector"), inspectorSource.indexOf("function CoverImageInspector"));
  assert.ok(imageInspector.indexOf('<InspectorAccordionSection title="Styles">') < imageInspector.indexOf('<InspectorAccordionSection title="Dimensions">'), "Image styles render before dimensions");
  assert.ok(imageInspector.indexOf("<ImageDimensionsSetting") < imageInspector.indexOf("<FocalPositionSetting"), "Image dimensions render before focal position");

  const columnPaneOrder = columns.controls.filter(control => control.source === "gutenberg" && control.placement !== "canvas" && control.section === "layout").map(control => control.id);
  assert.deepEqual(columnPaneOrder, ["column-count", "stack-on-mobile"]);
  const columnsStudioOrder = columns.controls.filter(control => control.source === "studio" && control.section === "layout").map(control => control.id);
  assert.deepEqual(columnsStudioOrder, ["preset", "vertical-alignment", "gaps", "content-width", "responsive-stack"]);
  assert.deepEqual(columns.controls.find(control => control.id === "column-count")?.fields, ["children"]);
  const columnsInspector = inspectorSource.slice(inspectorSource.indexOf("function ColumnsInspector"), inspectorSource.indexOf("function ColumnInspector"));
  assert.ok(columnsInspector.indexOf("column-count-controls") < columnsInspector.indexOf("Stack on mobile"), "Columns count precedes the Gutenberg stack toggle");
  assert.ok(columnsInspector.indexOf("Stack on mobile") < columnsInspector.indexOf("function ColumnsStudioInspector"), "Gutenberg stack toggle stays out of the Studio controls");
  assert.ok(columnsInspector.indexOf("COLUMN_LAYOUT_PRESETS.map") > columnsInspector.indexOf("function ColumnsStudioInspector"), "Column presets belong to the Studio inspector");

  const groupPaneOrder = capabilityProfileFor("group").controls.filter(control => control.source === "gutenberg" && control.placement !== "canvas" && control.section === "layout").map(control => control.id);
  assert.deepEqual(groupPaneOrder, ["layout", "sticky", "alignment", "gaps", "padding", "content-width", "columns", "grid", "semantic-element"]);
  const sectionPaneOrder = capabilityProfileFor("section").controls.filter(control => control.source === "gutenberg" && control.placement !== "canvas" && control.section === "layout").map(control => control.id);
  assert.deepEqual(sectionPaneOrder, ["layout", "alignment", "gaps", "padding", "content-width", "columns", "grid"]);
  for (const type of ["group", "section"]) {
    const profile = capabilityProfileFor(type);
    assert.deepEqual(profile.controls.find(control => control.id === "alignment")?.fields, ["horizontalAlign", "verticalAlign"], `${type} alignment fields`);
    assert.deepEqual(profile.controls.find(control => control.id === "gaps")?.fields, ["gap", "columnGap", "rowGap"], `${type} gap fields`);
    assert.deepEqual(profile.controls.find(control => control.id === "padding")?.fields, ["paddingX", "paddingY"], `${type} padding fields`);
    assert.deepEqual(profile.controls.find(control => control.id === "content-width")?.fields, ["contentWidth"], `${type} content width fields`);
    const columnsSetting = profile.controls.find(control => control.id === "columns");
    assert.deepEqual(columnsSetting?.fields, ["columns"], `${type} column count fields`);
    assert.equal(columnsSetting?.dependency, "layout");
    assert.match(columnsSetting?.availableWhen ?? "", /layout is Columns/);
    const gridSetting = profile.controls.find(control => control.id === "grid");
    assert.deepEqual(gridSetting?.fields, ["columns", "minColumnWidth"], `${type} grid fields`);
    assert.equal(gridSetting?.dependency, "layout");
    assert.match(gridSetting?.availableWhen ?? "", /layout is Grid/);
  }
  const layoutInspector = inspectorSource.slice(inspectorSource.indexOf("function LayoutInspector"), inspectorSource.indexOf("type ColumnsBlock"));
  assert.ok(layoutInspector.indexOf("<span>Arrangement</span>") < layoutInspector.indexOf("<span>Position</span>"), "Layout arrangement renders before Group sticky position");
  assert.ok(layoutInspector.indexOf("<span>Position</span>") < layoutInspector.indexOf("<span>Horizontal alignment</span>"), "Group sticky position renders before alignment controls");
  assert.ok(layoutInspector.indexOf("<span>Vertical alignment</span>") < layoutInspector.indexOf('label="Horizontal gap"'), "Layout alignment renders before gap controls");
  assert.ok(layoutInspector.indexOf('label="Vertical padding"') < layoutInspector.indexOf("<span>Content width</span>"), "Layout padding renders before content width");
  assert.ok(layoutInspector.indexOf("<span>Content width</span>") < layoutInspector.indexOf("{block.layout === \"columns\""), "Layout content width renders before conditional Columns count");
  assert.ok(layoutInspector.indexOf("{block.layout === \"columns\"") < layoutInspector.indexOf("{block.layout === \"grid\""), "Conditional Columns count renders before grid options");
  const columnPane = capabilityProfileFor("column");
  assert.deepEqual(columnPane.controls.filter(control => control.source === "gutenberg" && control.section === "layout").map(control => control.id), ["width", "gap"]);
  assert.equal(columnPane.controls.find(control => control.id === "vertical-alignment")?.source, "studio");
  assert.deepEqual(columnPane.controls.find(control => control.id === "gap")?.fields, ["rowGap", "gap"]);
  const singleColumnInspector = inspectorSource.slice(inspectorSource.indexOf("function ColumnInspector"), inspectorSource.indexOf("function ComponentInspector"));
  assert.ok(singleColumnInspector.indexOf('label="Block gap"') < singleColumnInspector.indexOf("<span>Vertical alignment</span>"), "Column vertical alignment remains a Studio option");

  for (const [type, id] of [["quote", "attribution"], ["quote", "text-alignment"], ["list", "list-style"], ["table", "caption"], ["divider", "colour"], ["cover-image", "focal-position"], ["social-linkedin", "profile-url"], ["post-author", "alignment"], ["post-date", "alignment"], ["document-title", "level"]]) {
    assert.equal(capabilityProfileFor(type).controls.find(control => control.id === id)?.source, "studio", `${type}:${id} is Studio-owned`);
  }
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
  const profile = capabilityProfileFor("post-author");
  const retained = retainedLegacyStyleControls(profile, { textColor: "#333333", borderColor: "#123456", borderWidth: "3px" });
  assert.deepEqual(retained.map(control => control.id), ["border"]);
  assert.equal(retained[0].source, "studio");
  assert.deepEqual(retained[0].fields, ["borderColor", "borderStyle", "borderWidth"]);
  assert.deepEqual(scopedStyleSectionIds(profile, { borderColor: "#123456" }, "studio"), ["border"]);

  const current = retainedLegacyStyleControls(profile, { textColor: "#333333" });
  assert.deepEqual(current, []);

  assert.deepEqual(retainedLegacyStyleControls(capabilityProfileFor("divider"), { textColor: "#123456" }), [], "a nested profile field still owns its leaf style value");
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
  const coverStudioInspector = images.slice(images.indexOf("function CoverImageStudioInspector"), images.indexOf("function DividerInspector"));
  assert.match(coverStudioInspector, /\(block\.aspectRatio \?\? "original"\) !== "original" && block\.scale !== "contain" && block\.scale !== "fill" \? <FocalPositionSetting/);
  assert.doesNotMatch(capabilityProfileFor("cover-image").controls.find(control => control.id === "focal-position")?.availableWhen ?? "", /source is set/);
  assert.match(images, /ManagedBackgroundImageInspector block=\{block\}/);
  assert.match(images, /fields=\{\{ anchor: false, className: true, additionalCss: true \}\}/);
  assert.match(read("app/studio/controls/image-dimensions-setting.tsx"), /showScale && aspectRatio !== "original"/);
  assert.match(images, /scaleOptions=\{\["cover", "contain", "fill"\]\}/);
  assert.match(read("app/studio/workspace-validation.ts"), /case "cover-image"[\s\S]*?\["cover", "contain", "fill"\]/);
  assert.match(read("app/studio/studio-html-editor.ts"), /element\.dataset\.scale === "fill" \? "fill"/);

  const specimen = read("app/studio/ui/blocks/block-specimen-catalogue.tsx");
  assert.match(specimen, /chooseFixtureMedia/);
  assert.match(specimen, /onOpenBackgroundMedia=\{chooseFixtureMedia\}/);
  assert.match(specimen, /"library-local-image-two"/);
});

test("Studio only mounts shared style groups when the profile owns Studio style controls", () => {
  assert.equal(hasScopedStyleControls(capabilityProfileFor("paragraph"), "studio"), true);
  assert.equal(hasScopedStyleControls(capabilityProfileFor("document-subtitle"), "studio"), true);
  for (const type of ["quote", "group", "columns", "social-icons", "post-author", "post-date", "code"]) {
    assert.equal(hasScopedStyleControls(capabilityProfileFor(type), "studio"), false, type);
  }

  const inspector = read("app/studio/studio-inspectors.tsx");
  assert.match(inspector, /hasScopedStyleControls\(profile, "studio"\)/);
  assert.match(inspector, /scopedStyleSectionIds\(profile, style, visibleSource\)/);
  assert.match(inspector, /background: showBackground \? <InspectorAccordionSection className="inspector-panel" title="Background">/);
});

test("every reusable Controls entry has a detail route, reset specimen and actual block consumers", () => {
  assert.equal(studioControlEntries.length, 12);
  assert.equal(new Set(studioControlEntries.map(entry => entry.id)).size, 12);
  for (const entry of studioControlEntries) {
    assert.equal(studioControlEntryById[entry.id], entry);
    assert.ok(entry.purpose && entry.owner && entry.consumers.length && entry.states && entry.compatibility, entry.id);
    assert.ok(read("app/studio/ui/controls/control-specimen.tsx").includes(`"${entry.id}"`), entry.id);
  }

  const route = read("app/studio/ui/controls/[id]/page.tsx");
  const reset = read("app/studio/ui/controls/control-specimen.tsx");
  const redirects = read("app/studio/ui/controls/legacy-control-hash-redirect.tsx");
  assert.match(route, /studioControlEntryById\[id\]/);
  assert.match(route, /notFound\(\)/);
  assert.match(reset, /function resetExample\(\)/);
  assert.match(reset, /Related block specimens/);
  assert.match(redirects, /window\.location\.replace/);
  for (const entry of studioControlEntries.slice(0, 6)) assert.ok(redirects.includes("studioControlEntryById[id]"), entry.id);
});
