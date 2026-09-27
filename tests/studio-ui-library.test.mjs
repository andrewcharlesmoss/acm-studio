import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (path) => readFileSync(resolve(path), "utf8");

test("Studio UI Library exposes its canonical sections and keeps section routes distinct", () => {
  const shell = read("app/studio/ui/studio-ui-library.tsx");
  for (const [section, href] of [["workspace", "/studio/ui"], ["ribbon", "/studio/ui/ribbon"], ["panes", "/studio/ui/panes"], ["icons", "/studio/ui/icons"], ["styles", "/studio/ui/styles"]]) {
    assert.match(shell, new RegExp(`id: "${section}"`));
    assert.ok(shell.includes(`href: "${href}"`), href);
  }
  assert.match(shell, /aria-current=\{section === item\.id \? "page" : undefined\}/);
  assert.match(read("app/studio/ribbon/page.tsx"), /redirect\("\/studio\/ui\/ribbon"\)/);
  assert.match(read("app/studio/panes/page.tsx"), /redirect\("\/studio\/ui\/panes"\)/);
  assert.match(read("app/studio/ui/styles/page.tsx"), /StyleGuideSandbox/);
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
  for (const symbol of ["text.paragraph", "text.heading", "text.list-bulleted", "text.quote", "table.cell", "text.code", "insert.image", "document.cover", "account.record"]) {
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
