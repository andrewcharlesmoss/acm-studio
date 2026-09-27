import type { CSSProperties } from "react";
import type { ContentBlock, SpacerUnit } from "./model";

export const SPACER_UNITS: readonly SpacerUnit[] = ["px", "em", "rem", "vw", "vh"];
export const SPACER_SIZE_LIMIT = 1000;

type SpacerBlock = Extract<ContentBlock, { type: "spacer" }>;

export function spacerDimensions(block: SpacerBlock): CSSProperties {
  return {
    height: `${block.height}${block.heightUnit ?? "px"}`,
    width: block.width === undefined ? "100%" : `${block.width}${block.widthUnit ?? "px"}`,
  };
}

export function validSpacerSize(value: unknown, unit: unknown, required = false): boolean {
  if (value === undefined) return !required && unit === undefined;
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= SPACER_SIZE_LIMIT
    && (unit === undefined || SPACER_UNITS.includes(unit as SpacerUnit));
}
