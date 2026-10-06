"use client";

import { useState, type CSSProperties, type InputHTMLAttributes } from "react";

const thumbSize = 12;

type RangeControlProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  tooltipText?: string;
};

/** Native range semantics with a thumb-positioned value label, shared by inspector controls. */
export function RangeControl({ tooltipText, className = "studio-range-control", disabled, min = 0, max = 100, value, onFocus, onBlur, onPointerMove, onPointerLeave, onPointerDown, onPointerUp, onPointerCancel, onLostPointerCapture, ...props }: RangeControlProps) {
  const [focused, setFocused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [dragging, setDragging] = useState(false);
  const amount = Number(value);
  const fraction = Number(max) > Number(min) ? Math.max(0, Math.min(1, (amount - Number(min)) / (Number(max) - Number(min)))) : 0;
  // Native thumbs stop half a thumb-width inside either end of the track.
  const position = `calc(${fraction * 100}% + ${thumbSize / 2 - fraction * thumbSize}px)`;
  const text = tooltipText ?? String(value ?? "");
  const visible = !disabled && Number.isFinite(amount) && text !== "" && (focused || hovered || dragging);
  return <span className="studio-range-wrapper" style={{ "--range-label-position": position, "--range-thumb-size": `${thumbSize}px` } as CSSProperties}>
    <input {...props} className={className} type="range" disabled={disabled} min={min} max={max} value={value}
      onFocus={event => { setFocused(true); onFocus?.(event); }}
      onBlur={event => { setFocused(false); setDragging(false); onBlur?.(event); }}
      onPointerMove={event => {
        const bounds = event.currentTarget.getBoundingClientRect();
        const thumb = bounds.left + thumbSize / 2 + fraction * (bounds.width - thumbSize);
        setHovered(event.pointerType === "mouse" && Math.abs(event.clientX - thumb) <= thumbSize);
        onPointerMove?.(event);
      }}
      onPointerLeave={event => { setHovered(false); onPointerLeave?.(event); }}
      onPointerDown={event => { setDragging(true); onPointerDown?.(event); }}
      onPointerUp={event => { setDragging(false); onPointerUp?.(event); }}
      onPointerCancel={event => { setDragging(false); setHovered(false); onPointerCancel?.(event); }}
      onLostPointerCapture={event => { setDragging(false); onLostPointerCapture?.(event); }} />
    {visible ? <span className="studio-range-value-label" aria-hidden="true">{text}</span> : null}
  </span>;
}
