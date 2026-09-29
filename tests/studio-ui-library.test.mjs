import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (path) => readFileSync(resolve(path), "utf8");

test("Studio UI Library exposes its canonical sections and keeps section routes distinct", () => {
  const shell = read("app/studio/ui/studio-ui-library.tsx");
  for (const [section, href] of [["workspace", "/studio/ui"], ["ribbon", "/studio/ui/ribbon"], ["panes", "/studio/ui/panes"], ["blocks", "/studio/ui/blocks"], ["controls", "/studio/ui/controls"], ["icons", "/studio/ui/icons"], ["styles", "/studio/ui/styles"]]) {
    assert.match(shell, new RegExp(`id: "${section}"`));
    assert.ok(shell.includes(`href: "${href}"`), href);
  }
  assert.match(shell, /aria-current=\{section === item\.id \? "page" : undefined\}/);
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

test("Paragraph Block Library uses the definition, real inspector and isolated Studio rendering", () => {
  const definition = read("app/studio/blocks/paragraph/definition.ts");
  const specimen = read("app/studio/ui/blocks/paragraph/paragraph-block-catalogue.tsx");
  const inspector = read("app/studio/studio-inspectors.tsx");
  const studioStyles = read("app/studio/studio.css");
  assert.match(definition, /paragraphInspectorProfile/);
  assert.match(definition, /availableBlockTransforms/);
  assert.match(inspector, /defaults = gutenbergInspectorDefaults\[block\.type\]/);
  assert.match(inspector, /paragraphInspectorProfile\.controls/);
  assert.ok(inspector.includes('className={`advanced-fields-section${block.type === "paragraph" ? " paragraph-advanced-fields" : ""}`}'));
  assert.match(studioStyles, /\.inspector-sections \.advanced-fields-section > h2 \{[^}]*text-transform: none/);
  assert.match(specimen, /<ParagraphEditField/);
  assert.match(specimen, /<BlockInspector/);
  assert.match(specimen, /<BlockRenderer[^>]+variant="studio"/);
  assert.match(specimen, /paragraphs\.map\(\(paragraph, index\)/);
  assert.match(specimen, /setActiveId\(paragraph\.id\)/);
  assert.match(specimen, /ariaLabel=\{`Paragraph/);
  assert.match(specimen, /<details className="ui-paragraph-overview ui-paragraph-disclosure"/);
  assert.match(specimen, /id="control-inventory"/);
  assert.match(specimen, /id="compatibility-notes"/);
  assert.match(specimen, /window\.addEventListener\("hashchange", openHashDisclosure\)/);
  assert.match(read("app/studio/ui/controls/catalogue.css"), /\.ui-paragraph-canvas \{[^}]*overflow-x:clip/);
  assert.match(specimen, /navigationRootRef=\{specimenRef\}/);
  assert.match(specimen, /paragraphInspectorProfile\.dependencies\.map/);
  assert.match(specimen, /<section id=\{section\.id\} key=\{section\.id\}>/);
  assert.match(definition, /href: "\/studio\/ui\/controls#colour-picker"/);
  assert.match(definition, /href: "#background"/);
  assert.match(specimen, /Reset Example/);
  assert.match(specimen, /historyRef\.current\.past/);
  assert.match(specimen, /Undo and Redo cover temporary specimen text and settings/);
  assert.match(specimen, /className="ui-paragraph-sample-note"/);
  assert.doesNotMatch(specimen, /studioWriteOwnership|localStorage|sessionStorage/);
  assert.match(read("app/studio/ui/blocks/page.tsx"), /blockLibraryEntries\.map/);
});

test("Block Library menu follows documented definitions and the editor catalogue categories", () => {
  const catalogue = read("app/studio/blocks/library-catalogue.ts");
  const navigation = read("app/studio/ui/blocks/block-library-navigation.tsx");
  const index = read("app/studio/ui/blocks/page.tsx");
  const paragraph = read("app/studio/ui/blocks/paragraph/paragraph-block-catalogue.tsx");
  assert.match(catalogue, /blockCatalogue\.find/);
  assert.match(catalogue, /detailedBlockDefinitions/);
  assert.match(navigation, /aria-label="Block Library"/);
  assert.match(navigation, /aria-current=\{active === "all" \? "page" : undefined\}/);
  assert.match(navigation, /aria-current=\{active === entry\.type \? "page" : undefined\}/);
  assert.match(index, /<BlockLibraryNavigation active="all" \/>/);
  assert.match(index, /blockLibraryEntries\.map/);
  assert.match(paragraph, /<BlockLibraryNavigation active="paragraph" \/>/);
  assert.match(read("app/studio/ui/catalogue-navigation.css"), /\.ui-catalogue-navigation-list a\[aria-current="page"\]/);
});

test("Controls catalogue links to the production shared controls and describes ownership", () => {
  const page = read("app/studio/ui/controls/controls-catalogue.tsx");
  const colour = read("app/studio/controls/colour-picker.tsx");
  const inspectors = read("app/studio/studio-inspectors.tsx");
  const studioStyles = read("app/studio/studio.css");
  const globals = read("app/globals.css");
  assert.match(page, /<ColourPicker/);
  assert.match(page, /<CustomFontSizeSetting/);
  assert.match(page, /<ParagraphLengthSetting/);
  assert.match(page, /<BoxLengthSetting/);
  assert.match(page, /<InspectorToolsSection/);
  assert.match(page, /<InspectorAccordionSection/);
  assert.match(page, /<details className="ui-control-facts"/);
  assert.match(page, /Clear both colours/);
  assert.match(page, /Reset example/);
  assert.match(page, /visible\.has\("line-height"\) && showInspectorExample/);
  assert.match(globals, /--studio-number-field-width: 80px/);
  assert.match(studioStyles, /\.inspector-sections input\[type="number"\] \{ width: var\(--studio-number-field-width\); \}/);
  assert.match(studioStyles, /\.paragraph-length-controls \{[^}]*grid-template-columns: minmax\(60px, 1fr\) var\(--studio-number-field-width\)/);
  assert.match(studioStyles, /\.box-length-custom \{[^}]*grid-template-columns: var\(--studio-number-field-width\) 70px/);
  assert.match(studioStyles, /\.paragraph-custom-font-size-input input\[type="number"\],\.paragraph-length-controls input\[type="number"\],\.box-length-custom input\[type="number"\] \{ font-family: var\(--studio-ui-font\); font-size: var\(--studio-ui-size\); \}/);
  assert.match(studioStyles, /\.paragraph-custom-font-size-input input\[type="number"\][^}]*width: var\(--studio-number-field-width\)/);
  assert.match(page, /owner|Owner/);
  assert.match(page, /consumers|Consumers/);
  assert.match(page, /aria-label="Controls menu"/);
  assert.match(page, /aria-current=\{activeEntry === entry\.id \? "location"/);
  assert.match(page, /window\.addEventListener\("scroll"/);
  assert.match(page, /window\.addEventListener\("resize"/);
  assert.match(read("app/studio/ui/controls/catalogue.css"), /\.ui-control-live \{ width:min\(100%,320px\)/);
  assert.match(page, /"colour-picker": "Colour"/);
  assert.match(page, /"custom-font-size": "Sizing"/);
  assert.match(page, /"inspector-tools": "Inspector"/);
  assert.match(page, /ui-control-tools-example/);
  assert.match(page, /aria-hidden=\{!visible\.has\("line-height"\) \|\| !showInspectorExample\}/);
  assert.match(page, /id="colour-picker"/);
  assert.match(read("app/studio/ui/controls/catalogue.css"), /\.ui-control-tools-example \.inspector-tools-section \{ min-width:0; min-height:104px; \}/);
  assert.match(read("app/studio/ui/controls/catalogue.css"), /\.ui-control-tools-field\.is-hidden \{ visibility:hidden/);
  for (const anchor of ["colour-picker", "custom-font-size", "paragraph-length", "box-length", "inspector-tools", "inspector-accordion"]) assert.ok(page.includes(`id="${anchor}"`), anchor);
  assert.match(page, /href=\{entry\.blockHref\}>Paragraph entry/);
  assert.match(inspectors, /from "\.\/controls\/colour-picker"/);
  assert.match(inspectors, /from "\.\/controls\/custom-font-size-setting"/);
  assert.match(inspectors, /from "\.\/controls\/paragraph-length-setting"/);
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
  assert.match(icons, /from "@acm\/icons"/);
  assert.match(icons, /section="icons"/);
  assert.match(icons, /Ribbon catalogue examples/);
  assert.match(icons, /No Ribbon catalogue examples use this symbol/);
});

test("Block Library catalogue previews the exact shared and Studio symbols used by each tile", () => {
  const icons = read("app/studio/ui/icons-catalogue.tsx");
  const blockSymbols = read("app/studio/block-library-icons.tsx");
  const canvas = read("app/studio/studio-canvas.tsx");
  const templateEditor = read("app/studio/template-editor.tsx");
  assert.match(icons, /collection=blocks/);
  assert.match(icons, /blockLibraryCatalogue = \[\.\.\.blockCatalogue, templateContentBlock\]/);
  assert.match(icons, /BlockLibraryIconSample type=\{item\.type\} scale=\{scale\}/);
  assert.match(icons, /Regular-S · 16px/);
  assert.match(icons, /Regular-M · 24px/);
  assert.match(icons, /Regular-L · 32px/);
  assert.match(templateEditor, /\.\.\.blockCatalogue, templateContentBlock/);
  assert.match(blockSymbols, /group: \{ source: "ACM Icons", symbol: "arrange\.group" \}/);
  for (const symbol of ["text.paragraph", "text.heading", "text.list-bulleted", "text.quote", "table.cell", "text.code", "insert.image", "document.cover", "account.record", "social.icons"]) {
    assert.ok(blockSymbols.includes(`symbol: "${symbol}"`), symbol);
  }
  assert.match(blockSymbols, /heading: \{ source: "ACM Studio", symbol: "heading-marker" \}/);
  assert.doesNotMatch(blockSymbols, /heading-level/);
  for (const symbol of ["button", "separator", "spacer", "clock", "calendar"]) {
    assert.ok(blockSymbols.includes(`symbol: "${symbol}"`), symbol);
  }
  assert.match(canvas, /<BlockLibraryIcon type=\{blockType\}/);
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
  for (const file of ["app/studio/studio-dashboard.tsx", "app/studio/studio-prototype.tsx", "app/studio/template-workspace.tsx"]) {
    const source = read(file);
    assert.ok(source.includes("Studio UI Library"), file);
    assert.ok(source.includes('href="/studio/ui"'), file);
    assert.ok(!source.includes('href="/studio/ribbon"'), file);
    assert.ok(!source.includes('href="/studio/panes"'), file);
  }
});
