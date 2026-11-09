import type { IconName } from "@acm/icons";
import type { ContentBlock, LayoutMode } from "../../content/model";
import { sectionStyleReference } from "../site-editor/section-style-variations";
import { GROUP_LAYOUT_VARIATIONS } from "./group-layout-contract";

export type GroupVariationType = "group" | "row" | "stack" | "grid" | "details";
export const groupVariations: { type: GroupVariationType; layout: LayoutMode; label: string; description: string; icon: IconName }[] = [
  ...GROUP_LAYOUT_VARIATIONS,
  { type: "details", layout: "flow", label: "Details", description: "Show or hide nested blocks beneath a summary.", icon: "navigation.disclosure" },
];
export function isGroupVariation(type: string): type is GroupVariationType { return groupVariations.some(variation => variation.type === type); }
export function storedBlockType(type: string) { return isGroupVariation(type) ? "group" : type; }
export function groupVariationFor(block: Extract<ContentBlock, { type: "group" }>) {
  if (block.tagName === "details") return { type: "details" as const, layout: "flow" as const, label: "Details", description: "Show or hide nested blocks beneath a summary.", icon: "navigation.disclosure" as const };
  if (block.data?.templateElement === "navigation") return { type: "group" as const, layout: block.layout, label: "Navigation", description: "Help visitors find their way around your site.", icon: "navigation.menu" as const };
  return groupVariations.find(variation => variation.layout === block.layout) ?? groupVariations[0];
}
export type GroupStyleVariation = "default" | "section-1" | "section-2" | "section-3" | "section-4" | "section-5";
export function groupStyleVariation(style?: Extract<ContentBlock, { type: "group" }>['visualStyle']): GroupStyleVariation {
  return (style?.className?.split(/\s+/).filter(name => name.startsWith("is-style-")).map(name => name.slice("is-style-".length)).find(name => sectionStyleReference(name)) as Exclude<GroupStyleVariation, "default"> | undefined) ?? "default";
}
export function setGroupStyleVariation(style: Extract<ContentBlock, { type: "group" }>['visualStyle'], variation: string) {
  const classes = new Set((style?.className ?? "").split(/\s+/).filter(Boolean).filter(name => !/^is-style-(?:section-[1-5]|default)$/.test(name)));
  if (sectionStyleReference(variation)) classes.add(`is-style-${variation}`);
  const className = [...classes].join(" ");
  const visualStyle = { ...style };
  if (className) visualStyle.className = className;
  else delete visualStyle.className;
  return Object.keys(visualStyle).length ? visualStyle : undefined;
}
/** Layout transforms retain content, identity, styling and compatible layout settings. */
export function changeGroupLayout(block: Extract<ContentBlock, { type: "group" }>, layout: LayoutMode): Extract<ContentBlock, { type: "group" }> {
  if (block.layout === layout) return block;
  const enteringGrid = layout === "grid" && block.layout !== "grid";
  const leavingLegacyGrid = block.layout === "grid" && layout !== "grid" && block.gridMode === undefined;
  const hasRetainedGridSettings = block.gridMode !== undefined || block.columns !== undefined || block.minColumnWidth !== undefined || block.minColumnWidthUnit !== undefined || block.fillAvailableSpace !== undefined;
  const next = { ...block, layout,
    ...(enteringGrid ? { gridMode: block.gridMode ?? "auto" as const } : {}),
    ...(leavingLegacyGrid && block.columns === undefined ? { columns: 3 } : {}),
    ...(block.layout === "grid" && layout !== "grid" && block.fillAvailableSpace === undefined ? { fillAvailableSpace: true } : {}),
    ...(enteringGrid && block.fillAvailableSpace === undefined && !hasRetainedGridSettings ? { fillAvailableSpace: false } : {}),
    ...(enteringGrid ? {
      ...(block.minColumnWidth === undefined ? { minColumnWidth: hasRetainedGridSettings ? 192 : 12 } : {}),
      ...(block.minColumnWidthUnit === undefined ? { minColumnWidthUnit: hasRetainedGridSettings || block.minColumnWidth !== undefined ? "px" as const : "rem" as const } : {}),
    } : {}),
    ...((layout === "row" || layout === "stack") && block.allowSizingOnChildren === undefined ? { allowSizingOnChildren: true } : {}),
  };
  return next;
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

/** Reset inspector-owned layout settings to Gutenberg's defaults for the current variation. */
export function resetGroupLayout(block: Extract<ContentBlock, { type: "group" }>): Extract<ContentBlock, { type: "group" }> {
  return {
    ...block,
    horizontalAlign: undefined,
    verticalAlign: undefined,
    contentSize: undefined,
    wideSize: undefined,
    columns: undefined,
    minColumnWidth: block.layout === "grid" ? 12 : undefined,
    minColumnWidthUnit: block.layout === "grid" ? "rem" : undefined,
    gridMode: block.layout === "grid" ? "auto" : undefined,
    fillAvailableSpace: block.layout === "grid" ? false : undefined,
    allowWrap: undefined,
    inheritLayout: true,
    contentWidth: undefined,
    ...(block.tagName === "details" ? { detailsSummary: "Details", openByDefault: undefined } : {}),
  };
}
