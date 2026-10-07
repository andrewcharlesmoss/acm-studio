import type { CSSProperties } from "react";
import type { GroupLayoutOptions, GroupLayoutHorizontalAlignment, GroupLayoutVerticalAlignment, LayoutHorizontalAlignment, LayoutMode, LayoutVerticalAlignment } from "./model";

export const LAYOUT_SPACING_PRESETS = [0, 8, 16, 24, 32, 48, 64, 96] as const;
export const LAYOUT_VALUE_LIMITS = { gap: [0, 120], padding: [0, 160], columns: [1, 6], minColumnWidth: [80, 600] } as const;
export const LAYOUT_BREAKPOINTS = { tablet: 780, mobile: 620 } as const;

type RenderableLayoutOptions = GroupLayoutOptions & {
  type?: string;
  horizontalAlign?: LayoutHorizontalAlignment | GroupLayoutHorizontalAlignment;
  verticalAlign?: LayoutVerticalAlignment | GroupLayoutVerticalAlignment;
};

export function layoutStyleProperties(options: RenderableLayoutOptions & { position?: "sticky"; layout?: LayoutMode }): CSSProperties {
  const maxColumns = options.columns ?? 3;
  const columnGap = options.columnGap ?? options.gap ?? 0;
  return {
    ...(options.contentSize && options.inheritLayout === false ? { "--block-content-size": options.contentSize } : {}),
    ...(options.wideSize && options.inheritLayout === false ? { "--block-wide-size": options.wideSize } : {}),
    ...(options.position === "sticky" ? { position: "sticky", top: "0px", zIndex: 10 } : {}),
    ...(options.gap === undefined ? {} : { "--block-layout-gap": `${options.gap}px` }),
    ...(options.columnGap === undefined ? {} : { "--block-layout-column-gap": `${options.columnGap}px` }),
    ...(options.rowGap === undefined ? {} : { "--block-layout-row-gap": `${options.rowGap}px` }),
    ...(options.paddingX === undefined ? {} : { "--block-layout-padding-x": `${options.paddingX}px` }),
    ...(options.paddingY === undefined ? {} : { "--block-layout-padding-y": `${options.paddingY}px` }),
    ...(options.columns === undefined ? {} : { "--block-layout-columns": String(options.columns) }),
    "--block-layout-min-column-width": `${options.minColumnWidth ?? 192}${options.minColumnWidthUnit ?? "px"}`,
    "--block-layout-max-column-width": options.layout === "grid" && options.gridMode === "auto" && options.columns === undefined ? "0px" : `calc((100% - ${columnGap * (maxColumns - 1)}px) / ${maxColumns})`,
    // Group Grid tracks stretch their children. Retain inactive flex/constrained alignment
    // in the record, but prevent it (or an ancestor's variable) from affecting Grid.
    ...(options.type === "group" && options.layout === "grid" ? { "--block-layout-horizontal-align": "stretch", "--block-layout-vertical-align": "stretch" } : {
      ...(options.horizontalAlign === undefined ? {} : { "--block-layout-horizontal-align": cssHorizontalAlignment(options.horizontalAlign) }),
      ...(options.verticalAlign === undefined ? {} : { "--block-layout-vertical-align": cssVerticalAlignment(options.verticalAlign) }),
    }),
  } as CSSProperties;
}

export function layoutDataAttributes(options: RenderableLayoutOptions & { layout?: LayoutMode }): Record<string, string> {
  return {
    ...(options.contentWidth !== "full" && options.inheritLayout !== undefined && (options.layout === undefined || options.layout === "flow" || options.layout === "stack") ? { "data-layout-constrained": "true" } : {}),
    ...(options.allowWrap !== undefined ? { "data-layout-wrap": String(options.allowWrap) } : {}),
    ...(options.gridMode ? { "data-layout-grid-mode": options.gridMode } : {}),
    ...(options.horizontalAlign && !(options.type === "group" && options.layout === "grid") ? { "data-layout-horizontal-align": options.horizontalAlign } : {}),
    ...(options.horizontalAlign && options.layout === "flow" ? { "data-layout-justification": options.horizontalAlign } : {}),
    ...(options.contentWidth ? { "data-layout-width": options.contentWidth } : {}),
    ...(options.stackAt ? { "data-layout-stack-at": options.stackAt } : {}),
  };
}

export function hasLayoutOptions(options: RenderableLayoutOptions & { layout?: LayoutMode }): boolean {
  return options.layout !== undefined && options.layout !== "stack"
    || [options.horizontalAlign, options.verticalAlign, options.gap, options.columnGap, options.rowGap, options.paddingX, options.paddingY, options.contentWidth, options.columns, options.minColumnWidth, options.stackAt, options.inheritLayout, options.allowWrap, options.gridMode, options.contentSize, options.wideSize, options.minColumnWidthUnit].some((value) => value !== undefined);
}

export function validLayoutOptions(input: unknown, allowSpaceBetween = false): boolean {
  if (!input || typeof input !== "object" || Array.isArray(input)) return false;
  const value = input as Record<string, unknown>;
  const finiteWithin = (candidate: unknown, min: number, max: number) => candidate === undefined || (typeof candidate === "number" && Number.isFinite(candidate) && candidate >= min && candidate <= max);
  return (value.horizontalAlign === undefined || ["left", "centre", "right", "stretch", ...(allowSpaceBetween ? ["space-between"] : [])].includes(value.horizontalAlign as string))
    && (value.verticalAlign === undefined || ["top", "centre", "bottom", "stretch", ...(allowSpaceBetween ? ["space-between"] : [])].includes(value.verticalAlign as string))
    && finiteWithin(value.gap, ...LAYOUT_VALUE_LIMITS.gap)
    && finiteWithin(value.columnGap, ...LAYOUT_VALUE_LIMITS.gap)
    && finiteWithin(value.rowGap, ...LAYOUT_VALUE_LIMITS.gap)
    && finiteWithin(value.paddingX, ...LAYOUT_VALUE_LIMITS.padding)
    && finiteWithin(value.paddingY, ...LAYOUT_VALUE_LIMITS.padding)
    && (value.contentWidth === undefined || ["full", "constrained"].includes(value.contentWidth as string))
    && (value.columns === undefined || (typeof value.columns === "number" && Number.isInteger(value.columns) && value.columns >= LAYOUT_VALUE_LIMITS.columns[0] && value.columns <= LAYOUT_VALUE_LIMITS.columns[1]))
    && (value.minColumnWidth === undefined || (typeof value.minColumnWidth === "number" && Number.isFinite(value.minColumnWidth) && value.minColumnWidth >= (value.minColumnWidthUnit && value.minColumnWidthUnit !== "px" ? 1 : LAYOUT_VALUE_LIMITS.minColumnWidth[0]) && value.minColumnWidth <= LAYOUT_VALUE_LIMITS.minColumnWidth[1]))
    && (value.contentSize === undefined || allowSpaceBetween && validLayoutLength(value.contentSize))
    && (value.wideSize === undefined || allowSpaceBetween && validLayoutLength(value.wideSize))
    && (value.inheritLayout === undefined || allowSpaceBetween && typeof value.inheritLayout === "boolean")
    && (value.allowWrap === undefined || allowSpaceBetween && typeof value.allowWrap === "boolean")
    && (value.gridMode === undefined || allowSpaceBetween && ["auto", "manual"].includes(value.gridMode as string))
    && (value.minColumnWidthUnit === undefined || allowSpaceBetween && ["px", "em", "rem", "vw"].includes(value.minColumnWidthUnit as string))
    && (value.stackAt === undefined || ["tablet", "mobile", "never"].includes(value.stackAt as string));
}

function cssHorizontalAlignment(value: NonNullable<RenderableLayoutOptions["horizontalAlign"]>) {
  return value === "centre" ? "center" : value === "right" ? "end" : value === "left" ? "start" : value;
}

export function cssVerticalAlignment(value: NonNullable<RenderableLayoutOptions["verticalAlign"]>) {
  return value === "top" ? "start" : value === "centre" ? "center" : value === "bottom" ? "end" : value;
}

export function buttonsLayoutStyle(block: { justification?: "left" | "centre" | "right" | "space-between"; orientation?: "horizontal" | "vertical"; allowWrap?: boolean; horizontalGap?: number; verticalGap?: number }): CSSProperties {
  return { display: "flex", flexDirection: block.orientation === "vertical" ? "column" : "row", flexWrap: block.allowWrap === false ? "nowrap" : "wrap", justifyContent: block.justification === "centre" ? "center" : block.justification === "right" ? "flex-end" : block.justification === "space-between" ? "space-between" : "flex-start", gap: `${block.verticalGap ?? 8}px ${block.horizontalGap ?? 8}px`, alignItems: block.orientation === "vertical" ? block.justification === "centre" ? "center" : block.justification === "right" ? "flex-end" : "flex-start" : "center" };
}

/** Bounded CSS lengths; arbitrary CSS cannot enter layout variables. */
export function validLayoutLength(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const match = /^(\d+(?:\.\d+)?)(px|em|rem|%|vw|vh|ch)$/.exec(value);
  return Boolean(match && Number(match[1]) >= 0 && Number(match[1]) <= 4000);
}
