import type { CSSProperties } from "react";
import type { ContentBlock, ButtonInteractionState } from "./model";
import { buttonsLayoutStyle } from "./layout";
import { buttonInteractionClassName, paragraphStyleToCss } from "./paragraph-styles";

type ButtonsBlock = Extract<ContentBlock, { type: "buttons" }>;
type ButtonBlock = Extract<ContentBlock, { type: "button" }>;

const inheritedProperties = ["fontFamily", "fontSize", "fontStyle", "fontWeight", "lineHeight", "letterSpacing", "textTransform", "textDecoration", "color"] as const;

/** Only an explicit group setting overrides the content button's theme baseline. */
export function buttonsPresentationStyle(block: ButtonsBlock): CSSProperties {
  const css = paragraphStyleToCss(block.visualStyle);
  const inherited: Record<string, string> = {};
  for (const property of inheritedProperties) {
    if (css[property] !== undefined) {
      const name = property.replace(/[A-Z]/g, character => `-${character.toLowerCase()}`);
      inherited[`--button-group-${name}`] = css[property];
    }
  }
  return { ...buttonsLayoutStyle(block), ...inherited };
}

function itemWidth(group: ButtonsBlock, percentage?: number): string | undefined {
  if (percentage === undefined) return undefined;
  if (group.orientation === "vertical" || percentage === 100) return `${percentage}%`;
  // Gutenberg removes each item's share of the inter-button gaps, so two 50%
  // children fit on one line. Vertical layout has no horizontal gap to remove.
  return `calc(${percentage}% - ${(group.horizontalGap ?? 8) * (1 - percentage / 100)}px)`;
}

/** Base and interaction widths have the same owner; the child field fills it. */
export function buttonItemPresentation(group: ButtonsBlock, child: ButtonBlock, previewState?: ButtonInteractionState): { className: string; style: CSSProperties } {
  const style: CSSProperties & Record<string, string | number | undefined> = { "--button-item-width": itemWidth(group, child.width) };
  let hasWidth = child.width !== undefined;
  for (const state of ["hover", "focus", "active"] as const) {
    const width = itemWidth(group, child.interactionStyles?.[state]?.width);
    if (width !== undefined) {
      style[`--button-${state}-item-width`] = width;
      hasWidth = true;
    }
  }
  return {
    className: ["content-button-item", hasWidth && "has-button-item-width", buttonInteractionClassName(child.interactionStyles, previewState)].filter(Boolean).join(" "),
    style,
  };
}
