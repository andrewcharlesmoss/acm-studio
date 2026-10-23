/** Coordinates are viewport pixels; CSS zoom is removed before positioning. */
export function blockInsertionGap(previousBottom: number, nextTop: number, positionTop: number, scale = 1, minimumHeight = 0) {
  const gap = Math.max(0, (nextTop - previousBottom) / scale);
  const height = Math.max(minimumHeight, Math.min(30, gap));
  return { top: (nextTop - positionTop) / scale - (gap + height) / 2, height };
}

/** Overlapping nested/root boundaries resolve to one nearest, deepest cue. */
export function nearestInsertionBoundary<T extends { left: number; right: number; y: number; depth: number }>(boundaries: T[], x: number, y: number): T | undefined {
  return boundaries.filter(boundary => x >= boundary.left && x <= boundary.right && Math.abs(y - boundary.y) <= 12)
    .sort((a, b) => Math.abs(y - a.y) - Math.abs(y - b.y) || b.depth - a.depth)[0];
}
