import assert from "node:assert/strict";
import test from "node:test";
import { loadProductionModule } from "./production-module.mjs";
const { websitePreviewGeometry, createWebsiteEditorExample } = await loadProductionModule(new URL("../app/studio/ui/styles/website-layout-editor-example.ts", import.meta.url));
import { previewDefaults } from "../app/studio/ui/styles/website-layout-preview-state.ts";

test("website preview geometry applies site, content, wide and gutters independently", () => {
  assert.deepEqual(JSON.parse(JSON.stringify(websitePreviewGeometry(previewDefaults, 1440, 24))), { site: 1440, gutter: 24, available: 1392, content: 720, wide: 1120 });
  assert.deepEqual(JSON.parse(JSON.stringify(websitePreviewGeometry({ ...previewDefaults, siteWidth: { mode: "max", maxWidth: 1000 }, contentWidth: 600, wideWidth: 900 }, 1440, 60))), { site: 1000, gutter: 60, available: 880, content: 600, wide: 880 });
  assert.deepEqual(JSON.parse(JSON.stringify(websitePreviewGeometry(previewDefaults, 390, 24))), { site: 390, gutter: 24, available: 342, content: 342, wide: 342 });
  assert.equal(websitePreviewGeometry(previewDefaults, 390, 512).available, 0);
});
test("generic example is valid, editable typed content with ordinary, wide and full blocks", () => {
  const first = createWebsiteEditorExample();
  const second = createWebsiteEditorExample();
  const target = first.set.templates.find(item => item.id === first.targetId);
  assert.equal(target.kind, "page");
  assert.ok(target.nodes.some(node => node.type === "paragraph"));
  for (const alignment of ["wide", "full"]) assert.ok(target.nodes.some(node => node.blockAlign === alignment));
  target.nodes[1].text = "Temporary edit";
  assert.equal(second.set.templates.find(item => item.id === second.targetId).nodes[1].text, "Room for your ideas");
});
