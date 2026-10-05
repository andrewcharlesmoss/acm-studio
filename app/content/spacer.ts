import type { CSSProperties } from "react";
import type { ContentBlock, SpacerUnit } from "./model";

export const SPACER_UNITS: readonly SpacerUnit[] = ["px", "em", "rem", "vw", "vh"];
export const SPACER_SIZE_LIMIT = 1000;
export type SpacerOrientation = "horizontal" | "vertical";

export function spacerOrientationForChildren(block: ContentBlock): SpacerOrientation {
  return (block.type === "group" || block.type === "section") && block.layout === "row" ? "horizontal" : "vertical";
}

type SpacerBlock = Extract<ContentBlock, { type: "spacer" }>;

export function spacerOrientationFor(blocks: ContentBlock[], targetId: string): SpacerOrientation {
  function visit(children: ContentBlock[], childOrientation: SpacerOrientation): SpacerOrientation | undefined {
    for (const block of children) {
      if (block.id === targetId) return childOrientation;
      if (block.type === "group" || block.type === "section") {
        const found = visit(block.children, spacerOrientationForChildren(block));
        if (found) return found;
      } else if (block.type === "columns") {
        const found = visit(block.children, "vertical");
        if (found) return found;
      } else if (block.type === "column" || block.type === "component" || block.type === "quote" || block.type === "buttons") {
        const found = visit(block.children ?? [], "vertical");
        if (found) return found;
      }
    }
    return undefined;
  }

  return visit(blocks, "vertical") ?? "vertical";
}

export function spacerDimensions(block: SpacerBlock, orientation: SpacerOrientation = "vertical"): CSSProperties {
  return {
    height: orientation === "horizontal" ? "auto" : `${block.height}${block.heightUnit ?? "px"}`,
    width: orientation === "horizontal" ? `${block.width ?? 100}${block.widthUnit ?? "px"}` : "100%",
  };
}

export function validSpacerSize(value: unknown, unit: unknown, required = false): boolean {
  if (value === undefined) return !required && unit === undefined;
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= SPACER_SIZE_LIMIT
    && (unit === undefined || SPACER_UNITS.includes(unit as SpacerUnit));
}
