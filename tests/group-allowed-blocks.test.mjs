import test from "node:test";
import assert from "node:assert/strict";
import { loadProductionModule } from "./production-module.mjs";

const { filterGroupAllowedBlockOptions, toggleGroupAllowedBlockTypes, groupAllowedBlockValue } = await loadProductionModule(new URL("../app/studio/controls/group-allowed-blocks.tsx", import.meta.url));
const { GROUP_SELECTABLE_BLOCK_TYPES } = await loadProductionModule(new URL("../app/content/model.ts", import.meta.url));

test("allowed-block search filters the canonical choices without changing selection", () => {
  assert.deepEqual(filterGroupAllowedBlockOptions("  PARAGRAPH ").map(option => option.type), ["paragraph"]);
  assert.equal(filterGroupAllowedBlockOptions("").length, GROUP_SELECTABLE_BLOCK_TYPES.length);
  assert.deepEqual(filterGroupAllowedBlockOptions("no-such-block"), []);
});

test("category toggles preserve other categories and Select all includes filtered-out choices", () => {
  const all = filterGroupAllowedBlockOptions("");
  const textTypes = all.filter(option => option.group === "Text").map(option => option.type);
  const selection = ["image", "paragraph"];
  assert.deepEqual(toggleGroupAllowedBlockTypes(selection, textTypes, false), ["image"]);
  const selectedText = toggleGroupAllowedBlockTypes(selection, textTypes, true);
  assert.equal(selectedText.includes("image"), true);
  assert.equal(new Set(selectedText).size, selectedText.length);
  assert.equal(textTypes.every(type => selectedText.includes(type)), true);
  assert.deepEqual(toggleGroupAllowedBlockTypes(selectedText, GROUP_SELECTABLE_BLOCK_TYPES, false), []);
  assert.deepEqual(selection, ["image", "paragraph"]);
});

test("Apply preserves legacy allowlist entries and the unrestricted contract", () => {
  assert.equal(groupAllowedBlockValue(undefined, [...GROUP_SELECTABLE_BLOCK_TYPES]), undefined);
  assert.deepEqual(groupAllowedBlockValue(undefined, ["paragraph"]), ["paragraph"]);
  assert.deepEqual(groupAllowedBlockValue(["paragraph", "button"], ["heading"]), ["heading", "button"]);
  assert.deepEqual(groupAllowedBlockValue(["paragraph", "button"], []), ["button"]);
});
