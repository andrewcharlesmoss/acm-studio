import assert from "node:assert/strict";
import test from "node:test";
import { isTemplatePartRootGroup } from "../app/studio/template-part-root.ts";

test("template-part root detection does not match unrelated top-level groups", () => {
  assert.equal(isTemplatePartRootGroup({ blockId: "group-a", parentId: null, rootBlockId: null, wrapperId: null }), false);
});

test("template-part root detection matches the direct root or a direct group inside its wrapper", () => {
  assert.equal(isTemplatePartRootGroup({ blockId: "root", parentId: null, rootBlockId: "root", wrapperId: null }), true);
  assert.equal(isTemplatePartRootGroup({ blockId: "child", parentId: "wrapper", rootBlockId: null, wrapperId: "wrapper" }), true);
  assert.equal(isTemplatePartRootGroup({ blockId: "grandchild", parentId: "child", rootBlockId: null, wrapperId: "wrapper" }), false);
});
