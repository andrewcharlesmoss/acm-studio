import { buttonsVerticalAlignment, type ButtonsBlock } from "./buttons-alignment";
import type { CSSProperties } from "react";
import type { ContentBlock, GroupLayoutOptions, GroupLayoutHorizontalAlignment, GroupLayoutVerticalAlignment, LayoutHorizontalAlignment, LayoutMode, LayoutVerticalAlignment, ParagraphStyle } from "./model";

export const LAYOUT_SPACING_PRESETS = [0, 8, 16, 24, 32, 48, 64, 96] as const;
export const LAYOUT_VALUE_LIMITS = { gap: [0, 120], padding: [0, 160], columns: [1, 6], minColumnWidth: [80, 600] } as const;
export const LAYOUT_BREAKPOINTS = { tablet: 780, mobile: 620 } as const;

export function flexItemSizingStyle(value: { mode: "fit" | "grow" | "max" | "fixed"; size?: string } | undefined): CSSProperties {
  if (!value) return {};
  if (value.mode === "fit") return { flexGrow: 0, flexShrink: 1, flexBasis: "auto" };
  if (value.mode === "grow") return { flexGrow: 1, flexShrink: 1, flexBasis: "0px" };
  if (!validLayoutLength(value.size) || Number.parseFloat(value.size) <= 0) return {};
  return value.mode === "max"
    ? { flexGrow: 0, flexShrink: 1, flexBasis: value.size }
    : { flexGrow: 0, flexShrink: 0, flexBasis: value.size };
}

export function groupChildSizingLayout(parent: { type: string; layout?: LayoutMode; allowSizingOnChildren?: boolean } | null | undefined): "row" | "stack" | null {
  if (parent?.type !== "group") return null;
  // The legacy flag remains readable, but Gutenberg exposes sizing on every
  // direct Row and Stack child without a parent opt-in.
  return parent.layout === "row" || parent.layout === "stack" ? parent.layout : null;
}

export function blockLayoutItemStyle(block: { type: string; style?: unknown; visualStyle?: ParagraphStyle }): ParagraphStyle | undefined {
  if (block.type === "paragraph" || block.type === "columns" || block.type === "column") {
    const legacyVisualStyle = "visualStyle" in block ? block.visualStyle : undefined;
    const legacySizing = { ...(legacyVisualStyle?.flexItemSizing ? { flexItemSizing: legacyVisualStyle.flexItemSizing } : {}), ...(legacyVisualStyle?.flexItemSizingActive === true ? { flexItemSizingActive: true as const } : {}), ...(legacyVisualStyle?.gridItemSizing ? { gridItemSizing: legacyVisualStyle.gridItemSizing } : {}) };
    const authoredStyle = block.style && typeof block.style === "object" && !Array.isArray(block.style) ? block.style as ParagraphStyle : {};
    return { ...legacySizing, ...authoredStyle };
  }
  return "visualStyle" in block ? block.visualStyle : undefined;
}

export function updateBlockLayoutItemStyle(block: ContentBlock, update: (style: ParagraphStyle) => ParagraphStyle): ContentBlock {
  const current = blockLayoutItemStyle(block) ?? {};
  const next = update({ ...current });
  const flexSizingChanged = JSON.stringify(current.flexItemSizing) !== JSON.stringify(next.flexItemSizing);
  const gridSizingChanged = JSON.stringify(current.gridItemSizing) !== JSON.stringify(next.gridItemSizing);
  const legacyVisualStyle = block.type === "paragraph" || block.type === "columns" || block.type === "column" ? block.visualStyle : undefined;
  const authoredStyle = block.type === "paragraph" || block.type === "columns" || block.type === "column" ? block.style : undefined;
  if (flexSizingChanged) {
    if (next.flexItemSizing) next.flexItemSizingActive = true;
    else delete next.flexItemSizingActive;
  } else if (legacyVisualStyle?.flexItemSizing && !authoredStyle?.flexItemSizing) {
    // Keep an unedited legacy flex value in its original visualStyle carrier;
    // moving it to the new scoped style field would change old output.
    delete next.flexItemSizing;
    delete next.flexItemSizingActive;
  }
  if (!gridSizingChanged && legacyVisualStyle?.gridItemSizing && !authoredStyle?.gridItemSizing) {
    // Grid spans had the same legacy unscoped rendering contract.
    delete next.gridItemSizing;
  }
  const style = Object.keys(next).length ? next : undefined;
  if (block.type === "paragraph" || block.type === "columns" || block.type === "column") {
    const visualStyle = { ...block.visualStyle };
    if (flexSizingChanged) {
      delete visualStyle.flexItemSizing;
      delete visualStyle.flexItemSizingActive;
    }
    if (gridSizingChanged) delete visualStyle.gridItemSizing;
    return { ...block, style, visualStyle: Object.keys(visualStyle).length ? visualStyle : undefined };
  }
  return "visualStyle" in block ? { ...block, visualStyle: style } : block;
}

export function resetBlockLayoutItemSizing(block: ContentBlock): ContentBlock {
  return updateBlockLayoutItemStyle(block, style => {
    const next = { ...style };
    delete next.flexItemSizing;
    delete next.flexItemSizingActive;
    delete next.gridItemSizing;
    return next;
  });
}

export function groupChildFlexItemStyle(parent: { type: "group"; layout?: LayoutMode; allowSizingOnChildren?: boolean }, childStyle: { flexItemSizing?: { mode: "fit" | "grow" | "max" | "fixed"; size?: string }; flexItemSizingActive?: boolean } | undefined): CSSProperties | undefined {
  // Existing parents with the legacy flag keep their original behaviour. A
  // child edited under a legacy-disabled parent opts in individually, so its
  // siblings' dormant values cannot suddenly change their rendered widths.
  if (!groupChildSizingLayout(parent) || parent.allowSizingOnChildren !== true && childStyle?.flexItemSizingActive !== true) return undefined;
  return flexItemSizingStyle(childStyle?.flexItemSizing);
}

export function updateFlexItemChild(parent: Extract<ContentBlock, { type: "group" }>, child: ContentBlock): Extract<ContentBlock, { type: "group" }> {
  return {
    ...parent,
    children: parent.children.map(candidate => candidate.id === child.id ? child : candidate),
  };
}

export function containsFlexItemSizing(value: unknown, seen = new Set<object>()): boolean {
  if (!value || typeof value !== "object" || seen.has(value)) return false;
  seen.add(value);
  if (Array.isArray(value)) return value.some(item => containsFlexItemSizing(item, seen));
  const record = value as Record<string, unknown>;
  if (record.flexItemSizing !== undefined || record.flexItemSizingActive === true || record.allowSizingOnChildren === true) return true;
  return Object.values(record).some(item => containsFlexItemSizing(item, seen));
}

export function containsScopedFlexItemSizing(value: unknown, seen = new Set<object>()): boolean {
  if (!value || typeof value !== "object" || seen.has(value)) return false;
  seen.add(value);
  if (Array.isArray(value)) return value.some(item => containsScopedFlexItemSizing(item, seen));
  const record = value as Record<string, unknown>;
  if (Object.hasOwn(record, "flexItemSizingActive")) return true;
  return Object.values(record).some(item => containsScopedFlexItemSizing(item, seen));
}

export function containsGroupGridFillAvailableSpace(value: unknown, seen = new Set<object>()): boolean {
  if (!value || typeof value !== "object" || seen.has(value)) return false;
  seen.add(value);
  if (Array.isArray(value)) return value.some(item => containsGroupGridFillAvailableSpace(item, seen));
  const record = value as Record<string, unknown>;
  return record.type === "group" && Object.hasOwn(record, "fillAvailableSpace")
    || Object.values(record).some(item => containsGroupGridFillAvailableSpace(item, seen));
}

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
    ...(options.type === "group" && options.layout === "grid" ? { "--block-layout-grid-repeat": options.fillAvailableSpace === false ? "auto-fill" : "auto-fit" } : {}),
    "--block-layout-max-column-width": options.layout === "grid" && options.columns === undefined && options.gridMode === "auto" ? "0px" : `calc((100% - ${columnGap * ((maxColumns ?? 1) - 1)}px) / ${maxColumns ?? 1})`,
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
    ...(options.type === "group" && options.layout === "grid" && options.fillAvailableSpace === false ? { "data-layout-fill-available": "false" } : {}),
    ...(options.horizontalAlign && !(options.type === "group" && options.layout === "grid") ? { "data-layout-horizontal-align": options.horizontalAlign } : {}),
    ...(options.layout === "flow" && options.type === "group" && options.contentWidth !== "full" && options.inheritLayout !== undefined ? { "data-layout-justification": options.horizontalAlign ?? "centre" } : options.horizontalAlign && options.layout === "flow" ? { "data-layout-justification": options.horizontalAlign } : {}),
    ...(options.contentWidth ? { "data-layout-width": options.contentWidth } : {}),
    ...(options.stackAt ? { "data-layout-stack-at": options.stackAt } : {}),
  };
}

export function hasLayoutOptions(options: RenderableLayoutOptions & { layout?: LayoutMode }): boolean {
  return options.layout !== undefined && options.layout !== "stack"
    || [options.horizontalAlign, options.verticalAlign, options.gap, options.columnGap, options.rowGap, options.paddingX, options.paddingY, options.contentWidth, options.columns, options.minColumnWidth, options.stackAt, options.inheritLayout, options.allowWrap, options.gridMode, options.contentSize, options.wideSize, options.minColumnWidthUnit, options.fillAvailableSpace, options.allowSizingOnChildren].some((value) => value !== undefined);
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
    && (value.fillAvailableSpace === undefined || allowSpaceBetween && typeof value.fillAvailableSpace === "boolean")
    && (value.allowSizingOnChildren === undefined || allowSpaceBetween && typeof value.allowSizingOnChildren === "boolean")
    && (value.minColumnWidthUnit === undefined || allowSpaceBetween && ["px", "em", "rem", "vw"].includes(value.minColumnWidthUnit as string))
    && (value.stackAt === undefined || ["tablet", "mobile", "never"].includes(value.stackAt as string));
}

function cssHorizontalAlignment(value: NonNullable<RenderableLayoutOptions["horizontalAlign"]>) {
  return value === "centre" ? "center" : value === "right" ? "end" : value === "left" ? "start" : value;
}

export function cssVerticalAlignment(value: NonNullable<RenderableLayoutOptions["verticalAlign"]>) {
  return value === "top" ? "start" : value === "centre" ? "center" : value === "bottom" ? "end" : value;
}

export function buttonsLayoutStyle(block: Pick<ButtonsBlock, "orientation" | "justification" | "verticalAlign" | "allowWrap" | "horizontalGap" | "verticalGap">): CSSProperties {
  const vertical = block.orientation === "vertical";
  const alignment = buttonsVerticalAlignment(block);
  return { display: "flex", flexDirection: vertical ? "column" : "row", flexWrap: block.allowWrap === false ? "nowrap" : "wrap", justifyContent: vertical ? alignment === "centre" ? "center" : alignment === "bottom" ? "flex-end" : alignment === "space-between" ? "space-between" : "flex-start" : block.justification === "centre" ? "center" : block.justification === "right" ? "flex-end" : block.justification === "space-between" ? "space-between" : "flex-start", gap: `${block.verticalGap ?? 8}px ${block.horizontalGap ?? 8}px`, alignItems: vertical ? block.justification === "centre" ? "center" : block.justification === "right" ? "flex-end" : block.justification === "stretch" ? "stretch" : "flex-start" : alignment === "centre" ? "center" : alignment === "bottom" ? "flex-end" : alignment === "stretch" ? "stretch" : "flex-start" };
}

/** Bounded CSS lengths; arbitrary CSS cannot enter layout variables. */
export function validLayoutLength(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const match = /^(\d+(?:\.\d+)?)(px|em|rem|%|vw|vh|ch)$/.exec(value);
  return Boolean(match && Number(match[1]) >= 0 && Number(match[1]) <= 4000);
}
