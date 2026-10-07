import type { IconName } from "@acm/icons";
import type { ContentBlock, LayoutMode } from "../../content/model";

export type GroupVariationType = "group" | "row" | "stack" | "grid";
export const groupVariations: { type: GroupVariationType; layout: LayoutMode; label: string; description: string; icon: IconName }[] = [
  { type: "group", layout: "flow", label: "Group", description: "Gather blocks in a container.", icon: "layout.flow" },
  { type: "row", layout: "row", label: "Row", description: "Arrange blocks horizontally.", icon: "layout.row" },
  { type: "stack", layout: "stack", label: "Stack", description: "Arrange blocks vertically.", icon: "layout.stack" },
  { type: "grid", layout: "grid", label: "Grid", description: "Arrange blocks in a grid.", icon: "layout.grid" },
];
export function isGroupVariation(type: string): type is GroupVariationType { return groupVariations.some(variation => variation.type === type); }
export function storedBlockType(type: string) { return isGroupVariation(type) ? "group" : type; }
export function groupVariationFor(block: Extract<ContentBlock, { type: "group" }>) { return groupVariations.find(variation => variation.layout === block.layout) ?? groupVariations[0]; }
/** Layout transforms retain content, identity, styling and inactive layout settings. */
export function changeGroupLayout(block: Extract<ContentBlock, { type: "group" }>, layout: LayoutMode): Extract<ContentBlock, { type: "group" }> {
  return { ...block, layout, ...(layout === "row" && block.allowWrap === undefined ? { allowWrap: false } : {}), ...(layout === "grid" && block.gridMode === undefined ? { gridMode: "auto", minColumnWidth: block.minColumnWidth ?? 12, minColumnWidthUnit: block.minColumnWidthUnit ?? (block.minColumnWidth === undefined ? "rem" : "px") } : {}) };
}
export function createGroupVariation(type: GroupVariationType, id: string): Extract<ContentBlock, { type: "group" }> {
  const layout = groupVariations.find(variation => variation.type === type)!.layout;
  return changeGroupLayout({ id, type: "group", layout: "flow", inheritLayout: true, children: [] }, layout);
}
