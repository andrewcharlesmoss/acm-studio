import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (path) => readFileSync(resolve(path), "utf8");

test("Panels is a separate Studio UI Library section backed by the shared card", () => {
  const shell = read("app/studio/ui/studio-ui-library.tsx");
  assert.match(shell, /id: "panels"/);
  assert.ok(shell.includes('href: "/studio/ui/panels"'));
  const page = read("app/studio/ui/panels/page.tsx");
  assert.match(page, /PanelCatalogue/);
  assert.match(page, /@acm\/panel\/styles\.css/);
  const catalogue = read("app/studio/ui/panels/panel-catalogue.tsx");
  assert.match(catalogue, /from "@acm\/panel"/);
  assert.match(catalogue, /<PanelCard/);
  assert.match(catalogue, /setOpen\(false\)/);
  assert.match(catalogue, /local_user@example\.test/);
  assert.match(read("docs/panel-library.md"), /Consumers own panel placement/);
});
