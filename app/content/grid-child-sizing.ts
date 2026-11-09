export type GridItemSizing = { columnSpan?: number; rowSpan?: number };
type GridParent = { id?: string; type: string; layout?: string; gridMode?: string; minColumnWidth?: number; minColumnWidthUnit?: string };

export function groupGridContainerName(parent: GridParent): string {
  let hash = 2166136261;
  for (const character of parent.id ?? "") hash = Math.imul(hash ^ character.charCodeAt(0), 16777619) >>> 0;
  return `acm-grid-${hash.toString(36)}`;
}

export function groupGridItemClassName(parent: GridParent, style: { gridItemSizing?: GridItemSizing } | undefined): string {
  const span = style?.gridItemSizing?.columnSpan;
  return parent.type === "group" && parent.layout === "grid" && parent.gridMode !== "manual" && span ? `${groupGridContainerName(parent)}-span-${span}` : "";
}

/** Gutenberg collapses responsive spans before they would create implicit tracks. */
export function groupGridResponsiveCss(parent: GridParent, styles: ({ gridItemSizing?: GridItemSizing } | undefined)[]): string {
  if (parent.type !== "group" || parent.layout !== "grid" || parent.gridMode === "manual") return "";
  const unit = parent.minColumnWidthUnit && ["px", "rem", "em", "vw"].includes(parent.minColumnWidthUnit) ? parent.minColumnWidthUnit : parent.minColumnWidth === undefined ? "rem" : "px";
  const minimum = parent.minColumnWidth ?? (unit === "px" ? 192 : 12);
  const gap = unit === "px" ? 24 : 1.5;
  const name = groupGridContainerName(parent);
  return [...new Set(styles.flatMap(style => style?.gridItemSizing?.columnSpan ? [style.gridItemSizing.columnSpan] : []))].map(span => {
    const breakpoint = Math.max(span * minimum + (span - 1) * gap, 2 * minimum + gap - 1);
    // Legacy Studio data also accepts viewport units. Keep their meaning rather
    // than reinterpreting the stored number as rem when adapting its span.
    const threshold = unit === "vw" ? `max(calc(${span * minimum}vw + ${(span - 1) * 24}px),calc(${2 * minimum}vw + 23px))` : `${breakpoint}${unit}`;
    return `@container ${name} (max-width:${threshold}){.${name}-span-${span}{grid-column:${span > 1 ? "1/-1" : "auto"}!important;grid-row:auto!important;}}`;
  }).join("");
}

export function validGridItemSizing(value: unknown): value is GridItemSizing {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return Object.keys(record).length > 0
    && Object.keys(record).every(key => key === "columnSpan" || key === "rowSpan")
    && [record.columnSpan, record.rowSpan].every(span => span === undefined || Number.isInteger(span) && (span as number) >= 1 && (span as number) <= 16);
}

export function containsGridItemSizing(value: unknown, seen = new Set<object>()): boolean {
  if (!value || typeof value !== "object" || seen.has(value)) return false;
  seen.add(value);
  if (Array.isArray(value)) return value.some(item => containsGridItemSizing(item, seen));
  const record = value as Record<string, unknown>;
  if (record.gridItemSizing !== undefined) return true;
  return Object.values(record).some(item => containsGridItemSizing(item, seen));
}

export function gridItemSizingStyle(value: GridItemSizing | undefined) {
  return {
    ...(value?.columnSpan === undefined ? {} : { gridColumn: `span ${value.columnSpan}` }),
    ...(value?.rowSpan === undefined ? {} : { gridRow: `span ${value.rowSpan}` }),
  };
}

export function groupGridItemStyle(parent: { type: string; layout?: string }, childStyle: { gridItemSizing?: GridItemSizing } | undefined) {
  return parent.type === "group" && parent.layout === "grid" ? gridItemSizingStyle(childStyle?.gridItemSizing) : {};
}

export function gridSpanFromDelta(startSpan: number, delta: number, trackStride: number, maximum: number) {
  const steps = Number.isFinite(trackStride) && trackStride > 0 ? Math.round(delta / trackStride) : 0;
  return Math.max(1, Math.min(maximum, startSpan + steps));
}

export function gridSpanFromKey(span: number, key: string, axis: "column" | "row", maximum: number) {
  const increase = axis === "column" ? key === "ArrowRight" : key === "ArrowDown";
  const decrease = axis === "column" ? key === "ArrowLeft" : key === "ArrowUp";
  if (!increase && !decrease) return null;
  return Math.max(1, Math.min(maximum, span + (increase ? 1 : -1)));
}
