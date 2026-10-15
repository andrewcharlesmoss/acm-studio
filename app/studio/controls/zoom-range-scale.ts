export const ZOOM_MIN = 10;
export const ZOOM_MIDPOINT = 100;
export const ZOOM_MAX = 500;
const TRACK_MIDPOINT = 500;
export const ZOOM_TRACK_MAX = 1000;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

/** Each side of 100% receives half the track, retaining the full zoom range. */
export function zoomToTrack(value: number) {
  const zoom = clamp(value, ZOOM_MIN, ZOOM_MAX);
  return zoom <= ZOOM_MIDPOINT
    ? (zoom - ZOOM_MIN) / (ZOOM_MIDPOINT - ZOOM_MIN) * TRACK_MIDPOINT
    : TRACK_MIDPOINT + (zoom - ZOOM_MIDPOINT) / (ZOOM_MAX - ZOOM_MIDPOINT) * TRACK_MIDPOINT;
}

export function trackToZoom(value: number) {
  const position = clamp(value, 0, ZOOM_TRACK_MAX);
  return Math.round(position <= TRACK_MIDPOINT
    ? ZOOM_MIN + position / TRACK_MIDPOINT * (ZOOM_MIDPOINT - ZOOM_MIN)
    : ZOOM_MIDPOINT + (position - TRACK_MIDPOINT) / TRACK_MIDPOINT * (ZOOM_MAX - ZOOM_MIDPOINT));
}

export function zoomFromRangeKey(value: number, key: string): number | null {
  const delta = key === "ArrowRight" || key === "ArrowUp" ? 1
    : key === "ArrowLeft" || key === "ArrowDown" ? -1
    : key === "PageUp" ? 49 : key === "PageDown" ? -49 : null;
  if (key === "Home") return ZOOM_MIN;
  if (key === "End") return ZOOM_MAX;
  return delta === null ? null : clamp(value + delta, ZOOM_MIN, ZOOM_MAX);
}
