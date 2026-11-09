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
