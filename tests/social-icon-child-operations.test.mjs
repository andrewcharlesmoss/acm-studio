import assert from "node:assert/strict";
import test from "node:test";
import { loadProductionModule } from "./production-module.mjs";

const operations = await loadProductionModule(new URL("../app/studio/social-icon-child-operations.ts", import.meta.url));
const validation = await loadProductionModule(new URL("../app/studio/workspace-validation.ts", import.meta.url));
const editorial = await loadProductionModule(new URL("../app/content/block-editorial.ts", import.meta.url));
const treeChanges = await loadProductionModule(new URL("../app/studio/block-inserter-options.ts", import.meta.url));

function fixture(orientation = "horizontal") {
  return [{ id: "social", type: "social-icons", orientation, justification: "left", children: [
    { id: "linkedin", type: "social-linkedin", url: "https://www.linkedin.com/in/example", label: "LinkedIn" },
    { id: "tiktok", type: "social-tiktok", url: "https://www.tiktok.com/@example", label: "TikTok" },
  ] }];
}

test("parent-owned Social Icons updates require the current direct child and matching parent", () => {
  const blocks = fixture();
  const parent = operations.socialIconsParentForChild(blocks, "social", "linkedin", "social-linkedin");
  assert.equal(parent?.id, "social");
  assert.equal(operations.updateSocialIconsParentForChild(blocks, blocks[0], "social", "linkedin", "social-linkedin", current => ({ ...current, justification: "centre" })).justification, "centre");
  assert.equal(operations.socialIconsParentForChild(blocks, "missing-parent", "linkedin", "social-linkedin"), null);
  assert.equal(operations.socialIconsParentForChild(blocks, "social", "linkedin", "social-tiktok"), null);
  assert.equal(operations.updateSocialIconsParentForChild(blocks, { ...blocks[0], id: "stale-parent" }, "social", "linkedin", "social-linkedin", current => ({ ...current, justification: "right" })), null);
});

test("orientation-aware movement changes only the direct Social Icons child order", () => {
  for (const orientation of ["horizontal", "vertical"]) {
    const blocks = fixture(orientation);
    assert.equal(validation.validContentBlocks(blocks), true, "the Library fixture must satisfy the saved content contract");
    const next = operations.moveSocialIconChild(blocks, "social", "tiktok", "social-tiktok", -1);
    assert.deepEqual(next[0].children.map(child => child.id), ["tiktok", "linkedin"]);
    assert.equal(validation.validContentBlocks(next), true);
    assert.equal(treeChanges.permitsBlockTreeChanges(blocks, next), true);
    assert.equal(editorial.preservesBlockLocks(blocks, next), true);
    assert.equal(next[0].orientation, orientation);
    assert.equal(blocks[0].children[0].id, "linkedin", "the source fixture remains unchanged");
    assert.equal(operations.moveSocialIconChild(next, "stale-parent", "tiktok", "social-tiktok", 1), next);
    assert.equal(operations.moveSocialIconChild(blocks, "social", "tiktok", "social-linkedin", -1), blocks);
  }
});

test("a nested descendant cannot use Social Icons parent commands", () => {
  const blocks = [{ id: "social", type: "social-icons", children: [
    { id: "wrapper", type: "group", layout: "flow", children: [{ id: "linkedin", type: "social-linkedin", url: "https://www.linkedin.com/in/example" }] },
  ] }];
  assert.equal(operations.socialIconsParentForChild(blocks, "social", "linkedin", "social-linkedin"), null);
  assert.equal(operations.moveSocialIconChild(blocks, "social", "linkedin", "social-linkedin", -1), blocks);
});
