"use client";

import { useState, type CSSProperties } from "react";
import { StudioIcon } from "../studio-icons";
import "./revision-slider.css";

/** Presentation-only timeline. The caller owns revision data and selection. */
export function RevisionSlider({ label, count, value, heading, detail, disabled = false, onChange }: {
  label: string; count: number; value: number; heading: string; detail: string;
  disabled?: boolean; onChange: (value: number) => void;
}) {
  const [focused, setFocused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const total = Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 0;
  const maximum = Math.max(0, total - 1);
  const selected = Number.isFinite(value) ? Math.max(0, Math.min(maximum, Math.round(value))) : 0;
  const fraction = maximum ? selected / maximum : 0;
  const position = `calc(${fraction * 100}% + ${12 - fraction * 24}px)`;
  return <div className="studio-revision-slider" style={{ "--revision-position": position } as CSSProperties}>
    <input type="range" min={0} max={Math.max(1, maximum)} step={1} value={selected}
      disabled={disabled || total < 2} aria-label={label}
      aria-valuetext={total ? `${selected + 1} of ${total}: ${heading}, ${detail}` : "No saved revisions"}
      onChange={event => onChange(Number(event.target.value))}
      onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
      onPointerEnter={() => setHovered(true)} onPointerLeave={() => setHovered(false)} />
    <span className="studio-revision-markers" aria-hidden="true">{Array.from({ length: Math.min(16, total) }, (_, index) => <i key={index} style={{ left: `${total > 1 ? index / (Math.min(16, total) - 1) * 100 : 0}%` }} />)}</span>
    <span className="studio-revision-handle" aria-hidden="true"><StudioIcon name="chevron-right" size={10} /><StudioIcon name="chevron-right" size={10} /></span>
    {(focused || hovered) && !disabled && total > 1 ? <span className="studio-revision-tooltip" aria-hidden="true"><strong>{heading}</strong><span>{detail}</span></span> : null}
  </div>;
}
