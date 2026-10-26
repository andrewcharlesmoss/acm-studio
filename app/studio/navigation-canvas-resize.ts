export type NavigationCanvasResizeEdge = "left" | "right";

export function navigationCanvasResizeBounds(availableWidth: number) {
  const max = Math.max(0, Math.floor(availableWidth - 48));
  return { min: Math.min(320, max), max };
}

export function clampNavigationCanvasWidth(width: number, bounds: { min: number; max: number }) {
  return Math.max(bounds.min, Math.min(bounds.max, Math.round(width)));
}

export function dragNavigationCanvasWidth(width: number, delta: number, edge: NavigationCanvasResizeEdge, bounds: { min: number; max: number }) {
  return clampNavigationCanvasWidth(width + (edge === "right" ? delta : -delta) * 2, bounds);
}

export function navigationCanvasWidthFromKey(width: number, key: string, shift: boolean, edge: NavigationCanvasResizeEdge, bounds: { min: number; max: number }) {
  const step = shift ? 20 : 10;
  if (key === "Home") return bounds.min;
  if (key === "End" || key === "Enter") return bounds.max;
  if (edge === "left" && key === "ArrowLeft" || edge === "right" && key === "ArrowRight") return clampNavigationCanvasWidth(width + step, bounds);
  if (edge === "left" && key === "ArrowRight" || edge === "right" && key === "ArrowLeft") return clampNavigationCanvasWidth(width - step, bounds);
  return null;
}
