import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  initialStyleGuideSelection,
  selectedStyleGuidePreviewPath,
  styleGuideSelectionReducer,
} from "../app/studio/ui/styles/style-guide-selection.ts";

const root = path.resolve(import.meta.dirname, "..");

test("clicking a specimen pins its preview outline over stale hover and focus", () => {
  const inspectingAnotherItem = {
    ...initialStyleGuideSelection,
    hoveredSourcePath: "typography.h5.size",
    hoveredGuidePath: "typography.h5.size",
    focusedSourcePath: "typography.h4.size",
    pinnedSourcePath: "typography.h3.size",
  };

  const afterClick = styleGuideSelectionReducer(inspectingAnotherItem, {
    type: "pin-source",
    path: "typography.h6.size",
  });

  assert.equal(afterClick.hoveredSourcePath, null);
  assert.equal(afterClick.hoveredGuidePath, null);
  assert.equal(afterClick.focusedSourcePath, null);
  assert.equal(afterClick.pinnedSourcePath, "typography.h6.size");
  assert.equal(selectedStyleGuidePreviewPath(afterClick), "typography.h6.size");
});

test("keyboard focus and guide hover map to the corresponding preview specimen", () => {
  const focused = styleGuideSelectionReducer(initialStyleGuideSelection, {
    type: "focus-source",
    path: "buttons.outline.hoverForeground",
  });
  assert.equal(selectedStyleGuidePreviewPath(focused), "buttons.outline.background");

  const guideHover = styleGuideSelectionReducer(focused, {
    type: "hover-guide",
    path: "typography.h2.family",
  });
  assert.equal(selectedStyleGuidePreviewPath(guideHover), "typography.h2.size");

  const clearedHover = styleGuideSelectionReducer(guideHover, { type: "clear-guide-hover" });
  assert.equal(selectedStyleGuidePreviewPath(clearedHover), "buttons.outline.background");
  assert.equal(selectedStyleGuidePreviewPath({ ...initialStyleGuideSelection, pinnedSourcePath: "typography.button.size" }), "buttons.base.background");
});

test("preview hover follows the cursor and clears back to a pinned selection", () => {
  const hovered = styleGuideSelectionReducer(initialStyleGuideSelection, {
    type: "hover-preview",
    path: "typography.h3.size",
  });
  assert.equal(selectedStyleGuidePreviewPath(hovered), "typography.h3.size");

  const pinned = styleGuideSelectionReducer({ ...hovered, pinnedSourcePath: "typography.h2.size" }, {
    type: "clear-source-hover",
  });
  assert.equal(pinned.previewHoverPath, null);
  assert.equal(selectedStyleGuidePreviewPath(pinned), "typography.h2.size");

  const focused = styleGuideSelectionReducer(hovered, {
    type: "focus-source",
    path: "typography.h4.size",
  });
  assert.equal(focused.previewHoverPath, null);
  assert.equal(selectedStyleGuidePreviewPath(focused), "typography.h4.size");
});

test("layout source selection does not outline an unrelated preview item", () => {
  const selected = styleGuideSelectionReducer(initialStyleGuideSelection, {
    type: "pin-source",
    path: "layout.contentWidth",
  });
  assert.equal(selectedStyleGuidePreviewPath(selected), null);
});

test("selected specimen rings survive pointer-focus suppression and button samples are selectable", () => {
  const styles = fs.readFileSync(path.join(root, "app/studio/ui/style-guide.css"), "utf8");
  const component = fs.readFileSync(path.join(root, "app/studio/ui/styles/style-guide-sandbox.tsx"), "utf8");
  assert.match(styles, /\.sg-preview \[data-source-selected="true"\]:not\(\.sg-swatch\) \{ box-shadow: 0 0 0 2px var\(--studio-selection-colour\); \}/);
  assert.match(styles, /\.sg-preview\[data-source-selected="true"\] \{ box-shadow: inset 0 0 0 2px var\(--studio-selection-colour\); \}/);
  for (const role of ["base", "secondary", "outline"]) {
    assert.match(component, new RegExp(`data-source-selected=\\{selectedPreviewPath === "buttons\\.${role}\\.background"`));
  }
});
