import type { IconName } from "@acm/icons";
import type { ContentBlock } from "../../content/model";

export type GroupBlock = Extract<ContentBlock, { type: "group" }>;
export type GroupAlignmentChoice = { value: string; label: string; icon: IconName };
export const groupHorizontalChoices: GroupAlignmentChoice[] = [
  { value: "left", label: "Left", icon: "arrange.align-left" },
  { value: "centre", label: "Centre", icon: "arrange.align-centre-horizontal" },
  { value: "right", label: "Right", icon: "arrange.align-right" },
];
export const groupVerticalChoices: GroupAlignmentChoice[] = [
  { value: "top", label: "Top", icon: "arrange.align-top" },
  { value: "centre", label: "Centre", icon: "arrange.align-centre-vertical" },
  { value: "bottom", label: "Bottom", icon: "arrange.align-bottom" },
];
const spaceBetween: GroupAlignmentChoice = { value: "space-between", label: "Space between", icon: "text.justify" };
const stretch: GroupAlignmentChoice = { value: "stretch", label: "Stretch", icon: "layout.columns" };
export function groupFlexAlignment(block: GroupBlock) {
  const row = block.layout === "row";
  return {
    horizontal: { label: row ? "Justification" : "Horizontal alignment", choices: [...groupHorizontalChoices, row ? spaceBetween : stretch], value: block.horizontalAlign ?? (row ? "left" : "stretch") },
    vertical: { label: row ? "Vertical alignment" : "Justification", choices: [...groupVerticalChoices, row ? stretch : spaceBetween], value: block.verticalAlign ?? (row ? "centre" : "top") },
  };
}
export function groupUsesContentWidth(block: GroupBlock) {
  return block.layout === "flow" && block.contentWidth !== "full" && block.inheritLayout !== undefined;
}
