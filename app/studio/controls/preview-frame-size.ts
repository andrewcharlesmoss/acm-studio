/** Visible clearance for the 24px handle target on each side of every preview. */
export const PREVIEW_FRAME_GUTTER = 24;

/** Fit-to-part overlays use a bounded window-relative canvas, like Gutenberg. */
export function partOverlayViewportHeight(windowHeight: number) {
  return Math.max(320, Math.min(600, windowHeight * 0.7));
}

export function previewFrameBounds(available: number, overhead = 0, scale = 1) {
  const zoom = Number.isFinite(scale) && scale > 0 ? scale : 1;
  const max = Math.max(0, Math.floor((available - PREVIEW_FRAME_GUTTER * 2) / zoom - overhead));
  return { min: Math.min(320, max), max };
}

/** Gutenberg interpolates the initial aspect ratio towards a 9:19.5 phone frame. */
export function previewFrameHeight(width: number, defaultWidth: number, defaultHeight: number) {
  if (width <= 0 || defaultWidth <= 0 || defaultHeight <= 0) return 0;
  if (width >= defaultWidth) return defaultHeight;
  // Fit must join the interpolation continuously even in a tall, narrow stage.
  const referenceWidth = Math.min(1300, defaultWidth);
  // An already narrow stage has too little travel for a complete phone-ratio change.
  const amount = Math.max(0, Math.min(1, (referenceWidth - width) / Math.max(320, referenceWidth - 320)));
  const initialRatio = defaultWidth / defaultHeight;
  const ratio = initialRatio + ((9 / 19.5) - initialRatio) * amount;
  return Math.min(defaultHeight, width / ratio);
}

export function clampPreviewWidth(width: number, bounds: { min: number; max: number }) {
  return Math.max(bounds.min, Math.min(bounds.max, Math.round(width)));
}

/** The left-edge handle moves with a centred frame, so scale pointer travel by two. */
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
