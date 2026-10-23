/** Coordinates are viewport pixels; CSS zoom is removed before positioning. */
export function blockInsertionGap(previousBottom: number, nextTop: number, positionTop: number, scale = 1, minimumHeight = 0) {
  const gap = Math.max(0, (nextTop - previousBottom) / scale);
  const height = Math.max(minimumHeight, Math.min(30, gap));
  return { top: (nextTop - positionTop) / scale - (gap + height) / 2, height };
}
