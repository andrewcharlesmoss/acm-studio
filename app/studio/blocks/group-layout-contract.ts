import type { LayoutMode } from "../../content/model";
import { groupChildSizingLayout } from "../../content/layout";
import type { ContentBlock } from "../../content/model";
import { groupUsesContentWidth } from "./group-layout-alignment";

export type GroupLayoutControlId = "alignment" | "wrapping" | "content-width" | "wide-width" | "justification" | "maximum-columns" | "minimum-column-width" | "fill-available-space";
export type GroupLayoutControlOption = { id: GroupLayoutControlId; label: string };
export type GroupLayoutRequiredMenuOption = { id: string; label: string; checked: true; disabled: true };
export type GroupLayoutMenuAction =
  | { id: "reset-content-width"; label: "Reset Use content width" }
  | { id: "reset-justification"; label: "Reset Justification" }
  | { id: "reset-grid-columns"; label: "Reset Columns and rows" }
  | { id: "reset-grid-minimum"; label: "Reset Min. column width" };
export type GroupChildInspectorCapabilities = { flexItemParent: "row" | "stack" | false; flexItemSizingEnabled: boolean; gridItemParent: boolean };
export const GROUP_DIMENSION_UNITS = ["px", "%", "em", "rem", "vw", "vh"] as const;

/** Width alignment belongs to a constrained parent, not to Flex or Grid tracks. */
export function groupBlockCanAlign(block: ContentBlock, parent: ContentBlock | null, rootAllowsAlignment = true): boolean {
  if (block.type !== "group" || block.blockAlign) return true;
  return parent?.type === "group" ? groupUsesContentWidth(parent) : rootAllowsAlignment;
}

const flowOptions: readonly GroupLayoutControlOption[] = [
  { id: "content-width", label: "Content width" },
  { id: "wide-width", label: "Wide width" },
  { id: "justification", label: "Justification" },
];
const flexOptions: readonly GroupLayoutControlOption[] = [
  { id: "alignment", label: "Alignment" },
  { id: "wrapping", label: "Wrapping" },
];
const gridOptions: readonly GroupLayoutControlOption[] = [
  { id: "fill-available-space", label: "Fill available space" },
];

/** Shared visibility rules for the Group layout inspector and its toolbar. */
export const GROUP_LAYOUT_CONTROL_CONTRACT: Record<"flow" | "row" | "stack" | "grid", {
  optional: readonly GroupLayoutControlOption[];
  toolbar: readonly ("horizontalAlign" | "verticalAlign")[];
  requiredMenu: readonly GroupLayoutRequiredMenuOption[];
}> = {
  flow: { optional: flowOptions, toolbar: ["horizontalAlign"], requiredMenu: [] },
  row: { optional: flexOptions, toolbar: ["horizontalAlign", "verticalAlign"], requiredMenu: [
    { id: "required-justification", label: "Justification", checked: true, disabled: true },
    { id: "required-orientation", label: "Orientation", checked: true, disabled: true },
  ] },
  stack: { optional: flexOptions, toolbar: ["horizontalAlign", "verticalAlign"], requiredMenu: [
    { id: "required-justification", label: "Justification", checked: true, disabled: true },
    { id: "required-orientation", label: "Orientation", checked: true, disabled: true },
  ] },
  grid: { optional: gridOptions, toolbar: [], requiredMenu: [
    { id: "required-grid-tracks", label: "Columns and rows", checked: true, disabled: true },
    { id: "required-minimum-width", label: "Min. column width", checked: true, disabled: true },
  ] },
};

export const GROUP_LAYOUT_VARIATIONS = [
  { type: "group", layout: "flow", label: "Group", description: "Gather blocks in a layout container.", icon: "layout.flow" },
  { type: "row", layout: "row", label: "Row", description: "Arrange blocks horizontally.", icon: "layout.row" },
  { type: "stack", layout: "stack", label: "Stack", description: "Arrange blocks vertically.", icon: "layout.stack" },
  { type: "grid", layout: "grid", label: "Grid", description: "Arrange blocks in a grid.", icon: "layout.grid" },
] as const satisfies readonly { type: "group" | "row" | "stack" | "grid"; layout: LayoutMode; label: string; description: string; icon: `layout.${string}` }[];

export function groupLayoutControlsFor(layout: LayoutMode, block?: Extract<ContentBlock, { type: "group" }>): readonly GroupLayoutControlOption[] {
  if (layout === "flow" && block && !groupUsesContentWidth(block)) return [];
  return layout === "flow" || layout === "row" || layout === "stack" || layout === "grid"
    ? GROUP_LAYOUT_CONTROL_CONTRACT[layout].optional
    : [];
}

export function groupLayoutMenuActionsFor(block: Extract<ContentBlock, { type: "group" }>): readonly GroupLayoutMenuAction[] {
  const actions: GroupLayoutMenuAction[] = [];
  if (block.layout === "flow" && (groupUsesContentWidth(block) || block.contentSize !== undefined || block.wideSize !== undefined || block.contentWidth === "full" || block.inheritLayout === false)) {
    actions.push({ id: "reset-content-width", label: "Reset Use content width" });
  }
  const justification = block.layout === "stack" && block.horizontalAlign === "left" ? undefined : block.horizontalAlign;
  if ((block.layout === "flow" || block.layout === "row" || block.layout === "stack") && justification !== undefined) {
    actions.push({ id: "reset-justification", label: "Reset Justification" });
  }
  if (block.layout === "grid" && block.columns !== undefined) actions.push({ id: "reset-grid-columns", label: "Reset Columns and rows" });
  if (block.layout === "grid" && block.minColumnWidth !== undefined && (block.minColumnWidth !== 12 || block.minColumnWidthUnit !== "rem")) actions.push({ id: "reset-grid-minimum", label: "Reset Min. column width" });
  return actions;
}

export function groupLayoutRequiredMenuFor(block: Extract<ContentBlock, { type: "group" }>): readonly GroupLayoutRequiredMenuOption[] {
  const layout = block.layout === "columns" ? "flow" : block.layout;
  if (layout !== "flow" && layout !== "row" && layout !== "stack" && layout !== "grid") return [];
  const justification = block.layout === "stack" && block.horizontalAlign === "left" ? undefined : block.horizontalAlign;
  return GROUP_LAYOUT_CONTROL_CONTRACT[layout].requiredMenu.filter(option =>
    !(option.id === "required-justification" && justification !== undefined)
    && !(option.id === "required-grid-tracks" && block.columns !== undefined)
    && !(option.id === "required-minimum-width" && block.minColumnWidth !== undefined && (block.minColumnWidth !== 12 || block.minColumnWidthUnit !== "rem"))
  );
}

/** Gutenberg exposes flex sizing only for Row/Stack children and track spans only for Grid children. */
export function groupChildInspectorCapabilities(parent: { type: string; layout?: LayoutMode; allowSizingOnChildren?: boolean } | null | undefined): GroupChildInspectorCapabilities {
  if (parent?.type !== "group") return { flexItemParent: false, flexItemSizingEnabled: false, gridItemParent: false };
  if (parent.layout === "grid") return { flexItemParent: false, flexItemSizingEnabled: false, gridItemParent: true };
  const flexItemParent = groupChildSizingLayout(parent);
  if (flexItemParent) return { flexItemParent, flexItemSizingEnabled: parent.allowSizingOnChildren === true, gridItemParent: false };
  return { flexItemParent: false, flexItemSizingEnabled: false, gridItemParent: false };
}
