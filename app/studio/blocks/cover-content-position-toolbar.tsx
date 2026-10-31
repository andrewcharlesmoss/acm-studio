"use client";

import { useRef, useState } from "react";
import type { CoverContentPosition } from "../../content/cover-block";
import { COVER_CONTENT_POSITIONS } from "../../content/cover-block";
import { StudioHoverIcon } from "../studio-hover-icon";
import { StudioAnchoredMenu } from "../overlays/anchored-menu";

const labels: Record<CoverContentPosition, string> = {
  "top left": "Top left",
  "top center": "Top centre",
  "top right": "Top right",
  "center left": "Centre left",
  "center center": "Centre",
  "center right": "Centre right",
  "bottom left": "Bottom left",
  "bottom center": "Bottom centre",
  "bottom right": "Bottom right",
};

/** WordPress-style 3 × 3 placement control for the content inside a Cover. */
export function CoverContentPositionToolbar({ value, writable, onChange }: {
  value: CoverContentPosition | undefined;
  writable: boolean;
  onChange: (value: CoverContentPosition | undefined) => void;
}) {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement | null>(null);
  const selected = value ?? "center center";

  function close(restoreFocus = true) {
    setOpen(false);
    if (restoreFocus) trigger.current?.focus();
  }

  return <div className="alignment-control cover-content-position-toolbar">
    <button ref={trigger} className={`block-alignment-button${open ? " is-active" : ""}`} type="button" disabled={!writable} aria-label="Change content position" title="Change content position" aria-haspopup="menu" aria-expanded={open} onMouseDown={event => event.preventDefault()} onClick={event => { event.stopPropagation(); setOpen(current => !current); }}>
      <StudioHoverIcon name="layout.align-middle" /><StudioHoverIcon name="navigation.disclosure" size={16} />
    </button>
    {open ? <StudioAnchoredMenu anchor={() => trigger.current} className="cover-content-position-menu" aria-label="Content position" onClose={close} onClick={event => event.stopPropagation()}>
      {COVER_CONTENT_POSITIONS.map(position => <button key={position} type="button" role="menuitemradio" aria-label={labels[position]} title={labels[position]} aria-checked={position === selected} className={position === selected ? "is-active" : ""} disabled={!writable} onClick={() => {
        if (!writable) return;
        onChange(position === "center center" ? undefined : position);
        close();
      }}><span className="cover-content-position-dot" aria-hidden="true" /></button>)}
    </StudioAnchoredMenu> : null}
  </div>;
}
