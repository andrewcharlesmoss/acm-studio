import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (path) => readFileSync(resolve(path), "utf8");

test("Panels is a separate Studio UI Library section backed by the shared card", () => {
  const shell = read("app/studio/ui/studio-ui-library.tsx");
  assert.match(shell, /id: "panels"/);
  assert.match(shell, /role="tab"/);
  assert.match(shell, /onClick=\{\(\) => onSectionChange\?\.\(item\.id\)\}/);
  assert.match(read("app/studio/ui/studio-ui-section-host.tsx"), /panels: \(\) => import\("\.\/panels\/panel-catalogue"\)/);
  const page = read("app/studio/ui/panels/page.tsx");
  assert.match(page, /PanelCatalogue/);
  assert.match(page, /<StudioUiSectionHost section="panels">/);
  assert.match(shell, /@acm\/panel\/styles\.css/);
  const catalogue = read("app/studio/ui/panels/panel-catalogue.tsx");
  assert.match(catalogue, /from "@acm\/panel"/);
  assert.match(catalogue, /<PanelCard/);
  assert.match(catalogue, /setOpen\(false\)/);
  assert.match(catalogue, /local_user@example\.test/);
  const styles = read("app/studio/ui/panels/panel-catalogue.css");
  assert.match(styles, /\.ui-panels-specimen \{[^}]*margin-inline: 2rem/);
  assert.match(styles, /@media \(max-width: 720px\) \{\s*\.ui-panels-specimen \{ margin-inline: 1rem; \}/);
  assert.match(read("docs/panel-library.md"), /Consumers own panel placement/);
});
