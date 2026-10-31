import type { IconName } from "@acm/icons";
import type { ContentBlock, LayoutMode } from "../../content/model";

export type GroupVariationType = "group" | "row" | "stack" | "grid" | "details";
export const groupVariations: { type: GroupVariationType; layout: LayoutMode; label: string; description: string; icon: IconName }[] = [
  { type: "group", layout: "flow", label: "Group", description: "Gather blocks in a container.", icon: "layout.flow" },
  { type: "row", layout: "row", label: "Row", description: "Arrange blocks horizontally.", icon: "layout.row" },
  { type: "stack", layout: "stack", label: "Stack", description: "Arrange blocks vertically.", icon: "layout.stack" },
  { type: "grid", layout: "grid", label: "Grid", description: "Arrange blocks in a grid.", icon: "layout.grid" },
  { type: "details", layout: "flow", label: "Details", description: "Show or hide nested blocks beneath a summary.", icon: "navigation.disclosure" },
];
export function isGroupVariation(type: string): type is GroupVariationType { return groupVariations.some(variation => variation.type === type); }
export function storedBlockType(type: string) { return isGroupVariation(type) ? "group" : type; }
export function groupVariationFor(block: Extract<ContentBlock, { type: "group" }>) {
  if (block.tagName === "details") return { type: "details" as const, layout: "flow" as const, label: "Details", description: "Show or hide nested blocks beneath a summary.", icon: "navigation.disclosure" as const };
  if (block.data?.templateElement === "navigation") return { type: "group" as const, layout: block.layout, label: "Navigation", description: "Help visitors find their way around your site.", icon: "navigation.menu" as const };
  return groupVariations.find(variation => variation.layout === block.layout) ?? groupVariations[0];
}
/** Layout transforms retain content, identity, styling and inactive layout settings. */
export function changeGroupLayout(block: Extract<ContentBlock, { type: "group" }>, layout: LayoutMode): Extract<ContentBlock, { type: "group" }> {
  return { ...block, layout, ...(layout === "row" && block.allowWrap === undefined ? { allowWrap: false } : {}), ...(layout === "grid" ? { allowSizingOnChildren: true, ...(block.gridMode === undefined ? { gridMode: "auto" as const, minColumnWidth: block.minColumnWidth ?? 12, minColumnWidthUnit: block.minColumnWidthUnit ?? (block.minColumnWidth === undefined ? "rem" as const : "px" as const) } : {}) } : {}) };
}
/** Editing either responsive Grid bound opts legacy fixed-count layouts into the current responsive Grid model. */
export function updateGroupGridOptions(block: Extract<ContentBlock, { type: "group" }>, changes: Partial<Extract<ContentBlock, { type: "group" }>>): Extract<ContentBlock, { type: "group" }> {
  return { ...block, ...changes, gridMode: "auto" };
}
/** Switch between responsive Auto tracks and the fixed column count used by Manual Grid. */
export function changeGroupGridMode(block: Extract<ContentBlock, { type: "group" }>, gridMode: NonNullable<Extract<ContentBlock, { type: "group" }>["gridMode"]>): Extract<ContentBlock, { type: "group" }> {
  if (gridMode === "manual") return { ...block, gridMode, columns: block.columns ?? 3 };
  return { ...block, gridMode, minColumnWidth: block.minColumnWidth ?? 12, minColumnWidthUnit: block.minColumnWidthUnit ?? (block.minColumnWidth === undefined ? "rem" : "px") };
}
export function createGroupVariation(type: GroupVariationType, id: string): Extract<ContentBlock, { type: "group" }> {
  const layout = groupVariations.find(variation => variation.type === type)!.layout;
  return changeGroupLayout({ id, type: "group", layout: "flow", inheritLayout: true, children: [], ...(type === "details" ? { tagName: "details", detailsSummary: "Details" } : {}) }, layout);
}
