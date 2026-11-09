export type GridTrackAxis = "column" | "row";

export function resolvedGridTrackSizes(template: string): number[] {
  return template.match(/(?:\d+\.?\d*|\.\d+)px/g)?.map(value => Number.parseFloat(value)).filter(size => size > 0) ?? [];
}

export function gridTrackGeometry(template: string, gap: string): { count: number; stride: number } {
  const sizes = resolvedGridTrackSizes(template);
  const gapSize = Number.parseFloat(gap) || 0;
  return { count: Math.max(1, sizes.length), stride: sizes.length ? sizes.reduce((sum, size) => sum + size, 0) / sizes.length + gapSize : 0 };
}

export function gridTrackTemplateCount(template: string): number {
  return Math.max(1, resolvedGridTrackSizes(template).length);
}

/** Preserve track indices when auto-fit collapses a track between visible cells. */
export function gridGuideCells(columns: string, rows: string): { column: number; row: number }[] {
  function visibleIndices(template: string) {
    const sizes = template.match(/(?:\d+\.?\d*|\.\d+)px/g)?.map(value => Number.parseFloat(value));
    return sizes ? sizes.flatMap((size, index) => size > 0 ? [index + 1] : []) : [1];
  }
  return visibleIndices(rows).flatMap(row => visibleIndices(columns).map(column => ({ column, row })));
}
