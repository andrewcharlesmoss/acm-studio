import type { CSSProperties } from "react";
import type { LayoutMode, LayoutOptions } from "./model";

export const LAYOUT_SPACING_PRESETS = [0, 8, 16, 24, 32, 48, 64, 96] as const;
export const LAYOUT_VALUE_LIMITS = { gap: [0, 120], padding: [0, 160], columns: [1, 6], minColumnWidth: [80, 600] } as const;
export const LAYOUT_BREAKPOINTS = { tablet: 780, mobile: 620 } as const;

export function layoutStyleProperties(options: LayoutOptions): CSSProperties {
  const maxColumns = options.columns ?? 3;
  const columnGap = options.columnGap ?? options.gap ?? 0;
  return {
    ...(options.gap === undefined ? {} : { "--block-layout-gap": `${options.gap}px` }),
    ...(options.columnGap === undefined ? {} : { "--block-layout-column-gap": `${options.columnGap}px` }),
    ...(options.rowGap === undefined ? {} : { "--block-layout-row-gap": `${options.rowGap}px` }),
    ...(options.paddingX === undefined ? {} : { "--block-layout-padding-x": `${options.paddingX}px` }),
    ...(options.paddingY === undefined ? {} : { "--block-layout-padding-y": `${options.paddingY}px` }),
    ...(options.columns === undefined ? {} : { "--block-layout-columns": String(options.columns) }),
    "--block-layout-min-column-width": `${options.minColumnWidth ?? 192}px`,
    "--block-layout-max-column-width": `calc((100% - ${columnGap * (maxColumns - 1)}px) / ${maxColumns})`,
    ...(options.horizontalAlign === undefined ? {} : { "--block-layout-horizontal-align": cssHorizontalAlignment(options.horizontalAlign) }),
    ...(options.verticalAlign === undefined ? {} : { "--block-layout-vertical-align": cssVerticalAlignment(options.verticalAlign) }),
  } as CSSProperties;
}

export function layoutDataAttributes(options: LayoutOptions): Record<string, string> {
  return {
    ...(options.contentWidth ? { "data-layout-width": options.contentWidth } : {}),
    ...(options.stackAt ? { "data-layout-stack-at": options.stackAt } : {}),
  };
}

export function hasLayoutOptions(options: LayoutOptions & { layout?: LayoutMode }): boolean {
  return options.layout !== undefined && options.layout !== "stack"
    || [options.horizontalAlign, options.verticalAlign, options.gap, options.columnGap, options.rowGap, options.paddingX, options.paddingY, options.contentWidth, options.columns, options.minColumnWidth, options.stackAt].some((value) => value !== undefined);
}

export function validLayoutOptions(input: unknown): boolean {
  if (!input || typeof input !== "object" || Array.isArray(input)) return false;
  const value = input as Record<string, unknown>;
  const finiteWithin = (candidate: unknown, min: number, max: number) => candidate === undefined || (typeof candidate === "number" && Number.isFinite(candidate) && candidate >= min && candidate <= max);
  return (value.horizontalAlign === undefined || ["left", "centre", "right", "stretch"].includes(value.horizontalAlign as string))
    && (value.verticalAlign === undefined || ["top", "centre", "bottom", "stretch"].includes(value.verticalAlign as string))
    && finiteWithin(value.gap, ...LAYOUT_VALUE_LIMITS.gap)
    && finiteWithin(value.columnGap, ...LAYOUT_VALUE_LIMITS.gap)
    && finiteWithin(value.rowGap, ...LAYOUT_VALUE_LIMITS.gap)
    && finiteWithin(value.paddingX, ...LAYOUT_VALUE_LIMITS.padding)
    && finiteWithin(value.paddingY, ...LAYOUT_VALUE_LIMITS.padding)
    && (value.contentWidth === undefined || ["full", "constrained"].includes(value.contentWidth as string))
    && (value.columns === undefined || (typeof value.columns === "number" && Number.isInteger(value.columns) && value.columns >= LAYOUT_VALUE_LIMITS.columns[0] && value.columns <= LAYOUT_VALUE_LIMITS.columns[1]))
    && (value.minColumnWidth === undefined || (typeof value.minColumnWidth === "number" && Number.isFinite(value.minColumnWidth) && value.minColumnWidth >= LAYOUT_VALUE_LIMITS.minColumnWidth[0] && value.minColumnWidth <= LAYOUT_VALUE_LIMITS.minColumnWidth[1]))
    && (value.stackAt === undefined || ["tablet", "mobile", "never"].includes(value.stackAt as string));
}

function cssHorizontalAlignment(value: NonNullable<LayoutOptions["horizontalAlign"]>) {
  return value === "centre" ? "center" : value === "right" ? "end" : value === "left" ? "start" : value;
}

function cssVerticalAlignment(value: NonNullable<LayoutOptions["verticalAlign"]>) {
  return value === "centre" ? "center" : value === "bottom" ? "end" : value;
}
