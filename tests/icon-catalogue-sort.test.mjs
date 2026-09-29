import assert from "node:assert/strict";
import test from "node:test";
import { formatIconAddedAt, sortIconsByAddedAt } from "../app/studio/ui/icon-sort.ts";

const addedAt = {
  "action.undo": "2026-09-18T23:38:47+01:00",
  "text.paragraph": "2026-09-22T10:53:03+01:00",
  "social.icons": "2026-09-28T18:40:03+01:00",
  "brand.linkedin": "2026-09-28T18:40:03+01:00",
};
const catalogueOrder = ["action.undo", "text.paragraph", "social.icons", "brand.linkedin"];

test("interface icons sort by full added timestamp and preserve catalogue order for ties", () => {
  assert.deepEqual(sortIconsByAddedAt(catalogueOrder, addedAt, "catalogue"), catalogueOrder);
  assert.deepEqual(sortIconsByAddedAt(catalogueOrder, addedAt, "newest"), ["social.icons", "brand.linkedin", "text.paragraph", "action.undo"]);
  assert.deepEqual(sortIconsByAddedAt(catalogueOrder, addedAt, "oldest"), ["action.undo", "text.paragraph", "social.icons", "brand.linkedin"]);
});

test("selected icon timestamps display the exact instant in UK local time", () => {
  assert.match(formatIconAddedAt(addedAt["social.icons"]), /28 September 2026.*18:40:03 BST/);
});
