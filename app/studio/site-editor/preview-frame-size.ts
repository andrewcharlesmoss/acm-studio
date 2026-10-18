export function previewFrameBounds(available: number) {
  const max = Math.max(0, Math.floor(available - 48));
  return { min: Math.min(320, max), max };
}

export function clampPreviewWidth(width: number, bounds: { min: number; max: number }) {
  return Math.max(bounds.min, Math.min(bounds.max, Math.round(width)));
}

/** The left handle moves both edges of a centred frame. */
export function dragPreviewWidth(width: number, delta: number, bounds: { min: number; max: number }) {
  return clampPreviewWidth(width - delta * 2, bounds);
}

export function previewWidthFromKey(width: number, key: string, shift: boolean, bounds: { min: number; max: number }) {
  const step = shift ? 20 : 10;
  if (key === "ArrowLeft") return clampPreviewWidth(width + step, bounds);
  if (key === "ArrowRight") return clampPreviewWidth(width - step, bounds);
  if (key === "Home") return bounds.min;
  if (key === "End" || key === "Enter") return bounds.max;
  return null;
}
