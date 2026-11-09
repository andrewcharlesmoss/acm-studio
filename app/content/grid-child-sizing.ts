export type GridItemSizing = { columnSpan?: number; rowSpan?: number };

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
