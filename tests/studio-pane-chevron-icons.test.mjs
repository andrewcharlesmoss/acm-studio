import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { iconScales } from "@acm/icons";

const read = path => readFileSync(path, "utf8");

test("pane controls use the catalogued horizontal chevron and keep disclosure separate", () => {
  const icons = read("app/studio/studio-icons.tsx");
  const panes = read("app/studio/panes/pane-components.css");
  const specimen = read("app/studio/panes/pane-specimen.tsx");
  const catalogue = read("app/studio/ui/icons-catalogue.tsx");

  assert.match(icons, /"chevron-right": "navigation\.chevron-right"/);
  assert.doesNotMatch(icons, /"chevron-down":\s*"navigation\.disclosure"/);
  assert.match(panes, /\.pane-collapse\[data-side="left"\]\[data-collapsed="false"\] svg, \.pane-collapse\[data-side="right"\]\[data-collapsed="true"\] svg \{ transform: rotate\(180deg\); \}/);
  assert.match(specimen, /<StudioIcon name="chevron-right"/);
  assert.match(catalogue, /"navigation\.chevron-right":\s*\[\{ label: "Pane collapse controls", href: "\/studio\/ui\/panes" \}\]/);
  assert.match(catalogue, /"navigation\.disclosure":\s*\[\{ label: "Inspector sections and control menus"/);
  assert.deepEqual(iconScales, ["Regular-S", "Regular-M", "Regular-L"]);
  assert.match(catalogue, /Three editable optical scales from the shared ACM icon catalogue/);
  assert.match(catalogue, /iconMetadata\[icon\]\.provenance/);
  assert.match(catalogue, /acm-icons\/masters\/\{icon\}\.svg/);
});
