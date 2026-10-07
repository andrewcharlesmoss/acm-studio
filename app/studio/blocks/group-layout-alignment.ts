import type { IconName } from "@acm/icons";
import type { ContentBlock } from "../../content/model";

export type GroupBlock = Extract<ContentBlock, { type: "group" }>;
export type GroupAlignmentChoice = { value: string; label: string; icon: IconName };
export const groupHorizontalChoices: GroupAlignmentChoice[] = [
  { value: "left", label: "Justify items left", icon: "layout.justify-left" },
  { value: "centre", label: "Justify items center", icon: "layout.justify-centre" },
  { value: "right", label: "Justify items right", icon: "layout.justify-right" },
];
export const groupVerticalChoices: GroupAlignmentChoice[] = [
  { value: "top", label: "Align top", icon: "layout.align-top" },
  { value: "centre", label: "Align middle", icon: "layout.align-middle" },
  { value: "bottom", label: "Align bottom", icon: "layout.align-bottom" },
];
const horizontalSpaceBetween: GroupAlignmentChoice = { value: "space-between", label: "Space between items", icon: "layout.justify-space-between" };
const verticalSpaceBetween: GroupAlignmentChoice = { value: "space-between", label: "Space between items", icon: "layout.align-space-between" };
const horizontalStretch: GroupAlignmentChoice = { value: "stretch", label: "Stretch to fill", icon: "layout.justify-stretch" };
const verticalStretch: GroupAlignmentChoice = { value: "stretch", label: "Stretch to fill", icon: "layout.align-stretch" };
export function groupFlexAlignment(block: GroupBlock) {
  const row = block.layout === "row";
  return {
    horizontal: { label: row ? "Justification" : "Horizontal alignment", choices: [...groupHorizontalChoices, row ? horizontalSpaceBetween : horizontalStretch], value: block.horizontalAlign ?? (row ? "left" : "stretch") },
    vertical: { label: row ? "Vertical alignment" : "Justification", choices: [...groupVerticalChoices, row ? verticalStretch : verticalSpaceBetween], value: block.verticalAlign ?? (row ? "centre" : "top") },
  };
}
export function groupUsesContentWidth(block: GroupBlock) {
  return block.layout === "flow" && block.contentWidth !== "full" && block.inheritLayout !== undefined;
}
