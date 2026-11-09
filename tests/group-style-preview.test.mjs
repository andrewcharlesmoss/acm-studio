import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { loadProductionModule } from "./production-module.mjs";

const { StyleVariationSetting } = await loadProductionModule(new URL("../app/studio/controls/style-variation-setting.tsx", import.meta.url));
const { groupPreviewStyle } = await loadProductionModule(new URL("../app/studio/blocks/group-style-preview.tsx", import.meta.url));

test("Group style hover and focus preview without committing, while a click commits once", () => {
  const previews = [], changes = [];
  const control = StyleVariationSetting({ kind: "group", onPreview: value => previews.push(value), onChange: value => changes.push(value) });
  const button = React.Children.toArray(control.props.children)[1];
  button.props.onMouseEnter();
  assert.deepEqual(changes, []);
  assert.deepEqual(previews, ["section-1"]);
  button.props.onMouseLeave();
  button.props.onFocus();
  button.props.onBlur();
  assert.deepEqual(previews, ["section-1", null, "section-1", null]);
  assert.deepEqual(changes, []);
  button.props.onClick();
  assert.deepEqual(changes, ["section-1"]);
});

test("preview targets one Group and preserves the authored style and unrelated classes", () => {
  const style = { className: "custom is-style-section-2", padding: "24px", textColor: "#123456" };
  const original = structuredClone(style);
  assert.equal(groupPreviewStyle("other", style, { blockId: "selected", variation: "section-1" }), style);
  const preview = groupPreviewStyle("selected", style, { blockId: "selected", variation: "section-1" });
  assert.deepEqual(style, original);
  assert.equal(preview.className, "custom is-style-section-1");
  assert.equal(preview.padding, style.padding);
  assert.equal(groupPreviewStyle("selected", style, null), style);
});
