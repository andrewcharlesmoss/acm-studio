import assert from "node:assert/strict";
import test from "node:test";
import { loadProductionModule } from "./production-module.mjs";
const { createBlockEditorPlaygroundExample } = await loadProductionModule(new URL("../app/studio/ui/workspace/block-editor-playground-example.ts", import.meta.url));
const { templateEditorBlocks, validateTemplateSet } = await loadProductionModule(new URL("../app/studio/template-model.ts", import.meta.url));

test("playground fixtures exercise the production Header, Navigation, and empty template projections", () => {
  const { set, targets } = createBlockEditorPlaygroundExample();
  validateTemplateSet(set);
  const parts = Object.fromEntries(Object.entries(targets).map(([name, id]) => [name, set.parts.find(part => part.id === id)]));
  const header = templateEditorBlocks(parts.header.nodes);
  assert.equal(header.length, 1);
  assert.equal(header[0].type, "group");
  assert.equal(header[0].layout, "row");
  assert.deepEqual(header[0].children.map(block => block.data.templateElement), ["site-identity", "navigation"]);
  const navigation = templateEditorBlocks(parts.navigation.nodes);
  assert.equal(navigation.length, 1);
  assert.equal(navigation[0].data.templateElement, "navigation");
  assert.deepEqual(templateEditorBlocks(parts.empty.nodes), []);
  assert.deepEqual(set.navigation.map(link => link.label), ["Home", "About", "Blog", "Contact"]);
});

test("new and reset fixtures own independent content, navigation, and identity", () => {
  const first = createBlockEditorPlaygroundExample();
  const second = createBlockEditorPlaygroundExample();
  first.set.parts.find(part => part.id === first.targets.header).nodes.push({ id: "example-added", type: "paragraph", text: "Temporary addition" });
  first.set.navigation[0].label = "Changed";
  first.set.identity.name = "Temporary identity";
  assert.equal(second.set.parts.find(part => part.id === second.targets.header).nodes.length, 1);
  assert.equal(second.set.navigation[0].label, "Home");
  assert.equal(second.set.identity.name, "Your Site");
  assert.notEqual(first.set.id, second.set.id);
});
