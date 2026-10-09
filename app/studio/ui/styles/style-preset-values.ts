import type { ResponsiveValue, StyleViewport } from "@acm/styles";

/** Reset only the selected viewport to the loaded source's override policy. */
export function resetResponsiveStyleMetric<T>(current: ResponsiveValue<T>, baseline: ResponsiveValue<T>, viewport: StyleViewport): ResponsiveValue<T> {
  const result: Partial<Record<StyleViewport, T>> = { ...current };
  if (Object.hasOwn(baseline, viewport)) result[viewport] = structuredClone(baseline[viewport]);
  else delete result[viewport];
  return result as ResponsiveValue<T>;
}
