"use client";

import { RangeControl } from "./range-control";
import { ZOOM_MIN, ZOOM_MAX, ZOOM_TRACK_MAX, zoomToTrack, trackToZoom, zoomFromRangeKey } from "./zoom-range-scale";

/** Zoom adapter: visual track positions are independent of percentage semantics. */
export function ZoomRangeControl({ id, value, onChange }: {
  id: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return <RangeControl id={id} min={0} max={ZOOM_TRACK_MAX} step={1} value={zoomToTrack(value)}
    aria-label="Canvas zoom" aria-valuemin={ZOOM_MIN} aria-valuemax={ZOOM_MAX} aria-valuenow={value} aria-valuetext={`${value}%`}
    tooltipText={`${value}%`} tooltipPlacement="above"
    onChange={event => onChange(trackToZoom(Number(event.target.value)))}
    onKeyDown={event => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const next = zoomFromRangeKey(value, event.key);
      if (next !== null) { event.preventDefault(); event.stopPropagation(); onChange(next); }
    }} />;
}
