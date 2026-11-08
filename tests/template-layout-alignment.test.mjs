import test from "node:test";
import assert from "node:assert/strict";
import { loadProductionModule } from "./production-module.mjs";

const { templateGroupCanAlign } = await loadProductionModule(new URL("../app/studio/template-layout-alignment.ts", import.meta.url));
const block = { id: "child", type: "group", layout: "grid", children: [] };
const parent = { id: "parent", type: "group", layout: "flow", children: [block], contentWidth: "full", inheritLayout: true };

test("Header Group alignment follows parent width and preserves authored alignment", () => {
  assert.equal(templateGroupCanAlign(block, parent, false), false);
  assert.equal(templateGroupCanAlign({ ...block, blockAlign: "wide" }, parent, false), true);
  assert.equal(templateGroupCanAlign(block, { ...parent, contentWidth: "constrained" }, false), true);
  assert.equal(templateGroupCanAlign(block, null, true), false);
  assert.equal(templateGroupCanAlign({ ...block, blockAlign: "wide" }, null, true), true);
  for (const layout of ["row", "stack", "grid"]) assert.equal(templateGroupCanAlign(block, { ...parent, layout }, false), true);
  assert.equal(templateGroupCanAlign({ id: "text", type: "paragraph", content: "" }, parent, false), true);
});
