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
  assert.match(workspace, /<RibbonPreview[^>]+showScenarios=\{false\} showFixture=\{false\} showStatus=\{false\}/);
  assert.match(workspace, /<PaneSpecimen[^>]+layout="both"/);
  assert.match(workspace, /role="region" aria-label="Scrollable combined Ribbon and Pane workspace"/);
  const preview = read("app/studio/ribbon/ribbon-preview.tsx");
  assert.match(preview, /showScenarios = true, showFixture = true, showStatus = true/);
  assert.match(preview, /\{showFixture && <Fixture/);
});

test("shared Icons section keeps ACM artwork and describes usage as catalogue examples", () => {
  const icons = read("app/studio/ui/icons-catalogue.tsx");
  assert.match(icons, /from "@acm\/icons"/);
  assert.match(icons, /section="icons"/);
  assert.match(icons, /Ribbon catalogue examples/);
  assert.match(icons, /No Ribbon catalogue examples use this symbol/);
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
