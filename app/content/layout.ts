import { buttonsVerticalAlignment, type ButtonsBlock } from "./buttons-alignment";
import { isReferenceFluidSpacing } from "./reference-spacing";
import type { CSSProperties } from "react";
import type { ContentBlock, GroupLayoutOptions, GroupLayoutHorizontalAlignment, GroupLayoutVerticalAlignment, LayoutHorizontalAlignment, LayoutMode, LayoutVerticalAlignment, ParagraphStyle } from "./model";

export const LAYOUT_SPACING_PRESETS = [0, 8, 16, 24, 32, 48, 64, 96] as const;
export const LAYOUT_VALUE_LIMITS = { gap: [0, 120], padding: [0, 160], columns: [1, 6], minColumnWidth: [80, 600] } as const;
export const GROUP_GRID_VALUE_LIMITS = { columns: [1, 16], minColumnWidth: [0, 600] } as const;
export const LAYOUT_BREAKPOINTS = { tablet: 780, mobile: 620 } as const;

export function flexItemSizingStyle(value: { mode: "fit" | "grow" | "max" | "fixed"; size?: string } | undefined): CSSProperties {
  if (!value) return {};
  if (value.mode === "fit") return { flexGrow: 0, flexShrink: 1, flexBasis: "auto" };
  if (value.mode === "grow") return { flexGrow: 1, flexShrink: 1, flexBasis: "0px" };
  if (!validLayoutLength(value.size)) return {};
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
  // visualStyle is optional on the stored contract. A first sizing edit must
  // create its carrier rather than depending on that property already existing.
  return { ...block, visualStyle: style };
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

/** Gate both authored records and the flattened patches retained in recovery data. */
export function containsGroupLayoutExtensions(value: unknown, seen = new Set<object>(), templateBases: unknown[] = []): boolean {
  if (!value || typeof value !== "object" || seen.has(value)) return false;
  seen.add(value);
  if (Array.isArray(value)) return value.some(item => containsGroupLayoutExtensions(item, seen, templateBases));
  const record = value as Record<string, unknown>;
  const templates = layoutRecord(record.templates);
  const bases = Array.isArray(record.bases) ? record.bases : Array.isArray(templates?.sets) ? templates.sets : templateBases;
  if (Array.isArray(record.overrides) && record.overrides.some(patch => extendedLayoutOverride(patch, record.overrides as unknown[], bases.find(base => layoutRecord(base)?.id === record.setId)))) return true;
  if (record.type === "group" && (typeof record.columns === "number" && record.columns > 6
    || typeof record.minColumnWidth === "number" && record.minColumnWidth < (record.minColumnWidthUnit && record.minColumnWidthUnit !== "px" ? 1 : 80))) return true;
  if (record.gapLength !== undefined) return true;
  if ((record.type === "group" || record.type === "element" && record.element === "content") && containsFluidGroupSpacing(record.visualStyle)) return true;
  const sizing = record.gridItemSizing;
  if (sizing && typeof sizing === "object" && Object.values(sizing).some(span => typeof span === "number" && span > 6)) return true;
  const flexSize = layoutRecord(record.flexItemSizing)?.size;
  if (typeof flexSize === "string" && Number.parseFloat(flexSize) === 0) return true;
  return Object.values(record).some(item => containsGroupLayoutExtensions(item, seen, bases));
}

function layoutRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : undefined;
}

function containsFluidGroupSpacing(value: unknown): boolean {
  if (typeof value === "string") return value.split(/\s+/).some(isReferenceFluidSpacing);
  if (!value || typeof value !== "object") return false;
  return Object.values(value).some(containsFluidGroupSpacing);
}

function layoutOverrideTarget(base: unknown, path: string[]): unknown {
  return path.reduce<unknown>((current, key) => {
    if (["__proto__", "constructor", "prototype"].includes(key)) return undefined;
    return key.startsWith("@") && Array.isArray(current) ? current.find(item => layoutRecord(item)?.id === key.slice(1)) : layoutRecord(current)?.[key];
  }, base);
}

function extendedLayoutOverride(value: unknown, patches: unknown[], base: unknown): boolean {
  const patch = layoutRecord(value);
  if (!patch || patch.remove || !Array.isArray(patch.path) || !patch.path.every(key => typeof key === "string")) return false;
  const path = patch.path as string[];
  const key = path.at(-1);
  if (key === "gapLength" && patch.value !== undefined) return true;
  if (path.includes("visualStyle") && containsFluidGroupSpacing(patch.value)) return true;
  if (key === "size" && path.includes("flexItemSizing") && typeof patch.value === "string" && Number.parseFloat(patch.value) === 0) return true;
  if (key === "flexItemSizing" && typeof layoutRecord(patch.value)?.size === "string" && Number.parseFloat(layoutRecord(patch.value)!.size as string) === 0) return true;
  if (key === "gridItemSizing" && Object.values(layoutRecord(patch.value) ?? {}).some(span => typeof span === "number" && span > 6)) return true;
  if ((key === "columns" || (key === "columnSpan" || key === "rowSpan") && path.includes("gridItemSizing")) && typeof patch.value === "number" && patch.value > 6) return true;
  if (key !== "minColumnWidth" && key !== "minColumnWidthUnit") return false;
  const parentPath = path.slice(0, -1);
  let parent = layoutRecord(layoutOverrideTarget(base, parentPath));
  let unit = parent?.minColumnWidthUnit;
  let minimum = parent?.minColumnWidth;
  for (const candidate of patches) {
    const sibling = layoutRecord(candidate);
    if (!sibling || !Array.isArray(sibling.path)) continue;
    if (JSON.stringify(sibling.path) === JSON.stringify(parentPath)) { parent = layoutRecord(sibling.value); unit = parent?.minColumnWidthUnit; minimum = parent?.minColumnWidth; }
    if (JSON.stringify(sibling.path) === JSON.stringify([...parentPath, "minColumnWidthUnit"])) unit = sibling.remove ? undefined : sibling.value;
    if (JSON.stringify(sibling.path) === JSON.stringify([...parentPath, "minColumnWidth"])) minimum = sibling.remove ? undefined : sibling.value;
  }
  // Missing recovery bases are ambiguous. Reject the extension without rewriting
  // the source; a known relative-unit base retains its legacy >= 1 contract.
  return typeof minimum === "number" && minimum < (unit && unit !== "px" ? 1 : 80);
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
  const gapLength = options.gapLength;
  return {
    ...(options.contentSize && options.inheritLayout === false ? { "--block-content-size": options.contentSize } : {}),
    ...(options.wideSize && options.inheritLayout === false ? { "--block-wide-size": options.wideSize } : {}),
    ...(options.position === "sticky" ? { position: "sticky", top: "0px", zIndex: 10 } : {}),
    ...(options.gap === undefined ? {} : { "--block-layout-gap": `${options.gap}px` }),
    ...(options.columnGap === undefined ? {} : { "--block-layout-column-gap": `${options.columnGap}px` }),
    ...(options.rowGap === undefined ? {} : { "--block-layout-row-gap": `${options.rowGap}px` }),
    ...(gapLength === undefined ? {} : { "--block-layout-gap": gapLength, "--block-layout-column-gap": gapLength, "--block-layout-row-gap": gapLength }),
    ...(options.paddingX === undefined ? {} : { "--block-layout-padding-x": `${options.paddingX}px` }),
    ...(options.paddingY === undefined ? {} : { "--block-layout-padding-y": `${options.paddingY}px` }),
    ...(options.columns === undefined ? {} : { "--block-layout-columns": String(options.columns) }),
    "--block-layout-min-column-width": `${options.minColumnWidth ?? 192}${options.minColumnWidthUnit ?? "px"}`,
    ...(options.type === "group" && options.layout === "grid" ? { "--block-layout-grid-repeat": options.fillAvailableSpace === false ? "auto-fill" : "auto-fit" } : {}),
    "--block-layout-max-column-width": options.type === "group" && options.layout === "grid" && options.columns === undefined && options.gridMode === "auto" ? "0px" : gapLength ? `calc((100% - (${gapLength} * ${maxColumns - 1})) / ${maxColumns})` : `calc((100% - ${columnGap * (maxColumns - 1)}px) / ${maxColumns})`,
    // Group Grid tracks stretch their children. Retain inactive flex/constrained alignment
    // in the record, but prevent it (or an ancestor's variable) from affecting Grid.
    ...(options.type === "group" && options.layout === "grid" ? { "--block-layout-horizontal-align": "stretch", "--block-layout-vertical-align": "stretch" } : {
      ...(options.horizontalAlign === undefined ? {} : { "--block-layout-horizontal-align": cssHorizontalAlignment(options.horizontalAlign) }),
      ...(options.verticalAlign === undefined ? {} : { "--block-layout-vertical-align": cssVerticalAlignment(options.verticalAlign) }),
    }),
    ...(options.type === "group" && (options.layout === "row" || options.layout === "stack") ? {
      "--block-layout-horizontal-align": cssHorizontalAlignment(options.horizontalAlign ?? (options.layout === "row" ? "left" : "stretch")),
      "--block-layout-vertical-align": cssVerticalAlignment(options.verticalAlign ?? (options.layout === "row" ? "centre" : "top")),
    } : {}),
  } as CSSProperties;
}

export function layoutDataAttributes(options: RenderableLayoutOptions & { layout?: LayoutMode }): Record<string, string> {
  return {
    ...(options.contentWidth !== "full" && options.inheritLayout !== undefined && (options.layout === undefined || options.layout === "flow" || options.type !== "group" && options.layout === "stack") ? { "data-layout-constrained": "true" } : {}),
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
    || [options.horizontalAlign, options.verticalAlign, options.gapLength, options.gap, options.columnGap, options.rowGap, options.paddingX, options.paddingY, options.contentWidth, options.columns, options.minColumnWidth, options.stackAt, options.inheritLayout, options.allowWrap, options.gridMode, options.contentSize, options.wideSize, options.minColumnWidthUnit, options.fillAvailableSpace, options.allowSizingOnChildren].some((value) => value !== undefined);
}

export function validLayoutOptions(input: unknown, allowSpaceBetween = false): boolean {
  if (!input || typeof input !== "object" || Array.isArray(input)) return false;
  const value = input as Record<string, unknown>;
  const group = value.type === "group";
  const columnLimits = group ? GROUP_GRID_VALUE_LIMITS.columns : LAYOUT_VALUE_LIMITS.columns;
  const finiteWithin = (candidate: unknown, min: number, max: number) => candidate === undefined || (typeof candidate === "number" && Number.isFinite(candidate) && candidate >= min && candidate <= max);
  return (value.horizontalAlign === undefined || ["left", "centre", "right", "stretch", ...(allowSpaceBetween ? ["space-between"] : [])].includes(value.horizontalAlign as string))
    && (value.verticalAlign === undefined || ["top", "centre", "bottom", "stretch", ...(allowSpaceBetween ? ["space-between"] : [])].includes(value.verticalAlign as string))
    && (value.gapLength === undefined || (group || value.type === "element" && value.element === "content") && validGroupGapLength(value.gapLength))
    && finiteWithin(value.gap, ...LAYOUT_VALUE_LIMITS.gap)
    && finiteWithin(value.columnGap, ...LAYOUT_VALUE_LIMITS.gap)
    && finiteWithin(value.rowGap, ...LAYOUT_VALUE_LIMITS.gap)
    && finiteWithin(value.paddingX, ...LAYOUT_VALUE_LIMITS.padding)
    && finiteWithin(value.paddingY, ...LAYOUT_VALUE_LIMITS.padding)
    && (value.contentWidth === undefined || ["full", "constrained"].includes(value.contentWidth as string))
    && (value.columns === undefined || (typeof value.columns === "number" && Number.isInteger(value.columns) && value.columns >= columnLimits[0] && value.columns <= columnLimits[1]))
    && (value.minColumnWidth === undefined || (typeof value.minColumnWidth === "number" && Number.isFinite(value.minColumnWidth) && value.minColumnWidth >= (group ? 0 : value.minColumnWidthUnit && value.minColumnWidthUnit !== "px" ? 1 : LAYOUT_VALUE_LIMITS.minColumnWidth[0]) && value.minColumnWidth <= LAYOUT_VALUE_LIMITS.minColumnWidth[1]))
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
export function validGroupGapLength(value: unknown): value is string {
  return isReferenceFluidSpacing(value) || validLayoutLength(value) && /(?:px|%|em|rem|vw|vh)$/.test(value);
}

export function validLayoutLength(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const match = /^(\d+(?:\.\d+)?)(px|em|rem|%|vw|vh|ch)$/.exec(value);
  return Boolean(match && Number(match[1]) >= 0 && Number(match[1]) <= 4000);
}
