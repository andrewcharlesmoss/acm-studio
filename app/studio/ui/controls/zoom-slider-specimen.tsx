"use client";

import { useId, useState } from "react";
import { ZoomRangeControl } from "../../controls/zoom-range-control";
import { ZOOM_MIN, ZOOM_MIDPOINT, ZOOM_MAX } from "../../controls/zoom-range-scale";

/** Temporary value only; the production control owns the scale, input, label, and cursor. */
export function ZoomSliderSpecimen() {
  const id = useId();
  const [zoom, setZoom] = useState(ZOOM_MIDPOINT);
  return <div className="ui-zoom-specimen" role="group" aria-label="Zoom slider example">
    <div className="ui-zoom-example-row">
      <label htmlFor={id}>Zoom</label>
      <div className="ui-zoom-example-track">
        <ZoomRangeControl id={id} value={zoom} onChange={setZoom} />
        <div className="ui-zoom-example-scale" aria-hidden="true"><span>{ZOOM_MIN}%</span><span>{ZOOM_MIDPOINT}%</span><span>{ZOOM_MAX}%</span></div>
      </div>
      <output htmlFor={id}>{zoom}%</output>
    </div>
    <p>100% sits at the midpoint of the 10–500% range. Hover over the thumb to see the percentage and grab cursor; drag to try the grabbing cursor. Arrow keys change one percentage point; Home and End reach the limits. Reset example returns to 100%.</p>
  </div>;
}
