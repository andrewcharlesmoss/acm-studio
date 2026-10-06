import assert from "node:assert/strict";
import test from "node:test";
import { resolve } from "node:path";
import { readStudioSource } from "./studio-module-source.mjs";

const read = (path) => readStudioSource(path);

test("Controls renders catalogue entry anchors and resolves grouped navigation", async () => {
  const { createRequire } = await import("node:module");
  const { pathToFileURL } = await import("node:url");
  const { default: ts } = await import("typescript");
  const { createElement } = await import("react");
  const { renderToStaticMarkup } = await import("react-dom/server");
  const { studioControlEntries, studioControlGroups } = await import("../app/studio/controls/library-catalogue.ts");
  const require = createRequire(import.meta.url);
  const dataModule = source => `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;
  const catalogueUrl = pathToFileURL(resolve("app/studio/controls/library-catalogue.ts")).href;
  const compile = (source, replacements = {}) => dataModule(ts.transpileModule(source, { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.ESNext } }).outputText
    .replace(/from "([^"]+)"/g, (match, name) => `from ${JSON.stringify(name.startsWith("react") ? pathToFileURL(require.resolve(name)).href : replacements[name] ?? name)}`));
  const navigationUrl = compile(read("app/studio/ui/controls/controls-navigation.tsx"), { "../../controls/library-catalogue": catalogueUrl });
  const wrapperUrl = dataModule("export function StudioUiLibrary({ children }) { return children; }");
  const specimenUrl = dataModule(`import { createElement } from ${JSON.stringify(pathToFileURL(require.resolve("react")).href)}; export function ControlSpecimen({ entry }) { return createElement("section", { id: entry.id }, entry.title); }`);
  const { ControlsCatalogue } = await import(compile(read("app/studio/ui/controls/controls-catalogue.tsx"), {
    "../../controls/library-catalogue": catalogueUrl, "../studio-ui-library": wrapperUrl,
    "./control-specimen": specimenUrl, "./controls-navigation": navigationUrl,
    "../../controls/range-colours": pathToFileURL(resolve("app/studio/controls/range-colours.ts")).href,
  }));
  const html = renderToStaticMarkup(createElement(ControlsCatalogue));
  const ids = [...html.matchAll(/ id="([^"]+)"/g)].map(match => match[1]);
  assert.equal(new Set(ids).size, ids.length, "Group, heading and specimen IDs are unique");
  for (const [, target] of html.matchAll(/href="#([^"]+)"/g)) assert.ok(ids.includes(target), `Unresolved jump link: ${target}`);
  for (const entry of studioControlEntries) assert.ok(ids.includes(entry.id), entry.id);
  assert.equal([...html.matchAll(/class="ui-control-group"/g)].length, studioControlGroups.length);
});

test("Studio UI Library uses accessible in-place tabs and retains section entry routes", () => {
  const shell = read("app/studio/ui/studio-ui-library.tsx");
  const host = read("app/studio/ui/studio-ui-section-host.tsx");
  for (const section of ["workspace", "navigation", "ribbon", "panes", "panels", "blocks", "controls", "icons", "styles"]) {
    assert.match(shell, new RegExp(`id: "${section}"`));
    assert.match(host, new RegExp(`${section}: \\(\\) => import\\(`), `${section} is lazy-loaded`);
  }
  assert.match(shell, /role="tablist"/);
  assert.match(shell, /role="tab"/);
  assert.match(shell, /aria-selected=\{activeSection === item\.id\}/);
  assert.match(shell, /event\.key === "ArrowRight"/);
  assert.match(shell, /event\.key === "ArrowLeft"/);
  assert.match(shell, /event\.key === "Home"/);
  assert.match(shell, /event\.key === "End"/);
  assert.match(host, /activeSection === section \? children/);
  assert.match(host, /class SectionLoadErrorBoundary/);
  assert.match(host, /role="alert"/);
  for (const route of ["app/studio/ui/page.tsx", "app/studio/ui/navigation/page.tsx", "app/studio/ui/ribbon/page.tsx", "app/studio/ui/panes/page.tsx", "app/studio/ui/panels/page.tsx", "app/studio/ui/blocks/page.tsx", "app/studio/ui/blocks/paragraph/page.tsx", "app/studio/ui/controls/page.tsx", "app/studio/ui/icons/page.tsx", "app/studio/ui/styles/page.tsx"]) {
    assert.match(read(route), /StudioUiSectionHost/, route);
  }
  assert.match(read("app/studio/ribbon/page.tsx"), /redirect\("\/studio\/ui\/ribbon"\)/);
  assert.match(read("app/studio/panes/page.tsx"), /redirect\("\/studio\/ui\/panes"\)/);
  assert.match(read("app/studio/ui/styles/page.tsx"), /StyleGuideSandbox/);
  assert.match(read("app/studio/ui/style-guide.css"), /\.sg-guide-views \{[^}]*contain: paint/);
});

test("top kickers use uppercase styling across the Studio UI Library sections", () => {
  const styles = read("app/studio/ui/studio-ui-library.css");
  assert.match(styles, /\.ui-library-content \.ui-page-intro > \.rl-eyebrow,/);
  assert.match(styles, /\.ui-library-content \.ui-ribbon-page > \.rl-title > \.rl-eyebrow,/);
  assert.match(styles, /\.ui-library-content \.ui-pane-page \.pl-catalogue > \.pl-intro > \.pl-eyebrow \{ text-transform: uppercase; \}/);
});

test("Block Library routes use one capability profile and production inspector specimen", () => {
  const definition = read("app/studio/blocks/paragraph/definition.ts");
  const specimen = read("app/studio/ui/blocks/block-specimen-catalogue.tsx");
  const inspector = read("app/studio/studio-inspectors.tsx");
  const studioStyles = read("app/studio/studio.css");
  assert.match(definition, /paragraphInspectorProfile/);
  assert.match(definition, /availableBlockTransforms/);
  assert.match(inspector, /capabilityProfileFor\(block\.type\)/);
  assert.match(inspector, /const styleControls = \[\.\.\.profile\.controls, \.\.\.retainedLegacyStyleControls\(profile, style\)\]/);
  assert.match(inspector, /resetSupportedInspectorStyleFields\(style, selectedIds, styleControls\)/);
  assert.match(inspector, /className=\{`advanced-fields-section\$\{block\.type === "paragraph" \? " paragraph-advanced-fields" : ""\}`\}/);
  assert.match(studioStyles, /\.inspector-sections \.advanced-fields-section > h2 \{[^}]*text-transform: none/);
  assert.match(specimen, /<BlockField/);
  assert.match(specimen, /buttonPreview=\{buttonPreview\}/);
  assert.match(specimen, /onButtonPreviewChange=\{setButtonPreview\}/);
  assert.match(specimen, /setButtonPreview\(null\)/);
  assert.match(specimen, /<BlockInspector/);
  assert.match(specimen, /<BlockRenderer[^>]+variant="studio"/);
  assert.match(specimen, /specimenBlocks\.length > 1/);
  assert.match(specimen, /setSelectedId\(block\.id\)/);
  assert.match(specimen, /Temporary example document/);
  assert.match(specimen, /id="control-inventory"/);
  assert.match(specimen, /id="compatibility-notes"/);
  assert.match(specimen, /window\.addEventListener\("hashchange", openHashDisclosure\)/);
  assert.match(read("app/studio/ui/blocks/catalogue.css"), /\.ui-block-canvas \{[^}]*overflow-x:clip/);
  assert.match(read("app/studio/ui/blocks/catalogue.css"), /@media \(max-width:900px\) \{\s*\.ui-block-editor-layout \{ grid-template-columns:minmax\(0,1fr\); \}\s*\.ui-block-inspector \{ border-left:0; border-top:1px solid var\(--rl-line\); \}/);
  assert.match(specimen, /ref=\{specimenRef\}/);
  assert.match(specimen, /profile\.dependencies\.map/);
  assert.match(specimen, /profile\.sections\.map/);
  assert.match(definition, /libraryHref: "\/studio\/ui\/blocks\/paragraph"/);
  assert.match(specimen, /Reset Example/);
  assert.match(specimen, /historyRef\.current\.past/);
  assert.match(specimen, /Undo and Redo apply to the temporary block and example document/);
  assert.match(specimen, /className="ui-block-sample-note"/);
  assert.doesNotMatch(specimen, /studioWriteOwnership|localStorage|sessionStorage/);
  assert.match(read("app/studio/ui/blocks/page.tsx"), /<BlockLibraryCatalogue initialType=\{null\} \/>/);
});

test("shared inspector icons link back to their Studio catalogue examples", () => {
  const icons = read("app/studio/ui/icons-catalogue.tsx");
  for (const [symbol, expectedConsumers] of [
    ["action.remove", [["Clear background colour control", "/studio/ui/controls#background-selection"]]],
    ["state.warning", [["Background contrast warning", "/studio/ui/controls#background-selection"]]],
    ["action.adjust", [["Box dimensions controls", "/studio/ui/controls#box-length"]]],
    ["action.add", [["Inspector options and block inserter controls", "/studio/ui/blocks/paragraph"]]],
    ["action.delete", [["Remove blocks, List View items and cover images", "/studio/ui/blocks/group"]]],
    ["action.duplicate", [["Duplicate block action", "/studio/ui/blocks/group"]]],
    ["action.edit", [["Edit inline text links", "/studio/ui/blocks/paragraph"]]],
    ["action.link", [["Add a link to selected text", "/studio/ui/blocks/paragraph"]]],
    ["action.undo", [["Reset Pane demo", "/studio/ui/panes"]]],
    ["navigation.chevron-right", [["Pane collapse controls", "/studio/ui/panes"]]],
    ["arrange.move-down", [["Move blocks down in the editor canvas", "/studio/ui/blocks/group"], ["Move selected blocks down in List View", "/studio/ui/blocks/group"]]],
    ["arrange.move-up", [["Move blocks up in the editor canvas", "/studio/ui/blocks/group"], ["Move selected blocks up in List View", "/studio/ui/blocks/group"]]],
    ["view.hide", [["Hide a page on the design canvas", "/studio/designs"], ["Mask a Site Settings value", "/studio/sites/mini-golf-scorecard"]]],
    ["view.show", [["Show a hidden page on the design canvas", "/studio/designs"], ["Reveal a masked Site Settings value", "/studio/sites/mini-golf-scorecard"]]],
    ["text.bold", [["Bold inline text formatting", "/studio/ui/blocks/paragraph"]]],
    ["text.footnote", [["Insert an inline footnote", "/studio/ui/blocks/paragraph"]]],
    ["text.italic", [["Italic inline text formatting", "/studio/ui/blocks/paragraph"]]],
    ["text.language", [["Set inline text language", "/studio/ui/blocks/paragraph"]]],
    ["text.math", [["Insert inline mathematical notation", "/studio/ui/blocks/paragraph"]]],
    ["insert.highlight", [["Highlight inline text", "/studio/ui/blocks/paragraph"]]],
    ["insert.image", [["Insert an inline image in text", "/studio/ui/blocks/paragraph"]]],
    ["text.code", [["Format inline code", "/studio/ui/blocks/paragraph"]]],
    ["text.keyboard", [["Format keyboard input", "/studio/ui/blocks/paragraph"]]],
    ["text.strikethrough", [["Format strikethrough text", "/studio/ui/blocks/paragraph"]]],
    ["text.subscript", [["Format subscript text", "/studio/ui/blocks/paragraph"]]],
    ["text.superscript", [["Format superscript text", "/studio/ui/blocks/paragraph"]]],
    ["block.heading", [["Transform a block to Heading", "/studio/ui/blocks/heading"]]],
    ["block.list", [["Transform a block to List", "/studio/ui/blocks/list"]]],
    ["text.paragraph", [["Transform a block to Paragraph", "/studio/ui/blocks/paragraph"]]],
    ["text.quote", [["Transform a block to Quote", "/studio/ui/blocks/quote"]]],
    ["action.close", [["Colour and gradient picker close controls", "/studio/ui/controls#background-selection"], ["Inspector options menu close control", "/studio/ui/controls#inspector-tools"], ["Remove a selected block", "/studio/ui/blocks/group"], ["Collapse a Pane from its header", "/studio/ui/panes"]]],
    ["action.copy", [["Gradient stop colour copy control", "/studio/ui/controls#background-selection"], ["Design canvas Copy, Paste and duplicate actions", "/studio/designs"]]],
    ["action.more", [["Block toolbar options menu", "/studio/ui/blocks/group"]]],
    ["action.more", [["Inspector options menu", "/studio/ui/blocks/paragraph"]]],
    ["navigation.external", [["Paragraph Advanced help link", "/studio/ui/blocks/paragraph"]]],
    ["state.selected", [["Selected custom font size unit", "/studio/ui/blocks/paragraph"]]],
    ["table.cell", [["Table options menu", "/studio/ui/blocks/table"]]],
    ["navigation.back", [["Studio navigation and publish-date previous-month control", "/studio"]]],
    ["navigation.forward", [["Studio navigation and publish-date next-month control", "/studio"]]],
  ]) {
    const entryStart = icons.indexOf(`"${symbol}":`);
    const entry = entryStart < 0 ? "" : icons.slice(entryStart, icons.indexOf("\n", entryStart));
    for (const [label, href] of expectedConsumers) {
      assert.ok(entry.includes(`label: "${label}"`), `${symbol} identifies ${label}`);
      assert.ok(entry.includes(`href: "${href}"`), `${symbol} links to ${href}`);
    }
  }
  assert.match(icons, /const blockConsumers = blockLibraryCatalogue\.filter/);
  assert.match(icons, /href: `\/studio\/ui\/icons\?collection=blocks&block=/);
  assert.match(icons, /consumer\.href\.startsWith\("\/studio\/ui\/"\) \? "Studio UI Library" : "ACM Studio"/);
  const wrapper = read("app/studio/studio-icons.tsx");
  assert.match(wrapper, /pencil: "action\.edit"/);
  assert.match(wrapper, /trash: "action\.delete"/);
});

test("Block Library index groups typed blocks, nested/system entries and template Content", () => {
  const catalogue = read("app/studio/blocks/library-catalogue.ts");
  const navigation = read("app/studio/ui/blocks/block-library-navigation.tsx");
  const index = read("app/studio/ui/blocks/page.tsx");
  const profile = read("app/studio/blocks/capability-profiles.ts");
  const paragraph = read("app/studio/ui/blocks/paragraph/page.tsx");
  assert.match(catalogue, /blockCatalogue\.map/);
  assert.match(catalogue, /nonInsertableEntries/);
  assert.match(profile, /"template-content"/);
  assert.match(profile, /controlFieldsByBlock/);
  assert.match(navigation, /aria-label="Block Library"/);
  assert.match(navigation, /aria-current=\{active === "all" \? "location" : undefined\}/);
  assert.match(navigation, /aria-current=\{active === entry\.type \? "location" : undefined\}/);
  assert.match(read("app/studio/ui/blocks/block-specimen-catalogue.tsx"), /<BlockLibraryNavigation active=\{selectedType \?\? "all"\} onSelect=\{selectType\} \/>/);
  assert.match(catalogue, /const baseEntries = blockCatalogue\.map/);
  assert.match(index, /<BlockLibraryCatalogue initialType=\{null\} \/>/);
  assert.match(paragraph, /<BlockLibraryCatalogue initialType="paragraph" \/>/);
  assert.match(catalogue, /type: "column"/);
  assert.match(catalogue, /type: "footnotes"/);
  assert.match(catalogue, /type: "component"/);
  assert.match(catalogue, /templateContentBlock/);
  assert.match(read("app/studio/ui/catalogue-navigation.css"), /\.ui-catalogue-navigation-list a\[aria-current="page"\]/);
});

test("Controls catalogue groups live specimens and preserves direct routes into each anchor", () => {
  const page = read("app/studio/ui/controls/controls-catalogue.tsx");
  const navigation = read("app/studio/ui/controls/controls-navigation.tsx");
  const detail = read("app/studio/ui/controls/control-specimen.tsx");
  const metadata = read("app/studio/controls/library-catalogue.ts");
  const route = read("app/studio/ui/controls/[id]/page.tsx");
  const colour = read("app/studio/controls/colour-picker.tsx");
  const inspectors = read("app/studio/studio-inspectors.tsx");
  const boxLength = read("app/studio/box-length-setting.tsx");
  const paragraphLength = read("app/studio/controls/paragraph-length-setting.tsx");
  const studioStyles = read("app/studio/studio.css");
  const globals = read("app/globals.css");
  assert.match(page, /<ControlsNavigation \/>/);
  assert.match(navigation, /window\.addEventListener\("scroll", scheduleActiveControlUpdate/);
  assert.match(navigation, /const marker = window\.innerHeight \/ 2;/);
  assert.match(navigation, /getBoundingClientRect\(\)\.top > marker/);
  assert.match(navigation, /aria-current=\{activeId === entry\.id \? "location" : undefined\}/);
  assert.match(navigation, /requestAnimationFrame/);
  assert.match(navigation, /studioControlGroups\.flatMap\(group => studioControlEntries\.filter\(entry => entry\.group === group\)\)/);
  assert.match(navigation, /for \(const entry of orderedControlEntries\)/);
  assert.match(read("app/studio/controls/library-catalogue.ts"), /\["Foundation", "Colour", "Typography", "Sizing", "Style", "Media", "Inspector"\]/);
  assert.match(navigation, /href=\{`#\$\{entry\.id\}`\}/);
  assert.match(page, /<ControlSpecimen entry=\{entry\} key=\{entry\.id\}/);
  for (const [prop, value] of [["sliderAccent", "effectiveSliderAccent"], ["sliderHoverAccent", "effectiveSliderHoverAccent"], ["sliderPressAccent", "effectiveSliderPressAccent"], ["onSliderAccentChange", "setSliderAccent"], ["onSliderHoverAccentChange", "setSliderHoverAccent"], ["onSliderPressAccentChange", "setSliderPressAccent"]]) assert.ok(page.includes(`${prop}={${value}}`), prop);
  assert.match(detail, /<section id=\{entry\.id\}/);
  assert.match(detail, /<h3 id=\{`control-entry-\$\{entry\.id\}`\}>/);
  assert.match(detail, /<h4 id=\{`control-specimen-\$\{entry\.id\}`\}>/);
  assert.match(detail, /<ColourPicker/);
  assert.match(detail, /paletteClassName="ui-control-colour-palette"/);
  const colourPicker = read("app/studio/controls/colour-picker.tsx");
  assert.match(colourPicker, /watchInspectorPopover\(anchor, paletteRef\.current, 262,/);
  assert.match(colourPicker, /--colour-swatch-size/);
  assert.match(colourPicker, /--colour-swatch-columns/);
  assert.match(colourPicker, /Math\.max\(3, Math\.min\(6,/);
  assert.match(colourPicker, /paragraph-colour-preview-card/);
  assert.match(colourPicker, /paragraph-colour-theme-heading/);
  assert.match(colourPicker, /paragraph-colour-clear/);
  assert.match(colourPicker, /activeValue \? <StudioButton variant="text" type="button" className="paragraph-colour-clear" disabled=\{disabled\} onClick=\{\(\) => changeActiveColour\(undefined\)\}>Clear<\/StudioButton> : null/);
  const gradientPicker = read("app/studio/controls/gradient-picker.tsx");
  assert.match(gradientPicker, /\{value \? <div className="paragraph-gradient-footer"><StudioButton variant="text" type="button" onClick=/);
  assert.match(read("app/globals.css"), /--gutenberg-accent: #3858e9/);
  assert.match(studioStyles, /\.studio-text-action \{[^}]*--acm-action-color: color-mix\(in srgb, var\(--acm-color-accent\) 80%, black\)/);
  assert.doesNotMatch(studioStyles, /\.studio-clear-action/);
  const actionStyles = read("../acm-styles/src/styles.css");
  assert.match(actionStyles, /\.acm-button\.acm-button-text:focus-visible/);
  assert.match(actionStyles, /\.acm-button\.acm-button-text:disabled/);
  assert.match(studioStyles, /\.paragraph-gradient-angle-dial span::after \{[^}]*background: var\(--gutenberg-accent\)/);
  assert.match(studioStyles, /\.paragraph-colour-preview-card \{[^}]*width: max-content; min-width: min\(148px, 100%\); max-width: 100%/);
  assert.match(studioStyles, /\.paragraph-colour-preview \{[^}]*height: 64px/);
  assert.match(colourPicker, /Math\.floor\(\(swatchGridWidth \+ 12\) \/ 40\)/);
  assert.match(colourPicker, /Math\.min\(28, \(swatchGridWidth/);
  assert.match(studioStyles, /--colour-swatch-size, 28px/);
  assert.match(studioStyles, /\.paragraph-theme-colour-palette \.paragraph-colour-swatch > span \{ box-sizing: border-box; border-width: 1px/);
  assert.match(studioStyles, /\.paragraph-theme-colour-palette \.paragraph-colour-swatch \{[^}]*var\(--colour-swatch-size/);
  assert.match(detail, /<CustomFontSizeSetting/);
  assert.match(detail, /<ParagraphLengthSetting/);
  assert.match(detail, /<BoxLengthSetting/);
  assert.match(detail, /<InspectorToolsSection/);
  assert.match(detail, /<InspectorAccordionSection/);
  assert.match(detail, /<BorderSettings/);
  assert.match(detail, /<FontSizeAppearanceSetting/);
  assert.match(detail, /<BackgroundSelection/);
  assert.match(detail, /<PresetNumberSetting/);
  assert.match(detail, /<ImageDimensionsSetting/);
  assert.match(detail, /<FocalPositionSetting/);
  assert.match(detail, /Ownership, consumers, dependencies and compatibility/);
  assert.match(detail, /<StudioIcon name="chevron-right" size=\{16\} \/>/);
  assert.match(read("app/studio/ui/controls/catalogue.css"), /\.ui-control-facts\[open\] > summary svg \{ transform:rotate\(90deg\); \}/);
  assert.match(detail, /Reset example/);
  assert.match(route, /studioControlEntryById\[id\]/);
  assert.match(route, /notFound\(\)/);
  assert.match(route, /redirect\(`\/studio\/ui\/controls#\$\{encodeURIComponent\(entry\.id\)\}`\)/);
  assert.match(metadata, /"background-selection"/);
  assert.match(metadata, /"font-size-appearance"/);
  assert.match(metadata, /"image-dimensions"/);
  assert.match(metadata, /"focal-position"/);
  assert.match(metadata, /"preset-number"/);
  assert.match(globals, /--studio-number-field-width: 80px/);
  assert.match(studioStyles, /\.inspector-sections input\[type="number"\] \{ width: var\(--studio-number-field-width\); \}/);
  assert.match(studioStyles, /\.paragraph-length-controls \{[^}]*grid-template-columns: minmax\(60px, 1fr\) var\(--studio-number-field-width\)/);
  assert.match(studioStyles, /\.box-length-custom \{[^}]*grid-template-columns: var\(--studio-number-field-width\) 70px/);
  assert.match(studioStyles, /\.paragraph-custom-font-size-input input\[type="number"\],\.paragraph-length-controls input\[type="number"\],\.box-length-custom input\[type="number"\] \{ font-family: var\(--studio-ui-font\); font-size: var\(--studio-ui-size\); \}/);
  assert.match(studioStyles, /\.paragraph-custom-font-size-input input\[type="number"\][^}]*width: var\(--studio-number-field-width\)/);
  assert.match(studioStyles, /\.paragraph-reset-button \{[^}]*color: var\(--ink\)/);
  assert.match(studioStyles, /\.paragraph-reset-button:disabled \{[^}]*color: var\(--muted\)/);
  assert.match(read("app/studio/ui/controls/catalogue.css"), /\.ui-control-live \{ width:min\(100%,320px\)/);
  assert.match(read("app/studio/ui/controls/catalogue.css"), /\.ui-controls-layout \{ --accent:var\(--gutenberg-accent\)/);
  assert.match(read("app/studio/ui/controls/catalogue.css"), /\.ui-control-colour-palette \{ --accent:var\(--gutenberg-accent\)/);
  assert.match(read("app/studio/ui/controls/catalogue.css"), /\.ui-control-group-specimens/);
  assert.match(read("app/studio/ui/controls/catalogue.css"), /\.ui-controls-layout/);
  assert.match(detail, /aria-hidden=\{!visible\.has\("line-height"\) \|\| !showInspectorExample\}/);
  assert.match(read("app/studio/ui/controls/catalogue.css"), /\.ui-control-tools-example \.inspector-tools-section \{ width:100%; min-width:0; min-height:104px; \}/);
  assert.match(read("app/studio/ui/controls/catalogue.css"), /\.ui-control-tools-field\.is-hidden \{ visibility:hidden/);
  for (const anchor of ["colour-picker", "custom-font-size", "line-height", "paragraph-length", "box-length", "inspector-tools", "inspector-accordion"]) assert.ok(metadata.includes(`id: "${anchor}"`), anchor);
  assert.match(inspectors, /from "\.\/controls\/background-selection"/);
  assert.match(inspectors, /from "\.\/controls\/font-size-appearance-setting"/);
  assert.match(inspectors, /from "\.\/controls\/line-height-setting"/);
  assert.match(inspectors, /from "\.\/controls\/preset-number-setting"/);
  assert.match(inspectors, /from "\.\/controls\/image-dimensions-setting"/);
  assert.match(inspectors, /from "\.\/controls\/focal-position-setting"/);
  assert.match(inspectors, /from "\.\/controls\/border-settings"/);
  assert.match(boxLength, /disabled\?: boolean/);
  assert.match(paragraphLength, /disabled\?: boolean/);
  assert.match(colour, /Escape/);
  assert.match(colour, /ColourValueSwatch/);
  assert.match(colour, /disabled/);
});

test("Workspace composes the real Ribbon and Pane specimens with both sides open by default", () => {
  const workspace = read("app/studio/ui/workspace-catalogue.tsx");
  assert.match(workspace, /<ApplicationSectionNavigation initialActiveId="accounts" preventNavigation \/>/);
  assert.match(workspace, /<RibbonPreview[^>]+showScenarios=\{false\} showFixture=\{false\} showStatus=\{false\}/);
  assert.match(workspace, /<PaneSpecimen[^>]+layout="both"/);
  assert.match(workspace, /role="region" aria-label="Scrollable combined application navigation, Ribbon and Pane workspace"/);
  const preview = read("app/studio/ribbon/ribbon-preview.tsx");
  assert.match(preview, /showScenarios = true, showFixture = true, showStatus = true/);
  assert.match(preview, /\{showFixture && <Fixture/);
});

test("Application Section Navigation is generic, route-ready and exposed in Workspace", () => {
  const navigation = read("app/studio/ui/application-section-navigation.tsx");
  assert.match(navigation, /export type ApplicationSectionItem/);
  assert.match(navigation, /aria-label="Application sections"/);
  assert.match(navigation, /activeId\?: string/);
  assert.match(navigation, /onActiveIdChange\?: \(id: string\) => void/);
  assert.match(navigation, /if \(preventNavigation\)/);
  assert.doesNotMatch(navigation, /onClick=\{\(event\) => \{ event\.preventDefault\(\);/);
  assert.match(navigation, /item\.href \?\? `#\$\{item\.id\}`/);
  assert.match(navigation, /applicationSectionExample/);
});

test("shared Icons section keeps ACM artwork and describes usage as catalogue examples", () => {
  const icons = read("app/studio/ui/icons-catalogue.tsx");
  const page = read("app/studio/ui/icons/page.tsx");
  assert.match(icons, /from "@acm\/icons"/);
  assert.match(page, /<StudioUiSectionHost section="icons">/);
  assert.match(icons, /iconAddedAt/);
  assert.match(icons, /Newest Added/);
  assert.match(icons, /formatIconAddedAt/);
  assert.match(icons, /Ribbon catalogue examples/);
  assert.match(icons, /No Ribbon catalogue examples use this symbol/);
});

test("Block Library catalogue previews the exact shared and Studio symbols used by each tile", () => {
  const icons = read("app/studio/ui/icons-catalogue.tsx");
  const blockSymbols = read("app/studio/block-library-icons.tsx");
  const canvas = read("app/studio/studio-canvas.tsx");
  const templateEditor = read("app/studio/template-editor.tsx");
  assert.match(icons, /collection=blocks/);
  assert.match(icons, /blockLibraryCatalogue = blockLibraryEntries/);
  assert.match(icons, /BlockLibraryIconSample type=\{item\.type\} scale=\{scale\}/);
  assert.match(icons, /Regular-S · 16px/);
  assert.match(icons, /Regular-M · 24px/);
  assert.match(icons, /Regular-L · 32px/);
  assert.match(templateEditor, /\.\.\.blockCatalogue, templateContentBlock/);
  assert.match(blockSymbols, /group: \{ source: "ACM Icons", symbol: "layout\.flow" \}/);
  for (const symbol of ["text.paragraph", "block.heading", "block.list", "text.quote", "block.table", "block.code", "insert.embed", "block.image", "document.featured-image", "account.author", "social.block", "component.block", "insert.button", "layout.separator", "layout.spacer", "time.clock", "document.date", "layout.column", "text.list-numbered", "document.title", "document.content"]) {
    assert.ok(blockSymbols.includes(`symbol: "${symbol}"`), symbol);
  }
  assert.match(icons, /"insert\.embed": \[\{ label: "Embed block tile and URL entry specimen", href: "\/studio\/ui\/blocks\/embed" \}\]/);
  assert.match(icons, /initialBlock/);
  assert.match(icons, /ui-block-symbol-link/);
  assert.match(icons, /blockConsumers/);
  assert.match(blockSymbols, /heading: \{ source: "ACM Icons", symbol: "block\.heading" \}/);
  assert.doesNotMatch(blockSymbols, /heading-level/);
  assert.doesNotMatch(blockSymbols, /source: "ACM Studio"/);
  assert.match(canvas, /<BlockLibraryIcon type=\{type\}/);
});

test("keyboard inspector exposes each selected key's artwork provenance and available licence notice", () => {
  const keyboard = read("app/studio/ui/keyboard-catalogue.tsx");
  assert.match(keyboard, /import \{ iconMetadata \} from "@acm\/icons"/);
  assert.match(keyboard, /const artwork = iconMetadata\[asset\.key\.icon\]/);
  assert.match(keyboard, /<summary>Artwork provenance and licensing<\/summary>/);
  assert.match(keyboard, /\{artwork\.provenance\}/);
  assert.match(keyboard, /acm-icons\/masters\/\{asset\.key\.icon\}\.svg/);
  assert.match(keyboard, /artwork\.licenceNotice &&/);
  assert.match(keyboard, /<summary>Full licence notice<\/summary>/);
  assert.match(keyboard, /<pre>\{artwork\.licenceNotice\}<\/pre>/);
});

test("Studio tool navigation points to one combined library entry", () => {
  const coordinator = read("app/studio/studio-prototype.tsx");
  assert.match(coordinator, /<StudioNavigationPane workspace=\{workspace\}/);
  for (const file of ["app/studio/studio-dashboard.tsx", "app/studio/studio-navigation-pane.tsx", "app/studio/template-workspace.tsx"]) {
    const source = read(file);
    assert.ok(source.includes("Studio UI Library"), file);
    assert.ok(source.includes('href="/studio/ui"'), file);
    assert.ok(!source.includes('href="/studio/ribbon"'), file);
    assert.ok(!source.includes('href="/studio/panes"'), file);
  }
});
